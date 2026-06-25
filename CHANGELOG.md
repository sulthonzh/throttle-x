# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-25

### Added
- VERSION export constant for programmatic version checking
- CLI version flags: `--version`, `-V`, `version`
- `test:core` script for focused core functionality testing
- CHANGELOG.md with complete version history
- README comparison table vs lodash/underscore
- Three real-world usage examples:
  - Infinite scroll with rate-limited API calls
  - Search input debouncing with cancellation
  - React component state updates with throttling

### Changed
- Updated Node.js engine requirement to >=18
- Enhanced README with compelling hook and clearer value proposition
- Improved package.json with exports field and proper file selection
- Updated README with test count and zero-dep status

### Fixed
- N/A (no bugs in v1.0.0)

## [1.0.0] - 2026-06-18

### Added
- Initial release
- `throttle()` function with leading/trailing edge support
- `debounce()` function with leading/trailing edge support
- `delay()` utility for Promise-based setTimeout
- `timeout()` utility for promise timeout handling
- `retry()` utility for async function retry logic
- `onceAtATime()` utility for concurrent execution deduplication
- TypeScript support with full type definitions
- Zero dependency implementation
- Comprehensive test suite (52 tests, 100% pass rate)

[1.1.0]: https://github.com/sulthonzh/throttle-x/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/sulthonzh/throttle-x/releases/tag/v1.0.0