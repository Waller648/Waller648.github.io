/*
COMS.js
Container for COM-style applications.
Provides an interface to register and load multiple apps.

Note: You requested to stop here — implementation is basic placeholder.
*/

import COM from './COM.js';
import IO from './IO.js';
import ANSI from './ANSI.js';
import AUX from './AUX.js';

// create global COM manager for all apps
const io = new IO();
const comManager = new COM(io);
const ansi = new ANSI(io); // <-- instance of ANSI

// Example registration (actual apps would be loaded here)
comManager.registerApp('ECHO', async ({ argv, io, AUX, ANSI }) => {
  io.writeln(argv.join(' '));
});

comManager.registerApp('CLS', async ({ io }) => {
  io.clearScreen();
});

export { comManager, fs, ansi as ANSI, AUX };
export default comManager;

/*
Further COM apps should be added using comManager.registerApp(name, fn);
You can integrate COMS_HEADER.json to automate app metadata.
*/
