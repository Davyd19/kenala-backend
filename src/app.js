const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./models');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- TAMBAHAN BARU ---
// Membuat folder 'uploads' menjadi statis (bisa diakses publik)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// ---------------------

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve admin dashboard
app.use(express.static(path.join(__dirname, '../')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/journals', require('./routes/journals'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/admin', require('./routes/admin')); // Admin routes

// --- TAMBAHAN BARU ---
// Menambahkan rute untuk upload
app.use('/api/upload', require('./routes/upload'));
// ---------------------

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin_dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  // Tangani error dari Multer
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Hanya file .jpeg, .jpg, atau .png yang diizinkan') {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Database sync and server start
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database (use { force: true } to drop and recreate tables - ONLY in development!)
    await db.sequelize.sync({ alter: true }); // alter: true will update tables without dropping
    console.log('Database synchronized.');

    // --- TAMBAHAN BARU: Buat folder 'uploads' jika belum ada ---
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
        console.log('Uploads directory created.');
    }
    // -----------------------------------------------------

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;