const { test } = require('node:test');
const assert = require('node:assert');
const { throttle, debounce, delay, timeout, retry } = require('../dist/index.js');

test('validation: throttle rejects non-number waitMs', () => {
  assert.throws(
    () => throttle(() => {}, 'invalid'),
    { name: 'TypeError', message: /waitMs must be a number/ }
  );
});

test('validation: throttle rejects infinite waitMs', () => {
  assert.throws(
    () => throttle(() => {}, Infinity),
    { name: 'TypeError', message: /waitMs must be finite/ }
  );
});

test('validation: throttle rejects negative waitMs', () => {
  assert.throws(
    () => throttle(() => {}, -100),
    { name: 'RangeError', message: /waitMs must be non-negative/ }
  );
});

test('validation: throttle accepts zero waitMs', () => {
  const fn = throttle(() => {}, 0);
  assert.strictEqual(typeof fn, 'function');
  fn.cancel();
});

test('validation: debounce rejects non-number waitMs', () => {
  assert.throws(
    () => debounce(() => {}, null),
    { name: 'TypeError', message: /waitMs must be a number/ }
  );
});

test('validation: debounce rejects infinite waitMs', () => {
  assert.throws(
    () => debounce(() => {}, -Infinity),
    { name: 'TypeError', message: /waitMs must be finite/ }
  );
});

test('validation: debounce rejects negative waitMs', () => {
  assert.throws(
    () => debounce(() => {}, -50),
    { name: 'RangeError', message: /waitMs must be non-negative/ }
  );
});

test('validation: debounce accepts zero waitMs', () => {
  const fn = debounce(() => {}, 0);
  assert.strictEqual(typeof fn, 'function');
  fn.cancel();
});

test('validation: delay rejects non-number ms', () => {
  assert.throws(
    () => delay('invalid'),
    { name: 'TypeError', message: /ms must be a number/ }
  );
});

test('validation: delay rejects infinite ms', () => {
  assert.throws(
    () => delay(Infinity),
    { name: 'TypeError', message: /ms must be finite/ }
  );
});

test('validation: delay rejects negative ms', () => {
  assert.throws(
    () => delay(-100),
    { name: 'RangeError', message: /ms must be non-negative/ }
  );
});

test('validation: delay accepts zero ms', async () => {
  const result = await delay(0, 'test');
  assert.strictEqual(result, 'test');
});

test('validation: timeout rejects non-number ms', () => {
  assert.throws(
    () => timeout(Promise.resolve(), 'invalid'),
    { name: 'TypeError', message: /ms must be a number/ }
  );
});

test('validation: timeout rejects infinite ms', () => {
  assert.throws(
    () => timeout(Promise.resolve(), Infinity),
    { name: 'TypeError', message: /ms must be finite/ }
  );
});

test('validation: timeout rejects negative ms', () => {
  assert.throws(
    () => timeout(Promise.resolve(), -100),
    { name: 'RangeError', message: /ms must be non-negative/ }
  );
});

test('validation: timeout accepts zero ms', async () => {
  const result = await timeout(Promise.resolve('fast'), 0);
  assert.strictEqual(result, 'fast');
});

test('validation: retry rejects non-number times', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), 'invalid', 100),
    { name: 'TypeError', message: /times must be a number/ }
  );
});

test('validation: retry rejects infinite times', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), Infinity, 100),
    { name: 'TypeError', message: /times must be finite/ }
  );
});

test('validation: retry rejects negative times', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), -1, 100),
    { name: 'RangeError', message: /times must be non-negative/ }
  );
});

test('validation: retry rejects non-integer times', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), 2.5, 100),
    { name: 'TypeError', message: /times must be an integer/ }
  );
});

test('validation: retry accepts zero times', async () => {
  let calls = 0;
  const result = await retry(async () => { calls++; return 'ok'; }, 0, 10);
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 1);
});

test('validation: retry rejects non-number delayMs', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), 2, 'invalid'),
    { name: 'TypeError', message: /delayMs must be a number/ }
  );
});

test('validation: retry rejects infinite delayMs', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), 2, Infinity),
    { name: 'TypeError', message: /delayMs must be finite/ }
  );
});

test('validation: retry rejects negative delayMs', async () => {
  await assert.rejects(
    retry(() => Promise.resolve(), 2, -100),
    { name: 'RangeError', message: /delayMs must be non-negative/ }
  );
});

test('validation: retry accepts zero delayMs', async () => {
  let calls = 0;
  const result = await retry(
    async () => { calls++; if (calls < 2) throw new Error('fail'); return 'ok'; },
    3,
    0
  );
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 2);
});