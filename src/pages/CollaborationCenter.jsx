import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersRound, Plus, Trash2, Check, MessageCircle, UserRound, FileText, ClipboardList, ExternalLink, Copy, Clock3, ArrowUpRight } from 'lucide-react';
import Nav from '../layouts/Nav';

const STORAGE_KEY = 'dogeub-collaboration-center-v1';
const makeWorkspace = (name) => ({ id: 'workspace-' + Date.now(), name, createdAt: Date.now(), tasks: [], notes: '' });
function readWorkspaces() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
const initial = () => readWorkspaces();

export default function CollaborationCenter() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState(initial);
  const [activeId, setActiveId] = useState(() => initial()[0]?.id || '');
  const [workspaceName, setWorkspaceName] = useState('');
  const [taskText, setTaskText] = useState('');
  const [toast, setToast] = useState('');
  const active = workspaces.find((workspace) => workspace.id === activeId) || workspaces[0] || null;
  const completed = useMemo(() => active?.tasks.filter((task) => task.done).length || 0, [active]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces)); } catch {} }, [workspaces]);
  useEffect(() => { if (!activeId && workspaces[0]) setActiveId(workspaces[0].id); }, [activeId, workspaces]);

  const updateActive = (updater) => setWorkspaces((items) => items.map((item) => item.id === active?.id ? updater(item) : item));
  const createWorkspace = (event) => {
    event.preventDefault();
    const name = workspaceName.trim().slice(0, 48);
    if (!name) return;
    const workspace = makeWorkspace(name);
    setWorkspaces((items) => [workspace, ...items].slice(0, 20));
    setActiveId(workspace.id);
    setWorkspaceName('');
    setToast('Workspace created in this browser.');
  };
  const addTask = (event) => {
    event.preventDefault();
    if (!active || !taskText.trim()) return;
    const task = { id: 'task-' + Date.now(), text: taskText.trim().slice(0, 160), done: false, createdAt: Date.now() };
    updateActive((item) => ({ ...item, tasks: [task, ...item.tasks].slice(0, 100) }));
    setTaskText('');
  };
  const deleteWorkspace = () => {
    if (!active || !window.confirm('Delete this local workspace and its notes/tasks?')) return;
    const remaining = workspaces.filter((item) => item.id !== active.id);
    setWorkspaces(remaining);
    setActiveId(remaining[0]?.id || '');
    setToast('Workspace deleted.');
  };
  const exportWorkspace = () => {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-workspace.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const copyInviteInfo = async () => {
    const text = 'DOGEUB Collaboration workspace: ' + (active?.name || 'Untitled') + '\nOpen DOGEUB Collaboration Center at ' + window.location.origin + '/collaboration-center\nWorkspace data is stored locally in this browser; this is not a shareable invite yet.';
    try { await navigator.clipboard.writeText(text); setToast('Workspace details copied. This is not a live invite link.'); }
    catch { setToast('Clipboard unavailable. Use Export workspace to share a JSON copy.'); }
  };

  return <div className="min-h-screen text-white"><Nav/><main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-violet-200">DOGEUB WORKSPACE</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Collaboration Center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Organize a project, keep shared-work style notes and tasks, then jump into DOGEUB Messages or Social Center to work with people.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-200/[.06] px-3 py-2 text-xs text-violet-100"><UsersRound size={15}/> Team workspace</span></div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/65 p-4"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Workspaces</h2><span className="text-[10px] text-slate-600">{workspaces.length}/20</span></div>
        <form onSubmit={createWorkspace} className="mt-3 flex gap-2"><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={48} placeholder="New workspace" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs outline-none focus:border-violet-200/40"/><button disabled={!workspaceName.trim() || workspaces.length >= 20} aria-label="Create workspace" className="rounded-xl bg-violet-200 px-3 text-slate-950 disabled:opacity-40"><Plus size={16}/></button></form>
        <div className="mt-4 space-y-1">{workspaces.map((workspace) => <button key={workspace.id} onClick={() => setActiveId(workspace.id)} className={'w-full rounded-xl px-3 py-3 text-left transition ' + (workspace.id === active?.id ? 'border border-violet-200/20 bg-violet-200/[.08]' : 'border border-transparent hover:bg-white/[.04]')}><span className="block truncate text-sm font-semibold">{workspace.name}</span><span className="mt-1 block text-[10px] text-slate-500">{workspace.tasks.length} tasks · {new Date(workspace.createdAt).toLocaleDateString()}</span></button>)}</div>
        {workspaces.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-slate-500">Create a workspace to start planning a project.</p>}
      </aside>
      <div className="min-w-0 space-y-4">
        {!active ? <section className="grid min-h-[360px] place-items-center rounded-3xl border border-white/10 bg-slate-950/50 p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-200/10 text-violet-100"><UsersRound size={25}/></span><h2 className="mt-4 text-lg font-semibold">Start a workspace</h2><p className="mt-2 text-sm text-slate-500">Create one on the left to keep project notes and tasks.</p></div></section> : <>
          <section className="rounded-3xl border border-white/10 bg-slate-950/65 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-200">ACTIVE WORKSPACE</p><h2 className="mt-2 text-2xl font-bold">{active.name}</h2><p className="mt-1 text-xs text-slate-500">Created {new Date(active.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><button onClick={copyInviteInfo} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold hover:bg-white/[.05]"><Copy size={14}/> Share details</button><button onClick={exportWorkspace} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold hover:bg-white/[.05]"><FileText size={14}/> Export JSON</button><button onClick={deleteWorkspace} className="rounded-xl border border-rose-200/15 p-2.5 text-rose-200/70 hover:bg-rose-200/[.06]" title="Delete workspace"><Trash2 size={14}/></button></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><ClipboardList size={17} className="text-violet-200"/><p className="mt-3 text-2xl font-bold">{active.tasks.length}</p><p className="mt-1 text-xs text-slate-500">Tasks</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><Check size={17} className="text-emerald-200"/><p className="mt-3 text-2xl font-bold">{completed}</p><p className="mt-1 text-xs text-slate-500">Completed</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><Clock3 size={17} className="text-cyan-200"/><p className="mt-3 text-2xl font-bold">{Math.max(0, active.tasks.length - completed)}</p><p className="mt-1 text-xs text-slate-500">Remaining</p></div></div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-slate-950/65 p-5"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><FileText size={17} className="text-violet-200"/> Project notes</h3><span className="text-[10px] text-slate-600">Auto-saved locally</span></div><textarea value={active.notes} onChange={(event) => updateActive((item) => ({ ...item, notes: event.target.value.slice(0, 12000) }))} maxLength={12000} rows={6} placeholder="Meeting notes, ideas, links, decisions…" className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 outline-none placeholder:text-slate-600 focus:border-violet-200/30"/><p className="mt-1 text-right text-[10px] text-slate-600">{active.notes.length}/12000</p></section>
          <section className="rounded-3xl border border-white/10 bg-slate-950/65 p-5"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><ClipboardList size={17} className="text-cyan-200"/> Project tasks</h3><span className="text-xs text-slate-500">{completed}/{active.tasks.length}</span></div><form onSubmit={addTask} className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={taskText} onChange={(event) => setTaskText(event.target.value)} maxLength={160} placeholder="Add an action item…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-cyan-200/30"/><button disabled={!taskText.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 py-3 text-xs font-bold text-slate-950 disabled:opacity-40"><Plus size={15}/> Add task</button></form><div className="mt-3 space-y-2">{active.tasks.map((task) => <div key={task.id} className="flex items-start gap-3 rounded-xl border border-white/10 p-3"><input aria-label={'Mark ' + task.text + ' complete'} type="checkbox" checked={task.done} onChange={(event) => updateActive((item) => ({ ...item, tasks: item.tasks.map((entry) => entry.id === task.id ? { ...entry, done: event.target.checked } : entry) }))} className="mt-1 accent-cyan-200"/><p className={'min-w-0 flex-1 break-words text-sm ' + (task.done ? 'text-slate-500 line-through' : 'text-slate-200')}>{task.text}</p><button onClick={() => updateActive((item) => ({ ...item, tasks: item.tasks.filter((entry) => entry.id !== task.id) }))} aria-label="Delete task" className="text-slate-600 hover:text-rose-200"><Trash2 size={14}/></button></div>)}{active.tasks.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No tasks yet. Add the first action item above.</p>}</div></section>
        </>}
      </div>
    </div>
    <section className="mt-5 grid gap-3 md:grid-cols-2"><button onClick={() => navigate('/messages')} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left transition hover:border-cyan-200/25 hover:bg-cyan-200/[.04]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-200/10 text-cyan-100"><MessageCircle size={20}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">Open DOGEUB Messages</span><span className="mt-1 block text-xs text-slate-500">Group chats and direct conversations</span></span><ArrowUpRight size={17} className="text-slate-500 transition group-hover:text-cyan-100"/></button><button onClick={() => navigate('/social')} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left transition hover:border-violet-200/25 hover:bg-violet-200/[.04]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-200/10 text-violet-100"><UserRound size={20}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">Open Social Center</span><span className="mt-1 block text-xs text-slate-500">Find friends and check presence</span></span><ArrowUpRight size={17} className="text-slate-500 transition group-hover:text-violet-100"/></button></section>
    <p className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-100/[.025] p-4 text-xs leading-5 text-slate-500"><strong className="text-amber-100">Sync status:</strong> Workspaces, notes and tasks are currently saved only in this browser. They are not live-synced to other members yet. Use Export JSON to share a snapshot; real-time collaboration requires a shared server API.</p>
    {toast && <div role="status" className="fixed bottom-20 left-1/2 z-[18000] -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white shadow-xl">{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification" className="ml-4 text-slate-500 hover:text-white">×</button></div>}
  </main></div>;
}
