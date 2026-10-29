import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlignCenter, AlignLeft, AlignRight, Bold, Download, FilePlus2, ImagePlus, Italic, LoaderCircle, Plus, Trash2, Underline, Upload } from 'lucide-react';
import OfficeFrame from './OfficeFrame';
import { downloadOfficeFile, fileAsDataUrl, listOfficeDocuments, safeFileName, saveOfficeDocument } from '../../utils/officeStorage';

const ROW_LIMIT = 60;
const COL_LIMIT = 18;
const freshWorkbook = () => ({ sheets: [{ id: crypto.randomUUID(), name: 'Sheet1', cells: {}, images: [] }] });
const columnName = (index) => { let value = index + 1; let result = ''; while (value) { value -= 1; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); } return result; };
const columnIndex = (value) => { let index = 0; for (const char of String(value).toUpperCase()) index = index * 26 + char.charCodeAt(0) - 64; return index - 1; };
const addressAt = (row, column) => `${columnName(column)}${row + 1}`;
const parseAddress = (address) => { const match = String(address).match(/^\$?([A-Z]{1,3})\$?(\d+)$/i); return match ? { row: Number(match[2]) - 1, column: columnIndex(match[1]) } : null; };
const valueAt = (sheet, address) => sheet.cells?.[address] || { value: '' };
const visibleValue = (value) => value == null ? '' : typeof value === 'object' ? String(value.text || value.result || '') : String(value);

function calculateArithmetic(expression) {
  const source = String(expression).replace(/\s+/g, '');
  let position = 0;
  const primary = () => {
    const sign = source[position] === '-' ? -1 : source[position] === '+' ? 1 : 0;
    if (sign) position += 1;
    if (source[position] === '(') {
      position += 1;
      const value = sum();
      if (source[position] !== ')') throw new Error('Expected a closing parenthesis.');
      position += 1;
      return sign ? sign * value : value;
    }
    const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw new Error('Expected a number.');
    position += match[0].length;
    return (sign || 1) * Number(match[0]);
  };
  const product = () => {
    let value = primary();
    while (source[position] === '*' || source[position] === '/') {
      const operator = source[position++];
      const next = primary();
      value = operator === '*' ? value * next : value / next;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (source[position] === '+' || source[position] === '-') {
      const operator = source[position++];
      const next = product();
      value = operator === '+' ? value + next : value - next;
    }
    return value;
  };
  const result = sum();
  if (position !== source.length || !Number.isFinite(result)) throw new Error('Invalid arithmetic expression.');
  return result;
}

function evaluateCell(sheet, address, stack = new Set()) {
  const cell = valueAt(sheet, address);
  if (!cell.formula) return cell.value;
  if (stack.has(address)) return '#CYCLE!';
  const nextStack = new Set(stack).add(address);
  const expression = String(cell.formula).replace(/^=/, '').trim();
  const referenceValue = (ref) => {
    const normalized = ref.replace(/\$/g, '').toUpperCase();
    const value = evaluateCell(sheet, normalized, nextStack);
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const rangeValues = (range) => {
    const [first, last = first] = range.split(':');
    const start = parseAddress(first);
    const end = parseAddress(last);
    if (!start || !end) return [];
    const values = [];
    for (let row = Math.min(start.row, end.row); row <= Math.min(Math.max(start.row, end.row), ROW_LIMIT - 1); row += 1) {
      for (let column = Math.min(start.column, end.column); column <= Math.min(Math.max(start.column, end.column), COL_LIMIT - 1); column += 1) values.push(evaluateCell(sheet, addressAt(row, column), nextStack));
    }
    return values;
  };
  const aggregate = expression.match(/^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA)\((.*)\)$/i);
  if (aggregate) {
    const values = aggregate[2].split(',').flatMap((arg) => {
      const token = arg.trim();
      if (!token) return [];
      if (/^\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?$/i.test(token)) return rangeValues(token);
      const numeric = Number(token);
      return Number.isFinite(numeric) ? [numeric] : [token.replace(/^"|"$/g, '')];
    });
    const numericValues = values.map(Number).filter(Number.isFinite);
    switch (aggregate[1].toUpperCase()) {
      case 'SUM': return numericValues.reduce((sum, item) => sum + item, 0);
      case 'AVERAGE': return numericValues.length ? numericValues.reduce((sum, item) => sum + item, 0) / numericValues.length : 0;
      case 'MIN': return numericValues.length ? Math.min(...numericValues) : 0;
      case 'MAX': return numericValues.length ? Math.max(...numericValues) : 0;
      case 'COUNT': return numericValues.length;
      case 'COUNTA': return values.filter((item) => item !== '' && item != null).length;
      default: return '#VALUE!';
    }
  }
  const substituted = expression.replace(/\$?[A-Z]{1,3}\$?\d+/gi, referenceValue);
  try { return calculateArithmetic(substituted); } catch { return '#VALUE!'; }
}

function rawCellValue(cell) {
  if (!cell) return { value: '' };
  const formula = cell.formula ? `=${cell.formula}` : '';
  let value = cell.value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.richText)) value = value.richText.map((run) => run.text || '').join('');
    else if (value.hyperlink) value = value.text || value.hyperlink;
    else if ('result' in value) value = value.result ?? '';
    else value = cell.text || '';
  }
  if (value instanceof Date) value = value.toLocaleString();
  const style = {};
  if (cell.font?.name || cell.font?.size || cell.font?.bold || cell.font?.italic || cell.font?.underline || cell.font?.color?.argb) {
    style.font = { name: cell.font.name, size: cell.font.size, bold: cell.font.bold, italic: cell.font.italic, underline: cell.font.underline, color: cell.font.color?.argb?.slice(-6) };
  }
  if (cell.alignment?.horizontal) style.align = cell.alignment.horizontal;
  return { value: value ?? '', formula, style };
}

