// Records store/demo.gif: the real extension on a sample chat page, from the GIF
// button to the GIF landing in the chat. Search results are original placeholder
// tiles, not real Tenor GIFs, so the demo shows no one else's characters.
// Needs ffmpeg on PATH. Usage: node store/make-demo.cjs   (run `npm install` in tests/ once first)
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(path.join(__dirname, '../tests/node_modules/playwright-core'));

const EXT = path.resolve(__dirname, '../extension');
const SIZE = { width: 960, height: 600 };
const OUT = path.join(__dirname, 'demo.gif');

const tiles = [['#ff7a59', '🎉', 230], ['#7c5cff', '🥳', 180], ['#2ec4b6', '🙌', 260], ['#ffb703', '✨', 200],
  ['#ef476f', '🎊', 210], ['#118ab2', '👏', 250], ['#06d6a0', '🕺', 190], ['#8338ec', '💃', 240]];
const tile = (i) => {
  const [color, emoji, h] = tiles[i];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${h}"><rect width="220" height="${h}" fill="${color}"/><text x="110" y="${h / 2 + 28}" text-anchor="middle" font-size="80">${emoji}</text></svg>`;
};

// A pasted file shows up as a sent message, like a chat app's attachment.
const CHAT = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#313338;color:#dbdee1;font:15px system-ui,sans-serif;height:100vh;display:flex;flex-direction:column">
<div style="padding:14px 20px;border-bottom:1px solid #1e1f22;font-weight:700"># general</div>
<div id="log" style="flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;justify-content:flex-end;overflow:hidden">
  <div><b style="color:#f2f3f5">Alex</b> <span style="color:#949ba4;font-size:12px">Today at 9:41</span><div>finally fixed the bug 🎉</div></div>
  <div><b style="color:#f2f3f5">Sam</b> <span style="color:#949ba4;font-size:12px">Today at 9:42</span><div>no way, send a gif</div></div>
</div>
<div style="padding:0 20px 20px"><div id="box" contenteditable="true" style="background:#383a40;border-radius:8px;padding:12px 16px;outline:none;min-height:20px"></div></div>
<script>
  box.addEventListener('paste', (e) => {
    const f = e.clipboardData.files[0];
    if (!f) return;
    e.preventDefault();
    const msg = document.createElement('div');
    msg.innerHTML = '<b style="color:#f2f3f5">You</b> <span style="color:#949ba4;font-size:12px">Today at 9:43</span><div></div>';
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([f], { type: 'image/svg+xml' }));
    img.style.cssText = 'width:160px;border-radius:8px;margin-top:4px';
    msg.lastChild.append(box.textContent, document.createElement('br'), img);
    log.append(msg);
    box.textContent = '';
  });
</script></body></html>`;

(async () => {
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gifa-demo-'));
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'gifa-demo-profile-')), {
    channel: 'msedge', headless: false, viewport: SIZE,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  await ctx.route('https://chat.example/**', (r) => r.fulfill({ contentType: 'text/html', body: CHAT }));
  await ctx.route('https://tenor.com/search/**', (r) => r.fulfill({ contentType: 'text/html',
    body: tiles.map((_, i) => `<figure class="UniversalGifListItem"><a href="/view/party-gif-${1000000 + i}"><img src="https://media.tenor.com/tile${i}AAAAM/party.gif"></a></figure>`).join('') }));
  await ctx.route('https://media.tenor.com/**', (r) => r.fulfill({
    contentType: 'image/svg+xml', body: tile(Number(r.request().url().match(/tile(\d)/)[1])) }));

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://chat.example/');
  // Screenshots taken back to back while the steps run, each kept with its time.
  const frames = [];
  let recording = true;
  const recorder = (async () => {
    while (recording) {
      const file = path.join(frameDir, `f${String(frames.length).padStart(4, '0')}.png`);
      await page.screenshot({ path: file });
      frames.push({ file, t: Date.now() });
    }
  })();
  await page.waitForTimeout(600);
  await page.click('#box');
  await page.keyboard.type('celebrating like ', { delay: 60 });
  await page.waitForTimeout(700);
  const btn = page.locator('gif-anywhere .btn');
  const b = await btn.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.waitForTimeout(400);
  await btn.click();
  const picker = page.frameLocator('gif-anywhere iframe');
  await picker.locator('input[type=search]').waitFor();
  await page.waitForTimeout(400);
  await page.keyboard.type('celebrate', { delay: 90 });
  await picker.locator('.grid button img').nth(3).waitFor();
  await page.waitForTimeout(1200);
  await picker.locator('.grid button').first().hover();
  await page.waitForTimeout(500);
  await picker.locator('.grid button').first().click();
  await page.locator('#log img').waitFor();
  await page.waitForTimeout(2500);
  recording = false;
  await recorder;
  await ctx.close();

  // Each frame lasts until the next one was taken; two-pass palette keeps colors clean.
  const list = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${(((frames[i + 1] || f).t - f.t) / 1000 || 0.1).toFixed(3)}`);
  const listFile = path.join(frameDir, 'frames.txt');
  fs.writeFileSync(listFile, `${list.join('\n')}\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', 'fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop', '0', OUT]);
  const seconds = (frames.at(-1).t - frames[0].t) / 1000;
  console.log(`${OUT} ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, ${frames.length} frames, ${seconds.toFixed(1)} s`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
