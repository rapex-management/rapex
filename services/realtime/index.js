const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.SIMPLE_JWT_SECRET || 'supersecret';

const sub = new Redis(REDIS_URL);
// ioredis auto-connects when instantiated; subscribe directly
sub.subscribe('orders', (err, count) => {
  if (err) console.error('Failed to subscribe to orders:', err);
  else console.log('Subscribed to orders channel');
});
sub.on('message', (channel, message) => {
  try {
    const payload = JSON.parse(message);
    // Broadcast to admin room
    io.to('admins').emit('order:new', payload);
  } catch (err) {
    console.error('Invalid message on orders channel', err);
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth error'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    next();
  } catch (e) {
    next(new Error('Auth error'));
  }
});

io.on('connection', (socket) => {
  if (socket.user?.role === 'ADMIN' || socket.user?.role === 'SUPERADMIN') {
    socket.join('admins');
  }
  socket.on('disconnect', () => {});
});

server.listen(4000, () => console.log('Realtime listening on 4000'));
