const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', missionController.getMissions);
router.get('/random', missionController.getRandomMission);
router.get('/:id', missionController.getMission);
router.post('/complete', missionController.completeMission);

router.post('/', missionController.createMission);

router.put('/:id', missionController.updateMission);

router.delete('/:id', missionController.deleteMission);

router.post('/:id/publish', missionController.publishMission);

module.exports = router;