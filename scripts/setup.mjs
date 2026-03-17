#!/usr/bin/env node
/**
 * postinstall — runs after `npm install` in curatorr-desktop.
 * 1. Installs curatorr's production dependencies (if not already done)
 * 2. Rebuilds native modules (better-sqlite3) against Electron's Node ABI
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');
const curatorr  = join(root, 'curatorr');

// Only run inside the dev repo (skip during electron-builder packaging)
if (process.env.ELECTRON_BUILDER_SKIP_POSTINSTALL) process.exit(0);
if (!existsSync(curatorr)) {
  console.warn('[setup] curatorr submodule not found — skipping. Run: git submodule update --init');
  process.exit(0);
}

const run = (cmd, cwd = root) => {
  console.log(`[setup] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

// 1. Install curatorr's production deps
run('npm install --omit=dev', curatorr);

// 2. Rebuild native modules (better-sqlite3) for Electron
run(`npx electron-rebuild --module-dir "${curatorr}"`);

console.log('[setup] Done.');
