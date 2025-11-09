const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/stats', profileController.getStats);
router.get('/badges', profileController.getBadges);
router.get('/streak', profileController.getStreakData);

module.exports = router;