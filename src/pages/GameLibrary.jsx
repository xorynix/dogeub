import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Heart, Plus, Search, Trash2 } from 'lucide-react';
import Nav from '../layouts/Nav';

const BASE_GAMES = [
  { id: 'roblox', name: 'Roblox', category: 'Platform', description: 'Experiences, creation tools, and community-made games.', url: 'https://www.roblox.com/', image: '🎮' },
  { id: 'minecraft', name: 'Minecraft', category: 'Sandbox', description: 'Explore, build, and create in a block-based world.', url: 'https://www.minecraft.net/', image: '⛏️' },
  { id: 'chess', name: 'Chess.com', category: 'Strategy', description: 'Play chess puzzles and casual games.', url: 'https://www.chess.com/', image: '♟️' },
  { id: 'itch', name: 'itch.io', category: 'Indie', description: 'Discover independent games and creative projects.', url: 'https://itch.io/', image: '🕹️' },
  { id: 'catalog', name: 'DOGEUB Game Catalog', category: 'DOGEUB', description: 'Open the games catalog already built into DOGEUB.', url: '/docs', image: '🧩' },
];
function readArray(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function isSafeWebUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; } }
export default function GameLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favorites, setFavorites] = useState(() => readArray('dogeub-game-favorites'));
  const [recent, setRecent] = useState(() => readArray('dogeub-game-recent'));
  const [custom, setCustom] = useState(() => readArray('dogeub-custom-games'));
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const all = useMemo(() => [...BASE_GAMES, ...custom], [custom]);
  const categories = ['All', ...new Set(all.map((item) => item.category))];
  const filtered = all.filter((game) => (category === 'All' || game.category === category) && (game.name + ' ' + game.description + ' ' + game.category).toLowerCase().includes(search.toLowerCase()));
  const toggleFavorite = (id) => setFavorites((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { localStorage.setItem('dogeub-game-favorites', JSON.stringify(next)); } catch {}
    return next;
  });
  const openGame = (game) => {
    const next = [game.id, ...recent.filter((item) => item !== game.id)].slice(0, 8);
    setRecent(next); try { localStorage.setItem('dogeub-game-recent', JSON.stringify(next)); } catch {}
    if (game.url.startsWith('/')) navigate(game.url);
    else window.open(game.url, '_blank', 'noopener,noreferrer');
  };
  const addGame = (event) => {
    event.preventDefault();
    const safeUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : 'https://' + url.trim();
    if (!name.trim() || !isSafeWebUrl(safeUrl)) { setNotice('Enter a game name and a valid HTTP(S) website.'); return; }
    const item = { id: 'custom-' + Date.now(), name: name.trim().slice(0, 60), category: 'My games', description: description.trim().slice(0, 180) || 'Custom shortcut saved on this device.', url: safeUrl, image: '⭐', custom: true };
    const next = [...custom, item].slice(-40);
    setCustom(next); try { localStorage.setItem('dogeub-custom-games', JSON.stringify(next)); } catch {}
    setName(''); setUrl(''); setDescription(''); setShowAdd(false); setNotice('Game shortcut added.');
  };
  return <div className="min-h-screen text-white"><Nav /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Game Library</p><h1 className="text-3xl font-bold sm:text-4xl">Your games, organized.</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Search a small starter collection, pin favorites, and save your own game-site shortcuts in this browser.</p></div><button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950"><Plus size={16} /> Add a game</button></div>
    {notice && <p role="status" className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{notice}</p>}
    {showAdd && <form onSubmit={addGame} className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:grid-cols-2"><label className="text-sm text-slate-300">Game/site name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label><label className="text-sm text-slate-300">Website URL<input value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://example.com" className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label><label className="text-sm text-slate-300 sm:col-span-2">Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={180} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" className="rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950">Save shortcut</button><button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border border-white/10 px-4 py-2">Cancel</button></div></form>}
    <div className="mt-6 flex flex-wrap gap-3"><label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3"><Search size={16} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search library..." className="w-full bg-transparent py-3 text-sm outline-none" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((game) => <article key={game.id} className="flex min-h-52 flex-col rounded-3xl border border-white/10 bg-slate-950/50 p-5 transition hover:border-cyan-300/30"><div className="flex items-start gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">{game.image}</div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">{game.category}</p><h2 className="mt-1 truncate text-lg font-semibold">{game.name}</h2></div><button onClick={() => toggleFavorite(game.id)} aria-label={favorites.includes(game.id) ? 'Remove favorite' : 'Add favorite'} className={'rounded-lg p-2 ' + (favorites.includes(game.id) ? 'text-rose-300' : 'text-slate-500 hover:text-rose-300')}><Heart size={17} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} /></button></div><p className="mt-4 flex-1 text-sm leading-6 text-slate-300">{game.description}</p><div className="mt-5 flex items-center justify-between gap-2"><button onClick={() => openGame(game)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">{game.url.startsWith('/') ? 'Open catalog' : 'Open game'} <ExternalLink size={14} /></button>{game.custom && <button onClick={() => { const next = custom.filter((item) => item.id !== game.id); setCustom(next); try { localStorage.setItem('dogeub-custom-games', JSON.stringify(next)); } catch {} }} aria-label={'Delete ' + game.name} className="rounded-lg p-2 text-slate-500 hover:text-rose-300"><Trash2 size={15} /></button>}</div></article>)}</div>
    {filtered.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-white/15 p-12 text-center text-slate-400">No games match your search.</div>}
    <section className="mt-8 grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"><h2 className="font-semibold">Favorites</h2><div className="mt-3 flex flex-wrap gap-2">{all.filter((item) => favorites.includes(item.id)).map((item) => <button key={item.id} onClick={() => openGame(item)} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">{item.image} {item.name}</button>)}{favorites.length === 0 && <p className="text-sm text-slate-500">Tap the heart on a card to pin a favorite.</p>}</div></div><div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"><h2 className="font-semibold">Recently opened</h2><div className="mt-3 flex flex-wrap gap-2">{recent.map((id) => all.find((item) => item.id === id)).filter(Boolean).map((item) => <button key={item.id} onClick={() => openGame(item)} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">{item.image} {item.name}</button>)}{recent.length === 0 && <p className="text-sm text-slate-500">Open a game and it will appear here.</p>}</div></div></section>
    <p className="mt-5 text-xs text-slate-500">Favorites, recents, and custom entries are saved in local storage on this device.</p>
  </main></div>;
}
