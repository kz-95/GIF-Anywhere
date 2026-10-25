// GIF Anywhere in the installed Edge (or Chrome), on a fake chat page with a strict
// CSP like Facebook's. Checks: the GIF button appears at the end of a focused box,
// the picker searches live Tenor, a pick is pasted as a GIF file into a box that
// takes files, link mode types the Tenor link, and turning the extension off hides it.
// Usage: node tests/e2e.cjs [msedge|chrome]   (run `npm install` in tests/ once)
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const assert = require('node:assert');
const { chromium } = require('playwright-core');

// EXT=<folder> tests another copy, such as the unzipped store package.
const EXT = process.env.EXT || path.resolve(__dirname, '../extension');
const CHAT_PAGE = `<!doctype html><body style="transform: translateY(0)">
<div id="chat" contenteditable="true" style="width:500px;border:1px solid">hi </div>
<textarea id="plain" style="width:500px"></textarea>
<script>
  window.pasted = null;
  chat.addEventListener('paste', (e) => {
    const f = e.clipboardData.files[0];
    if (f) { e.preventDefault(); window.pasted = { type: f.type, size: f.size }; }
  });
</script></body>`;

async function pickFirst(page, query) {
  await page.locator('gif-anywhere .btn').click({ timeout: 10000 });
  const picker = page.frameLocator('gif-anywhere iframe');
  await picker.locator('input[type=search]').waitFor();
  // Type without clicking: the search box must already have focus.
  await page.waitForTimeout(300);
  await page.keyboard.type(query);
  assert.strictEqual(await picker.locator('input[type=search]').inputValue(), query, 'search box was not focused');
  await picker.locator('.grid button img').first().waitFor({ timeout: 20000 });
  return picker;
}

(async () => {
  const channel = process.argv[2] || 'msedge';
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'gifa-')), {
    channel, headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const worker = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  await ctx.route('https://chat.example/**', (r) => r.fulfill({
    contentType: 'text/html', body: CHAT_PAGE,
    headers: { 'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'" },
  }));
  const page = await ctx.newPage();
  await page.goto('https://chat.example/');

  // Button sits at the right end of the focused box.
  await page.click('#chat');
  const btn = page.locator('gif-anywhere .btn');
  await btn.waitFor();
  const box = await page.locator('#chat').boundingBox();
  const b = await btn.boundingBox();
  assert.ok(b.x > box.x + box.width - 60 && b.x + b.width <= box.x + box.width, `button at x=${b.x}, box ends ${box.x + box.width}`);

  // File paste into the chat box.
  const picker = await pickFirst(page, 'cat');
  const results = await picker.locator('.grid button').count();
  await picker.locator('.grid button').first().click();
  await page.waitForFunction(() => window.pasted, null, { timeout: 20000 });
  const pasted = await page.evaluate(() => window.pasted);

  // Link mode into the plain textarea.
  await page.click('#plain');
  const picker2 = await pickFirst(page, 'dog');
  await picker2.locator('#link').check();
  await picker2.locator('.grid button').first().click();
  await page.waitForFunction(() => document.querySelector('#plain').value.includes('tenor.com/view/'), null, { timeout: 10000 });
  const linkText = await page.inputValue('#plain');

  // Toolbar toggle off: the button goes away.
  await worker.evaluate(() => chrome.storage.local.set({ enabled: false }));
  await page.click('#chat');
  await page.waitForTimeout(500);
  const hiddenWhenOff = !(await btn.isVisible());
  const badge = await worker.evaluate(() => chrome.action.getBadgeText({}));
  await ctx.close();

  assert.ok(results >= 10, `only ${results} results`);
  assert.strictEqual(pasted.type, 'image/gif');
  assert.ok(pasted.size > 100000, `GIF only ${pasted.size} bytes`);
  assert.match(linkText, /^https:\/\/tenor\.com\/view\/[^ ]+-gif-\d+$/);
  assert.ok(hiddenWhenOff, 'button still visible when off');
  assert.strictEqual(badge, '');
  console.log('PASS', JSON.stringify({ results, pasted, linkText, hiddenWhenOff, badge }));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
