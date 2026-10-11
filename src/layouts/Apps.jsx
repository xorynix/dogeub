import Nav from '../layouts/Nav';
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { Search, ChevronDown, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import Pagination from '../components/Pagination';
import styles from '../styles/apps.module.css';
import theme from '../styles/theming.module.css';
import clsx from 'clsx';
import { adjustApps } from '../data/appsFilter';

const SORT_OPTIONS = [
  { value: 'categorical', label: 'Categorical' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'newest', label: 'Newest' },
];

const AppCard = memo(({ app, onClick, fallbackMap, onImgError, itemTheme, itemStyles }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div
      key={app.appName}
      className={clsx(
        itemStyles.app,
        itemTheme.appItemColor,
        itemTheme[`theme-${itemTheme.current || 'default'}`],
        app.disabled ? 'disabled cursor-not-allowed' : 'cursor-pointer',
      )}
      onClick={!app.disabled ? () => onClick(app) : undefined}
    >
      <div className="w-20 h-20 rounded-[12px] mb-4 overflow-hidden relative">
        {!loaded && !fallbackMap[app.appName] && (
          <div className="absolute inset-0 bg-gray-700 animate-pulse" />
        )}
        {fallbackMap[app.appName] ? (
          <LayoutGrid className="w-full h-full" />
        ) : (
          <img
            src={app.icon}
            draggable="false"
            loading="lazy"
            className="w-full h-full object-cover"
            onLoad={() => setLoaded(true)}
            onError={() => onImgError(app.appName)}
          />
        )}
      </div>
      <p className="text-m font-semibold">{app.appName.split('').join('\u200B')}</p>
      <p className="text-sm mt-2">{(app.desc || '').split('').join('\u200B')}</p>
    </div>
  );
});

const Apps = memo(() => {
  const nav = useNavigate();
  const { options } = useOptions();

  const [appsList, setAppsList] = useState([]);
  useEffect(() => {
    let a = true;
    import('../data/apps.json').then((m) => a && setAppsList(adjustApps(m.default?.apps)));
    return () => {
      a = false;
    };
  }, []);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('categorical');
  const [page, setPage] = useState(1);
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);
  const [fallback, setFallback] = useState({});

  const perPage = options.itemsPerPage || 20;

  useEffect(() => {
    const close = (e) => !sortRef.current?.contains(e.target) && setShowSort(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  const indexedApps = useMemo(() => appsList.map((a, i) => ({ ...a, __i: i })), [appsList]);

  const sortedApps = useMemo(() => {
    switch (sort) {
      case 'alphabetical':
        return [...indexedApps].sort((a, b) =>
          a.appName.localeCompare(b.appName, undefined, { sensitivity: 'base' }),
        );
      case 'categorical':
        return [...indexedApps].sort(
          (a, b) =>
            (a.desc || '').localeCompare(b.desc || '', undefined, { sensitivity: 'base' }) ||
            a.appName.localeCompare(b.appName, undefined, { sensitivity: 'base' }),
        );
      case 'newest':
        return [...indexedApps].sort((a, b) => b.__i - a.__i);
      default:
        return indexedApps;
    }
  }, [indexedApps, sort]);

  const filtered = useMemo(() => {
    const fq = q.toLowerCase().replace(/\s/g, '');
    const filteredApps = sortedApps.filter((a) => a.appName.toLowerCase().replace(/\s/g, '').includes(fq));
    const totalPages = Math.ceil(filteredApps.length / perPage);
    const paged = filteredApps.slice((page - 1) * perPage, page * perPage);
    return { filteredApps, paged, totalPages };
  }, [sortedApps, q, page, perPage]);

  useEffect(() => {
    if (page > filtered.totalPages && filtered.totalPages > 0) setPage(1);
  }, [page, filtered.totalPages]);

  const navApp = useCallback(
    (app) => {
      if (!app) return;
      const appName = String(app.appName || '');
      const appUrl = String(app.url || '');
      const looksLikeGame = /game|roblox|minecraft|fnf|slope|retro|geometry|cookie|drift|racing|among us|subway|mario|sonic|pokemon|2048|idle|run 3/i.test(appName);
      if (looksLikeGame) {
        try {
          window.dispatchEvent(new CustomEvent('dogeub-game-launched', {
            detail: { id: appName.toLowerCase(), name: appName, url: appUrl, icon: app.icon || '' },
          }));
        } catch {}
      }
      nav("/search", {
        state: {
          url: app.url,
        }
      });
    },
    [nav],
  );

  const handleSearch = useCallback((e) => {
    setQ(e.target.value);
    setPage(1);
  }, []);

  const handleImgError = useCallback(
    (name) => setFallback((prev) => ({ ...prev, [name]: true })),
    [],
  );

  const searchBarCls = useMemo(
    () => clsx(theme.appsSearchColor, theme[`theme-${options.theme || 'default'}`]),
    [options.theme],
  );

  const placeholder = useMemo(() => `Search ${appsList.length} apps`, [appsList.length]);

  return (
    <div className={`${styles.appContainer} w-full mx-auto`}>
      <div className="w-full px-4 py-4 flex justify-center mt-3">
        <div
          className={clsx(
            'relative flex items-center gap-2.5 rounded-[10px] px-3 w-[600px] h-11',
            searchBarCls,
          )}
        >
          <Search className="w-4 h-4 shrink-0" />
          <input
            type="text"
            placeholder={placeholder}
            value={q}
            onChange={handleSearch}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center pb-2">
        {filtered.paged.map((app) => (
          <AppCard
            key={app.appName}
            app={app}
            onClick={navApp}
            fallbackMap={fallback}
            onImgError={handleImgError}
            itemTheme={{ ...theme, current: options.theme || 'default' }}
            itemStyles={styles}
          />
        ))}
      </div>

      {filtered.filteredApps.length > perPage && (
        <div className="flex flex-col items-center pb-7">
          <Pagination
            count={filtered.totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            options={options}
          />
        </div>
      )}
    </div>
  );
});

Apps.displayName = 'Apps';

const AppLayout = () => {
  const { options } = useOptions();
  const scrollCls = clsx(
    'scrollbar scrollbar-thin scrollbar-track-transparent',
    !options?.type || options.type === 'dark'
      ? 'scrollbar-thumb-gray-600'
      : 'scrollbar-thumb-gray-500',
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Nav />
      <div className={clsx('flex-1 overflow-y-auto', scrollCls)}>
        <Apps />
      </div>
    </div>
  );
};

export default AppLayout;
