(() => {
  if (window.__dogeubTabBridgeInstalled) return;
  window.__dogeubTabBridgeInstalled = true;
  window.dogeubTabBridge = {
    listTabs: () => new Promise(resolve => chrome.runtime.sendMessage({ type: 'DOGEUB_LIST_TABS' }, response => resolve(chrome.runtime.lastError ? [] : response || []))),
    activateTab: id => chrome.runtime.sendMessage({ type: 'DOGEUB_ACTIVATE_TAB', id })
  };
})();