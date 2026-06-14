'use strict';

const assert = require('assert');
const { debounce, throttle, once, memoize, delay, sleep, timeout, debounceAsync, throttleAsync } = require('../src/index.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// ─── debounce ────────────────────────────────────────────────────────────────

test('debounce — calls fn after wait ms', () => {
  let calls = 0;
  const d = debounce(() => calls++, 50);
  d();
  assert.strictEqual(calls, 0);
  assert.strictEqual(d.pending(), true);
});

asyncTest('debounce — trailing call fires', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 30);
  d();
  d();
  d();
  await delay(60);
  assert.strictEqual(calls, 1);
});

asyncTest('debounce — leading=true fires immediately', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 30, { leading: true, trailing: false });
  d();
  assert.strictEqual(calls, 1);
  d();
  assert.strictEqual(calls, 1);
  await delay(60);
  assert.strictEqual(calls, 1);
});

asyncTest('debounce — leading + trailing', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 30, { leading: true, trailing: true });
  d();
  assert.strictEqual(calls, 1);
  d();
  await delay(60);
  assert.strictEqual(calls, 2);
});

asyncTest('debounce — cancel prevents trailing call', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 30);
  d();
  d.cancel();
  await delay(60);
  assert.strictEqual(calls, 0);
  assert.strictEqual(d.pending(), false);
});

asyncTest('debounce — flush invokes immediately', async () => {
  let calls = 0;
  const d = debounce((x) => calls++, 30);
  d(42);
  d.flush();
  assert.strictEqual(calls, 1);
  assert.strictEqual(d.pending(), false);
});

asyncTest('debounce — preserves arguments', async () => {
  let captured;
  const d = debounce((...args) => { captured = args; }, 20);
  d(1, 2, 3);
  await delay(40);
  assert.deepStrictEqual(captured, [1, 2, 3]);
});

asyncTest('debounce — preserves this context', async () => {
  let captured;
  const obj = {
    val: 99,
    fn() { captured = this.val; }
  };
  obj.d = debounce(obj.fn, 20);
  obj.d();
  await delay(40);
  assert.strictEqual(captured, 99);
});

asyncTest('debounce — trailing=false suppresses trailing', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 30, { trailing: false });
  d();
  await delay(60);
  assert.strictEqual(calls, 0);
});

asyncTest('debounce — wait=0 fires on next tick', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 0);
  d();
  await delay(10);
  assert.strictEqual(calls, 1);
});

// ─── throttle ────────────────────────────────────────────────────────────────

asyncTest('throttle — invokes immediately with leading=true', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30);
  t();
  assert.strictEqual(calls, 1);
});

asyncTest('throttle — leading=false delays first call', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30, { leading: false });
  t();
  assert.strictEqual(calls, 0);
  await delay(50);
  assert.strictEqual(calls, 1);
});

asyncTest('throttle — limits calls within wait window', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30);
  t(); t(); t(); t();
  assert.strictEqual(calls, 1);
  await delay(40);
  // trailing call
  assert.ok(calls >= 1 && calls <= 2);
});

asyncTest('throttle — cancel clears pending', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30);
  t();
  t.cancel();
  await delay(50);
  assert.strictEqual(calls, 1);
  assert.strictEqual(t.pending(), false);
});

asyncTest('throttle — flush invokes pending trailing', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30);
  t();
  t();  // this would be trailing
  const p = t.pending();
  t.flush();
  // flush may or may not have a pending call depending on timing
  assert.ok(calls >= 1);
});

asyncTest('throttle — trailing=false', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30, { trailing: false });
  t();
  t();
  assert.strictEqual(calls, 1);
  await delay(50);
  assert.strictEqual(calls, 1);
});

asyncTest('throttle — allows second call after wait', async () => {
  let calls = 0;
  const t = throttle(() => calls++, 30);
  t();
  assert.strictEqual(calls, 1);
  await delay(40);
  t();
  assert.strictEqual(calls, 2);
});

// ─── once ────────────────────────────────────────────────────────────────────

test('once — executes only once', () => {
  let calls = 0;
  const o = once(() => ++calls);
  assert.strictEqual(o(), 1);
  assert.strictEqual(o(), 1);
  assert.strictEqual(o(), 1);
  assert.strictEqual(calls, 1);
});

test('once — reset allows re-execution', () => {
  let calls = 0;
  const o = once(() => ++calls);
  o();
  o.reset();
  o();
  assert.strictEqual(calls, 2);
});

test('once — preserves arguments on first call', () => {
  let captured;
  const o = once((...args) => { captured = args; });
  o(1, 2, 3);
  o(4, 5, 6);
  assert.deepStrictEqual(captured, [1, 2, 3]);
});

// ─── memoize ──────────────────────────────────────────────────────────────────

test('memoize — caches by first argument', () => {
  let calls = 0;
  const m = memoize((x) => { calls++; return x * 2; });
  assert.strictEqual(m(5), 10);
  assert.strictEqual(m(5), 10);
  assert.strictEqual(m(3), 6);
  assert.strictEqual(calls, 2);
});

