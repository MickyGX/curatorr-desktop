#!/usr/bin/env node
/**
 * postinstall — runs after `npm install` in curatorr-desktop.
 * 1. Installs curatorr's production dependencies (skipping native compilation)
 * 2. Downloads the correct prebuilt better-sqlite3 binary for the installed Electron version
 *    — no Python or build tools required.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root          = join(__dirname, '..');
const curatorr      = join(root, 'curatorr');
const sqlite3Dir    = join(curatorr, 'node_modules', 'better-sqlite3');

// Skip during electron-builder packaging
if (process.env.ELECTRON_BUILDER_SKIP_POSTINSTALL) process.exit(0);

if (!existsSync(curatorr)) {
  console.warn('[setup] curatorr submodule not found — run: git submodule update --init');
  process.exit(0);
}

const run = (cmd, cwd = root) => {
  console.log(`[setup] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

// Detect installed Electron version from curatorr-desktop's node_modules
const electronPkg = join(root, 'node_modules', 'electron', 'package.json');
const electronVersion = JSON.parse(readFileSync(electronPkg, 'utf8')).version;
console.log(`[setup] Electron version: ${electronVersion}`);

// 1. Install curatorr deps — skip postinstall scripts to avoid native compilation
console.log('[setup] Installing curatorr dependencies (skipping native build scripts)...');
run('npm install --omit=dev --ignore-scripts', curatorr);

// 2. Download prebuilt better-sqlite3 binary for Electron (no Python needed)
console.log(`[setup] Downloading prebuilt better-sqlite3 for Electron ${electronVersion}...`);
try {
  const prebuildBin = join(curatorr, 'node_modules', '.bin', 'prebuild-install');
  run(`"${prebuildBin}" --runtime electron --target ${electronVersion} --arch x64 --tag-prefix v`, sqlite3Dir);
  console.log('[setup] better-sqlite3 prebuilt binary installed successfully.');
} catch (err) {
  console.error('[setup] Failed to download prebuilt better-sqlite3 binary.');
  console.error('[setup] You may need to install Visual Studio Build Tools and Python, then run: npm install');
  console.error(err.message);
  process.exit(1);
}

console.log('[setup] Done.');
