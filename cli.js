#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

// Parse CLI args
const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-V') || args.includes('version')) {
  console.log(version);
  process.exit(0);
}

// Show help if no valid args
console.log('throttle-x - Zero-dependency throttle and debounce utilities');
console.log('');
console.log('Usage:');
console.log('  throttle-x --version, -V, version  Show version');
console.log('');
console.log('Package version:', version);
process.exit(0);