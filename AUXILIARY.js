/*
AUXILIARY.js
General-purpose helper utilities used across terminal subsystems.

Exports: a default AUX object and named helpers.

Includes:
 - sleep(ms): Promise-based delay
 - clamp(num, min, max): constrain a number
 - uid(prefix?): generate unique IDs
 - formatTime(date?): HH:MM:SS formatted clock string
 - ansi: tiny ANSI color generator (returns colorized strings for DOM-less terminals)
 - debounce(fn, delay)
 - once(fn)
 - deepClone(obj)
*/

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function formatTime(date = new Date()) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

const ansi = {
  codes: {
    reset: '\u001b[0m',
    bold: '\u001b[1m',
    dim: '\u001b[2m',
    red: '\u001b[31m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    blue: '\u001b[34m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    white: '\u001b[37m',
  },
  colorize(text, color) {
    const code = ansi.codes[color] || '';
    return code ? `${code}${text}${ansi.codes.reset}` : text;
  },
};

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function once(fn) {
  let called = false;
  let value;
  return function (...args) {
    if (!called) {
      called = true;
      value = fn.apply(this, args);
    }
    return value;
  };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const AUX = { sleep, clamp, uid, formatTime, ansi, debounce, once, deepClone };

export { sleep, clamp, uid, formatTime, ansi, debounce, once, deepClone };
export default AUX;

/*
Usage:
import AUX from './AUXILIARY.js';
await AUX.sleep(1000);
console.log(AUX.ansi.colorize('done', 'green'));
*/
