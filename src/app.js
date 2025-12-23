const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const db = require('./models');

const trackingHandler = require('./socket/trackingHandler');

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.static(path.join(__dirname, '../')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/journals', require('./routes/journals'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/suggestions', require('./routes/suggestions'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin_dashboard.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`User connected to socket: ${socket.id}`);
  
  try {
      trackingHandler(io, socket);
  } catch (error) {
      console.error("Error in tracking handler:", error);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
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

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    await db.sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
        console.log('Uploads directory created.');
    }

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