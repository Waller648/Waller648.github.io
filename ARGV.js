/*
ARGV.js
Utility for parsing and working with command-line style arguments in a browser/terminal emulator.
Exports: ARGV class (default) and parseArgs helper.

Features:
 - Accepts an array of tokens (like process.argv.slice(2)) or a single string to tokenize.
 - Supports:
     --long
     --long=value
     --long value
     -abc  (short flags combined)
     -k value
     -- key to stop option parsing
 - Keeps positional args in .pos
 - Keeps options in .opts (keys -> string or true)
 - Preserves original tokens
 - Convenience methods: getFlag, get, shift, peek, toString, clone

Examples (in comments at bottom).
*/

function tokenize(commandString) {
  // naive shell-like tokenizer that understands single/double quotes and escaping with backslash
  const tokens = [];
  let cur = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  while (i < commandString.length) {
    const ch = commandString[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      i++;
      continue;
    }
    if (ch === '\\' && !inSingle) {
      // simple backslash escape (not inside single quotes)
      const next = commandString[i + 1];
      if (next !== undefined) {
        cur += next;
        i += 2;
        continue;
      }
    }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (cur.length) tokens.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.length) tokens.push(cur);
  return tokens;
}

function parseArgs(tokens) {
  // tokens: array of strings
  const opts = Object.create(null);
  const pos = [];
  const raw = tokens.slice();

  let i = 0;
  let stop = false;
  while (i < tokens.length) {
    const t = tokens[i];
    if (stop) {
      pos.push(t);
      i++;
      continue;
    }
    if (t === '--') {
      stop = true;
      i++;
      continue;
    }
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      if (eq !== -1) {
        const key = t.slice(2, eq);
        const val = t.slice(eq + 1);
        opts[key] = val;
        i++;
        continue;
      }
      const key = t.slice(2);
      const next = tokens[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        opts[key] = next;
        i += 2;
      } else {
        opts[key] = true;
        i++;
      }
      continue;
    }
    if (t.startsWith('-') && t.length > 1) {
      // short flags cluster
      const letters = t.slice(1).split('');
      // if it's like -kVALUE (single-letter followed by characters) treat as -k VALUE? We'll treat as clustered flags, except if second char is not a letter: just flags
      for (let j = 0; j < letters.length; j++) {
        const l = letters[j];
        // if this is the last letter and next token exists and doesn't start with '-', treat as value
        if (j === letters.length - 1) {
          const next = tokens[i + 1];
          if (next !== undefined && !next.startsWith('-')) {
            opts[l] = next;
            i += 2;
            break;
          } else {
            opts[l] = true;
          }
        } else {
          opts[l] = true;
        }
      }
      if (i < tokens.length && !tokens[i].startsWith('-')) i++;
      if (tokens[i] && tokens[i].startsWith('-')) i++; // defensive
      // ensure we advanced when we consumed value; fallback safe increment
      if (tokens[i - 1] === t) i++;
      continue;
    }
    // positional
    pos.push(t);
    i++;
  }

  return { opts, pos, raw };
}

class ARGV {
  constructor(input) {
    // input: string or array. If omitted, defaults to []
    if (Array.isArray(input)) {
      this._tokens = input.slice();
    } else if (typeof input === 'string') {
      this._tokens = tokenize(input);
    } else if (input == null) {
      this._tokens = [];
    } else {
      throw new TypeError('ARGV constructor expects array or string');
    }

    this._cursor = 0; // for shift/peek
    const parsed = parseArgs(this._tokens);
    this.opts = parsed.opts;
    this.pos = parsed.pos;
    this.raw = parsed.raw;
  }

  // Accessor helpers
  getFlag(name) {
    // check long then short
    if (name in this.opts) return Boolean(this.opts[name] === true || this.opts[name] === 'true');
    // try single-letter
    if (name.length > 1 && name[0] && (name[0] in this.opts)) return Boolean(this.opts[name[0]]);
    return false;
  }

  get(name, fallback) {
    if (name in this.opts) return this.opts[name];
    if (name.length > 1 && name[0] && (name[0] in this.opts)) return this.opts[name[0]];
    return fallback;
  }

  // shift/push style helpers for positional args
  shift() {
    if (this._cursor < this.pos.length) return this.pos[this._cursor++];
    return undefined;
  }

  peek(offset = 0) {
    const idx = this._cursor + offset;
    return idx < this.pos.length ? this.pos[idx] : undefined;
  }

  rest() {
    return this.pos.slice(this._cursor);
  }

  toString() {
    return this.raw.join(' ');
  }

  clone() {
    const c = new ARGV(this.raw.slice());
    c._cursor = this._cursor;
    return c;
  }

  // utility: iterate over positional with a callback
  forEachPos(cb) {
    for (let i = 0; i < this.pos.length; i++) cb(this.pos[i], i);
  }
}

export { tokenize, parseArgs };
export default ARGV;

/*
Usage examples (not executed):

// from array
import ARGV from './ARGV.js';
const argv = new ARGV(['--name', 'alice', '-vf', 'input.txt', 'pos1', 'pos2']);
console.log(argv.get('name')); // 'alice'
console.log(argv.get('v')); // true
console.log(argv.shift()); // 'pos1'

// from string
const argv2 = new ARGV("--path=\"/some/dir\" -abc file.txt -- tag with spaces");
console.log(argv2.opts);
console.log(argv2.pos);
*/
