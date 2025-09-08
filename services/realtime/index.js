const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.SIMPLE_JWT_SECRET || 'supersecret';
const ENABLE_DEV_RELOAD = process.env.ENABLE_DEV_RELOAD === 'true';
const DEV_RELOAD_SECRET = process.env.DEV_RELOAD_SECRET || '';

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

// Auth middleware: skip for reload namespace
io.use((socket, next) => {
  if (socket.nsp && socket.nsp.name === '/reload') {
    return next();
  }
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

// Reload namespace (no auth) for dev live-reload broadcasting
const reloadNsp = io.of('/reload');
reloadNsp.on('connection', (socket) => {
  // no-op; clients just listen for 'reload'
});

// Optional HTTP endpoint to trigger reload broadcasts from a file watcher
if (ENABLE_DEV_RELOAD) {
  app.post('/dev/reload', (req, res) => {
    const secret = req.get('x-reload-secret') || '';
    if (DEV_RELOAD_SECRET && secret !== DEV_RELOAD_SECRET) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const body = req.body || {};
    const payload = {
      reason: body.reason || 'change',
      source: body.source || 'unknown',
      file: body.file || null,
      ts: Date.now(),
    };
  console.log('[dev-reload] Emitting reload:', payload);
    reloadNsp.emit('reload', payload);
    return res.json({ ok: true });
  });
}

server.listen(4000, () => console.log('Realtime listening on 4000'));
