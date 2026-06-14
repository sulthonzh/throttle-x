# throttle-x

Zero-dependency throttle, debounce, and rate-control utilities for JavaScript.

Because every project reinvents these. Stop reinventing.

## Why?

You need to limit how often a function runs. Maybe it's a search input, a scroll handler, an API call, a resize listener. You could copy-paste that blog post debounce for the 50th time — or you could install this and move on with your life.

**No dependencies. No polyfills. No nonsense.** Works in Node.js and browsers.

## Install

```bash
npm install throttle-x
```

## Quick Start

```js
const { debounce, throttle, once, memoize, delay, timeout } = require('throttle-x');

// Debounce a search input
const search = debounce(query => api.search(query), 300);
input.addEventListener('input', e => search(e.target.value));

// Throttle scroll events
const onScroll = throttle(() => updateUI(), 100);
window.addEventListener('scroll', onScroll);

// Run something once
const init = once(() => setup());
button.addEventListener('click', init);

// Memoize expensive computations
const factorial = memoize(n => n <= 1 ? 1 : n * factorial(n - 1));

// Sleep in async functions
await delay(1000);

// Timeout a slow operation
const data = await timeout(fetch('/api'), 5000, 'API is slow');
```

## API

### `debounce(fn, wait, opts?)`

Delay `fn` until `wait` ms have passed since the last call. Only the **last** call fires.

| Option | Default | Description |
|--------|---------|-------------|
| `leading` | `false` | Fire immediately on first call |
| `trailing` | `true` | Fire after the wait period |
| `signal` | — | AbortSignal to cancel pending |

Returns the debounced function with `.cancel()`, `.flush()`, `.pending()`.

```js
const d = debounce(save, 1000);
d();          // schedules save
d.cancel();   // cancels pending save
d.flush();    // runs pending save immediately
d.pending();  // → false
```

### `debounceAsync(fn, wait, opts?)`

Debounce for async functions. Concurrent calls within the wait window all receive the **same** result from the last invocation.

```js
const search = debounceAsync(async q => await api.search(q), 300);
// 5 rapid calls → 1 API request, all 5 get the same result
```

### `throttle(fn, wait, opts?)`

Limit `fn` to at most one invocation per `wait` ms.

| Option | Default | Description |
|--------|---------|-------------|
| `leading` | `true` | Fire immediately on first call |
| `trailing` | `true` | Fire once after the rate window for trailing calls |
| `signal` | — | AbortSignal to cancel |

Same methods as debounce: `.cancel()`, `.flush()`, `.pending()`.

### `throttleAsync(fn, wait)`

Throttle for async functions. Concurrent calls within the wait window share the in-flight promise.

### `once(fn)`

Execute `fn` only once. Subsequent calls return the cached result. Includes `.reset()` to allow re-execution.

### `memoize(fn, resolver?)`

Cache results by argument key. Uses first argument as key by default, or a custom `resolver` for multi-arg caching.

```js
const add = memoize((a, b) => a + b, (a, b) => `${a}+${b}`);
add(1, 2);  // computed
add(1, 2);  // cached
add(2, 1);  // computed (different key)
```

### `delay(ms, opts?)` / `sleep(ms, opts?)`

Promise-based sleep. Supports AbortSignal.

```js
await delay(500);

const ctrl = new AbortController();
ctrl.abort();
await delay(500, { signal: ctrl.signal }); // → AbortError
```

### `timeout(promise, ms, message?)`

Race a promise against a timeout. Rejects with `TimeoutError` if it exceeds `ms`.

```js
await timeout(fetch('/slow'), 5000, 'Server is sleeping');
```

## CLI

```bash
npx throttle-x demo debounce 300    # See debounce in action
npx throttle-x demo throttle 100    # See throttle in action
npx throttle-x info                 # List available functions
```

## Testing

```bash
node test/index.test.js
```

40 tests, zero dependencies.

## License

MIT
