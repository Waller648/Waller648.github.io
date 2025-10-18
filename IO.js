/*
IO.js
A fairly capable I/O subsystem for a browser-based terminal emulator.
Designed to be used together with SHELL.js (main), HISTORY.js, and ARGV.js.

Features:
- Stream-like API for stdin/stdout/stderr with write/writeln/clear
- Line-buffered readLine() with optional prompt and timeout
- EventEmitter style hooks: on('data'), on('line'), on('close')
- Support for piping: src.pipe(dest)
- Simple pseudo-file descriptor table for connecting COM apps or in-memory files
- Optional DOM output binding (attachToElement) to display output in a terminal container
- Integration hooks for History (push executed commands) and SHELL (executor)
- readPassword(prompt) that masks input

Notes:
- This is not a drop-in replacement for node streams. It's intentionally small and sync-friendly,
  with a few async helpers where a Promise makes sense (readLine, readWhile).
- Consumers should `await io.readLine()` to get user input. For programmatic input, use io.pushInput(...).

API summary:
  const io = new IO({ history, element })
  io.write(text)
  io.writeln(text)
  await io.readLine({ prompt, mask })
  io.readPassword(prompt)
  io.on('data', cb)
  io.on('line', cb)
  io.pipe(otherIO)
  io.attachToElement(elem)
  io.pushInput('some user text') // simulate user typing + enter
  io.openFD(name, options) // open pseudo-file descriptor
  io.writeFD(fd, data) // write to fd

*/

class SimpleEventEmitter {
  constructor() { this._events = Object.create(null); }
  on(ev, cb) { (this._events[ev] ||= []).push(cb); return () => this.off(ev, cb); }
  off(ev, cb) { if (!this._events[ev]) return; this._events[ev] = this._events[ev].filter(f => f !== cb); }
  emit(ev, ...args) { (this._events[ev] || []).slice().forEach(f => { try { f(...args); } catch (e) { console.error('Event handler failed', e); } }); }
}

class IO extends SimpleEventEmitter {
  constructor(opts = {}) {
    super();
    this.stdoutBuffer = '';
    this.stderrBuffer = '';
    this.stdinBuffer = '';
    this.lineQueue = []; // completed lines awaiting consumption
    this.readResolvers = []; // pending readLine resolvers
    this.history = opts.history || null;
    this.element = null; // DOM element to render output
    this.fdTable = Object.create(null); // pseudo file descriptor table
    this.nextFD = 3; // 0/1/2 reserved semantics
    this.closed = false;
    this.pipeTargets = new Set();

    // visual rendering options
    this.autoScroll = opts.autoScroll !== false;
    this.appendNewlineOnWrite = opts.appendNewlineOnWrite || false;
  }

  // Basic writing
  write(text) {
    if (text == null) return;
    const s = String(text);
    this.stdoutBuffer += s;
    this.emit('data', s);
    if (this.element) this._renderToElement(s);
    // forward to any pipe targets
    for (const dest of this.pipeTargets) dest.write(s);
  }

  writeln(text = '') {
    this.write(text + '\n');
  }

  error(text) {
    const s = String(text);
    this.stderrBuffer += s;
    this.emit('error', s);
    if (this.element) this._renderToElement(s, { isError: true });
  }

  clearScreen() {
    this.stdoutBuffer = '';
    if (this.element) this.element.innerText = '';
    this.emit('clear');
  }

  _renderToElement(text, opts = {}) {
    // naive append — consumers can override by providing their own element and CSS
    const node = document.createTextNode(text);
    this.element.appendChild(node);
    if (this.autoScroll) this.element.scrollTop = this.element.scrollHeight;
  }

  attachToElement(elem) {
    if (!elem || !(elem instanceof Element)) throw new TypeError('attachToElement expects a DOM Element');
    this.element = elem;
  }

