import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppWindow, Globe, Search, X, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import './HolographicTabSwitcher.css';

const APP_PAGES = [
  { label: 'Home', path: '/', group: 'Dogeub Pages' },
  { label: 'Apps & Materials', path: '/materials', group: 'Dogeub Pages' },
  { label: 'Games', path: '/docs', group: 'Dogeub Pages' },
  { label: 'Search', path: '/search', group: 'Dogeub Pages' },
  { label: 'Settings', path: '/settings', group: 'Dogeub Pages' },
  { label: 'Recommended', path: '/recommended', group: 'Dogeub Pages' },
  { label: 'Files', path: '/files', group: 'Dogeub Pages' },
  { label: 'Shortcuts', path: '/shortcuts', group: 'Dogeub Pages' },
  { label: 'Messages', path: '/messages', group: 'Dogeub Pages' },
  { label: 'Dashboard Studio', path: '/dashboard', group: 'Dogeub Pages' },
  { label: 'Toolbox', path: '/toolbox', group: 'Dogeub Pages' },
  { label: 'PC Center', path: '/pc-center', group: 'Dogeub Pages' },
  { label: 'Game Library', path: '/game-library', group: 'Dogeub Pages' },
  { label: 'Student Center', path: '/student-center', group: 'Dogeub Pages' },
  { label: 'Social Center', path: '/social', group: 'Dogeub Pages' },
  { label: 'Remote Desktop', path: '/remote-desktop', group: 'Dogeub Pages' },
  { label: 'Collaboration Center', path: '/collaboration-center', group: 'Dogeub Pages' },
];

export default function HolographicTabSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(0);
  const [browserTabs, setBrowserTabs] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const refreshBrowserTabs = useCallback(() => {
    try {
      if (window.dogeubTabBridge?.listTabs) {
        Promise.resolve(window.dogeubTabBridge.listTabs()).then((tabs) => {
          if (Array.isArray(tabs)) setBrowserTabs(tabs.filter(t => t && t.id != null).map(t => ({ id: t.id, label: t.title || t.url || 'Browser tab', url: t.url || '', group: 'Browser Tabs' })));
        }).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    refreshBrowserTabs();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, refreshBrowserTabs]);

  const items = useMemo(() => {
    const all = [...APP_PAGES, ...browserTabs];
    return all.filter(item => (filter === 'All' || item.group === filter) &&
      (item.label.toLowerCase().includes(query.toLowerCase()) || (item.url || '').toLowerCase().includes(query.toLowerCase())));
  }, [browserTabs, filter, query]);

  useEffect(() => { setSelected(0); }, [query, filter]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [selected, items.length]);

  const activate = useCallback((item) => {
    if (!item) return;
    if (item.group === 'Browser Tabs') {
      try { window.dogeubTabBridge?.activateTab?.(item.id); } catch {}
      if (!window.dogeubTabBridge) window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.path !== location.pathname) navigate(item.path);
    setOpen(false);
  }, [location.pathname, navigate]);

  const onListKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(v => Math.min(v + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); activate(items[selected]); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
  };

  if (!open) return null;
  return <div className="dogeub-holo-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
    <section className="dogeub-holo-panel" role="dialog" aria-modal="true" aria-label="Holographic tab switcher" onKeyDown={onListKeyDown}>
      <header className="dogeub-holo-header">
        <div className="dogeub-holo-mark"><AppWindow size={22}/></div>
        <div><div className="dogeub-holo-eyebrow">DOGEUB INTERFACE</div><h2>Tab Switcher</h2></div>
        <button className="dogeub-holo-close" onClick={() => setOpen(false)} aria-label="Close tab switcher"><X size={19}/></button>
      </header>
      <label className="dogeub-holo-search"><Search size={18}/><input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a page or browser tab…" aria-label="Search tabs"/><kbd>CTRL SHIFT K</kbd></label>
      <nav className="dogeub-holo-filters" aria-label="Tab type">
        {['All', 'Browser Tabs', 'Dogeub Pages'].map(name => <button key={name} className={filter === name ? 'active' : ''} onClick={() => setFilter(name)}>{name === 'Browser Tabs' ? <Globe size={14}/> : name === 'Dogeub Pages' ? <AppWindow size={14}/> : null}{name}</button>)}
        <span className="dogeub-holo-count">{items.length} ITEMS</span>
      </nav>
      <div className="dogeub-holo-list" ref={listRef} role="listbox" aria-label="Available tabs">
        {items.length ? items.map((item, index) => <button key={item.group === 'Browser Tabs' ? 'browser-' + item.id : item.path} role="option" aria-selected={selected === index} className={'dogeub-holo-item' + (selected === index ? ' selected' : '')} onMouseEnter={() => setSelected(index)} onClick={() => activate(item)}>
          <span className="dogeub-holo-item-icon">{item.group === 'Browser Tabs' ? <Globe size={17}/> : <AppWindow size={17}/>}</span>
          <span className="dogeub-holo-item-text"><strong>{item.label}</strong><small>{item.group === 'Browser Tabs' ? item.url : item.path}</small></span>
          {item.group !== 'Browser Tabs' && item.path === location.pathname ? <span className="dogeub-holo-current">CURRENT</span> : null}
          {selected === index ? <CornerDownLeft size={16} className="dogeub-holo-enter"/> : null}
        </button>) : <div className="dogeub-holo-empty">No matching tabs. Try another search.</div>}
      </div>
      <footer className="dogeub-holo-footer"><span><kbd><ArrowUp size={11}/></kbd><kbd><ArrowDown size={11}/></kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span><span className="dogeub-holo-browser-note">{browserTabs.length ? 'Browser bridge connected' : 'Browser tabs need the companion extension'}</span></footer>
    </section>
  </div>;
}
