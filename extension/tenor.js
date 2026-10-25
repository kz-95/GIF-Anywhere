// Tenor search for the popup. Tenor closed its public API in June 2026, so
// results are read from tenor.com's search page.
// shortcut: depends on tenor.com's HTML layout; switch to an API if Tenor offers one again.

const RESULT = /<figure class="UniversalGifListItem[^>]*>\s*<a href="(\/view\/[^"]*?-gif-\d{1,20})"[\s\S]*?<img src="(https:\/\/media\d*\.tenor\.com\/[^"]+\.gif)"/g;

// Returns [{ page, preview, file }] from a tenor.com search page. Media URLs end
// in a 4-character format code: AAAAM is the small preview, AAAAd the medium GIF.
function parseResults(html) {
  return [...html.matchAll(RESULT)].map(([, path, preview]) => ({
    page: `https://tenor.com${path}`,
    preview,
    file: preview.replace(/AAAAM\//, 'AAAAd/'),
  }));
}

async function searchTenor(query) {
  const slug = query.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  if (!slug) return [];
  const res = await fetch(`https://tenor.com/search/${encodeURIComponent(slug)}-gifs`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Tenor answered HTTP ${res.status}`);
  return parseResults(await res.text());
}

if (typeof module !== 'undefined') module.exports = { parseResults };
