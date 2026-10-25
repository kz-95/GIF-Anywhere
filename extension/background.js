// Toolbar click turns GIF Anywhere on or off everywhere. content.js watches the
// "enabled" flag, so open tabs follow at once. Missing flag means on.

async function showState() {
  const { enabled } = await chrome.storage.local.get('enabled');
  const on = enabled !== false;
  await chrome.action.setBadgeText({ text: on ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#3ea6ff' });
  await chrome.action.setTitle({ title: `GIF Anywhere is ${on ? 'on' : 'off'}: click to turn ${on ? 'off' : 'on'}` });
}

chrome.action.onClicked.addListener(async () => {
  const { enabled } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: enabled === false });
});

chrome.storage.onChanged.addListener((changes) => { if (changes.enabled) showState(); });
chrome.runtime.onStartup.addListener(showState);
chrome.runtime.onInstalled.addListener(showState);

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'open-picker' && tab?.id) chrome.tabs.sendMessage(tab.id, 'open-picker').catch(() => {});
});
