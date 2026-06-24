/**
 * throttle-x — Zero-dependency throttle and debounce utilities
 *
 * Throttle: execute at most once per wait period (leading + trailing edge)
 * Debounce: delay execution until silence period elapses
 */

/** Package version */
export const VERSION = '1.0.0';

/** Validate time parameter (waitMs, ms, delayMs) — must be non-negative finite number */
function validateTimeParam(name: string, value: number): void {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number, got ${typeof value}`);
  }
  if (!isFinite(value)) {
    throw new TypeError(`${name} must be finite, got ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative, got ${value}`);
  }
}

/** Validate retry count parameter (times) — must be non-negative finite integer */
function validateTimesParam(name: string, value: number): void {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number, got ${typeof value}`);
  }
  if (!isFinite(value)) {
    throw new TypeError(`${name} must be finite, got ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative, got ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer, got ${value}`);
  }
}

/** Generic function type */
type AnyFn = (...args: any[]) => any;

export interface ThrottleOptions {
  /** Fire on the leading edge (first call) — default: true */
  leading?: boolean;
  /** Fire on the trailing edge (after wait) — default: true */
  trailing?: boolean;
}

export interface ThrottledFunction<A extends any[] = any[], R = any> {
  (...args: A): R | undefined;
  /** Cancel any pending trailing call */
  cancel(): void;
  /** Immediately invoke any pending trailing call */
  flush(): R | undefined;
  /** True if a trailing call is pending */
  readonly pending: boolean;
}

/**
 * Create a throttled version of `fn` that invokes at most once per `waitMs`.
 *
 * - Leading edge: fires immediately on first call (if `leading: true`)
 * - Trailing edge: fires once more after `waitMs` of silence (if `trailing: true` and
 *   the function was called again during the throttle window)
 *
 * @example
 * const throttled = throttle(() => save(), 200);
 * // rapid calls — save fires at start, then once more after 200ms of quiet
 */
export function throttle<A extends any[] = any[], R = any>(
  fn: (...args: A) => R,
  waitMs: number,
  options: ThrottleOptions = {}
): ThrottledFunction<A, R> {
  validateTimeParam('waitMs', waitMs);
  const { leading = true, trailing = true } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;
  let lastCallTime = 0;
  let lastResult: R | undefined;
  let isLeadingInvoked = false;

  function invoke(args: A): R {
    lastResult = fn(...args);
    return lastResult;
  }

  function startTimer(remaining: number): void {
    timer = setTimeout(() => {
      timer = null;
      const now = Date.now();
      if (trailing && lastArgs !== null) {
        // Check if we need another cycle
        const elapsed = now - lastCallTime;
        if (elapsed < waitMs) {
          startTimer(waitMs - elapsed);
        } else {
          invoke(lastArgs);
          lastArgs = null;
        }
      } else {
        // Reset
      }
    }, remaining);
  }

  const throttled = function (...args: A): R | undefined {
    const now = Date.now();

    if (lastCallTime === 0) {
      // First ever call
      lastCallTime = now;
      if (leading) {
        isLeadingInvoked = true;
        lastResult = invoke(args);
      } else {
        lastArgs = args;
      }
      if (!timer) {
        startTimer(waitMs);
      }
      return lastResult;
    }

    const elapsed = now - lastCallTime;
    lastArgs = args;

    if (elapsed >= waitMs) {
      // Window has passed — can fire again
      lastCallTime = now;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastResult = invoke(args);
      lastArgs = null;
      // Start new window
      startTimer(waitMs);
      return lastResult;
    }

    // Within window — store for trailing
    if (!timer && trailing) {
      startTimer(waitMs - elapsed);
    }

    return lastResult;
  };

  (throttled as any).cancel = function (): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    lastCallTime = 0;
  };

  (throttled as any).flush = function (): R | undefined {
    if (timer && lastArgs !== null) {
      clearTimeout(timer);
      timer = null;
      const result = invoke(lastArgs);
      lastArgs = null;
      return result;
    }
    return lastResult;
  };

  Object.defineProperty(throttled, 'pending', {
    get() {
      return timer !== null && lastArgs !== null;
    },
  });

  return throttled as ThrottledFunction<A, R>;
}

