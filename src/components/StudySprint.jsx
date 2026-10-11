import { useEffect, useMemo, useState } from 'react';
import { Check, Circle, Clock3, ListTodo, Pause, Play, Plus, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import { useOptions } from '../utils/optionsContext';
import theme from '../styles/theming.module.css';

const STORAGE_KEY = 'studylive-study-sprint';
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const readSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      completedSessions: Number.isFinite(saved.completedSessions) ? saved.completedSessions : 0,
    };
  } catch {
    return { tasks: [], completedSessions: 0 };
  }
};

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

export default function StudySprint() {
  const { options } = useOptions();
  const [saved] = useState(readSaved);
  const [tasks, setTasks] = useState(saved.tasks);
  const [completedSessions, setCompletedSessions] = useState(saved.completedSessions);
  const [mode, setMode] = useState('focus');
  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [draft, setDraft] = useState('');

  const completedCount = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const duration = mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
  const { backgroundColor, color } = useMemo(() => ({
    backgroundColor: options.quickModalBgColor || '#182235',
    color: options.textColor || 'inherit',
  }), [options.quickModalBgColor, options.textColor]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, completedSessions }));
    } catch {
      // The timer and checklist still work if storage is unavailable.
    }
  }, [tasks, completedSessions]);

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          if (mode === 'focus') setCompletedSessions((count) => count + 1);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode]);

  const switchMode = (nextMode) => {
    setRunning(false);
    setMode(nextMode);
    setSeconds(nextMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const addTask = (event) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((current) => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, done: false }]);
    setDraft('');
  };

  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const removeTask = (id) => setTasks((current) => current.filter((task) => task.id !== id));

  return (
    <section className="w-full px-4 mt-7 mb-8">
      <div
        className={`mx-auto w-full max-w-[40rem] overflow-hidden rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl ${theme.searchBarColor || ''}`}
        style={{ backgroundColor, color }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <Clock3 size={21} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Study Sprint</h2>
              <p className="text-xs opacity-65">A little focus goes a long way.</p>
            </div>
          </div>
          <div className="rounded-full bg-white/5 px-3 py-1.5 text-xs opacity-80">
            ⚡ {completedSessions} focus {completedSessions === 1 ? 'session' : 'sessions'}
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl bg-black/10 p-4">
            <div className="mb-4 flex rounded-full bg-black/15 p-1 text-xs">
              <button type="button" onClick={() => switchMode('focus')} className={`rounded-full px-3 py-1.5 transition ${mode === 'focus' ? 'bg-violet-500 text-white shadow' : 'opacity-70 hover:opacity-100'}`}>Focus</button>
              <button type="button" onClick={() => switchMode('break')} className={`rounded-full px-3 py-1.5 transition ${mode === 'break' ? 'bg-emerald-500 text-white shadow' : 'opacity-70 hover:opacity-100'}`}>Break</button>
            </div>
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(${mode === 'focus' ? '#a78bfa' : '#34d399'} ${(seconds / duration) * 100}%, rgba(255,255,255,.09) 0)` }}>
              <div className="flex h-[calc(100%-10px)] w-[calc(100%-10px)] flex-col items-center justify-center rounded-full" style={{ backgroundColor }}>
                <span className="text-3xl font-semibold tabular-nums tracking-tight">{formatTime(seconds)}</span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-60">{mode === 'focus' ? 'Time to focus' : 'Take a breather'}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={() => setRunning((value) => !value)} className="flex min-w-28 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400">
                {running ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                {running ? 'Pause' : seconds === 0 ? 'Start again' : 'Start'}
              </button>
              <button type="button" title="Reset timer" aria-label="Reset timer" onClick={() => { setRunning(false); setSeconds(duration); }} className="rounded-lg bg-white/10 p-2.5 transition hover:bg-white/15"><RotateCcw size={16} /></button>
              <button type="button" title="Switch timer mode" aria-label="Switch timer mode" onClick={() => switchMode(mode === 'focus' ? 'break' : 'focus')} className="rounded-lg bg-white/10 p-2.5 transition hover:bg-white/15"><SkipForward size={16} /></button>
            </div>
            {seconds === 0 && <p className="mt-3 text-center text-xs opacity-70">{mode === 'focus' ? 'Sprint complete! Take a short break.' : 'Break finished. Ready for another sprint?'}</p>}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><ListTodo size={17} className="opacity-75" /><h3 className="text-sm font-semibold">My study checklist</h3></div>
              <span className="text-xs opacity-65">{completedCount}/{tasks.length}</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <form onSubmit={addTask} className="mb-3 flex gap-2">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={100} placeholder="Add homework or a goal…" aria-label="New study task" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm outline-none placeholder:opacity-45 focus:border-violet-400/70" />
              <button type="submit" disabled={!draft.trim()} aria-label="Add task" className="rounded-lg bg-white/10 px-3 text-violet-300 transition hover:bg-white/15 disabled:opacity-35"><Plus size={18} /></button>
            </form>
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 px-3 py-5 text-center text-xs opacity-60">Add your first task and start checking things off ✨</div>
              ) : tasks.map((task) => (
                <div key={task.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-white/5">
                  <button type="button" onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${task.done ? 'border-emerald-400 bg-emerald-400 text-slate-900' : 'border-white/30 hover:border-violet-300'}`}>
                    {task.done ? <Check size={12} /> : <Circle size={12} className="opacity-0" />}
                  </button>
                  <span className={`min-w-0 flex-1 break-words text-sm ${task.done ? 'opacity-45 line-through' : ''}`}>{task.title}</span>
                  <button type="button" onClick={() => removeTask(task.id)} aria-label={`Delete ${task.title}`} className="rounded p-1 opacity-0 transition hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {tasks.length > 0 && completedCount > 0 && <button type="button" onClick={() => setTasks((current) => current.filter((task) => !task.done))} className="mt-3 text-xs opacity-55 transition hover:opacity-100">Clear completed tasks</button>}
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-center text-[11px] opacity-55">Your checklist and session count stay saved on this device.</div>
      </div>
    </section>
  );
}