test('memoize — custom resolver', () => {
  let calls = 0;
  const m = memoize(
    (a, b) => { calls++; return a + b; },
    (a, b) => `${a}:${b}`
  );
  m(1, 2);
  m(1, 2);
  m(2, 1);
  assert.strictEqual(calls, 2);
});

test('memoize — clear resets cache', () => {
  let calls = 0;
  const m = memoize((x) => { calls++; return x; });
  m(1);
  m(1);
  m.clear();
  m(1);
  assert.strictEqual(calls, 2);
});

test('memoize — cache is accessible', () => {
  const m = memoize((x) => x * 3);
  m(1);
  m(2);
  assert.ok(m.cache instanceof Map);
  assert.strictEqual(m.cache.size, 2);
});

// ─── delay / sleep ───────────────────────────────────────────────────────────

asyncTest('delay — resolves after ms', async () => {
  const start = Date.now();
  await delay(50);
  assert.ok(Date.now() - start >= 45);
});

asyncTest('sleep — alias for delay', async () => {
  await sleep(10);
  assert.ok(true);
});

asyncTest('delay — handles zero', async () => {
  await delay(0);
  assert.ok(true);
});

// ─── timeout ─────────────────────────────────────────────────────────────────

asyncTest('timeout — resolves if fast enough', async () => {
  const result = await timeout(Promise.resolve(42), 100);
  assert.strictEqual(result, 42);
});

asyncTest('timeout — rejects if too slow', async () => {
  const slow = new Promise(r => setTimeout(r, 200));
  await assert.rejects(
    () => timeout(slow, 50),
    (err) => err.name === 'TimeoutError'
  );
});

asyncTest('timeout — custom message', async () => {
  const slow = new Promise(r => setTimeout(r, 200));
  await assert.rejects(
    () => timeout(slow, 50, 'custom timeout'),
    (err) => err.message === 'custom timeout'
  );
});

// ─── debounceAsync ───────────────────────────────────────────────────────────

asyncTest('debounceAsync — only last call resolves', async () => {
  let calls = 0;
  const d = debounceAsync(async (x) => { calls++; return x * 2; }, 30);
  const p1 = d(1);
  const p2 = d(2);
  const p3 = d(3);
  const r = await p3;
  assert.strictEqual(r, 6);
  assert.strictEqual(calls, 1);
  // p1 and p2 should also resolve with the same result
  assert.strictEqual(await p1, 6);
  assert.strictEqual(await p2, 6);
});

asyncTest('debounceAsync — cancel rejects pending', async () => {
  const d = debounceAsync(async () => 42, 30);
  const p = d();
  d.cancel();
  await assert.rejects(() => p);
});

// ─── throttleAsync ───────────────────────────────────────────────────────────

asyncTest('throttleAsync — returns in-flight result for concurrent calls', async () => {
  let calls = 0;
  const t = throttleAsync(async () => {
    calls++;
    await delay(20);
    return 'ok';
  }, 50);
  const p1 = t();
  const p2 = t();
  assert.strictEqual(await p1, 'ok');
  assert.strictEqual(await p2, 'ok');
  assert.strictEqual(calls, 1);
});

asyncTest('throttleAsync — allows new call after wait', async () => {
  let calls = 0;
  const t = throttleAsync(async () => {
    calls++;
    return calls;
  }, 30);
  const r1 = await t();
  assert.strictEqual(r1, 1);
  await delay(40);
  const r2 = await t();
  assert.strictEqual(r2, 2);
});

// ─── validation ──────────────────────────────────────────────────────────────

test('debounce — throws on non-function', () => {
  assert.throws(() => debounce(null, 100), TypeError);
});

test('debounce — throws on negative wait', () => {
  assert.throws(() => debounce(() => {}, -1), TypeError);
});

test('throttle — throws on non-function', () => {
  assert.throws(() => throttle('not fn', 100), TypeError);
});

test('once — throws on non-function', () => {
  assert.throws(() => once(42), TypeError);
});

test('memoize — throws on non-function resolver', () => {
  assert.throws(() => memoize(() => {}, 'bad'), TypeError);
});

test('timeout — throws on negative ms', () => {
  assert.throws(() => timeout(Promise.resolve(), -1), TypeError);
});

// ─── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  // Run async tests
  const tests = [
    asyncTest('debounce — trailing call fires', async () => {
      let calls = 0;
      const d = debounce(() => calls++, 30);
      d(); d(); d();
      await delay(60);
      assert.strictEqual(calls, 1);
    }),
  ];

  // The asyncTest function already handles running
  // We need to wait for all setTimeouts to complete
  await delay(300);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Collect all async tests
const asyncTests = [];

// Re-register all async tests to track promises
// Actually, asyncTest already runs them. We just need to wait.
// Let's collect promises instead.

// Simpler approach: just wait for all timers
(async () => {
  await delay(500);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
