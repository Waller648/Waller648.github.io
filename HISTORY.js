/*
HISTORY.js
A lightweight command history manager for the terminal emulator.
Stores previously executed commands, supports navigation (up/down),
search, serialization, and trimming.

Exports: History class

Features:
 - push(command): adds a command (deduplicated from last)
 - prev()/next(): navigate through history entries
 - search(prefix): returns filtered array matching prefix
 - serialize()/deserialize(json): persist history
 - clear(), resetCursor(), atEnd()
*/

class History {
  constructor(limit = 256) {
    this.limit = limit;
    this.commands = [];
    this.cursor = 0; // points to next insertion index (history.length)
  }

  push(command) {
    if (typeof command !== 'string' || !command.trim()) return;
    // Avoid adding duplicate if same as last
    const last = this.commands[this.commands.length - 1];
    if (last === command) return;

    this.commands.push(command);
    if (this.commands.length > this.limit) {
      this.commands.shift();
    }
    this.cursor = this.commands.length; // reset to end
  }

  prev() {
    if (this.cursor > 0) {
      this.cursor--;
      return this.commands[this.cursor];
    }
    return null;
  }

  next() {
    if (this.cursor < this.commands.length - 1) {
      this.cursor++;
      return this.commands[this.cursor];
    }
    this.cursor = this.commands.length;
    return '';
  }

  atEnd() {
    return this.cursor === this.commands.length;
  }

  resetCursor() {
    this.cursor = this.commands.length;
  }

  search(prefix) {
    if (!prefix) return this.commands.slice();
    return this.commands.filter(cmd => cmd.startsWith(prefix));
  }

  serialize() {
    return JSON.stringify(this.commands);
  }

  deserialize(json) {
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        this.commands = arr.slice(-this.limit);
        this.cursor = this.commands.length;
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  }

  clear() {
    this.commands = [];
    this.cursor = 0;
  }
}

export default History;

/*
Usage example:
import History from './HISTORY.js';
const history = new History(100);
history.push('ls -la');
history.push('cat file.txt');
console.log(history.prev()); // 'cat file.txt'
console.log(history.prev()); // 'ls -la'
console.log(history.next()); // 'cat file.txt'
*/
