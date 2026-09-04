const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
require('./config/database');

const app = express();

// Allow requests from any origin (update in production to your frontend URL)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: '🌾 KisanFlow API is running' });
});

// For local development: start listening
// For Vercel: module.exports is enough (serverless)
if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV === 'true') {
  const http = require('http');
  const socketIo = require('socket.io');
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('join-centre', (centreId) => {
      socket.join(`centre-${centreId}`);
    });
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected');
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🌾 KisanFlow running on http://localhost:${PORT}`);
  });
}

module.exports = app;