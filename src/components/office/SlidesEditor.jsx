import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Download, FilePlus2, ImagePlus, Italic, LoaderCircle, Plus, Trash2, Underline, Upload } from 'lucide-react';
import OfficeFrame from './OfficeFrame';
import { downloadOfficeFile, fileAsDataUrl, listOfficeDocuments, safeFileName, saveOfficeDocument } from '../../utils/officeStorage';

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const emptySlide = (id = crypto.randomUUID()) => ({ id, background: '#ffffff', elements: [{ id: crypto.randomUUID(), type: 'text', x: 75, y: 150, w: 810, h: 125, text: 'Click to add a title', fontFace: 'Aptos Display', fontSize: 38, color: '#172554', bold: true, align: 'center' }] });
const freshDeck = () => ({ slides: [emptySlide()] });
const colorValue = (node) => {
  const color = node?.getElementsByTagNameNS(A_NS, 'srgbClr')?.[0]?.getAttribute('val');
  return color && /^[\da-f]{6}$/i.test(color) ? `#${color}` : '';
};
const safeNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function resolveZipPath(base, target) {
  const parts = `${base}/${String(target || '').replace(/^\//, '')}`.split('/');
  const clean = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') clean.pop(); else clean.push(part); }
  return clean.join('/');
}

function childText(paragraph) {
  return Array.from(paragraph.getElementsByTagNameNS(A_NS, 't')).map((node) => node.textContent || '').join('');
}

