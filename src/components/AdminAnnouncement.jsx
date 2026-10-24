import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';

export default function AdminAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch('/api/public/announcement', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!alive) return;
        if (data.enabled && data.message) {
          const next = { message: String(data.message).slice(0, 300), version: String(data.updatedAt || data.message) };
          setAnnouncement(next);
          setDismissed((current) => current === next.version ? current : '');
        } else setAnnouncement(null);
      } catch {
        // The site remains usable when the optional Messages API is unavailable.
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  if (!announcement || dismissed === announcement.version) return null;
  return <aside role="status" aria-label="DOGEUB site announcement" className="fixed left-1/2 top-[4.75rem] z-[100000] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-cyan-200/20 bg-slate-950/95 p-4 text-white shadow-[0_20px_80px_rgba(0,0,0,.4)] backdrop-blur-2xl">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.07] text-cyan-100"><BellRing size={16} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">DOGEUB announcement</p><p className="mt-1 break-words text-sm leading-6 text-white/85">{announcement.message}</p></div><button onClick={() => setDismissed(announcement.version)} aria-label="Dismiss announcement" className="rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white"><X size={15} /></button></div>
  </aside>;
}
