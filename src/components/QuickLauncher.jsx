import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowRight,
  Compass,
  Gamepad2,
  Globe,
  Home,
  Keyboard,
  MessagesSquare,
  FileText,
  Table2,
  Presentation,
  Monitor,
  UsersRound,
  Search,
  Settings,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';

const ITEMS = [
  { name: 'Home', detail: 'Return to the DOGEUB dashboard', icon: Home, run: (navigate) => navigate('/') },
  { name: 'Search the web', detail: 'Search the web or open a URL', icon: Globe, run: (navigate, query) => navigate('/search', { state: { url: /^https?:\/\//i.test(query) ? query : 'https://www.bing.com/search?q=' + encodeURIComponent(query || '') } }) },
  { name: 'Recommended', detail: 'Discover recommended sites and tools', icon: Compass, run: (navigate) => navigate('/recommended') },
  { name: 'Doge Messages', detail: 'Global chat and private messages', icon: MessagesSquare, run: (navigate) => navigate('/messages') },
  { name: 'Remote Desktop', detail: 'Screen sharing and device connection setup', icon: Monitor, run: (navigate) => navigate('/remote-desktop') },
  { name: 'Collaboration Center', detail: 'Project workspaces, notes, and team links', icon: UsersRound, run: (navigate) => navigate('/collaboration-center') },
  { name: 'Admin Panel', detail: 'Open the DOGEUB administrator control center', icon: ShieldCheck, run: () => window.dispatchEvent(new Event('dogeub-open-admin-panel')) },
  { name: 'Apps & games', detail: 'Browse the app catalog', icon: AppWindow, run: (navigate) => navigate('/materials') },
  { name: 'DOGEUB Writer', detail: 'Create or import Word documents', icon: FileText, run: (navigate) => navigate('/office/word') },
  { name: 'DOGEUB Sheets', detail: 'Create or import spreadsheets', icon: Table2, run: (navigate) => navigate('/office/sheet') },
  { name: 'DOGEUB Slides', detail: 'Create or import presentations', icon: Presentation, run: (navigate) => navigate('/office/slides') },
  { name: 'Most played games', detail: 'Open the game catalog', icon: Gamepad2, run: (navigate) => navigate('/docs') },
  { name: 'Most visited sites', detail: 'Return to the dashboard activity widgets', icon: Home, run: (navigate) => navigate('/') },
  { name: 'Settings', detail: 'Customize DOGEUB', icon: Settings, run: (navigate) => navigate('/settings') },
  { name: 'Shortcuts', detail: 'View keyboard shortcuts', icon: Keyboard, run: (navigate) => navigate('/shortcuts') },
];

const wrapIndex = (index, length) => ((index % length) + length) % length;
const pointerAngle = (event, rect) => Math.atan2(
  event.clientY - (rect.top + rect.height / 2),
  event.clientX - (rect.left + rect.width / 2),
) * (180 / Math.PI);

export default function QuickLauncher() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rotation, setRotation] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [orbitRadius, setOrbitRadius] = useState(() => Math.min(150, Math.max(94, window.innerWidth * 0.44 - 36)));
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dogeub-recent-tools') || '[]'); } catch { return []; }
  });
  const input = useRef(null);
  const wheel = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
        || (event.altKey && event.code === 'Space')
        || (event.ctrlKey && event.shiftKey && event.code === 'KeyP')) {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery('');
        setRotation(0);
        setSelectedIndex(0);
      } else if (event.key === 'Escape') {
        setOpen(false);
        setIsDragging(false);
        drag.current = null;
      }
    };
    const onOpen = () => {
      setOpen(true);
      setQuery('');
      setRotation(0);
      setSelectedIndex(0);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('dogeub-open-quick-launcher', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dogeub-open-quick-launcher', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const resize = () => setOrbitRadius(Math.min(150, Math.max(94, window.innerWidth * 0.44 - 36)));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const matches = useMemo(() => ITEMS
    .filter((item) => (item.name + ' ' + item.detail).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      if (query.trim()) return 0;
      const ai = recent.indexOf(a.name);
      const bi = recent.indexOf(b.name);
      if (ai < 0 && bi < 0) return 0;
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    }), [query, recent]);

  const activeIndex = matches.length ? wrapIndex(selectedIndex, matches.length) : 0;
  const activeItem = matches[activeIndex];
  const spacing = 360 / Math.max(matches.length, 1);

  const choose = (index, rotate = true) => {
    if (!matches.length) return;
    const next = wrapIndex(index, matches.length);
    setSelectedIndex(next);
    if (rotate) setRotation(-next * spacing);
  };

  const launch = (item) => {
    try {
      const previous = JSON.parse(localStorage.getItem('dogeub-recent-tools') || '[]');
      const nextRecent = [item.name, ...previous.filter((name) => name !== item.name)].slice(0, 6);
      localStorage.setItem('dogeub-recent-tools', JSON.stringify(nextRecent));
      setRecent(nextRecent);
    } catch {}
    setOpen(false);
    setIsDragging(false);
    drag.current = null;
    item.run(navigate, query.trim());
  };

  const launchSelected = () => {
    if (activeItem) {
      launch(activeItem);
      return;
    }
    setOpen(false);
    ITEMS[1].run(navigate, query.trim());
  };

  const beginRotate = (event) => {
    if (event.button !== 0 || event.target.closest('button, input')) return;
    if (!wheel.current) return;
    const angle = pointerAngle(event, wheel.current.getBoundingClientRect());
    drag.current = { startAngle: angle, startRotation: rotation, rotation };
    setIsDragging(true);
    wheel.current.setPointerCapture(event.pointerId);
  };

  const rotateWheel = (event) => {
    if (!drag.current || !wheel.current) return;
    const angle = pointerAngle(event, wheel.current.getBoundingClientRect());
    let delta = angle - drag.current.startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const nextRotation = drag.current.startRotation + delta;
    drag.current.rotation = nextRotation;
    setRotation(nextRotation);
  };

  const endRotate = () => {
    if (!drag.current) return;
    const finalRotation = drag.current.rotation;
    drag.current = null;
    setIsDragging(false);
    if (!matches.length) return;
    const nearest = wrapIndex(Math.round(-finalRotation / spacing), matches.length);
    setSelectedIndex(nearest);
    setRotation(-nearest * spacing);
  };

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' || (event.key === 'ArrowRight' && !query)) {
      event.preventDefault();
      choose(activeIndex + 1);
    } else if (event.key === 'ArrowUp' || (event.key === 'ArrowLeft' && !query)) {
      event.preventDefault();
      choose(activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeItem) launch(activeItem);
      else launchSelected();
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open Orbit Launcher"
          title="Orbit Launcher (Ctrl + K)"
          onClick={() => { setOpen(true); setQuery(''); setRotation(0); setSelectedIndex(0); }}
          className="fixed bottom-20 right-4 z-[12000] flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),rgba(255,255,255,0.08)_45%,rgba(8,18,37,0.82)_100%)] text-cyan-100 shadow-[0_10px_40px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl transition duration-300 hover:scale-105 hover:border-cyan-100/60 motion-reduce:transition-none"
        >
          <Sparkles size={21} />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[13000] flex flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_50%_45%,rgba(20,103,147,0.25),rgba(4,9,24,0.83)_58%,rgba(2,4,12,0.96)_100%)] px-3 py-5 text-white backdrop-blur-xl sm:px-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute left-[18%] top-[19%] h-48 w-48 rounded-full bg-cyan-400/[.09] blur-[85px]" />
            <div className="absolute bottom-[13%] right-[16%] h-56 w-56 rounded-full bg-blue-500/[.10] blur-[100px]" />
            <div className="absolute left-1/2 top-1/2 h-[min(84vw,32rem)] w-[min(84vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.045]" />
          </div>

          <section role="dialog" aria-modal="true" aria-label="Orbit Launcher" className="relative z-10 flex w-full max-w-2xl flex-col items-center">
            <header className="mb-2 flex w-full items-center justify-between px-1 sm:mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/[.09] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-2xl">
                  <Sparkles size={19} />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-[0.22em] text-white/90">ORBIT LAUNCHER</h1>
                  <p className="mt-0.5 text-[10px] tracking-wide text-white/40">A new way around DOGEUB</p>
                </div>
              </div>
              <button type="button" aria-label="Close Orbit Launcher" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[.06] text-white/60 backdrop-blur-xl transition hover:bg-white/15 hover:text-white">
                <X size={17} />
              </button>
            </header>

            <div
              ref={wheel}
              className={'relative aspect-square w-[min(88vw,410px)] touch-none select-none ' + (isDragging ? 'cursor-grabbing' : 'cursor-grab')}
              onPointerDown={beginRotate}
              onPointerMove={rotateWheel}
              onPointerUp={endRotate}
              onPointerCancel={endRotate}
              aria-label="Rotating option wheel. Drag to rotate; use arrow keys to select."
            >
              <div className="pointer-events-none absolute inset-[4%] rounded-full border border-white/[.12] shadow-[inset_0_0_36px_rgba(148,220,255,0.035)]" />
              <div className="pointer-events-none absolute inset-[13%] rounded-full border border-dashed border-cyan-100/[.16]" />
              <div className="pointer-events-none absolute inset-[22%] rounded-full border border-white/[.08]" />
              <div className="pointer-events-none absolute left-1/2 top-[4%] h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.95)]" />
              <div
                className={'absolute inset-0 ' + (isDragging ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none')}
                style={{ transform: 'rotate(' + rotation + 'deg)' }}
              >
                {matches.map((item, index) => {
                  const Icon = item.icon;
                  const angle = -90 + index * spacing;
                  const radians = angle * (Math.PI / 180);
                  const x = Math.cos(radians) * orbitRadius;
                  const y = Math.sin(radians) * orbitRadius;
                  const selected = index === activeIndex;
                  const selectedClass = 'scale-110 border-cyan-100/70 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.38),rgba(103,232,249,0.18)_45%,rgba(10,22,47,0.8)_100%)] shadow-[0_0_32px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.42)]';
                  const idleClass = 'border-white/20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),rgba(255,255,255,0.07)_48%,rgba(9,19,39,0.78)_100%)] hover:border-white/45 hover:bg-white/15';
                  return (
                    <button
                      type="button"
                      key={item.name}
                      aria-label={item.name + ': ' + item.detail}
                      aria-pressed={selected}
                      title={item.name + ' — ' + item.detail}
                      onPointerEnter={() => choose(index, false)}
                      onFocus={() => choose(index, false)}
                      onClick={() => launch(item)}
                      className={'absolute flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1.15rem] border text-white shadow-[0_10px_35px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-2xl transition duration-300 sm:h-[3.65rem] sm:w-[3.65rem] ' + (selected ? selectedClass : idleClass)}
                      style={{ left: 'calc(50% + ' + x + 'px)', top: 'calc(50% + ' + y + 'px)', transform: 'translate(-50%, -50%)' }}
                    >
                      <span className="pointer-events-none flex flex-col items-center justify-center" style={{ transform: 'rotate(' + (-rotation) + 'deg)' }}>
                        <Icon size={21} strokeWidth={1.7} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[8.3rem] w-[8.3rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.20),rgba(255,255,255,0.07)_46%,rgba(3,10,27,0.78)_100%)] shadow-[0_0_65px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-3xl sm:h-[9rem] sm:w-[9rem]">
                <div className="absolute inset-2 rounded-full border border-white/[.07]" />
                {activeItem ? (() => {
                  const Icon = activeItem.icon;
                  return (
                    <div className="relative flex max-w-[7.2rem] flex-col items-center text-center sm:max-w-[7.7rem]">
                      <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100/[.13] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                        <Icon size={17} />
                      </div>
                      <span className="max-w-full text-[11px] font-semibold leading-tight">{activeItem.name}</span>
                      <span className="mt-1 text-[8px] tracking-[0.14em] text-white/40">ENTER TO OPEN</span>
                    </div>
                  );
                })() : (
                  <div className="relative flex flex-col items-center text-center">
                    <Search size={21} className="mb-2 text-cyan-100" />
                    <span className="text-[11px] font-semibold">Search the web</span>
                    <span className="mt-1 text-[8px] tracking-wider text-white/40">PRESS ENTER</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-1 flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/20 bg-white/[.075] p-3 shadow-[0_16px_60px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl sm:mt-3 sm:p-4">
              <Search size={18} className="shrink-0 text-cyan-100/80" />
              <input
                ref={input}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); setRotation(0); }}
                onKeyDown={onSearchKeyDown}
                placeholder="Find a destination or type a web search…"
                aria-label="Find an Orbit Launcher option or search the web"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
              <kbd className="hidden rounded-lg border border-white/10 bg-white/[.07] px-2 py-1 text-[10px] text-white/50 sm:inline-flex">ESC</kbd>
              <button type="button" onClick={launchSelected} aria-label="Launch selected option" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[.12] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-cyan-100/20">
                <ArrowRight size={17} />
              </button>
            </div>

            <footer className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-white/35">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200/80" /> DRAG TO ROTATE</span>
              <span>← → SELECT</span>
              <span>ENTER OPEN</span>
              <span>CTRL K TO TOGGLE</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
