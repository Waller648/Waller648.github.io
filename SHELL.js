/*
SHELL.js
Main terminal shell interface.
Integrates COMS.js (COM apps), IO.js (I/O), FS.js (filesystem), ANSI.js, AUXILIARY.js.
To be loaded in index.html and instantiated with: new Shell('canvas_id')
*/

import IO from './IO.js';
import { comManager, fs, ANSI, AUX } from './COMS.js';

class Shell {
  constructor(canvasId) {
    this.io = new IO();
    this.io.attachToElement(document.getElementById(canvasId));
    this.promptStr = '> ';
    this.ansi = new ANSI(this.io);
    this.history = [];
    this.historyIndex = -1;
    this.running = false;
    this.init();
  }

  init() {
    this.running = true;
    this.io.writeln('Welcome to WebShell! Type HELP for commands.');
    this.showPrompt();
    this.io.on('line', line => this.handleInput(line));
  }

  showPrompt() {
    this.io.write(this.promptStr);
  }

  async handleInput(line) {
    if (!line.trim()) return this.showPrompt();
    this.history.push(line);
    this.historyIndex = this.history.length;

    const [cmd, ...args] = line.trim().split(/\s+/);
    const upperCmd = cmd.toUpperCase();

    if (upperCmd === 'HELP') {
      this.io.writeln('Available commands: ' + comManager.listApps().join(', '));
    } else if (upperCmd === 'EXIT') {
      this.io.writeln('Exiting shell.');
      this.running = false;
      return;
    } else {
      await comManager.run(upperCmd, args);
    }

    if (this.running) this.showPrompt();
  }

  // Optional: navigate history with up/down arrows
  handleHistoryUp() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.io.setInput(this.history[this.historyIndex]);
    }
  }

  handleHistoryDown() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.io.setInput(this.history[this.historyIndex]);
    } else {
      this.historyIndex = this.history.length;
      this.io.setInput('');
    }
  }

  clear() {
    this.io.clearScreen();
  }
}

export default Shell;

/*
Usage in index.html:
<script type="module" src="SHELL.js"></script>
<script type="module">
import Shell from './SHELL.js';
const shell = new Shell('terminal'); // 'terminal' is a div or canvas ID
</script>
*/
