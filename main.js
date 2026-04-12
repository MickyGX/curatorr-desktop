const { app, Tray, Menu, shell, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function parseEnvValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }
  return value;
}

function parseEnvFile(content) {
  const parsed = {};
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = normalized.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    parsed[key] = parseEnvValue(normalized.slice(eqIndex + 1));
  }
  return parsed;
}

function readEnvFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return parseEnvFile(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    log(`Failed to read .env file at ${filePath}: ${err.message}`);
    return null;
  }
}

function ensureEnvTemplate(filePath) {
  if (!filePath || fs.existsSync(filePath)) return;
  const template = [
    '# Curatorr Desktop environment overrides',
    '# Uncomment and fill values as needed, then fully restart Curatorr Desktop.',
    '',
    '# Spotify playlist import',
    '# SPOTIFY_CLIENT_ID=your-client-id',
    '# SPOTIFY_CLIENT_SECRET=your-client-secret',
    '# SPOTIFY_TIMEOUT_MS=15000',
    '',
    '# Desktop server port',
    '# PORT=7676',
    '',
    '# Optional Curatorr overrides',
    '# WEBHOOK_SECRET=replace-me',
    '# LOCAL_AUTH_MIN_PASSWORD=12',
    '# SESSION_COOKIE_NAME=curatorr_session',
    '# HTTP_ACCESS_LOGS=true',
    '# HTTP_ACCESS_LOGS_SKIP_STATIC=true',
    '# JSON_BODY_LIMIT=4mb',
    '# URLENCODED_BODY_LIMIT=8mb',
    '# PLEX_CLIENT_ID=replace-me',
    '# PLEX_PRODUCT=Curatorr',
    '# PLEX_PLATFORM=Web',
    '# PLEX_DEVICE_NAME=Curatorr',
    '# EMBED_ALLOWED_ORIGINS=',
    '',
  ].join('\n');
  try {
    fs.writeFileSync(filePath, template, { encoding: 'utf8', flag: 'wx' });
    log(`Created desktop .env template at ${filePath}`);
  } catch (err) {
    if (err && err.code !== 'EEXIST') {
      log(`Failed to create .env template at ${filePath}: ${err.message}`);
    }
  }
}

// ── Early crash logging ────────────────────────────────────────────────────
const LOG_DIR  = path.join(require('os').homedir(), 'AppData', 'Local', 'Curatorr', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'main.log');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  process.stdout.write(line);
};
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.stack || err.message}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  log(`UNHANDLED REJECTION: ${err?.stack || err}`);
});
log('App starting...');

// ── Single instance lock ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Paths ──────────────────────────────────────────────────────────────────
app.setName('Curatorr');

const USER_DATA   = app.getPath('userData');
const APP_DIR     = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const CONFIG_DIR  = path.join(USER_DATA, 'config');
const DATA_DIR    = path.join(USER_DATA, 'data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const SECRET_FILE = path.join(USER_DATA, 'session-secret');
const originalEnvKeys = new Set(Object.keys(process.env));
const installEnvPath = path.join(APP_DIR, '.env');
const userEnvPath = path.join(USER_DATA, '.env');
ensureEnvTemplate(userEnvPath);
const installEnv = readEnvFile(installEnvPath);
const userEnv = readEnvFile(userEnvPath);

if (installEnv) {
  for (const [key, value] of Object.entries(installEnv)) {
    if (!originalEnvKeys.has(key)) process.env[key] = value;
  }
  log(`Loaded desktop .env from ${installEnvPath}`);
}

if (userEnv) {
  for (const [key, value] of Object.entries(userEnv)) {
    if (!originalEnvKeys.has(key)) process.env[key] = value;
  }
  log(`Loaded desktop .env from ${userEnvPath}`);
}

const PORT        = process.env.PORT || 7676;
const BASE_URL    = `http://localhost:${PORT}`;

fs.mkdirSync(CONFIG_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR,   { recursive: true });

// ── Session secret (generate once, persist) ────────────────────────────────
let sessionSecret;
if (fs.existsSync(SECRET_FILE)) {
  sessionSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, sessionSecret, 'utf8');
}

// ── Env vars — set before importing server ─────────────────────────────────
Object.assign(process.env, {
  DATA_DIR,
  CONFIG_PATH,
  BASE_URL,
  SESSION_SECRET: sessionSecret,
  PORT:           String(PORT),
  NODE_ENV:       'production',
  TRUST_PROXY:    'false',
});

// ── Curatorr path — works in both dev and packaged app ─────────────────────
// extraResources copies curatorr/ to resources/curatorr/ in packaged builds
// In dev, it sits alongside main.js at ./curatorr/
const CURATORR_BASE  = app.isPackaged
  ? path.join(process.resourcesPath, 'curatorr')
  : path.join(__dirname, 'curatorr');
const CURATORR_INDEX = path.join(CURATORR_BASE, 'src', 'index.js');

// ── App ready ──────────────────────────────────────────────────────────────
let tray = null;

app.whenReady().then(async () => {
  // Start the Curatorr server
  try {
    log(`Loading curatorr from: ${CURATORR_INDEX}`);
    log(`File exists: ${fs.existsSync(CURATORR_INDEX)}`);
    await import(pathToFileURL(CURATORR_INDEX).href);
    log('Curatorr loaded successfully');
  } catch (err) {
    log(`CURATORR LOAD ERROR: ${err.stack || err.message}`);
    dialog.showErrorBox(
      'Curatorr failed to start',
      `${err.message}\n\nCheck that all dependencies are installed.\nRun: npm run rebuild`
    );
    app.quit();
    return;
  }

  // Build tray icon
  log('Building tray icon...');
  const iconFile = path.join(__dirname, 'build', 'tray-icon.png');
  const icon = fs.existsSync(iconFile)
    ? nativeImage.createFromPath(iconFile)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Curatorr');
  log('Tray created');

  const buildMenu = () => Menu.buildFromTemplate([
    { label: 'Open Curatorr', click: () => shell.openExternal(BASE_URL) },
    { type: 'separator' },
    { label: `Running on ${BASE_URL}`, enabled: false },
    { type: 'separator' },
    { label: 'Quit Curatorr', click: () => app.quit() },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => shell.openExternal(BASE_URL));
  tray.on('double-click', () => shell.openExternal(BASE_URL));

  // Open browser once server has had a moment to bind
  log(`Opening browser at ${BASE_URL} in 1.5s...`);
  setTimeout(() => {
    log('Firing shell.openExternal...');
    shell.openExternal(BASE_URL);
  }, 1500);

  // Check for updates silently — notify user only when one is available
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log(`Update check failed (non-fatal): ${err.message}`);
  });
});

// ── Second instance → focus browser ───────────────────────────────────────
app.on('second-instance', () => {
  shell.openExternal(BASE_URL);
});

// ── Keep running in tray when all windows closed ───────────────────────────
app.on('window-all-closed', () => {
  // intentionally empty — live in tray
});
