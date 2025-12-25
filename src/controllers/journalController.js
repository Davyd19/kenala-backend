const { Journal, Mission, User, Badge } = require('../models');
const { Op } = require('sequelize');

// Helper: Cek dan berikan badge jurnal
async function checkJournalBadges(userId) {
  try {
    const user = await User.findByPk(userId, { include: 'badges' });
    const userBadgeIds = user.badges.map(b => b.id);

    const journalCount = await Journal.count({ where: { user_id: userId } });

    const journalBadges = await Badge.findAll({
      where: {
        requirement_type: 'journals_written',
        id: { [Op.notIn]: userBadgeIds }
      }
    });

    const badgesToAward = [];
    
    for (const badge of journalBadges) {
      if (journalCount >= badge.requirement_value) {
        badgesToAward.push(badge.id);
      }
    }

    if (badgesToAward.length > 0) {
      await user.addBadges(badgesToAward);
    }
  } catch (error) {
    console.error('Error awarding journal badges:', error);
  }
}

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
    res.status(500).json({ error: error.message });
  }
};

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
    res.status(500).json({ error: error.message });
  }
};

exports.createJournal = async (req, res) => {
  try {
    const { title, story, mission_id, location_name, latitude, longitude } = req.body;
    const userId = req.user.id;

    // Prioritaskan file upload, fallback ke URL string jika ada (opsional)
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    const journal = await Journal.create({
      user_id: userId,
      title,
      story,
      image_url: imageUrl,
      mission_id: mission_id ? parseInt(mission_id) : null,
      location_name,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      date: new Date()
    });

    // Panggil logika badge setelah jurnal berhasil dibuat
    await checkJournalBadges(userId);

    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateJournal = async (req, res) => {
  try {
    const { title, story } = req.body;
    
    const journal = await Journal.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    let imageUrl = journal.image_url;
    
    // Logika update gambar:
    // 1. Jika ada file baru diupload -> ganti gambar
    // 2. Jika client mengirim string kosong/null secara eksplisit -> hapus gambar
    // 3. Jika tidak ada keduanya -> pertahankan gambar lama
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url === '' || req.body.image_url === null || req.body.image_url === 'null') {
      imageUrl = null;
    }

    await journal.update({
      title: title || journal.title,
      story: story || journal.story,
      image_url: imageUrl
    });

    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    res.status(500).json({ error: error.message });
  }
};