export interface DebounceOptions {
  /** Fire on the leading edge — default: false */
  leading?: boolean;
  /** Fire on the trailing edge — default: true */
  trailing?: boolean;
}

export interface DebouncedFunction<A extends any[] = any[], R = any> {
  (...args: A): R | undefined;
  cancel(): void;
  flush(): R | undefined;
  readonly pending: boolean;
}

/**
 * Create a debounced version of `fn` that delays invocation until `waitMs`
 * has elapsed since the last call.
 *
 * @example
 * const debounced = debounce(() => search(), 300);
 * // only fires 300ms after the user stops typing
 */
export function debounce<A extends any[] = any[], R = any>(
  fn: (...args: A) => R,
  waitMs: number,
  options: DebounceOptions = {}
): DebouncedFunction<A, R> {
  validateTimeParam('waitMs', waitMs);
  const { leading = false, trailing = true } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;
  let lastResult: R | undefined;
  let canLeadingFire = true;

  const debounced = function (...args: A): R | undefined {
    lastArgs = args;

    if (leading && canLeadingFire) {
      canLeadingFire = false;
      lastResult = fn(...args);
      lastArgs = null;
    }

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;

      if (trailing && lastArgs !== null) {
        lastResult = fn(...lastArgs);
        lastArgs = null;
      }

      canLeadingFire = true;
    }, waitMs);

    return lastResult;
  };

  (debounced as any).cancel = function (): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    canLeadingFire = true;
  };

  (debounced as any).flush = function (): R | undefined {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs !== null) {
        const result = fn(...lastArgs);
        lastArgs = null;
        canLeadingFire = true;
        return result;
      }
      canLeadingFire = true;
    }
    return lastResult;
  };

  Object.defineProperty(debounced, 'pending', {
    get() {
      return timer !== null;
    },
  });

  return debounced as DebouncedFunction<A, R>;
}

/**
 * Delay execution by `ms` milliseconds. Resolves with the optional value.
 *
 * @example
 * await delay(500, 'done');
 */
export function delay<T>(ms: number, value?: T): Promise<T> {
  validateTimeParam('ms', ms);
  return new Promise((resolve) => setTimeout(() => resolve(value as T), ms));
}

/**
 * Reject if `promise` doesn't settle within `ms`.
 *
 * @example
 * const result = await timeout(fetch(url), 5000);
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  validateTimeParam('ms', ms);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Run `fn`, retrying up to `times` on failure with `delayMs` between attempts.
 *
 * @example
 * const data = await retry(() => fetch(url).then(r => r.json()), 3, 1000);
 */
export async function retry<A extends any[], R>(
  fn: (...args: A) => Promise<R>,
  times: number,
  delayMs: number,
  ...args: A
): Promise<R> {
  validateTimesParam('times', times);
  validateTimeParam('delayMs', delayMs);
  let lastError: unknown;
  for (let i = 0; i <= times; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastError = err;
      if (i < times) {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Limit `fn` to one concurrent execution. Subsequent calls while one is
 * in-flight share the same in-flight promise.
 *
 * @example
 * const exclusive = onceAtATime(async () => heavyCompute());
 */
export function onceAtATime<A extends any[], R>(
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  let inFlight: Promise<R> | null = null;

  return async (...args: A): Promise<R> => {
    if (inFlight) return inFlight;
    inFlight = fn(...args).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

/**
 * Factory: create a throttle with sensible defaults.
 * Same as `throttle(fn, waitMs)` but typed for standalone use.
 */
export function createThrottle<A extends any[] = any[], R = any>(
  fn: (...args: A) => R,
  waitMs: number,
  options?: ThrottleOptions
): ThrottledFunction<A, R> {
  return throttle(fn, waitMs, options);
}

/**
 * Factory: create a debounce with sensible defaults.
 */
export function createDebounce<A extends any[] = any[], R = any>(
  fn: (...args: A) => R,
  waitMs: number,
  options?: DebounceOptions
): DebouncedFunction<A, R> {
  return debounce(fn, waitMs, options);
}
