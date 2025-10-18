/*
TREE.js
Provides directory listing and recursive display for virtual disk.
Uses DISK.js for folder/file resolution.

Exports: Tree class
*/

import Disk from './DISK.js';

class Tree {
  constructor(disk) {
    if (!disk) throw new TypeError('Tree requires a Disk instance');
    this.disk = disk;
  }

  _renderFolder(folder, prefix = '') {
    let output = prefix + folder.name + '\n';
    if (!folder.items) return output;
    for (const item of folder.items) {
      if (item.key === 'folder') {
        output += this._renderFolder(item.extends, prefix + '  ');
      } else if (item.key === 'file') {
        output += prefix + '  ' + item.name + '\n';
      }
    }
    return output;
  }

  list(path = '') {
    const folder = path ? this.disk.getFolder(path) : this.disk.getRoot();
    if (!folder) return `Folder '${path}' not found.`;
    return this._renderFolder(folder);
  }
}

export default Tree;

/*
Usage:
import Disk from './DISK.js';
import Tree from './TREE.js';
const disk = new Disk();
const tree = new Tree(disk);
console.log(tree.list('')); // root tree
console.log(tree.list('testfolder'));
*/
