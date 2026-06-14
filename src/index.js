'use strict';

/**
 * throttle-x — Zero-dep throttle, debounce, and rate-control utilities.
 *
 * All time values are in milliseconds.
 */

// ─── debounce ────────────────────────────────────────────────────────────────

/**
 * Create a debounced function that delays invocation until `wait` ms
 * have elapsed since the last call.
 *
 * @param {Function} fn
 * @param {number} wait — ms to wait after last call
 * @param {Object} [opts]
 * @param {boolean} [opts.leading=false]  — invoke on the leading edge
 * @param {boolean} [opts.trailing=true]  — invoke on the trailing edge
 * @param {AbortSignal} [opts.signal]     — abort pending calls
 * @returns {Function & { cancel(): void, flush(): *, pending(): boolean }}
 */
function debounce(fn, wait, opts = {}) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (typeof wait !== 'number' || wait < 0) throw new TypeError('wait must be a non-negative number');

  const { leading = false, trailing = true, signal } = opts;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;
  let result;
  let canLeading = true;

  function invoke() {
    result = fn.apply(lastThis, lastArgs ?? []);
    lastArgs = null;
    lastThis = null;
  }

  function debounced(...args) {
    if (signal?.aborted) return result;
    lastArgs = args;
    lastThis = this;

    if (leading && canLeading) {
      invoke();
      canLeading = false;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) invoke();
      canLeading = true;
    }, wait);
  }

  debounced.cancel = function () {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    lastThis = null;
    canLeading = true;
  };

  debounced.flush = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) invoke();
      canLeading = true;
    }
    return result;
  };

  debounced.pending = function () {
    return timer !== null;
  };

  return debounced;
}

// ─── throttle ────────────────────────────────────────────────────────────────

/**
 * Create a throttled function that invokes at most once per `wait` ms.
 *
 * @param {Function} fn
 * @param {number} wait — minimum ms between invocations
 * @param {Object} [opts]
 * @param {boolean} [opts.leading=true]   — invoke on the leading edge
 * @param {boolean} [opts.trailing=true]  — invoke on the trailing edge
 * @param {AbortSignal} [opts.signal]     — abort pending calls
 * @returns {Function & { cancel(): void, flush(): *, pending(): boolean }}
 */
function throttle(fn, wait, opts = {}) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (typeof wait !== 'number' || wait < 0) throw new TypeError('wait must be a non-negative number');

  const { leading = true, trailing = true, signal } = opts;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;
  let lastTime = 0;
  let result;

  function invoke() {
    result = fn.apply(lastThis, lastArgs);
    lastTime = Date.now();
    lastArgs = null;
    lastThis = null;
  }

  function remaining() {
    return wait - (Date.now() - lastTime);
  }

  function throttled(...args) {
    if (signal?.aborted) return result;
    const now = Date.now();

    if (!lastTime && !leading) lastTime = now;

    lastArgs = args;
    lastThis = this;

    if (!timer) {
      if (leading && (now - lastTime >= wait || lastTime === 0)) {
        invoke();
        lastArgs = null;
        lastThis = null;
      }

      const rem = remaining();
      if (rem > 0 || !leading) {
        timer = setTimeout(() => {
          timer = null;
          if (trailing && lastArgs) invoke();
        }, rem > 0 ? rem : wait);
      }
    }
  }

  throttled.cancel = function () {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    lastThis = null;
    lastTime = 0;
  };

  throttled.flush = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) invoke();
    }
    return result;
  };

  throttled.pending = function () {
    return timer !== null;
  };

  return throttled;
}

// ─── once ────────────────────────────────────────────────────────────────────

/**
 * Wrap a function so it only executes once; subsequent calls return cached result.
 *
 * @param {Function} fn
 * @returns {Function & { reset(): void }}
 */
function once(fn) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  let called = false;
  let result;

  function wrapper(...args) {
    if (called) return result;
    called = true;
    result = fn.apply(this, args);
    return result;
  }

  wrapper.reset = function () {
    called = false;
    result = undefined;
  };

  return wrapper;
}

