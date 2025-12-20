const fs = require('fs');
const path = require('path');

/**
 * Menghapus file dari sistem (misal: menghapus foto lama saat update profil)
 * @param {string} filePath - Path relatif file yang akan dihapus
 */
const deleteFile = (filePath) => {
  if (!filePath) return;
  
  try {
    // Sesuaikan path ini tergantung struktur folder Anda. 
    // Asumsi: helper ada di src/utils/ dan uploads ada di root project ../../uploads
    const fullPath = path.join(__dirname, '../../', filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`File deleted: ${fullPath}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Menghitung jarak antara dua koordinat menggunakan Haversine formula
 * @param {number} lat1 - Latitude titik 1
 * @param {number} lon1 - Longitude titik 1
 * @param {number} lat2 - Latitude titik 2
 * @param {number} lon2 - Longitude titik 2
 * @returns {number} Jarak dalam meter (dibulatkan)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // dalam meter
  return Math.round(distance);
}

/**
 * Mengecek apakah user sudah dalam radius clue
 * @param {number} distance - Jarak dalam meter
 * @param {number} radius - Radius deteksi dalam meter (default 30m agar lebih akurat)
 * @returns {boolean}
 */
function isWithinRadius(distance, radius = 30) {
  return distance <= radius;
}

/**
 * Format jarak untuk ditampilkan ke user
 * @param {number} meters - Jarak dalam meter
 * @returns {string} Jarak terformat (contoh: "45 m" atau "2.3 km")
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Mendapatkan pesan motivasi/navigasi berdasarkan sisa jarak
 * @param {number} meters - Jarak dalam meter
 * @returns {string} Pesan untuk user
 */
function getDistanceMessage(meters) {
  if (meters < 10) {
    return 'Anda sudah sangat dekat! Lihat sekeliling Anda.';
  } else if (meters < 30) {
    return `Target sudah di depan mata (${meters} meter lagi).`;
  } else if (meters < 100) {
    return `Anda hampir sampai, tinggal ${meters} meter lagi.`;
  } else if (meters < 500) {
    return `Masih ${formatDistance(meters)} lagi, tetap semangat!`;
  } else if (meters < 1000) {
    return `Jarak ${formatDistance(meters)} dari tujuan.`;
  } else {
    return `Anda masih ${formatDistance(meters)} dari tujuan.`;
  }
}

module.exports = {
  deleteFile,
  calculateDistance,
  isWithinRadius,
  formatDistance,
  getDistanceMessage
};