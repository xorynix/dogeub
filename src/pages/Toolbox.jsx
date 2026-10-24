import { useState } from 'react';
import { Copy, Download, FileJson, Image, QrCode, Type, Palette } from 'lucide-react';
import Nav from '../layouts/Nav';

const TOOLS = [
  { id: 'text', title: 'Text lab', icon: Type, detail: 'Transform text and count words' },
  { id: 'json', title: 'JSON formatter', icon: FileJson, detail: 'Validate, pretty-print, or minify JSON' },
  { id: 'color', title: 'Color picker', icon: Palette, detail: 'Choose a color and copy its values' },
  { id: 'qr', title: 'QR maker', icon: QrCode, detail: 'Create a QR image from a short link or text' },
  { id: 'image', title: 'Image resizer', icon: Image, detail: 'Resize an image locally in your browser' },
];
async function copyText(value) {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
  await navigator.clipboard.writeText(value);
}
export default function Toolbox() {
  const [active, setActive] = useState('text');
  const [text, setText] = useState('');
  const [json, setJson] = useState('{"name":"DOGEUB","tools":["formatter","word counter"]}');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [color, setColor] = useState('#22d3ee');
  const [qrText, setQrText] = useState('https://');
  const [imageSrc, setImageSrc] = useState('');
  const [imageName, setImageName] = useState('image');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [notice, setNotice] = useState('');

  const performText = (mode) => setText((value) => {
    if (mode === 'upper') return value.toUpperCase();
    if (mode === 'lower') return value.toLowerCase();
    if (mode === 'title') return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
    if (mode === 'compact') return value.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    if (mode === 'blank') return value.split('\n').filter((line) => line.trim()).join('\n');
    if (mode === 'reverse') return [...value].reverse().join('');
    return value;
  });
  const formatJson = (minify) => {
    try { const value = JSON.parse(json); setJsonOutput(JSON.stringify(value, null, minify ? 0 : 2)); setJsonError(''); }
    catch (error) { setJsonError(error.message || 'Invalid JSON'); setJsonOutput(''); }
  };
  const downloadImage = () => {
    if (!imageSrc) return;
    const img = new window.Image();
    img.onload = () => {
      const targetWidth = Math.max(1, Math.min(4000, Number(width) || img.naturalWidth));
      const targetHeight = Math.max(1, Math.min(4000, Number(height) || img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth; canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) { setNotice('Image canvas is unavailable.'); return; }
      context.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((blob) => {
        if (!blob) { setNotice('Could not export this image.'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = imageName.replace(/\.[^.]+$/, '') + '-' + targetWidth + 'x' + targetHeight + '.png';
        link.click(); URL.revokeObjectURL(url); setNotice('Resized PNG created.');
      }, 'image/png');
    };
    img.onerror = () => setNotice('Could not decode this image file.');
    img.src = imageSrc;
  };
  const copy = async (value) => { try { await copyText(value); setNotice('Copied to clipboard.'); } catch (error) { setNotice(error.message); } };

  return <div className="min-h-screen text-white"><Nav /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">DOGEUB Tools</p><h1 className="text-3xl font-bold sm:text-4xl">One toolbox. Lots of little wins.</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Text helpers, JSON tools, color picking, QR creation, and browser-based image resizing.</p>
    {notice && <div role="status" className="mt-4 flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex flex-row gap-2 overflow-x-auto lg:flex-col">{TOOLS.map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => { setActive(tool.id); setNotice(''); }} className={'min-w-36 rounded-2xl border p-3 text-left transition ' + (active === tool.id ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-white/10 bg-slate-950/40 hover:bg-white/5')}><span className="flex items-center gap-2 font-semibold"><Icon size={16} className="text-cyan-300" />{tool.title}</span><span className="mt-1 block text-xs text-slate-400">{tool.detail}</span></button>; })}</aside>
      <section className="min-h-[450px] rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-7">
        {active === 'text' && <div><h2 className="text-xl font-semibold">Text lab</h2><p className="mt-1 text-sm text-slate-400">Make quick edits without sending your text to a server.</p><textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} placeholder="Paste or type text here..." className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 p-4 leading-6 outline-none focus:border-cyan-300/50" /><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['compact','Clean spacing'],['blank','Remove blank lines'],['reverse','Reverse text']].map(([mode,label]) => <button key={mode} onClick={() => performText(mode)} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">{label}</button>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300"><span>{text.length} characters · {text.trim() ? text.trim().split(/\s+/).length : 0} words · {text ? text.split('\n').length : 0} lines</span><button onClick={() => copy(text)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950"><Copy size={15} /> Copy text</button></div></div>}
        {active === 'json' && <div><h2 className="text-xl font-semibold">JSON formatter</h2><p className="mt-1 text-sm text-slate-400">Parsing happens locally in your browser.</p><textarea value={json} onChange={(event) => setJson(event.target.value)} rows={9} spellCheck={false} className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-6 outline-none focus:border-cyan-300/50" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => formatJson(false)} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Pretty print</button><button onClick={() => formatJson(true)} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Minify</button><button onClick={() => { setJson(''); setJsonOutput(''); setJsonError(''); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Clear</button></div>{jsonError && <p role="alert" className="mt-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">JSON error: {jsonError}</p>}{jsonOutput && <div className="mt-4"><textarea readOnly value={jsonOutput} rows={9} className="w-full rounded-2xl border border-emerald-300/20 bg-black/20 p-4 font-mono text-sm leading-6" /><button onClick={() => copy(jsonOutput)} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"><Copy size={14} /> Copy output</button></div>}</div>}
        {active === 'color' && <div><h2 className="text-xl font-semibold">Color picker</h2><p className="mt-1 text-sm text-slate-400">Choose a color and copy the HEX, RGB, or HSL-compatible CSS value.</p><div className="mt-6 flex flex-wrap items-center gap-5"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Choose color" className="h-24 w-28 cursor-pointer rounded-xl border-0 bg-transparent" /><div><div className="text-3xl font-bold uppercase">{color}</div><div className="mt-1 text-sm text-slate-400">HEX color</div></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{[{label:'HEX',value:color.toUpperCase()},{label:'RGB',value:(() => { const h=color.slice(1); return 'rgb(' + parseInt(h.slice(0,2),16) + ', ' + parseInt(h.slice(2,4),16) + ', ' + parseInt(h.slice(4,6),16) + ')'; })()}].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">{item.label}</div><div className="mt-2 flex items-center justify-between gap-2"><code>{item.value}</code><button onClick={() => copy(item.value)} aria-label={'Copy ' + item.label} className="rounded-lg p-2 hover:bg-white/10"><Copy size={15} /></button></div></div>)}</div><div className="mt-6 h-28 rounded-2xl border border-white/10" style={{ backgroundColor: color }} /></div>}
        {active === 'qr' && <div><h2 className="text-xl font-semibold">QR maker</h2><p className="mt-1 text-sm text-slate-400">Create a downloadable QR image for a link or short piece of text.</p><textarea value={qrText} onChange={(event) => setQrText(event.target.value)} rows={3} maxLength={1200} placeholder="https://example.com" className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none focus:border-cyan-300/50" /><p className="mt-2 text-xs text-amber-200/80">Privacy note: the QR preview uses a third-party image service, so the text above is sent to that service when you preview or download it. Do not enter passwords or private information.</p>{qrText.trim() && <div className="mt-5 flex flex-wrap items-center gap-5"><img alt="QR code preview" className="h-56 w-56 rounded-xl bg-white p-2" src={'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(qrText)} /><a href={'https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=' + encodeURIComponent(qrText)} download="dogeub-qr.png" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950"><Download size={15} /> Open full-size QR</a></div>}</div>}
        {active === 'image' && <div><h2 className="text-xl font-semibold">Image resizer</h2><p className="mt-1 text-sm text-slate-400">Your image is processed locally in the browser and exported as PNG.</p><label className="mt-5 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/10 p-8 text-center hover:border-cyan-300/40"><span><Image size={24} className="mx-auto text-cyan-300" /><span className="mt-2 block font-medium">{imageName || 'Choose an image'}</span><span className="mt-1 block text-xs text-slate-400">PNG, JPG, WebP, and other browser-supported images</span></span><input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setNotice('Choose an image file.'); return; } if (file.size > 15 * 1024 * 1024) { setNotice('Choose an image under 15 MB.'); return; } setImageSrc(URL.createObjectURL(file)); setImageName(file.name); setNotice('Image loaded locally.'); }} /></label>{imageSrc && <><img src={imageSrc} alt="Selected image preview" className="mt-4 max-h-72 max-w-full rounded-xl object-contain" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Width (px)<input type="number" min="1" max="4000" value={width} onChange={(event) => setWidth(event.target.value)} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3" /></label><label className="text-sm text-slate-300">Height (px)<input type="number" min="1" max="4000" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 p-3" /></label></div><button onClick={downloadImage} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950"><Download size={15} /> Export PNG</button></>}</div>}
      </section>
    </div>
    <p className="mt-5 text-xs text-slate-500">DOGEUB toolbox utilities are designed for quick everyday tasks. Review privacy notes before sending information to any external service.</p>
  </main></div>;
}
