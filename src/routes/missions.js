const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/', missionController.getMissions);
router.get('/random', missionController.getRandomMission);
router.get('/:id', missionController.getMission);
router.post('/complete', missionController.completeMission);

module.exports = router;