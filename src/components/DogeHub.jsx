import { useEffect, useMemo, useState } from 'react';
import {
  AppWindow, CalendarDays, Check, CloudSun, FileText, Folder,
  LayoutDashboard, Moon, Palette, Plus, RotateCcw, Search, Settings2,
  StickyNote, Sun, Trash2, X, Wifi, Zap
} from 'lucide-react';

const STORAGE = {
  notes: 'dogeub-hub-notes-v1',
  files: 'dogeub-hub-files-v1',
  theme: 'dogeub-hub-theme-v1',
  tasks: 'dogeub-hub-tasks-v1',
};

const DEFAULT_FILES = [
  { id: 'welcome', name: 'Welcome.txt', folder: 'Documents', type: 'Text file', content: 'Welcome to Doge Files! Create notes, organize your local DogeUB files, and save your ideas here.' },
  { id: 'homework', name: 'Homework.txt', folder: 'School', type: 'Text file', content: 'My homework\n\n• Add your assignments here\n• Keep track of due dates\n' },
];

const DEFAULT_THEME = { accent: '#38bdf8', mode: 'dark', glass: 82, radius: 18, motion: true };
const accentChoices = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#fb7185'];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2);
}

const tabs = [
  { id: 'control', label: 'Control Center', icon: Settings2 },
  { id: 'files', label: 'Doge Files', icon: Folder },
  { id: 'widgets', label: 'Widgets', icon: LayoutDashboard },
  { id: 'multi', label: 'Multitasking', icon: AppWindow },
  { id: 'notes', label: 'Sticky Notes', icon: StickyNote },
  { id: 'themes', label: 'Themes Studio', icon: Palette },
];

function Tile({ children, className = '' }) {
  return <div className={'rounded-2xl border border-white/10 bg-white/[.045] p-4 ' + className}>{children}</div>;
}