// ─── memoize ──────────────────────────────────────────────────────────────────

/**
 * Memoize a function by its arguments. Uses first-arg as key by default
 * or a custom resolver.
 *
 * @param {Function} fn
 * @param {Function} [resolver] — produce cache key from args
 * @returns {Function & { cache: Map, clear(): void }}
 */
function memoize(fn, resolver) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (resolver && typeof resolver !== 'function') throw new TypeError('resolver must be a function');

  const cache = new Map();

  function memoized(...args) {
    const key = resolver ? resolver(...args) : args[0];
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;
  memoized.clear = function () {
    cache.clear();
  };

  return memoized;
}

// ─── delay / sleep ───────────────────────────────────────────────────────────

/**
 * Return a promise that resolves after `ms`. Abortable.
 *
 * @param {number} ms
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<void>}
 */
function delay(ms, opts = {}) {
  if (typeof ms !== 'number' || ms < 0) throw new TypeError('ms must be a non-negative number');
  const { signal } = opts;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}

/**
 * Alias for delay() — common name.
 */
const sleep = delay;

// ─── timeout ─────────────────────────────────────────────────────────────────

/**
 * Race a promise against a timeout. Rejects with TimeoutError if it takes too long.
 *
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} [message='Operation timed out']
 * @returns {Promise}
 */
function timeout(promise, ms, message = 'Operation timed out') {
  if (typeof ms !== 'number' || ms < 0) throw new TypeError('ms must be a non-negative number');
  let timer;
  const err = new Error(message);
  err.name = 'TimeoutError';
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(err), ms);
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

// ─── debounceAsync ───────────────────────────────────────────────────────────

/**
 * Debounce an async function. Only the last call runs; previous pending
 * results are cancelled.
 *
 * @param {Function} fn — async function
 * @param {number} wait
 * @returns {Function & { cancel(): void, pending(): boolean }}
 */
function debounceAsync(fn, wait, opts = {}) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (typeof wait !== 'number' || wait < 0) throw new TypeError('wait must be a non-negative number');

  const { signal } = opts;
  let timer = null;
  let pendingResolvers = [];

  function debounced(...args) {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

    if (timer) clearTimeout(timer);

    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });
      timer = setTimeout(async () => {
        timer = null;
        const resolvers = pendingResolvers;
        pendingResolvers = [];
        try {
          const result = await fn.apply(null, args);
          resolvers.forEach(r => r.resolve(result));
        } catch (err) {
          resolvers.forEach(r => r.reject(err));
        }
      }, wait);
    });
  }

  debounced.cancel = function () {
    if (timer) clearTimeout(timer);
    timer = null;
    pendingResolvers.forEach(r => r.reject(new Error('Cancelled')));
    pendingResolvers = [];
  };

  debounced.pending = function () {
    return timer !== null;
  };

  return debounced;
}

// ─── throttleAsync ───────────────────────────────────────────────────────────

/**
 * Throttle an async function — prevents overlapping calls within `wait` window.
 * Returns the result of the in-flight call for concurrent invokers.
 *
 * @param {Function} fn — async function
 * @param {number} wait
 * @returns {Function}
 */
function throttleAsync(fn, wait) {
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');
  if (typeof wait !== 'number' || wait < 0) throw new TypeError('wait must be a non-negative number');

  let lastTime = 0;
  let inFlight = null;

  return function (...args) {
    const now = Date.now();
    if (inFlight) return inFlight;

    if (now - lastTime >= wait) {
      lastTime = now;
      inFlight = fn.apply(this, args).finally(() => {
        inFlight = null;
      });
      return inFlight;
    }

    // Return a pending result for trailing edge
    return new Promise(resolve => {
      const rem = wait - (Date.now() - lastTime);
      setTimeout(async () => {
        lastTime = Date.now();
        const result = await fn.apply(null, args);
        resolve(result);
      }, rem);
    });
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  debounce,
  throttle,
  once,
  memoize,
  delay,
  sleep,
  timeout,
  debounceAsync,
  throttleAsync,
};
