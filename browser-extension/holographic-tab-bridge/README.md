# Dogeub Holographic Tab Bridge

Load this folder as an unpacked extension in Chromium-based browsers:
1. Open `chrome://extensions` (or the browser's equivalent).
2. Enable Developer mode.
3. Choose **Load unpacked** and select this folder.
4. Open Dogeub and press **Ctrl+Shift+K**.

The extension requests the `tabs` permission so Dogeub can list tab titles/URLs and activate a selected tab. Browser policies may restrict this on some browsers. The in-app switcher still works without the extension; browser tabs will not be listed until the bridge is installed.

Supported Dogeub origins are configured in `manifest.json`; add your own trusted deployment origin to both `host_permissions` and `content_scripts.matches` if needed.