// COMS.js
import FS from './FS.js';
import AUX from './AUXILIARY.js';

class ComManager {
  constructor() {
    this.apps = {};
    this.registerDefaultApps();
  }

  registerDefaultApps() {
    // mock DOS commands
    this.apps['ECHO'] = async (args, io) => {
      const text = args.join(' ');
      io.writeln(text);
      return true;
    };

    this.apps['CLS'] = async (args, io) => {
      io.clearScreen();
      return true;
    };

    this.apps['HELP'] = async (args, io) => {
      io.writeln('Available commands: ' + Object.keys(this.apps).join(', '));
      return true;
    };

    // Add more commands here
  }

  listApps() {
    return Object.keys(this.apps);
  }

  async run(cmd, args, io) {
    const upperCmd = cmd.toUpperCase();
    const app = this.apps[upperCmd];
    if (!app) return false; // unknown command

    try {
      // pass the shared IO instance to the command
      await app(args, io);
      return true;
    } catch (e) {
      io.writeln('Error running command: ' + e.message);
      return true;
    }
  }

  registerApp(name, fn) {
    this.apps[name.toUpperCase()] = fn;
  }
}

// Export single instance
export const comManager = new ComManager();

// Export FS and AUX if you want
export { FS, AUX };
