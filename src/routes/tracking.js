const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const auth = require('../middleware/auth');

// Semua routes memerlukan autentikasi
router.use(auth);

// GET mission dengan semua clues
router.get('/mission/:missionId', trackingController.getMissionWithClues);

// POST check lokasi user terhadap clue
router.post('/check-location', trackingController.checkUserLocation);

// GET clue terdekat dari posisi user
router.get('/nearby-clues', trackingController.getNearbyClues);

// GET progress user
router.get('/user/progress', trackingController.getUserProgress);

// POST tambah clue ke mission (Admin)
router.post('/missions/:missionId/clues', trackingController.addClueToMission);

module.exports = router;