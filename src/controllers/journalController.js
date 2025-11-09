const { Journal, Mission } = require('../models');
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

    res.json({ journals });
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

    res.json({ journal });
  } catch (error) {
    console.error('Get journal error:', error);
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
};

// Create journal
exports.createJournal = async (req, res) => {
  try {
    const { title, story, image_url, mission_id, location_name, latitude, longitude } = req.body;

    // Validation
    if (!title || !story) {
      return res.status(400).json({ error: 'Title and story are required' });
    }

    const journal = await Journal.create({
      user_id: req.user.id,
      title,
      story,
      image_url,
      mission_id,
      location_name,
      latitude,
      longitude,
      date: new Date()
    });

    res.status(201).json({ journal });
  } catch (error) {
    console.error('Create journal error:', error);
    res.status(500).json({ error: 'Failed to create journal' });
  }
};

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

    res.json({ journal });
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

    res.json({ message: 'Journal deleted successfully' });
  } catch (error) {
    console.error('Delete journal error:', error);
    res.status(500).json({ error: 'Failed to delete journal' });
  }
};