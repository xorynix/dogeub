<div align="center">
  
  <img src="https://github.com/DogeNetwork/dogeub/blob/main/public/logo.svg" width="322" />
  <br />

  [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I3I81MF4CH) ![](https://dcbadge.limes.pink/api/server/https://discord.gg/unblocking?compact=true)

  
</div>

# 

A versatile, "internet hub"; The point of this project is to eliminate the need to search multiple websites for different things by packing together tools, apps, as well as entertainment and private browsing, all in one place. This is particularly useful for people who are lazy and want a "hub" that includes everything that they need to enjoy the internet.


Many of our tools, apps, entertainment, etc. is requested through our Discord community or added through pull requests. We recommend making PRs to help out and contribute!


> [!CAUTION]
> Although this is an "internet hub", we do **not** include illegal, piracy, or copyright-infringing tools or apps.

> ⭐ Star this repository if you are forking it, or find it useful!

---

### Development & Building

dogeub can be easily deployed as a web application. Use the commands below to run it for production, or for developing.

> [!WARNING]
> This project will **not work on Vercel**. dogeub runs a custom Node server while Vercel only supports serverless functions & does not allow persistent Node servers.

#### Production:
```bash
git clone https://github.com/xorynix/dogeub.git
cd dogeub
npm i
npm run build
node server.js
```

### DOGEUB Messages storage

Doge Messages uses the Node server API for accounts, global chat, private conversations, profile pictures, moderation reports, and attachments. It does not use browser-local-only storage for messages.

For persistent production data, attach a writable persistent volume to the service (for example, mount it at `/data`) and set:

```env
DOGEUB_DATA_DIR=/data/dogeub-messages
```

The directory must be writable by the Node process. It holds the JSON account/message database, uploaded attachments, profile pictures, and the generated session-signing key. If `DOGEUB_DATA_DIR` and `RAILWAY_VOLUME_MOUNT_PATH` are not configured, the API falls back to a temporary directory; data can be lost when that environment is replaced. Back up the volume regularly. Message attachments are limited to 4 MB and profile pictures to 512 KB.

During Vite development, the `/api/messages` proxy targets `http://localhost:2345` by default. Run the Node server on that port as well, and override `DOGEUB_API_PROXY` if your API server uses a different address.

#### Development:

```bash
git clone https://github.com/xorynix/dogeub.git
cd dogeub
npm i
npm run dev
```
---

#### Deploying with Docker:

```bash
docker run -d \
  --name dogeub \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  ghcr.io/xorynix/dogeub:latest
```

> [!NOTE]
> If accessing over a network instead of localhost, you will need to provide a valid SSL certificate (e.g., using a reverse proxy like Nginx or Caddy). This is required for the built-in service worker to function properly.

---

### Contributors / Developers

[![Contributors](https://contrib.rocks/image?repo=xorynix/dogeub)](https://github.com/xorynix/dogeub/graphs/contributors)

> Want to be on this list? Contribute to this project!

---




## Star History

<a href="https://www.star-history.com/?repos=xorynix%2Fdogeub&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=xorynix/dogeub&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=xorynix/dogeub&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=xorynix/dogeub&type=timeline&legend=top-left" />
 </picture>
</a>




Thanks to these libraries for making the project possible:

- [MercuryWorkshop/wisp-server-node](https://github.com/MercuryWorkshop/wisp-server-node)
- [MercuryWorkshop/scramjet](https://github.com/MercuryWorkshop/scramjet)
- [titaniumnetwork-dev/Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet)
- [lucide-icons/lucide](https://github.com/lucide-icons/lucide)
- [pmndrs/zustand](https://github.com/pmndrs/zustand)
- [Stuk/jszip](https://github.com/Stuk/jszip)
  
## License

This project is licensed under the **AGPLv3** license.
See the [LICENSE](LICENSE) file for more details.
