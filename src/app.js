const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Import HTTP module
const socketIo = require('socket.io'); // Import Socket.io
require('dotenv').config();

const db = require('./models');

// Import Tracking Handler untuk Socket.io (Pastikan file ini sudah dibuat di src/socket/trackingHandler.js)
const trackingHandler = require('./socket/trackingHandler'); 

const app = express();

// --- SETUP SERVER & SOCKET.IO ---
// Kita bungkus app express dengan HTTP server agar bisa dipakai Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // Izinkan koneksi dari mana saja (Android)
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- STATIC FILES ---
// Membuat folder 'uploads' menjadi statis (bisa diakses publik)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve admin dashboard
app.use(express.static(path.join(__dirname, '../')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- API ROUTES ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/journals', require('./routes/journals'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tracking', require('./routes/tracking')); // Route HTTP tracking biasa
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/suggestions', require('./routes/suggestions'));

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin_dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- SOCKET.IO CONNECTION HANDLER ---
io.on('connection', (socket) => {
  console.log(`User connected to socket: ${socket.id}`);
  
  // Panggil handler tracking terpisah untuk menghandle logika real-time
  try {
      trackingHandler(io, socket);
  } catch (error) {
      console.error("Error in tracking handler:", error);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- ERROR HANDLING ---
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

// --- DATABASE SYNC & SERVER START ---
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database
    // alter: true akan mengupdate tabel tanpa menghapus data
    await db.sequelize.sync({ alter: true }); 
    console.log('Database synchronized.');

    // Buat folder 'uploads' jika belum ada
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
        console.log('Uploads directory created.');
    }

    // PENTING: Gunakan server.listen() BUKAN app.listen()
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is active`);
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