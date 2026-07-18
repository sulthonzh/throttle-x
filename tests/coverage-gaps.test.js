const { test } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');
const {
  throttle,
  debounce,
  delay,
  createThrottle,
  createDebounce,
} = require('../dist/index.js');

const projectRoot = path.join(__dirname, '..');

// === CLI help/no-args path (cli.js lines 22-29) ===

test('CLI: no args shows help output', () => {
  const output = execSync(`node ${path.join(projectRoot, 'cli.js')}`, {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  assert.ok(output.includes('throttle-x'));
  assert.ok(output.includes('Usage:'));
  assert.ok(output.includes('--version'));
});

test('CLI: --help flag shows help output', () => {
  const output = execSync(`node ${path.join(projectRoot, 'cli.js')} --help`, {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  assert.ok(output.includes('throttle-x'));
  assert.ok(output.includes('Usage:'));
});

test('CLI: -h flag shows help output', () => {
  const output = execSync(`node ${path.join(projectRoot, 'cli.js')} -h`, {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  assert.ok(output.includes('throttle-x'));
  assert.ok(output.includes('Usage:'));
});

test('CLI: help command shows help output', () => {
  const output = execSync(`node ${path.join(projectRoot, 'cli.js')} help`, {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  assert.ok(output.includes('throttle-x'));
  assert.ok(output.includes('Usage:'));
});

// === createThrottle factory function (lines 295-297) ===

test('createThrottle: returns a throttled function', () => {
  let calls = 0;
  const fn = createThrottle(() => {
    calls++;
    return 'result';
  }, 100);
  assert.strictEqual(typeof fn, 'function');
  assert.strictEqual(typeof fn.cancel, 'function');
  assert.strictEqual(typeof fn.flush, 'function');
  assert.strictEqual(fn.pending, false);

  const result = fn();
  assert.strictEqual(result, 'result');
  assert.strictEqual(calls, 1);
  fn.cancel();
});

test('createThrottle: behaves identically to throttle', async () => {
  let calls = 0;
  const fn = createThrottle(() => calls++, 60);
  fn();
  fn();
  assert.strictEqual(calls, 1);
  await delay(80);
  assert.strictEqual(calls, 2);
  fn.cancel();
});

test('createThrottle: accepts options (leading: false)', async () => {
  let calls = 0;
  const fn = createThrottle(() => calls++, 60, { leading: false });
  fn();
  assert.strictEqual(calls, 0);
  await delay(80);
  assert.strictEqual(calls, 1);
});

test('createThrottle: accepts options (trailing: false)', async () => {
  let calls = 0;
  const fn = createThrottle(() => calls++, 60, { trailing: false });
  fn();
  fn();
  assert.strictEqual(calls, 1);
  await delay(80);
  assert.strictEqual(calls, 1);
});

// === createDebounce factory function (lines 301-303) ===

test('createDebounce: returns a debounced function', () => {
  let calls = 0;
  const fn = createDebounce(() => {
    calls++;
    return 'result';
  }, 100);
  assert.strictEqual(typeof fn, 'function');
  assert.strictEqual(typeof fn.cancel, 'function');
  assert.strictEqual(typeof fn.flush, 'function');
  assert.strictEqual(fn.pending, false);
  fn.cancel();
});

test('createDebounce: behaves identically to debounce', async () => {
  let calls = 0;
  const fn = createDebounce(() => calls++, 50);
  fn();
  fn();
  assert.strictEqual(calls, 0);
  await delay(70);
  assert.strictEqual(calls, 1);
});

test('createDebounce: accepts options (leading: true)', () => {
  let calls = 0;
  const fn = createDebounce(() => calls++, 100, { leading: true });
  fn();
  assert.strictEqual(calls, 1);
  fn.cancel();
});

test('createDebounce: accepts options (trailing: false)', async () => {
  let calls = 0;
  const fn = createDebounce(() => calls++, 50, {
    leading: true,
    trailing: false,
  });
  fn();
  fn();
  assert.strictEqual(calls, 1);
  await delay(70);
  assert.strictEqual(calls, 1);
});

// === Throttle timer re-schedule path (elapsed < waitMs in timer callback) ===

test('throttle: timer reschedules when called again during timer wait', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 80);
  fn(); // leading call at t=0
  assert.strictEqual(calls, 1);
  // Wait part of the window, then call again to set lastCallTime
  await delay(30);
  fn(); // stores trailing args, updates lastCallTime to t=30
  // At t=80, timer fires: elapsed = 80-30 = 50 < 80, so it reschedules
  // Wait enough for the reschedule to complete
  await delay(120);
  // The trailing call should have fired by now
  assert.ok(calls >= 2, `expected calls >= 2, got ${calls}`);
  fn.cancel();
});

test('throttle: multiple calls during window trigger trailing', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 60);
  fn(); // t=0 leading
  fn(); // trailing pending
  fn(); // trailing pending (same args)
  await delay(80);
  assert.strictEqual(calls, 2); // leading + trailing
  fn.cancel();
});

// === Throttle flush without pending (returns lastResult) ===

test('throttle: flush without pending returns last result', () => {
  let calls = 0;
  const fn = throttle((v) => {
    calls++;
    return v;
  }, 1000);
  fn('first');
  assert.strictEqual(calls, 1);
  // Don't call again — no pending trailing
  const result = fn.flush();
  assert.strictEqual(result, 'first');
  assert.strictEqual(calls, 1); // no additional call
  fn.cancel();
});

test('throttle: flush after cancel returns last result', () => {
  const fn = throttle((v) => v, 100);
  fn('value');
  fn.cancel();
  const result = fn.flush();
  assert.strictEqual(result, 'value');
});

// === Debounce flush with timer but no pending args ===

test('debounce: flush with leading-only and no trailing args', () => {
  let calls = 0;
  const fn = debounce(() => calls++, 100, { leading: true, trailing: false });
  const leadingResult = fn(); // leading fires, lastArgs = null
  assert.strictEqual(leadingResult, 0); // calls++ returns 0
  // Timer is set, but lastArgs is null since leading consumed them
  const result = fn.flush();
  // Timer exists, but lastArgs is null → just resets canLeadingFire, returns lastResult
  assert.strictEqual(calls, 1); // only the leading call
  assert.strictEqual(result, 0); // lastResult from leading call
});

test('debounce: flush after timer fires returns lastResult', async () => {
  let calls = 0;
  const fn = debounce(() => {
    calls++;
    return 'done';
  }, 40);
  fn();
  await delay(60); // timer fires, lastResult = 'done'
  // After timer, flush should return lastResult (timer is null)
  const result = fn.flush();
  assert.strictEqual(result, 'done');
  assert.strictEqual(calls, 1);
});

// === Throttle with leading=false and no timer (edge) ===

test('throttle: leading=false starts timer on first call', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 50, { leading: false });
  fn();
  assert.strictEqual(calls, 0);
  assert.strictEqual(fn.pending, true);
  await delay(70);
  assert.strictEqual(calls, 1);
  fn.cancel();
});

// === Debounce cancel resets canLeadingFire ===

test('debounce: cancel resets leading flag for subsequent calls', () => {
  let calls = 0;
  const fn = debounce(() => calls++, 100, { leading: true });
  fn(); // leading fires (calls=1), canLeadingFire=false
  fn.cancel(); // resets canLeadingFire=true
  fn(); // leading fires again (calls=2)
  assert.strictEqual(calls, 2);
  fn.cancel();
});

// === Debounce leading=true, trailing=true: both fire ===

test('debounce: leading=true trailing=true fires both', async () => {
  let calls = 0;
  const fn = debounce(() => calls++, 40, { leading: true, trailing: true });
  fn(); // leading fires (calls=1)
  fn(); // stores args for trailing, resets timer
  assert.strictEqual(calls, 1);
  await delay(60);
  assert.strictEqual(calls, 2); // trailing fires
  fn.cancel();
});

// === Throttle returns undefined when not invoked yet ===

test('throttle: returns undefined when leading=false and within window', () => {
  const fn = throttle(() => 42, 100, { leading: false });
  const result = fn();
  assert.strictEqual(result, undefined);
  fn.cancel();
});
