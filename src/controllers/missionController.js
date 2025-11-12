const { Mission, MissionCompletion, User, Badge, UserBadge } = require('../models');
const { Op } = require('sequelize');

// Fungsi helper untuk menghitung tanggal
const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

// Get missions with filters
exports.getMissions = async (req, res) => {
  try {
    const { category, budget, distance } = req.query;
    
    const where = { is_active: true };

    if (category && category !== 'Acak') {
      where.category = category;
    }

    if (budget && budget !== 'Acak') {
      where.budget_category = budget;
    }

    // Distance filtering (simplified - in production, calculate from user location)
    if (distance && distance !== 'Acak') {
      const distanceRanges = {
        'Sangat Dekat': [0, 2],
        'Dekat': [2, 5],
        'Sedang': [5, 10],
        'Jauh': [10, 999]
      };
      const range = distanceRanges[distance];
      if (range) {
        where.estimated_distance = {
          [Op.between]: range
        };
      }
    }

    const missions = await Mission.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 20
    });

    res.json(missions);
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
};

// Get random mission (gacha)
exports.getRandomMission = async (req, res) => {
  try {
    const { category, budget, distance } = req.query;
    
    const where = { is_active: true };

    if (category && category !== 'Acak') {
      where.category = category;
    }

    if (budget && budget !== 'Acak') {
      where.budget_category = budget;
    }

    const missions = await Mission.findAll({ where });

    if (missions.length === 0) {
      return res.status(404).json({ error: 'No missions found' });
    }

    // Select random mission
    const randomMission = missions[Math.floor(Math.random() * missions.length)];

    res.json(randomMission);
  } catch (error) {
    console.error('Get random mission error:', error);
    res.status(500).json({ error: 'Failed to get mission' });
  }
};

// Get single mission
exports.getMission = async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json(mission);
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
};

// Complete mission
exports.completeMission = async (req, res) => {
  try {
    const { mission_id } = req.body;
    const userId = req.user.id;

    // Check if mission exists
    const mission = await Mission.findByPk(mission_id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check if already completed
    const existingCompletion = await MissionCompletion.findOne({
      where: {
        user_id: userId,
        mission_id: mission_id
      }
    });

    if (existingCompletion) {
      return res.status(400).json({ error: 'Mission already completed' });
    }

    // Create completion record
    await MissionCompletion.create({
      user_id: userId,
      mission_id: mission_id
    });

    // --- LOGIKA BARU: UPDATE STATS PENGGUNA (TERMASUK STREAK) ---
    const user = await User.findByPk(userId);
    const today = getToday();
    const yesterday = getYesterday();

    let updateData = {
      total_missions: user.total_missions + 1,
      total_distance: user.total_distance + (mission.estimated_distance || 0)
    };

    // Perbarui streak jika misi diselesaikan di hari yang berbeda
    if (user.last_active_date !== today) {
      updateData.total_active_days = user.total_active_days + 1;
      updateData.last_active_date = today;

      if (user.last_active_date === yesterday) {
        // Lanjutkan streak
        updateData.current_streak = user.current_streak + 1;
      } else {
        // Reset streak
        updateData.current_streak = 1;
      }
      
      // Perbarui streak terpanjang jika perlu
      if (updateData.current_streak > user.longest_streak) {
        updateData.longest_streak = updateData.current_streak;
      }
    }

    // Terapkan pembaruan ke user
    await user.update(updateData);
    
    // --- LOGIKA BARU: CEK DAN BERIKAN BADGE ---
    await checkAndAwardBadges(user, mission);
    // ------------------------------------------

    res.status(204).send();
  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
};

// Fungsi helper untuk badge
async function checkAndAwardBadges(user, completedMission) {
  try {
    // 1. Muat ulang user dengan data badge terbaru
    await user.reload({ include: 'badges' });
    const userBadgeIds = user.badges.map(b => b.id);
    
    // 2. Ambil semua badge yang mungkin didapat
    const badgesToCheck = await Badge.findAll({
      where: {
        id: { [Op.notIn]: userBadgeIds } // Hanya cek badge yang belum dimiliki
      }
    });

    const badgesToAward = [];

    // 3. Cek setiap badge
    for (const badge of badgesToCheck) {
      let shouldAward = false;
      
      switch (badge.requirement_type) {
        case 'missions_completed':
          if (user.total_missions >= badge.requirement_value) {
            shouldAward = true;
          }
          break;
        case 'distance_traveled':
          if (user.total_distance >= badge.requirement_value) {
            shouldAward = true;
          }
          break;
        case 'streak_days':
          if (user.current_streak >= badge.requirement_value) {
            shouldAward = true;
          }
          break;
        case 'category_specific':
          // Hanya cek jika misi yang baru selesai sesuai dengan kategori badge
          if (completedMission && badge.requirement_category === completedMission.category) {
            // Hitung total misi dalam kategori ini
            const categoryCount = await MissionCompletion.count({
              where: { user_id: user.id },
              include: [{
                model: Mission,
                as: 'mission',
                where: { category: badge.requirement_category }
              }]
            });
            
            if (categoryCount >= badge.requirement_value) {
              shouldAward = true;
            }
          }
          break;
        // 'journals_written' akan ditangani di journalController
      }

      if (shouldAward) {
        badgesToAward.push(badge.id);
      }
    }

    // 4. Berikan badge baru
    if (badgesToAward.length > 0) {
      await user.addBadges(badgesToAward);
    }
    
  } catch (error) {
    console.error('Error awarding badges:', error);
  }
}


// --- FUNGSI BARU UNTUK ADMIN ---

/**
 * @route   POST /api/missions
 * @desc    Membuat misi baru
 * @access  Private (Admin)
 */
exports.createMission = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      location_name,
      latitude,
      longitude,
      address,
      image_url,
      budget_category,
      estimated_distance,
      difficulty_level,
      points
    } = req.body;

    // Validasi dasar
    if (!name || !category || !location_name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Field wajib (name, category, location_name, latitude, longitude) harus diisi' });
    }

    const mission = await Mission.create({
      name,
      description,
      category,
      location_name,
      latitude,
      longitude,
      address,
      image_url,
      budget_category,
      estimated_distance,
      difficulty_level,
      points,
      is_active: true // Default
    });

    res.status(201).json(mission);
  } catch (error) {
    console.error('Create mission error:', error);
    res.status(500).json({ error: 'Gagal membuat misi baru' });
  }
};

/**
 * @route   PUT /api/missions/:id
 * @desc    Memperbarui misi
 * @access  Private (Admin)
 */
exports.updateMission = async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: 'Misi tidak ditemukan' });
    }

    // Update misi dengan data dari req.body
    await mission.update(req.body);

    res.json(mission);
  } catch (error) {
    console.error('Update mission error:', error);
    res.status(500).json({ error: 'Gagal memperbarui misi' });
  }
};

/**
 * @route   DELETE /api/missions/:id
 * @desc    Menghapus misi
 * @access  Private (Admin)
 */
exports.deleteMission = async (req, res) => {
  try {
    const mission = await Mission.findByPk(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: 'Misi tidak ditemukan' });
    }

    await mission.destroy();

    res.status(204).send();
  } catch (error)
    {
    console.error('Delete mission error:', error);
    res.status(500).json({ error: 'Gagal menghapus misi' });
  }
};