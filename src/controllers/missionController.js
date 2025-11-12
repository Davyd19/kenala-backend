const { Mission, MissionCompletion, User } = require('../models');
const { Op } = require('sequelize');

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

    res.json({ missions });
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

    res.json({ mission: randomMission });
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

    res.json({ mission });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
};

// Complete mission
exports.completeMission = async (req, res) => {
  try {
    const { mission_id } = req.body;

    // Check if mission exists
    const mission = await Mission.findByPk(mission_id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check if already completed
    const existingCompletion = await MissionCompletion.findOne({
      where: {
        user_id: req.user.id,
        mission_id: mission_id
      }
    });

    if (existingCompletion) {
      return res.status(400).json({ error: 'Mission already completed' });
    }

    // Create completion record
    await MissionCompletion.create({
      user_id: req.user.id,
      mission_id: mission_id
    });

    // Update user stats
    await User.increment(
      {
        total_missions: 1,
        total_distance: mission.estimated_distance || 0
      },
      { where: { id: req.user.id } }
    );

    res.json({ message: 'Mission completed successfully' });
  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
};


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

    res.status(201).json({ mission });
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

    res.json({ mission });
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

    res.json({ message: 'Misi berhasil dihapus' });
  } catch (error)
    {
    console.error('Delete mission error:', error);
    res.status(500).json({ error: 'Gagal menghapus misi' });
  }
};