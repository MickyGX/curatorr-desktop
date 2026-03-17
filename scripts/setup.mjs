#!/usr/bin/env node
/**
 * postinstall — runs after `npm install` in curatorr-desktop.
 * 1. Installs curatorr's production dependencies
 * 2. Attempts to rebuild native modules (better-sqlite3) for Electron's Node ABI
 *    Falls back gracefully — prebuilts usually work on Windows without rebuilding.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root     = join(__dirname, '..');
const curatorr = join(root, 'curatorr');

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

// 1. Install curatorr's production deps
try {
  run('npm install --omit=dev', curatorr);
} catch (err) {
  console.error('[setup] Failed to install curatorr dependencies:', err.message);
  process.exit(1);
}

// 2. Rebuild native modules for Electron — optional, prebuilts usually cover this
try {
  run(`npx electron-rebuild --module-dir "${curatorr}"`);
  console.log('[setup] Native modules rebuilt for Electron.');
} catch {
  console.warn('[setup] electron-rebuild failed — this is usually fine on Windows as prebuilt binaries will be used.');
  console.warn('[setup] If the app crashes on startup, install Visual Studio Build Tools and re-run npm install.');
}

console.log('[setup] Done.');
