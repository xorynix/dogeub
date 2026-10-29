import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { AlignCenter, AlignLeft, AlignRight, Bold, Download, FilePlus2, Heading1, Heading2, ImagePlus, Italic, List, ListOrdered, LoaderCircle, Minus, Redo2, Underline, Undo2, Upload } from 'lucide-react';
import OfficeFrame from './OfficeFrame';
import { decodeDataUrl, downloadOfficeFile, fileAsDataUrl, listOfficeDocuments, safeFileName, saveOfficeDocument } from '../../utils/officeStorage';

const EMPTY_HTML = '<p>Start writing your document…</p>';
const FORMAT_BUTTONS = [
  { title: 'Bold', icon: Bold, command: 'bold' },
  { title: 'Italic', icon: Italic, command: 'italic' },
  { title: 'Underline', icon: Underline, command: 'underline' },
  { title: 'Bulleted list', icon: List, command: 'insertUnorderedList' },
  { title: 'Numbered list', icon: ListOrdered, command: 'insertOrderedList' },
  { title: 'Align left', icon: AlignLeft, command: 'justifyLeft' },
  { title: 'Center', icon: AlignCenter, command: 'justifyCenter' },
  { title: 'Align right', icon: AlignRight, command: 'justifyRight' },
];

function textRuns(node, inherited = {}, fallbackFont = 'Aptos', docx) {
  const { TextRun, ImageRun } = docx;
  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.nodeValue) return [];
    return [new TextRun({ text: node.nodeValue, font: inherited.font || fallbackFont, size: inherited.size || 22, bold: inherited.bold, italics: inherited.italics, underline: inherited.underline, strike: inherited.strike, color: inherited.color })];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const tag = node.tagName.toLowerCase();
  const style = node.style || {};
  const next = {
    ...inherited,
    bold: inherited.bold || tag === 'b' || tag === 'strong',
    italics: inherited.italics || tag === 'i' || tag === 'em',
    underline: inherited.underline || tag === 'u',
    strike: inherited.strike || tag === 's' || tag === 'del',
    font: style.fontFamily?.split(',')[0]?.replace(/["']/g, '').trim() || node.getAttribute?.('face') || inherited.font,
    size: style.fontSize ? Math.max(10, Math.round(parseFloat(style.fontSize) * 1.5)) : inherited.size,
    color: style.color && /^#[\da-f]{6}$/i.test(style.color) ? style.color.slice(1) : /^#[\da-f]{6}$/i.test(node.getAttribute?.('color') || '') ? node.getAttribute('color').slice(1) : inherited.color,
  };
  if (tag === 'br') return [new TextRun({ text: '', break: 1 })];
  if (tag === 'img') {
    try {
      const { mime, bytes } = decodeDataUrl(node.getAttribute('src'));
      const type = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
      const width = Math.min(600, Number(node.getAttribute('width')) || 420);
      const height = Math.min(800, Number(node.getAttribute('height')) || Math.round(width * 0.65));
      return [new ImageRun({ type, data: bytes, transformation: { width, height } })];
    } catch { return []; }
  }
  return Array.from(node.childNodes).flatMap((child) => textRuns(child, next, fallbackFont, docx));
}

function htmlToDocxNodes(html, fallbackFont, docx) {
  const { TextRun, Paragraph, HeadingLevel, AlignmentType } = docx;
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = parsed.body;
  const nodes = [];
  const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'div', 'section', 'article', 'main', 'header', 'footer', 'ul', 'ol', 'li', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']);
  const addBlock = (element, bullet = '') => {
    const tag = element.tagName.toLowerCase();
    const contentRuns = tag === 'img' ? textRuns(element, {}, fallbackFont, docx) : Array.from(element.childNodes).flatMap((child) => textRuns(child, {}, fallbackFont, docx));
    const runs = [...(bullet ? [new TextRun({ text: `${bullet} `, font: fallbackFont, size: 22 })] : []), ...contentRuns];
    const heading = ({ h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4 })[tag];
    const alignment = ({ center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED })[element.style.textAlign] || AlignmentType.LEFT;
    nodes.push(new Paragraph({ children: runs.length ? runs : [new TextRun(' ')], heading, alignment, spacing: { after: 140 } }));
  };
  const addInlineBlock = (children) => {
    const hasContent = children.some((child) => child.nodeType === Node.TEXT_NODE
      ? Boolean(child.nodeValue?.trim())
      : child.nodeType === Node.ELEMENT_NODE && (child.tagName.toLowerCase() === 'br' || Boolean(child.textContent?.trim()) || Boolean(child.querySelector?.('img'))));
    if (!hasContent) return;
    const runs = children.flatMap((child) => textRuns(child, {}, fallbackFont, docx));
    if (runs.length) nodes.push(new Paragraph({ children: runs, alignment: AlignmentType.LEFT, spacing: { after: 140 } }));
  };
  const visit = (element) => {
    if (element.nodeType === Node.TEXT_NODE) {
      addInlineBlock([element]);
      return;
    }
    if (element.nodeType !== Node.ELEMENT_NODE) return;
    const tag = element.tagName.toLowerCase();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'img', 'td', 'th'].includes(tag)) {
      addBlock(element);
      return;
    }
    if (tag === 'li') {
      addBlock(element, '•');
      return;
    }

    // Browsers often create divs inside contentEditable, and pasted HTML can
    // contain arbitrary wrappers. Keep their direct text while recursively
    // converting nested block elements instead of silently dropping it.
    let inlineChildren = [];
    const flushInline = () => {
      if (inlineChildren.length) addInlineBlock(inlineChildren);
      inlineChildren = [];
    };
    Array.from(element.childNodes).forEach((child) => {
      const childTag = child.nodeType === Node.ELEMENT_NODE ? child.tagName.toLowerCase() : '';
      if (blockTags.has(childTag)) {
        flushInline();
        visit(child);
      } else {
        inlineChildren.push(child);
      }
    });
    flushInline();
  };
  Array.from(body.childNodes).forEach(visit);
  if (!nodes.length) nodes.push(new Paragraph({ children: [new TextRun(' ')] }));
  return nodes;
}

