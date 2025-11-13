const express = require('express');
const router = express.Router();
const suggestionController = require('../controllers/suggestionController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/', suggestionController.getSuggestions);
router.post('/', suggestionController.createSuggestion);
router.get('/:id', suggestionController.getSuggestionById);
router.put('/:id', suggestionController.updateSuggestion);
router.delete('/:id', suggestionController.deleteSuggestion);

module.exports = router;