async function importPowerPoint(file) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const presentationFile = zip.file('ppt/presentation.xml');
  if (!presentationFile) throw new Error('This file is not a readable PowerPoint presentation.');
  const parser = new DOMParser();
  const presentationXml = parser.parseFromString(await presentationFile.async('text'), 'application/xml');
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  const presentationRels = relsFile ? parser.parseFromString(await relsFile.async('text'), 'application/xml') : null;
  const relationMap = new Map(Array.from(presentationRels?.getElementsByTagNameNS(PKG_NS, 'Relationship') || []).map((item) => [item.getAttribute('Id'), item.getAttribute('Target')]));
  const slideSize = presentationXml.getElementsByTagNameNS(P_NS, 'sldSz')[0];
  const widthEmu = Number(slideSize?.getAttribute('cx')) || 12192000;
  const heightEmu = Number(slideSize?.getAttribute('cy')) || 6858000;
  const slideIds = Array.from(presentationXml.getElementsByTagNameNS(P_NS, 'sldId'));
  const orderedPaths = slideIds.map((item) => relationMap.get(item.getAttributeNS(R_NS, 'id'))).filter(Boolean).map((target) => target.startsWith('/') ? target.slice(1) : resolveZipPath('ppt', target));
  const slidePaths = orderedPaths.length ? orderedPaths : Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path)).sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1]) - Number(b.match(/slide(\d+)/i)?.[1]));
  const slides = [];
  for (const slidePath of slidePaths.slice(0, 150)) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    const slideXml = parser.parseFromString(await slideFile.async('text'), 'application/xml');
    const basename = slidePath.split('/').pop();
    const slideRelsPath = `${slidePath.slice(0, slidePath.lastIndexOf('/'))}/_rels/${basename}.rels`;
    const relsXml = zip.file(slideRelsPath) ? parser.parseFromString(await zip.file(slideRelsPath).async('text'), 'application/xml') : null;
    const rels = new Map(Array.from(relsXml?.getElementsByTagNameNS(PKG_NS, 'Relationship') || []).map((item) => [item.getAttribute('Id'), item.getAttribute('Target')]));
    const elements = [];
    for (const shape of Array.from(slideXml.getElementsByTagNameNS(P_NS, 'sp'))) {
      const textBody = shape.getElementsByTagNameNS(P_NS, 'txBody')[0];
      if (!textBody) continue;
      const text = Array.from(textBody.getElementsByTagNameNS(A_NS, 'p')).map(childText).join('\n').trim();
      if (!text) continue;
      const transform = shape.getElementsByTagNameNS(A_NS, 'xfrm')[0];
      const offset = transform?.getElementsByTagNameNS(A_NS, 'off')[0];
      const extent = transform?.getElementsByTagNameNS(A_NS, 'ext')[0];
      const firstRun = textBody.getElementsByTagNameNS(A_NS, 'rPr')[0] || textBody.getElementsByTagNameNS(A_NS, 'defRPr')[0];
      const latin = firstRun?.getElementsByTagNameNS(A_NS, 'latin')[0]?.getAttribute('typeface');
      const size = Number(firstRun?.getAttribute('sz')) / 100;
      const fill = colorValue(firstRun);
      const paragraphProperties = textBody.getElementsByTagNameNS(A_NS, 'pPr')[0];
      const rawAlignment = paragraphProperties?.getAttribute('algn');
      elements.push({ id: crypto.randomUUID(), type: 'text', text, x: safeNumber(offset?.getAttribute('x'), 0) / widthEmu * SLIDE_WIDTH, y: safeNumber(offset?.getAttribute('y'), 0) / heightEmu * SLIDE_HEIGHT, w: safeNumber(extent?.getAttribute('cx'), widthEmu * 0.7) / widthEmu * SLIDE_WIDTH, h: safeNumber(extent?.getAttribute('cy'), heightEmu * 0.2) / heightEmu * SLIDE_HEIGHT, fontFace: latin || 'Aptos', fontSize: size > 0 ? size : 24, color: fill || '#172554', bold: firstRun?.getAttribute('b') === '1', italic: firstRun?.getAttribute('i') === '1', underline: firstRun?.getAttribute('u') === 'sng', align: rawAlignment === 'ctr' ? 'center' : rawAlignment === 'r' ? 'right' : 'left' });
    }
    for (const picture of Array.from(slideXml.getElementsByTagNameNS(P_NS, 'pic'))) {
      const blip = picture.getElementsByTagNameNS(A_NS, 'blip')[0];
      const target = rels.get(blip?.getAttributeNS(R_NS, 'embed'));
      if (!target) continue;
      const mediaPath = resolveZipPath(slidePath.slice(0, slidePath.lastIndexOf('/')), target);
      const media = zip.file(mediaPath);
      if (!media) continue;
      const extension = mediaPath.split('.').pop().toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'gif'].includes(extension)) continue;
      const mime = extension === 'jpg' ? 'jpeg' : extension;
      const base64 = await media.async('base64');
      const transform = picture.getElementsByTagNameNS(A_NS, 'xfrm')[0];
      const offset = transform?.getElementsByTagNameNS(A_NS, 'off')[0];
      const extent = transform?.getElementsByTagNameNS(A_NS, 'ext')[0];
      elements.push({ id: crypto.randomUUID(), type: 'image', data: `data:image/${mime};base64,${base64}`, extension: mime, x: safeNumber(offset?.getAttribute('x'), 0) / widthEmu * SLIDE_WIDTH, y: safeNumber(offset?.getAttribute('y'), 0) / heightEmu * SLIDE_HEIGHT, w: safeNumber(extent?.getAttribute('cx'), widthEmu * 0.2) / widthEmu * SLIDE_WIDTH, h: safeNumber(extent?.getAttribute('cy'), heightEmu * 0.2) / heightEmu * SLIDE_HEIGHT });
    }
    let background = '#ffffff';
    const backgroundFill = slideXml.getElementsByTagNameNS(P_NS, 'bg')[0];
    const importedBackground = colorValue(backgroundFill || null);
    if (importedBackground) background = importedBackground;
    slides.push({ id: crypto.randomUUID(), background, elements });
  }
  if (!slides.length) throw new Error('No slides could be read from this presentation.');
  return { slides };
}

