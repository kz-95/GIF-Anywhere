// Every page. While GIF Anywhere is on, shows a GIF button at the right end of
// the focused text box. The button opens picker.html in an extension iframe,
// which pages' Content-Security-Policy cannot block, and the picked GIF is
// pasted into the box as a file (or typed as a Tenor link).

const PICKER_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
let enabled = true;
let field = null; // the text box the button belongs to
let ui = null;

chrome.storage.local.get('enabled').then((s) => setEnabled(s.enabled !== false));
chrome.storage.onChanged.addListener((c) => { if (c.enabled) setEnabled(c.enabled.newValue !== false); });

function setEnabled(on) {
  enabled = on;
  if (!on && ui) { ui.dialog.close(); hideButton(); }
  if (on) onFocus();
}

// The text box an element belongs to, or null.
function textBox(el) {
  if (!el || !el.tagName) return null;
  if (el.tagName === 'TEXTAREA') return el;
  if (el.tagName === 'INPUT') return /^(text|search)$/.test(el.type) ? el : null;
  if (!el.isContentEditable) return null;
  while (el.parentElement && el.parentElement.isContentEditable) el = el.parentElement;
  return el;
}

function deepActive() {
  let a = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

function buildUi() {
  const host = document.createElement('gif-anywhere');
  const root = host.attachShadow({ mode: 'open' });
  // Popover and modal dialog both render in the browser's top layer, so page
  // transforms, overflow and z-index cannot hide or misplace them.
  root.innerHTML = `
    <style>
      .btn { position: fixed; inset: auto; margin: 0; padding: 4px 9px; border: 0; border-radius: 12px;
        background: #3ea6ff; color: #fff; font: 700 12px/1 system-ui, sans-serif; cursor: pointer;
        box-shadow: 0 1px 3px rgb(0 0 0 / .4); }
      .btn:focus-visible { outline: 2px solid #fff; }
      dialog { padding: 0; border: 0; border-radius: 12px; background: #212121; overflow: hidden; }
      dialog::backdrop { background: rgb(0 0 0 / .45); }
      iframe { display: block; width: min(420px, calc(100vw - 2rem)); height: min(560px, calc(100dvh - 4rem)); border: 0; }
    </style>
    <button class="btn" type="button" popover="manual" aria-label="Add a GIF">GIF</button>
    <dialog aria-label="GIF picker"><iframe title="GIF picker"></iframe></dialog>`;
  document.documentElement.append(host);
  const btn = root.querySelector('.btn');
  const dialog = root.querySelector('dialog');
  const frame = root.querySelector('iframe');
  btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the text box
  btn.addEventListener('click', openPicker);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { frame.src = 'about:blank'; if (field) field.focus(); });
  // The picker can only focus its search box once its frame has focus.
  frame.addEventListener('load', () => { if (dialog.open) frame.focus(); });
  return { btn, dialog, frame };
}

function placeButton() {
  if (!ui || !field) return;
  const r = field.getBoundingClientRect();
  const visible = field.isConnected && r.width >= 60 && r.height >= 12 && r.bottom > 0 && r.top < innerHeight;
  if (!visible) { hideButton(); return; }
  const line = Math.min(r.height, 40); // tall boxes: stay on the first line
  ui.btn.style.left = `${r.right - 44}px`;
  ui.btn.style.top = `${r.top + line / 2 - 10}px`;
  if (!ui.btn.matches(':popover-open')) ui.btn.showPopover();
}

function hideButton() {
  if (ui && ui.btn.matches(':popover-open')) ui.btn.hidePopover();
}

function onFocus() {
  if (!enabled) return;
  const box = textBox(deepActive());
  if (!box) return;
  field = box;
  ui = ui || buildUi();
  placeButton();
}

document.addEventListener('focusin', onFocus, true);
document.addEventListener('focusout', () => setTimeout(() => {
  if (ui && !ui.dialog.open && textBox(deepActive()) !== field) hideButton();
}, 100), true);
for (const ev of ['scroll', 'resize', 'input']) addEventListener(ev, () => requestAnimationFrame(placeButton), true);

function openPicker() {
  if (!enabled || !field) return;
  ui = ui || buildUi();
  hideButton();
  ui.frame.src = chrome.runtime.getURL(`picker.html?site=${encodeURIComponent(location.hostname)}`);
  ui.dialog.showModal();
  ui.frame.focus();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg !== 'open-picker' || !enabled) return;
  const box = textBox(deepActive());
  if (box) { field = box; openPicker(); }
});

addEventListener('message', (e) => {
  if (e.origin !== PICKER_ORIGIN || !e.data || !e.data.gifAnywhere || !ui) return;
  ui.dialog.close();
  if (e.data.gifAnywhere === 'pick' && field) insertGif(field, e.data.gif, e.data.asLink);
});

// File mode fires a paste event carrying the GIF, which chat sites treat like a
// pasted image and upload. If the site ignores it, the Tenor link is typed instead.
function insertGif(box, gif, asLink) {
  box.focus();
  if (!asLink && gif.bytes) {
    const data = new DataTransfer();
    data.items.add(new File([gif.bytes], 'tenor.gif', { type: 'image/gif' }));
    const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    box.dispatchEvent(paste);
    if (paste.defaultPrevented) return 'file'; // the site took the file
  }
  if (!document.execCommand('insertText', false, gif.page)) {
    if (box.isContentEditable) box.append(gif.page);
    else box.setRangeText(gif.page, box.selectionStart ?? box.value.length, box.selectionEnd ?? box.value.length, 'end');
    box.dispatchEvent(new InputEvent('input', { bubbles: true, data: gif.page, inputType: 'insertText' }));
  }
  return 'link';
}
