import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import { Plus, Bolt, Globe, Pencil, Trash2, CircleX } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import LinkDialog from './NewQuickLink';
import EditLinkDialog from './EditQuickLink';

const QuickLinks = ({ cls, nav = true, navigating, compact = false }) => {
  const { options, updateOption } = useOptions();
  const navigate = useNavigate();
  const [fallback, setFallback] = useState({});
  const [menuOpen, setMenuOpen] = useState(null);
  const [dialog, setDialog] = useState({ add: false, edit: false, index: null });
  const [shiftHeld, setShiftHeld] = useState(false);
  const menuRef = useRef(null);
  const draggedIndex = useRef(null);

  const defaultLinks = [
    { link: 'https://discord.com', icon: '/assets/img/dsci.ico', name: 'Discord' },
    { link: 'https://github.com', icon: '/assets/img/icogh.ico', name: 'GitHub' },
    { link: 'https://youtube.com', icon: 'https://www.youtube.com/favicon.ico', name: 'YouTube' },
    { link: 'https://gemini.google.com', icon: 'https://tse4.mm.bing.net/th/id/OIP.umfUzNjKLT1bMF25L3QPoAHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', name: 'Gemini AI' },
  ];

  // These two shortcuts should be available even when a user has older saved shortcuts.
  const requiredLinks = defaultLinks.filter((item) =>
    ['https://youtube.com', 'https://gemini.google.com'].includes(item.link)
  );

  const [quickLinks, setQuickLinks] = useState(() => {
    try {
      const savedLinks = JSON.parse(localStorage.getItem('options'))?.quickLinks;
      if (!Array.isArray(savedLinks)) return defaultLinks;

      const savedUrls = new Set(savedLinks.map((item) => item?.link));
      return [
        ...savedLinks,
        ...requiredLinks.filter((item) => !savedUrls.has(item.link)),
      ];
    } catch {
      return defaultLinks;
    }
  });

  const go = (url) => {
    try { window.dispatchEvent(new CustomEvent('dogeub-site-visited', { detail: { url } })); } catch {}
    if (nav) {
      navigate("/search", {
        state: {
          url: url,
        }
      });
    } else {
      const processedUrl = navigating.process(url);
      if (processedUrl) {
        navigating.go(navigating.id, processedUrl);
      }
    }
  };

  useEffect(() => {
    const close = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(null);
    const down = (e) => e.key === 'Shift' && setShiftHeld(true);
    const up = (e) => e.key === 'Shift' && setShiftHeld(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => updateOption({ quickLinks }), [quickLinks]);

  useEffect(() => {
    setFallback({});
  }, [quickLinks]);

  if (compact) {
    return (
      <div className={clsx('flex shrink-0 items-center justify-center gap-1 sm:gap-2', cls)}>
        {quickLinks.map((link, i) => (
          <button
            key={link.link + '-' + i}
            type="button"
            title={link.name}
            aria-label={`Open ${link.name}`}
            onClick={() => go(link.link)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:h-11 sm:w-11"
          >
            {fallback[i] ? <Globe className="h-5 w-5" /> : <img src={link.icon} alt="" className="h-5 w-5 object-contain" loading="lazy" onError={() => setFallback((p) => ({ ...p, [i]: true }))} />}
          </button>
        ))}
        <button
          type="button"
          title="Add a shortcut"
          aria-label="Add a shortcut"
          onClick={() => setDialog({ add: true, edit: false, index: null })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[.03] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:h-11 sm:w-11"
        ><Plus className="h-5 w-5" /></button>
        <LinkDialog state={dialog.add} set={(v) => setDialog({ ...dialog, add: v })} update={(form) => setQuickLinks([...quickLinks, form])} />
        <EditLinkDialog state={dialog.edit} set={(v) => setDialog({ ...dialog, edit: v })} initialData={dialog.index != null ? quickLinks[dialog.index] : null} update={(form) => { const updated = [...quickLinks]; updated[dialog.index] = form; setQuickLinks(updated); }} />
      </div>
    );
  }

  const linkItem = clsx(
    'flex flex-col items-center justify-center relative group w-20 h-[5.5rem] rounded-md border-transparent cursor-pointer duration-200 ease-in-out',
    options.type === 'dark' ? 'border hover:border-[#ffffff1c]' : 'border-2 hover:border-[#4f4f4f1c]',
    'hover:backdrop-blur'
  );
  const linkLogo = 'w-[2.5rem] h-[2.5rem] flex items-center justify-center rounded-full bg-[#6d6d6d73]';

  return (
    <div className={clsx('flex flex-wrap justify-center gap-4', cls || 'w-full max-w-[40rem] mx-auto mt-[16rem]')}>
      {quickLinks.map((link, i) => (
        <div
          key={i}
          className={linkItem}
          role="button"
          tabIndex={0}
          aria-label={`Open ${link.name}`}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go(link.link);
            }
          }}
          draggable
          onDragStart={(e) => {
            draggedIndex.current = i;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(i));
          }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => {
            e.preventDefault();
            const from = draggedIndex.current;
            const to = i;
            if (from == null || from === to) return;
            setQuickLinks((items) => {
              const next = [...items];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
              return next;
            });
            draggedIndex.current = null;
          }}
          onDragEnd={() => { draggedIndex.current = null; }}
          onClick={() => go(link.link)}
        >
          <div
            ref={menuOpen === i ? menuRef : null}
            onClick={(e) => {
              e.stopPropagation();
              shiftHeld ? setQuickLinks(quickLinks.filter((_, j) => j !== i)) : setMenuOpen(menuOpen === i ? null : i);
            }}
            className={clsx(
              'absolute -top-2 -right-2 duration-200 ease',
              menuOpen === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {shiftHeld ? <CircleX size="16" className="opacity-70 text-red-500" /> : <Bolt size="16" className="opacity-50" />}
            {menuOpen === i && (
              <div
                className="absolute top-5 right-0 rounded-md shadow-lg border border-white/10 py-1 w-[101px] z-50"
                style={{ backgroundColor: options.quickModalBgColor || '#252f3e' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setDialog({ add: false, edit: true, index: i }) || setMenuOpen(null)}
                  className="w-full px-3 py-1.5 text-[0.74rem] flex items-center gap-2 hover:bg-white/10 duration-150 text-left"
                >
                  <Pencil size="14" /> Edit
                </button>
                <button
                  onClick={() => setQuickLinks(quickLinks.filter((_, j) => j !== i)) || setMenuOpen(null)}
                  className="w-full px-3 py-1.5 text-[0.74rem] flex items-center gap-2 hover:bg-white/10 duration-150 text-left text-red-400"
                >
                  <Trash2 size="14" /> Remove
                </button>
              </div>
            )}
          </div>

          <div className={linkLogo}>
            {fallback[i] ? (
              <Globe className="w-7 h-7" />
            ) : (
              <img
                key={link.icon}
                src={link.icon}
                alt={link.name}
                className="w-7 h-7 object-contain"
                loading="lazy"
                onError={() => setFallback((p) => ({ ...p, [i]: true }))}
              />
            )}
          </div>
          <div className="mt-3 text-sm font-medium text-center w-full px-1 overflow-hidden whitespace-nowrap text-ellipsis">
            {link.name}
          </div>
        </div>
      ))}

      <div
        className={linkItem}
        role="button"
        tabIndex={0}
        aria-label="Add a shortcut"
        onClick={() => setDialog({ add: true, edit: false, index: null })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDialog({ add: true, edit: false, index: null });
          }
        }}
      >
        <div className={linkLogo}>
          <Plus className="w-7 h-7" />
        </div>
        <div className="mt-3 text-sm font-medium text-center">New</div>
      </div>

      <LinkDialog state={dialog.add} set={(v) => setDialog({ ...dialog, add: v })} update={(form) => setQuickLinks([...quickLinks, form])} />
      <EditLinkDialog
        state={dialog.edit}
        set={(v) => setDialog({ ...dialog, edit: v })}
        initialData={dialog.index != null ? quickLinks[dialog.index] : null}
        update={(form) => {
          const updated = [...quickLinks];
          updated[dialog.index] = form;
          setQuickLinks(updated);
        }}
      />
    </div>
  );
};

QuickLinks.displayName = 'QuickLinks';
export default QuickLinks;
