// Dev file watcher that emits reload events via realtime service HTTP endpoint
// Uses chokidar with native fs events (no polling) to watch frontend/backend paths.

const chokidar = require('chokidar');
const http = require('http');

const RELOAD_HOST = process.env.REALTIME_HOST || 'realtime';
const RELOAD_PORT = parseInt(process.env.REALTIME_PORT || '4000', 10);
const RELOAD_SECRET = process.env.DEV_RELOAD_SECRET || '';

// Paths to watch from within the Docker compose volume mounts
const paths = (process.env.WATCH_PATHS || '/app/../web/src,/app/../backend').split(',');
const ignored = [
  '**/node_modules/**',
  '**/.next/**',
  '**/__pycache__/**',
  '**/.git/**',
  '**/migrations/**',
];

function triggerReload(reason, source, file) {
  const payload = JSON.stringify({ reason, source, file });
  const req = http.request({
    host: RELOAD_HOST,
    port: RELOAD_PORT,
    path: '/dev/reload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-reload-secret': RELOAD_SECRET,
    },
  }, (res) => {
    // consume and ignore
    res.resume();
  });
  req.on('error', (e) => {
    console.error('Failed to signal reload:', e.message);
  });
  req.write(payload);
  req.end();
}

const watcher = chokidar.watch(paths, {
  ignored,
  ignoreInitial: true,
  usePolling: false, // ensure native events
  awaitWriteFinish: {
    stabilityThreshold: 150,
    pollInterval: 20,
  },
});

console.log('Dev watcher started. Watching:', paths);

watcher
  .on('add', (file) => {
    console.log('[watcher] add:', file)
    triggerReload('add', 'fs', file)
  })
  .on('change', (file) => {
    console.log('[watcher] change:', file)
    triggerReload('change', 'fs', file)
  })
  .on('unlink', (file) => {
    console.log('[watcher] unlink:', file)
    triggerReload('unlink', 'fs', file)
  });
