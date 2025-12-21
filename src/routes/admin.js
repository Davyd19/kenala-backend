const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { 
  User, 
  Mission, 
  MissionClue, 
  Badge, 
  Journal, 
  MissionCompletion,
  UserBadge,
  Suggestion
} = require('../models');
const { Op } = require('sequelize');
const firebaseAdmin = require('../config/firebase'); // Import Firebase

// All admin routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalMissions,
      totalJournals,
      totalBadges,
      totalCompletions
    ] = await Promise.all([
      User.count(),
      Mission.count(),
      Journal.count(),
      Badge.count(),
      MissionCompletion.count()
    ]);

    // Recent activity
    const recentJournals = await Journal.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['name']
      }]
    });

    const recentCompletions = await MissionCompletion.findAll({
      limit: 5,
      order: [['completed_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name']
        },
        {
          model: Mission,
          as: 'mission',
          attributes: ['name']
        }
      ]
    });

    res.json({
      stats: {
        totalUsers,
        totalMissions,
        totalJournals,
        totalBadges,
        totalCompletions
      },
      recentActivity: {
        journals: recentJournals,
        completions: recentCompletions
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin)
 */
router.get('/users', async (req, res) => {
  try {
    const { search, sortBy = 'created_at', order = 'DESC', page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: Badge,
          as: 'badges',
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user detail with all related data
 * @access  Private (Admin)
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Badge,
          as: 'badges',
          through: { attributes: ['unlocked_at'] }
        },
        {
          model: Journal,
          as: 'journals',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: MissionCompletion,
          as: 'completedMissions',
          limit: 10,
          order: [['completed_at', 'DESC']],
          include: [{
            model: Mission,
            as: 'mission',
            attributes: ['name', 'category']
          }]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (including admin status)
 * @access  Private (Admin)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, is_admin } = req.body;

    await user.update({
      name: name !== undefined ? name : user.name,
      email: email !== undefined ? email : user.email,
      is_admin: is_admin !== undefined ? is_admin : user.is_admin
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete recommended)
 * @access  Private (Admin)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting admin users
    if (user.is_admin) {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * @route   POST /api/admin/badges
 * @desc    Create new badge
 * @access  Private (Admin)
 */
router.post('/badges', async (req, res) => {
  try {
    const {
      name,
      description,
      icon_name,
      color,
      requirement_type,
      requirement_value,
      requirement_category
    } = req.body;

    if (!name || !description || !icon_name || !color || !requirement_type || !requirement_value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const badge = await Badge.create({
      name,
      description,
      icon_name,
      color,
      requirement_type,
      requirement_value,
      requirement_category
    });

    res.status(201).json({ badge });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

/**
 * @route   PUT /api/admin/badges/:id
 * @desc    Update badge
 * @access  Private (Admin)
 */
router.put('/badges/:id', async (req, res) => {
  try {
    const badge = await Badge.findByPk(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    await badge.update(req.body);

    res.json({ badge });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

/**
 * @route   DELETE /api/admin/badges/:id
 * @desc    Delete badge
 * @access  Private (Admin)
 */
router.delete('/badges/:id', async (req, res) => {
  try {
    const badge = await Badge.findByPk(req.params.id);

    if (!badge) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    await badge.destroy();

    res.json({ message: 'Badge deleted successfully' });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({ error: 'Failed to delete badge' });
  }
});

/**
 * @route   DELETE /api/admin/clues/:id
 * @desc    Delete clue
 * @access  Private (Admin)
 */
router.delete('/clues/:id', async (req, res) => {
  try {
    const clue = await MissionClue.findByPk(req.params.id);

    if (!clue) {
      return res.status(404).json({ error: 'Clue not found' });
    }

    await clue.destroy();

    res.json({ message: 'Clue deleted successfully' });
  } catch (error) {
    console.error('Delete clue error:', error);
    res.status(500).json({ error: 'Failed to delete clue' });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Private (Admin)
 */
router.get('/analytics', async (req, res) => {
  try {
    // User growth
    const userGrowth = await User.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']],
      limit: 30
    });

    // Mission completions by category
    const completionsByCategory = await MissionCompletion.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('MissionCompletion.id')), 'count']
      ],
      include: [{
        model: Mission,
        as: 'mission',
        attributes: ['category']
      }],
      group: ['mission.category']
    });

    // Top users
    const topUsers = await User.findAll({
      order: [['total_missions', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'total_missions', 'current_streak']
    });

    res.json({
      userGrowth,
      completionsByCategory,
      topUsers
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
// --- TAMBAHAN BARU: RUTE UNTUK MANAJEMEN SARAN (SUGGESTION) ---

/**
 * @route   GET /api/admin/suggestions
 * @desc    Get all user suggestions
 * @access  Private (Admin)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await Suggestion.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['status', 'ASC'], ['created_at', 'DESC']]
    });
    res.json({ suggestions });
  } catch (error) {
    console.error('Get all suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

/**
 * @route   GET /api/admin/suggestions/:id
 * @desc    Get detail of a single suggestion
 * @access  Private (Admin)
 */
router.get('/suggestions/:id', async (req, res) => {
  try {
    const suggestion = await Suggestion.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    res.json({ suggestion });
  } catch (error) {
    console.error('Get suggestion detail error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion detail' });
  }
});

/**
 * @route   PUT /api/admin/suggestions/:id
 * @desc    Update suggestion status (approve/reject)
 * @access  Private (Admin)
 */
router.put('/suggestions/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const suggestion = await Suggestion.findByPk(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    await suggestion.update({ status });
    res.json({ suggestion });
  } catch (error) {
    console.error('Update suggestion status error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

/**
 * @route   DELETE /api/admin/suggestions/:id
 * @desc    Delete a suggestion
 * @access  Private (Admin)
 */
router.delete('/suggestions/:id', async (req, res) => {
  try {
    const suggestion = await Suggestion.findByPk(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    await suggestion.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

/**
 * @route POST /api/admin/broadcast
 * @desc Kirim notifikasi ke SEMUA user (via topic 'all_users')
 * @access Admin Only
 */
router.post('/broadcast', adminAuth, async (req, res) => {
    try {
        const { title, body } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title dan Body wajib diisi' });
        }

        // Buat payload pesan
        const message = {
            notification: {
                title: title,
                body: body
            },
            topic: 'all_users' // Kirim ke topik yang disubscribe oleh semua aplikasi Android
        };

        // Kirim via Firebase
        const response = await firebaseAdmin.messaging().send(message);

        res.json({
            success: true,
            message: 'Notifikasi berhasil dikirim ke seluruh user',
            firebaseResponse: response
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ error: 'Gagal mengirim broadcast', details: error.message });
    }
});
module.exports = router;