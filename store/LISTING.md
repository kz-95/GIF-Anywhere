# Chrome Web Store listing for GIF Anywhere

Copy each part into the matching field of the developer dashboard.

## Store listing tab

**Name:** GIF Anywhere

**Summary (132 chars max):**
A GIF button in every text box. Search Tenor and drop a GIF into Discord, Facebook, X, WhatsApp, ChatGPT and more.

**Category:** Social & Communication

**Description:**

GIF Anywhere adds a small GIF button to the text box you are typing in, on any website.

How it works
• Click into any message or comment box. A blue GIF button appears at its right end.
• Click it (or press Alt+G), search, and click a GIF.
• The GIF is pasted into your box like a copied image. Tick "Link" to insert the Tenor link instead; the choice is remembered per site.
• Click the toolbar icon to turn GIF Anywhere on or off.

Works on sites such as Discord, Facebook, Messenger, X, Threads, Instagram, WhatsApp Web, ChatGPT, Claude and Gemini.

Privacy
• No account, no tracking, no ads.
• Your typing is never read or sent anywhere. Only your GIF searches go to Tenor.

GIF Anywhere is an independent project and is not affiliated with Tenor or Google. GIFs are provided by Tenor and belong to their owners.

**Graphics:**
- Store icon: `extension/icons/icon-128.png`
- Screenshot: `store/screenshot-1.png` (1280x800)
- Small promo tile: `store/promo-small.png` (440x280)

## Privacy practices tab

**Single purpose:**
Lets the user search for a GIF and insert it into the text box they are typing in, on any website.

**Permission justifications:**

- `storage`: Saves two settings: whether the extension is on, and per site whether GIFs are inserted as links.
- Host permission `<all_urls>` (content script on all sites): The GIF button must appear in text boxes on whatever site the user is using; the user chooses the sites by using them. The script only checks which text box has focus and inserts the GIF the user picks. It does not read page content or typed text.
- Host permissions for tenor.com and media.tenor.com (covered by `<all_urls>`): Fetch Tenor search results, previews and the chosen GIF file.

**Remote code:** No, I am not using remote code. All JavaScript is inside the package.

**Data usage:** Tick none of the data types. Certify the three disclosures (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** https://github.com/kz-95/GIF-Anywhere/blob/main/PRIVACY.md
