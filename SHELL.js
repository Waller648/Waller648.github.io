// SHELL.js
import Input from './INPUT.js';
import IO from './IO.js';
import { comManager, FS, AUX } from './COMS.js';
import ANSI from './ANSI.js';

class Shell {
  constructor(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) throw new Error(`Shell: element "${canvasId}" not found`);

    // Create a single IO instance for both shell and COM apps
    this.io = new IO({ element: el });

    this.promptStr = '> ';
    this.input = null;
    this.history = [];
    this.historyIndex = -1;
    this.running = false;

    this.init();
  }

  init() {
    this.running = true;
    this.io.writeln('Welcome to WebShell! Type HELP for commands.');
    this._createInputLine();
  }

  _createInputLine() {
    // Destroy previous input line if exists
    if (this.input) this.input.destroy();

    this.input = new Input(this.io, {
      prompt: this.promptStr,
      onSubmit: line => this._onSubmit(line),
      onHistoryPrev: () => this._historyUp(),
      onHistoryNext: () => this._historyDown(),
    });

    this.input.start();
  }

  async _onSubmit(line) {
    // Print the submitted line as static output
    this.io.writeln(this.promptStr + line);

    // Manage history
    if (line.trim()) {
      this.history.push(line);
      this.historyIndex = this.history.length;
    }

    const tokens = line.trim().split(/\s+/);
    const cmd = tokens.shift() || '';
    const args = tokens;
    const upperCmd = cmd.toUpperCase();

    if (upperCmd === 'HELP') {
      this.io.writeln('Available commands: ' + comManager.listApps().join(', '));
    } else if (upperCmd === 'EXIT') {
      this.io.writeln('Exiting shell.');
      this.running = false;
      try { this.input.destroy(); } catch (e) {}
      return;
    } else if (!upperCmd) {
      // empty line
    } else {
      // Run command using shared IO
      const success = await comManager.run(upperCmd, args, this.io);
      if (!success) {
        this.io.writeln('Bad command or file name');
      }
    }

    if (this.running) this._createInputLine();
  }

  _historyUp() {
    if (this.history.length === 0) return;
    if (this.historyIndex > 0) this.historyIndex--;
    const val = this.history[this.historyIndex] ?? '';
    if (this.input) this.input.setInput(val);
  }

  _historyDown() {
    if (this.history.length === 0) return;
    if (this.historyIndex < this.history.length - 1) this.historyIndex++;
    else this.historyIndex = this.history.length;
    const val = this.history[this.historyIndex] ?? '';
    if (this.input) this.input.setInput(val);
  }

  clear() {
    this.io.clearScreen();
    if (this.running) this._createInputLine();
  }
}

export default Shell;
