import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  Files,
  Gamepad2,
  Globe,
  MessagesSquare,
  Search,
  Settings,
  Sparkles,
  Compass,
  LayoutDashboard,
  Wrench,
  Cpu,
  Library,
  GraduationCap,
  Users,
  X,
} from 'lucide-react';
import loaderStore from '../utils/hooks/loader/useLoaderStore';

const SECTIONS = [
  { id: 'apps', name: 'Apps', detail: 'Browse the apps section', icon: AppWindow, path: '/materials' },
  { id: 'games', name: 'Games', detail: 'Open the games catalog', icon: Gamepad2, path: '/docs' },
  { id: 'recommended', name: 'Recommended', detail: 'Discover recommended sites and tools', icon: Compass, path: '/recommended' },
  { id: 'files', name: 'Files', detail: 'Open your DOGEUB file manager', icon: Files, path: '/files' },
  { id: 'settings', name: 'Settings', detail: 'Customize DOGEUB', icon: Settings, path: '/settings' },
  { id: 'messages', name: 'Messages', detail: 'Global chat and private conversations', icon: MessagesSquare, path: '/messages' },
  { id: 'dashboard-studio', name: 'Dashboard Studio', detail: 'Customize and rearrange your DOGEUB dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'toolbox', name: 'Toolbox', detail: 'Text, JSON, color, QR, and image tools', icon: Wrench, path: '/toolbox' },
  { id: 'pc-center', name: 'PC Center', detail: 'Device snapshot and hardware explorer', icon: Cpu, path: '/pc-center' },
  { id: 'game-library', name: 'Game Library', detail: 'Organize favorites and game shortcuts', icon: Library, path: '/game-library' },
  { id: 'student-center', name: 'Student Center', detail: 'Homework planner, focus timer, and flashcards', icon: GraduationCap, path: '/student-center' },
  { id: 'social-center', name: 'Social Center', detail: 'Friends, profile, presence, and notifications', icon: Users, path: '/social' },
  { id: 'browser-tabs', name: 'Browser Tabs', detail: 'Open the built-in browser and keep your tabs', icon: Globe, path: '/search', preserveBrowserTabs: true },
];

const normalizeIndex = (index, length) => length ? ((index % length) + length) % length : 0;

export default function SectionSwitcher() {
  const navigate = useNavigate();
  const tabs = loaderStore((state) => state.tabs);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInput = useRef(null);

  const items = useMemo(() => {
    const sectionItems = SECTIONS.map((section) => ({ ...section, kind: 'section' }));
    const tabItems = (tabs || []).map((tab, index) => ({
      id: 'browser-tab-' + tab.id,
      name: tab.title || (tab.url === 'tabs://new' ? 'New Tab' : tab.url) || 'Untitled tab',
      detail: (tab.active ? 'Current tab · ' : 'Browser tab · ') + (tab.url || 'New Tab'),
      icon: Globe,
      kind: 'tab',
      tabId: tab.id,
      path: '/search',
      preserveBrowserTabs: true,
      order: index,
      active: Boolean(tab.active),
    }));
    return [...sectionItems, ...tabItems];
  }, [tabs]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => (item.name + ' ' + item.detail).toLowerCase().includes(term));
  }, [items, query]);

  const activeIndex = normalizeIndex(selectedIndex, matches.length);
  const activeItem = matches[activeIndex];

  const openItem = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
    if (item.kind === 'tab') {
      navigate('/search', { state: { dogeubSectionSwitcher: true, browserTabId: item.tabId } });
      return;
    }
    navigate(item.path, {
      state: item.preserveBrowserTabs ? { dogeubSectionSwitcher: true } : undefined,
    });
  }, [navigate]);

  useEffect(() => {
    if (open) searchInput.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isShortcut = event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey
        && (event.code === 'KeyC' || event.key.toLowerCase() === 'c');

      if (isShortcut) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        setQuery('');
        setSelectedIndex(0);
        return;
      }

      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex((index) => normalizeIndex(index + 1, matches.length));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex((index) => normalizeIndex(index - 1, matches.length));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openItem(matches[activeIndex]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, matches, activeIndex, openItem]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[15000] flex items-center justify-center overflow-y-auto bg-slate-950/75 px-3 py-8 text-white backdrop-blur-xl sm:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[18%] top-[15%] h-56 w-56 rounded-full bg-cyan-400/[.12] blur-[100px]" />
        <div className="absolute bottom-[10%] right-[14%] h-64 w-64 rounded-full bg-violet-500/[.12] blur-[110px]" />
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-label="DOGEUB section switcher"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950/75 shadow-[0_30px_120px_rgba(0,0,0,0.6),0_0_60px_rgba(34,211,238,0.08)] backdrop-blur-3xl"
      >
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/25 bg-cyan-200/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold tracking-[0.2em] text-white/90">SECTION SWITCHER</h2>
            <p className="mt-1 text-xs text-white/45">Jump between DOGEUB spaces or directly to a browser tab.</p>
          </div>
          <kbd className="hidden rounded-lg border border-white/10 bg-white/[.06] px-2 py-1 text-[10px] text-white/50 sm:inline-flex">ALT + SHIFT + C</kbd>
          <button
            type="button"
            aria-label="Close section switcher"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </header>

        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-3 py-3 focus-within:border-cyan-100/40 focus-within:bg-white/[.07]">
            <Search size={17} className="shrink-0 text-cyan-100/70" />
            <input
              ref={searchInput}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }}
              placeholder="Search sections or browser tabs…"
              aria-label="Search sections and browser tabs"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
            />
            <span className="hidden items-center gap-1 text-[10px] text-white/35 sm:flex"><ArrowUp size={12} /><ArrowDown size={12} /> navigate</span>
          </label>
        </div>

        <div className="max-h-[min(55vh,28rem)] overflow-y-auto p-3 sm:p-4">
          {matches.length ? (
            <div className="space-y-1.5">
              {matches.map((item, index) => {
                const Icon = item.icon;
                const selected = index === activeIndex;
                return (
                  <button
                    key={item.id || item.tabId}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => openItem(item)}
                    aria-current={item.kind === 'tab' && item.active ? 'true' : undefined}
                    className={'group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-150 ' + (selected
                      ? 'border-cyan-100/35 bg-cyan-100/[.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(34,211,238,0.06)]'
                      : 'border-transparent bg-white/[.025] hover:border-white/10 hover:bg-white/[.055]')}
                  >
                    <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ' + (selected ? 'border-cyan-100/25 bg-cyan-100/10 text-cyan-100' : 'border-white/10 bg-white/[.04] text-white/60')}>
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white/90">{item.name}</span>
                        {item.kind === 'tab' && item.active && <span className="shrink-0 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-100/80">Active</span>}
                        {item.kind === 'section' && item.id === 'browser-tabs' && <span className="shrink-0 rounded-full border border-white/10 bg-white/[.05] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/45">{tabs.length} tabs</span>}
                      </span>
                      <span className="mt-1 block truncate text-xs text-white/45">{item.detail}</span>
                    </span>
                    <span className="hidden shrink-0 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/35 group-hover:text-white/60 sm:inline-flex">{selected ? 'ENTER' : item.kind === 'tab' ? 'TAB' : 'OPEN'}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <Search size={24} className="mx-auto mb-3 text-white/25" />
              <p className="text-sm font-medium text-white/70">Nothing found</p>
              <p className="mt-1 text-xs text-white/40">Try another section name or tab title.</p>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3 text-[10px] tracking-wide text-white/40 sm:px-6">
          <span>ALT + SHIFT + C TO TOGGLE</span>
          <span className="inline-flex items-center gap-3"><span>↑ ↓ SELECT</span><span>ENTER OPEN</span><span>ESC CLOSE</span></span>
        </footer>
      </section>
    </div>
  );
}
