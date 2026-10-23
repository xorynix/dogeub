'use strict';

const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.resolve(__dirname, '../dist');
const MAX_AI_BODY = 24_000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

function getAiEndpoint() {
  if (process.env.DOGEUB_LITE_AI_ENDPOINT) return process.env.DOGEUB_LITE_AI_ENDPOINT;
  const configPath = app.isPackaged
    ? path.join(process.resourcesPath, 'ai-endpoint.json')
    : path.join(__dirname, 'ai-endpoint.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return typeof config.endpoint === 'string' ? config.endpoint.trim() : '';
  } catch {
    return '';
  }
}

async function handleAi(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return json(res, 405, { error: 'Use POST to chat with Doge AI.' });
  }

  let endpoint;
  try {
    endpoint = new URL(getAiEndpoint());
    if (endpoint.protocol !== 'https:') throw new Error('HTTPS is required');
  } catch {
    return json(res, 503, {
      error: 'Doge AI needs an online DOGEUB AI endpoint. Set DOGEUB_LITE_AI_ENDPOINT in the GitHub Actions variables before building a release.',
    });
  }

  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_AI_BODY) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', async () => {
    if (size > MAX_AI_BODY) return;
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await upstream.text();
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      });
      res.end(body.slice(0, 100_000));
    } catch {
      json(res, 502, { error: 'Doge AI could not connect. Check the internet connection and AI service.' });
    }
  });
}

function safeDistPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const requested = decoded === '/' ? '/lite/' : decoded;
  const relative = requested.replace(/^\/+/, '');
  let resolved = path.resolve(DIST_DIR, relative);
  if (resolved !== DIST_DIR && !resolved.startsWith(DIST_DIR + path.sep)) return null;
  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      resolved = path.join(resolved, 'index.html');
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
    if (requested.startsWith('/lite/')) return path.join(DIST_DIR, 'lite', 'index.html');
  } catch {
    return null;
  }
  return null;
}

function createLocalServer() {
  return http.createServer((req, res) => {
    const address = new URL(req.url || '/', 'http://127.0.0.1');
    if (address.pathname === '/api/doge-ai') {
      void handleAi(req, res);
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      json(res, 405, { error: 'Method not allowed.' });
      return;
    }
    const filePath = safeDistPath(address.pathname);
    if (!filePath) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    try {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'content-type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'content-length': stat.size,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Unable to read app file.');
    }
  });
}

let localServer;

async function createWindow() {
  if (!fs.existsSync(path.join(DIST_DIR, 'lite', 'index.html'))) {
    throw new Error('DOGEUB Lite assets are missing. Rebuild the app before packaging.');
  }

  localServer = createLocalServer();
  await new Promise((resolve, reject) => {
    localServer.once('error', reject);
    localServer.listen(0, '127.0.0.1', resolve);
  });
  const port = localServer.address().port;
  const startUrl = `http://127.0.0.1:${port}/lite/`;

  const window = new BrowserWindow({
    width: 1260,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08111f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (['https:', 'http:'].includes(target.protocol)) void shell.openExternal(target.href);
    } catch {}
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith(`http://127.0.0.1:${port}/`)) return;
    event.preventDefault();
    try {
      const target = new URL(targetUrl);
      if (['https:', 'http:'].includes(target.protocol)) void shell.openExternal(target.href);
    } catch {}
  });

  window.once('ready-to-show', () => window.show());
  await window.loadURL(startUrl);
}

app.whenReady().then(() => {
  app.setAppUserModelId('dev.dogeub.lite');
  return createWindow();
}).catch((error) => {
  console.error('DOGEUB Lite failed to start:', error);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on('before-quit', () => {
  if (localServer) localServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
