import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';

const spaces = [
  { id: 'main', name: 'Main', icon: '◈' },
  { id: 'school', name: 'School', icon: '▤' },
  { id: 'games', name: 'Games', icon: '▣' },
  { id: 'projects', name: 'Projects', icon: '⌘' },
];
const key = 'dogeub-holospace-v1';
function readState() {
  try { return JSON.parse(localStorage.getItem(key)) || { active: 'main', routes: { main: '/' } }; }
  catch { return { active: 'main', routes: { main: '/' } }; }
}
export default function HoloSpace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState(readState);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const next = { ...state, routes: { ...state.routes, [state.active]: location.pathname } };
    setState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const i = spaces.findIndex(s => s.id === state.active);
        const next = spaces[(i + (e.key === 'ArrowRight' ? 1 : spaces.length - 1)) % spaces.length];
        switchSpace(next.id);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const openPanel = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('dogeub-open-holospace', openPanel);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dogeub-open-holospace', openPanel);
    };
  }, [state]);
  function switchSpace(id) {
    const next = { ...state, active: id, routes: { ...state.routes, [state.active]: location.pathname } };
    setState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    navigate(next.routes[id] || (id === 'school' ? '/student-center' : id === 'games' ? '/game-library' : id === 'projects' ? '/collaboration-center' : '/'));
    setOpen(false);
  }
  return <div data-device-workspace="true" className="fixed bottom-[76px] left-4 z-[2147481000]">
    {open && <div className="mb-2 w-64 rounded-2xl border border-cyan-300/30 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-2xl">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-cyan-200"><Layers size={14}/> HoloSpace</div>
      {spaces.map(space => <button key={space.id} onClick={() => switchSpace(space.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${state.active === space.id ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 hover:bg-white/5'}`}><span className="text-lg">{space.icon}</span><span className="flex-1">{space.name}</span>{state.active === space.id && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>}</button>)}
      <p className="mt-2 text-[11px] text-white/40">Ctrl + Alt + ← / → to switch spaces</p>
    </div>}
    <button onClick={() => setOpen(v => !v)} aria-label="Open HoloSpace workspaces" title="HoloSpace workspaces" className="flex items-center gap-2 rounded-full border border-cyan-300/25 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur-xl hover:border-cyan-200/60"><Layers size={15}/>{spaces.find(s => s.id === state.active)?.name}<span className="text-cyan-300/60">{open ? <ChevronLeft size={13}/> : <ChevronRight size={13}/>}</span></button>
  </div>;
}