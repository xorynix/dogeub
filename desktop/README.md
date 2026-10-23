# DOGEUB Lite desktop builds

The desktop package bundles the Vite-built Lite interface and game catalog into an Electron app.

## Downloads

After a release is published, the assets are:

- **Windows x64:** `DOGEUB-Lite-Windows-x64-Setup.exe`
- **ChromeOS/Linux x64:** `DOGEUB-Lite-ChromeOS-Linux-x64.deb` or `DOGEUB-Lite-ChromeOS-Linux-x64.AppImage`

On a Chromebook, the Linux build requires **Settings → About ChromeOS → Developers → Linux development environment** to be enabled. Managed Chromebooks may not allow Linux apps. The Windows installer will not run directly on ChromeOS.

## How releases are built

GitHub Actions builds the website first so the game catalog is included in the packaged files, then creates the platform installers. Pull-request and branch builds upload downloadable workflow artifacts; pushing a tag such as `lite-v1.0.0` creates a GitHub Release with the installers attached.

## Doge AI endpoint

AI responses require a hosted DOGEUB AI endpoint; an executable cannot run the hosted Workers AI service by itself or safely contain server credentials. Set a repository **Actions variable** named `DOGEUB_LITE_AI_ENDPOINT` to the complete HTTPS endpoint ending in `/api/doge-ai`. The workflow embeds this public endpoint URL in release packages. If it is blank, the desktop app explains that AI has not been configured.

## Online browsing

The catalog is bundled locally; external game websites and AI responses need internet access. External links open in the default browser. This package does not provide a network-block bypass proxy.
