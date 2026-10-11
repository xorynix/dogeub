import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, Download, File as FileIcon, FileText,
  Film, FolderInput, FolderOpen, HardDrive, Image as ImageIcon, LayoutGrid, List, Music2, Pencil,
  Search, Trash2, Upload, X,
} from 'lucide-react';
import {
  FOLDERS, addFile, buildZip, deleteFiles, downloadBlob, formatSize, getUsage, listFiles,
  requestPersistence, updateFile,
} from '../utils/fileStore';

const FOLDER_ICONS = {
  Documents: FileText,
  Screenshots: Camera,
  Pictures: ImageIcon,
  Videos: Film,
  Music: Music2,
  Other: FileIcon,
};

const TEXT_EXT = /\.(txt|md|csv|tsv|json|xml|log|ini|yml|yaml|js|jsx|ts|css|html?|py|java|c|cpp|cs|rs|go|sh|bat)$/i;
const isText = (f) => f.type.startsWith('text/') || f.type === 'application/json' || f.type === 'application/xml' || TEXT_EXT.test(f.name);
const kindOf = (f) => {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type.startsWith('video/')) return 'video';
  if (f.type.startsWith('audio/')) return 'audio';
  if (f.type === 'application/pdf') return 'pdf';
  if (isText(f)) return 'text';
  return 'other';
};

const iconFor = (f) => {
  const k = kindOf(f);
  if (k === 'image') return ImageIcon;
  if (k === 'video') return Film;
  if (k === 'audio') return Music2;
  if (k === 'pdf' || k === 'text') return FileText;
  return FileIcon;
};

const fmtDate = (ms) => new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

function Thumb({ file, className }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file.blob]);
  return url ? <img src={url} alt="" loading="lazy" decoding="async" className={className} /> : null;
}

