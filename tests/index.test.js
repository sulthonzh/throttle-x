const { test } = require('node:test');
const assert = require('node:assert');
const { throttle, debounce, delay, timeout, retry, onceAtATime } = require('../dist/index.js');

test('throttle: leading call fires immediately', () => {
  let calls = 0;
  const fn = throttle(() => { calls++; }, 100);
  fn();
  assert.strictEqual(calls, 1);
  fn.cancel();
});

test('throttle: suppresses calls within window', async () => {
  let calls = 0;
  const fn = throttle(() => { calls++; }, 80);
  fn(); // leading
  fn();
  fn();
  fn();
  assert.strictEqual(calls, 1); // only leading so far
  await delay(120);
  assert.strictEqual(calls, 2); // trailing fired
  fn.cancel();
});

test('throttle: trailing=false disables trailing call', async () => {
  let calls = 0;
  const fn = throttle(() => { calls++; }, 80, { trailing: false });
  fn();
  fn();
  fn();
  assert.strictEqual(calls, 1);
  await delay(120);
  assert.strictEqual(calls, 1); // no trailing
});

test('throttle: leading=false delays first call', async () => {
  let calls = 0;
  const fn = throttle(() => { calls++; }, 80, { leading: false });
  fn();
  assert.strictEqual(calls, 0);
  await delay(120);
  assert.strictEqual(calls, 1);
});

test('throttle: cancel prevents trailing', async () => {
  let calls = 0;
  const fn = throttle(() => { calls++; }, 80);
  fn();
  fn();
  fn.cancel();
  await delay(120);
  assert.strictEqual(calls, 1);
});

test('throttle: flush invokes pending immediately', () => {
  let calls = 0;
  let lastVal;
  const fn = throttle((v) => { calls++; return v; }, 1000);
  fn('a');
  fn('b');
  fn('c');
  assert.strictEqual(calls, 1);
  lastVal = fn.flush();
  assert.strictEqual(calls, 2);
  assert.strictEqual(lastVal, 'c');
});

test('throttle: pending property', () => {
  const fn = throttle(() => {}, 100);
  assert.strictEqual(fn.pending, false);
  fn();
  fn();
  assert.strictEqual(fn.pending, true);
  fn.cancel();
  assert.strictEqual(fn.pending, false);
});

test('throttle: passes arguments', () => {
  let received;
  const fn = throttle((a, b, c) => { received = [a, b, c]; }, 100);
  fn(1, 'x', true);
  assert.deepStrictEqual(received, [1, 'x', true]);
  fn.cancel();
});

test('debounce: only fires after silence period', async () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 80);
  fn();
  fn();
  fn();
  assert.strictEqual(calls, 0);
  await delay(100);
  assert.strictEqual(calls, 1);
});

test('debounce: reset timer on each call', async () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 80);
  fn();
  await delay(40);
  fn(); // resets timer
  await delay(40);
  assert.strictEqual(calls, 0); // not yet
  await delay(50);
  assert.strictEqual(calls, 1);
});

test('debounce: cancel prevents execution', async () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 80);
  fn();
  fn.cancel();
  await delay(120);
  assert.strictEqual(calls, 0);
});

test('debounce: flush invokes immediately', () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 1000);
  fn();
  fn();
  fn.flush();
  assert.strictEqual(calls, 1);
});

test('debounce: leading option fires immediately', () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 100, { leading: true });
  fn();
  assert.strictEqual(calls, 1);
  fn.cancel();
});

test('debounce: leading without trailing', async () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 80, { leading: true, trailing: false });
  fn();
  fn();
  fn();
  assert.strictEqual(calls, 1);
  await delay(120);
  assert.strictEqual(calls, 1); // no trailing
});

test('debounce: pending property', () => {
  const fn = debounce(() => {}, 100);
  assert.strictEqual(fn.pending, false);
  fn();
  assert.strictEqual(fn.pending, true);
  fn.cancel();
  assert.strictEqual(fn.pending, false);
});

test('debounce: passes arguments', async () => {
  let received;
  const fn = debounce((a, b) => { received = [a, b]; }, 50);
  fn('x', 42);
  await delay(70);
  assert.deepStrictEqual(received, ['x', 42]);
});

test('delay: resolves after timeout', async () => {
  const start = Date.now();
  const result = await delay(60, 'done');
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 50);
  assert.strictEqual(result, 'done');
});

test('delay: without value', async () => {
  const result = await delay(30);
  assert.strictEqual(result, undefined);
});

test('timeout: resolves if promise settles in time', async () => {
  const result = await timeout(delay(30, 'value'), 200);
  assert.strictEqual(result, 'value');
});

test('timeout: rejects on timeout', async () => {
  await assert.rejects(
    timeout(delay(500, 'slow'), 50),
    /Timeout after 50ms/
  );
});

test('timeout: forwards rejection', async () => {
  await assert.rejects(
    timeout(Promise.reject(new Error('custom')), 200),
    /custom/
  );
});

test('retry: succeeds on first try', async () => {
  let calls = 0;
  const result = await retry(async () => { calls++; return 'ok'; }, 2, 10);
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 1);
});

test('retry: retries on failure then succeeds', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls++;
    if (calls < 3) throw new Error('fail');
    return 'success';
  }, 3, 10);
  assert.strictEqual(result, 'success');
  assert.strictEqual(calls, 3);
});

test('retry: throws after exhausting retries', async () => {
  let calls = 0;
  await assert.rejects(
    retry(async () => { calls++; throw new Error('always'); }, 2, 10),
    /always/
  );
  assert.strictEqual(calls, 3); // initial + 2 retries
});

test('onceAtATime: dedup concurrent calls', async () => {
  let calls = 0;
  const fn = onceAtATime(async () => {
    calls++;
    await delay(50);
    return 'result';
  });

  const [a, b, c] = await Promise.all([fn(), fn(), fn()]);
  assert.strictEqual(a, 'result');
  assert.strictEqual(b, 'result');
  assert.strictEqual(c, 'result');
  assert.strictEqual(calls, 1);
});

test('onceAtATime: allows sequential calls after completion', async () => {
  let calls = 0;
  const fn = onceAtATime(async () => {
    calls++;
    await delay(30);
    return calls;
  });

  const r1 = await fn();
  const r2 = await fn();
  assert.strictEqual(r1, 1);
  assert.strictEqual(r2, 2);
});

test('throttle + debounce combined usage', async () => {
  let scrollCalls = 0;
  let searchCalls = 0;

  const onScroll = throttle(() => { scrollCalls++; }, 60);
  const onSearch = debounce(() => { searchCalls++; }, 50);

  onScroll();
  onScroll();
  onSearch();
  onSearch();
  onSearch();

  await delay(80);
  assert.ok(scrollCalls >= 1);
  assert.strictEqual(searchCalls, 1);
});
