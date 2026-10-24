import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Clock3, GripVertical, LayoutDashboard, Plus, RotateCcw, Settings2, StickyNote, Timer, Trash2, X } from 'lucide-react';
import Nav from '../layouts/Nav';

const WIDGETS = [
  { id: 'clock', title: 'Clock & date' },
  { id: 'links', title: 'Quick launch' },
  { id: 'focus', title: 'Focus sprint' },
  { id: 'notes', title: 'Sticky note' },
  { id: 'device', title: 'Device snapshot' },
];
const DEFAULT_LINKS = [
  { title: 'Apps', path: '/materials', icon: '▦' },
  { title: 'Games', path: '/docs', icon: '🎮' },
  { title: 'Toolbox', path: '/toolbox', icon: '🧰' },
  { title: 'PC Center', path: '/pc-center', icon: '🖥️' },
  { title: 'Messages', path: '/messages', icon: '💬' },
  { title: 'Student Center', path: '/student-center', icon: '📚' },
];
function readSaved(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function safeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; }
}
function Panel({ title, icon: Icon, children, actions }) {
  return <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-white"><Icon size={17} className="text-cyan-300" />{title}</h2>{actions}</div>
    {children}
  </section>;
}
export default function DashboardStudio() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layout, setLayout] = useState(() => {
    const saved = readSaved('dogeub-studio-layout', null);
    return Array.isArray(saved) ? saved : WIDGETS.map((item) => ({ ...item, visible: true }));
  });
  const [note, setNote] = useState(() => readSaved('dogeub-studio-note', ''));
  const [customLinks, setCustomLinks] = useState(() => readSaved('dogeub-studio-links', []));
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { try { localStorage.setItem('dogeub-studio-layout', JSON.stringify(layout)); } catch {} }, [layout]);
  useEffect(() => { try { localStorage.setItem('dogeub-studio-note', JSON.stringify(note)); } catch {} }, [note]);
  useEffect(() => { try { localStorage.setItem('dogeub-studio-links', JSON.stringify(customLinks)); } catch {} }, [customLinks]);
  useEffect(() => {
    if (!focusRunning) return undefined;
    const id = window.setInterval(() => setFocusSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [focusRunning]);
  useEffect(() => { if (focusSeconds === 0) setFocusRunning(false); }, [focusSeconds]);

  const activeWidgets = useMemo(() => layout.filter((item) => item.visible), [layout]);
  const moveWidget = (id, direction) => setLayout((current) => {
    const next = [...current];
    const from = next.findIndex((item) => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= next.length) return current;
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
  const dropWidget = (event, id) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData('text/plain');
    if (!dragged || dragged === id) return;
    setLayout((current) => {
      const next = [...current];
      const from = next.findIndex((item) => item.id === dragged);
      const to = next.findIndex((item) => item.id === id);
      if (from < 0 || to < 0) return current;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const addCustomLink = (event) => {
    event.preventDefault();
    const url = safeExternalUrl(linkUrl);
    if (!linkTitle.trim() || !url) { setNotice('Enter a link name and a valid website.'); return; }
    setCustomLinks((current) => [...current, { id: Date.now(), title: linkTitle.trim().slice(0, 32), url }].slice(-12));
    setLinkTitle(''); setLinkUrl(''); setNotice('Shortcut saved on this device.');
  };
  const resetLayout = () => {
    setLayout(WIDGETS.map((item) => ({ ...item, visible: true })));
    setNotice('Widget layout restored.');
  };
  const mmss = String(Math.floor(focusSeconds / 60)).padStart(2, '0') + ':' + String(focusSeconds % 60).padStart(2, '0');

  return <div className="min-h-screen text-white">
    <Nav />
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">DOGEUB Studio</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your dashboard, your rules.</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Reorder widgets, hide the ones you do not use, and save your shortcuts and notes in this browser.</p></div>
        <button onClick={() => setSettingsOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15"><Settings2 size={16} /> Customize</button>
      </div>
      {settingsOpen && <section className="mb-6 rounded-3xl border border-cyan-300/20 bg-slate-950/75 p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Widget settings</h2><button aria-label="Close settings" onClick={() => setSettingsOpen(false)}><X size={18} /></button></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{layout.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={item.visible} onChange={(event) => setLayout((current) => current.map((entry) => entry.id === item.id ? { ...entry, visible: event.target.checked } : entry))} className="accent-cyan-400" />{item.title}</label>)}</div>
        <button onClick={resetLayout} className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-white"><RotateCcw size={14} /> Reset layout</button>
      </section>}
      {notice && <div role="status" className="mb-4 flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeWidgets.map((widget) => <div key={widget.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', widget.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropWidget(event, widget.id)} className="group relative min-w-0">
          <div className="absolute right-4 top-4 z-10 flex items-center gap-1 opacity-60 transition group-hover:opacity-100"><GripVertical size={15} className="cursor-grab text-slate-400" /><button onClick={() => moveWidget(widget.id, -1)} aria-label="Move widget up" className="rounded p-1 hover:bg-white/10"><ArrowUp size={13} /></button><button onClick={() => moveWidget(widget.id, 1)} aria-label="Move widget down" className="rounded p-1 hover:bg-white/10"><ArrowDown size={13} /></button><button onClick={() => setLayout((current) => current.map((item) => item.id === widget.id ? { ...item, visible: false } : item))} aria-label="Hide widget" className="rounded p-1 hover:bg-white/10"><X size={13} /></button></div>
          {widget.id === 'clock' && <Panel title="Today" icon={Clock3}><p className="text-5xl font-semibold tracking-tight text-white">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="mt-2 text-sm text-slate-300">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: ((now.getHours() * 60 + now.getMinutes()) / 1440 * 100) + '%' }} /></div></Panel>}
          {widget.id === 'links' && <Panel title="Quick launch" icon={LayoutDashboard}>
            <div className="grid grid-cols-3 gap-2">{DEFAULT_LINKS.map((link) => <button key={link.path} onClick={() => navigate(link.path)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center hover:border-cyan-300/40 hover:bg-cyan-300/10"><span className="block text-xl">{link.icon}</span><span className="mt-2 block truncate text-xs font-medium">{link.title}</span></button>)}</div>
            {customLinks.map((link) => <div key={link.id} className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm"><a href={link.url} target="_blank" rel="noreferrer" className="truncate hover:text-cyan-200">{link.title}</a><button onClick={() => setCustomLinks((current) => current.filter((item) => item.id !== link.id))} aria-label={'Remove ' + link.title} className="ml-2 text-slate-400 hover:text-rose-300"><Trash2 size={14} /></button></div>)}
            <form onSubmit={addCustomLink} className="mt-4 grid gap-2"><input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Shortcut name" maxLength={32} className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" /><div className="flex gap-2"><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="example.com" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" /><button type="submit" aria-label="Add shortcut" className="rounded-xl bg-cyan-300 px-3 text-slate-950"><Plus size={17} /></button></div></form>
          </Panel>}
          {widget.id === 'focus' && <Panel title="Focus sprint" icon={Timer}><p className="text-5xl font-semibold tabular-nums">{mmss}</p><p className="mt-2 text-sm text-slate-400">{focusSeconds === 0 ? 'Sprint complete — take a break.' : focusRunning ? 'Stay on one task until the timer ends.' : 'A calm 25-minute focus session.'}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setFocusRunning((value) => !value)} disabled={focusSeconds === 0} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{focusRunning ? 'Pause' : 'Start'}</button><button onClick={() => { setFocusSeconds(25 * 60); setFocusRunning(false); }} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Reset</button><button onClick={() => setFocusSeconds(5 * 60)} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">5 min</button></div></Panel>}
          {widget.id === 'notes' && <Panel title="Sticky note" icon={StickyNote}><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={3000} placeholder="Jot down an idea, reminder, or TODO..." rows={7} className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 outline-none focus:border-cyan-300/50" /><p className="mt-2 text-right text-xs text-slate-500">{note.length}/3000 · saved in this browser</p></Panel>}
          {widget.id === 'device' && <Panel title="Device snapshot" icon={Clock3}><div className="space-y-3">{[{ label: 'Browser', value: navigator.userAgentData?.brands?.map((item) => item.brand).join(', ') || navigator.userAgent.split(' ').slice(-1)[0] || 'Browser' }, { label: 'Logical CPU threads', value: navigator.hardwareConcurrency || 'Not exposed' }, { label: 'Screen', value: window.screen.width + ' × ' + window.screen.height }, { label: 'Connection', value: navigator.onLine ? 'Online' : 'Offline' }].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm last:border-0"><span className="text-slate-400">{item.label}</span><span className="text-right font-medium text-slate-100">{item.value}</span></div>)}</div><p className="mt-3 text-xs text-slate-500">Values are browser-reported and may be limited or approximate.</p></Panel>}
        </div>)}
      </div>
      {activeWidgets.length === 0 && <div className="rounded-3xl border border-dashed border-white/20 p-10 text-center"><h2 className="text-xl font-semibold">A clean slate.</h2><p className="mt-2 text-sm text-slate-400">Open Customize to bring your widgets back.</p></div>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Drag a card or use its arrows to change the layout.</span><span>Layout, shortcuts, and notes are stored locally in this browser.</span></div>
    </main>
  </div>;
}
