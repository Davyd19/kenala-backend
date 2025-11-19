const { Suggestion } = require('../models');

// Get all suggestions for the logged-in user
exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = await Suggestion.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

// Get a single suggestion by ID
exports.getSuggestionById = async (req, res) => {
  try {
    const suggestion = await Suggestion.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    res.json(suggestion);
  } catch (error) {
    console.error('Get suggestion error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion' });
  }
};

// Create a new suggestion
exports.createSuggestion = async (req, res) => {
  try {
    const { location_name, category, description, address } = req.body;

    if (!location_name || !category || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const suggestion = await Suggestion.create({
      user_id: req.user.id,
      location_name,
      address,
      category,
      description,
      status: 'pending'
    });

    res.status(201).json(suggestion);
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
};

// Update a suggestion (only if pending)
exports.updateSuggestion = async (req, res) => {
  try {
    const { location_name, category, description, address } = req.body;
    const suggestion = await Suggestion.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot edit a suggestion that has been reviewed' });
    }

    await suggestion.update({
      location_name: location_name || suggestion.location_name, address: address !== undefined ? address : suggestion.address,
      category: category || suggestion.category,
      description: description || suggestion.description
    });

    res.json(suggestion);
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
};

// Delete a suggestion (only if pending)
exports.deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot delete a suggestion that has been reviewed' });
    }

    await suggestion.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
};