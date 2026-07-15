const { describe, it } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const dist = require('../dist/index.js');

describe('VERSION constant', () => {
  it('should export VERSION as a string', () => {
    assert.strictEqual(typeof dist.VERSION, 'string');
  });

  it('VERSION should be valid semver format', () => {
    const semverRegex = /^(\d+\.\d+\.\d+)(-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?(\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/;
    assert.match(dist.VERSION, semverRegex);
  });

  it('VERSION should match package.json version', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(dist.VERSION, packageJson.version);
  });
});

describe('CLI version flags', () => {
  it('--version flag should output version', () => {
    const output = execSync(`node ${path.join(projectRoot, 'cli.js')} --version`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });

  it('-V flag should output version', () => {
    const output = execSync(`node ${path.join(projectRoot, 'cli.js')} -V`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });

  it('version command should output version', () => {
    const output = execSync(`node ${path.join(projectRoot, 'cli.js')} version`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });
});