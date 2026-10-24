import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AppWindow, ArrowRight, Award, BookOpen, Check, ChevronRight,
  Clock3, CloudSun, Copy, Cpu, Download, Gamepad2, Globe2, GraduationCap, HardDrive,
  LayoutDashboard, Palette, Plus, Power, Send, Sparkles,
  Terminal, Trash2, Trophy, Upload, Wifi, X, Zap
} from 'lucide-react';

const KEY = 'dogeub-os-studio-v1';
const THEMES = [
  { id: 'cyber', name: 'Cyberpunk', accent: '#22d3ee', glow: 'rgba(34,211,238,.22)', description: 'Neon cyan + violet' },
  { id: 'aurora', name: 'Aurora', accent: '#a78bfa', glow: 'rgba(167,139,250,.22)', description: 'Violet + mint' },
  { id: 'matrix', name: 'Matrix', accent: '#4ade80', glow: 'rgba(74,222,128,.18)', description: 'Terminal green' },
  { id: 'sunset', name: 'Sunset', accent: '#fb7185', glow: 'rgba(251,113,133,.2)', description: 'Rose + amber' },
  { id: 'ice', name: 'Arctic', accent: '#93c5fd', glow: 'rgba(147,197,253,.2)', description: 'Cool blue glass' },
];
const WORKSPACES = ['Home', 'Gaming', 'School', 'Coding', 'Chill'];
const INITIAL_TASKS = [
  { id: 1, title: 'Finish homework', done: false, due: 'Today' },
  { id: 2, title: 'Review tomorrow’s schedule', done: false, due: 'Today' },
];

function readSaved() {
  try { return { theme: 'cyber', mode: 'Home', workspace: 'Home', tasks: INITIAL_TASKS, achievements: [], ...(JSON.parse(localStorage.getItem(KEY) || '{}')) }; }
  catch { return { theme: 'cyber', mode: 'Home', workspace: 'Home', tasks: INITIAL_TASKS, achievements: [] }; }
}
function saveSaved(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
}
function Card({ children, className = '' }) {
  return <div className={'rounded-2xl border border-white/10 bg-white/[.045] p-4 ' + className}>{children}</div>;
}
function Label({ children }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-white/45">{children}</div>;
}

