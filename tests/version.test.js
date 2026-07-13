import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const dist = await import('../dist/index.js');

describe('VERSION constant', () => {
  it('should export VERSION as a string', () => {
    assert.strictEqual(typeof dist.VERSION, 'string');
  });

  it('VERSION should be valid semver format', () => {
    const semverRegex = /^(\d+\.\d+\.\d+)(-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?(\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/;
    assert.match(dist.VERSION, semverRegex);
  });

  it('VERSION should match package.json version', async () => {
    const { readFileSync } = await import('fs');
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(dist.VERSION, packageJson.version);
  });
});

describe('CLI version flags', () => {
  it('--version flag should output version', async () => {
    const { execSync } = await import('child_process');
    const output = execSync(`node ${join(projectRoot, 'cli.js')} --version`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const { readFileSync } = await import('fs');
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });

  it('-V flag should output version', async () => {
    const { execSync } = await import('child_process');
    const output = execSync(`node ${join(projectRoot, 'cli.js')} -V`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const { readFileSync } = await import('fs');
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });

  it('version command should output version', async () => {
    const { execSync } = await import('child_process');
    const output = execSync(`node ${join(projectRoot, 'cli.js')} version`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    const { readFileSync } = await import('fs');
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    assert.strictEqual(output, packageJson.version);
  });
});