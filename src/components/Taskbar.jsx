import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCachedSpecs, getDeviceSpecs, specsToText } from '../utils/deviceSpecs';
import {
  AppWindow, BatteryFull, FileText, Table2, Presentation, Globe, Home, Search, Settings, BatteryCharging,
  Wifi, WifiOff, Music2, X, Youtube, BookOpen, Grid3X3, Power, ChevronUp, Cpu, LockKeyhole, Sparkles, Smile, FolderOpen, Keyboard, Zap, Command, MessagesSquare, ShieldCheck, Monitor, UsersRound, Compass, Gamepad2, GraduationCap, Wrench, Bell, Layers
} from 'lucide-react';

const apps = [
  { name: 'Home', description: 'DogeUB homepage', icon: Home, path: '/' },
  { name: 'Browser', description: 'Browse the web', icon: Globe, path: '/search' },
  { name: 'YouTube', description: 'Open YouTube', icon: Youtube, url: 'https://www.youtube.com' },
  { name: 'Doge AI', description: 'Your personal AI assistant for DOGEUB', icon: Sparkles, assistant: true },
  { name: 'Apps', description: 'Explore apps and tools', icon: Grid3X3, path: '/materials' },
  { name: 'DOGEUB Office', description: 'Open Writer, Sheets, Slides, and recent files', icon: Grid3X3, path: '/office', startOnly: true },
  { name: 'DOGEUB Writer', description: 'Word documents', icon: FileText, path: '/office/word' },
  { name: 'DOGEUB Sheets', description: 'Spreadsheets and formulas', icon: Table2, path: '/office/sheet' },
  { name: 'DOGEUB Slides', description: 'Presentations', icon: Presentation, path: '/office/slides' },
  { name: 'Docs & Resources', description: 'Games and resources', icon: BookOpen, path: '/docs' },
  { name: 'Recommended', description: 'Discover recommended sites and tools', icon: Compass, path: '/recommended' },
  { name: 'Game Library', description: 'Browse the game library', icon: Gamepad2, path: '/game-library' },
  { name: 'Student Center', description: 'School tools and resources', icon: GraduationCap, path: '/student-center' },
  { name: 'Social Center', description: 'Community and social tools', icon: UsersRound, path: '/social' },
  { name: 'Toolbox', description: 'Utilities and productivity tools', icon: Wrench, path: '/toolbox' },
  { name: 'PC Center', description: 'Device information and PC tools', icon: Cpu, path: '/pc-center' },
  { name: 'Dashboard Studio', description: 'Build and customize your dashboard', icon: Monitor, path: '/dashboard' },
  { name: 'DogeFiler', description: 'Import, organize, preview and export files', icon: FolderOpen, path: '/files' },
  { name: 'Doge Messages', description: 'Global chat and private messages', icon: MessagesSquare, path: '/messages' },
  { name: 'Remote Desktop', description: 'Screen sharing and device connection setup', icon: Monitor, path: '/remote-desktop' },
  { name: 'Collaboration Center', description: 'Project workspaces, notes, and team links', icon: UsersRound, path: '/collaboration-center' },
  { name: 'Doge Shortcuts', description: 'Browse all DogeUB keyboard shortcuts', icon: Keyboard, path: '/shortcuts' },
  { name: 'Settings', description: 'Customize DogeUB', icon: Settings, path: '/settings' },
  { name: 'Emoji & Widgets', description: 'Emoji picker and personal widgets', icon: Smile, widgets: true },
  { name: 'Notification Center', description: 'View and manage notifications', icon: Bell, notificationCenter: true },
  { name: 'HoloSpace', description: 'Switch between Main, School, Games, and Projects', icon: Layers, workspace: true },
  { name: 'Admin Panel', description: 'Administrator control center', icon: ShieldCheck, adminPanel: true },
  { name: 'Quick Launcher', description: 'Search apps with Ctrl + Shift + P', icon: Command, launcher: true },
  { name: 'Doge Hub', description: 'Control center, files, widgets, notes and themes', icon: AppWindow, hub: true },
  { name: 'Doge Nexus', description: 'Workspaces, modes, themes, terminal, and diagnostics', icon: Sparkles, studio: true },
  { name: 'Startup / Shutdown', description: 'Preview the DOGEUB OS power animations', icon: Power, studio: true, tab: 'power' },
];

