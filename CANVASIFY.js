/*
CANVASIFY.js
Utility to 'canvasify' DOM elements for terminal-like rendering.
Supports colors via ANSI or CSS styles.
Handles <div>, <span>, <p>, and text nodes.
*/

import { ANSI } from './ANSI.js';

class Canvasify {
  constructor(element) {
    if (!element) throw new TypeError('Canvasify requires a DOM element');
    this.element = element;
  }

  clear() {
    this.element.innerHTML = '';
  }

  appendText(text, color = null) {
    let node;
    if (color) {
      node = document.createElement('span');
      node.style.color = color;
      node.textContent = text;
    } else {
      node = document.createTextNode(text);
    }
    this.element.appendChild(node);
  }

  appendANSI(text) {
    const html = ANSI.toHTML(text);
    const temp = document.createElement('span');
    temp.innerHTML = html;
    this.element.appendChild(temp);
  }

  appendElement(child) {
    if (child instanceof HTMLElement || child instanceof Text) {
      this.element.appendChild(child);
    } else {
      throw new TypeError('appendElement requires a DOM element or text node');
    }
  }

  setText(text) {
    this.clear();
    this.appendText(text);
  }

  setANSI(text) {
    this.clear();
    this.appendANSI(text);
  }
}

export default Canvasify;

/*
Usage:
import Canvasify from './CANVASIFY.js';
const canvas = new Canvasify(document.getElementById('terminal'));
canvas.appendText('Hello world!', 'green');
canvas.appendANSI('\u001b[31mRed text\u001b[0m');
*/
