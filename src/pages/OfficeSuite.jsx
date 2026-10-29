import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Files, FolderOpen, Grid2X2, Presentation, Table2, Sparkles } from 'lucide-react';
import Nav from '../layouts/Nav';
import { deleteOfficeFont, listOfficeDocuments, listOfficeFonts, saveOfficeFont } from '../utils/officeStorage';

const WordEditor = lazy(() => import('../components/office/WordEditor'));
const SpreadsheetEditor = lazy(() => import('../components/office/SpreadsheetEditor'));
const SlidesEditor = lazy(() => import('../components/office/SlidesEditor'));

const OFFICE_APPS = [
  { id: 'word', label: 'DOGEUB Writer', shortLabel: 'Writer', detail: 'Write and format documents', format: 'DOCX', icon: FileText, color: 'from-blue-400/25 to-cyan-300/5', path: '/office/word' },
  { id: 'sheet', label: 'DOGEUB Sheets', shortLabel: 'Sheets', detail: 'Build spreadsheets and formulas', format: 'XLSX', icon: Table2, color: 'from-emerald-400/25 to-teal-300/5', path: '/office/sheet' },
  { id: 'slides', label: 'DOGEUB Slides', shortLabel: 'Slides', detail: 'Create and present slide decks', format: 'PPTX', icon: Presentation, color: 'from-amber-400/25 to-orange-300/5', path: '/office/slides' },
];

export function useOfficeFonts() {
  const [fonts, setFonts] = useState([]);
  const [fontError, setFontError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const stored = await listOfficeFonts();
      const loaded = [];
      for (const item of stored) {
        try {
          const url = URL.createObjectURL(item.blob);
          const face = new FontFace(item.name, `url(${url})`);
          await face.load();
          document.fonts.add(face);
          URL.revokeObjectURL(url);
          loaded.push({ name: item.name, fileName: item.fileName });
        } catch { /* A damaged font should not stop other office apps from opening. */ }
      }
      setFonts(loaded);
    } catch (error) { setFontError(error.message || 'Custom fonts could not be loaded.'); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addFont = useCallback(async (file) => {
    const name = file.name.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 48) || 'Custom Font';
    const url = URL.createObjectURL(file);
    try {
      const face = new FontFace(name, `url(${url})`);
      await face.load();
      document.fonts.add(face);
      await saveOfficeFont({ name, fileName: file.name, blob: file, updatedAt: Date.now() });
      await refresh();
      setFontError('');
      return name;
    } catch (error) {
      const message = error.message || 'This font could not be loaded.';
      setFontError(message);
      throw error;
    } finally { URL.revokeObjectURL(url); }
  }, [refresh]);

  const removeFont = useCallback(async (name) => {
    await deleteOfficeFont(name);
    setFonts((current) => current.filter((font) => font.name !== name));
  }, []);

  return { fonts, fontError, addFont, removeFont };
}

function OfficeHome() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  useEffect(() => { listOfficeDocuments().then(setRecent).catch(() => setRecent([])); }, []);

  return <div className="min-h-screen bg-[#090f1c] text-white"><Nav /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/[.12] via-blue-500/[.08] to-transparent p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-cyan-100"><Sparkles size={13} /> DOGEUB Office</div><h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">A workspace for your ideas.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">Write a report, organize your data, or build a presentation. Your files stay in this browser until you export them.</p></div>
      <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
        {OFFICE_APPS.map((app) => { const Icon = app.icon; return <button key={app.id} onClick={() => navigate(app.path)} className={'group flex min-h-40 flex-col rounded-2xl border border-white/10 bg-gradient-to-br ' + app.color + ' p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[.07]'}><span className="flex w-full items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-white"><Icon size={19} /></span><span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white/55">{app.format}</span></span><span className="mt-5 text-base font-semibold">{app.label}</span><span className="mt-1 text-xs text-white/50">{app.detail}</span></button>; })}
      </div>
    </div>

    <section className="mt-9"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-white/35">Your workspace</p><h2 className="mt-1 text-xl font-semibold">Recent files</h2></div><button onClick={() => navigate('/files')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/[.05] hover:text-white"><FolderOpen size={14} /> Browse files</button></div>
      {recent.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recent.slice(0, 9).map((document) => { const app = OFFICE_APPS.find((item) => item.id === document.type); const Icon = app?.icon || Files; return <button key={document.id} onClick={() => navigate(`${app?.path || '/office'}?id=${encodeURIComponent(document.id)}`)} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-3 text-left transition hover:border-cyan-200/20 hover:bg-cyan-200/[.04]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-cyan-100"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{document.title || 'Untitled'}</span><span className="mt-1 block text-[11px] text-white/35">{app?.label || 'Office file'} · {new Date(document.updatedAt).toLocaleDateString()}</span></span><Grid2X2 size={14} className="text-white/25" /></button>; })}</div> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-white/40">Your work appears here after you create or import a file.</div>}
    </section>
    <p className="mt-8 text-xs leading-5 text-white/30">Office documents and custom fonts are stored locally in this browser. Export a copy to move it to another device.</p>
  </main></div>;
}

export default function OfficeSuite() {
  const location = useLocation();
  const { fonts, fontError, addFont } = useOfficeFonts();
  const mode = location.pathname.split('/')[2] || '';
  if (!mode || !OFFICE_APPS.some((app) => app.id === mode)) return <OfficeHome />;
  const Editor = mode === 'word' ? WordEditor : mode === 'sheet' ? SpreadsheetEditor : SlidesEditor;
  return <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-white/50">Opening DOGEUB Office…</div>}><Editor fonts={fonts} fontError={fontError} addFont={addFont} /></Suspense>;
}
