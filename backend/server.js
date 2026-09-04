const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const routes = require('./routes');
require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: '🌾 KisanFlow API is running' });
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