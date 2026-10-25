// Runs in the picker iframe that content.js opens. Picks are posted to the
// parent page, where content.js inserts them into the text box.
const input = document.querySelector('input[type=search]');
const linkBox = document.getElementById('link');
const status = document.querySelector('.status');
const grid = document.querySelector('.grid');
const send = (msg) => parent.postMessage({ gifAnywhere: true, ...msg }, '*');

// Link mode is remembered per site, since some sites only accept one of the two.
const siteKey = `link:${new URLSearchParams(location.search).get('site') || ''}`;
chrome.storage.local.get(siteKey).then((s) => { linkBox.checked = s[siteKey] === true; });
linkBox.addEventListener('change', () => chrome.storage.local.set({ [siteKey]: linkBox.checked }));

document.querySelector('.close').onclick = () => send({ gifAnywhere: 'close' });
addEventListener('keydown', (e) => { if (e.key === 'Escape') send({ gifAnywhere: 'close' }); });
input.focus();
addEventListener('focus', () => { if (document.activeElement === document.body) input.focus(); });

let timer;
let ticket = 0;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); });

async function run() {
  const mine = ++ticket;
  grid.replaceChildren();
  if (!input.value.trim()) { status.textContent = 'Type to search Tenor.'; return; }
  status.textContent = 'Searching…';
  let gifs;
  try { gifs = await searchTenor(input.value); } catch (e) { status.textContent = `Search failed: ${e.message}`; return; }
  if (mine !== ticket) return; // a newer search started
  status.textContent = gifs.length ? '' : 'No GIFs found.';
  for (const gif of gifs) {
    const b = document.createElement('button');
    b.type = 'button';
    const img = document.createElement('img');
    img.src = gif.preview;
    img.alt = 'GIF';
    img.loading = 'lazy';
    b.append(img);
    b.onclick = () => pick(gif);
    grid.append(b);
  }
}

async function pick(gif) {
  status.textContent = 'Adding GIF…';
  const asLink = linkBox.checked;
  let bytes = null;
  if (!asLink) {
    try { bytes = await (await fetch(gif.file)).arrayBuffer(); } catch { /* content.js falls back to the link */ }
  }
  send({ gifAnywhere: 'pick', gif: { bytes, page: gif.page }, asLink });
}