function readAppLayout() {
  try {
    const version = window.localStorage.getItem('dogeub-app-layout-version');
    if (version !== '2') {
      window.localStorage.setItem('dogeub-app-layout', 'desktop');
      window.localStorage.setItem('dogeub-app-layout-version', '2');
      return 'desktop';
    }
    return window.localStorage.getItem('dogeub-app-layout') || 'desktop';
  } catch { return 'desktop'; }
}

const OS_USERNAME_KEY = 'dogeub-os-username-v1';

function readOSUsername() {
  try { return window.localStorage.getItem(OS_USERNAME_KEY) || ''; } catch { return ''; }
}

function formatClock(date) {
  return {
    time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    date: date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }),
  };
}

export default function Taskbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [startOpen, setStartOpen] = useState(false);
  const [osUsername, setOSUsername] = useState(readOSUsername);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [trayOpen, setTrayOpen] = useState(false);
  const [battery, setBattery] = useState(null);
  const [network, setNetwork] = useState(() => ({ online: navigator.onLine, type: navigator.connection?.effectiveType || 'Unavailable', downlink: navigator.connection?.downlink, rtt: navigator.connection?.rtt, saveData: navigator.connection?.saveData }));
  const [powerConfirm, setPowerConfirm] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specs, setSpecs] = useState(getCachedSpecs);
  const [specsCopied, setSpecsCopied] = useState(false);
  const [gamingMode, setGamingMode] = useState(() => {
    try { return window.localStorage.getItem('dogeub-gaming-mode') === 'true'; } catch { return false; }
  });
  const [fps, setFps] = useState(0);
  const [appLayout, setAppLayout] = useState(readAppLayout);
  useEffect(() => {
    const syncLayout = (event) => {
      if (event?.detail?.layout) { setAppLayout(event.detail.layout); return; }
      setAppLayout(readAppLayout());
    };
    window.addEventListener('dogeub-app-layout-change', syncLayout);
    window.addEventListener('storage', syncLayout);
    return () => {
      window.removeEventListener('dogeub-app-layout-change', syncLayout);
      window.removeEventListener('storage', syncLayout);
    };
  }, []);


  useEffect(() => {
    let frameId;
    let frames = 0;
    let lastSample = performance.now();
    const measure = (timestamp) => {
      frames += 1;
      const elapsed = timestamp - lastSample;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastSample = timestamp;
      }
      frameId = window.requestAnimationFrame(measure);
    };
    frameId = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const style = document.createElement('style');
    style.dataset.dogeubGamingMode = 'true';
    style.textContent = gamingMode
      ? `html.dogeub-gaming-mode *, html.dogeub-gaming-mode *::before, html.dogeub-gaming-mode *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }`
      : '';
    root.classList.toggle('dogeub-gaming-mode', gamingMode);
    document.head.appendChild(style);
    try { window.localStorage.setItem('dogeub-gaming-mode', String(gamingMode)); } catch {}
    window.dispatchEvent(new CustomEvent('dogeub-gaming-mode-change', { detail: { enabled: gamingMode } }));
    return () => {
      root.classList.remove('dogeub-gaming-mode');
      style.remove();
    };
  }, [gamingMode]);

  useEffect(() => {
    if (!specsOpen) return undefined;
    let alive = true;
    getDeviceSpecs().then((rows) => alive && setSpecs(rows)).catch(() => {});
    return () => { alive = false; };
  }, [specsOpen]);

  const copySpecs = async () => {
    if (!specs) return;
    try {
      await navigator.clipboard.writeText(specsToText(specs));
      setSpecsCopied(true);
      window.setTimeout(() => setSpecsCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };
  const [isShutdown, setIsShutdown] = useState(false);
  const [mediaInfo, setMediaInfo] = useState({ title: 'Nothing playing', artist: '', playing: false, hasMedia: false });
  const [startBackground, setStartBackground] = useState(() => {
    try { return window.localStorage.getItem('dogeub-site-background') || ''; } catch { return ''; }
  });

  useEffect(() => {
    const syncIdentity = () => setOSUsername(readOSUsername());
    window.addEventListener('dogeub-identity-change', syncIdentity);
    window.addEventListener('storage', syncIdentity);
    syncIdentity();
    return () => {
      window.removeEventListener('dogeub-identity-change', syncIdentity);
      window.removeEventListener('storage', syncIdentity);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock(new Date())), 15000);
    return () => window.clearInterval(timer);
  }, []);


  useEffect(() => {
    let mounted = true;
    let batteryManager;
    const updateBattery = (manager) => {
      if (mounted) setBattery({ level: Math.round(manager.level * 100), charging: Boolean(manager.charging), chargingTime: manager.chargingTime, dischargingTime: manager.dischargingTime });
    };
    if (typeof navigator.getBattery === 'function') {
      navigator.getBattery().then((manager) => {
        if (!mounted) return;
        batteryManager = manager;
        updateBattery(manager);
        manager.addEventListener('levelchange', () => updateBattery(manager));
        manager.addEventListener('chargingchange', () => updateBattery(manager));
        manager.addEventListener('chargingtimechange', () => updateBattery(manager));
        manager.addEventListener('dischargingtimechange', () => updateBattery(manager));
      }).catch(() => { if (mounted) setBattery(null); });
    }
    const updateNetwork = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      setNetwork({ online: navigator.onLine, type: connection?.effectiveType || 'Unavailable', downlink: connection?.downlink, rtt: connection?.rtt, saveData: connection?.saveData });
    };
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    connection?.addEventListener?.('change', updateNetwork);
    return () => {
      mounted = false;
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      connection?.removeEventListener?.('change', updateNetwork);
    };
  }, []);

  useEffect(() => {
    let browserMedia = null;
    const refreshMedia = () => {
      if (browserMedia) {
        setMediaInfo({ title: browserMedia.title || 'YouTube video', artist: browserMedia.artist || 'Browser media', playing: Boolean(browserMedia.playing), hasMedia: true });
        return;
      }
      const session = navigator.mediaSession;
      const metadata = session?.metadata;
      const media = Array.from(document.querySelectorAll('audio, video')).find((element) => !element.paused && !element.ended) || Array.from(document.querySelectorAll('audio, video')).find((element) => element.currentSrc || element.src);
      let sourceTitle = '';
      if (media?.currentSrc) { try { sourceTitle = new URL(media.currentSrc).pathname.split('/').pop() || 'Media playing'; } catch { sourceTitle = 'Media playing'; } }
      const title = metadata?.title || media?.getAttribute('aria-label') || media?.title || sourceTitle;
      const artist = metadata?.artist || metadata?.album || '';
      setMediaInfo({ title: title || 'Nothing playing', artist, playing: Boolean(media && !media.paused && !media.ended), hasMedia: Boolean(metadata || media) });
    };
    const handleBrowserMedia = (event) => {
      const detail = event.detail;
      if (!detail) return;
      browserMedia = detail.hasMedia ? detail : null;
      if (detail.hasMedia) {
        setMediaInfo({ title: detail.title || 'YouTube video', artist: detail.artist || 'Browser media', playing: Boolean(detail.playing), hasMedia: true });
      } else {
        refreshMedia();
      }
    };
    refreshMedia();
    window.addEventListener('dogeub-browser-media', handleBrowserMedia);
    const timer = window.setInterval(refreshMedia, 1800);
    document.addEventListener('play', refreshMedia, true);
    document.addEventListener('pause', refreshMedia, true);
    document.addEventListener('ended', refreshMedia, true);
    return () => { window.clearInterval(timer); window.removeEventListener('dogeub-browser-media', handleBrowserMedia); document.removeEventListener('play', refreshMedia, true); document.removeEventListener('pause', refreshMedia, true); document.removeEventListener('ended', refreshMedia, true); };
  }, []);
  useEffect(() => {
    setStartOpen(false);
    setSearchOpen(false);
    setTrayOpen(false);
  }, [location.pathname]);

  const handleBackgroundUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      window.alert('Please choose an image smaller than 12 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => window.alert('Could not read that image. Please try another one.');
    reader.onload = () => {
      const source = new Image();
      source.onerror = () => window.alert('That image could not be opened. Please try another one.');
      source.onload = () => {
        const scale = Math.min(1, 1920 / source.width, 1080 / source.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          window.alert('Your browser could not process that image.');
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.82);
        try {
          window.localStorage.setItem('dogeub-site-background', image);
          setStartBackground(image);
          window.dispatchEvent(new Event('dogeub-background-change'));
        } catch {
          window.alert('Could not save this image in browser storage. Try another, smaller image.');
        }
      };
      source.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const clearStartBackground = () => {
    try { window.localStorage.removeItem('dogeub-site-background');
      window.dispatchEvent(new Event('dogeub-background-change')); } catch {}
    setStartBackground('');
  };

  const openApp = (app) => {
    if (app.assistant) {
      window.dispatchEvent(new Event('dogeub-open-assistant'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.widgets) {
      window.dispatchEvent(new Event('dogeub-open-emoji-widgets'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.notificationCenter) {
      window.dispatchEvent(new Event('dogeub-open-notification-center'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.workspace) {
      window.dispatchEvent(new Event('dogeub-open-holospace'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.launcher) {
      window.dispatchEvent(new Event('dogeub-open-quick-launcher'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.adminPanel) {
      window.dispatchEvent(new Event('dogeub-open-admin-panel'));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.studio) {
      window.dispatchEvent(new CustomEvent('dogeub-open-nexus', { detail: { tab: app.tab || 'desktop' } }));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.hub) {
      window.dispatchEvent(new CustomEvent('dogeub-open-hub', { detail: { tab: 'control' } }));
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (app.url) {
      navigate('/search', { state: { url: app.url } });
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    if (location.pathname === app.path) window.dispatchEvent(new Event('dogeub-restore-window'));
    navigate(app.path);
    setStartOpen(false);
    setSearchOpen(false);
  };

  const submitSearch = (event) => {
    event?.preventDefault?.();
    const value = query.trim();
    if (!value) return;
    navigate('/search', {
      state: { url: (value.startsWith('http://') || value.startsWith('https://')) ? value : `https://www.bing.com/search?q=${encodeURIComponent(value)}` },
    });
    setQuery('');
    setStartOpen(false);
    setSearchOpen(false);
  };

  const submitStartSearch = (event) => {
    event?.preventDefault?.();
    const value = query.trim();
    if (!value) return;
    const term = value.toLowerCase();
    const app = apps.find((item) => (item.name + ' ' + item.description).toLowerCase().includes(term));
    if (app) {
      openApp(app);
      setQuery('');
      return;
    }
    const settingsTerms = ['privacy', 'cloak', 'customize', 'theme', 'appearance', 'color', 'browsing', 'search engine', 'advanced', 'cache', 'settings', 'preferences'];
    if (settingsTerms.some((keyword) => keyword.includes(term) || term.includes(keyword))) {
      navigate('/settings');
      setQuery('');
      setStartOpen(false);
      setSearchOpen(false);
      return;
    }
    navigate('/search', { state: { url: `https://www.bing.com/search?q=${encodeURIComponent(value)}` } });
    setQuery('');
    setStartOpen(false);
    setSearchOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-[11002] flex w-max max-w-[calc(100vw-12px)] -translate-x-1/2 items-center gap-2">
        <div className="pointer-events-auto flex min-w-0 max-w-[min(76vw,440px)] items-center gap-2 rounded-full border border-white/10 bg-black/95 px-3 py-2 text-white shadow-lg shadow-black/30 backdrop-blur-xl">
          <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' + (mediaInfo.playing ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/75')}>{mediaInfo.playing ? <Music2 size={15}/> : <span className="text-[10px] font-bold">D</span>}</span>
          <div className="min-w-0 flex-1"><div className="max-w-[120px] truncate text-[11px] font-semibold sm:max-w-[250px]">{mediaInfo.title}</div><div className="max-w-[120px] truncate text-[9px] text-white/50 sm:max-w-[250px]">{mediaInfo.artist || (mediaInfo.playing ? 'Now playing' : mediaInfo.hasMedia ? 'Media paused' : 'DogeUB status')}</div></div>
          <span className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-2" title={network.online ? 'Connected' : 'Offline'}>{network.online ? <Wifi size={14} className="text-emerald-300"/> : <WifiOff size={14} className="text-rose-300"/>}<span className="hidden text-[9px] text-white/60 sm:inline">{network.online ? (network.type !== 'Unavailable' ? network.type.toUpperCase() : 'ONLINE') : 'OFFLINE'}</span></span>
          <span className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-2" title={battery ? String(battery.level) + '%' + (battery.charging ? ', charging' : '') : 'Battery status unavailable'}>{battery ? (battery.charging ? <BatteryCharging size={15} className="text-emerald-300"/> : <BatteryFull size={15}/>) : <BatteryFull size={15} className="text-white/40"/>}<span className="text-[9px] tabular-nums">{battery ? battery.level + '%' : '—'}</span></span>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/95 p-1 text-white shadow-lg shadow-black/30 backdrop-blur-xl">
          <span title="Approximate browser animation frame rate" className="rounded-full px-2 py-1 text-[10px] font-bold tabular-nums text-emerald-300">{fps} FPS</span>
          <button type="button" aria-pressed={gamingMode} title={gamingMode ? 'Turn Gaming Mode off' : 'Turn Gaming Mode on'} onClick={() => setGamingMode((enabled) => !enabled)} className={'rounded-full px-2.5 py-1.5 text-[10px] font-bold transition ' + (gamingMode ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/80 hover:bg-white/20')}><span className="inline-flex items-center gap-1"><Zap size={12}/><span className="hidden sm:inline">Game</span>{gamingMode ? ' ON' : ''}</span></button>
        </div>
      </div>
      {(startOpen || searchOpen || trayOpen || specsOpen || powerConfirm) && (
        <button
          aria-label="Close taskbar panels"
          className="fixed inset-0 z-[10998] cursor-default"
          onClick={() => { setStartOpen(false); setSearchOpen(false); setTrayOpen(false); setSpecsOpen(false); setPowerConfirm(false); }}
        />
      )}

      {startOpen && (
        <section role="dialog" aria-label="Start menu" className="fixed bottom-[4.6rem] left-1/2 z-[10999] flex max-h-[82vh] w-[min(94vw,760px)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#172033]/[.97] p-4 text-white shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Grid3X3 size={17} /> Start</div>
            <span className="text-xs text-white/45">DOGEUB</span>
          </div>
          <form onSubmit={submitStartSearch} className="flex items-center gap-2 rounded-xl border border-sky-300/30 bg-black/25 px-3 py-3 focus-within:border-sky-300/70">
            <Search size={18} className="shrink-0 text-sky-300" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, settings, or the web" aria-label="Search apps, settings, or the web" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40" />
            <kbd className="hidden rounded border border-white/10 px-1.5 py-1 text-[10px] text-white/40 sm:inline">↵</kbd>
          </form>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {!query.trim() ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-white/55">All apps</div>
                  <span className="text-[10px] text-white/35">{apps.length} apps · select to open</span>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5">
                  {apps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.name}
                        type="button"
                        onClick={() => openApp(app)}
                        title={app.description}
                        className="group flex min-h-[82px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-transparent px-2 py-2 text-center transition hover:border-sky-300/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#243a59] text-sky-200 transition group-hover:border-sky-200/30 group-hover:bg-sky-400/15">
                          <Icon size={19} />
                        </span>
                        <span className="max-w-full truncate text-[11px] font-medium sm:text-xs">{app.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const term = query.trim().toLowerCase();
                  const appMatches = apps.filter((app) => (app.name + ' ' + app.description).toLowerCase().includes(term)).slice(0, 10);
                  const settings = [
                    { name: 'All settings', description: 'Open DOGEUB settings', keywords: 'settings customize preferences', path: '/settings' },
                    { name: 'Privacy', description: 'Cloaking and privacy options', keywords: 'privacy title cloak about blank', path: '/settings' },
                    { name: 'Customize', description: 'Themes, colors, and interface', keywords: 'customize theme color appearance ui interface scale', path: '/settings' },
                    { name: 'Browsing', description: 'Browser and search preferences', keywords: 'browsing tabs search engine browser', path: '/settings' },
                    { name: 'Advanced', description: 'Advanced options and cache', keywords: 'advanced debug experimental cache', path: '/settings' },
                  ].filter((item) => (item.name + ' ' + item.description + ' ' + item.keywords).toLowerCase().includes(term)).slice(0, 5);
                  return <>
                    {appMatches.length > 0 && <div className="mb-1 text-xs font-semibold text-white/50">Apps</div>}
                    {appMatches.map((app) => {
                      const Icon = app.icon;
                      return <button key={app.name} type="button" onClick={() => openApp(app)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/10"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#243a59] text-sky-200"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm">{app.name}</span><span className="block truncate text-[11px] text-white/45">{app.description}</span></span><span className="text-xs text-white/30">App</span></button>;
                    })}
                    {settings.length > 0 && <div className="mb-1 mt-3 border-t border-white/10 pt-3 text-xs font-semibold text-white/50">Settings</div>}
                    {settings.map((item) => <button key={item.name} type="button" onClick={() => { navigate(item.path); setStartOpen(false); setSearchOpen(false); setQuery(''); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/10"><Settings size={17} className="shrink-0 text-sky-300" /><span className="min-w-0 flex-1"><span className="block text-sm">{item.name}</span><span className="block truncate text-[11px] text-white/45">{item.description}</span></span><span className="text-xs text-white/30">Setting</span></button>)}
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <button type="button" onClick={() => submitStartSearch()} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-sky-500/15"><Globe size={18} className="shrink-0 text-emerald-300" /><span className="min-w-0 flex-1"><span className="block text-sm">Search the web for “{query.trim()}”</span><span className="block text-[11px] text-white/45">Open Bing web results</span></span><span className="text-xs text-white/30">Web</span></button>
                    </div>
                  </>;
                })()}
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-white/65">
            <button onClick={() => { if (!osUsername) window.dispatchEvent(new Event('dogeub-lock')); }} className="flex min-w-0 items-center gap-2 rounded-lg pr-2 text-left hover:text-white" title={osUsername ? 'DOGEUB OS identity' : 'Set up your DOGEUB OS username'}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/30 font-bold">{(osUsername || 'D')[0]?.toUpperCase()}</span><span className="max-w-32 truncate">{osUsername ? '@' + osUsername : 'Set up username'}</span></button>
            <div className="flex shrink-0 items-center gap-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10"><input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />Wallpaper</label>
              {startBackground && <button onClick={clearStartBackground} title="Remove wallpaper" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><X size={15} /></button>}
              <button title="Lock DOGEUB" aria-label="Lock DOGEUB" onClick={() => { setStartOpen(false); window.dispatchEvent(new Event('dogeub-lock')); }} className="rounded-lg p-2 hover:bg-sky-500/20 hover:text-sky-200"><LockKeyhole size={16} /></button>
              <button title="Power options" aria-label="Power options" onClick={() => { setStartOpen(false); setPowerConfirm(true); }} className="rounded-lg p-2 hover:bg-red-500/25"><Power size={16} /></button>
            </div>
          </div>
        </section>
      )}


      {powerConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="power-confirm-title" className="fixed bottom-[4.6rem] left-1/2 z-[11002] w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#172033]/[.98] p-5 text-white shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-red-500/20 p-2 text-red-300"><Power size={20} /></span><div><h2 id="power-confirm-title" className="text-sm font-semibold">Close DogeUB?</h2><p className="mt-1 text-xs text-white/60">DogeUB will shut down and lock. Your password will be required to unlock it again.</p></div></div>
          <div className="flex justify-end gap-2"><button onClick={() => setPowerConfirm(false)} className="rounded-lg px-3 py-2 text-xs hover:bg-white/10">Cancel</button><button onClick={() => { setPowerConfirm(false); window.dispatchEvent(new CustomEvent('dogeub-open-nexus', { detail: { tab: 'power', preview: 'shutdown' } })); }} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500">Shut down & lock</button></div>
          
        </div>
      )}

      {specsOpen && (
        <div className="fixed bottom-[4.6rem] right-3 z-[10999] max-h-[75vh] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#172033]/95 p-4 text-white shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Cpu size={17} className="text-sky-300" /> Device specs
            <button type="button" onClick={copySpecs} disabled={!specs} className="ml-auto rounded-lg border border-white/15 px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-40">{specsCopied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div className="space-y-2 text-xs">
            {specs ? specs.map((row) => (
              <div key={row.label} className="flex justify-between gap-3"><span className="shrink-0 text-white/55">{row.label}</span><b className="min-w-0 break-words text-right" title={row.value}>{row.value}</b></div>
            )) : <div className="text-white/55">Reading your device…</div>}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-white/45">Browser-reported info only, and it stays on your device. Exact CPU model and total RAM aren't available to websites.</p>
        </div>
      )}

      {searchOpen && (
        <form onSubmit={submitSearch} className="fixed bottom-[4.6rem] left-1/2 z-[10999] flex w-[min(92vw,440px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/15 bg-[#172033]/95 p-3 text-white shadow-2xl backdrop-blur-2xl">
          <Search size={18} className="shrink-0 text-sky-300" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the web or enter a URL" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/45" />
          <button type="submit" className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400">Search</button>
          <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10"><X size={16} /></button>
        </form>
      )}


      {trayOpen && (
        <div className="fixed bottom-[4.6rem] right-3 z-[10999] w-64 rounded-2xl border border-white/15 bg-[#172033]/95 p-4 text-white shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 text-sm font-semibold">Connection & battery</div>
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 font-semibold"><BatteryCharging size={16} className="text-sky-300" /> Battery</div>
              {battery ? <>
                <div className="mb-2 flex items-center justify-between"><span className="text-white/60">Charge</span><b>{battery.level}%{battery.charging ? ' · Charging' : ''}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: battery.level + '%' }} /></div>
                <p className="mt-2 text-[10px] text-white/50">{battery.charging ? (Number.isFinite(battery.chargingTime) && battery.chargingTime > 0 ? 'About ' + Math.round(battery.chargingTime / 60) + ' min until full' : 'Charging status reported by browser') : (Number.isFinite(battery.dischargingTime) && battery.dischargingTime > 0 ? 'About ' + Math.round(battery.dischargingTime / 60) + ' min remaining' : 'Time remaining unavailable')}</p>
              </> : <p className="text-white/55">Live battery data is not supported by this browser or device.</p>}
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Wifi size={16} className={network.online ? 'text-emerald-300' : 'text-red-300'} /> Internet connection</div>
              <div className="flex justify-between gap-3"><span className="text-white/55">Status</span><b className={network.online ? 'text-emerald-300' : 'text-red-300'}>{network.online ? 'Online' : 'Offline'}</b></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-white/55">Connection type</span><b>{network.type}</b></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-white/55">Estimated downlink</span><b>{typeof network.downlink === 'number' ? network.downlink + ' Mbps' : 'Unavailable'}</b></div>
              <div className="mt-1 flex justify-between gap-3"><span className="text-white/55">Estimated latency</span><b>{typeof network.rtt === 'number' ? network.rtt + ' ms' : 'Unavailable'}</b></div>
              {network.saveData && <p className="mt-2 text-[10px] text-amber-200">Data saver is enabled.</p>}
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-white/45">Stats refresh when your browser reports changes. Browsers generally do not expose Wi-Fi name or signal strength to websites.</p>
        </div>
      )}

      {isShutdown && (
        <div className="fixed inset-0 z-[12000] flex flex-col items-center justify-center bg-[#080d18] px-6 text-center text-white">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300"><Power size={30} /></div>
          <h1 className="text-2xl font-semibold">DogeUB is shut down</h1>
          <p className="mt-2 max-w-sm text-sm text-white/60">DogeUB is off. Sign in with your password first, then turn DogeUB back on.</p>
          <button onClick={() => setIsShutdown(false)} className="mt-6 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400">Turn DogeUB back on</button>
        </div>
      )}

      {appLayout === 'desktop' && (
        <div className="dogeub-desktop-icons" aria-label="Desktop app shortcuts">
          {apps.filter((app) => app.path && !app.startOnly).map((app) => {
            const Icon = app.icon;
            return <button key={app.name} type="button" title={app.name} onClick={() => openApp(app)} className="dogeub-desktop-icon">
              <span className="dogeub-desktop-icon-art"><Icon size={22} /></span><span>{app.name}</span>
            </button>;
          })}
        </div>
      )}

      <nav aria-label="Windows style taskbar" data-device-taskbar="true" data-app-layout={appLayout} style={{ backgroundColor: 'rgba(16,24,39,var(--dogeub-hub-glass,.85))', borderTopColor: 'var(--dogeub-hub-accent,rgba(255,255,255,.1))' }} className="fixed inset-x-0 bottom-0 z-[11000] flex h-[58px] items-center justify-start border-t border-white/10 px-2 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
        <div className="flex min-w-0 max-w-[calc(100%-120px)] items-center gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap py-1 sm:max-w-[calc(100%-355px)]">
          <button aria-label="Start" title="Start" onClick={() => { setStartOpen((v) => !v); setSearchOpen(false); setTrayOpen(false); }} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 ${startOpen ? 'bg-white/15' : ''}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M2 3.5 10.5 2.3v8.2H2V3.5Zm9.5-1.35L22 0.5v10H11.5V2.15ZM2 11.5h8.5v8.2L2 18.5v-7Zm9.5 0H22v10l-10.5-1.65V11.5Z" /></svg>
          </button>
          <button aria-label="Taskbar search" title="Search" onClick={() => { setSearchOpen((v) => !v); setStartOpen(false); setTrayOpen(false); }} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 ${searchOpen ? 'bg-white/15' : ''}`}><Search size={18} /></button>
          <span className="mx-1 h-7 w-px shrink-0 bg-white/10" />
          {apps.filter((app) => !app.startOnly).map((app) => {
            const Icon = app.icon;
            const active = Boolean(app.path) && location.pathname === app.path;
            return (
              <button
                key={app.name}
                type="button"
                title={app.name}
                aria-label={app.name}
                data-mobile-app={['Home', 'Browser', 'Apps', 'Doge Messages'].includes(app.name) ? 'true' : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => openApp(app)}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${active ? 'bg-white/10' : ''}`}
              >
                <Icon size={18} />
                {active && <span className="absolute bottom-0.5 h-1 w-4 rounded-full" style={{ backgroundColor: 'var(--dogeub-hub-accent,#38bdf8)' }} />}
              </button>
            );
          })}
        </div>

        <div className="absolute right-2 flex h-10 items-center gap-2 rounded-xl px-2 hover:bg-white/10 sm:right-3">
          <button aria-label="Device specs" title="Device specs" onClick={() => { setSpecsOpen((v) => !v); setTrayOpen(false); setStartOpen(false); setSearchOpen(false); }} className="flex items-center gap-1 rounded-lg p-2 hover:bg-white/10"><Cpu size={15} /></button>
          <button aria-label="Quick settings" title="Quick settings" onClick={() => { setTrayOpen((v) => !v); setSpecsOpen(false); setStartOpen(false); setSearchOpen(false); }} className="flex items-center gap-1 rounded-lg p-2 hover:bg-white/10">
            <Wifi size={15} className="hidden sm:block" /><ChevronUp size={13} className="hidden md:block" />
          </button>
          <div className="hidden items-center rounded-lg border border-white/10 bg-black/20 p-0.5 sm:flex" role="group" aria-label="Performance mode">
            <button type="button" aria-pressed={!gamingMode} onClick={() => setGamingMode(false)} title="Normal mode: standard visual effects" className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${!gamingMode ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'}`}>Normal</button>
            <button type="button" aria-pressed={gamingMode} onClick={() => setGamingMode(true)} title="Gaming mode: reduce animations and transitions" className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${gamingMode ? 'bg-emerald-400 text-black' : 'text-white/55 hover:text-white'}`}>Gaming</button>
          </div>
          <button title={`${clock.time}, ${clock.date}`} onClick={() => { setTrayOpen((v) => !v); setSpecsOpen(false); setStartOpen(false); setSearchOpen(false); }} className="hidden min-w-[76px] flex-col items-end leading-tight sm:flex">
            <span className="text-xs">{clock.time}</span><span className="mt-0.5 text-[10px] text-white/65">{clock.date}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
