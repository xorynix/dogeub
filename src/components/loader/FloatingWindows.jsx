import { useEffect, useRef, useState } from 'react';
import { AppWindow, X, Minus, Plus, RotateCw, ExternalLink, LayoutGrid, Save, FolderOpen } from 'lucide-react';
import { process } from '/src/utils/hooks/loader/utils';
import { useOptions } from '/src/utils/optionsContext';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';

const makeWindow = (title = 'New Window', url = 'https://www.bing.com') => ({
  id: crypto.randomUUID(),
  title,
  minimized: false,
  input: url,
  url: process(url, false, 'auto', 'https://www.bing.com/search?q=') || url,
  x: 48 + Math.round(Math.random() * 80),
  y: 70 + Math.round(Math.random() * 70),
  width: 620,
  height: 430,
  z: Date.now(),
});

export default function FloatingWindows() {
  const { options } = useOptions();
  const activeTab = loaderStore((state) => state.tabs.find((tab) => tab.active));
  const tabCount = loaderStore((state) => state.tabs.length);
  const addTab = loaderStore((state) => state.addTab);
  const removeTab = loaderStore((state) => state.removeTab);
  const setActive = loaderStore((state) => state.setActive);
  const setLastActive = loaderStore((state) => state.setLastActive);

  const [windows, setWindows] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('dogeub-floating-windows') || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.slice(0, 8).map((item, index) => ({
        ...item,
        id: crypto.randomUUID(),
        minimized: Boolean(item.minimized),
        x: Math.max(0, Math.min(window.innerWidth - 300, Number(item.x) || 48)),
        y: Math.max(0, Math.min(window.innerHeight - 220, Number(item.y) || 70)),
        width: Math.max(300, Math.min(window.innerWidth * 0.95, Number(item.width) || 620)),
        height: Math.max(220, Math.min(window.innerHeight * 0.9, Number(item.height) || 430)),
        z: 20 + index,
      }));
    } catch { return []; }
  });
  const [nextZ, setNextZ] = useState(10);
  const [snapMenu, setSnapMenu] = useState(null);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('dogeub-floating-windows') || '[]');
      setHasSavedSession(Array.isArray(saved) && saved.length > 0);
    } catch { setHasSavedSession(false); }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('dogeub-floating-windows', JSON.stringify(windows.map(({ id, ...item }) => item)));
      setHasSavedSession(windows.length > 0);
    } catch {}
  }, [windows]);

  const saveSession = () => {
    try {
      window.localStorage.setItem('dogeub-floating-windows', JSON.stringify(windows.map(({ id, ...item }) => item)));
      setHasSavedSession(windows.length > 0);
    } catch { window.alert('Could not save these windows in browser storage.'); }
  };

  const restoreSession = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('dogeub-floating-windows') || '[]');
      if (!Array.isArray(saved) || !saved.length) return;
      const restored = saved.slice(0, 8).map((item, index) => ({
        ...item,
        id: crypto.randomUUID(),
        minimized: false,
        x: Math.max(0, Math.min(window.innerWidth - 300, Number(item.x) || 48)),
        y: Math.max(0, Math.min(window.innerHeight - 220, Number(item.y) || 70)),
        width: Math.max(300, Math.min(window.innerWidth * 0.95, Number(item.width) || 620)),
        height: Math.max(220, Math.min(window.innerHeight * 0.9, Number(item.height) || 430)),
        z: 20 + index,
      }));
      setWindows(restored);
      setNextZ(20 + restored.length);
    } catch { window.alert('Could not restore the saved floating windows.'); }
  };

  const snapWindow = (item, layout) => {
    const w = window.innerWidth;
    const h = window.innerHeight - 72;
    const layouts = {
      left: { x: 0, y: 0, width: Math.floor(w / 2), height: h },
      right: { x: Math.floor(w / 2), y: 0, width: Math.ceil(w / 2), height: h },
      topLeft: { x: 0, y: 0, width: Math.floor(w / 2), height: Math.floor(h / 2) },
      topRight: { x: Math.floor(w / 2), y: 0, width: Math.ceil(w / 2), height: Math.floor(h / 2) },
      bottomLeft: { x: 0, y: Math.floor(h / 2), width: Math.floor(w / 2), height: Math.ceil(h / 2) },
      bottomRight: { x: Math.floor(w / 2), y: Math.floor(h / 2), width: Math.ceil(w / 2), height: Math.ceil(h / 2) },
      maximize: { x: 0, y: 0, width: w, height: h },
    };
    update(item.id, layouts[layout]);
    setSnapMenu(null);
  };

  const focusWindow = (id) => {
    const z = nextZ + 1;
    setNextZ(z);
    setWindows((items) => items.map((item) => item.id === id ? { ...item, z, minimized: false } : item));
  };
  const closeSourceTab = () => {
    if (!activeTab?.id) return;

    if (tabCount > 1) {
      // Keep the neighboring tab selected before removing the tab moved to the floating window.
      setLastActive(activeTab.id);
      removeTab(activeTab.id);
      return;
    }

    // The tab strip must always have a tab, so replace the last tab with a fresh New Tab.
    const replacementId = crypto.randomUUID();
    addTab({ title: 'New Tab', id: replacementId, url: 'tabs://new' });
    setActive(replacementId);
    removeTab(activeTab.id);
  };

  const addWindow = (url = 'https://www.bing.com', title) => {
    if (windows.length >= 8) return;
    const item = makeWindow(title || (url.includes('bing.com') ? 'Bing' : 'New Window'), url);
    item.z = nextZ + 1;
    setNextZ(item.z);
    // Move the active browser tab's page into the floating window, then close its source tab.
    setWindows([item]);
    try {
      window.dispatchEvent(new CustomEvent('dogeub-portal-transition', {
        detail: { x: item.x + item.width / 2, y: item.y + item.height / 2 },
      }));
    } catch {}
    closeSourceTab();
  };
  const update = (id, patch) => setWindows((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const navigate = (item) => {
    const raw = item.input.trim();
    if (!raw) return;
    const next = process(raw, false, options.prType || 'auto', options.engine || 'https://www.bing.com/search?q=');
    if (next) {
      try {
        window.dispatchEvent(new CustomEvent('dogeub-portal-transition', {
          detail: { x: item.x + item.width / 2, y: item.y + item.height / 2 },
        }));
      } catch {}
      update(item.id, { url: next, title: raw.startsWith('http') ? new URL(raw).hostname : raw });
    }
  };

  const beginDrag = (e, item) => {
    if (e.target.closest('button, input')) return;
    focusWindow(item.id);
    drag.current = { id: item.id, x: e.clientX, y: e.clientY, left: item.x, top: item.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    update(d.id, {
      x: Math.max(0, Math.min(window.innerWidth - 120, d.left + e.clientX - d.x)),
      y: Math.max(0, Math.min(window.innerHeight - 80, d.top + e.clientY - d.y)),
    });
  };

  return (
    <>
      <div className="fixed bottom-[4.5rem] right-4 z-[10000] flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const currentUrl = activeTab?.url && activeTab.url !== 'tabs://new'
              ? process(activeTab.url, true, options.prType || 'auto', options.engine || 'https://www.bing.com/search?q=')
              : 'https://www.bing.com';
            const currentTitle = activeTab?.url && activeTab.url !== 'tabs://new'
              ? (activeTab.title && activeTab.title !== 'New Tab' ? activeTab.title : 'Current Page')
              : 'Bing';
            addWindow(currentUrl || 'https://www.bing.com', currentTitle);
          }}
          disabled={windows.length >= 8}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#10243b] px-4 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-[#193b5c] disabled:opacity-50"
          title="Open a floating browser window"
        >
          <AppWindow size={17} /> Floating Windows <Plus size={15} />
          {windows.length > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{windows.length}/8</span>}
        </button>
        <button type="button" onClick={saveSession} disabled={!windows.length} title="Save floating windows" className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#10243b] px-3 py-3 text-xs font-semibold text-white hover:bg-[#193b5c] disabled:opacity-50"><Save size={15} /> Save</button>
        <button type="button" onClick={restoreSession} disabled={!hasSavedSession} title="Restore saved floating windows" className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#10243b] px-3 py-3 text-xs font-semibold text-white hover:bg-[#193b5c] disabled:opacity-50"><FolderOpen size={15} /> Restore</button>
      </div>
      {windows.length > 0 && (
        <div className="fixed bottom-[4.5rem] left-1/2 z-[10000] flex max-w-[70vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-[#101a2a]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl">
          {windows.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.minimized ? `Restore ${item.title}` : `Minimize ${item.title}`}
              onClick={() => item.minimized ? focusWindow(item.id) : setWindows((items) => items.map((w) => w.id === item.id ? { ...w, minimized: true } : w))}
              className={`flex max-w-44 min-w-24 items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors hover:bg-white/10 ${item.minimized ? 'opacity-70' : 'bg-white/10'}`}
            >
              <AppWindow size={14} className="shrink-0" />
              <span className="truncate">{item.title}</span>
            </button>
          ))}
        </div>
      )}
      {windows.map((item) => (
        <section
          key={item.id}
          onPointerDown={() => focusWindow(item.id)}
          className="fixed z-[10001] flex flex-col overflow-hidden rounded-xl border border-white/20 bg-[#0b1220] text-white shadow-2xl"
          style={{ left: item.x, top: item.y, width: item.width, height: item.height, display: item.minimized ? 'none' : 'flex', zIndex: item.z + 10001, resize: 'both', minWidth: 300, minHeight: 220, maxWidth: '95vw', maxHeight: '90vh' }}
        >
          <header
            onPointerDown={(e) => beginDrag(e, item)}
            onPointerMove={moveDrag}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            className="flex min-h-10 cursor-move items-center gap-2 border-b border-white/10 bg-[#13243a] px-3"
          >
            <AppWindow size={15} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.title}</span>
<button title="Snap layouts" className="relative rounded p-1 hover:bg-white/10" onClick={() => setSnapMenu((id) => id === item.id ? null : item.id)}><LayoutGrid size={14} /></button>
            {snapMenu === item.id && <div className="absolute right-20 top-9 z-[12000] w-44 rounded-xl border border-white/15 bg-[#172033] p-2 shadow-2xl"><div className="mb-2 text-[10px] font-semibold text-white/60">Snap layout</div><div className="grid grid-cols-2 gap-1">{[['left','Left half'],['right','Right half'],['topLeft','Top left'],['topRight','Top right'],['bottomLeft','Bottom left'],['bottomRight','Bottom right'],['maximize','Maximize']].map(([layout,label]) => <button key={layout} onClick={() => snapWindow(item, layout)} className="rounded-md border border-white/15 bg-white/5 px-2 py-2 text-[10px] hover:bg-sky-500/30">{label}</button>)}</div></div>}
            <button title="Minimize window" className="rounded p-1 hover:bg-white/10" onClick={() => setWindows((items) => items.map((w) => w.id === item.id ? { ...w, minimized: true } : w))}><Minus size={14} /></button>
            <button title="Open in a new browser tab" className="rounded p-1 hover:bg-white/10" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} /></button>
            <button title="Close window" className="rounded p-1 hover:bg-red-500/70" onClick={() => setWindows((items) => items.filter((w) => w.id !== item.id))}><X size={15} /></button>
          </header>
          <form
            className="flex shrink-0 items-center gap-1 border-b border-white/10 bg-[#0d1929] p-2"
            onSubmit={(e) => { e.preventDefault(); navigate(item); }}
          >
            <input
              aria-label="Address or search"
              value={item.input}
              onChange={(e) => update(item.id, { input: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#070d16] px-2 py-1.5 text-xs outline-none focus:border-blue-400"
              placeholder="Search Bing or enter a URL"
            />
            <button type="submit" title="Go" className="rounded-md bg-blue-600 px-2 py-1.5 text-xs hover:bg-blue-500">Go</button>
            <button type="button" title="Reload" className="rounded-md p-1.5 hover:bg-white/10" onClick={() => update(item.id, { url: item.url + (item.url.includes('?') ? '&' : '?') + '_refresh=' + Date.now() })}><RotateCw size={14} /></button>
          </form>
          <iframe
            title={item.title}
            src={item.url}
            className="min-h-0 flex-1 border-0 bg-white"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
            allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          />
        </section>
      ))}
    </>
  );
}
