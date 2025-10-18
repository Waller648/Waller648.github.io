/*
INPUT.js
Browser interactive input handler for the terminal DIV. Designed to be used by SHELL.js.

Features:
 - Attach to a DOM container or IO instance (uses container = io.element)
 - Renders a prompt, editable text area (but using a non-input approach so it fits inside a pre/terminal element)
 - Captures keyboard input, handles composition (IME), paste, cursor movement, selection-like behavior
 - Supports common bindings: Enter (submit), Backspace, Delete, Left/Right/Home/End, Up/Down (history), Ctrl-A/E/U/K/C
 - Exposes methods:
     start(), stop(), destroy(), setInput(text), getInput(), setPrompt(str), setMask(bool)
 - Events / callbacks: onSubmit(fn), onChange(fn), onHistoryPrev(fn), onHistoryNext(fn)

Implementation notes:
 - The element is *not* a real contentEditable area (to avoid layout reflows and styling quirks).
   Instead we render spans and maintain an internal buffer + cursor index.
 - This gives deterministic control of caret rendering and prevents the terminal DOM from stealing focus.
*/

class Input {
    constructor(target, opts = {}) {
        // target: either a DOM Element or an object with .element (e.g. IO instance)
        this.container = target && target.element ? target.element : target;
        if (!this.container || !(this.container instanceof Element)) throw new TypeError('Input requires a DOM element or IO with .element');

        // options / callbacks
        this.prompt = opts.prompt ?? '> ';
        this.mask = !!opts.mask;
        this.onSubmitCb = opts.onSubmit || null;
        this.onChangeCb = opts.onChange || null;
        this.onHistoryPrevCb = opts.onHistoryPrev || null;
        this.onHistoryNextCb = opts.onHistoryNext || null;

        // internal state
        this.buffer = '';
        this.cursor = 0; // index in buffer where next char would be inserted
        this.composing = false; // IME composition state
        this.focused = false;

        // DOM nodes
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'terminal-input-line';
        this.wrapper.style.display = 'block';
        this.wrapper.style.outline = 'none';
        this.wrapper.style.whiteSpace = 'pre';

        this.promptNode = document.createElement('span');
        this.promptNode.className = 'input-prompt';
        this.promptNode.textContent = this.prompt;

        this.textNode = document.createElement('span');
        this.textNode.className = 'input-text';

        this.cursorNode = document.createElement('span');
        this.cursorNode.className = 'input-caret';
        this.cursorNode.textContent = '\u2588'; // full block caret
        this.cursorNode.style.display = 'inline-block';
        this.cursorNode.style.width = '0.6ch';
        this.cursorNode.style.verticalAlign = 'bottom';

        this.wrapper.appendChild(this.promptNode);
        this.wrapper.appendChild(this.textNode);
        this.wrapper.appendChild(this.cursorNode);

        // keep an invisible textarea to capture IME/composition events and clipboard paste
        this.hidden = document.createElement('textarea');
        this.hidden.style.position = 'absolute';
        this.hidden.style.opacity = '0';
        this.hidden.style.pointerEvents = 'none';
        this.hidden.style.left = '-9999px';
        this.hidden.style.top = '0';


        // attach
        this.container.appendChild(this.wrapper);
        document.body.appendChild(this.hidden);

        // event handlers bound
        this._keydown = this._keydown.bind(this);
        this._keypress = this._keypress.bind(this);
        this._paste = this._paste.bind(this);
        this._compositionstart = this._compositionstart.bind(this);
        this._compositionend = this._compositionend.bind(this);
        this._click = this._click.bind(this);

        // listeners
        window.addEventListener('keydown', this._keydown);
        window.addEventListener('keypress', this._keypress);
        window.addEventListener('paste', this._paste);
        this.hidden.addEventListener('compositionstart', this._compositionstart);
        this.hidden.addEventListener('compositionend', this._compositionend);
        this.container.addEventListener('click', this._click);

        // caret blink
        this._blinkVisible = true;
        this._blink = setInterval(() => {
            this.cursorNode.style.visibility = this._blinkVisible ? 'visible' : 'hidden';
            this._blinkVisible = !this._blinkVisible;
        }, 500);

        // initial render
        this.render();
    }

    // public API
    start() { this.focus(); }
    stop() { this.blur(); }
    destroy() {
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('keypress', this._keypress);
        window.removeEventListener('paste', this._paste);
        this.hidden.removeEventListener('compositionstart', this._compositionstart);
        this.hidden.removeEventListener('compositionend', this._compositionend);
        this.container.removeEventListener('click', this._click);
        clearInterval(this._blink);
        if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
        if (this.hidden.parentNode) this.hidden.parentNode.removeChild(this.hidden);
    }

    setPrompt(p) { this.prompt = p; this.promptNode.textContent = p; }
    setMask(v = true) { this.mask = !!v; this.render(); }
    setInput(text) { this.buffer = String(text || ''); this.cursor = this.buffer.length; this.render(); this._emitChange(); }
    getInput() { return this.buffer; }

    onSubmit(fn) { this.onSubmitCb = fn; }
    onChange(fn) { this.onChangeCb = fn; }
    onHistoryPrev(fn) { this.onHistoryPrevCb = fn; }
    onHistoryNext(fn) { this.onHistoryNextCb = fn; }

