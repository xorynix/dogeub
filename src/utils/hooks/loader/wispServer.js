const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const REMOTE_WISP_SERVER =
  import.meta.env.VITE_WISP_SERVER?.trim() ||
  "wss://studylive.up.railway.app/wisp/";

/**
 * Resolve the browser's Wisp WebSocket endpoint.
 *
 * Local Vite development can use the same-origin Wisp handler. Static hosting
 * (Cloudflare Workers / Vercel) cannot serve that WebSocket by itself, so use
 * the existing DOGEUB server unless a separate endpoint is configured.
 *
 * Old saved settings may point to the static site's own /wisp/ URL. Migrate
 * those stale values to the remote server without overriding explicit custom
 * WebSocket endpoints.
 */
export function resolveWispServer(configuredServer) {
  const isLocalHost = LOCAL_HOSTS.has(location.hostname);
  const localDefault =
    (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + "/wisp/";
  const defaultServer = isLocalHost ? localDefault : REMOTE_WISP_SERVER;
  const savedServer = String(configuredServer || "").trim();

  if (!savedServer) return defaultServer;

  try {
    const candidate = new URL(savedServer, location.href);
    if (candidate.protocol !== "ws:" && candidate.protocol !== "wss:") {
      return defaultServer;
    }

    const isSameSiteWisp =
      candidate.host === location.host &&
      candidate.pathname.replace(/\/+$/, "") === "/wisp";

    if (!isLocalHost && isSameSiteWisp) return defaultServer;
    return candidate.href;
  } catch {
    return defaultServer;
  }
}