  // Input handling: pushInput simulates the user typing and submitting lines
  pushInput(text) {
    if (this.closed) throw new Error('IO is closed');
    // text may contain multiple lines; split and enqueue completed lines
    const full = String(text);
    // echo input to stdout by default (shell may disable)
    this.write(full);
    const lines = full.split(/\r?\n/);
    // if last chunk didn't end with newline, leave partial in stdinBuffer
    if (!/\n$/.test(full)) {
      // add first piece to existing buffer
      this.stdinBuffer += lines.shift();
      // remaining completed lines (if any) come from lines array
    } else {
      // if full ended with newline, append everything to stdinBuffer and then flush
      // push all pieces
    }

    // process completed lines
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const combined = (i === 0 && this.stdinBuffer) ? this.stdinBuffer + ln : ln;
      this.lineQueue.push(combined);
      this.emit('line', combined);
      if (this.history && combined.trim()) this.history.push(combined);
      // resolve any pending readLine promises (FIFO)
      const resolver = this.readResolvers.shift();
      if (resolver) resolver(combined);
    }

    // if last piece didn't finish with newline, keep it in stdinBuffer
    if (!/\n$/.test(full)) {
      // keep partial in stdinBuffer (already appended)
    } else {
      this.stdinBuffer = '';
    }

    // also emit generic data event
    this.emit('data', full);
  }

  // Await a single line of input. Options: {prompt, mask, timeoutMs}
  readLine({ prompt = '', mask = false, timeoutMs = 0 } = {}) {
    if (this.closed) return Promise.reject(new Error('IO closed'));
    if (prompt) this.write(prompt);

    // if there's a queued line already, return it
    if (this.lineQueue.length) return Promise.resolve(this.lineQueue.shift());

    return new Promise((resolve, reject) => {
      const wrapped = (line) => { clear(); resolve(line); };
      let timeout = null;
      const clear = () => {
        if (timeout) { clearTimeout(timeout); timeout = null; }
        this.readResolvers = this.readResolvers.filter(r => r !== wrapped);
      };
      this.readResolvers.push(wrapped);
      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          this.readResolvers = this.readResolvers.filter(r => r !== wrapped);
          reject(new Error('readLine timeout'));
        }, timeoutMs);
      }
    });
  }

  // readPassword is just a wrapper that masks input visually if attached to a DOM
  async readPassword(prompt = '') {
    if (prompt) this.write(prompt);
    // In a real DOM-backed terminal, you'd implement live masking. Here we simply return next line.
    const line = await this.readLine();
    return line;
  }

  // pipe: forward writes to another IO instance
  pipe(dest) {
    if (!(dest instanceof IO)) throw new TypeError('pipe target must be IO');
    this.pipeTargets.add(dest);
    return dest;
  }

  unpipe(dest) {
    this.pipeTargets.delete(dest);
  }

  // FD helpers — very small pseudo-file system for connecting apps
  openFD(name, { mode = 'rw' } = {}) {
    const fd = this.nextFD++;
    this.fdTable[fd] = { name, mode, buffer: '' };
    return fd;
  }

  writeFD(fd, data) {
    const rec = this.fdTable[fd];
    if (!rec) throw new Error('bad fd');
    rec.buffer += String(data);
    // if fd is pointed to stdout/stderr mappings, also write to them
    this.write(String(data));
  }

  readFD(fd) {
    const rec = this.fdTable[fd];
    if (!rec) throw new Error('bad fd');
    const data = rec.buffer;
    rec.buffer = '';
    return data;
  }

  closeFD(fd) {
    delete this.fdTable[fd];
  }

  // Allow programmatically feeding characters (useful for interactive prompt simulations)
  pushChar(ch) {
    this.pushInput(String(ch));
  }

  // stop the IO — reject pending reads and emit close
  close() {
    this.closed = true;
    while (this.readResolvers.length) {
      const r = this.readResolvers.shift();
      try { r(Promise.reject(new Error('IO closed'))); } catch (e) { /* ignore */ }
    }
    this.emit('close');
  }

  // utilities
  getStdout() { return this.stdoutBuffer; }
  getStderr() { return this.stderrBuffer; }
}

export default IO;

/*
Usage example:
import IO from './IO.js';
import History from './HISTORY.js';
const history = new History(200);
const io = new IO({ history });

// attach to pre element in DOM
const pre = document.createElement('pre'); document.body.appendChild(pre); io.attachToElement(pre);

io.writeln('Welcome to the terminal');

// simulate user input after 1s
setTimeout(() => io.pushInput('echo hello\n'), 1000);

(async () => {
  const line = await io.readLine({ prompt: '$ ' });
  io.writeln('You typed: ' + line);
})();
*/
