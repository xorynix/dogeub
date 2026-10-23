# DogeUB Remote Desktop host agent

The browser page can share a screen over WebRTC, but a browser cannot directly operate the host computer's full desktop. Full OS mouse/keyboard input requires this optional local agent on the computer being controlled.

## Run it on the host computer

1. Install a current Node.js LTS release.
2. Get a local copy of this repository.
3. Open a terminal in the `remote-control-agent` folder and run `npm install`.
4. Start the agent with `npm start` from that folder.
5. Keep the terminal open while remote control is needed.
6. On the host computer, open DogeUB Remote Desktop, click **Start hosting**, share the screen, and approve the viewer request.
7. Only if you want to permit OS input, click **Enable mouse + keyboard control** and confirm the prompt. Use **Disable remote control** or **Emergency Disconnect** to stop.

The agent binds to loopback only (`127.0.0.1:8765`) and checks the browser Origin against the allowlist in the source. Do not expose this port to the network or change the bind address to `0.0.0.0`. Only share session codes with people you trust.

## Limitations

- This is an optional host-side program; Railway does not launch it for you.
- Screen sharing requires HTTPS, a supported browser, network connectivity, and host approval.
- A managed school Chromebook may block PeerJS/WebRTC, localhost access, or remote-control behavior. It is not guaranteed to work on school-managed devices.
- Some keyboard shortcuts are reserved by the browser or ChromeOS and cannot be forwarded reliably.
- This initial agent supports basic pointer movement, clicks, scrolling, and common keyboard keys. It is not a full commercial remote-support suite.