export default function DogeNexus() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('desktop');
  const [now, setNow] = useState(() => new Date());
  const [saved, setSaved] = useState(readSaved);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLines, setTerminalLines] = useState(['DOGEUB TERMINAL v1.0', 'Type help to see available commands.']);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: 'Hey! I’m Doge AI’s local preview. I can point you to tools and explain how DOGEUB works. A real generative AI needs a configured AI API endpoint.' }]);
  const [taskInput, setTaskInput] = useState('');
  const [toast, setToast] = useState('');
  const [bootPreview, setBootPreview] = useState(false);
  const [shutdownPreview, setShutdownPreview] = useState(false);
  const [shareText, setShareText] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('Location is optional');
  const hardwareInfo = useMemo(() => {
    let graphics = 'Graphics renderer not exposed by this browser';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const vendor = debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        if (renderer && renderer !== 'WebKit WebGL') graphics = renderer;
        else if (vendor) graphics = vendor + ' graphics (model hidden)';
      }
    } catch {}
    const ua = navigator.userAgent || '';
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
    return {
      graphics,
      platform,
      cpuThreads: navigator.hardwareConcurrency || null,
      architecture: navigator.userAgentData?.architecture || null,
      browserMayMaskGraphics: /swiftshader|llvmpipe|software/i.test(graphics),
      ua
    };
  }, []);
  const theme = saved.theme === 'custom' && saved.customAccent
    ? { ...THEMES[0], id: 'custom', name: 'Custom', accent: saved.customAccent, glow: saved.customAccent + '33' }
    : (THEMES.find((item) => item.id === saved.theme) || THEMES[0]);

  useEffect(() => {
    const listener = (event) => {
      const detail = event.detail || {};
      setTab(detail.tab || 'desktop');
      setBootPreview(detail.preview === 'startup');
      setShutdownPreview(detail.preview === 'shutdown');
      setOpen(true);
      window.dispatchEvent(new CustomEvent('dogeub-portal-transition'));
    };
    window.addEventListener('dogeub-open-os-studio', listener);
    window.addEventListener('dogeub-open-nexus', listener);
    return () => {
      window.removeEventListener('dogeub-open-os-studio', listener);
      window.removeEventListener('dogeub-open-nexus', listener);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { saveSaved(saved); }, [saved]);
  useEffect(() => {
    document.documentElement.style.setProperty('--dogeub-os-accent', theme.accent);
    document.documentElement.style.setProperty('--dogeub-os-glow', theme.glow);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') { setOpen(false); setBootPreview(false); setShutdownPreview(false); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setTab('terminal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const completedTasks = saved.tasks.filter((task) => task.done).length;
  const earned = useMemo(() => {
    const result = [];
    if (saved.tasks.some((task) => task.done)) result.push('First Steps');
    if (saved.tasks.filter((task) => task.done).length >= 3) result.push('Task Crusher');
    if (saved.workspace !== 'Home') result.push('Dimension Hopper');
    if (saved.theme !== 'cyber') result.push('Style Shifter');
    if (saved.mode === 'Gaming') result.push('Game Face');
    return result;
  }, [saved]);
  useEffect(() => {
    if (earned.some((item) => !saved.achievements.includes(item))) {
      setSaved((old) => ({ ...old, achievements: Array.from(new Set([...old.achievements, ...earned])) }));
    }
  }, [earned, saved.achievements]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };
  const changeMode = (mode) => {
    setSaved((old) => ({ ...old, mode, workspace: mode }));
    notify(mode + ' mode activated');
  };
  const addTask = () => {
    const title = taskInput.trim();
    if (!title) return;
    setSaved((old) => ({ ...old, tasks: [...old.tasks, { id: Date.now(), title, done: false, due: 'Anytime' }] }));
    setTaskInput('');
  };
  const runCommand = (event) => {
    event.preventDefault();
    const command = terminalInput.trim();
    if (!command) return;
    const parts = command.toLowerCase().split(/\s+/);
    let response = '';
    if (parts[0] === 'help') response = 'help · time · theme [cyber|aurora|matrix|sunset|ice] · mode [Home|Gaming|School|Coding|Chill] · workspace [name] · open [settings|recommended|browser|hub] · clear';
    else if (parts[0] === 'time') response = new Date().toLocaleString();
    else if (parts[0] === 'clear') { setTerminalLines([]); setTerminalInput(''); return; }
    else if (parts[0] === 'theme') {
      const match = THEMES.find((item) => item.id === parts[1]);
      if (match) { setSaved((old) => ({ ...old, theme: match.id })); response = 'Theme applied: ' + match.name; }
      else response = 'Try: theme ' + THEMES.map((item) => item.id).join(' | ');
    } else if (parts[0] === 'mode') {
      const match = WORKSPACES.find((item) => item.toLowerCase() === parts.slice(1).join(' '));
      if (match) { changeMode(match); response = match + ' mode activated.'; }
      else response = 'Available modes: ' + WORKSPACES.join(', ');
    } else if (parts[0] === 'workspace') {
      const match = WORKSPACES.find((item) => item.toLowerCase() === parts.slice(1).join(' '));
      if (match) { setSaved((old) => ({ ...old, workspace: match })); response = 'Switched to ' + match + ' workspace.'; }
      else response = 'Available workspaces: ' + WORKSPACES.join(', ');
    } else if (parts[0] === 'open') {
      const destinations = { settings: '/settings', recommended: '/recommended', browser: '/search', hub: null };
      const destination = destinations[parts[1]];
      if (parts[1] === 'hub') { window.dispatchEvent(new CustomEvent('dogeub-open-hub', { detail: { tab: 'control' } })); response = 'Opening Doge Hub.'; }
      else if (destination) { window.location.href = destination; response = 'Opening ' + parts[1] + '.'; }
      else response = 'Try open settings, open recommended, open browser, or open hub.';
    } else response = 'Unknown command. Type help.';
    setTerminalLines((old) => [...old, '› ' + command, response]);
    setTerminalInput('');
  };
  const askLocal = (event) => {
    event.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt) return;
    let answer = 'I’m running in local preview mode, so I can’t generate a live AI response yet. You can still use the Terminal, School Mode, Doge Hub, and Recommended Sites. To make this a real AI assistant, configure a secure server-side API endpoint—never put a private API key in frontend code.';
    if (/homework|school|study/i.test(prompt)) answer = 'Try School Mode: add each assignment to the planner, mark it done when finished, then use the focus timer in Study Sprint. I can help organize your work here, but live AI tutoring needs an API connection.';
    if (/theme|color|look|wallpaper/i.test(prompt)) answer = 'Open Themes and choose Cyberpunk, Aurora, Matrix, Sunset, or Arctic. Your choice is saved in this browser.';
    if (/terminal|command/i.test(prompt)) answer = 'Open Terminal and type help. You can switch themes, modes, workspaces, and open DogeUB pages with commands.';
    setAiMessages((old) => [...old, { role: 'user', text: prompt }, { role: 'assistant', text: answer }]);
    setAiInput('');
  };
  const getWeather = () => {
    if (!navigator.geolocation) { setWeatherStatus('This browser does not support location.'); return; }
    setWeatherStatus('Requesting location permission…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + coords.latitude + '&longitude=' + coords.longitude + '&current=temperature_2m,weather_code&timezone=auto');
        if (!response.ok) throw new Error('weather request failed');
        const data = await response.json();
        const code = data.current.weather_code;
        const condition = code === 0 ? 'Clear sky' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Foggy' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : 'Thunderstorm';
        setWeather({ temp: Math.round(data.current.temperature_2m), condition });
        setWeatherStatus('Live weather updated');
      } catch { setWeatherStatus('Weather unavailable right now.'); }
    }, () => setWeatherStatus('Location denied; you can still use the rest of DOGEUB.'), { timeout: 10000, maximumAge: 300000 });
  };
  const downloadShare = () => {
    const blob = new Blob([shareText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'doge-drop.txt'; anchor.click();
    URL.revokeObjectURL(url);
    notify('Share note downloaded');
  };
  const tabs = [
    { id: 'desktop', label: 'Desktop', icon: LayoutDashboard },
    { id: 'workspaces', label: 'Workspaces', icon: AppWindow },
    { id: 'modes', label: 'Modes', icon: Zap },
    { id: 'school', label: 'School', icon: GraduationCap },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'ai', label: 'Doge AI', icon: Sparkles },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'world', label: 'World Clock', icon: Globe2 },
    { id: 'drop', label: 'DogeDrop', icon: Upload },
    { id: 'rescue', label: 'Doge Rescue', icon: Activity },
    { id: 'system', label: 'Task Manager', icon: Cpu },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'power', label: 'Startup / Shutdown', icon: Power },
  ];

  if (!open) return null;
  if (bootPreview) return (
    <div className="fixed inset-0 z-[21000] flex flex-col items-center justify-center overflow-hidden px-5 text-white" style={{ backgroundColor: '#000000' }}>
      <div className="mb-16 flex h-24 w-24 -skew-y-2 flex-col gap-[4px]" aria-label="Windows 10 logo">
        <div className="flex flex-1 gap-[3px]"><span className="flex-1 bg-white" /><span className="flex-1 bg-white" /></div>
        <div className="flex flex-1 gap-[3px]"><span className="flex-1 bg-white" /><span className="flex-1 bg-white" /></div>
      </div>
      <div className="mb-2 text-sm font-normal">DOGEUB</div>
      <div className="mb-8 text-xs text-white/90">Starting</div>
      <div className="mb-10 h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-label="Loading" />
      <button className="rounded-md border border-white/60 px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => { setBootPreview(false); }}>Skip startup</button>
      <div className="absolute bottom-7 text-[10px] text-white/70">Windows 10 startup preview</div>
    </div>
  );

  if (shutdownPreview) return (
    <div
      role="status"
      aria-label="Shutting down Windows"
      className="fixed inset-0 z-[21000] flex flex-col items-center justify-center overflow-hidden px-5 text-white"
      style={{ backgroundColor: '#0078d7' }}
    >
      <div className="text-base font-normal tracking-wide">Shutting down</div>
      <div className="mt-7 flex h-8 items-center justify-center" aria-hidden="true">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      </div>
      <button
        className="absolute bottom-7 rounded-md border border-white/60 px-4 py-2 text-xs text-white hover:bg-white/10"
        onClick={() => { setShutdownPreview(false); setOpen(false); }}
      >
        Return to DOGEUB
      </button>
      <div className="absolute bottom-2 text-[10px] text-white/70">Windows 10-style shutdown preview</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11990] flex items-center justify-center bg-black/70 p-2 text-white backdrop-blur-md sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="flex h-[min(92vh,850px)] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/15 bg-[#080d18]/95 shadow-2xl" style={{ boxShadow: '0 20px 100px ' + theme.glow }}>
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-white/[.025] p-3 sm:flex">
          <div className="flex items-center gap-3 px-2 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 font-black" style={{ color: theme.accent, backgroundColor: theme.glow }}>D.</div><div><div className="font-bold tracking-wide">DOGE NEXUS</div><div className="text-[10px] text-white/40">SPATIAL CONTROL CENTER</div></div></div>
          <div className="my-2 h-px bg-white/10" />
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ' + (tab === item.id ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white')} style={tab === item.id ? { boxShadow: 'inset 2px 0 ' + theme.accent } : undefined}><Icon size={17} style={tab === item.id ? { color: theme.accent } : undefined} />{item.label}</button>; })}
          </nav>
          <button onClick={() => setBootPreview(true)} className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/65 hover:bg-white/10"><Power size={15} /> Preview boot screen</button>
          <div className="mt-3 flex items-center justify-between px-2 text-[10px] text-white/35"><span>NEXUS v1.0</span><span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: theme.accent }}>MAX CREATIVITY MODE</div><div className="truncate text-lg font-semibold">{tabs.find((item) => item.id === tab)?.label || 'Desktop'}</div></div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55 md:flex"><Clock3 size={14} />{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
            <button onClick={() => setOpen(false)} aria-label="Close Doge Nexus" className="rounded-xl border border-white/10 p-2 text-white/65 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1 sm:hidden">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={'shrink-0 rounded-full border px-3 py-2 text-xs ' + (tab === item.id ? 'border-white/25 bg-white/10' : 'border-white/10 text-white/55')} style={tab === item.id ? { color: theme.accent } : undefined}>{item.label}</button>)}</div>
            {tab === 'desktop' && <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 p-5 sm:p-7" style={{ background: 'radial-gradient(ellipse at top right, ' + theme.glow + ', transparent 55%), rgba(255,255,255,.025)' }}>
                <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.25em] text-white/45">{saved.workspace} workspace</div><h2 className="mt-2 text-3xl font-black sm:text-5xl">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</h2><p className="mt-2 text-sm text-white/55">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div><div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><div className="text-xs text-white/45">Active mode</div><div className="mt-1 flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: theme.accent }} />{saved.mode}</div></div></div>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[['Workspace', saved.workspace, AppWindow], ['Tasks done', completedTasks + ' / ' + saved.tasks.length, Check], ['Achievements', saved.achievements.length, Award], ['Connection', navigator.onLine ? 'Online' : 'Offline', Wifi]].map(([label, value, Icon]) => <Card key={label}><Icon size={18} style={{ color: theme.accent }} /><div className="mt-3 text-xl font-bold">{value}</div><div className="text-xs text-white/45">{label}</div></Card>)}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card><Label>Quick launch</Label><div className="grid grid-cols-2 gap-2">{[['Recommended sites','/recommended'],['Browser','/search'],['Settings','/settings'],['Apps library','/materials']].map(([name,path]) => <button key={name} onClick={() => { window.location.href = path; }} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-left text-sm hover:bg-white/10">{name}<ChevronRight size={15} /></button>)}</div></Card>
                <Card><div className="flex items-center justify-between"><Label>Weather widget</Label><CloudSun size={17} style={{ color: theme.accent }} /></div>{weather ? <><div className="text-3xl font-bold">{weather.temp}°C</div><div className="text-sm text-white/55">{weather.condition}</div></> : <p className="text-sm text-white/55">Optional local weather—only fetches after you choose to share location.</p>}<button onClick={getWeather} className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold text-black" style={{ backgroundColor: theme.accent }}>Update weather</button><p className="mt-2 text-[11px] text-white/35">{weatherStatus}</p></Card>
              </div>
              <Card><Label>Desktop shortcuts</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tabs.filter((item) => ['school','gaming','ai','terminal','themes','rescue'].includes(item.id)).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left hover:bg-white/10"><Icon size={20} style={{ color: theme.accent }} /><span className="text-sm">{item.label}</span></button>; })}</div></Card>
            </div>}

            {tab === 'workspaces' && <div className="space-y-4"><h2 className="text-2xl font-bold">Your multiverse</h2><p className="text-sm text-white/50">Switch your active context in one click. Workspaces save your selected mode in this browser.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{WORKSPACES.map((workspace, index) => <button key={workspace} onClick={() => { setSaved((old) => ({ ...old, workspace })); notify(workspace + ' workspace selected'); }} className={'rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ' + (saved.workspace === workspace ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[.025] hover:bg-white/5')}><div className="flex items-center justify-between"><AppWindow style={{ color: theme.accent }} /><span className="text-xs text-white/40">0{index + 1}</span></div><div className="mt-5 text-lg font-bold">{workspace}</div><p className="mt-1 text-xs text-white/45">{({Home:'Everyday desktop',Gaming:'Game launchers and sessions',School:'Homework and focus',Coding:'Terminal and developer links',Chill:'Music, themes, and relaxing tools'})[workspace]}</p>{saved.workspace === workspace && <div className="mt-3 text-xs" style={{ color: theme.accent }}>ACTIVE WORKSPACE</div>}</button>)}</div><Card><Label>Fast switch</Label><div className="flex flex-wrap gap-2">{WORKSPACES.map((workspace) => <button key={workspace} onClick={() => setSaved((old) => ({ ...old, workspace }))} className="rounded-full border border-white/10 px-3 py-2 text-xs hover:bg-white/10">{workspace}</button>)}</div></Card></div>}

            {tab === 'modes' && <div className="space-y-4"><h2 className="text-2xl font-bold">One desktop. Five personalities.</h2><p className="text-sm text-white/50">Modes adjust DOGEUB’s selected workspace and shortcuts; they do not change Windows system settings.</p><div className="grid gap-3 sm:grid-cols-2">{WORKSPACES.map((mode) => { const Icon = mode === 'Gaming' ? Gamepad2 : mode === 'School' ? BookOpen : mode === 'Coding' ? Terminal : mode === 'Chill' ? Sparkles : LayoutDashboard; return <button key={mode} onClick={() => changeMode(mode)} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left hover:bg-white/[.08]"><Icon size={24} style={{ color: theme.accent }} /><div className="mt-4 flex items-center justify-between"><span className="text-lg font-bold">{mode} Mode</span>{saved.mode === mode && <Check size={17} style={{ color: theme.accent }} />}</div><p className="mt-1 text-sm text-white/45">{({Home:'Balanced everyday setup.',Gaming:'Game links, session tracking, and less clutter.',School:'Assignments, deadlines, and focus.',Coding:'Terminal, GitHub, and developer workflow.',Chill:'Music links, cozy colors, and a relaxed workspace.'})[mode]}</p></button>; })}</div><button onClick={() => setBootPreview(true)} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/10"><Power size={16} /> Watch boot sequence preview</button></div>}

            {tab === 'school' && <div className="space-y-4"><div><h2 className="text-2xl font-bold">School Command Center</h2><p className="mt-1 text-sm text-white/50">A lightweight planner saved to this browser.</p></div><Card><Label>New assignment</Label><form onSubmit={(event) => { event.preventDefault(); addTask(); }} className="flex gap-2"><input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="e.g. Math worksheet, due Friday" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-white/30" /><button className="rounded-xl px-4 text-sm font-bold text-black" style={{ backgroundColor: theme.accent }}><Plus size={17} /></button></form><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: (saved.tasks.length ? completedTasks / saved.tasks.length * 100 : 0) + '%', backgroundColor: theme.accent }} /></div><div className="mt-2 text-xs text-white/45">{completedTasks} of {saved.tasks.length} tasks complete</div><div className="mt-4 space-y-2">{saved.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><button onClick={() => setSaved((old) => ({ ...old, tasks: old.tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item) }))} className={'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ' + (task.done ? 'border-transparent' : 'border-white/25')} style={task.done ? { backgroundColor: theme.accent, color: '#06111a' } : undefined}>{task.done && <Check size={13} />}</button><span className={'min-w-0 flex-1 text-sm ' + (task.done ? 'text-white/35 line-through' : '')}>{task.title}</span><button onClick={() => setSaved((old) => ({ ...old, tasks: old.tasks.filter((item) => item.id !== task.id) }))} aria-label="Delete task" className="text-white/30 hover:text-rose-300"><Trash2 size={15} /></button></div>)}</div></Card><button onClick={() => { window.dispatchEvent(new CustomEvent('dogeub-open-hub', { detail: { tab: 'widgets' } })); notify('Opened Doge Hub widgets'); }} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/10"><BookOpen size={16} /> Open Doge Hub widgets</button></div>}

            {tab === 'gaming' && <div className="space-y-4"><h2 className="text-2xl font-bold">Gamer Mode</h2><p className="text-sm text-white/50">Launch your games and keep track of sessions. Browser-only tools cannot measure every game’s FPS or change GPU settings.</p><div className="grid gap-3 sm:grid-cols-2">{[{name:'Roblox',url:'https://www.roblox.com',desc:'Games and experiences'},{name:'Steam',url:'https://store.steampowered.com',desc:'PC game library'},{name:'Xbox Cloud Gaming',url:'https://www.xbox.com/play',desc:'Cloud gaming, where available'},{name:'GeForce NOW',url:'https://play.geforcenow.com',desc:'Cloud gaming, where available'}].map((game) => <button key={game.name} onClick={() => window.open(game.url, '_blank', 'noopener,noreferrer')} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left hover:bg-white/10"><div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: theme.glow }}><Gamepad2 style={{ color: theme.accent }} /></div><div className="min-w-0 flex-1"><div className="font-semibold">{game.name}</div><div className="text-xs text-white/45">{game.desc}</div></div><ArrowRight size={16} /></button>)}</div><Card><Label>Session tracker</Label><div className="text-3xl font-bold tabular-nums">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div><p className="mt-1 text-xs text-white/45">Live clock for your gaming session. Keep breaks in your routine.</p><button onClick={() => notify('Game session noted at ' + now.toLocaleTimeString())} className="mt-3 rounded-xl px-3 py-2 text-xs font-bold text-black" style={{ backgroundColor: theme.accent }}>Mark session checkpoint</button></Card></div>}

            {tab === 'ai' && <div className="flex h-full min-h-[450px] flex-col gap-4"><div><h2 className="text-2xl font-bold">Doge AI <span className="text-sm font-normal text-white/40">· local preview</span></h2><p className="mt-1 text-sm text-white/50">UI and starter help are ready; live generative answers require a secure server-side AI integration.</p></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">{aiMessages.map((message, index) => <div key={index} className={'max-w-[92%] rounded-2xl p-3 text-sm leading-relaxed ' + (message.role === 'user' ? 'ml-auto bg-white/10' : 'border border-white/10 bg-white/[.04]')}>{message.text}</div>)}</div><form onSubmit={askLocal} className="flex gap-2"><input value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder="Ask about DOGEUB or your workflow…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-white/30" /><button className="rounded-xl px-4 text-black" style={{ backgroundColor: theme.accent }}><Send size={17} /></button></form><div className="text-[11px] text-white/35">Never put an AI secret key in browser JavaScript. Use a backend endpoint for real AI.</div></div>}

            {tab === 'terminal' && <div className="space-y-4"><div><h2 className="text-2xl font-bold">Doge Terminal</h2><p className="mt-1 text-sm text-white/50">A safe command palette for DOGEUB features, not a Windows shell.</p></div><div className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#020906] font-mono text-sm"><div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs text-emerald-300"><Terminal size={15} /> DOGEUB://terminal <span className="ml-auto text-white/30">Ctrl+K</span></div><div className="max-h-[360px] min-h-[240px] space-y-2 overflow-y-auto p-4">{terminalLines.map((line, index) => <div key={index} className={line.startsWith('›') ? 'text-emerald-200' : 'break-words text-white/65'}>{line}</div>)}</div><form onSubmit={runCommand} className="flex border-t border-white/10"><span className="px-4 py-3 text-emerald-300">›</span><input value={terminalInput} onChange={(event) => setTerminalInput(event.target.value)} autoComplete="off" spellCheck="false" placeholder="type help…" className="min-w-0 flex-1 bg-transparent py-3 pr-3 outline-none" /></form></div><div className="flex flex-wrap gap-2">{['help','time','theme aurora','mode School','open recommended'].map((command) => <button key={command} onClick={() => { setTerminalInput(command); }} className="rounded-full border border-white/10 px-3 py-2 font-mono text-xs text-white/65 hover:bg-white/10">{command}</button>)}</div></div>}

            {tab === 'themes' && <div className="space-y-4"><h2 className="text-2xl font-bold">Theme Marketplace</h2><p className="text-sm text-white/50">Built-in themes are one click and saved locally. Community theme installs can be added later.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{THEMES.map((item) => <button key={item.id} onClick={() => { setSaved((old) => ({ ...old, theme: item.id })); notify(item.name + ' theme applied'); }} className={'rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ' + (saved.theme === item.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[.025]')}><div className="h-24 rounded-xl border border-white/10" style={{ background: 'radial-gradient(circle at 25% 25%, ' + item.glow + ', transparent 60%), linear-gradient(135deg,#0b1220,#121a2d)' }}><div className="flex h-full items-end gap-1 p-3"><span className="h-2 w-10 rounded-full" style={{ backgroundColor: item.accent }} /><span className="h-2 w-5 rounded-full bg-white/20" /><span className="h-2 w-8 rounded-full bg-white/10" /></div></div><div className="mt-3 flex items-center justify-between font-semibold">{item.name}{saved.theme === item.id && <Check size={16} style={{ color: item.accent }} />}</div><div className="mt-1 text-xs text-white/45">{item.description}</div></button>)}</div><Card><Label>Custom accent color</Label><div className="flex flex-wrap items-center gap-3"><input aria-label="Custom accent color" type="color" value={theme.accent} onChange={(event) => setSaved((old) => ({ ...old, theme: 'custom', customAccent: event.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent" /><span className="text-sm text-white/60">{saved.customAccent || theme.accent}</span><button onClick={() => { const custom = saved.customAccent; if (custom) { setSaved((old) => ({ ...old, theme: 'custom', customAccent: custom })); document.documentElement.style.setProperty('--dogeub-os-accent', custom); notify('Custom accent selected'); } }} className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10">Apply custom</button></div></Card><button onClick={() => setBootPreview(true)} className="rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/10">Preview boot animation</button></div>}

            {tab === 'world' && <div className="space-y-4"><h2 className="text-2xl font-bold">DogeWorld</h2><p className="text-sm text-white/50">World clocks use your browser’s time-zone database. No location access needed.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[{name:'New York',zone:'America/New_York'},{name:'Los Angeles',zone:'America/Los_Angeles'},{name:'London',zone:'Europe/London'},{name:'Tokyo',zone:'Asia/Tokyo'},{name:'Dubai',zone:'Asia/Dubai'},{name:'Sydney',zone:'Australia/Sydney'}].map((city) => <Card key={city.zone}><div className="flex items-center gap-2 text-sm text-white/50"><Globe2 size={15} style={{ color: theme.accent }} />{city.name}</div><div className="mt-3 text-2xl font-bold tabular-nums">{now.toLocaleTimeString([], { timeZone: city.zone, hour: 'numeric', minute: '2-digit' })}</div><div className="mt-1 text-xs text-white/35">{now.toLocaleDateString([], { timeZone: city.zone, weekday: 'short', month: 'short', day: 'numeric' })}</div></Card>)}</div><Card><Label>Time zone info</Label><div className="text-sm text-white/60">Your browser time: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'}</div></Card></div>}

            {tab === 'drop' && <div className="space-y-4"><h2 className="text-2xl font-bold">DogeDrop</h2><p className="text-sm text-white/50">Prepare a small note or link to share. This browser-only version downloads a text file; cross-device transfers need a receiver or server.</p><Card><Label>Share note or link</Label><textarea value={shareText} onChange={(event) => setShareText(event.target.value)} placeholder="Paste a link, a note, or instructions…" rows={7} className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-white/30" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={downloadShare} disabled={!shareText.trim()} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40" style={{ backgroundColor: theme.accent }}><Download size={15} /> Download .txt</button><button onClick={async () => { try { await navigator.clipboard.writeText(shareText); notify('Copied to clipboard'); } catch { notify('Clipboard access blocked by browser'); } }} disabled={!shareText.trim()} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40"><Copy size={15} /> Copy</button><button onClick={async () => { if (navigator.share) { try { await navigator.share({ title: 'DogeDrop', text: shareText }); } catch {} } else notify('Share sheet is not supported in this browser'); }} disabled={!shareText.trim()} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40"><Send size={15} /> Share</button></div></Card><Card><Label>Transfer status</Label><div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-amber-300" /> Local-only mode</div><p className="mt-2 text-xs text-white/40">Nothing is uploaded automatically. A real nearby transfer feature would require a receiver session and a secure transport.</p></Card></div>}

            {tab === 'system' && <div className="space-y-5">
              <div><h2 className="text-2xl font-bold">Task Manager</h2><p className="mt-1 text-sm text-white/50">Detailed device and browser diagnostics for DOGEUB. Web pages cannot directly inspect Windows hardware or live system-wide CPU/RAM usage.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[{label:'Processor / CPU',value:(hardwareInfo.cpuThreads ? hardwareInfo.cpuThreads + ' logical processors' : 'CPU thread count hidden'),detail:'Platform: ' + hardwareInfo.platform + '. Browsers do not expose the exact CPU model (for example, Ryzen 5 220) or live CPU usage to ordinary websites.'},{label:'Installed memory',value:(navigator.deviceMemory ? 'About ' + navigator.deviceMemory + ' GB reported' : 'Not exposed'),detail:'Browser estimate only; not an exact RAM reading.'},{label:'Graphics card / integrated GPU',value:hardwareInfo.graphics,detail:(hardwareInfo.browserMayMaskGraphics ? 'This appears to be a software renderer, not necessarily your physical GPU. Try a normal browser session with hardware acceleration enabled.' : 'Detected through WebGL. This may identify integrated Radeon/Intel graphics or a dedicated GPU, but browsers can mask the exact model. GPU usage is not available.')},{label:'Storage device',value:'NVMe type / physical size unavailable',detail:'Web APIs cannot identify your SSD model, NVMe interface, or total drive capacity.'},{label:'Browser storage quota',value:'Checking…',detail:'This is website storage space, not the size of your SSD.'},{label:'Network',value:navigator.onLine?'Online':'Offline',detail:(navigator.connection && navigator.connection.effectiveType ? 'Connection estimate: '+navigator.connection.effectiveType : 'Connection speed details not exposed')}].map((item) => <Card key={item.label}><div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/45"><Cpu size={15} style={{color:theme.accent}} />{item.label}</div><div className="mt-3 text-lg font-semibold">{item.value}</div><p className="mt-2 text-xs leading-relaxed text-white/40">{item.detail}</p></Card>)}
              </div>
              <Card><div className="flex items-center justify-between gap-3"><div><Label>Browser storage estimate</Label><div className="text-sm text-white/65">Quota and usage for this site only</div></div><HardDrive size={22} style={{color:theme.accent}} /></div><div id="dogeub-storage-estimate" className="mt-3 text-sm text-white/60">Reading browser storage estimate…</div><button onClick={async () => { const node=document.getElementById('dogeub-storage-estimate'); try { if (!navigator.storage?.estimate) { node.textContent='Storage estimate API not supported by this browser.'; return; } const estimate=await navigator.storage.estimate(); const fmt=(n)=>typeof n==='number'?(n/1024/1024/1024).toFixed(2)+' GB':'Unknown'; node.textContent='Used: '+fmt(estimate.usage)+' · Site quota: '+fmt(estimate.quota)+' · These figures are not physical SSD capacity.'; } catch { node.textContent='Browser did not allow a storage estimate.'; } }} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10">Refresh estimate</button></Card>
              <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Processes</Label><div className="text-lg font-semibold">Browser-visible process overview</div></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">Limited access</span></div><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="py-2 pr-4 font-medium">Process</th><th className="py-2 pr-4 font-medium">Status</th><th className="py-2 pr-4 font-medium">Memory</th><th className="py-2 font-medium">CPU</th></tr></thead><tbody className="divide-y divide-white/10"><tr><td className="py-3 pr-4">DOGEUB tab</td><td className="py-3 pr-4 text-emerald-300">Running</td><td className="py-3 pr-4">{performance.memory?.usedJSHeapSize ? Math.round(performance.memory.usedJSHeapSize/1048576)+' MB JS heap' : 'Not exposed'}</td><td className="py-3 text-white/45">Not exposed</td></tr><tr><td className="py-3 pr-4">Other browser tabs</td><td className="py-3 pr-4 text-white/45">Hidden from this page</td><td className="py-3 pr-4">Unavailable</td><td className="py-3 text-white/45">Unavailable</td></tr><tr><td className="py-3 pr-4">Windows processes</td><td className="py-3 pr-4 text-white/45">Access blocked</td><td className="py-3 pr-4">Unavailable</td><td className="py-3 text-white/45">Unavailable</td></tr></tbody></table></div><p className="mt-3 text-xs leading-relaxed text-white/40">This is a DOGEUB-only dashboard, not Windows Task Manager. For exact CPU model, live CPU usage, installed RAM, GPU load, and NVMe capacity, use Windows Settings or Task Manager on the device.</p></Card>
            </div>}
            {tab === 'rescue' && <div className="space-y-4"><h2 className="text-2xl font-bold">Doge Rescue</h2><p className="text-sm text-white/50">Browser-level diagnostics. This page cannot read Windows temperature, installed RAM, GPU load, or repair the operating system.</p><div className="grid gap-3 sm:grid-cols-2">{[{name:'Network',value:navigator.onLine?'Online':'Offline',good:navigator.onLine},{name:'Browser storage',value:(() => { try { return localStorage.length + ' keys accessible'; } catch { return 'Blocked'; } })(),good:true},{name:'Local storage',value:(() => { try { const key='dogeub-test'; localStorage.setItem(key,'ok'); localStorage.removeItem(key); return 'Read/write OK'; } catch { return 'Unavailable'; } })(),good:true},{name:'Secure context',value:window.isSecureContext?'HTTPS / secure':'Not secure',good:window.isSecureContext},{name:'Screen',value:window.screen.width+' × '+window.screen.height,good:true},{name:'Browser memory',value:performance.memory?.jsHeapSizeLimit ? Math.round(performance.memory.jsHeapSizeLimit/1048576)+' MB JS heap limit' : 'Not exposed',good:true}].map((item) => <Card key={item.name}><div className="flex items-center justify-between"><span className="text-sm text-white/50">{item.name}</span><Activity size={16} style={{ color: item.good ? theme.accent : '#fb7185' }} /></div><div className="mt-3 text-lg font-semibold">{item.value}</div><div className="mt-1 text-[10px] text-white/35">Browser-reported value</div></Card>)}</div><Card><Label>Quick repair tips</Label><ul className="list-disc space-y-2 pl-5 text-sm text-white/60"><li>If the page is stuck, refresh the tab and reopen DOGEUB.</li><li>If settings do not save, check browser site storage permissions.</li><li>If a shortcut fails, open the destination in a new tab to test it.</li><li>Never paste passwords or private API keys into the terminal.</li></ul><button onClick={() => { try { localStorage.setItem('dogeub-rescue-last-run', new Date().toISOString()); } catch {} notify('Diagnostics checklist completed'); }} className="mt-4 rounded-xl px-4 py-2.5 text-sm font-bold text-black" style={{ backgroundColor: theme.accent }}>Run checklist</button></Card></div>}

            {tab === 'power' && <div className="mx-auto max-w-4xl space-y-5"><div><div className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: theme.accent }}>Cinematic experience</div><h2 className="mt-2 text-3xl font-black">Every entrance deserves a moment.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">Customize the startup and shutdown previews. These are website-only screens, not changes to Windows itself.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="overflow-hidden rounded-3xl border border-white/10 bg-[#02040a] p-5"><div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-white/10" style={{ background: 'radial-gradient(ellipse at center, ' + theme.glow + ', transparent 70%)' }}><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 text-2xl font-black" style={{ color: theme.accent, boxShadow: '0 0 30px ' + theme.glow }}>D.</div><div className="mt-3 text-sm font-black tracking-[.25em]">DOGEUB <span style={{ color: theme.accent }}>OS</span></div><div className="mt-2 h-px w-24" style={{ backgroundColor: theme.accent }} /></div><h3 className="mt-4 text-lg font-bold">Startup sequence</h3><p className="mt-1 text-xs leading-relaxed text-white/45">A clean blue welcome screen with a simple logo and a familiar loading bar.</p><button onClick={() => { setShutdownPreview(false); setBootPreview(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-black" style={{ backgroundColor: theme.accent }}><Zap size={16} /> Preview startup</button></div><div className="overflow-hidden rounded-3xl border border-white/10 bg-[#02040a] p-5"><div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-white/10" style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,.18), transparent 70%)' }}><Power size={34} className="text-white/70" /><div className="mt-3 text-sm font-black tracking-[.25em]">SESSION <span style={{ color: theme.accent }}>ENDED</span></div><div className="mt-2 h-px w-24 bg-white/20" /></div><h3 className="mt-4 text-lg font-bold">Shutdown sequence</h3><p className="mt-1 text-xs leading-relaxed text-white/45">A classic Windows 10-style blue screen with “Shutting down” and a loading spinner.</p><button onClick={() => { setBootPreview(false); setShutdownPreview(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 py-3 text-sm font-semibold hover:bg-white/10"><Power size={16} /> Preview shutdown</button></div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-start gap-3"><Sparkles size={19} style={{ color: theme.accent }} /><div><div className="font-semibold">Your theme, your boot</div><p className="mt-1 text-xs leading-relaxed text-white/45">The startup screen uses a black Windows-style screen; shutdown uses the classic Windows 10 blue screen and spinner.</p></div></div></div></div>}

            {tab === 'achievements' && <div className="space-y-4"><h2 className="text-2xl font-bold">Achievements</h2><p className="text-sm text-white/50">Little rewards for exploring DOGE NEXUS. Progress is saved in this browser.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[{name:'First Steps',desc:'Complete your first planner task',icon:Check},{name:'Task Crusher',desc:'Complete three planner tasks',icon:Zap},{name:'Dimension Hopper',desc:'Switch to another workspace',icon:AppWindow},{name:'Style Shifter',desc:'Try a different theme',icon:Palette},{name:'Game Face',desc:'Activate Gaming Mode',icon:Gamepad2}].map((item) => { const Icon = item.icon; const unlocked = saved.achievements.includes(item.name); return <Card key={item.name} className={unlocked ? 'border-white/25' : 'opacity-60'}><div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: unlocked ? theme.glow : 'rgba(255,255,255,.05)' }}><Icon style={{ color: unlocked ? theme.accent : '#64748b' }} /></div>{unlocked ? <Check size={17} style={{ color: theme.accent }} /> : <span className="text-xs text-white/30">LOCKED</span>}</div><div className="mt-4 font-semibold">{item.name}</div><p className="mt-1 text-xs text-white/45">{item.desc}</p></Card>; })}</div><button onClick={() => { setSaved((old) => ({ ...old, achievements: [] })); notify('Achievement display reset'); }} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"><Trash2 size={14} /> Reset achievements</button></div>}
          </main>
        </div>
      </section>
      {toast && <div className="fixed bottom-5 left-1/2 z-[12010] -translate-x-1/2 rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm shadow-xl">{toast}</div>}
    </div>
  );
}
