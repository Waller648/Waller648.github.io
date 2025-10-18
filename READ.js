/*
READ.js
Provides functionality to read file contents from remote or local (Disk) sources.
Exports: readFile function
*/

import Disk from './DISK.js';

async function readFile(path, options = {}) {
  const disk = options.disk || new Disk();
  const file = disk.getFile(path);
  if (file) {
    // return byte content or simulated fetch
    if (file.byte != null) {
      return file.byte;
    }
    return null;
  }

  // If file not in local disk, optionally fetch from network
  if (options.fetch === true) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
      const data = await response.arrayBuffer();
      return data.byteLength;
    } catch (e) {
      console.error('Failed to fetch file:', e);
      return null;
    }
  }

  return null;
}

export default readFile;

/*
Usage:
import readFile from './READ.js';
import Disk from './DISK.js';
const disk = new Disk();
const size = await readFile('testfolder/FILETEST', { disk });
console.log('File size:', size);
*/