function normalizedColor(value, fallback = '#172554') {
  return /^#[\da-f]{6}$/i.test(String(value || '')) ? value.slice(1).toUpperCase() : fallback.replace('#', '').toUpperCase();
}

export default function SlidesEditor({ fonts, fontError, addFont }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('Untitled presentation');
  const [deck, setDeck] = useState(freshDeck);
  const [slideId, setSlideId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [savedLabel, setSavedLabel] = useState('Opening presentation…');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const activeSlide = deck.slides.find((slide) => slide.id === slideId) || deck.slides[0];
  const selectedElement = activeSlide?.elements.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    let alive = true;
    const requestedId = new URLSearchParams(location.search).get('id');
    listOfficeDocuments('slides').then((documents) => {
      if (!alive) return;
      const found = documents.find((item) => item.id === requestedId) || documents[0];
      if (found) {
        const value = found.content?.deck || freshDeck();
        setDoc(found); setTitle(found.title || 'Untitled presentation'); setDeck(value); setSlideId(value.slides[0]?.id || '');
      } else {
        const value = freshDeck();
        setDoc({ id: crypto.randomUUID(), type: 'slides', title: 'Untitled presentation', content: { deck: value }, updatedAt: Date.now() });
        setDeck(value); setSlideId(value.slides[0].id);
      }
      setSavedLabel('Saved on this device');
    }).catch((error) => setNotice(error.message || 'Local presentation storage is unavailable.'));
    return () => { alive = false; };
  }, [location.search]);

  useEffect(() => {
    if (!doc) return undefined;
    const timer = window.setTimeout(async () => {
      const next = { ...doc, title, content: { deck }, updatedAt: Date.now() };
      try { await saveOfficeDocument(next); setDoc(next); setSavedLabel('Saved just now'); }
      catch (error) { setSavedLabel('Could not save locally'); setNotice(error.message || 'Browser storage is full. Export a copy to keep this presentation.'); }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [doc?.id, title, deck]);

  const createDeck = useCallback(async () => {
    const value = freshDeck();
    const next = { id: crypto.randomUUID(), type: 'slides', title: 'Untitled presentation', content: { deck: value }, updatedAt: Date.now() };
    try { await saveOfficeDocument(next); } catch (error) { setNotice(error.message || 'Could not save the new presentation locally.'); }
    setDoc(next); setTitle(next.title); setDeck(value); setSlideId(value.slides[0].id); setSelectedId(''); setNotice(''); navigate('/office/slides', { replace: true });
  }, [navigate]);

  const updateElement = (id, changes) => setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, elements: slide.elements.map((element) => element.id === id ? { ...element, ...changes } : element) } : slide) }));
  const addText = () => {
    if (!activeSlide) return;
    const item = { id: crypto.randomUUID(), type: 'text', x: 160, y: 190, w: 640, h: 120, text: 'Add your text', fontFace: fonts[0]?.name || 'Aptos', fontSize: 30, color: '#172554', bold: false, italic: false, align: 'center' };
    setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, elements: [...slide.elements, item] } : slide) })); setSelectedId(item.id);
  };

  const addSlide = () => {
    const slide = emptySlide();
    setDeck((current) => ({ ...current, slides: [...current.slides, slide] })); setSlideId(slide.id); setSelectedId(slide.elements[0].id);
  };
  const duplicateSlide = () => {
    if (!activeSlide) return;
    const copy = { ...activeSlide, id: crypto.randomUUID(), elements: activeSlide.elements.map((item) => ({ ...item, id: crypto.randomUUID() })) };
    setDeck((current) => ({ ...current, slides: [...current.slides.slice(0, current.slides.findIndex((item) => item.id === slideId) + 1), copy, ...current.slides.slice(current.slides.findIndex((item) => item.id === slideId) + 1)] })); setSlideId(copy.id);
  };
  const deleteSlide = () => {
    if (deck.slides.length < 2) return;
    const next = deck.slides.filter((slide) => slide.id !== slideId);
    setDeck((current) => ({ ...current, slides: next })); setSlideId(next[0].id); setSelectedId('');
  };

  const importDeck = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setNotice('');
    try {
      const imported = await importPowerPoint(file);
      const next = { id: crypto.randomUUID(), type: 'slides', title: file.name.replace(/\.pptx$/i, '') || 'Imported presentation', content: { deck: imported }, updatedAt: Date.now() };
      await saveOfficeDocument(next); setDoc(next); setTitle(next.title); setDeck(imported); setSlideId(imported.slides[0].id); setSelectedId('');
      navigate(`/office/slides?id=${encodeURIComponent(next.id)}`, { replace: true });
      setNotice('PPTX imported. Check complex layouts and unsupported objects before exporting.');
    } catch (error) { setNotice(error.message || 'That presentation could not be imported.'); }
    finally { setBusy(false); }
  };

  const addImage = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) { setNotice('Choose a PNG, JPG, or GIF image.'); return; }
    try {
      const data = await fileAsDataUrl(file);
      const item = { id: crypto.randomUUID(), type: 'image', data, extension: file.type === 'image/jpeg' ? 'jpeg' : file.type.split('/')[1], x: 300, y: 150, w: 360, h: 240 };
      setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, elements: [...slide.elements, item] } : slide) })); setSelectedId(item.id);
    } catch (error) { setNotice(error.message || 'Image could not be added.'); }
  };

  const exportDeck = async () => {
    if (!deck.slides.length) return;
    setBusy(true); setNotice('');
    try {
      await saveOfficeDocument({ ...doc, title, content: { deck }, updatedAt: Date.now() });
      const { default: PptxGenJS } = await import('pptxgenjs');
      const presentation = new PptxGenJS();
      presentation.layout = 'LAYOUT_WIDE';
      presentation.author = 'DOGEUB Office'; presentation.subject = 'Created with DOGEUB Slides'; presentation.title = title;
      presentation.theme = { headFontFace: fonts[0]?.name || 'Aptos Display', bodyFontFace: fonts[0]?.name || 'Aptos', lang: 'en-US' };
      for (const model of deck.slides) {
        const slide = presentation.addSlide();
        slide.background = { color: normalizedColor(model.background, 'FFFFFF') };
        for (const item of model.elements) {
          const geometry = { x: item.x / 72, y: item.y / 72, w: item.w / 72, h: item.h / 72 };
          if (item.type === 'image') slide.addImage({ data: item.data, ...geometry });
          else slide.addText(item.text || '', { ...geometry, fontFace: item.fontFace || 'Aptos', fontSize: Number(item.fontSize) || 24, color: normalizedColor(item.color), bold: Boolean(item.bold), italic: Boolean(item.italic), underline: Boolean(item.underline), align: item.align || 'left', valign: 'mid', margin: 0.05, breakLine: false, fit: 'shrink' });
        }
      }
      const blob = await presentation.write({ outputType: 'blob', compression: true });
      downloadOfficeFile(blob, `${safeFileName(title, 'Untitled presentation')}.pptx`);
      setSavedLabel('Exported just now');
    } catch (error) { setNotice(error.message || 'PowerPoint export failed.'); }
    finally { setBusy(false); }
  };

  const onDragStart = (event, item) => {
    event.preventDefault(); event.stopPropagation();
    if (!canvasRef.current) return;
    dragRef.current = { id: item.id, x: event.clientX, y: event.clientY, startX: item.x, startY: item.y, rect: canvasRef.current.getBoundingClientRect() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDragMove = (event) => {
    const drag = dragRef.current;
    if (!drag || !drag.rect.width || !drag.rect.height) return;
    const x = Math.max(0, Math.min(SLIDE_WIDTH - 40, drag.startX + (event.clientX - drag.x) * SLIDE_WIDTH / drag.rect.width));
    const y = Math.max(0, Math.min(SLIDE_HEIGHT - 30, drag.startY + (event.clientY - drag.y) * SLIDE_HEIGHT / drag.rect.height));
    updateElement(drag.id, { x, y });
  };

  return <OfficeFrame appId="slides" title={title} onTitleChange={setTitle} savedLabel={savedLabel} fonts={fonts} fontError={fontError} addFont={addFont}>
    <div className="flex h-[calc(100vh-64px)] min-h-[600px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#101a2a] px-3 py-2 sm:px-5">
        <button onClick={createDeck} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><FilePlus2 size={14} /> New</button>
        <button onClick={() => fileRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><Upload size={14} /> Import PPTX</button><input ref={fileRef} type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" onChange={importDeck} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={addSlide} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><Plus size={14} /> Slide</button>
        <button onClick={addText} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10">T Text</button>
        <button onClick={() => imageRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><ImagePlus size={14} /> Image</button><input ref={imageRef} type="file" accept="image/png,image/jpeg,image/gif" className="sr-only" onChange={addImage} />
        <button onClick={duplicateSlide} title="Duplicate slide" aria-label="Duplicate slide" className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10"><Copy size={14} /></button>
        <button onClick={deleteSlide} title="Delete slide" aria-label="Delete slide" disabled={deck.slides.length < 2} className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-rose-300/10 hover:text-rose-200 disabled:opacity-30"><Trash2 size={14} /></button>
        <button onClick={exportDeck} disabled={busy} className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-orange-300 px-3 text-xs font-bold text-slate-950 hover:bg-orange-200 disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export PPTX</button>
      </div>
      {notice && <div role="status" className="border-b border-cyan-100/10 bg-cyan-100/[.04] px-4 py-2 text-xs text-cyan-100/80">{notice}</div>}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0b1220] p-3 sm:block"><div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Slides</span><span className="text-[10px] text-white/30">{deck.slides.length}</span></div><div className="space-y-3">{deck.slides.map((slide, index) => <button key={slide.id} onClick={() => { setSlideId(slide.id); setSelectedId(''); }} className={'w-full rounded-xl border p-2 text-left transition ' + (slide.id === slideId ? 'border-cyan-200/40 bg-cyan-200/[.06]' : 'border-white/[.07] bg-white/[.02] hover:border-white/20')}><div className="relative aspect-video overflow-hidden rounded-lg border border-black/10" style={{ backgroundColor: slide.background }}>{slide.elements.slice(0, 5).map((item) => item.type === 'image' ? <img key={item.id} src={item.data} alt="" className="absolute max-h-full max-w-full object-contain" style={{ left: `${item.x / 960 * 100}%`, top: `${item.y / 540 * 100}%`, width: `${item.w / 960 * 100}%`, height: `${item.h / 540 * 100}%` }} /> : <span key={item.id} className="absolute overflow-hidden text-slate-800" style={{ left: `${item.x / 960 * 100}%`, top: `${item.y / 540 * 100}%`, width: `${item.w / 960 * 100}%`, height: `${item.h / 540 * 100}%`, fontSize: `${Math.max(2, item.fontSize / 7)}px`, textAlign: item.align }}>{item.text}</span>)}</div><span className="mt-2 block text-[11px] text-white/60">{index + 1} · {slide.elements.filter((item) => item.type === 'text')[0]?.text?.slice(0, 26) || 'Blank slide'}</span></button>)}</div></aside>
        <div className="min-w-0 flex-1 overflow-auto bg-[#111b2a] p-3 sm:p-6 lg:p-8">
          {activeSlide && <div className="mx-auto w-full max-w-[1100px]">
            <div ref={canvasRef} onPointerMove={onDragMove} onPointerUp={() => { dragRef.current = null; }} onClick={() => setSelectedId('')} className="relative mx-auto aspect-video w-full overflow-hidden border border-white/15 bg-white shadow-2xl shadow-black/35" style={{ backgroundColor: activeSlide.background, maxHeight: 'calc(100vh - 230px)' }}>
              {activeSlide.elements.map((item) => <div key={item.id} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }} className={'absolute ' + (selectedId === item.id ? 'z-10 outline outline-2 outline-cyan-500' : 'hover:outline hover:outline-1 hover:outline-cyan-300/70')} style={{ left: `${item.x / SLIDE_WIDTH * 100}%`, top: `${item.y / SLIDE_HEIGHT * 100}%`, width: `${item.w / SLIDE_WIDTH * 100}%`, height: `${item.h / SLIDE_HEIGHT * 100}%` }}>
                <div onPointerDown={(event) => onDragStart(event, item)} onPointerMove={onDragMove} onPointerUp={() => { dragRef.current = null; }} className="absolute -top-4 left-0 right-0 z-20 h-4 cursor-move" aria-label="Move slide object" />
                {item.type === 'image' ? <img src={item.data} alt="Slide visual" draggable="false" className="h-full w-full select-none object-contain" /> : <textarea value={item.text} onChange={(event) => updateElement(item.id, { text: event.target.value })} onFocus={() => setSelectedId(item.id)} spellCheck className="h-full w-full resize-none overflow-hidden bg-transparent p-1 text-slate-900 outline-none" style={{ fontFamily: item.fontFace, fontSize: `clamp(8px, ${item.fontSize / 960 * 100}vw, ${item.fontSize}px)`, color: item.color, fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? 'italic' : 'normal', textDecoration: item.underline ? 'underline' : 'none', textAlign: item.align || 'left' }} aria-label="Slide text" />}
              </div>)}
              {activeSlide.elements.length === 0 && <button onClick={addText} className="absolute inset-0 grid place-items-center text-sm text-slate-400">Click to add a text box</button>}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/35"><span>Slide {Math.max(1, deck.slides.findIndex((slide) => slide.id === slideId) + 1)} of {deck.slides.length} · Drag the slim handle above an object to move it</span><label className="flex cursor-pointer items-center gap-2">Background <input type="color" value={activeSlide.background} onChange={(event) => setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, background: event.target.value } : slide) }))} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent" /></label></div>
          </div>}
        </div>
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-white/10 bg-[#0b1220] p-4 lg:block">
          <h2 className="text-xs font-bold uppercase tracking-[.18em] text-white/40">Format</h2>
          {selectedElement?.type === 'text' ? <div className="mt-4 space-y-3">
            <label className="block text-[11px] text-white/45">Text<textarea value={selectedElement.text} onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })} rows={4} className="mt-1 block w-full resize-y rounded-lg border border-white/10 bg-white/[.04] p-2 text-xs text-white outline-none focus:border-cyan-200/30" /></label>
            <label className="block text-[11px] text-white/45">Font<select value={selectedElement.fontFace || 'Aptos'} onChange={(event) => updateElement(selectedElement.id, { fontFace: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-xs text-white outline-none"><option>Aptos</option><option>Aptos Display</option><option>Arial</option><option>Calibri</option><option>Cambria</option><option>Candara</option><option>Comic Sans MS</option><option>Consolas</option><option>Courier New</option><option>Franklin Gothic Medium</option><option>Garamond</option><option>Georgia</option><option>Impact</option><option>Lucida Console</option><option>Palatino Linotype</option><option>Segoe UI</option><option>Tahoma</option><option>Times New Roman</option><option>Trebuchet MS</option><option>Verdana</option>{fonts.map((font) => <option key={font.name}>{font.name}</option>)}</select></label>
            <label className="block text-[11px] text-white/45">Size<input type="number" min="8" max="96" value={selectedElement.fontSize || 24} onChange={(event) => updateElement(selectedElement.id, { fontSize: Math.max(8, Math.min(96, Number(event.target.value) || 24)) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-white/[.04] p-2 text-xs text-white outline-none" /></label>
            <div className="flex items-center gap-1">{[[Bold, 'bold', 'bold'], [Italic, 'italic', 'italic'], [Underline, 'underline', 'underline']].map(([Icon, field, label]) => <button key={field} onClick={() => updateElement(selectedElement.id, { [field]: !selectedElement[field] })} aria-label={label} className={'grid h-8 w-8 place-items-center rounded-lg ' + (selectedElement[field] ? 'bg-cyan-200/15 text-cyan-100' : 'text-white/55 hover:bg-white/10')}><Icon size={14} /></button>)}{[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([align, Icon]) => <button key={align} onClick={() => updateElement(selectedElement.id, { align })} aria-label={`Align ${align}`} className={'grid h-8 w-8 place-items-center rounded-lg ' + (selectedElement.align === align ? 'bg-cyan-200/15 text-cyan-100' : 'text-white/55 hover:bg-white/10')}><Icon size={14} /></button>)}</div>
            <label className="flex items-center justify-between text-[11px] text-white/45">Text color<input type="color" value={selectedElement.color || '#172554'} onChange={(event) => updateElement(selectedElement.id, { color: event.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent" /></label>
            <div className="grid grid-cols-2 gap-2">{[['X', 'x'], ['Y', 'y'], ['W', 'w'], ['H', 'h']].map(([label, key]) => <label key={key} className="text-[10px] text-white/40">{label}<input type="number" value={Math.round(selectedElement[key])} onChange={(event) => updateElement(selectedElement.id, { [key]: Math.max(key === 'w' || key === 'h' ? 20 : 0, Number(event.target.value) || 0) })} className="mt-1 block w-full rounded-md border border-white/10 bg-white/[.04] p-1.5 text-xs text-white" /></label>)}</div>
            <button onClick={() => { setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, elements: slide.elements.filter((item) => item.id !== selectedElement.id) } : slide) })); setSelectedId(''); }} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200/15 px-3 py-2 text-xs text-rose-200/75 hover:bg-rose-200/[.06]"><Trash2 size={13} /> Remove selected object</button>
          </div> : selectedElement?.type === 'image' ? <div className="mt-4 space-y-3"><p className="text-xs leading-5 text-white/45">Image selected · drag the handle to position it.</p><div className="grid grid-cols-2 gap-2">{[['X', 'x'], ['Y', 'y'], ['W', 'w'], ['H', 'h']].map(([label, key]) => <label key={key} className="text-[10px] text-white/40">{label}<input type="number" value={Math.round(selectedElement[key])} onChange={(event) => updateElement(selectedElement.id, { [key]: Math.max(key === 'w' || key === 'h' ? 20 : 0, Number(event.target.value) || 0) })} className="mt-1 block w-full rounded-md border border-white/10 bg-white/[.04] p-1.5 text-xs text-white" /></label>)}</div><button onClick={() => { setDeck((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, elements: slide.elements.filter((item) => item.id !== selectedElement.id) } : slide) })); setSelectedId(''); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200/15 px-3 py-2 text-xs text-rose-200/75 hover:bg-rose-200/[.06]"><Trash2 size={13} /> Remove image</button></div> : <p className="mt-4 text-xs leading-5 text-white/40">Select a text box or image to format it. Custom fonts you import appear in the font menu.</p>}
          <p className="mt-6 border-t border-white/[.07] pt-4 text-[10px] leading-4 text-white/30">This editor preserves common text boxes and images from PPTX files. Complex animations, charts, and master layouts may need adjustments after import.</p>
        </aside>
      </div>
      <footer className="border-t border-white/10 bg-[#0b1220] px-4 py-2 text-[11px] text-white/35">PPTX import · PPTX export · Images and fonts are embedded when supported by the Office format.</footer>
    </div>
  </OfficeFrame>;
}