export default function DogeHub() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('control');
  const [clock, setClock] = useState(() => new Date());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [brightness, setBrightness] = useState(100);
  const [battery, setBattery] = useState(null);
  const [theme, setTheme] = useState(() => ({ ...DEFAULT_THEME, ...readStorage(STORAGE.theme, {}) }));
  const [savedThemes, setSavedThemes] = useState(() => readStorage('dogeub-hub-theme-presets-v1', []));
  const [notes, setNotes] = useState(() => readStorage(STORAGE.notes, []));
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [files, setFiles] = useState(() => readStorage(STORAGE.files, DEFAULT_FILES));
  const [folder, setFolder] = useState('All files');
  const [fileQuery, setFileQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('Click to get local weather');
  const [tasks, setTasks] = useState(() => readStorage(STORAGE.tasks, []));
  const [taskInput, setTaskInput] = useState('');
  const [snap, setSnap] = useState('side-by-side');
  const [panels, setPanels] = useState(['Notes', 'Browser']);
  const [toast, setToast] = useState('');
  const [draggingDesktop, setDraggingDesktop] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);

  useEffect(() => {
    const onOpen = (event) => {
      setActive(event.detail?.tab || 'control');
      setOpen(true);
    };
    window.addEventListener('dogeub-open-hub', onOpen);
    return () => window.removeEventListener('dogeub-open-hub', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setClock(new Date()), 15000);
    const onOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOnline);
    };
  }, [open]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.notes, JSON.stringify(notes)); } catch { setToast('Storage is full. Remove some notes and try again.'); }
  }, [notes]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE.files, JSON.stringify(files)); } catch { setToast('Storage is full. Try smaller text files.'); }
  }, [files]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE.theme, JSON.stringify(theme)); } catch {}
    document.documentElement.style.setProperty('--dogeub-hub-accent', theme.accent);
    document.documentElement.style.setProperty('--dogeub-hub-glass', String(theme.glass / 100));
    document.documentElement.style.setProperty('--dogeub-hub-radius', theme.radius + 'px');
    document.documentElement.dataset.dogeubHubMode = theme.mode;
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks)); } catch {}
  }, [tasks]);
  useEffect(() => {
    try { localStorage.setItem('dogeub-hub-theme-presets-v1', JSON.stringify(savedThemes)); } catch {}
  }, [savedThemes]);

  useEffect(() => {
    if (!open || typeof navigator.getBattery !== 'function') return;
    let mounted = true;
    let manager;
    let update;
    navigator.getBattery().then((value) => {
      if (!mounted) return;
      manager = value;
      update = () => setBattery({ level: Math.round(value.level * 100), charging: value.charging });
      update();
      value.addEventListener('levelchange', update);
      value.addEventListener('chargingchange', update);
    }).catch(() => {});
    return () => {
      mounted = false;
      if (manager && update) {
        manager.removeEventListener('levelchange', update);
        manager.removeEventListener('chargingchange', update);
      }
    };
  }, [open]);

  const folders = useMemo(() => ['All files', ...new Set(files.map((item) => item.folder || 'Documents')), 'Recycle Bin'], [files]);
  const visibleFiles = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    return files.filter((item) => {
      const inFolder = folder === 'All files' || (folder === 'Recycle Bin' ? item.deleted : !item.deleted && item.folder === folder);
      return inFolder && (!q || item.name.toLowerCase().includes(q) || item.content.toLowerCase().includes(q));
    });
  }, [files, folder, fileQuery]);

  const fetchWeather = () => {
    if (!navigator.geolocation) { setWeatherStatus('Location is not supported by this browser.'); return; }
    setWeatherStatus('Requesting location…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + coords.latitude + '&longitude=' + coords.longitude + '&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m&timezone=auto';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather service unavailable');
        const data = await response.json();
        const current = data.current;
        const code = current.weather_code;
        const condition = code === 0 ? 'Clear sky' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Foggy' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : code <= 86 ? 'Snow showers' : 'Thunderstorm';
        setWeather({ temp: Math.round(current.temperature_2m), feels: Math.round(current.apparent_temperature), humidity: current.relative_humidity_2m, condition });
        setWeatherStatus('Updated just now');
      } catch { setWeatherStatus('Could not load weather. Try again.'); }
    }, () => setWeatherStatus('Location permission denied. You can enable it in browser site settings.'), { timeout: 10000, maximumAge: 300000 });
  };

  const addNote = () => {
    const title = noteTitle.trim() || 'Untitled note';
    if (!noteBody.trim() && !noteTitle.trim()) return;
    const item = { id: makeId(), title, body: noteBody, updatedAt: new Date().toISOString() };
    setNotes((old) => [item, ...old]);
    setSelectedNote(item.id);
    setNoteTitle(title);
    setNoteBody(noteBody);
    setToast('Note saved on this browser');
  };
  const saveSelectedNote = () => {
    if (!selectedNote) return;
    setNotes((old) => old.map((note) => note.id === selectedNote ? { ...note, title: noteTitle || 'Untitled note', body: noteBody, updatedAt: new Date().toISOString() } : note));
    setToast('Note saved');
  };
  const openNote = (note) => { setSelectedNote(note.id); setNoteTitle(note.title); setNoteBody(note.body); setActive('notes'); };
  const createFile = () => {
    const item = { id: makeId(), name: 'New note.txt', folder: folder === 'All files' || folder === 'Recycle Bin' ? 'Documents' : folder, type: 'Text file', content: '', deleted: false, desktopPinned: true, desktopPosition: { x: 24 + (files.length % 5) * 92, y: 72 + (files.length % 4) * 100 } };
    setFiles((old) => [item, ...old]);
    setSelectedFile(item.id);
    setFileContent('');
    setFolder(item.folder);
  };
  const importFiles = async (event) => {
    const chosen = Array.from(event.target.files || []);
    if (!chosen.length) return;
    const imported = [];
    for (const file of chosen) {
      try {
        const isText = file.type.startsWith('text/') || /\\.(txt|md|json|csv|html|css|js|xml|log)$/i.test(file.name);
        const content = isText ? await file.text() : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imported.push({
          id: makeId(), name: file.name, folder: 'Imported', type: file.type || 'File',
          content, fileKind: isText ? 'text' : 'binary', size: file.size, deleted: false,
          desktopPinned: true,
          desktopPosition: { x: 24 + ((files.length + imported.length) % 5) * 92, y: 72 + ((files.length + imported.length) % 4) * 100 },
        });
      } catch {}
    }
    if (imported.length) {
      setFiles((old) => [...imported, ...old]);
      setFolder('Imported');
      setSelectedFile(imported[0].id);
      setFileContent(typeof imported[0].content === 'string' && imported[0].fileKind === 'text' ? imported[0].content : '');
      setToast('Imported ' + imported.length + ' file' + (imported.length === 1 ? '' : 's') + ' and pinned to desktop');
    } else setToast('Could not import those files');
    event.target.value = '';
  };
  const exportFile = (item) => {
    try {
      const blob = item.fileKind === 'binary'
        ? fetch(item.content).then((response) => response.blob())
        : Promise.resolve(new Blob([item.content || ''], { type: item.type || 'text/plain;charset=utf-8' }));
      Promise.resolve(blob).then((value) => {
        const url = URL.createObjectURL(value);
        const link = document.createElement('a');
        link.href = url; link.download = item.name || 'download'; link.click();
        URL.revokeObjectURL(url);
      });
    } catch { setToast('Could not export this file'); }
  };
  const saveFile = () => {
    if (!selectedFile) return;
    setFiles((old) => old.map((item) => item.id === selectedFile ? { ...item, content: fileContent } : item));
    setToast('File saved locally');
  };
  const renameFile = (item) => {
    const name = window.prompt('New file name:', item.name);
    if (name?.trim()) setFiles((old) => old.map((file) => file.id === item.id ? { ...file, name: name.trim() } : file));
  };
  const trashFile = (item) => setFiles((old) => old.map((file) => file.id === item.id ? { ...file, deleted: true } : file));
  const restoreFile = (item) => setFiles((old) => old.map((file) => file.id === item.id ? { ...file, deleted: false } : file));
  const permanentlyDelete = (item) => {
    if (window.confirm('Permanently delete ' + item.name + '?')) setFiles((old) => old.filter((file) => file.id !== item.id));
  };
  const addTask = (event) => {
    event.preventDefault();
    if (!taskInput.trim()) return;
    setTasks((old) => [...old, { id: makeId(), text: taskInput.trim(), done: false }]);
    setTaskInput('');
  };

  const desktopFiles = files.filter((item) => item.desktopPinned && !item.deleted);
  if (!open) return (
    <div className="fixed inset-0 z-[1] pointer-events-none" aria-label="DogeUB desktop files">
      <div className="pointer-events-none absolute inset-0" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData('text/dogeub-file');
        if (id) setFiles((old) => old.map((item) => item.id === id ? { ...item, desktopPinned: true, desktopPosition: { x: Math.max(8, event.clientX - 35), y: Math.max(48, event.clientY - 35) } } : item));
      }}>
        {desktopFiles.map((item) => {
          const position = item.desktopPosition || { x: 24, y: 72 };
          return <div key={item.id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/dogeub-file', item.id); event.dataTransfer.effectAllowed = 'move'; setDraggingDesktop(item.id); }}
            onDragEnd={(event) => { const x = Math.max(8, event.clientX - 35); const y = Math.max(48, event.clientY - 35); setFiles((old) => old.map((file) => file.id === item.id ? { ...file, desktopPosition: { x, y } } : file)); setDraggingDesktop(null); }}
            onDoubleClick={() => { if (item.fileKind === 'binary' && item.type?.startsWith('image/')) setImageViewer(item); else { setSelectedFile(item.id); setFileContent(item.fileKind === 'text' || !item.fileKind ? item.content : ''); setActive('files'); setOpen(true); } }}
            className={'pointer-events-auto absolute flex w-[76px] cursor-grab flex-col items-center gap-1 rounded-lg p-2 text-center text-white drop-shadow-lg hover:bg-white/15 active:cursor-grabbing ' + (draggingDesktop === item.id ? 'opacity-50' : '')}
            style={{ left: position.x, top: position.y, touchAction: 'none' }} title={item.name}>
            {item.fileKind === 'binary' && item.type?.startsWith('image/') ? <img src={item.content} alt="" className="h-9 w-9 rounded object-cover" /> : <FileText size={32} />}
            <span className="w-full break-words text-[11px] leading-tight">{item.name}</span>
            <button title="Remove from desktop" onClick={(event) => { event.stopPropagation(); setFiles((old) => old.map((file) => file.id === item.id ? { ...file, desktopPinned: false } : file)); }} className="pointer-events-auto rounded bg-black/60 px-1.5 py-0.5 text-[9px] hover:bg-red-600">Remove</button>
          </div>;
        })}
      </div>
    </div>
  );
  const dark = theme.mode === 'dark';
  const shell = dark ? 'bg-[#101827]/95 text-white' : 'bg-slate-100/95 text-slate-900';
  const surface = dark ? 'border-white/10 bg-white/[.045]' : 'border-slate-300 bg-white/80';
  const muted = dark ? 'text-white/55' : 'text-slate-500';
  const accentStyle = { backgroundColor: theme.accent };
  const buttonBase = 'rounded-xl border px-3 py-2 text-xs font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
  const softButton = buttonBase + ' ' + surface;
  const titleFor = tabs.find((tab) => tab.id === active)?.label || 'Doge Hub';

  return (
    <div className={'fixed inset-0 z-[10997] flex items-center justify-center bg-black/55 p-2 text-sm sm:p-6 ' + (theme.motion ? 'transition-opacity duration-200' : '')} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={'flex h-[min(88vh,780px)] w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ' + shell} style={{ borderColor: theme.accent + '55', borderRadius: theme.radius + 'px', backgroundColor: dark ? 'rgba(16,24,39,' + (theme.glass / 100) + ')' : 'rgba(241,245,249,' + (theme.glass / 100) + ')', filter: 'brightness(' + brightness + '%)' }}>
        <aside className={'hidden w-56 shrink-0 flex-col border-r p-3 sm:flex ' + (dark ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white/40')}>
          <div className="mb-5 flex items-center gap-2 px-2 pt-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={accentStyle}><Zap size={19} /></div>
            <div><div className="font-bold">Doge Hub</div><div className={'text-[10px] ' + muted}>Desktop tools</div></div>
          </div>
          <div className={'mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] ' + muted}>Workspace</div>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.id} onClick={() => setActive(tab.id)} className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ' + (active === tab.id ? 'text-white shadow-sm' : 'hover:bg-white/10')} style={active === tab.id ? accentStyle : undefined}><Icon size={16} />{tab.label}</button>;
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 p-3">
            <div className="text-xs font-semibold">DogeUB status</div>
            <div className={'mt-2 flex items-center gap-2 text-[11px] ' + muted}><span className={'h-2 w-2 rounded-full ' + (online ? 'bg-emerald-400' : 'bg-red-400')} />{online ? 'Connected' : 'Offline'}</div>
            <div className={'mt-1 text-[11px] ' + muted}>{clock.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className={'flex shrink-0 items-center justify-between border-b px-4 py-3 ' + (dark ? 'border-white/10' : 'border-slate-200')}>
            <div className="min-w-0">
              <div className="text-base font-bold">{titleFor}</div>
              <div className={'text-[11px] ' + muted}>Your personal DogeUB workspace</div>
            </div>
            <div className="flex items-center gap-2">
              <select aria-label="Switch Doge Hub tool" value={active} onChange={(event) => setActive(event.target.value)} className={'max-w-36 rounded-lg border p-2 text-xs sm:hidden ' + (dark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white')}>{tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select>
              <button aria-label="Close Doge Hub" title="Close" onClick={() => setOpen(false)} className={'rounded-lg p-2 hover:bg-white/10 ' + muted}><X size={18} /></button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
            {active === 'control' && <div className="space-y-4">
              <div><h2 className="text-xl font-bold">Welcome back.</h2><p className={'mt-1 text-xs ' + muted}>Quick controls and live device status. Some controls are visual only because websites cannot change Windows settings.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Tile className={surface}><div className="flex items-center gap-3"><div className="rounded-xl p-3 text-white" style={accentStyle}><Wifi size={19} /></div><div><div className="font-semibold">Internet</div><div className={'text-xs ' + muted}>{online ? 'Connected' : 'Offline'}</div></div></div><button className={'mt-4 w-full ' + softButton} onClick={() => setToast(online ? 'Browser reports that you are online.' : 'Browser reports that you are offline.')}>Check connection</button></Tile>
                <Tile className={surface}><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-300"><Zap size={19} /></div><div><div className="font-semibold">Battery</div><div className={'text-xs ' + muted}>{battery ? battery.level + '% · ' + (battery.charging ? 'Charging' : 'On battery') : 'Not available in this browser'}</div></div></div>{battery && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: battery.level + '%', backgroundColor: theme.accent }} /></div>}</Tile>
                <Tile className={surface}><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-400/15 p-3 text-amber-300"><Sun size={19} /></div><div><div className="font-semibold">Appearance</div><div className={'text-xs ' + muted}>{dark ? 'Dark mode' : 'Light mode'}</div></div></div><button className={'mt-4 w-full ' + softButton} onClick={() => setTheme((old) => ({ ...old, mode: old.mode === 'dark' ? 'light' : 'dark' }))}>Switch to {dark ? 'light' : 'dark'} mode</button></Tile>
                <Tile className={surface}><div className="font-semibold">Display brightness</div><p className={'mt-1 text-xs ' + muted}>Visual-only brightness for the Doge Hub window.</p><input aria-label="Display brightness" className="mt-4 w-full accent-sky-400" type="range" min="60" max="120" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /><div className={'mt-1 text-xs ' + muted}>{brightness}% brightness</div></Tile>
                <Tile className={surface}><div className="font-semibold">Transparency</div><p className={'mt-1 text-xs ' + muted}>Adjust the glass look of Doge Hub.</p><input aria-label="Transparency" className="mt-4 w-full accent-sky-400" type="range" min="35" max="100" value={theme.glass} onChange={(event) => setTheme((old) => ({ ...old, glass: Number(event.target.value) }))} /><div className={'mt-1 text-xs ' + muted}>{theme.glass}% opacity</div></Tile>
                <Tile className={surface}><div className="font-semibold">Display effects</div><p className={'mt-1 text-xs ' + muted}>Choose a comfortable desktop feel.</p><label className="mt-4 flex items-center justify-between text-xs"><span>Animations</span><input type="checkbox" checked={theme.motion} onChange={(event) => setTheme((old) => ({ ...old, motion: event.target.checked }))} /></label><label className="mt-3 flex items-center justify-between text-xs"><span>Rounded corners</span><input type="range" min="8" max="28" value={theme.radius} onChange={(event) => setTheme((old) => ({ ...old, radius: Number(event.target.value) }))} /></label></Tile>
                <Tile className={surface}><div className="font-semibold">Quick actions</div><div className="mt-3 grid grid-cols-2 gap-2"><button className={softButton} onClick={() => setActive('widgets')}><CalendarDays size={14} className="mr-1 inline" />Widgets</button><button className={softButton} onClick={() => setActive('notes')}><StickyNote size={14} className="mr-1 inline" />New note</button><button className={softButton} onClick={() => setActive('files')}><Folder size={14} className="mr-1 inline" />Files</button><button className={softButton} onClick={() => setActive('themes')}><Palette size={14} className="mr-1 inline" />Themes</button></div></Tile>
              </div>
            </div>}

            {active === 'files' && <div className="flex h-full min-h-[380px] flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Doge Files</h2><p className={'text-xs ' + muted}>Import files from your PC; new/imported files are pinned to the DogeUB desktop.</p></div><div className="flex flex-wrap gap-2"><label className={buttonBase + ' cursor-pointer border-transparent text-white'} style={accentStyle}><Plus size={14} className="mr-1 inline" />Import from PC<input type="file" multiple className="hidden" onChange={importFiles} /></label><button className={softButton} onClick={createFile}><Plus size={14} className="mr-1 inline" />New file</button></div></div>
              <div className="flex flex-wrap gap-2">{folders.map((name) => <button key={name} onClick={() => { setFolder(name); setSelectedFile(null); }} className={'rounded-lg border px-3 py-2 text-xs ' + (folder === name ? 'border-transparent text-white' : surface)} style={folder === name ? accentStyle : undefined}>{name}</button>)}</div>
              <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(190px,.8fr)_minmax(0,1.4fr)]">
                <div className={'flex min-h-[190px] flex-col overflow-hidden rounded-xl border ' + surface}><div className="border-b border-inherit p-2"><div className="flex items-center gap-2 rounded-lg bg-black/10 px-2"><Search size={14} /><input value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="Find files…" className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none" /></div></div><div className="flex-1 overflow-y-auto p-2">{visibleFiles.map((item) => <button key={item.id} onClick={() => { setSelectedFile(item.id); setFileContent(item.content); }} className={'mb-1 flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs ' + (selectedFile === item.id ? 'bg-sky-500/20' : 'hover:bg-white/5')}><FileText size={16} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span></button>)}{visibleFiles.length === 0 && <p className={'p-3 text-xs ' + muted}>No files here yet.</p>}</div></div>
                <div className={'flex min-h-[260px] flex-col rounded-xl border p-3 ' + surface}>{selectedFile && files.some((item) => item.id === selectedFile) ? <><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><input aria-label="Selected file name" value={files.find((item) => item.id === selectedFile)?.name || ''} onChange={(event) => setFiles((old) => old.map((item) => item.id === selectedFile ? { ...item, name: event.target.value } : item))} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /><div className="flex gap-1">{files.find((item) => item.id === selectedFile)?.deleted ? <button title="Restore" className={softButton} onClick={() => restoreFile(files.find((item) => item.id === selectedFile))}><RotateCcw size={14} /></button> : <button title="Move to recycle bin" className={softButton} onClick={() => trashFile(files.find((item) => item.id === selectedFile))}><Trash2 size={14} /></button>}<button title="Download file" className={softButton} onClick={() => exportFile(files.find((item) => item.id === selectedFile))}>Export</button><button title="Remove from desktop" className={softButton} onClick={() => setFiles((old) => old.map((item) => item.id === selectedFile ? { ...item, desktopPinned: false } : item))}>Unpin</button><button title="Permanently delete" className={softButton} onClick={() => permanentlyDelete(files.find((item) => item.id === selectedFile))}><X size={14} /></button><button className={buttonBase + ' border-transparent text-white'} style={accentStyle} onClick={saveFile}>Save</button></div></div>{files.find((item) => item.id === selectedFile)?.fileKind === 'binary' && files.find((item) => item.id === selectedFile)?.type?.startsWith('image/') ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto rounded-lg bg-black/10 p-3"><img src={files.find((item) => item.id === selectedFile).content} alt={files.find((item) => item.id === selectedFile).name} onClick={() => setImageViewer(files.find((item) => item.id === selectedFile))} className="max-h-[300px] max-w-full cursor-zoom-in rounded-lg object-contain shadow-lg" /><div className="flex flex-wrap items-center justify-center gap-2"><span className={'text-xs ' + muted}>{files.find((item) => item.id === selectedFile).name}</span><button className={softButton} onClick={() => setImageViewer(files.find((item) => item.id === selectedFile))}>Open image viewer</button></div></div> : <textarea aria-label="File contents" value={fileContent} onChange={(event) => setFileContent(event.target.value)} className={'min-h-0 flex-1 resize-none rounded-lg border p-3 text-xs leading-5 outline-none ' + (dark ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-white')} placeholder="Write something…" />}{!files.find((item) => item.id === selectedFile)?.deleted && <button className={'mt-2 self-start ' + softButton} onClick={() => renameFile(files.find((item) => item.id === selectedFile))}>Rename file</button>}</> : <div className={'flex flex-1 flex-col items-center justify-center text-center ' + muted}><Folder size={32} /><p className="mt-2 text-sm">Select a file to edit</p><p className="mt-1 text-xs">Or create a new text file.</p></div>}</div>
              </div>
            </div>}

            {active === 'widgets' && <div className="space-y-4">
              <div><h2 className="text-lg font-bold">Widgets Board</h2><p className={'text-xs ' + muted}>Time, calendar, weather and your task list.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                <Tile className={surface}><div className={'text-xs ' + muted}>CURRENT TIME</div><div className="mt-2 text-4xl font-light tracking-tight">{clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</div><div className={'mt-2 text-sm ' + muted}>{clock.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div></Tile>
                <Tile className={surface}><div className="flex items-center gap-2 font-semibold"><CalendarDays size={17} style={{ color: theme.accent }} /> Calendar</div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px]">{['S','M','T','W','T','F','S'].map((d,i)=><span key={d+i} className={muted}>{d}</span>)}{Array.from({ length: new Date(clock.getFullYear(), clock.getMonth(), 1).getDay() },(_,i)=><span key={'blank'+i}/>)}{Array.from({ length: new Date(clock.getFullYear(), clock.getMonth()+1, 0).getDate() },(_,i)=><span key={i+1} className={'rounded-lg py-1.5 ' + (i+1===clock.getDate() ? 'font-bold text-white' : '')} style={i+1===clock.getDate() ? accentStyle : undefined}>{i+1}</span>)}</div></Tile>
                <Tile className={surface}><div className="flex items-center gap-2 font-semibold"><CloudSun size={18} style={{ color: theme.accent }} /> Local weather</div>{weather ? <><div className="mt-3 text-4xl font-light">{weather.temp}°C</div><div className="mt-1 text-sm">{weather.condition}</div><div className={'mt-2 text-xs ' + muted}>Feels like {weather.feels}°C · Humidity {weather.humidity}%</div></> : <p className={'mt-3 text-xs ' + muted}>Weather uses your location only after you press the button.</p>}<button onClick={fetchWeather} className={'mt-4 ' + softButton}>{weather ? 'Refresh weather' : 'Get local weather'}</button><p className={'mt-2 text-[10px] ' + muted}>{weatherStatus}</p></Tile>
                <Tile className={surface}><div className="font-semibold">Homework checklist</div><form onSubmit={addTask} className="mt-3 flex gap-2"><input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="Add an assignment…" className={'min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-xs outline-none ' + surface} /><button className={buttonBase + ' border-transparent text-white'} style={accentStyle} aria-label="Add assignment"><Plus size={15}/></button></form><div className="mt-3 space-y-2">{tasks.map((task) => <div key={task.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={task.done} onChange={(event) => setTasks((old) => old.map((item) => item.id === task.id ? { ...item, done: event.target.checked } : item))} /><span className={'min-w-0 flex-1 ' + (task.done ? 'line-through opacity-50' : '')}>{task.text}</span><button aria-label="Delete assignment" onClick={() => setTasks((old) => old.filter((item) => item.id !== task.id))} className={muted}><X size={13}/></button></div>)}{tasks.length===0 && <p className={'text-xs ' + muted}>No assignments yet. Add one above.</p>}</div></Tile>
              </div>
            </div>}

            {active === 'multi' && <div className="space-y-4">
              <div><h2 className="text-lg font-bold">Multitasking workspace</h2><p className={'text-xs ' + muted}>Arrange mock workspace panels. This organizes Doge Hub content; it cannot control other browser tabs or Windows apps.</p></div>
              <Tile className={surface}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold">Snap layout</div><div className={'mt-1 text-xs ' + muted}>Choose how your workspace panels are arranged.</div></div><select value={snap} onChange={(event) => setSnap(event.target.value)} className={'rounded-lg border p-2 text-xs ' + (dark ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white')}><option value="side-by-side">Side by side</option><option value="focus">Focus one panel</option><option value="grid">Four-panel grid</option><option value="stack">Stacked panels</option></select></div></Tile>
              <div className={'grid gap-3 ' + (snap === 'grid' ? 'sm:grid-cols-2' : snap === 'side-by-side' ? 'md:grid-cols-2' : 'grid-cols-1')}>{panels.map((panel, index) => <Tile key={panel} className={surface + ' min-h-36'}><div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><AppWindow size={16} style={{ color: theme.accent }} />{panel}</div><button title="Remove panel" onClick={() => setPanels((old) => old.filter((item) => item !== panel))} className={muted}><X size={15}/></button></div><div className={'mt-4 rounded-xl p-4 text-xs ' + (dark ? 'bg-black/15' : 'bg-slate-100')}>{panel === 'Notes' ? 'Keep your ideas and homework notes in one place.' : panel === 'Browser' ? 'Use the DogeUB browser from the taskbar to browse websites.' : panel === 'Widgets' ? clock.toLocaleString() : panel === 'Files' ? files.length + ' local text files saved' : 'Your workspace panel is ready.'}</div></Tile>)}</div>
              <div className="flex flex-wrap gap-2">{['Notes','Browser','Widgets','Files'].filter((name) => !panels.includes(name)).map((name) => <button key={name} className={softButton} onClick={() => setPanels((old) => [...old, name])}><Plus size={14} className="mr-1 inline"/>{name}</button>)}<button className={softButton} onClick={() => setPanels(['Notes','Browser'])}>Reset workspace</button></div>
            </div>}

            {active === 'notes' && <div className="flex h-full min-h-[390px] flex-col gap-3">
              <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Sticky Notes</h2><p className={'text-xs ' + muted}>Saved on this browser automatically.</p></div><button className={buttonBase + ' border-transparent text-white'} style={accentStyle} onClick={() => { setSelectedNote(null); setNoteTitle(''); setNoteBody(''); }}><Plus size={14} className="mr-1 inline"/>New note</button></div>
              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className={'min-h-[120px] overflow-y-auto rounded-xl border p-2 ' + surface}>{notes.map((note) => <button key={note.id} onClick={() => openNote(note)} className={'mb-1 w-full rounded-lg p-3 text-left ' + (selectedNote === note.id ? 'bg-sky-500/20' : 'hover:bg-white/5')}><div className="truncate text-xs font-semibold">{note.title}</div><div className={'mt-1 line-clamp-2 text-[10px] ' + muted}>{note.body || 'Empty note'}</div></button>)}{notes.length===0 && <p className={'p-3 text-xs ' + muted}>No saved notes yet.</p>}</div>
                <div className={'flex min-h-[260px] flex-col gap-2 rounded-xl border p-3 ' + surface}><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" className="rounded-lg bg-transparent px-2 py-2 text-sm font-semibold outline-none" /><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Type your note…" className={'min-h-0 flex-1 resize-none rounded-lg border p-3 text-xs leading-5 outline-none ' + (dark ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-white')} /><div className="flex flex-wrap justify-between gap-2"><button disabled={!selectedNote} className={softButton} onClick={() => { setNotes((old) => old.filter((note) => note.id !== selectedNote)); setSelectedNote(null); setNoteTitle(''); setNoteBody(''); }}>Delete</button><button className={buttonBase + ' border-transparent text-white'} style={accentStyle} onClick={selectedNote ? saveSelectedNote : addNote}>{selectedNote ? 'Save changes' : 'Save note'}</button></div></div>
              </div>
            </div>}

            {active === 'themes' && <div className="space-y-4">
              <div><h2 className="text-lg font-bold">Themes Studio</h2><p className={'text-xs ' + muted}>Build your own DogeUB look. Settings are saved in this browser.</p></div>
              <Tile className={surface}><div className="font-semibold">Accent color</div><div className="mt-3 flex flex-wrap gap-3">{accentChoices.map((color) => <button key={color} aria-label={'Set accent ' + color} onClick={() => setTheme((old) => ({ ...old, accent: color }))} className={'flex h-10 w-10 items-center justify-center rounded-full border-2 ' + (theme.accent === color ? 'border-white' : 'border-transparent')} style={{ backgroundColor: color }}>{theme.accent === color && <Check size={18} className="text-white"/>}</button>)}<label title="Custom accent" className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/20"><Palette size={17}/><input aria-label="Custom accent color" type="color" value={theme.accent} onChange={(event) => setTheme((old) => ({ ...old, accent: event.target.value }))} className="absolute h-px w-px opacity-0"/></label></div></Tile>
              <div className="grid gap-3 md:grid-cols-2"><Tile className={surface}><div className="font-semibold">Appearance</div><div className="mt-3 grid grid-cols-2 gap-2"><button className={softButton} onClick={() => setTheme((old) => ({ ...old, mode: 'dark' }))}><Moon size={15} className="mr-1 inline"/>Dark</button><button className={softButton} onClick={() => setTheme((old) => ({ ...old, mode: 'light' }))}><Sun size={15} className="mr-1 inline"/>Light</button></div><label className="mt-4 flex items-center justify-between text-xs"><span>Glass opacity</span><span>{theme.glass}%</span></label><input aria-label="Glass opacity" className="mt-2 w-full" type="range" min="35" max="100" value={theme.glass} onChange={(event) => setTheme((old) => ({ ...old, glass: Number(event.target.value) }))}/></Tile><Tile className={surface}><div className="font-semibold">Window shape</div><label className="mt-3 block text-xs">Corner roundness: {theme.radius}px</label><input aria-label="Corner roundness" className="mt-2 w-full" type="range" min="8" max="28" value={theme.radius} onChange={(event) => setTheme((old) => ({ ...old, radius: Number(event.target.value) }))}/><div className="mt-4 flex items-center justify-between text-xs"><span>Animations</span><input type="checkbox" checked={theme.motion} onChange={(event) => setTheme((old) => ({ ...old, motion: event.target.checked }))}/></div></Tile></div>
              <Tile className={surface}><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">Saved themes</div><button className={buttonBase + ' border-transparent text-white'} style={accentStyle} onClick={() => { const name = window.prompt('Name this theme:', 'My DogeUB theme'); if (name?.trim()) { setSavedThemes((old) => [{ id: makeId(), name: name.trim(), settings: { ...theme } }, ...old].slice(0, 8)); setToast('Theme preset saved'); } }}>Save current theme</button></div>{savedThemes.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{savedThemes.map((preset) => <div key={preset.id} className={'flex items-center gap-1 rounded-xl border px-2 py-1 ' + surface}><button className="px-1 py-1 text-xs" onClick={() => { setTheme({ ...DEFAULT_THEME, ...preset.settings }); setToast('Loaded ' + preset.name); }}>{preset.name}</button><button aria-label={'Delete ' + preset.name} onClick={() => setSavedThemes((old) => old.filter((item) => item.id !== preset.id))} className={muted}><X size={12}/></button></div>)}</div>}<div className="mt-5 font-semibold">Live preview</div><div className="mt-3 rounded-2xl border p-4" style={{ borderColor: theme.accent, borderRadius: theme.radius, backgroundColor: dark ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.75)', opacity: theme.glass / 100 }}><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl" style={accentStyle}/><div><div className="text-sm font-semibold">DogeUB desktop</div><div className={'text-xs ' + muted}>Your custom theme</div></div></div><div className="mt-3 h-2 w-2/3 rounded-full" style={accentStyle}/></div><button className={buttonBase + ' mt-4 border-transparent text-white'} style={accentStyle} onClick={() => { setTheme(DEFAULT_THEME); setToast('Theme reset'); }}>Reset theme</button></Tile>
            </div>}
          </div>
          {imageViewer && <div className="fixed inset-0 z-[12010] flex flex-col bg-black/95 p-3 text-white sm:p-6" role="dialog" aria-modal="true" aria-label="Image viewer"><div className="flex items-center justify-between gap-3 pb-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{imageViewer.name}</div><div className="text-xs text-white/50">Doge Image Viewer</div></div><div className="flex gap-2"><button className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20" onClick={() => exportFile(imageViewer)}>Download</button><button aria-label="Close image viewer" className="rounded-lg bg-white/10 p-2 hover:bg-white/20" onClick={() => setImageViewer(null)}><X size={18}/></button></div></div><div className="flex min-h-0 flex-1 items-center justify-center overflow-auto"><img src={imageViewer.content} alt={imageViewer.name} className="max-h-full max-w-full select-none object-contain" /></div></div>}{toast && <div className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs text-white shadow-xl" role="status">{toast}<button onClick={() => setToast('')} className="ml-3 opacity-60"><X size={12} className="inline"/></button></div>}
        </main>
      </section>
    </div>
  );
}
