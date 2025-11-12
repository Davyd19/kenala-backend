const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');

// Konfigurasi penyimpanan Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tentukan folder penyimpanan
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Buat nama file unik (misal: timestamp-namanasli.jpg)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter file (hanya izinkan gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file .jpeg, .jpg, atau .png yang diizinkan'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Batas 5MB
  }
});

/**
 * @route   POST /api/upload
 * @desc    Upload satu gambar
 * @access  Private
 */
router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
  }

  // PENTING: Gunakan 10.0.2.2 untuk emulator Android agar bisa mengakses localhost
  // Jika menggunakan device fisik, ganti dengan IP laptop Anda (misal: 192.168.1.10)
  const imageUrl = `${req.protocol}://10.0.2.2:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
  
  res.json({
    message: 'File berhasil diunggah',
    imageUrl: imageUrl
  });
});

module.exports = router;