    focus() {
        this.focused = true;
        this.hidden.focus();
        // ensure caret visible
        this.container.scrollTop = this.container.scrollHeight;
    }

    blur() {
        this.focused = false;
        try { this.hidden.blur(); } catch (e) { }
    }

    // render current buffer and cursor
    render() {
        const text = this.mask ? '*'.repeat(this.buffer.length) : this.buffer;
        // split into left/right around cursor
        const left = text.slice(0, this.cursor);
        const right = text.slice(this.cursor);
        this.textNode.textContent = left;
        // create a ghost node for the right side so the caret is between them
        // ensure right side rendered after caret
        if (this._rightNode && this._rightNode.parentNode) this._rightNode.parentNode.removeChild(this._rightNode);
        this._rightNode = document.createElement('span');
        this._rightNode.className = 'input-right';
        this._rightNode.textContent = right;
        this.wrapper.appendChild(this._rightNode);
        // position the real caret between left and right by DOM order (textNode, caret, rightNode)
    }

    // key handling
    _keydown(e) {
        if (this.composing) return; // let IME finish

        // Some keys produce a keypress event for character insertion instead; we only handle controls here
        if (e.key === 'Enter') {
            e.preventDefault();
            const line = this.buffer;
            if (this.onSubmitCb) this.onSubmitCb(line);
            this.buffer = '';
            this.cursor = 0;
            this.render();
            this._emitChange();
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (this.cursor > 0) {
                this.buffer = this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor);
                this.cursor--;
                this.render();
                this._emitChange();
            }
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            if (this.cursor < this.buffer.length) {
                this.buffer = this.buffer.slice(0, this.cursor) + this.buffer.slice(this.cursor + 1);
                this.render();
                this._emitChange();
            }
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (this.cursor > 0) this.cursor--;
            this.render();
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (this.cursor < this.buffer.length) this.cursor++;
            this.render();
            return;
        }
        if (e.key === 'Home') { e.preventDefault(); this.cursor = 0; this.render(); return; }
        if (e.key === 'End') { e.preventDefault(); this.cursor = this.buffer.length; this.render(); return; }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.onHistoryPrevCb) this.onHistoryPrevCb();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.onHistoryNextCb) this.onHistoryNextCb();
            return;
        }

        // Ctrl combos
        if (e.ctrlKey || e.metaKey) {
            // Ctrl-A => go to start
            if (e.key.toLowerCase() === 'a') { e.preventDefault(); this.cursor = 0; this.render(); return; }
            // Ctrl-E => end
            if (e.key.toLowerCase() === 'e') { e.preventDefault(); this.cursor = this.buffer.length; this.render(); return; }
            // Ctrl-U => clear line
            if (e.key.toLowerCase() === 'u') { e.preventDefault(); this.buffer = ''; this.cursor = 0; this.render(); this._emitChange(); return; }
            // Ctrl-K => kill to end
            if (e.key.toLowerCase() === 'k') { e.preventDefault(); this.buffer = this.buffer.slice(0, this.cursor); this.render(); this._emitChange(); return; }
            // Ctrl-C => cancel
            if (e.key.toLowerCase() === 'c') { e.preventDefault(); if (this.onSubmitCb) this.onSubmitCb('^C'); this.buffer = ''; this.cursor = 0; this.render(); this._emitChange(); return; }
        }
    }

    // some browsers deliver printable characters via keypress; handle them here for best compatibility
    _keypress(e) {
        if (this.composing) return;
        if (!e.key || e.key.length !== 1) return;
        e.preventDefault();
        const ch = e.key;
        // insert at cursor
        this.buffer = this.buffer.slice(0, this.cursor) + ch + this.buffer.slice(this.cursor);
        this.cursor += 1;
        this.render();
        this._emitChange();
    }

    _paste(e) {
        if (!e.clipboardData) return;
        const text = e.clipboardData.getData('text');
        if (!text) return;
        e.preventDefault();
        // insert at cursor
        this.buffer = this.buffer.slice(0, this.cursor) + text + this.buffer.slice(this.cursor);
        this.cursor += text.length;
        this.render();
        this._emitChange();
    }

    _compositionstart() { this.composing = true; }
    _compositionend(e) {
        this.composing = false; if (e.data) {
            // composition delivered via hidden textarea/paste-like event; insert
            this.buffer = this.buffer.slice(0, this.cursor) + e.data + this.buffer.slice(this.cursor);
            this.cursor += e.data.length;
            this.render();
            this._emitChange();
        }
    }

    _click(e) {
        // focus hidden input to capture keys
        this.focus();
        // approximate cursor position by character count from click position
        // simple heuristic: set cursor to end
        this.cursor = this.buffer.length;
        this.render();
    }

    _emitChange() { if (this.onChangeCb) this.onChangeCb(this.buffer); }
}

export default Input;

/*
Usage:
import Input from './INPUT.js';
const inp = new Input(document.getElementById('terminal'), {
  prompt: '$ ',
  onSubmit: (line) => console.log('submit', line),
  onHistoryPrev: () => console.log('history up'),
  onHistoryNext: () => console.log('history down'),
});
*/
