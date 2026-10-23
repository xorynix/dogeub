import { useEffect, useMemo, useState } from 'react';
import { Smile, X, Search, LayoutGrid, Plus, Trash2, Clock3, StickyNote, Hash, Link2, Type } from 'lucide-react';

const KEY = 'dogeub-emoji-widgets-v2';
const GROUPS = [
  ['Smileys', '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 🤫 🤨 😐 😏 🙄 😬 😴 🤒 🤢 🤧 🥵 🥶 😵 🤯 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😲 😳 🥺 😢 😭 😱 😩 😫 😤 😡 🤬 😈 💀 💩 🤡 👻 👽 🤖 🎃'],
  ['Hands', '👋 🤚 🖐️ ✋ 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 👏 🙌 🫶 🤝 🙏 💪 🦾 🦵 🦶 👂 👃 🧠 👀 👁️ 👅 👄'],
  ['Hearts & symbols', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 🩷 🩵 💔 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 💬 💭 💤 ✨ ⭐ 🌟 🔥 ⚡ ☀️ 🌈 ☁️ ❄️ 🌊 🎉 🎊 🎈 🎁 🏆 ✔️ ❌ ❗ ❓ 💡 🔔 🔒 🔑 ♻️ 🚫 💸 💵 💳 📌 🔗'],
  ['Animals', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦅 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐜 🕷️ 🐢 🐍 🦎 🦖 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐘 🦒 🦘 🐎 🐖 🐑 🦙 🦌 🐕 🐈 🦜 🐇 🦝 🦦 🦔 🌵 🌲 🌳 🌴 🌱 🌿 🍀 🍃 🍂 🍁 🍄 🌷 🌹 🌺 🌸 🌼 🌻'],
  ['Food', '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🌶️ 🥒 🥦 🧄 🧅 🍞 🥐 🥨 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥚 🍳 🍲 🥗 🍿 🍱 🍚 🍜 🍝 🍣 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍯 ☕ 🍵 🥤 🧋 🧊'],
  ['Activities', '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🎣 🥊 🥋 🛹 🛼 ⛸️ 🎿 🏋️ 🤸 🧘 🏄 🏊 🚴 🏆 🥇 🥈 🥉 🎨 🎬 🎤 🎧 🎹 🥁 🎸 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩'],
  ['Travel', '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚜 🛵 🏍️ 🛺 🚲 🛴 🚦 ⛽ 🚨 ⚓ ⛵ 🚤 🚢 ✈️ 🛫 🛬 🚁 🛰️ 🚀 🛸 🌍 🌎 🌏 🗺️ 🧭 🏔️ 🌋 🏕️ 🏖️ 🏝️ 🏠 🏡 🏢 🏥 🏨 🏫 🏰 🗼 🌃 🌆 🌉'],
  ['Objects', '⌚ 📱 💻 🖥️ 🖨️ ⌨️ 🖱️ 💾 💿 📷 📺 🔍 💡 🔦 📚 📓 📄 📰 ✉️ 📧 📦 ✏️ 📝 💼 📁 📂 📅 📆 📈 📉 📊 📋 📎 ✂️ 🗑️ 🔐 🔑 🔨 🛠️ 🔧 ⚙️ 🧰 🧪 🔬 🔭 💉 🩹 🩺 🛏️ 🛋️ 🪑 🚿 🛁 🧼 🛒'],
  ['Flags & arrows', '🏳️ 🏴 🏁 🚩 🇺🇸 🇬🇧 🇨🇦 🇲🇽 🇧🇷 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇵🇭 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇦🇺 🇳🇿 ⏩ ⏪ ⏫ ⏬ ▶️ ⏸️ ⏹️ ⏭️ ⏮️ 🔀 🔁 🔄 ➕ ➖ ➗ ✖️ ♾️ 🔙 🔛 🔝']
].map(([name, list]) => ({ name, emojis: list.split(' ') }));

const TYPES = [
  { id: 'clock', label: 'Clock', detail: 'Live time and date', Icon: Clock3 },
  { id: 'note', label: 'Sticky note', detail: 'Editable note', Icon: StickyNote },
  { id: 'counter', label: 'Counter', detail: 'Count up or down', Icon: Hash },
  { id: 'link', label: 'Quick link', detail: 'Save a website', Icon: Link2 },
  { id: 'text', label: 'Text card', detail: 'Your own text', Icon: Type }
];
function readWidgets() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}
export default function EmojiWidgets() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('emoji');
  const [category, setCategory] = useState('Smileys');
  const [search, setSearch] = useState('');
  const [widgets, setWidgets] = useState(readWidgets);
  const [adding, setAdding] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const openPanel = () => { setOpen(true); setTab('emoji'); setAdding(''); };
    window.addEventListener('dogeub-open-emoji-widgets', openPanel);
    return () => window.removeEventListener('dogeub-open-emoji-widgets', openPanel);
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(widgets)); } catch {}
  }, [widgets]);
  useEffect(() => {
    if (!open || tab !== 'widgets') return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open, tab]);
  const emojis = useMemo(() => GROUPS.flatMap(group => group.emojis.map(emoji => ({ emoji, group: group.name }))), []);
  const visibleEmojis = useMemo(() => emojis.filter(item => {
    const matchesSearch = !search || item.emoji.includes(search) || item.group.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (search || item.group === category);
  }), [emojis, search, category]);
  const notify = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1500);
  };
  const copyEmoji = async emoji => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(emoji);
      notify('Copied ' + emoji);
    } catch {
      setSearch(emoji);
      notify('Clipboard unavailable — select the emoji to copy');
    }
  };
  const beginAdd = type => {
    setAdding(type);
    setTitle(type === 'note' ? 'My note' : type === 'link' ? 'Quick link' : type === 'counter' ? 'Counter' : type === 'clock' ? 'Clock' : 'My widget');
    setBody(type === 'link' ? 'https://' : type === 'counter' ? '0' : '');
  };
  const saveWidget = event => {
    event.preventDefault();
    if (!adding) return;
    const url = adding === 'link' ? safeUrl(body.trim()) : '';
    if (adding === 'link' && !url) { notify('Enter a valid http:// or https:// link'); return; }
    setWidgets(previous => [...previous, {
      id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      type: adding,
      title: title.trim().slice(0, 48) || 'My widget',
      body: adding === 'link' ? url : body.slice(0, 4000),
      count: adding === 'counter' ? (Number.parseInt(body, 10) || 0) : 0
    }]);
    setAdding('');
    setTab('widgets');
    notify('Widget added');
  };
  const updateWidget = (id, patch) => setWidgets(previous => previous.map(widget => widget.id === id ? { ...widget, ...patch } : widget));
  if (!open) return null;

  return <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-black/60 p-3 text-white" onMouseDown={event => { if (event.target === event.currentTarget && !adding) setOpen(false); }}>
    <section role="dialog" aria-modal="true" aria-label="Emoji picker and custom widgets" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200"><Smile size={22}/></span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">Emoji & Widgets</h2><p className="text-xs text-white/50">Emoji picker and your personal widgets</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close panel" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button>
      </header>
      <div className="flex gap-2 border-b border-white/10 p-3">
        <button type="button" onClick={() => { setTab('emoji'); setAdding(''); }} className={'rounded-lg px-3 py-2 text-sm ' + (tab === 'emoji' ? 'bg-cyan-400/20 text-cyan-100' : 'text-white/65 hover:bg-white/10')}>😀 Emoji picker</button>
        <button type="button" onClick={() => { setTab('widgets'); setAdding(''); }} className={'rounded-lg px-3 py-2 text-sm ' + (tab === 'widgets' ? 'bg-cyan-400/20 text-cyan-100' : 'text-white/65 hover:bg-white/10')}>▦ Custom widgets ({widgets.length})</button>
      </div>
      {tab === 'emoji' && <div className="flex min-h-0 flex-1 flex-col p-4">
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search emoji or category…" aria-label="Search emojis" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{GROUPS.map(group => <button type="button" key={group.name} onClick={() => { setCategory(group.name); setSearch(''); }} className={'shrink-0 rounded-lg px-3 py-2 text-xs ' + (category === group.name && !search ? 'bg-white/15' : 'bg-white/5 text-white/65')}>{group.name}</button>)}</div>
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 overflow-y-auto sm:grid-cols-10 md:grid-cols-12">{visibleEmojis.map((item, index) => <button type="button" key={item.group + item.emoji + index} onClick={() => copyEmoji(item.emoji)} title={'Copy ' + item.emoji} aria-label={'Copy emoji ' + item.emoji} className="flex aspect-square items-center justify-center rounded-lg text-2xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300">{item.emoji}</button>)}</div>
        <p className="mt-3 text-xs text-white/45">Tap an emoji to copy it. Emoji appearance depends on your device.</p>
      </div>}
      {tab === 'widgets' && <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!adding && <><div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">{TYPES.map(type => <button type="button" key={type.id} onClick={() => beginAdd(type.id)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-300/40 hover:bg-cyan-400/10"><type.Icon size={19} className="mb-3 text-cyan-200"/><span className="block text-sm font-semibold">{type.label}</span><span className="mt-1 block text-xs text-white/50">{type.detail}</span><span className="mt-3 flex items-center gap-1 text-xs text-cyan-200"><Plus size={13}/> Add</span></button>)}</div>
        <h3 className="mb-3 text-sm font-semibold">Your widgets <span className="font-normal text-white/40">· saved in this browser</span></h3>
        {widgets.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">No widgets yet — add one above.</p> : <div className="grid gap-3 sm:grid-cols-2">{widgets.map(widget => <article key={widget.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-3 flex items-start gap-2"><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-semibold">{widget.title}</h4><p className="text-xs text-white/40">{TYPES.find(type => type.id === widget.type)?.label || 'Widget'}</p></div><button type="button" onClick={() => setWidgets(previous => previous.filter(item => item.id !== widget.id))} aria-label={'Delete ' + widget.title} className="rounded-lg p-2 text-white/50 hover:bg-red-400/15 hover:text-red-200"><Trash2 size={15}/></button></div>
        {widget.type === 'clock' && <div className="py-2 text-3xl tabular-nums">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<p className="mt-1 text-xs text-white/50">{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p></div>}
        {widget.type === 'note' && <textarea value={widget.body} onChange={event => updateWidget(widget.id, { body: event.target.value })} maxLength={4000} placeholder="Write your note…" className="min-h-24 w-full resize-y rounded-lg bg-black/20 p-3 text-sm outline-none focus:ring-1 focus:ring-cyan-300"/>}
        {widget.type === 'counter' && <div className="flex items-center justify-between rounded-lg bg-black/20 p-3"><button type="button" onClick={() => updateWidget(widget.id, { count: (Number(widget.count) || 0) - 1 })} className="h-9 w-9 rounded-lg bg-white/10">−</button><span className="text-2xl tabular-nums">{Number(widget.count) || 0}</span><button type="button" onClick={() => updateWidget(widget.id, { count: (Number(widget.count) || 0) + 1 })} className="h-9 w-9 rounded-lg bg-cyan-400/20">+</button></div>}
        {widget.type === 'link' && <><p className="mb-3 truncate text-xs text-white/50">{widget.body}</p><button type="button" onClick={() => { const url = safeUrl(widget.body); if (url) window.open(url, '_blank', 'noopener,noreferrer'); }} className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs text-cyan-100">Open link ↗</button></>}
        {widget.type === 'text' && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/80">{widget.body || 'Your text will appear here.'}</p>}
        </article>)}</div>}</>}
        {adding && <form onSubmit={saveWidget} className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-4"><button type="button" onClick={() => setAdding('')} className="mb-4 text-xs text-white/60">← Back</button><h3 className="mb-4 font-semibold">Add {TYPES.find(type => type.id === adding)?.label}</h3><label className="mb-3 block text-xs text-white/65">Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={48} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300/50"/></label>{adding !== 'clock' && <label className="mb-4 block text-xs text-white/65">{adding === 'note' ? 'Note' : adding === 'link' ? 'Website URL (http or https)' : adding === 'counter' ? 'Starting count' : 'Text'}<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={adding === 'link' ? 2048 : 4000} rows={adding === 'note' || adding === 'text' ? 4 : 2} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300/50" placeholder={adding === 'link' ? 'https://example.com' : ''}/></label>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setAdding('')} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5">Cancel</button><button type="submit" className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Add widget</button></div></form>}
      </div>}
      {toast && <div role="status" className="border-t border-white/10 bg-slate-800 px-4 py-2 text-center text-xs">{toast}</div>}
    </section>
  </div>;
}
