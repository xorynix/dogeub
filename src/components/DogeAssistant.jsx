import { useEffect, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Send, X, Sparkles, Settings2, Palette, Moon, Sun, PawPrint, AppWindow, Home, Search, RotateCcw, ChevronRight, Command, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '../utils/optionsContext';
import { themeConfig, searchConfig } from '../utils/config';

const themeAliases = {
  midnight: 'Midnight', default: 'Midnight', mocha: 'Mocha', brown: 'Mocha',
  forest: 'Forest', green: 'Forest', dark: 'Dark', black: 'Dark',
  stellar: 'Stellar', space: 'Stellar', pink: 'Hot Pink', 'hot pink': 'Hot Pink',
  light: 'Light', bright: 'Light', paper: 'Paper', beige: 'Paper',
};
const themesHelp = 'Midnight, Mocha, Forest, Dark, Stellar, Hot Pink, Light, or Paper';
const quickActions = [
  { label: 'Make it dark', command: 'make it dark', icon: Moon },
  { label: 'Forest theme', command: 'switch to Forest theme', icon: Palette },
  { label: 'Open Settings', command: 'open settings', icon: SlidersHorizontal },
  { label: 'Show my settings', command: 'show my settings', icon: Settings2 },
];

export default function DogeAssistant() {
  const { options, updateOption } = useOptions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Yo! I’m Doge, your DogeUB control center. Tell me what you want to do in plain English: change the look, tweak settings, open a page, search the web, or launch a DogeUB tool. I’ll tell you when something needs to be done manually.' }]);
  const [status, setStatus] = useState('Ready');
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener('dogeub-open-assistant', openAssistant);
    return () => {
      window.removeEventListener('dogeub-open-assistant', openAssistant);
      recognitionRef.current?.stop?.();
    };
  }, []);

  const say = (text) => {
    setMessages((old) => [...old, { role: 'assistant', text }]);
    setStatus('Done');
  };

  const handleCommand = async (raw) => {
    const text = raw.trim();
    const lower = text.toLowerCase().replace(/[’']/g, '');
    if (!text) return;
    setMessages((old) => [...old, { role: 'user', text }]);
    setInput('');
    setStatus('Thinking…');

    // Prefer the real AI endpoint. If it is not configured or temporarily unavailable,
    // retain the built-in local command parser below as a working fallback.
    try {
      const history = [...messages, { role: 'user', text }].slice(-12).map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.text || '').slice(0, 2000),
      }));
      const response = await fetch('/api/doge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (response.ok) {
        const result = await response.json();
        const allowed = new Set(['set_theme', 'set_background', 'toggle_pet_buddy', 'toggle_tabs_bar', 'set_compact_header', 'set_apps_per_page', 'set_search_engine', 'navigate', 'open_website', 'search_web', 'show_settings', 'reset_appearance', 'go_back', 'reload_page']);
        let executed = 0;
        for (const action of (Array.isArray(result.actions) ? result.actions : []).slice(0, 8)) {
          if (!allowed.has(action?.type)) continue;
          switch (action.type) {
            case 'set_theme': {
              const wanted = themeAliases[String(action.value || '').toLowerCase()] || action.value;
              const selected = themeConfig.find((item) => item.option.toLowerCase() === String(wanted || '').toLowerCase());
              if (selected) { updateOption(selected.value); executed++; }
              break;
            }
            case 'set_background': {
              const colors = { 'midnight blue': '#111827', 'pure black': '#050505', navy: '#0b1730', purple: '#24123d', green: '#10251b', rose: '#301321' };
              const color = colors[String(action.value || '').toLowerCase()];
              if (color) { updateOption({ bgColor: color, bgDesign: 'None' }); executed++; }
              break;
            }
            case 'toggle_pet_buddy': updateOption({ petBuddyEnabled: action.enabled === true }); executed++; break;
            case 'toggle_tabs_bar': updateOption({ showTb: action.enabled === true }); executed++; break;
            case 'set_compact_header': updateOption({ shrinkHeader: action.enabled === true }); executed++; break;
            case 'set_apps_per_page': {
              const n = Number(action.number);
              if ([10, 20, 30, 40, 50, 999].includes(n)) { updateOption({ itemsPerPage: n }); executed++; }
              break;
            }
            case 'set_search_engine': {
              const selected = searchConfig.find((item) => item.option.toLowerCase() === String(action.value || '').toLowerCase());
              if (selected) { updateOption(selected.value); executed++; }
              break;
            }
            case 'navigate': {
              const destinations = { home: '/', browser: '/search', settings: '/settings', apps: '/materials', docs: '/docs', recommended: '/recommended' };
              const destination = String(action.value || '').toLowerCase();
              if (destinations[destination]) { setOpen(false); navigate(destinations[destination]); executed++; }
              else if (destination === 'doge hub' || destination === 'os studio') {
                window.dispatchEvent(new CustomEvent(destination === 'doge hub' ? 'dogeub-open-hub' : 'dogeub-open-os-studio', { detail: { tab: destination === 'doge hub' ? 'control' : 'desktop' } }));
                executed++;
              }
              break;
            }
            case 'open_website': {
              let target = String(action.value || '').trim();
              if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
              try {
                const parsed = new URL(target);
                if (['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.')) {
                  setOpen(false); navigate('/search', { state: { url: parsed.href } }); executed++;
                }
              } catch {}
              break;
            }
            case 'search_web': {
              const query = String(action.value || '').trim();
              if (query) { setOpen(false); navigate('/search', { state: { url: query } }); executed++; }
              break;
            }
            case 'show_settings': {
              const currentTheme = themeConfig.find((item) => item.value.theme === options.theme)?.option || options.theme || 'Midnight';
              const engine = searchConfig.find((item) => item.value.engine === options.engine)?.option || options.engineName || 'Default';
              const detail = 'Current settings — Theme: ' + currentTheme + '; Search engine: ' + engine + '; Pet Buddy: ' + (options.petBuddyEnabled === false ? 'Off' : 'On') + '; Tabs bar: ' + (options.showTb === false ? 'Hidden' : 'Visible') + '; Compact header: ' + (options.shrinkHeader ? 'On' : 'Off') + '; Apps per page: ' + (options.itemsPerPage === 999 ? 'All' : options.itemsPerPage || 'Default') + '.';
              setMessages((old) => [...old, { role: 'assistant', text: detail }]); executed++;
              break;
            }
            case 'reset_appearance': {
              if (window.confirm('Reset DogeUB appearance and layout preferences to defaults? This will not delete notes or files.')) {
                updateOption({ theme: 'default', type: 'dark', bgColor: '#111827', siteTextColor: '#a0b0c8', bgDesign: 'None', petBuddyEnabled: true, showTb: true, shrinkHeader: false, itemsPerPage: 20 }); executed++;
              }
              break;
            }
            case 'go_back': window.history.back(); executed++; break;
            case 'reload_page': window.location.reload(); executed++; break;
          }
        }
        if (result.reply) setMessages((old) => [...old, { role: 'assistant', text: String(result.reply).slice(0, 1500) }]);
        setStatus(executed ? 'Done · ' + executed + ' action' + (executed === 1 ? '' : 's') : 'Ready');
        return;
      }
    } catch {
      // Offline, not configured, or AI provider unavailable: use local commands below.
    }
    setStatus('Working…');

    if (/^(help|commands|what can you do|show commands|capabilities)$/.test(lower)) {
      say('Here’s what I can do right now:\n\n• Appearance: switch themes, change background color, toggle compact header\n• Layout: show/hide the tabs bar and Pet Buddy; choose how many apps appear per page\n• Search: change the search engine or search for something\n• Navigation: Home, Browser, Apps, Docs, Recommended, Settings\n• Tools: open Doge Hub or OS Studio\n• Utilities: show current settings, reset DogeUB appearance preferences, go back, or reload\n\nI can only control features exposed by this DogeUB browser app. I can’t control your actual Windows PC or operate every website.');
      return;
    }

    if (/\b(show|list|what are|check|view)\b/.test(lower) && /settings|preferences|configuration/.test(lower)) {
      const currentTheme = themeConfig.find((item) => item.value.theme === options.theme)?.option || options.theme || 'Midnight';
      const engine = searchConfig.find((item) => item.value.engine === options.engine)?.option || options.engineName || 'Default';
      say('Your current DogeUB settings:\n• Theme: ' + currentTheme + '\n• Search engine: ' + engine + '\n• Pet Buddy: ' + (options.petBuddyEnabled === false ? 'Off' : 'On/default') + '\n• Tabs bar: ' + (options.showTb === false ? 'Hidden' : 'Visible/default') + '\n• Compact header: ' + (options.shrinkHeader ? 'On' : 'Off') + '\n• Apps per page: ' + (options.itemsPerPage === 999 ? 'All' : options.itemsPerPage || 'Default') + '\n\nSay something like “turn Pet Buddy off” or “show 30 apps per page” to change them.');
      return;
    }

    if (/\b(reset|restore|default)\b/.test(lower) && /settings|preferences|appearance|theme/.test(lower)) {
      if (!window.confirm('Reset DogeUB appearance and layout preferences to defaults? This will not delete your notes or files.')) {
        say('No changes made.');
        return;
      }
      updateOption({ theme: 'default', type: 'dark', bgColor: '#111827', siteTextColor: '#a0b0c8', bgDesign: 'None', petBuddyEnabled: true, showTb: true, shrinkHeader: false, itemsPerPage: 20 });
      say('Appearance and layout preferences reset to the DogeUB defaults. Other saved data was left alone.');
      return;
    }

    const themeMatch = lower.match(/(?:theme|look|style|switch to|change to|make it|set it to)\s+(midnight|default|mocha|brown|forest|green|dark|black|stellar|space|pink|hot pink|light|bright|paper|beige)(?:\s+theme)?/) || lower.match(/^(midnight|default|mocha|brown|forest|green|dark|black|stellar|space|pink|hot pink|light|bright|paper|beige)(?:\s+theme)?$/);
    if (themeMatch) {
      const wanted = themeAliases[themeMatch[1]];
      const selected = themeConfig.find((item) => item.option.toLowerCase() === wanted.toLowerCase());
      if (selected) {
        updateOption(selected.value);
        say('Done — switched to the ' + selected.option + ' theme.');
      } else say('I couldn’t find that theme. Try: ' + themesHelp + '.');
      return;
    }

    if (/\b(background|page background)\b/.test(lower)) {
      const colors = [
        { name: 'midnight blue', color: '#111827' }, { name: 'pure black', color: '#050505' },
        { name: 'navy', color: '#0b1730' }, { name: 'purple', color: '#24123d' },
        { name: 'green', color: '#10251b' }, { name: 'rose', color: '#301321' },
      ];
      const chosen = colors.find((item) => lower.includes(item.name));
      if (chosen) {
        updateOption({ bgColor: chosen.color, bgDesign: 'None' });
        say('Background changed to ' + chosen.name + '.');
      } else say('Try “background navy”, “background purple”, “background green”, “background rose”, “background pure black”, or “background midnight blue”.');
      return;
    }

    if (/\b(search engine|search provider)\b/.test(lower) && /change|switch|use|set/.test(lower)) {
      const chosen = searchConfig.find((item) => lower.includes(item.option.toLowerCase()));
      if (chosen) {
        updateOption(chosen.value);
        say('Search engine changed to ' + chosen.option + '.');
      } else say('Available search engines include ' + searchConfig.slice(0, 8).map((item) => item.option).join(', ') + '. Try “use DuckDuckGo search engine”.');
      return;
    }

    if (/pet buddy/.test(lower) && /off|hide|disable|turn off|remove/.test(lower)) {
      updateOption({ petBuddyEnabled: false }); say('Pet Buddy is turned off.'); return;
    }
    if (/pet buddy/.test(lower) && /on|show|enable|turn on/.test(lower)) {
      updateOption({ petBuddyEnabled: true }); say('Pet Buddy is turned on.'); return;
    }
    if (/\b(tabs bar|tab bar)\b/.test(lower) && /off|hide|disable|turn off/.test(lower)) {
      updateOption({ showTb: false }); say('The tabs bar is now hidden.'); return;
    }
    if (/\b(tabs bar|tab bar)\b/.test(lower) && /on|show|enable|turn on/.test(lower)) {
      updateOption({ showTb: true }); say('The tabs bar is enabled.'); return;
    }
    if (/\b(compact header|shrink header)\b/.test(lower)) {
      const enabled = !/off|disable|turn off|normal/.test(lower);
      updateOption({ shrinkHeader: enabled }); say('Compact header ' + (enabled ? 'enabled.' : 'disabled.')); return;
    }
    if (/\b(apps per page|items per page|show .* apps)\b/.test(lower)) {
      const amount = lower.match(/\b(10|20|30|40|50|all)\b/);
      if (!amount) { say('Try “show 30 apps per page” or “show all apps”.'); return; }
      const value = amount[1] === 'all' ? 999 : Number(amount[1]);
      updateOption({ itemsPerPage: value }); say('Apps per page set to ' + (value === 999 ? 'all' : value) + '.'); return;
    }

    // Open a real website inside DogeUB's browser route (rather than leaving the app).
    const websiteAliases = {
      youtube: 'https://www.youtube.com', 'youtube music': 'https://music.youtube.com',
      google: 'https://www.google.com', bing: 'https://www.bing.com',
      roblox: 'https://www.roblox.com', github: 'https://github.com',
      discord: 'https://discord.com/app', reddit: 'https://www.reddit.com',
      tiktok: 'https://www.tiktok.com', twitch: 'https://www.twitch.tv',
      spotify: 'https://open.spotify.com', netflix: 'https://www.netflix.com',
      wikipedia: 'https://www.wikipedia.org', classroom: 'https://classroom.google.com',
      gmail: 'https://mail.google.com', 'google drive': 'https://drive.google.com',
      'google docs': 'https://docs.google.com', 'google slides': 'https://slides.google.com',
      'google maps': 'https://maps.google.com', 'microsoft teams': 'https://teams.microsoft.com',
      outlook: 'https://outlook.live.com', amazon: 'https://www.amazon.com',
      chatgpt: 'https://chatgpt.com', gemini: 'https://gemini.google.com',
    };
    const openPrefix = lower.match(/^(?:please\s+)?(?:open|go to|visit|browse to|navigate to|take me to|launch)\s+(.+?)\s*$/);
    if (openPrefix && !/^(home|homepage|browser|search|settings|apps|materials|docs|documents|recommended|recommendations|doge hub|hub|os studio|studio)$/i.test(openPrefix[1].trim())) {
      const requested = openPrefix[1].trim().replace(/[.!?]+$/, '');
      const aliasKey = requested.toLowerCase().replace(/^www\./, '');
      let target = websiteAliases[aliasKey] || '';
      if (!target) {
        const candidate = /^(?:https?:\/\/|[a-z0-9-]+\.)/i.test(requested) ? requested : '';
        if (candidate) {
          target = /^https?:\/\//i.test(candidate) ? candidate : 'https://' + candidate;
          try {
            const parsed = new URL(target);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) target = '';
          } catch { target = ''; }
        }
      }
      if (target) {
        setOpen(false);
        navigate('/search', { state: { url: target } });
        return;
      }
      if (!/\s/.test(requested) && /^[a-z0-9-]+(?:\.[a-z]{2,})(?::\d+)?(?:\/[^\s]*)?$/i.test(requested)) {
        setOpen(false);
        navigate('/search', { state: { url: 'https://' + requested } });
        return;
      }
    }

    const goMatch = lower.match(/\b(?:open|go to|navigate to|take me to|launch|show)\s+(home|homepage|browser|search|settings|apps|materials|docs|documents|recommended|recommendations)\b/);
    if (goMatch) {
      const destinations = { home: '/', homepage: '/', browser: '/search', search: '/search', settings: '/settings', apps: '/materials', materials: '/materials', docs: '/docs', documents: '/docs', recommended: '/recommended', recommendations: '/recommended' };
      setOpen(false); navigate(destinations[goMatch[1]]); return;
    }
    if (/\b(back|go back|previous page)\b/.test(lower)) { window.history.back(); say('Going back one page.'); return; }
    if (/\b(reload|refresh)\b/.test(lower) && /page|site|dogeub|browser|this/.test(lower)) {
      say('Refreshing DogeUB…'); window.setTimeout(() => window.location.reload(), 150); return;
    }
    if (/\b(open|launch|show)\b/.test(lower) && /os studio|studio/.test(lower)) {
      window.dispatchEvent(new CustomEvent('dogeub-open-os-studio', { detail: { tab: 'desktop' } }));
      say('Sent the open request to OS Studio. If it did not appear, that tool may not be available on this page.'); return;
    }
    if (/\b(open|launch|show)\b/.test(lower) && /doge hub|hub|control center/.test(lower)) {
      window.dispatchEvent(new CustomEvent('dogeub-open-hub', { detail: { tab: 'control' } }));
      say('Doge Hub opened.'); return;
    }
    if (/\b(search|look up|find)\b/.test(lower) && !/settings|engine|provider/.test(lower)) {
      const query = text.replace(/^.*?\b(search|look up|find)\b\s*/i, '').trim();
      if (query) { setOpen(false); navigate('/search', { state: { url: query } }); return; }
    }
    if (/\b(clear chat|clear conversation|new chat)\b/.test(lower)) {
      setMessages([{ role: 'assistant', text: 'Fresh start! What do you want to do in DogeUB?' }]); setStatus('Ready'); return;
    }
    if (/\b(help|what can you do|commands)\b/.test(lower)) {
      say('Try: “show my settings”, “switch to Stellar theme”, “background purple”, “use DuckDuckGo search engine”, “turn Pet Buddy off”, “hide the tabs bar”, “show 30 apps per page”, “open Apps”, “open Settings”, “search Roblox”, or “open Doge Hub”.');
      return;
    }
    say('I don’t have a command for that yet. Try “help” to see what I can control. I won’t pretend an action worked if DogeUB doesn’t expose it.');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setStatus('Voice input is not supported in this browser. Try typing.'); return; }
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => { setListening(true); setStatus('Listening…'); };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setListening(false);
      if (transcript) handleCommand(transcript);
      else setStatus('Didn’t catch that—try again.');
    };
    recognition.onerror = () => { setListening(false); setStatus('Voice input stopped. Check microphone permission or type.'); };
    recognition.onend = () => setListening(false);
    try { recognition.start(); } catch { setListening(false); setStatus('Could not start voice input.'); }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[12000] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section className="flex h-[min(76vh,650px)] w-[min(94vw,410px)] flex-col overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#0b1020]/[.97] text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl">
          <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-400/10 to-violet-400/10 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-300/10 text-cyan-200"><Bot size={24}/></div>
            <div className="min-w-0 flex-1"><div className="font-semibold tracking-wide">Doge Assistant <span className="ml-1 rounded-full bg-emerald-300/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200">Control mode</span></div><div className="text-xs text-white/50">DogeUB tools · {status}</div></div>
            <button onClick={() => setOpen(false)} aria-label="Close Doge Assistant" className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18}/></button>
          </header>
          <div className="border-b border-white/10 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-white/40"><Command size={12}/> Quick actions</div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((item) => <button key={item.label} onClick={() => handleCommand(item.command)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.05] px-3 py-2 text-xs text-white/80 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"><item.icon size={13}/>{item.label}</button>)}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => <div key={index} className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={'max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-sm leading-relaxed ' + (message.role === 'user' ? 'rounded-br-md bg-cyan-300/15 text-cyan-50' : 'rounded-bl-md border border-white/10 bg-white/[.055] text-white/85')}>{message.text}</div></div>)}
            <div ref={bottomRef}/>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); handleCommand(input); }} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3">
            <button type="button" onClick={startVoice} title={listening ? 'Stop listening' : 'Use voice'} aria-label={listening ? 'Stop listening' : 'Use voice'} className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ' + (listening ? 'border-rose-300/40 bg-rose-400/15 text-rose-200' : 'border-white/10 bg-white/[.05] text-white/70 hover:text-cyan-200')}>{listening ? <MicOff size={17}/> : <Mic size={17}/>}</button>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Doge what to do…" aria-label="Message Doge Assistant" className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.06] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50" />
            <button type="submit" aria-label="Send command" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200"><Send size={16}/></button>
          </form>
          <div className="flex items-center justify-center gap-1.5 pb-2 text-[10px] text-white/35"><Settings2 size={11}/> Controls only affect DogeUB in this browser</div>
        </section>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Doge Assistant' : 'Open Doge Assistant'} title="Doge Assistant" className="group relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/40 bg-[#0c1425] text-cyan-200 shadow-xl shadow-cyan-950/40 transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:text-white">
        <span className="absolute inset-0 rounded-2xl bg-cyan-300/10 opacity-0 transition group-hover:opacity-100"/>
        {open ? <X size={23}/> : <><Sparkles size={23}/><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0c1425] bg-emerald-400"/></>}
      </button>
    </div>
  );
}
