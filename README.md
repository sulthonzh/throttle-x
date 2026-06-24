# throttle-x

Zero-dependency throttle and debounce utilities for Node.js.

## Why

Every project eventually needs throttle (scroll/resize handlers) or debounce (search input). Most reach for lodash — but you only need a few hundred bytes, not a 70KB utility belt.

`throttle-x` gives you production-ready throttle/debounce plus a few async helpers, with zero dependencies and zero baggage.

## Install

```bash
npm install throttle-x
```

## API

### `throttle(fn, waitMs, options?)`

Execute at most once per `waitMs` window.

```js
const { throttle } = require('throttle-x');

// Fire at most every 200ms
const onScroll = throttle(() => {
  updateUI();
}, 200);

window.addEventListener('scroll', onScroll);

// Cancel pending
onScroll.cancel();

// Force-fire pending
onScroll.flush();
```

**Options:**
- `leading: true` — fire on first call (default: `true`)
- `trailing: true` — fire once more after window (default: `true`)

**Returns:** Throttled function with `.cancel()`, `.flush()`, and `.pending`.

---

### `debounce(fn, waitMs, options?)`

Delay execution until `waitMs` of silence has passed.

```js
const { debounce } = require('throttle-x');

// Search 300ms after user stops typing
const onInput = debounce((value) => {
  search(value);
}, 300);

input.addEventListener('input', e => onInput(e.target.value));
```

**Options:**
- `leading: false` — fire immediately on first call (default: `false`)
- `trailing: true` — fire after silence (default: `true`)

**Returns:** Debounced function with `.cancel()`, `.flush()`, and `.pending`.

---

### `delay(ms, value?)`

Promise-based `setTimeout`.

```js
await delay(500);
await delay(500, 'result'); // resolves with 'result'
```

---

### `timeout(promise, ms)`

Reject if `promise` doesn't settle within `ms`.

```js
const data = await timeout(fetch(url), 5000);
// throws Error('Timeout after 5000ms') if fetch is too slow
```

---

### `retry(fn, times, delayMs, ...args)`

Retry an async function with fixed delay between attempts.

```js
const result = await retry(
  () => fetch(url).then(r => r.json()),
  3,    // retry 3 times
  1000  // wait 1s between attempts
);
```

---

### `onceAtATime(fn)`

Ensure only one concurrent execution — concurrent calls share the same in-flight promise.

```js
const expensiveQuery = onceAtATime(async () => {
  return await db.query('SELECT ...');
});

// Multiple concurrent calls → one DB hit
const results = await Promise.all([
  expensiveQuery(),
  expensiveQuery(),
  expensiveQuery(),
]);
```

## Zero Dependencies

No `node_modules` black hole. Just plain JavaScript.

## License

MIT