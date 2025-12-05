const { Mission, MissionCompletion, User, Badge, UserBadge } = require('../models');
const { Op } = require('sequelize');

// Helper untuk tanggal
const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

exports.getMissions = async (req, res) => {
    try {
        const { category, budget, distance } = req.query;
        const where = { is_active: true };

        if (category && category !== 'Acak') where.category = category;
        if (budget && budget !== 'Acak') where.budget_category = budget;
        
        if (distance && distance !== 'Acak') {
            const distanceRanges = {
                'Sangat Dekat': [0, 2],
                'Dekat': [2, 5],
                'Sedang': [5, 10],
                'Jauh': [10, 999]
            };
            const range = distanceRanges[distance];
            if (range) {
                where.estimated_distance = { [Op.between]: range };
            }
        }

        const missions = await Mission.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 20
        });
        res.json(missions);
    } catch (error) {
        console.error('Fetch missions error:', error);
        res.status(500).json({ error: 'Failed to fetch missions' });
    }
};

exports.getRandomMission = async (req, res) => {
    try {
        const { category, budget, distance } = req.query;
        const where = { is_active: true };

        if (category && category !== 'Acak') where.category = category;
        if (budget && budget !== 'Acak') where.budget_category = budget;
        // Logic distance filter could be added here similar to getMissions

        const missions = await Mission.findAll({ where });

        if (missions.length === 0) {
            return res.status(404).json({ error: 'No missions found' });
        }

        const randomMission = missions[Math.floor(Math.random() * missions.length)];
        res.json(randomMission);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get mission' });
    }
};

exports.getMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }
        res.json(mission);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch mission' });
    }
};

/**
 * @route   POST /api/missions/complete
 * @desc    Menandai misi selesai dan mengupdate statistik user
 */
exports.completeMission = async (req, res) => {
  try {
    const { mission_id, real_distance_meters } = req.body;
    const userId = req.user.id;

    const mission = await Mission.findByPk(mission_id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Cek apakah sudah pernah diselesaikan? (Optional: kalau boleh replay, hapus cek ini)
    const existingCompletion = await MissionCompletion.findOne({
      where: { user_id: userId, mission_id: mission_id }
    });

    if (existingCompletion) {
      return res.status(400).json({ error: 'Mission already completed' });
    }

    // 1. Catat penyelesaian misi
    await MissionCompletion.create({
      user_id: userId,
      mission_id: mission_id
    });

    // 2. Update User Stats & Streak
    const user = await User.findByPk(userId);
    const today = getToday();
    const yesterday = getYesterday();

    // Hitung jarak yang akan ditambahkan
    // Prioritaskan real_distance dari HP jika valid (> 0), konversi ke KM
    // Jika tidak, fallback ke estimasi jarak dari data misi
    let distanceToAdd = 0;
    if (real_distance_meters && real_distance_meters > 0) {
        distanceToAdd = real_distance_meters / 1000; // Meter ke KM
    } else {
        distanceToAdd = mission.estimated_distance || 0;
    }

    let updateData = {
      total_missions: user.total_missions + 1,
      total_distance: user.total_distance + distanceToAdd
    };

    // Update Streak Logic
    // Streak hanya update jika last_active_date bukan hari ini
    if (user.last_active_date !== today) {
      updateData.total_active_days = user.total_active_days + 1;
      updateData.last_active_date = today;

      if (user.last_active_date === yesterday) {
        // Continue streak
        updateData.current_streak = user.current_streak + 1;
      } else {
        // Reset streak (hari pertama atau streak putus)
        updateData.current_streak = 1;
      }
      
      // Update rekor streak
      if (updateData.current_streak > user.longest_streak) {
        updateData.longest_streak = updateData.current_streak;
      }
    } else {
        // Jika user sudah aktif hari ini, streak tidak berubah
        // tapi total_distance dan total_missions tetap bertambah
    }

    await user.update(updateData);
    
    // 3. Cek Badge
    await checkAndAwardBadges(user, mission);

    res.status(204).send();
  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
};

async function checkAndAwardBadges(user, completedMission) {
    try {
        await user.reload({ include: 'badges' });
        const userBadgeIds = user.badges ? user.badges.map(b => b.id) : [];

        // Ambil badge yang belum dimiliki
        const badgesToCheck = await Badge.findAll({ 
            where: { id: { [Op.notIn]: userBadgeIds } } 
        });

        const badgesToAward = [];

        for (const badge of badgesToCheck) {
            let shouldAward = false;

            switch (badge.requirement_type) {
                case 'missions_completed':
                    if (user.total_missions >= badge.requirement_value) shouldAward = true;
                    break;
                case 'distance_traveled':
                    if (user.total_distance >= badge.requirement_value) shouldAward = true;
                    break;
                case 'streak_days':
                    if (user.current_streak >= badge.requirement_value) shouldAward = true;
                    break;
                case 'category_specific':
                    // Cek jumlah misi kategori X
                    if (completedMission && badge.requirement_category === completedMission.category) {
                        const categoryCount = await MissionCompletion.count({
                            where: { user_id: user.id },
                            include: [{
                                model: Mission,
                                as: 'mission',
                                where: { category: badge.requirement_category }
                            }]
                        });
                        if (categoryCount >= badge.requirement_value) shouldAward = true;
                    }
                    break;
            }

            if (shouldAward) {
                badgesToAward.push(badge.id);
            }
        }

        if (badgesToAward.length > 0) {
            await user.addBadges(badgesToAward);
            console.log(`User ${user.id} awarded badges: ${badgesToAward}`);
        }

    } catch (error) {
        console.error('Error awarding badges:', error);
    }
}

// Admin CRUD Operations (Simplified for brevity as they are standard)
exports.createMission = async (req, res) => {
    try {
        const { name, description, category, location_name, latitude, longitude, address, image_url, budget_category, estimated_distance, difficulty_level, points } = req.body;
        
        if (!name || !category || !location_name || !latitude || !longitude) {
            return res.status(400).json({ error: 'Field wajib tidak lengkap' });
        }

        const mission = await Mission.create({
            name, description, category, location_name, latitude, longitude, address, image_url, budget_category, estimated_distance, difficulty_level, points,
            is_active: true
        });

        res.status(201).json(mission);
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat misi baru' });
    }
};

exports.updateMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) return res.status(404).json({ error: 'Misi tidak ditemukan' });
        await mission.update(req.body);
        res.json(mission);
    } catch (error) {
        res.status(500).json({ error: 'Gagal memperbarui misi' });
    }
};

exports.deleteMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) return res.status(404).json({ error: 'Misi tidak ditemukan' });
        await mission.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus misi' });
    }
};