function workbookFromExcel(excelWorkbook) {
  return { sheets: excelWorkbook.worksheets.map((worksheet) => {
    const cells = {};
    worksheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (cell) => { cells[cell.address] = rawCellValue(cell); }));
    const images = (worksheet.getImages?.() || []).map((image) => {
      const source = excelWorkbook.getImage(image.imageId);
      if (!source?.buffer) return null;
      const bytes = source.buffer instanceof Uint8Array ? source.buffer : new Uint8Array(source.buffer);
      let binary = '';
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      const extension = source.extension === 'jpeg' ? 'jpeg' : source.extension || 'png';
      const tl = image.range?.tl || { col: 0, row: 0 };
      return { id: crypto.randomUUID(), data: `data:image/${extension};base64,${btoa(binary)}`, extension, address: addressAt(Math.max(0, Math.floor(tl.row)), Math.max(0, Math.floor(tl.col))) };
    }).filter(Boolean);
    return { id: crypto.randomUUID(), name: worksheet.name, cells, images };
  }) };
}

export default function SpreadsheetEditor({ fonts, fontError, addFont }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const gridRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [workbook, setWorkbook] = useState(freshWorkbook);
  const [activeSheetId, setActiveSheetId] = useState('');
  const [activeAddress, setActiveAddress] = useState('A1');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('Untitled workbook');
  const [savedLabel, setSavedLabel] = useState('Opening workbook…');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const activeSheet = workbook.sheets.find((sheet) => sheet.id === activeSheetId) || workbook.sheets[0];
  const activeCell = activeSheet ? valueAt(activeSheet, activeAddress) : { value: '' };
  const formulaValue = activeCell.formula || visibleValue(activeCell.value);
  const rows = useMemo(() => {
    const maxRow = Object.keys(activeSheet?.cells || {}).reduce((max, address) => Math.max(max, parseAddress(address)?.row ?? 0), 0);
    return Math.min(Math.max(24, maxRow + 1), ROW_LIMIT);
  }, [activeSheet]);

  useEffect(() => {
    let alive = true;
    const requestedId = new URLSearchParams(location.search).get('id');
    listOfficeDocuments('sheet').then((documents) => {
      if (!alive) return;
      const found = documents.find((item) => item.id === requestedId) || documents[0];
      if (found) {
        const value = found.content?.workbook || freshWorkbook();
        setDoc(found); setTitle(found.title || 'Untitled workbook'); setWorkbook(value); setActiveSheetId(value.sheets[0]?.id || '');
      } else {
        const value = freshWorkbook();
        setDoc({ id: crypto.randomUUID(), type: 'sheet', title: 'Untitled workbook', content: { workbook: value }, updatedAt: Date.now() });
        setWorkbook(value); setActiveSheetId(value.sheets[0].id);
      }
      setSavedLabel('Saved on this device');
    }).catch((error) => setNotice(error.message || 'Local workbook storage is unavailable.'));
    return () => { alive = false; };
  }, [location.search]);

  useEffect(() => {
    if (!doc) return undefined;
    const timer = window.setTimeout(async () => {
      const next = { ...doc, title, content: { workbook }, updatedAt: Date.now() };
      try { await saveOfficeDocument(next); setDoc(next); setSavedLabel('Saved just now'); }
      catch (error) { setSavedLabel('Could not save locally'); setNotice(error.message || 'Browser storage is full. Export a copy to keep this workbook.'); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [doc?.id, title, workbook]);

  const updateCell = useCallback((address, value) => {
    setWorkbook((current) => ({ ...current, sheets: current.sheets.map((sheet) => {
      if (sheet.id !== activeSheetId) return sheet;
      const previous = valueAt(sheet, address);
      const nextCell = String(value).startsWith('=') ? { ...previous, formula: String(value), value: previous.value } : { ...previous, value, formula: '' };
      return { ...sheet, cells: { ...sheet.cells, [address]: nextCell } };
    }) }));
  }, [activeSheetId]);

  const createWorkbook = async () => {
    const fresh = freshWorkbook();
    const next = { id: crypto.randomUUID(), type: 'sheet', title: 'Untitled workbook', content: { workbook: fresh }, updatedAt: Date.now() };
    try { await saveOfficeDocument(next); } catch (error) { setNotice(error.message || 'Could not save the new workbook locally.'); }
    setDoc(next); setTitle(next.title); setWorkbook(fresh); setActiveSheetId(fresh.sheets[0].id); setActiveAddress('A1'); setNotice(''); navigate('/office/sheet', { replace: true });
  };

  const importWorkbook = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setNotice('');
    try {
      await saveOfficeDocument({ ...doc, title, content: { workbook }, updatedAt: Date.now() });
      const { default: ExcelJS } = await import('exceljs');
      const parsed = new ExcelJS.Workbook();
      await parsed.xlsx.load(await file.arrayBuffer());
      const imported = workbookFromExcel(parsed);
      if (!imported.sheets.length) imported.sheets = freshWorkbook().sheets;
      const next = { id: crypto.randomUUID(), type: 'sheet', title: file.name.replace(/\.xlsx$/i, '') || 'Imported workbook', content: { workbook: imported }, updatedAt: Date.now() };
      await saveOfficeDocument(next);
      setDoc(next); setTitle(next.title); setWorkbook(imported); setActiveSheetId(imported.sheets[0]?.id || ''); setActiveAddress('A1');
      navigate(`/office/sheet?id=${encodeURIComponent(next.id)}`, { replace: true });
      setNotice('Workbook imported. Review formulas and formatting before sharing.');
    } catch (error) { setNotice(error.message || 'That workbook could not be imported.'); }
    finally { setBusy(false); }
  };

  const exportWorkbook = async () => {
    if (!workbook.sheets.length) return;
    setBusy(true); setNotice('');
    try {
      const { default: ExcelJS } = await import('exceljs');
      const output = new ExcelJS.Workbook();
      output.creator = 'DOGEUB Office'; output.created = new Date();
      for (const sheet of workbook.sheets) {
        const worksheet = output.addWorksheet(sheet.name.slice(0, 31) || 'Sheet');
        worksheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
        for (const [address, cellData] of Object.entries(sheet.cells || {})) {
          const cell = worksheet.getCell(address);
          if (cellData.formula) {
            const formula = String(cellData.formula).replace(/^=/, '');
            const result = evaluateCell(sheet, address);
            cell.value = { formula, result: typeof result === 'number' ? result : undefined };
          } else cell.value = cellData.value ?? '';
          const font = cellData.style?.font;
          if (font) cell.font = { name: font.name || 'Arial', size: Number(font.size) || 11, bold: Boolean(font.bold), italic: Boolean(font.italic), underline: Boolean(font.underline), color: font.color ? { argb: `FF${font.color.slice(-6)}` } : undefined };
          if (cellData.style?.align) cell.alignment = { horizontal: cellData.style.align };
        }
        for (const image of sheet.images || []) {
          const match = image.data.match(/^data:image\/([^;]+);base64,(.+)$/i);
          if (!match) continue;
          const imageId = output.addImage({ base64: match[2], extension: match[1] === 'jpg' ? 'jpeg' : match[1] });
          const anchor = parseAddress(image.address) || { row: 0, column: 0 };
          worksheet.addImage(imageId, { tl: { col: anchor.column, row: anchor.row }, ext: { width: 160, height: 100 } });
        }
      }
      const buffer = await output.xlsx.writeBuffer();
      downloadOfficeFile(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${safeFileName(title, 'Untitled workbook')}.xlsx`);
      setSavedLabel('Exported just now');
    } catch (error) { setNotice(error.message || 'Workbook export failed.'); }
    finally { setBusy(false); }
  };

  const addImage = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const data = await fileAsDataUrl(file);
      const extension = file.type === 'image/jpeg' ? 'jpeg' : file.type.split('/')[1];
      setWorkbook((current) => ({ ...current, sheets: current.sheets.map((sheet) => sheet.id === activeSheetId ? { ...sheet, images: [...(sheet.images || []), { id: crypto.randomUUID(), data, extension, address: activeAddress }] } : sheet) }));
      setNotice(`Image added at ${activeAddress}.`);
    } catch (error) { setNotice(error.message || 'Image could not be added.'); }
  };

  const addSheet = () => {
    const base = 'Sheet'; let name = `${base}${workbook.sheets.length + 1}`; let suffix = workbook.sheets.length + 1;
    while (workbook.sheets.some((sheet) => sheet.name.toLowerCase() === name.toLowerCase())) { suffix += 1; name = `${base}${suffix}`; }
    const sheet = { id: crypto.randomUUID(), name, cells: {}, images: [] };
    setWorkbook((current) => ({ ...current, sheets: [...current.sheets, sheet] })); setActiveSheetId(sheet.id); setActiveAddress('A1');
  };

  const deleteSheet = () => {
    if (workbook.sheets.length < 2) return;
    const next = workbook.sheets.filter((sheet) => sheet.id !== activeSheetId);
    setWorkbook((current) => ({ ...current, sheets: next })); setActiveSheetId(next[0].id); setActiveAddress('A1');
  };

  const applyStyle = (patch) => setWorkbook((current) => ({ ...current, sheets: current.sheets.map((sheet) => sheet.id === activeSheetId ? { ...sheet, cells: { ...sheet.cells, [activeAddress]: { ...valueAt(sheet, activeAddress), style: { ...valueAt(sheet, activeAddress).style, ...patch } } } } : sheet) }));
  const activeAddressToCell = () => gridRef.current?.querySelector(`[data-address="${activeAddress}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const handleFormulaChange = (value) => updateCell(activeAddress, value);
  const onCellKeyDown = (event, row, column) => {
    if (event.key === 'Enter') { event.preventDefault(); setEditing(false); setActiveAddress(addressAt(Math.min(rows - 1, row + 1), column)); window.setTimeout(activeAddressToCell, 0); }
    else if (event.key === 'Tab') { event.preventDefault(); setEditing(false); setActiveAddress(addressAt(row, (column + 1) % COL_LIMIT)); window.setTimeout(activeAddressToCell, 0); }
    else if (event.key === 'Escape') setEditing(false);
  };

  return <OfficeFrame appId="sheet" title={title} onTitleChange={setTitle} savedLabel={savedLabel} fonts={fonts} fontError={fontError} addFont={addFont}>
    <div className="flex h-[calc(100vh-64px)] min-h-[580px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#101a2a] px-3 py-2 sm:px-5">
        <button onClick={createWorkbook} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><FilePlus2 size={14} /> New</button>
        <button onClick={() => fileRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/65 hover:bg-white/10"><Upload size={14} /> Import XLSX</button><input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={importWorkbook} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={() => applyStyle({ font: { ...activeCell.style?.font, bold: !activeCell.style?.font?.bold, name: activeCell.style?.font?.name || 'Arial', size: activeCell.style?.font?.size || 11 } })} aria-label="Bold" title="Bold" className={'grid h-8 w-8 place-items-center rounded-lg ' + (activeCell.style?.font?.bold ? 'bg-cyan-200/15 text-cyan-100' : 'text-white/60 hover:bg-white/10')}><Bold size={15} /></button>
        <button onClick={() => applyStyle({ font: { ...activeCell.style?.font, italic: !activeCell.style?.font?.italic, name: activeCell.style?.font?.name || 'Arial', size: activeCell.style?.font?.size || 11 } })} aria-label="Italic" title="Italic" className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10"><Italic size={15} /></button>
        <button onClick={() => applyStyle({ font: { ...activeCell.style?.font, underline: !activeCell.style?.font?.underline, name: activeCell.style?.font?.name || 'Arial', size: activeCell.style?.font?.size || 11 } })} aria-label="Underline" title="Underline" className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10"><Underline size={15} /></button>
        {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([align, Icon]) => <button key={align} onClick={() => applyStyle({ align })} aria-label={`Align ${align}`} title={`Align ${align}`} className={'grid h-8 w-8 place-items-center rounded-lg ' + (activeCell.style?.align === align ? 'bg-cyan-200/15 text-cyan-100' : 'text-white/60 hover:bg-white/10')}><Icon size={15} /></button>)}
        <select value={activeCell.style?.font?.name || 'Arial'} onChange={(event) => applyStyle({ font: { ...activeCell.style?.font, name: event.target.value, size: activeCell.style?.font?.size || 11 } })} aria-label="Cell font" className="h-8 max-w-36 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white/80 outline-none"><option>Arial</option><option>Aptos</option><option>Calibri</option><option>Cambria</option><option>Candara</option><option>Comic Sans MS</option><option>Consolas</option><option>Courier New</option><option>Franklin Gothic Medium</option><option>Garamond</option><option>Georgia</option><option>Impact</option><option>Lucida Console</option><option>Palatino Linotype</option><option>Segoe UI</option><option>Tahoma</option><option>Times New Roman</option><option>Trebuchet MS</option><option>Verdana</option>{fonts.map((font) => <option key={font.name}>{font.name}</option>)}</select>
        <button onClick={() => imageRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-white/60 hover:bg-white/10"><ImagePlus size={14} /> Image</button><input ref={imageRef} type="file" accept="image/png,image/jpeg,image/gif" className="sr-only" onChange={addImage} />
        <button onClick={exportWorkbook} disabled={busy} className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-200 disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export XLSX</button>
      </div>
      {notice && <div role="status" className="border-b border-cyan-100/10 bg-cyan-100/[.04] px-4 py-2 text-xs text-cyan-100/80">{notice}</div>}
      <div className="flex items-center gap-2 border-b border-white/[.07] bg-[#0d1624] px-3 py-2 text-xs">
        <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-1 font-semibold text-white/60">{activeAddress}</span><span className="h-5 w-px bg-white/10" />
        <input value={formulaValue} onChange={(event) => handleFormulaChange(event.target.value)} aria-label="Cell value or formula" placeholder="Enter a value or formula, for example =SUM(A1:A5)" className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-white/25" />
        <span className="hidden text-[11px] text-white/30 md:inline">Basic formulas: SUM, AVERAGE, MIN, MAX, COUNT</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#f1f4f8] text-slate-900" ref={gridRef}>
        <table className="border-collapse text-xs" style={{ minWidth: '100%' }}><thead className="sticky top-0 z-10"><tr><th className="sticky left-0 z-20 min-w-10 border border-slate-300 bg-slate-200 p-1 text-[10px] font-medium text-slate-500">#</th>{Array.from({ length: COL_LIMIT }, (_, column) => <th key={column} className="min-w-28 border border-slate-300 bg-slate-200 px-2 py-1 font-semibold text-slate-600">{columnName(column)}</th>)}</tr></thead><tbody>{Array.from({ length: rows }, (_, row) => <tr key={row}><th className="sticky left-0 z-[5] border border-slate-300 bg-slate-100 px-2 text-right text-[10px] font-medium text-slate-500">{row + 1}</th>{Array.from({ length: COL_LIMIT }, (_, column) => {
          const address = addressAt(row, column); const cell = valueAt(activeSheet || { cells: {} }, address); const selected = address === activeAddress; const display = cell.formula ? visibleValue(evaluateCell(activeSheet, address)) : visibleValue(cell.value); const image = activeSheet?.images?.find((item) => item.address === address);
          return <td key={address} data-address={address} onClick={() => { setActiveAddress(address); setEditing(false); }} onDoubleClick={() => { setActiveAddress(address); setEditing(true); }} className={'h-8 min-w-28 border border-slate-300 bg-white p-0 ' + (selected ? 'relative z-[1] outline outline-2 outline-emerald-500' : 'hover:bg-emerald-50')}>
            {editing && selected ? <input autoFocus value={cell.formula || visibleValue(cell.value)} onChange={(event) => updateCell(address, event.target.value)} onBlur={() => setEditing(false)} onKeyDown={(event) => onCellKeyDown(event, row, column)} className="h-8 w-full bg-white px-2 text-xs outline-none" aria-label={`Cell ${address}`} /> : <div role="gridcell" tabIndex={selected ? 0 : -1} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); setEditing(true); } }} className="flex h-8 min-w-28 items-center gap-1 overflow-hidden px-2" style={{ textAlign: cell.style?.align || 'left', fontFamily: cell.style?.font?.name || 'Arial', fontWeight: cell.style?.font?.bold ? 700 : 400, fontStyle: cell.style?.font?.italic ? 'italic' : 'normal', textDecoration: cell.style?.font?.underline ? 'underline' : 'none' }} title={display}>{image && <img src={image.data} alt="Inserted" className="h-6 max-w-12 object-contain" />}<span className="truncate">{display}</span></div>}
          </td>;
        })}</tr>)}</tbody></table>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-[#0b1220] px-3 py-2">{workbook.sheets.map((sheet) => <button key={sheet.id} onClick={() => { setActiveSheetId(sheet.id); setActiveAddress('A1'); setEditing(false); }} className={'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium ' + (sheet.id === activeSheetId ? 'border-emerald-200/30 bg-emerald-200/10 text-emerald-100' : 'border-transparent text-white/45 hover:bg-white/[.05] hover:text-white/80')}>{sheet.name}</button>)}<button onClick={addSheet} title="Add sheet" aria-label="Add sheet" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/10"><Plus size={15} /></button><button onClick={deleteSheet} disabled={workbook.sheets.length < 2} title="Delete current sheet" aria-label="Delete current sheet" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-rose-300/10 hover:text-rose-200 disabled:opacity-30"><Trash2 size={14} /></button><span className="ml-auto shrink-0 text-[10px] text-white/30">XLSX import · XLSX export</span></div>
    </div>
  </OfficeFrame>;
}
