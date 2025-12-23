const { Journal, Mission, User, Badge, UserBadge } = require('../models');
const { Op } = require('sequelize');

// Get all journals for user
exports.getJournals = async (req, res) => {
  try {
    const journals = await Journal.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Mission,
        as: 'mission',
        attributes: ['id', 'name', 'category']
      }],
      order: [['date', 'DESC']]
    });

    res.json(journals);
  } catch (error) {
    console.error('Get journals error:', error);
    res.status(500).json({ error: 'Failed to fetch journals' });
  }
};

// Get single journal
exports.getJournal = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [{
        model: Mission,
        as: 'mission'
      }]
    });

    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    res.json(journal);
  } catch (error) {
    console.error('Get journal error:', error);
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
};

// Create journal
exports.createJournal = async (req, res) => {
  try {
    const { title, story, image_url, mission_id, location_name, latitude, longitude } = req.body;
    const userId = req.user.id;

    // Validation
    if (!title || !story) {
      return res.status(400).json({ error: 'Title and story are required' });
    }

    const journal = await Journal.create({
      user_id: userId,
      title,
      story,
      image_url,
      mission_id,
      location_name,
      latitude,
      longitude,
      date: new Date()
    });

    // --- LOGIKA BARU: CEK BADGE UNTUK JURNAL ---
    await checkJournalBadges(userId);
    // ------------------------------------------

    res.status(201).json(journal);
  } catch (error) {
    console.error('Create journal error:', error);
    res.status(500).json({ error: 'Failed to create journal' });
  }
};

// Create journal dengan upload gambar langsung (multipart/form-data)
exports.createJournalWithImage = async (req, res) => {
  try {
    const { title, story, mission_id, location_name, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!title || !story) {
      return res.status(400).json({ error: 'Title and story are required' });
    }

    // Jika ada file gambar, buat URL absolut yang bisa dipakai langsung di frontend
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const journal = await Journal.create({
      user_id: userId,
      title,
      story,
      image_url: imageUrl,
      mission_id,
      location_name,
      latitude,
      longitude,
      date: new Date()
    });

    await checkJournalBadges(userId);

    res.status(201).json(journal);
  } catch (error) {
    console.error('Create journal with image error:', error);
    res.status(500).json({ error: 'Failed to create journal with image' });
  }
};

// Fungsi helper untuk badge jurnal
async function checkJournalBadges(userId) {
  try {
    const user = await User.findByPk(userId, { include: 'badges' });
    const userBadgeIds = user.badges.map(b => b.id);

    // 1. Dapatkan jumlah total jurnal pengguna
    const journalCount = await Journal.count({ where: { user_id: userId } });

    // 2. Dapatkan semua badge 'journals_written' yang belum dimiliki pengguna
    const journalBadges = await Badge.findAll({
      where: {
        requirement_type: 'journals_written',
        id: { [Op.notIn]: userBadgeIds }
      }
    });

    const badgesToAward = [];
    
    // 3. Cek apakah syarat terpenuhi
    for (const badge of journalBadges) {
      if (journalCount >= badge.requirement_value) {
        badgesToAward.push(badge.id);
      }
    }

    // 4. Berikan badge
    if (badgesToAward.length > 0) {
      await user.addBadges(badgesToAward);
    }
  } catch (error) {
    console.error('Error awarding journal badges:', error);
  }
}

// Update journal
exports.updateJournal = async (req, res) => {
  try {
    const { title, story, image_url } = req.body;

    const journal = await Journal.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    await journal.update({
      title: title || journal.title,
      story: story || journal.story,
      image_url: image_url !== undefined ? image_url : journal.image_url
    });
    
    const updatedJournal = await Journal.findByPk(journal.id, {
      include: [{
        model: Mission,
        as: 'mission'
      }]
    });

    res.json(updatedJournal);
  } catch (error) {
    console.error('Update journal error:', error);
    res.status(500).json({ error: 'Failed to update journal' });
  }
};

// Delete journal
exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    await journal.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Delete journal error:', error);
    res.status(500).json({ error: 'Failed to delete journal' });
  }
};