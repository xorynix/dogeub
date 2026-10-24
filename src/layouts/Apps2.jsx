import Nav from '../layouts/Nav';
import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { Search, LayoutGrid, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import Pagination from '../components/Pagination';
import styles from '../styles/apps.module.css';
import theme from '../styles/theming.module.css';
import clsx from 'clsx';

const AppCard = memo(({ app, onClick, fallbackMap, onImgError, itemTheme, itemStyles }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div
      key={app.appName}
      className={clsx(
        'flex-shrink-0',
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
      <p className="text-m font-semibold mb-3 flex-grow line-clamp-2">{app.appName.split('').join('\u200B')}</p>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffffff15] hover:bg-[#ffffff25] transition-colors text-sm font-medium mt-auto self-start">
        <Play size={16} fill="currentColor" />
        Play
      </button>
    </div>
  );
});

const CategoryRow = memo(({ category, games, onClick, onViewMore, fallback, onImgError, theme, styles }) => {
  const ref = useRef(null);

  const scroll = (dir) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: dir === 'left' ? -400 : 400,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-3 max-w-7xl mx-auto px-9">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{category}</h2>
          <button
            onClick={() => onViewMore(category)}
            className="text-xs px-3 py-1 rounded-full bg-[#ffffff10] hover:bg-[#ffffff18] transition-colors"
          >
            View more
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-[#ffffff10] hover:bg-[#ffffff18] transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-[#ffffff10] hover:bg-[#ffffff18] transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-1 overflow-x-auto pb-2 -ml-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game) => (
          <AppCard
            key={game.appName}
            app={game}
            onClick={onClick}
            fallbackMap={fallback}
            onImgError={onImgError}
            itemTheme={theme}
            itemStyles={styles}
          />
        ))}
      </div>
    </div>
  );
});

const Games = memo(() => {
  const nav = useNavigate();
  const { options } = useOptions();

  const [data, setData] = useState({});
  useEffect(() => {
    let a = true;
    import('../data/apps.json').then((m) => a && setData(m.default?.games || {}));
    return () => {
      a = false;
    };
  }, []);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(null);
  const [fallback, setFallback] = useState({});
  const [dlCount, setDlCount] = useState(0);
  const [showDl, setShowDl] = useState(false);
  const [dlGames, setDlGames] = useState([]);

  useEffect(() => {
    import('../utils/localGmLoader').then(async (m) => {
      const loader = new m.default();
      await loader.cleanupOld();
      const gms = await loader.getAllGms();
      setDlCount(gms.length);
      setDlGames(gms);
    }).catch(() => {});
  }, []);

  const perPage = options.itemsPerPage || 20;

  const all = useMemo(() => {
    const games = [];
    Object.values(data).forEach((cats) => {
      games.push(...cats);
    });
    return games;
  }, [data]);

  const filtered = useMemo(() => {
    let toFilter = all;
    
    if (showDl) {
      const dlNames = new Set(dlGames.map(g => g.name));
      toFilter = all.filter(game => {
        const firstUrl = Array.isArray(game.url) ? game.url[0] : game.url;
        const gmName = firstUrl?.split('/').pop()?.replace('.zip', '');
        return gmName && dlNames.has(gmName);
      });
    } else if (category) {
      toFilter = data[category] || [];
    }
    
    if (q) {
      const fq = q.toLowerCase().trim().replace(/\s/g, '');
      toFilter = toFilter.filter((game) => {
        const gameName = game.appName.toLowerCase().replace(/\s/g, '');
        return gameName.includes(fq);
      });
    }
    
    const total = Math.ceil(toFilter.length / perPage);
    const paged = toFilter.slice((page - 1) * perPage, page * perPage);
    return { filteredGames: toFilter, paged, totalPages: total };
  }, [all, data, category, showDl, dlGames, q, page, perPage]);

  useEffect(() => {
    if (page > filtered.totalPages && filtered.totalPages > 0) setPage(1);
  }, [page, filtered.totalPages]);

  const navApp = useCallback(
    (app) => {
      if (!app) return;
      try {
        const firstUrl = Array.isArray(app.url) ? app.url[0] : app.url;
        window.dispatchEvent(new CustomEvent('dogeub-game-launched', { detail: {
          id: String(app.appName || firstUrl || 'unknown-game'),
          name: String(app.appName || 'Unknown game'),
          url: firstUrl || '',
          icon: app.icon || '',
        } }));
      } catch {}
      nav('/docs/r/', { state: { app } });
    },
    [nav],
  );

  const handleSearch = useCallback((e) => {
    setQ(e.target.value);
    setCategory(null);
    setPage(1);
  }, []);

  const handleViewMore = useCallback((cat) => {
    setCategory(cat);
    setQ('');
    setPage(1);
  }, []);

  const handleBack = useCallback(() => {
    setCategory(null);
    setShowDl(false);
    setQ('');
    setPage(1);
  }, []);

  const handleViewDl = useCallback(() => {
    setShowDl(true);
    setCategory(null);
    setQ('');
    setPage(1);
  }, []);

  const handleImgError = useCallback(
    (name) => setFallback((prev) => ({ ...prev, [name]: true })),
    [],
  );

  const searchCls = useMemo(
    () => clsx(theme.appsSearchColor, theme[`theme-${options.theme || 'default'}`]),
    [options.theme],
  );

  const placeholder = useMemo(() => `Search ${all.length} games`, [all.length]);

  return (
    <div className={`${styles.appContainer} w-full mx-auto`}>
      <div className="w-full px-4 py-4 flex justify-center mt-3 relative">
        {(category || showDl) && (
          <button
            onClick={handleBack}
            className="absolute cursor-pointer left-10 text-sm hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            ← Back to all
          </button>
        )}
        <div
          className={clsx(
            'relative flex items-center gap-2.5 rounded-[10px] px-3 w-[600px] h-11',
            searchCls,
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

      {showDl && (
        <div className="text-center text-xs opacity-60 pb-2">
          Local games not played for 3+ days are automatically removed
        </div>
      )}

      {!category && !showDl && dlCount > 0 && (
        <div className="w-full flex justify-center pb-1">
          <button
            onClick={handleViewDl}
            className="cursor-pointer text-xs hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            View Downloaded Games ({dlCount})
          </button>
        </div>
      )}

      {q || category || showDl ? (
        <>
          <div className="flex flex-wrap justify-center pb-2">
            {filtered.paged.map((game) => (
              <AppCard
                key={game.appName}
                app={game}
                onClick={navApp}
                fallbackMap={fallback}
                onImgError={handleImgError}
                itemTheme={{ ...theme, current: options.theme || 'default' }}
                itemStyles={styles}
              />
            ))}
          </div>

          {filtered.filteredGames.length > perPage && (
            <div className="flex flex-col items-center pb-7">
              <Pagination
                count={filtered.totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                options={options}
              />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {Object.entries(data).map(([cat, games]) => (
            <CategoryRow
              key={cat}
              category={cat}
              games={games}
              onClick={navApp}
              onViewMore={handleViewMore}
              fallback={fallback}
              onImgError={handleImgError}
              theme={{ ...theme, current: options.theme || 'default' }}
              styles={styles}
            />
          ))}
        </div>
      )}
    </div>
  );
});

Games.displayName = 'Games';

const GamesLayout = () => {
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
        <Games />
      </div>
    </div>
  );
};

export default GamesLayout;
