/*
FS.js
Main filesystem interface for the virtual disk system.
Integrates DISK.js (read), WRITE.js (write), TREE.js (directory), and READ.js (fetch/read bytes).

Exports: FS class

Features:
 - readFile(path)
 - writeFile(path, name, byte)
 - listDir(path)
 - getFileMetadata(path)
 - moveFile(src, dest)
 - deleteFile(path)
 - recursive tree display
 - handles both 'c/' and 'a/' storage
*/

import Disk from './DISK.js';
import Tree from './TREE.js';
import Write from './WRITE.js';
import readFile from './READ.js';

class FS {
  constructor() {
    this.diskC = new Disk('c/');
    this.writerA = new Write('a/');
    this.tree = new Tree(this.diskC);
  }

  readFile(path, options = {}) {
    return readFile(path, { disk: this.diskC, ...options });
  }

  writeFile(path, name, byte) {
    return this.writerA.writeFile(path, name, byte);
  }

  listDir(path = '') {
    return this.tree.list(path);
  }

  getFileMetadata(path) {
    const file = this.diskC.getFile(path);
    return file ? { name: file.name, byte: file.byte, dir: file.dir } : null;
  }

  moveFile(srcPath, destPath) {
    const file = this.diskC.getFile(srcPath);
    if (!file) return false;
    const newFile = this.writerA.writeFile(destPath, file.name, file.byte);
    return newFile;
  }

  deleteFile(path) {
    const data = this.writerA._load();
    const index = data.items.findIndex(f => f.dir === path);
    if (index >= 0) {
      data.items.splice(index, 1);
      this.writerA._save(data);
      return true;
    }
    return false;
  }
}

export default FS;

/*
Usage:
import FS from './FS.js';
const fs = new FS();
fs.listDir('');
fs.writeFile('folder', 'newfile.txt', 12345);
const meta = fs.getFileMetadata('folder/newfile.txt');
*/
