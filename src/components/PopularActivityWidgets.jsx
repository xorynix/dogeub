import { useEffect, useState } from 'react';
import { Globe, Gamepad2, ExternalLink } from 'lucide-react';
import { useOptions } from '../utils/optionsContext';

const SITE_KEY = 'dogeub-popular-sites';
const GAME_KEY = 'dogeub-games-from-catalog';

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function record(key, item) {
  const list = readList(key);
  const existing = list.find((entry) => entry.id === item.id);
  const next = existing
    ? list.map((entry) => entry.id === item.id ? { ...entry, visits: entry.visits + 1, lastVisited: Date.now() } : entry)
    : [{ ...item, visits: 1, lastVisited: Date.now() }, ...list];
  try { localStorage.setItem(key, JSON.stringify(next.sort((a, b) => b.visits - a.visits).slice(0, 8))); } catch {}
  window.dispatchEvent(new Event('dogeub-activity-updated'));
}

function ActivityCard({ title, icon: Icon, items, empty, onOpen }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="opacity-80" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {items.length ? (
        <div className="space-y-1">
          {items.slice(0, 5).map((item, index) => (
            <button key={item.id} type="button" onClick={() => onOpen?.(item)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10">
              <span className="w-5 text-xs opacity-50">{index + 1}</span>
              {item.icon ? <img src={item.icon} alt="" className="h-5 w-5 rounded object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="h-5 w-5" />}
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              <span className="text-xs opacity-60">{item.visits} {item.visits === 1 ? 'visit' : 'visits'}</span>
              {onOpen && <ExternalLink size={12} className="opacity-50" />}
            </button>
          ))}
        </div>
      ) : <p className="text-sm opacity-60">{empty}</p>}
    </section>
  );
}

export default function PopularActivityWidgets({ only = null } = {}) {
  const { options } = useOptions();
  const [sites, setSites] = useState(() => readList(SITE_KEY));
  const [games, setGames] = useState(() => readList(GAME_KEY));

  useEffect(() => {
    const refresh = () => {
      setSites(readList(SITE_KEY));
      setGames(readList(GAME_KEY));
    };
    window.addEventListener('dogeub-activity-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('dogeub-activity-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    const onSite = (event) => {
      const raw = event.detail?.url;
      if (!raw) return;
      try {
        const url = new URL(raw);
        record(SITE_KEY, { id: url.hostname, name: url.hostname.replace(/^www\./, ''), url: url.href, icon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64` });
      } catch {}
    };
    const onGame = (event) => {
      const game = event.detail;
      if (!game?.id || !game?.name) return;
      record(GAME_KEY, { id: String(game.id), name: String(game.name), url: game.url || '', icon: game.icon || '' });
    };
    window.addEventListener('dogeub-site-visited', onSite);
    window.addEventListener('dogeub-game-launched', onGame);
    return () => {
      window.removeEventListener('dogeub-site-visited', onSite);
      window.removeEventListener('dogeub-game-launched', onGame);
    };
  }, []);

  if (!(options.popularSitesWidget ?? true) && !(options.mostPlayedGamesWidget ?? true)) return null;
  const sitesCard = (options.popularSitesWidget ?? true) && <ActivityCard title="Most Visited Websites" icon={Globe} items={sites} empty="Open websites from your DOGEUB shortcuts to build your list." onOpen={(item) => { window.dispatchEvent(new CustomEvent('dogeub-open-url', { detail: { url: item.url } })); window.location.assign('/search'); }} />;
  const gamesCard = (options.mostPlayedGamesWidget ?? true) && <ActivityCard title="Most Played Games" icon={Gamepad2} items={games} empty="Open games from DOGEUB’s game catalog and they’ll show up here." onOpen={(item) => { if (item.url) window.location.assign(item.url); }} />;
  if (only === 'sites') return sitesCard ? <div className="w-full min-w-0">{sitesCard}</div> : null;
  if (only === 'games') return gamesCard ? <div className="w-full min-w-0">{gamesCard}</div> : null;
  return (
    <div className="mx-auto mt-6 grid w-full max-w-[40rem] grid-cols-1 gap-4 px-4 sm:grid-cols-2">
      {sitesCard}
      {gamesCard}
    </div>
  );
}
