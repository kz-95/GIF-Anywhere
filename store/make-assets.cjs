// Builds GIF Anywhere's store assets with the installed Edge:
//   extension/icons/icon-{16,32,48,128}.png  (from store/icon.svg)
//   store/screenshot-1.png  1280x800, the real extension on a sample chat page
//   store/promo-small.png   440x280 small promo tile
// Usage: node store/make-assets.cjs   (run `npm install` in tests/ once first)
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { chromium } = require(path.join(__dirname, '../tests/node_modules/playwright-core'));

const EXT = path.resolve(__dirname, '../extension');
const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

const CHAT = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#313338;color:#dbdee1;font:15px system-ui,sans-serif;height:100vh;display:flex;flex-direction:column">
<div style="padding:16px 24px;border-bottom:1px solid #1e1f22;font-weight:700"># general</div>
<div style="flex:1;padding:24px;display:flex;flex-direction:column;gap:16px;justify-content:flex-end">
  <div><b style="color:#f2f3f5">Alex</b> <span style="color:#949ba4;font-size:12px">Today at 9:41</span><div>finally fixed the bug 🎉</div></div>
  <div><b style="color:#f2f3f5">Sam</b> <span style="color:#949ba4;font-size:12px">Today at 9:42</span><div>no way, send a gif</div></div>
</div>
<div style="padding:0 24px 24px"><div id="box" contenteditable="true" style="background:#383a40;border-radius:8px;padding:12px 16px;outline:none">celebrating like </div></div>
</body></html>`;

(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'gifa-assets-')), {
    channel: 'msedge', headless: false, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const page = await ctx.newPage();

  // Icons
  fs.mkdirSync(path.join(EXT, 'icons'), { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await page.screenshot({ path: path.join(EXT, 'icons', `icon-${size}.png`), omitBackground: true });
  }

  // Small promo tile
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(`<body style="margin:0;width:440px;height:280px;display:flex;align-items:center;gap:24px;padding:0 36px;box-sizing:border-box;background:linear-gradient(135deg,#1f2a44,#3ea6ff);font-family:system-ui,sans-serif;color:#fff">
    ${svg.replace('<svg ', '<svg width="120" height="120" ')}
    <div><div style="font-size:30px;font-weight:800;white-space:nowrap">GIF Anywhere</div><div style="font-size:17px;opacity:.9;margin-top:6px">A GIF button in every text box</div></div></body>`);
  await page.screenshot({ path: path.join(__dirname, 'promo-small.png') });

  // Screenshot of the real extension
  await page.setViewportSize({ width: 1280, height: 800 });
  await ctx.route('https://chat.example/**', (r) => r.fulfill({ contentType: 'text/html', body: CHAT }));
  // Original placeholder art instead of real Tenor results: store images must not show others' characters.
  const tiles = [['#ff7a59', '🎉', 230], ['#7c5cff', '🥳', 180], ['#2ec4b6', '🙌', 260], ['#ffb703', '✨', 200],
    ['#ef476f', '🎊', 210], ['#118ab2', '👏', 250], ['#06d6a0', '🕺', 190], ['#8338ec', '💃', 240]];
  await ctx.route('https://tenor.com/search/**', (r) => r.fulfill({ contentType: 'text/html',
    body: tiles.map((_, i) => `<figure class="UniversalGifListItem"><a href="/view/party-gif-${1000000 + i}"><img src="https://media.tenor.com/tile${i}AAAAM/party.gif"></a></figure>`).join('') }));
  await ctx.route('https://media.tenor.com/**', (r) => {
    const [color, emoji, h] = tiles[Number(r.request().url().match(/tile(\d)/)[1])];
    r.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${h}"><rect width="220" height="${h}" fill="${color}"/><text x="110" y="${h / 2 + 28}" text-anchor="middle" font-size="80">${emoji}</text></svg>` });
  });
  await page.goto('https://chat.example/');
  await page.click('#box');
  await page.keyboard.press('End');
  await page.locator('gif-anywhere .btn').click({ timeout: 10000 });
  const picker = page.frameLocator('gif-anywhere iframe');
  await picker.locator('input[type=search]').fill('celebrate');
  await picker.locator('.grid button img').nth(5).waitFor({ timeout: 20000 });
  await picker.locator('.grid img').evaluateAll((imgs) => Promise.all(imgs.slice(0, 8).map((i) => i.decode().catch(() => {}))));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'screenshot-1.png') });

  await ctx.close();
  console.log('assets written');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