function Preview({ file, onClose, onPrev, onNext, onDownload, onRename, onMove, onDelete }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const kind = kindOf(file);

  useEffect(() => {
    const u = URL.createObjectURL(file.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file.blob]);

  useEffect(() => {
    setEditing(false);
    setDraft(file.name);
    setText('');
    if (kindOf(file) !== 'text') return undefined;
    let alive = true;
    file.blob
      .slice(0, 200000)
      .text()
      .then((t) => alive && setText(file.size > 200000 ? `${t}\n\n… (showing the first 200 KB — export the file to see all of it)` : t))
      .catch(() => alive && setText('Could not read this file as text.'));
    return () => {
      alive = false;
    };
  }, [file]);

  const submitRename = () => {
    const name = draft.trim().slice(0, 200);
    if (name && name !== file.name) onRename(name);
    setEditing(false);
  };

  const Icon = iconFor(file);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`}>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={(e) => { e.preventDefault(); submitRename(); }} className="flex items-center gap-2">
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-sky-400" aria-label="File name" />
                <button type="submit" className="rounded-lg bg-sky-500 p-2 text-black hover:bg-sky-400" aria-label="Save name"><Check size={16} /></button>
              </form>
            ) : (
              <div className="truncate font-semibold" title={file.name}>{file.name}</div>
            )}
            <div className="text-xs text-white/50">{formatSize(file.size)} · {file.type || 'unknown type'} · {fmtDate(file.modified)}</div>
          </div>
          <button onClick={() => setEditing((v) => !v)} className="rounded-lg p-2 hover:bg-white/10" title="Rename" aria-label="Rename"><Pencil size={16} /></button>
          <label className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-white/10" title="Move to folder">
            <FolderInput size={16} />
            <select value={file.folder} onChange={(e) => onMove(e.target.value)} className="cursor-pointer bg-transparent text-xs outline-none" aria-label="Move to folder">
              {FOLDERS.map((f) => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
            </select>
          </label>
          <button onClick={onDownload} className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-sky-400"><Download size={15} /> Export</button>
          <button onClick={onDelete} className="rounded-lg p-2 text-red-300 hover:bg-red-500/15" title="Delete" aria-label="Delete"><Trash2 size={16} /></button>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" title="Close" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="relative flex min-h-[16rem] flex-1 items-center justify-center overflow-auto bg-black/30 p-3">
          {onPrev && <button onClick={onPrev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80" aria-label="Previous file"><ChevronLeft size={20} /></button>}
          {onNext && <button onClick={onNext} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80" aria-label="Next file"><ChevronRight size={20} /></button>}

          {kind === 'image' && url && <img src={url} alt={file.name} className="max-h-[70vh] max-w-full object-contain" />}
          {kind === 'video' && url && <video src={url} controls className="max-h-[70vh] max-w-full" />}
          {kind === 'audio' && url && <audio src={url} controls className="w-full max-w-xl" />}
          {kind === 'pdf' && url && (
            <object data={url} type="application/pdf" className="h-[70vh] w-full">
              <p className="p-6 text-center text-sm text-white/60">Your browser can't show PDFs here. Use Export to open it.</p>
            </object>
          )}
          {kind === 'text' && <pre className="max-h-[70vh] w-full overflow-auto whitespace-pre-wrap break-words p-3 text-left text-xs leading-relaxed text-white/85">{text}</pre>}
          {kind === 'other' && (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <Icon size={56} />
              <p className="text-sm">No preview for this type of file.</p>
              <p className="text-xs">Use Export to save it back to your computer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Files() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const toastTimer = useRef(null);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [folder, setFolder] = useState('All files');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('dogeub-files-view') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const [selected, setSelected] = useState(() => new Set());
  const [previewId, setPreviewId] = useState(null);
  const [confirmIds, setConfirmIds] = useState(null);
  const [toast, setToast] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState('');
  const [usage, setUsage] = useState(null);

  const say = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const reload = useCallback(async () => {
    try {
      setFiles(await listFiles());
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not open your files.');
    } finally {
      setLoading(false);
    }
    setUsage(await getUsage());
  }, []);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    try { localStorage.setItem('dogeub-files-view', view); } catch { /* ignore */ }
  }, [view]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FOLDERS.map((f) => [f, 0]));
    files.forEach((f) => { c[f.folder] = (c[f.folder] || 0) + 1; });
    return c;
  }, [files]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = files.filter((f) => (folder === 'All files' || f.folder === folder) && (!q || f.name.toLowerCase().includes(q)));
    const by = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      size: (a, b) => b.size - a.size,
      date: (a, b) => b.modified - a.modified,
    }[sort];
    return [...list].sort(by);
  }, [files, folder, query, sort]);

  // Drop selections that no longer exist (deleted, or hidden by a filter change).
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(visible.map((f) => f.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  const previewIndex = previewId ? visible.findIndex((f) => f.id === previewId) : -1;
  const previewFile = previewIndex >= 0 ? visible[previewIndex] : null;
  useEffect(() => {
    if (previewId && previewIndex < 0) setPreviewId(null);
  }, [previewId, previewIndex]);

  const importFiles = useCallback(async (list) => {
    const incoming = Array.from(list || []).filter((f) => f && f.size >= 0);
    if (!incoming.length) return;
    const target = folder === 'All files' ? undefined : folder;
    let ok = 0;
    const errors = [];
    for (let i = 0; i < incoming.length; i += 1) {
      setBusy(`Importing ${i + 1} of ${incoming.length}…`);
      try {
        // eslint-disable-next-line no-await-in-loop
        await addFile(incoming[i], target);
        ok += 1;
      } catch (err) {
        errors.push(err.message || `Could not import "${incoming[i].name}".`);
        if (/not enough storage/i.test(errors[errors.length - 1])) break;
      }
    }
    setBusy('');
    await reload();
    requestPersistence();
    if (errors.length) say(`${ok ? `Imported ${ok}. ` : ''}${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more problems)` : ''}`);
    else say(`Imported ${ok} file${ok === 1 ? '' : 's'}${target ? ` into ${target}` : ''}.`);
  }, [folder, reload, say]);

  const exportItems = useCallback(async (items) => {
    if (!items.length) return;
    try {
      if (items.length === 1) {
        downloadBlob(items[0].blob, items[0].name);
        return;
      }
      setBusy('Preparing zip…');
      const zip = await buildZip(items, (n, total) => setBusy(`Preparing zip… ${n}/${total}`));
      downloadBlob(zip, 'dogeub-files.zip');
      say(`Exported ${items.length} files as dogeub-files.zip.`);
    } catch (err) {
      say(err.message || 'Export failed.');
    } finally {
      setBusy('');
    }
  }, [say]);

  const doDelete = async () => {
    const ids = confirmIds;
    setConfirmIds(null);
    if (!ids?.length) return;
    try {
      await deleteFiles(ids);
      setSelected(new Set());
      await reload();
      say(`Deleted ${ids.length} file${ids.length === 1 ? '' : 's'}.`);
    } catch (err) {
      say(err.message || 'Could not delete.');
    }
  };

  const change = async (id, changes, message) => {
    try {
      await updateFile(id, changes);
      await reload();
      if (message) say(message);
    } catch (err) {
      say(err.message || 'Could not save that change.');
    }
  };

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = visible.length > 0 && visible.every((f) => selected.has(f.id));
  const chosen = visible.filter((f) => selected.has(f.id));

  useEffect(() => {
    const onKey = (e) => {
      if (!previewFile) return;
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === 'Escape') setPreviewId(null);
      else if (!typing && e.key === 'ArrowLeft' && previewIndex > 0) setPreviewId(visible[previewIndex - 1].id);
      else if (!typing && e.key === 'ArrowRight' && previewIndex < visible.length - 1) setPreviewId(visible[previewIndex + 1].id);
    };
    // Capture phase: the site's lock screen stops Escape from reaching normal listeners.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [previewFile, previewIndex, visible]);

  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  const dragProps = {
    onDragEnter: (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current += 1; setDragging(true); },
    onDragOver: (e) => { if (hasFiles(e)) e.preventDefault(); },
    onDragLeave: (e) => { if (!hasFiles(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); },
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      importFiles(e.dataTransfer.files);
    },
  };

  const exportLabel = chosen.length ? `Export ${chosen.length}` : 'Export all';
  const usedPct = usage?.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;
  const sidebar = ['All files', ...FOLDERS];

  return (
    <main className="min-h-screen w-full px-4 pb-28 pt-6 sm:px-8" {...dragProps}>
      <div className="mx-auto w-full max-w-6xl">
        <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm opacity-75 transition hover:bg-white/10 hover:opacity-100">
          <ArrowLeft size={16} /> Home
        </button>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"><FolderOpen size={23} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-60">DOGEUB OS</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>DogeFiler</h1>
          </div>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
          <button onClick={() => inputRef.current?.click()} disabled={!!busy} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-sky-400 disabled:opacity-60"><Upload size={16} /> Import</button>
          <button onClick={() => exportItems(chosen.length ? chosen : visible)} disabled={!!busy || !visible.length} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"><Download size={16} /> {exportLabel}</button>
        </div>

        {busy && <div className="mb-4 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm" role="status">{busy}</div>}
        {loadError && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{loadError} Saved files need browser storage, which can be off in private windows.</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-2 md:self-start">
            <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Folders">
              {sidebar.map((name) => {
                const Icon = name === 'All files' ? HardDrive : FOLDER_ICONS[name];
                const count = name === 'All files' ? files.length : counts[name];
                const active = folder === name;
                return (
                  <button key={name} onClick={() => setFolder(name)} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/10 ${active ? 'bg-white/10 font-semibold' : 'opacity-80'}`}>
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 whitespace-nowrap">{name}</span>
                    <span className="text-xs opacity-50">{count}</span>
                  </button>
                );
              })}
            </nav>
            {usage && (
              <div className="mt-3 hidden border-t border-white/10 px-3 pb-2 pt-3 text-xs opacity-70 md:block">
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(usedPct, usage.used ? 1 : 0)}%` }} /></div>
                {formatSize(usage.used)} used{usage.quota ? ` of ${formatSize(usage.quota)}` : ''} by this site
              </div>
            )}
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="flex min-w-[10rem] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm">
                <Search size={15} className="opacity-60" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files" className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50" aria-label="Search files" />
              </label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm outline-none" aria-label="Sort files">
                <option value="date" className="bg-slate-900">Newest</option>
                <option value="name" className="bg-slate-900">Name</option>
                <option value="size" className="bg-slate-900">Size</option>
              </select>
              <div className="flex overflow-hidden rounded-xl border border-white/10">
                <button onClick={() => setView('grid')} aria-pressed={view === 'grid'} className={`p-2.5 hover:bg-white/10 ${view === 'grid' ? 'bg-white/10' : ''}`} title="Grid view" aria-label="Grid view"><LayoutGrid size={16} /></button>
                <button onClick={() => setView('list')} aria-pressed={view === 'list'} className={`p-2.5 hover:bg-white/10 ${view === 'list' ? 'bg-white/10' : ''}`} title="List view" aria-label="List view"><List size={16} /></button>
              </div>
            </div>

            {visible.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-3 px-1 text-xs opacity-80">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((f) => f.id)))} className="h-4 w-4 cursor-pointer accent-sky-500" />
                  {chosen.length ? `${chosen.length} selected` : `${visible.length} file${visible.length === 1 ? '' : 's'}`}
                </label>
                {chosen.length > 0 && (
                  <>
                    <label className="flex items-center gap-1.5">
                      <FolderInput size={14} />
                      <select value="" onChange={(e) => { const dest = e.target.value; if (dest) Promise.all(chosen.map((f) => updateFile(f.id, { folder: dest }))).then(reload).then(() => say(`Moved ${chosen.length} to ${dest}.`)).catch(() => say('Could not move those files.')); }} className="cursor-pointer rounded-md bg-transparent outline-none" aria-label="Move selected to folder">
                        <option value="" className="bg-slate-900">Move to…</option>
                        {FOLDERS.map((f) => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                      </select>
                    </label>
                    <button onClick={() => setConfirmIds(chosen.map((f) => f.id))} className="flex items-center gap-1 text-red-300 hover:text-red-200"><Trash2 size={14} /> Delete</button>
                  </>
                )}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-10 text-center text-sm opacity-70">Loading your files…</div>
            ) : visible.length === 0 ? (
              <button onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center transition hover:border-white/30 hover:bg-white/[0.05]">
                <Upload size={32} className="opacity-60" />
                <span className="font-semibold">{files.length ? 'No files match' : 'Drop files here or click to import'}</span>
                <span className="max-w-md text-sm opacity-60">{files.length ? 'Try a different folder or search.' : 'Screenshots, videos, documents — anything from your computer. They stay in this browser, and you can export them back out any time.'}</span>
              </button>
            ) : view === 'grid' ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((f) => {
                  const Icon = iconFor(f);
                  const on = selected.has(f.id);
                  return (
                    <li key={f.id} className={`group relative overflow-hidden rounded-2xl border bg-white/[0.035] transition hover:border-white/25 ${on ? 'border-sky-400' : 'border-white/10'}`}>
                      <button onClick={() => setPreviewId(f.id)} className="block w-full text-left" aria-label={`Open ${f.name}`}>
                        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/20">
                          {kindOf(f) === 'image' ? <Thumb file={f} className="h-full w-full object-cover" /> : <Icon size={38} className="opacity-50" />}
                        </div>
                        <div className="px-3 py-2">
                          <div className="truncate text-sm font-medium" title={f.name}>{f.name}</div>
                          <div className="text-xs opacity-55">{formatSize(f.size)} · {fmtDate(f.modified)}</div>
                        </div>
                      </button>
                      <input type="checkbox" checked={on} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} className={`absolute left-2 top-2 h-4 w-4 cursor-pointer accent-sky-500 ${on ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'}`} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-white/10">
                {visible.map((f) => {
                  const Icon = iconFor(f);
                  return (
                    <li key={f.id} className={`flex items-center gap-3 border-b border-white/5 px-3 py-2 last:border-0 hover:bg-white/[0.05] ${selected.has(f.id) ? 'bg-sky-400/10' : ''}`}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} className="h-4 w-4 shrink-0 cursor-pointer accent-sky-500" />
                      <button onClick={() => setPreviewId(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${f.name}`}>
                        <Icon size={18} className="shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate text-sm" title={f.name}>{f.name}</span>
                        <span className="hidden w-24 shrink-0 text-xs opacity-55 sm:block">{f.folder}</span>
                        <span className="w-20 shrink-0 text-right text-xs opacity-55">{formatSize(f.size)}</span>
                        <span className="hidden w-28 shrink-0 text-right text-xs opacity-55 md:block">{fmtDate(f.modified)}</span>
                      </button>
                      <button onClick={() => exportItems([f])} className="shrink-0 rounded-lg p-1.5 opacity-60 hover:bg-white/10 hover:opacity-100" title="Export" aria-label={`Export ${f.name}`}><Download size={15} /></button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-5 text-xs opacity-50">Files are saved only in this browser on this device. Clearing site data deletes them, so export anything you want to keep.</p>
          </section>
        </div>
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-sky-950/70 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-sky-300 px-12 py-10 text-center text-white">
            <Upload size={40} className="mx-auto mb-3" />
            <div className="text-lg font-bold">Drop to import{folder === 'All files' ? '' : ` into ${folder}`}</div>
          </div>
        </div>
      )}

      {previewFile && (
        <Preview
          file={previewFile}
          onClose={() => setPreviewId(null)}
          onPrev={previewIndex > 0 ? () => setPreviewId(visible[previewIndex - 1].id) : null}
          onNext={previewIndex < visible.length - 1 ? () => setPreviewId(visible[previewIndex + 1].id) : null}
          onDownload={() => exportItems([previewFile])}
          onRename={(name) => change(previewFile.id, { name }, 'Renamed.')}
          onMove={(dest) => change(previewFile.id, { folder: dest }, `Moved to ${dest}.`)}
          onDelete={() => setConfirmIds([previewFile.id])}
        />
      )}

      {confirmIds && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmIds(null)} role="alertdialog" aria-modal="true" aria-label="Confirm delete">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Delete {confirmIds.length === 1 ? 'this file' : `${confirmIds.length} files`}?</h2>
            <p className="mt-1 text-sm text-white/60">This removes {confirmIds.length === 1 ? 'it' : 'them'} from this browser. Export first if you want a copy.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus onClick={() => setConfirmIds(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Cancel</button>
              <button onClick={doDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 z-[110] max-w-[90vw] -translate-x-1/2 rounded-xl border border-white/15 bg-slate-900/95 px-4 py-2.5 text-sm text-white shadow-xl" role="status">{toast}</div>}
    </main>
  );
}
