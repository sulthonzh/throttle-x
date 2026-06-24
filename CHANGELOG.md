# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-16

### Added
- `throttle(fn, waitMs, options?)` — Execute at most once per wait period with leading/trailing edge support
- `debounce(fn, waitMs, options?)` — Delay execution until silence period elapses
- `delay(ms, value?)` — Promise-based setTimeout with optional value
- `timeout(promise, ms)` — Reject promise if it doesn't settle within timeout
- `retry(fn, times, delayMs, ...args)` — Retry async function with fixed delay between attempts
- `onceAtATime(fn)` — Ensure only one concurrent execution, share in-flight promise
- TypeScript definitions with strict mode enabled
- Full test coverage with Node.js built-in test runner
- Zero dependencies, ~2KB bundle size

### Features
- Throttle with leading/trailing edge control
- Debounce with leading/trailing edge control
- Cancel and flush operations on throttled/debounced functions
- Pending state tracking
- Type-safe with TypeScript
- Zero runtime dependencies
- Compatible with Node.js >= 14

[1.0.0]: https://github.com/sulthonzh/throttle-x/releases/tag/v1.0.0