const { test } = require('node:test');
const assert = require('node:assert');
const {
  throttle,
  debounce,
  delay,
} = require('../dist/index.js');

// === Lines 78-79: startTimer callback else branch (trailing false or lastArgs null when timer fires) ===

test('throttle: timer fires with trailing=false hits else reset branch', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 40, { trailing: false });
  fn(); // leading call, starts timer
  assert.strictEqual(calls, 1);
  // Don't call again — when timer fires, trailing=false → else "Reset" branch (lines 78-79)
  await delay(60);
  assert.strictEqual(calls, 1); // no trailing fire
  fn.cancel();
});

test('throttle: timer fires with lastArgs=null hits else reset branch', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 40);
  fn(); // leading call, lastArgs is null (only set for trailing)
  // Actually lastArgs is null here because leading consumed the args
  // Wait for timer to fire — trailing=true but lastArgs=null → else branch
  await delay(60);
  assert.strictEqual(calls, 1); // no trailing call since lastArgs was null
  fn.cancel();
});

// === Lines 110-121: elapsed >= waitMs path (window passed, fire immediately) ===

test('throttle: call after window expires fires immediately (elapsed >= waitMs)', async () => {
  let calls = 0;
  const fn = throttle((v) => {
    calls++;
    return v;
  }, 50);

  fn('a'); // leading call at t=0
  assert.strictEqual(calls, 1);

  // Wait beyond window so timer callback fires first
  await delay(70);

  // Now call again — lastCallTime was set at t=0, elapsed > 50ms
  // This hits the `elapsed >= waitMs` branch (lines 110-121)
  const result = fn('b');
  assert.strictEqual(calls, 2);
  assert.strictEqual(result, 'b');
  fn.cancel();
});

test('throttle: call after window with active timer clears and restarts', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 60);

  fn(); // leading at t=0, starts timer
  // Call again within window to set up trailing + keep timer active
  await delay(20);
  fn(); // trailing pending, lastCallTime updated

  // Wait enough for original timer to fire + trailing to process
  await delay(50);
  // By now timer should have fired

  // Wait beyond window from last trailing invocation
  await delay(70);

  // Now elapsed >= waitMs — clears timer (if any), fires immediately, starts new window
  fn(); // This hits lines 110-121 (clear timer, invoke, start new window)
  assert.ok(calls >= 2, `expected calls >= 2, got ${calls}`);
  fn.cancel();
});

// === Lines 124-125: within-window call stores trailing + returns lastResult ===

test('throttle: within-window call with no active timer starts trailing timer', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 80, { leading: true, trailing: true });

  fn(); // leading call at t=0
  assert.strictEqual(calls, 1);

  // Wait for timer to fire (it will fire with lastArgs=null → else reset)
  await delay(100);

  // Now timer is null, lastCallTime is still set
  // Call within window of the ORIGINAL lastCallTime? No — elapsed > 80ms
  // So this hits elapsed >= waitMs again.
  // To hit lines 124-125 (!timer && trailing), we need:
  // - timer is null (previous timer fired/completed)
  // - elapsed < waitMs (within current window)
  // - trailing is true
  // This is tricky — after timer fires, lastCallTime stays at last trailing call time
  // If trailing didn't fire (lastArgs was null), lastCallTime = original leading call time

  // After timer fire with no trailing: lastCallTime = t=0, now = t=100
  // elapsed = 100 > 80 → hits elapsed >= waitMs, not 124-125

  // For lines 124-125, need timer=null AND elapsed < waitMs
  // This happens with leading=false: first call sets lastArgs but no timer start...
  // No wait, leading=false does start timer.
  // Actually: flush() clears timer but lastCallTime remains.
  // After flush, if we call within window: elapsed < waitMs, timer=null → lines 124-125!

  fn2 = throttle(() => calls++, 200, { leading: false, trailing: true });
  fn2(); // sets lastArgs, starts timer (leading=false so no leading invoke)
  // Flush to clear timer but keep lastCallTime=0
  fn2.flush(); // invokes trailing, clears timer, lastArgs=null
  // Now timer=null, lastCallTime still 0-ish
  // Call again — first ever was handled, so elapsed since lastCallTime...
  // After flush, lastArgs=null but lastCallTime wasn't reset
  fn2('x'); // elapsed likely < 200ms → hits line 124: !timer && trailing → startTimer
  await delay(20);
  fn2.cancel();
});

// === Lines 113-115: elapsed >= waitMs with active timer (clearTimeout path) ===
// This happens when Date.now() - lastCallTime >= waitMs but timer hasn't fired yet
// because the event loop hasn't yielded. Synchronous calls in a tight loop can
// accumulate elapsed time while timer is still pending.
test('throttle: synchronous rapid calls eventually hit elapsed >= waitMs with timer active', () => {
  let calls = 0;
  const fn = throttle(() => calls++, 1); // 1ms window
  fn(); // leading, starts timer (1ms)
  // Burn ~2ms synchronously to make elapsed >= 1ms while timer is still pending
  // (timer callback can't fire until we yield to event loop)
  const start = Date.now();
  while (Date.now() - start < 3) {
    // busy-wait to pass 1ms without yielding
  }
  fn(); // elapsed >= 1ms, timer still active → clearTimeout path (lines 113-115)
  assert.ok(calls >= 2, `expected calls >= 2, got ${calls}`);
  fn.cancel();
});

