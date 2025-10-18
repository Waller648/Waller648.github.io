/*
ANSI.js
Provides full ANSI escape sequence parsing and styling utilities for terminal emulation.
Supports color codes, cursor control, text attributes, and HTML/DOM rendering helpers.

This module complements IO.js and AUXILIARY.js.

Exports:
  - ANSI class: parser and renderer for ANSI escape sequences.
  - ansiColorMap: basic 16-color lookup table.
  - stripAnsi(text): remove ANSI escape codes.
  - toHTML(text): convert ANSI-styled text to HTML spans.
*/

const ansiColorMap = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'gray',
  91: 'bright-red',
  92: 'bright-green',
  93: 'bright-yellow',
  94: 'bright-blue',
  95: 'bright-magenta',
  96: 'bright-cyan',
  97: 'bright-white'
};

const ansiRegex = /\u001b\[[0-9;]*m/g; // matches \x1b[...m sequences

function stripAnsi(text) {
  return text.replace(ansiRegex, '');
}

function toHTML(text) {
  // Converts ANSI colored text to HTML <span> markup with CSS classes.
  const ESC = /\u001b\[([0-9;]*)m/g;
  let html = '';
  let lastIndex = 0;
  let active = [];

  const pushStyle = (codes) => {
    for (const c of codes) {
      if (c === 0) active = [];
      else if (c >= 30 && c <= 37) active.push(`fg-${ansiColorMap[c]}`);
      else if (c >= 90 && c <= 97) active.push(`fg-${ansiColorMap[c]}`);
      else if (c === 1) active.push('bold');
      else if (c === 2) active.push('dim');
      else if (c === 4) active.push('underline');
    }
  };

  let match;
  while ((match = ESC.exec(text))) {
    const raw = match[0];
    const before = text.slice(lastIndex, match.index);
    if (before) html += before;
    const codes = match[1].split(';').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    html += active.length ? '</span>' : '';
    pushStyle(codes);
    if (active.length) html += `<span class="${active.join(' ')}">`;
    lastIndex = ESC.lastIndex;
  }
  html += text.slice(lastIndex);
  if (active.length) html += '</span>';
  return html;
}

class ANSI {
  constructor(io = null) {
    this.io = io; // optional IO for output
  }

  write(text) {
    if (!this.io) return;
    // if output is DOM-based, convert to HTML spans for coloring
    if (this.io.element) {
      const html = toHTML(text);
      const temp = document.createElement('span');
      temp.innerHTML = html;
      this.io.element.appendChild(temp);
      if (this.io.autoScroll) this.io.element.scrollTop = this.io.element.scrollHeight;
    } else {
      this.io.write(stripAnsi(text));
    }
  }

  colorize(text, colorCode) {
    return `\u001b[${colorCode}m${text}\u001b[0m`;
  }

  bold(text) { return this.colorize(`\u001b[1m${text}\u001b[0m`); }
  underline(text) { return this.colorize(`\u001b[4m${text}\u001b[0m`); }
  red(text) { return this.colorize(`\u001b[31m${text}\u001b[0m`); }
  green(text) { return this.colorize(`\u001b[32m${text}\u001b[0m`); }
  yellow(text) { return this.colorize(`\u001b[33m${text}\u001b[0m`); }
  blue(text) { return this.colorize(`\u001b[34m${text}\u001b[0m`); }
  cyan(text) { return this.colorize(`\u001b[36m${text}\u001b[0m`); }
  magenta(text) { return this.colorize(`\u001b[35m${text}\u001b[0m`); }
}

export { ANSI, ansiColorMap, stripAnsi, toHTML };
export default ANSI;

/*
Usage:
import ANSI from './ANSI.js';
import IO from './IO.js';

const io = new IO();
const ansi = new ANSI(io);
io.attachToElement(document.body);
ansi.write('\u001b[31mError:\u001b[0m Something went wrong!');
*/
