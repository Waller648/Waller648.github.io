/*
SHELL.js
Refactored shell to use INPUT.js for interactive browser input.
Uses the IO instance exported from COMS.js so COM apps and the shell share the same I/O.
To be loaded in index.html and instantiated with: new Shell('canvas_id')
*/

import Input from './INPUT.js';
import { comManager, IO as comIO, FS, AUX } from './COMS.js';
import ANSI from './ANSI.js;'

class Shell {
  constructor(canvasId) {
    // Use the shared IO from COMS so COM apps output to the same terminal
    this.io = comIO;
    const el = document.getElementById(canvasId);
    if (!el) throw new Error('Shell: element "' + canvasId + '" not found');
    this.io.attachToElement(el);

    this.promptStr = '> ';
    this.input = null;      // instance of Input for the active editable line
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
    // If an existing input exists, destroy it first
    if (this.input) {
      try { this.input.destroy(); } catch (e) { /* ignore */ }
      this.input = null;
    }

    // Create new input attached to the same IO element
    this.input = new Input(this.io, {
      prompt: this.promptStr,
      onSubmit: (line) => this._onSubmit(line),
      onHistoryPrev: () => this._historyUp(),
      onHistoryNext: () => this._historyDown(),
    });

    // focus the input so it receives keyboard events
    this.input.start();
  }

  async _onSubmit(line) {
    // Convert the live editable input line into a static printed line so it becomes part of history output
    try {
      const wrapper = this.input.wrapper;
      const parent = wrapper.parentNode;
      const staticLine = document.createElement('div');
      staticLine.className = 'terminal-line';
      staticLine.textContent = this.promptStr + line;
      parent.replaceChild(staticLine, wrapper);
    } catch (e) {
      // fallback: just write as new line
      this.io.writeln(this.promptStr + line);
    }

    // manage history
    if (line.trim()) {
      this.history.push(line);
      this.historyIndex = this.history.length;
    }

    const tokens = line.trim().split(/\s+/);
    const cmd = tokens.shift() || '';
    const upperCmd = cmd.toUpperCase();
    const args = tokens;

    // Built-in commands
    if (upperCmd === 'HELP') {
      this.io.writeln('Available commands: ' + comManager.listApps().join(', '));
    } else if (upperCmd === 'EXIT') {
      this.io.writeln('Exiting shell.');
      this.running = false;
      // destroy input so user can't type further
      try { this.input.destroy(); } catch (e) {}
      return;
    } else if (!upperCmd) {
      // nothing
    } else {
      // delegate to COM manager. It uses the shared comIO for output.
      await comManager.run(upperCmd, args);
    }

    // create a new input line unless we exited
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
    // recreate input so caret is visible after clear
    this._createInputLine();
  }
}

export default Shell;