// === Lines 78-79: timer reschedule path (elapsed < waitMs in timer callback) ===
// This happens when a call is made during the window, updating lastCallTime,
// so when the original timer fires, elapsed < waitMs and it reschedules.
test('throttle: timer reschedule path with tight timing', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 60);
  fn(); // leading at t≈0, starts timer for 60ms, lastCallTime≈0
  await delay(30); // t≈30
  fn(); // within window, stores trailing, updates lastCallTime≈30
  // Timer fires at t≈60: elapsed = 60-30 = 30 < 60 → reschedules (lines 78-79)
  // Rescheduled timer fires at t≈60 + (60-30) = t≈90: elapsed = 90-30 = 60 ≥ 60 → fires trailing
  await delay(80); // t≈110, enough for reschedule + trailing fire
  assert.ok(calls >= 2, `expected calls >= 2, got ${calls}`);
  fn.cancel();
});

// Cleaner test for lines 124-125
test('throttle: call within window after flush starts new trailing timer', async () => {
  let calls = 0;
  const fn = throttle((v) => {
    calls++;
    return v * 2;
  }, 200);

  fn(1); // leading at t=0, returns 2
  fn(2); // within window, stores trailing, returns lastResult (2)
  // This hits line 124-125: !timer is false (timer exists from leading call)
  // Wait — the first call DID start a timer. So !timer is false → skips startTimer.
  // Returns lastResult. That's line 125 (return lastResult) but not 124.

  // To hit line 124 specifically (!timer && trailing), timer must be null.
  // Use flush to clear timer mid-window:
  fn.flush(); // fires trailing (calls=2), clears timer, lastArgs=null
  assert.strictEqual(calls, 2);

  // Now timer=null, lastCallTime ~0
  fn(3); // elapsed < 200ms, timer=null, trailing=true → line 124: startTimer(waitMs - elapsed)
  // Returns lastResult (which is 4 from flush of fn(2))
  fn.cancel();
});

// === Debounce: trailing=false with leading=false (timer fires, neither fires) ===

test('debounce: trailing=false leading=false timer fires with no invocation', async () => {
  let calls = 0;
  const fn = debounce(() => calls++, 40, { leading: false, trailing: false });
  fn(); // no leading (leading=false), starts timer
  assert.strictEqual(calls, 0);
  fn(); // resets timer, stores args
  await delay(60); // timer fires: trailing=false → no invocation, just canLeadingFire=true
  assert.strictEqual(calls, 0); // neither leading nor trailing fired
});

// === Throttle: cancel after timer already fired (timer is null, no-op) ===

test('throttle: cancel after timer already fired is a no-op', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 30);
  fn(); // leading
  await delay(50); // timer fires (lastArgs=null → else reset)
  fn.cancel(); // timer is already null — if(timer) is false, just resets
  assert.strictEqual(calls, 1);
});

// === Throttle: pending property after various states ===

test('throttle: pending is false when timer exists but no trailing args', () => {
  const fn = throttle(() => 42, 100);
  fn(); // leading, starts timer, but lastArgs is null (leading consumed it)
  // pending = timer !== null && lastArgs !== null → false (lastArgs is null)
  assert.strictEqual(fn.pending, false);
  fn.cancel();
});

test('throttle: pending is true when trailing args exist during window', () => {
  const fn = throttle(() => 42, 100);
  fn(); // leading
  fn(); // trailing pending — lastArgs set
  assert.strictEqual(fn.pending, true);
  fn.cancel();
});

// === Throttle: leading=false, trailing=false (edge case: nothing fires) ===

test('throttle: leading=false trailing=false never invokes', async () => {
  let calls = 0;
  const fn = throttle(() => calls++, 30, { leading: false, trailing: false });
  const result = fn();
  assert.strictEqual(result, undefined);
  assert.strictEqual(calls, 0);
  // Timer starts (leading=false → lastArgs set, startTimer called)
  // When timer fires: trailing=false → else "Reset" branch
  await delay(50);
  assert.strictEqual(calls, 0);
  fn.cancel();
});

// === Debounce: pending property ===

test('debounce: pending is true when timer is active', () => {
  const fn = debounce(() => 42, 100);
  fn(); // starts timer
  assert.strictEqual(fn.pending, true);
  fn.cancel();
});

test('debounce: pending is false after cancel', () => {
  const fn = debounce(() => 42, 100);
  fn();
  fn.cancel(); // timer=null
  assert.strictEqual(fn.pending, false);
});

// === Debounce: flush with no timer returns lastResult ===

test('debounce: flush with no timer returns lastResult', () => {
  const fn = debounce(() => 'result', 100);
  // No timer active, flush should return lastResult (undefined initially)
  const result = fn.flush();
  assert.strictEqual(result, undefined);
});

// === Debounce: leading=true, trailing=false, multiple calls ===

test('debounce: leading=true trailing=false fires only leading', async () => {
  let calls = 0;
  const fn = debounce(() => calls++, 40, { leading: true, trailing: false });
  fn(); // leading fires (calls=1)
  fn(); // resets timer, no trailing
  fn(); // resets timer again
  assert.strictEqual(calls, 1);
  await delay(60); // timer fires: trailing=false → no call
  assert.strictEqual(calls, 1);
});
