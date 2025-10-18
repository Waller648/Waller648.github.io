/*
COM.js
Simple runtime loader and executor for COM-style apps in the browser terminal.

Exports: COM class

Features:
 - registerApp(name, fn): registers a .com app by name (fn receives { argv, io, AUX, ANSI })
 - run(name, argvArray): runs a registered app with arguments and IO
 - maintains registry of apps
 - can list apps
 - supports pseudo-FD table (delegates to IO.js)
 - app context receives helper modules (AUX, ANSI)
*/

import AUX from './AUXILIARY.js';
import ANSI from './ANSI.js';

class COM {
  constructor(io) {
    this.io = io;
    this.apps = Object.create(null);
  }

  registerApp(name, fn) {
    if (typeof fn !== 'function') throw new TypeError('App must be a function');
    this.apps[name] = fn;
  }

  async run(name, argvArray = []) {
    if (!(name in this.apps)) {
      this.io.error(`COM: App '${name}' not found\n`);
      return;
    }
    const argv = argvArray.slice();
    const ansi = new ANSI(this.io);
    try {
      await this.apps[name]({ argv, io: this.io, AUX, ANSI: ansi });
    } catch (e) {
      this.io.error(`COM app '${name}' crashed: ${e.message}\n`);
    }
  }

  listApps() {
    return Object.keys(this.apps);
  }
}

export default COM;

/*
Usage example:
import IO from './IO.js';
import COM from './COM.js';

const io = new IO();
const com = new COM(io);

com.registerApp('hello', async ({ argv, io, AUX, ANSI }) => {
  io.writeln(ANSI.green('Hello from COM!'));
  if (argv.length) io.writeln('Args: ' + argv.join(', '));
});

com.run('hello', ['world']);
*/
