import { useEffect, useRef, useState } from 'react';
import { Minus, ShieldCheck, X } from 'lucide-react';
import AdminPanel from './AdminPanel';

function getWindowSize() {
  return {
    width: Math.min(900, Math.max(280, window.innerWidth - 24)),
    height: Math.min(680, Math.max(240, window.innerHeight - 88)),
  };
}

function clampPosition(position) {
  const { width, height } = getWindowSize();
  return {
    x: Math.min(Math.max(12, position.x), Math.max(12, window.innerWidth - width - 12)),
    y: Math.min(Math.max(12, position.y), Math.max(12, window.innerHeight - height - 12)),
  };
}

function centeredPosition() {
  const { width, height } = getWindowSize();
  return {
    x: Math.max(12, (window.innerWidth - width) / 2),
    y: Math.max(12, (window.innerHeight - height) / 2),
  };
}

export default function AdminPanelWindow() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(centeredPosition);
  const drag = useRef(null);

  useEffect(() => {
    const launch = () => {
      setPosition((current) => clampPosition(current));
      setMinimized(false);
      setOpen(true);
    };
    window.addEventListener('dogeub-open-admin-panel', launch);
    return () => window.removeEventListener('dogeub-open-admin-panel', launch);
  }, []);

  useEffect(() => {
    const onResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event) => {
    if (!drag.current) return;
    const { pointerX, pointerY, originX, originY } = drag.current;
    setPosition(clampPosition({
      x: originX + event.clientX - pointerX,
      y: originY + event.clientY - pointerY,
    }));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const close = () => {
    drag.current = null;
    setMinimized(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <>
      {minimized && <div className="fixed bottom-[70px] right-3 z-[2147482500] flex items-center gap-1 rounded-xl border border-cyan-200/20 bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={() => setMinimized(false)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10">
          <ShieldCheck size={15} className="text-cyan-200" /> Admin Panel
        </button>
        <button type="button" aria-label="Close Admin Panel" title="Close" onClick={close} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
          <X size={15} />
        </button>
      </div>}
      <section
      role="dialog"
      aria-label="Admin Panel floating window"
      className="fixed flex flex-col overflow-hidden rounded-2xl border border-cyan-200/20 bg-slate-950 text-white shadow-[0_24px_100px_rgba(0,0,0,.65)]"
      style={{
        left: position.x,
        top: position.y,
        width: 'min(900px, calc(100vw - 24px))',
        height: 'min(680px, calc(100dvh - 88px))',
        minWidth: 280,
        minHeight: 240,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 88px)',
        resize: 'both',
        display: minimized ? 'none' : 'flex',
        zIndex: 2147482500,
      }}
    >
      <header
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex shrink-0 touch-none select-none items-center justify-between gap-3 border-b border-white/10 bg-slate-900/95 px-3 py-2.5 cursor-grab active:cursor-grabbing"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-200/10 text-cyan-100"><ShieldCheck size={17} /></span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Admin Panel</div>
            <div className="truncate text-[10px] text-white/40">DOGEUB · Floating app window</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Minimize Admin Panel" title="Minimize" onClick={() => setMinimized(true)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><Minus size={16} /></button>
          <button type="button" aria-label="Close Admin Panel" title="Close" onClick={close} className="rounded-lg p-2 text-white/60 hover:bg-rose-400/15 hover:text-rose-100"><X size={16} /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-950">
        <AdminPanel />
      </div>
    </section>
    </>
  );
}
