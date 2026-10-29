chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DOGEUB_LIST_TABS') {
    chrome.tabs.query({}).then(tabs => sendResponse(tabs.map(tab => ({ id: tab.id, title: tab.title, url: tab.url }))));
    return true;
  }
  if (message?.type === 'DOGEUB_ACTIVATE_TAB' && Number.isInteger(message.id)) {
    chrome.tabs.update(message.id, { active: true }).then(tab => {
      if (tab?.windowId != null) return chrome.windows.update(tab.windowId, { focused: true });
    }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
});