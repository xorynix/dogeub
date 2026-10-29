import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Presentation, Table2, Upload, X } from 'lucide-react';

const OFFICE_APPS = [
  { id: 'word', shortLabel: 'Writer', format: 'DOCX', icon: FileText, path: '/office/word' },
  { id: 'sheet', shortLabel: 'Sheets', format: 'XLSX', icon: Table2, path: '/office/sheet' },
  { id: 'slides', shortLabel: 'Slides', format: 'PPTX', icon: Presentation, path: '/office/slides' },
];

export default function OfficeFrame({ appId, title, onTitleChange, savedLabel, fonts = [], fontError, addFont, children }) {
  const navigate = useNavigate();
  const [fontBusy, setFontBusy] = useState(false);
  const [toast, setToast] = useState('');
  const active = OFFICE_APPS.find((app) => app.id === appId) || OFFICE_APPS[0];

  const importFont = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFontBusy(true);
    try {
      const name = await addFont(file);
      setToast(`${name} added to your font library.`);
    } catch (error) { setToast(error.message || 'Could not import that font.'); }
    finally { setFontBusy(false); window.setTimeout(() => setToast(''), 4000); }
  };

  return <div className="flex min-h-screen flex-col bg-[#090f1c] text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/95 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="flex min-h-16 flex-wrap items-center gap-3 px-3 py-2 sm:px-6">
        <button onClick={() => navigate('/office')} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Back to Office" title="Back to Office"><ArrowLeft size={17} /></button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.07] text-cyan-100"><active.icon size={20} /></span>
          <div className="min-w-0">
            <input value={title} onChange={(event) => onTitleChange?.(event.target.value)} aria-label="File name" className="block w-full max-w-[min(42vw,360px)] truncate bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder={`${active.shortLabel} file name`} />
            <p className="text-[11px] text-white/40">{savedLabel || 'Saved on this device'} · {active.format}</p>
          </div>
        </div>
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto pt-1 sm:order-none sm:ml-3 sm:w-auto sm:pt-0" aria-label="Office apps">
          {OFFICE_APPS.map((app) => <button key={app.id} onClick={() => navigate(app.path)} aria-current={app.id === appId ? 'page' : undefined} className={'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ' + (app.id === appId ? 'bg-cyan-200/10 text-cyan-100' : 'text-white/45 hover:bg-white/[.05] hover:text-white/80')}>{app.shortLabel}</button>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10" title="Import a font from your computer"><Upload size={14} /><span className="hidden sm:inline">Add font</span><input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" className="sr-only" onChange={importFont} /></label>
          <span className="hidden text-xs text-white/35 md:inline">{fonts.length} custom font{fonts.length === 1 ? '' : 's'}</span>
          {fontBusy && <span role="status" className="text-xs text-cyan-100">Loading font…</span>}
        </div>
      </div>
      {(fontError || toast) && <div role="status" className="flex items-center justify-between border-t border-white/[.06] bg-cyan-200/[.04] px-5 py-2 text-xs text-cyan-100/80"><span>{fontError || toast}</span><button onClick={() => setToast('')} aria-label="Dismiss" className="ml-3 rounded p-1 hover:bg-white/10"><X size={13} /></button></div>}
    </header>
    <main className="min-h-0 flex-1">{children}</main>
  </div>;
}
