/*
WRITE.js
Writes or updates files in LocalStorage under 'a/' folder.
- Adds new file or updates existing file content.
- Keeps metadata consistent (name, byte, dir, key)
*/

class Write {
  constructor(rootKey = 'a/') {
    this.rootKey = rootKey;
  }

  _load() {
    const json = localStorage.getItem(this.rootKey);
    if (!json) return { key: this.rootKey, items: [] };
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse LocalStorage JSON', e);
      return { key: this.rootKey, items: [] };
    }
  }

  _save(data) {
    localStorage.setItem(this.rootKey, JSON.stringify(data));
  }

  writeFile(path, name, byte) {
    const data = this._load();
    const item = {
      key: 'file',
      name: name,
      byte: byte,
      dir: `${path}/${name}`
    };

    // check if file exists, update if so
    const existingIndex = data.items.findIndex(f => f.dir === item.dir);
    if (existingIndex >= 0) {
      data.items[existingIndex] = item;
    } else {
      data.items.push(item);
    }
    this._save(data);
    return item;
  }
}

export default Write;

/*
Usage:
import Write from './WRITE.js';
const writer = new Write();
writer.writeFile('folder', 'test.txt', 12345);
*/
