#!/usr/bin/env node
'use strict';

const { debounce, throttle, once, memoize, delay, timeout, debounceAsync, throttleAsync } = require('./index.js');

const args = process.argv.slice(2);
const cmd = args[0];

const HELP = `throttle-x — zero-dep throttle/debounce/rate-control utilities

Usage:
  throttle-x demo debounce <ms>     Demo debounce (call rapidly, see trailing fire)
  throttle-x demo throttle <ms>     Demo throttle (call rapidly, see rate limit)
  throttle-x demo once              Demo once wrapper
  throttle-x demo memoize           Demo memoization
  throttle-x demo timeout <ms>      Demo timeout on a slow promise
  throttle-x demo delay <ms>        Demo delay/sleep
  throttle-x info                   Show available functions

Options:
  -h, --help    Show this help
  -v, --version Show version`;

if (!cmd || cmd === '-h' || cmd === '--help') {
  console.log(HELP);
  process.exit(0);
}

if (cmd === '-v' || cmd === '--version') {
  console.log(require('../package.json').version);
  process.exit(0);
}

if (cmd === 'info') {
  console.log('Available functions:');
  console.log('  debounce(fn, wait, opts)       — delay until calls stop');
  console.log('  debounceAsync(fn, wait, opts)  — debounce for async fns');
  console.log('  throttle(fn, wait, opts)       — limit to 1 call per wait');
  console.log('  throttleAsync(fn, wait)        — throttle for async fns');
  console.log('  once(fn)                       — execute only once');
  console.log('  memoize(fn, resolver)          — cache by argument key');
  console.log('  delay(ms, opts)                — promise-based sleep');
  console.log('  timeout(promise, ms, msg)      — race against a timer');
  process.exit(0);
}

if (cmd === 'demo') {
  const sub = args[1];
  const ms = parseInt(args[2] || '100', 10);

  if (sub === 'debounce') {
    console.log(`Debouncing at ${ms}ms. Sending 5 rapid calls...`);
    const d = debounce((n) => console.log(`  fired #${n} at ${Date.now()}`), ms);
    for (let i = 1; i <= 5; i++) { d(i); }
    console.log('  (waiting...)');

  } else if (sub === 'throttle') {
    console.log(`Throttling at ${ms}ms. Sending 5 rapid calls...`);
    const t = throttle((n) => console.log(`  fired #${n}`), ms, { leading: true, trailing: true });
    for (let i = 1; i <= 5; i++) { t(i); }
    console.log('  (waiting for trailing...)');

  } else if (sub === 'once') {
    const o = once(() => { console.log('  executed!'); return 'result'; });
    console.log('Calling 3 times...');
    o(); o(); o();
    console.log('  (only ran once)');

  } else if (sub === 'memoize') {
    let calls = 0;
    const m = memoize((x) => { calls++; return x * 2; });
    console.log('memoize(5), memoize(5), memoize(3):');
    console.log(`  ${m(5)}, ${m(5)}, ${m(3)} (computed ${calls} times)`);
    console.log(`  cache size: ${m.cache.size}`);

  } else if (sub === 'timeout') {
    console.log(`Timing out a ${ms * 3}ms promise at ${ms}ms...`);
    timeout(new Promise(r => setTimeout(r, ms * 3)), ms, 'took too long!')
      .catch(e => console.log(`  rejected: ${e.message}`));

  } else if (sub === 'delay') {
    console.log(`Waiting ${ms}ms...`);
    const start = Date.now();
    delay(ms).then(() => console.log(`  done after ${Date.now() - start}ms`));

  } else {
    console.log('Unknown demo. See --help.');
    process.exit(1);
  }

  // Keep process alive for async demos
  setTimeout(() => {}, ms * 5 + 500);
} else {
  console.error(`Unknown command: ${cmd}. See --help.`);
  process.exit(1);
}