export default function WordEditor({ fonts, fontError, addFont }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [documentData, setDocumentData] = useState(null);
  const [html, setHtml] = useState(EMPTY_HTML);
  const [defaultFont, setDefaultFont] = useState('Aptos');
  const [fontSize, setFontSize] = useState('11');
  const [savedLabel, setSavedLabel] = useState('Opening document…');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const newDocument = useCallback(async () => {
    const created = { id: crypto.randomUUID(), type: 'word', title: 'Untitled document', content: { html: EMPTY_HTML, defaultFont: 'Aptos' }, updatedAt: Date.now() };
    try { await saveOfficeDocument(created); } catch (error) { setMessage(error.message || 'Could not save the new document locally.'); }
    setDocumentData(created);
    setHtml(EMPTY_HTML);
    setDefaultFont('Aptos');
    setSavedLabel('New document');
    navigate('/office/word', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const requestedId = new URLSearchParams(location.search).get('id');
    listOfficeDocuments('word').then((documents) => {
      if (!active) return;
      const found = documents.find((item) => item.id === requestedId) || documents[0];
      if (found) {
        setDocumentData(found);
        setHtml(found.content?.html || EMPTY_HTML);
        setDefaultFont(found.content?.defaultFont || 'Aptos');
      } else {
        const created = { id: crypto.randomUUID(), type: 'word', title: 'Untitled document', content: { html: EMPTY_HTML, defaultFont: 'Aptos' }, updatedAt: Date.now() };
        setDocumentData(created);
        setHtml(EMPTY_HTML);
        setDefaultFont('Aptos');
      }
      setSavedLabel('Saved on this device');
    }).catch((error) => { if (active) { setMessage(error.message || 'Local document storage is unavailable.'); setSavedLabel('Storage unavailable'); } });
    return () => { active = false; };
  }, [location.search]);

  useEffect(() => {
    if (!documentData || !editorRef.current) return;
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = DOMPurify.sanitize(html);
  }, [documentData?.id]);

  useEffect(() => {
    if (!documentData) return undefined;
    const timeout = window.setTimeout(async () => {
      const next = { ...documentData, title: documentData.title || 'Untitled document', content: { html, defaultFont }, updatedAt: Date.now() };
      try {
        await saveOfficeDocument(next);
        setDocumentData(next);
        setSavedLabel('Saved just now');
      } catch (error) { setSavedLabel('Could not save locally'); setMessage(error.message || 'Local storage is full. Export a copy to keep your work.'); }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [documentData?.id, documentData?.title, html, defaultFont]);

  const onEdit = () => {
    if (!editorRef.current) return;
    setHtml(editorRef.current.innerHTML);
    setSavedLabel('Saving…');
  };

  const command = (name, value) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    onEdit();
  };

  const importDocument = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      let importedHtml;
      if (/\.docx$/i.test(file.name)) {
        const module = await import('mammoth');
        const mammoth = module.default || module;
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { includeDefaultStyleMap: true });
        importedHtml = result.value;
        if (result.messages.length) setMessage(`${result.messages.length} item(s) in this file could not be fully converted; review the document before exporting.`);
      } else if (/\.html?$/i.test(file.name)) {
        importedHtml = await file.text();
      } else {
        importedHtml = (await file.text()).split(/\r?\n/).map((line) => `<p>${line.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) || '<br>'}</p>`).join('');
      }
      const sanitized = DOMPurify.sanitize(importedHtml, { USE_PROFILES: { html: true }, ADD_TAGS: ['img'], ADD_ATTR: ['src', 'width', 'height', 'style'] });
      const next = { id: crypto.randomUUID(), type: 'word', title: file.name.replace(/\.(docx|html?|txt)$/i, '') || 'Imported document', content: { html: sanitized || EMPTY_HTML, defaultFont }, updatedAt: Date.now() };
      await saveOfficeDocument(next);
      setDocumentData(next);
      setHtml(next.content.html);
      setSavedLabel('Imported and saved');
      setMessage('Imported document is ready to edit.');
      navigate(`/office/word?id=${encodeURIComponent(next.id)}`, { replace: true });
    } catch (error) { setMessage(error.message || 'That document could not be imported.'); }
    finally { setBusy(false); }
  };

  const addImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Choose an image file.'); return; }
    try {
      const source = await fileAsDataUrl(file);
      editorRef.current?.focus();
      document.execCommand('insertImage', false, source);
      onEdit();
    } catch (error) { setMessage(error.message || 'That image could not be added.'); }
  };

  const exportDocx = async () => {
    if (!documentData || !editorRef.current) return;
    setBusy(true);
    setMessage('');
    try {
      const latest = { ...documentData, title: documentData.title || 'Untitled document', content: { html: editorRef.current.innerHTML, defaultFont }, updatedAt: Date.now() };
      await saveOfficeDocument(latest);
      setDocumentData(latest);
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } = await import('docx');
      const children = htmlToDocxNodes(latest.content.html, defaultFont, { TextRun, Paragraph, HeadingLevel, AlignmentType, ImageRun });
      const doc = new Document({ creator: 'DOGEUB Office', title: latest.title, sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      downloadOfficeFile(blob, `${safeFileName(latest.title, 'Untitled document')}.docx`);
      setSavedLabel('Exported just now');
    } catch (error) { setMessage(error.message || 'Word document export failed.'); }
    finally { setBusy(false); }
  };

  const updateTitle = (title) => setDocumentData((current) => current ? { ...current, title: title.slice(0, 100) } : current);
  const ToolbarButton = ({ item }) => { const Icon = item.icon; return <button type="button" title={item.title} aria-label={item.title} onMouseDown={(event) => { event.preventDefault(); command(item.command); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-200 hover:text-slate-950"><Icon size={15} /></button>; };

  return <OfficeFrame appId="word" title={documentData?.title || ''} onTitleChange={updateTitle} savedLabel={savedLabel} fonts={fonts} fontError={fontError} addFont={addFont}>
    <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#101a2a] px-3 py-2 sm:px-5">
        <button type="button" onClick={newDocument} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><FilePlus2 size={14} /> New</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><Upload size={14} /> Import</button>
        <input ref={fileInputRef} type="file" accept=".docx,.html,.htm,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/plain" className="sr-only" onChange={importDocument} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <select aria-label="Font family" value={defaultFont} onChange={(event) => { setDefaultFont(event.target.value); command('fontName', event.target.value); }} className="h-8 max-w-36 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white/80 outline-none"><option value="Aptos">Aptos</option><option value="Arial">Arial</option><option value="Calibri">Calibri</option><option value="Cambria">Cambria</option><option value="Candara">Candara</option><option value="Comic Sans MS">Comic Sans MS</option><option value="Consolas">Consolas</option><option value="Courier New">Courier New</option><option value="Franklin Gothic Medium">Franklin Gothic Medium</option><option value="Garamond">Garamond</option><option value="Georgia">Georgia</option><option value="Impact">Impact</option><option value="Lucida Console">Lucida Console</option><option value="Palatino Linotype">Palatino Linotype</option><option value="Segoe UI">Segoe UI</option><option value="Tahoma">Tahoma</option><option value="Times New Roman">Times New Roman</option><option value="Trebuchet MS">Trebuchet MS</option><option value="Verdana">Verdana</option>{fonts.map((font) => <option key={font.name} value={font.name}>{font.name}</option>)}</select>
        <select aria-label="Font size" value={fontSize} onChange={(event) => { setFontSize(event.target.value); command('fontSize', '7'); const selected = window.getSelection()?.anchorNode?.parentElement; if (selected) selected.style.fontSize = `${event.target.value}pt`; onEdit(); }} className="h-8 w-16 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white/80 outline-none">{['8','9','10','11','12','14','16','18','20','24','28','36','48'].map((size) => <option key={size} value={size}>{size}</option>)}</select>
        {FORMAT_BUTTONS.map((item) => <ToolbarButton key={item.command} item={item} />)}
        <button type="button" title="Heading 1" onMouseDown={(event) => { event.preventDefault(); command('formatBlock', 'H1'); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200"><Heading1 size={16} /></button>
        <button type="button" title="Heading 2" onMouseDown={(event) => { event.preventDefault(); command('formatBlock', 'H2'); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200"><Heading2 size={16} /></button>
        <button type="button" title="Undo" onMouseDown={(event) => { event.preventDefault(); command('undo'); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200"><Undo2 size={15} /></button>
        <button type="button" title="Redo" onMouseDown={(event) => { event.preventDefault(); command('redo'); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-200"><Redo2 size={15} /></button>
        <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-200" title="Insert image"><ImagePlus size={15} /><input ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={addImage} /></label>
        <button type="button" onClick={exportDocx} disabled={busy} className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export DOCX</button>
      </div>
      {message && <div role="status" className="flex items-center justify-between border-b border-cyan-100/10 bg-cyan-100/[.04] px-4 py-2 text-xs text-cyan-100/80"><span>{message}</span><button type="button" onClick={() => setMessage('')} className="p-1" aria-label="Dismiss"><Minus size={13} /></button></div>}
      <div className="flex-1 overflow-auto bg-[#111b2a] px-3 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto min-h-[1056px] w-full max-w-[816px] bg-white px-[clamp(1.25rem,8vw,4.5rem)] py-[clamp(1.5rem,8vw,5rem)] text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,.32)]">
          <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="Document editor" aria-multiline="true" onInput={onEdit} onPaste={() => window.setTimeout(onEdit, 0)} style={{ fontFamily: defaultFont, fontSize: '11pt', lineHeight: 1.7, minHeight: '900px', outline: 'none', userSelect: 'text' }} className="office-word-content prose max-w-none focus:outline-none [&_img]:my-4 [&_img]:max-w-full [&_p]:mb-3 [&_h1]:mb-4 [&_h1]:mt-7 [&_h1]:text-3xl [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6" />
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-white/10 bg-[#0b1220] px-4 py-2 text-[11px] text-white/35"><span>{documentData ? `${documentData.title || 'Untitled document'} · private to this browser` : 'Opening local workspace…'}</span><span>DOCX import · DOCX export</span></footer>
    </div>
  </OfficeFrame>;
}
