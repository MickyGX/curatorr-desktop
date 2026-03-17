const { app, Tray, Menu, shell, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ── Single instance lock ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Paths ──────────────────────────────────────────────────────────────────
app.setName('Curatorr');

const USER_DATA   = app.getPath('userData');
const CONFIG_DIR  = path.join(USER_DATA, 'config');
const DATA_DIR    = path.join(USER_DATA, 'data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const SECRET_FILE = path.join(USER_DATA, 'session-secret');
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
    await import(pathToFileURL(CURATORR_INDEX).href);
  } catch (err) {
    dialog.showErrorBox(
      'Curatorr failed to start',
      `${err.message}\n\nCheck that all dependencies are installed.\nRun: npm run rebuild`
    );
    app.quit();
    return;
  }

  // Build tray icon
  const iconFile = path.join(__dirname, 'build', 'tray-icon.png');
  const icon = fs.existsSync(iconFile)
    ? nativeImage.createFromPath(iconFile)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Curatorr');

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
  setTimeout(() => shell.openExternal(BASE_URL), 1500);

  // Check for updates silently — notify user only when one is available
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // Silently ignore update check failures (offline, dev mode, etc.)
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
