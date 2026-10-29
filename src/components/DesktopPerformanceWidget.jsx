import { useEffect, useState } from 'react';
import { Activity, Cpu, Gamepad2, Gauge, MemoryStick } from 'lucide-react';

function readMemory() {
  const memory = performance.memory;
  if (!memory) return null;
  return { used: Math.round(memory.usedJSHeapSize / 1048576), limit: Math.round(memory.jsHeapSizeLimit / 1048576) };
}

export default function DesktopPerformanceWidget() {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(readMemory);
  const [gaming, setGaming] = useState(() => {
    try { return localStorage.getItem('dogeub-gaming-mode') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    let frame = 0, frames = 0, start = performance.now(), id;
    const tick = (time) => {
      frames++;
      if (time - start >= 1000) {
        setFps(Math.round(frames * 1000 / (time - start)));
        frames = 0; start = time;
        setMemory(readMemory());
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const onMode = (event) => setGaming(Boolean(event.detail?.enabled));
    window.addEventListener('dogeub-gaming-mode-change', onMode);
    return () => { cancelAnimationFrame(id); window.removeEventListener('dogeub-gaming-mode-change', onMode); };
  }, []);
  return <section className="mx-auto my-5 w-full max-w-3xl rounded-2xl border border-sky-400/20 bg-slate-950/75 p-4 text-slate-100 shadow-xl shadow-sky-950/20 backdrop-blur-xl">
    <div className="mb-3 flex items-center gap-2"><Activity className="text-cyan-300" size={19}/><h2 className="font-semibold">Desktop Performance</h2><span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">Browser stats</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-white/[.05] p-3"><Gauge size={17} className="mb-2 text-emerald-300"/><div className="text-2xl font-bold tabular-nums">{fps} FPS</div><div className="text-xs text-white/50">Page animation estimate</div></div>
      <div className="rounded-xl bg-white/[.05] p-3"><MemoryStick size={17} className="mb-2 text-violet-300"/><div className="text-2xl font-bold tabular-nums">{memory ? memory.used + ' MB' : 'N/A'}</div><div className="text-xs text-white/50">{memory ? 'This page JS heap' : 'Heap data unsupported'}</div></div>
      <div className="rounded-xl bg-white/[.05] p-3"><Gamepad2 size={17} className="mb-2 text-cyan-300"/><div className="text-2xl font-bold">{gaming ? 'Gaming' : 'Normal'}</div><div className="text-xs text-white/50">Visual effects mode</div></div>
    </div>
    <p className="mt-3 text-[11px] leading-4 text-white/45">These are estimates from the browser, not whole-PC CPU, RAM, GPU, temperature, or game FPS readings.</p>
  </section>;
}
