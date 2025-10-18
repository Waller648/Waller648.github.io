/*
DISK.js
Access layer for LocalStorage-based virtual disk.
- Reads 'c/' key from LocalStorage.
- Provides recursive folder/item resolution.
- Returns metadata and byte content.
*/

class Disk {
  constructor(rootKey = 'c/') {
    this.rootKey = rootKey;
  }

  _load() {
    const json = localStorage.getItem(this.rootKey);
    if (!json) return { key: this.rootKey, items: [] };
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse disk JSON', e);
      return { key: this.rootKey, items: [] };
    }
  }

  getRoot() {
    return this._load();
  }

  _findFolder(pathParts, folder = null) {
    folder = folder || this.getRoot();
    if (!pathParts.length) return folder;
    const [next, ...rest] = pathParts;
    const nextFolder = (folder.items || []).find(item => item.key === 'folder' && item.name === next);
    if (!nextFolder) return null;
    return this._findFolder(rest, nextFolder.extends);
  }

  getFolder(path) {
    const parts = path.split('/').filter(Boolean);
    return this._findFolder(parts);
  }

  getFile(path) {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    const folder = this._findFolder(parts);
    if (!folder || !folder.items) return null;
    const file = folder.items.find(item => item.key === 'file' && item.name === fileName);
    return file || null;
  }
}

export default Disk;

/*
Usage:
import Disk from './DISK.js';
const disk = new Disk();
const root = disk.getRoot();
const folder = disk.getFolder('testfolder');
const file = disk.getFile('testfolder/FILETEST');
*/
