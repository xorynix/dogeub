import { useMemo, useState } from 'react';
import { Cpu, Monitor, RefreshCw, ShieldCheck } from 'lucide-react';
import Nav from '../layouts/Nav';

const PARTS = [
  { type: 'CPU', name: 'AMD Ryzen 5 7600', tier: 'Mid-range desktop', note: '6 cores / 12 threads · efficient gaming and everyday work' },
  { type: 'CPU', name: 'AMD Ryzen 7 7800X3D', tier: 'High-end desktop', note: '8 cores / 16 threads · gaming-focused desktop processor' },
  { type: 'CPU', name: 'Intel Core i5-14400', tier: 'Mid-range desktop', note: 'Hybrid desktop chip for gaming and productivity' },
  { type: 'CPU', name: 'Intel Core Ultra 7 mobile', tier: 'Laptop class', note: 'Modern mobile platform; performance depends on laptop cooling and power limits' },
  { type: 'GPU', name: 'NVIDIA GeForce RTX 4060', tier: 'Mainstream gaming', note: '1080p-oriented dedicated graphics class; features vary by game' },
  { type: 'GPU', name: 'NVIDIA GeForce RTX 4070 SUPER', tier: 'Upper-midrange gaming', note: 'Stronger 1440p desktop graphics class' },
  { type: 'GPU', name: 'AMD Radeon RX 7600', tier: 'Mainstream gaming', note: 'Dedicated graphics for 1080p gaming' },
  { type: 'GPU', name: 'Integrated graphics', tier: 'Everyday laptops', note: 'Uses shared system memory; capability varies widely by processor' },
];
function Info({ label, value, detail }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 break-words text-xl font-semibold text-white">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}
export default function PCCenter() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [checks, setChecks] = useState({ storage: false, ram: false, cooling: false, drivers: false, background: false });
  const [stamp, setStamp] = useState(0);
  const device = useMemo(() => {
    const memory = navigator.deviceMemory ? navigator.deviceMemory + ' GB (approx.)' : 'Not exposed';
    const heap = performance.memory?.jsHeapSizeLimit ? Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB JS heap limit' : 'Not exposed';
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Not exposed';
    return [
      { label: 'CPU threads', value: navigator.hardwareConcurrency || 'Not exposed', detail: 'Logical thread count reported by browser' },
      { label: 'Memory', value: memory, detail: 'May be rounded or restricted by the browser' },
      { label: 'Display', value: window.screen.width + ' × ' + window.screen.height, detail: 'Current screen dimensions' },
      { label: 'Platform', value: platform, detail: 'Browser-reported OS/platform' },
      { label: 'Connection', value: navigator.onLine ? 'Online' : 'Offline', detail: 'Browser connection hint' },
      { label: 'JavaScript heap', value: heap, detail: 'A limit estimate, not total installed RAM' },
    ];
  }, [stamp]);
  const filtered = PARTS.filter((part) => (filter === 'All' || part.type === filter) && (part.name + ' ' + part.tier + ' ' + part.note).toLowerCase().includes(query.toLowerCase()));
  const done = Object.values(checks).filter(Boolean).length;
  return <div className="min-h-screen text-white"><Nav /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">PC Center</p><h1 className="text-3xl font-bold sm:text-4xl">Know your setup.</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">View browser-reported device information, compare common CPU/GPU classes, and use a practical troubleshooting checklist.</p>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><Monitor size={20} className="text-cyan-300" /> Device snapshot</h2><button onClick={() => setStamp((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><RefreshCw size={14} /> Refresh readings</button></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{device.map((item) => <Info key={item.label} {...item} />)}</div>
    <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-200/5 p-3 text-xs leading-5 text-amber-100/80">Privacy limitation: ordinary web pages usually cannot read your exact graphics card, full installed memory, disk health, or temperature. Values shown here come from browser APIs and can be incomplete; they are not a hardware diagnostic.</p>
    <section className="mt-8"><h2 className="flex items-center gap-2 text-xl font-semibold"><Cpu size={20} className="text-cyan-300" /> CPU & GPU explorer</h2><div className="mt-3 flex flex-wrap gap-2"><div className="flex rounded-xl border border-white/10 p-1">{['All','CPU','GPU'].map((item) => <button key={item} onClick={() => setFilter(item)} className={'rounded-lg px-4 py-2 text-sm ' + (filter === item ? 'bg-cyan-300 font-semibold text-slate-950' : 'text-slate-300 hover:bg-white/10')}>{item}</button>)}</div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search parts..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm outline-none focus:border-cyan-300/50" /></div><div className="mt-3 grid gap-3 md:grid-cols-2">{filtered.map((part) => <article key={part.name} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wider text-cyan-300">{part.type}</span><h3 className="mt-1 font-semibold">{part.name}</h3></div><span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">{part.tier}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">{part.note}</p></article>)}</div>{filtered.length === 0 && <p className="mt-4 text-sm text-slate-400">No parts match that search.</p>}</section>
    <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck size={20} className="text-cyan-300" /> Basic PC health checklist</h2><p className="mt-1 text-sm text-slate-400">Track quick checks before trying more complicated fixes.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-sm">{done}/5 complete</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: done / 5 * 100 + '%' }} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[{id:'storage',label:'Check available disk space'}, {id:'ram',label:'Close unneeded apps and tabs'}, {id:'cooling',label:'Keep vents clear and fans unobstructed'}, {id:'drivers',label:'Install drivers from the PC maker or chip maker'}, {id:'background',label:'Review startup/background apps'}].map((item) => <label key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={checks[item.id]} onChange={(event) => setChecks((value) => ({ ...value, [item.id]: event.target.checked }))} className="accent-cyan-300" />{item.label}</label>)}</div><p className="mt-3 text-xs text-slate-500">Checklist selections are kept for this page session only; no diagnostic scan is run.</p></section>
  </main></div>;
}
