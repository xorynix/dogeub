import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Keyboard, ExternalLink, Info } from 'lucide-react';
import shortcutRegistry from '../utils/shortcutRegistry';

const categories = ['All shortcuts', ...new Set(shortcutRegistry.map((item) => item.category))];

export default function Shortcuts() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All shortcuts');
  const shortcuts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return shortcutRegistry.filter((item) => {
      const matchesCategory = category === 'All shortcuts' || item.category === category;
      const searchable = [item.app, item.title, item.description, item.category, item.keys.join(' '), item.note || ''].join(' ').toLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [query, category]);

  return (
    <main className="min-h-screen px-4 pb-28 pt-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"><ArrowLeft size={16} /> Back</button>
        <header className="mb-7 flex flex-wrap items-center gap-4">
          <div className="rounded-2xl bg-violet-400/15 p-3 text-violet-300"><Keyboard size={30} /></div>
          <div><h1 className="text-3xl font-bold tracking-tight">Doge Shortcuts</h1><p className="mt-1 text-sm text-white/60">Global, app-specific, and contextual controls. Check notes for shared shortcuts and focus requirements.</p></div>
        </header>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5"><Search size={17} className="text-white/40" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shortcuts or apps…" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="mb-4 flex items-center justify-between text-sm text-white/50"><span>{shortcuts.length} shortcut{shortcuts.length === 1 ? '' : 's'}</span><span>Catalog updates as shortcuts are added to DogeUB.</span></div>
        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map((item) => (
            <article key={item.app + item.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{item.app} · {item.category}</p><h2 className="mt-1 text-lg font-semibold">{item.title}</h2></div><button onClick={() => navigate(item.route)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/10">Open app <ExternalLink size={13} /></button></div>
              <div className="mb-3 flex flex-wrap gap-1.5">{item.keys.map((key) => <kbd key={key} className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-sm font-semibold">{key}</kbd>)}</div>
              <p className="text-sm leading-6 text-white/65">{item.description}</p>
              {item.note && <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-200/80"><Info size={14} className="mt-0.5 shrink-0" />{item.note}</p>}
            </article>
          ))}
        </div>
        {shortcuts.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center text-sm text-white/50">No shortcuts match that search.</div>}
      </div>
    </main>
  );
}
