#!/usr/bin/env -S pnpx tsx
/**
 * Development server launcher.
 *
 * 1. Installs dependencies (pnpm install)
 * 2. Finds a free port with portplz (install: cargo install portplz)
 * 3. Starts Vite on that port and opens the browser at the main page
 *
 * Usage:
 *   ./scripts/dev.ts
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildViteArgs, parsePort } from './dev-utils.ts';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

console.log('▶ Installing dependencies...');
const install = spawnSync('pnpm', ['install'], {
  cwd: projectRoot,
  stdio: 'inherit',
});
if (install.status !== 0) {
  fail('pnpm install failed');
}

console.log('▶ Finding a free port...');
const portplz = spawnSync('portplz', [], { encoding: 'utf8' });
if (portplz.error || portplz.status !== 0) {
  fail('Could not run portplz. Install it with: cargo install portplz');
}
const port = parsePort(portplz.stdout);
if (port === null) {
  fail(`portplz returned an invalid port: ${JSON.stringify(portplz.stdout)}`);
}

console.log(`▶ Starting Vite on http://localhost:${port} ...`);
const vite = spawn('pnpm', buildViteArgs(port), {
  cwd: projectRoot,
  stdio: 'inherit',
});
vite.on('error', (error) => {
  fail(`Failed to start Vite: ${error.message}`);
});
vite.on('exit', (code) => {
  process.exit(code ?? 0);
});
