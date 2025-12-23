const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const journalController = require('../controllers/journalController');
const auth = require('../middleware/auth');

// Konfigurasi penyimpanan Multer khusus untuk upload jurnal+gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  }
});

// All routes require authentication
router.use(auth);

router.get('/', journalController.getJournals);
router.get('/:id', journalController.getJournal);
router.post('/', journalController.createJournal);
// Endpoint baru: buat jurnal + upload gambar dalam satu request (multipart/form-data)
router.post('/with-image', upload.single('image'), journalController.createJournalWithImage);
router.put('/:id', journalController.updateJournal);
router.delete('/:id', journalController.deleteJournal);

module.exports = router;