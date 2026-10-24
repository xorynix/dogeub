import clsx from 'clsx';
import { useState, useEffect, useRef, useCallback, useMemo, memo, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideSearch, Earth, ChevronDown } from 'lucide-react';
import { GlowWrapper } from '../utils/Glow';
import { useOptions } from '../utils/optionsContext';
import { searchConfig } from '../utils/config';
import Logo from '../components/Logo';
import QuickLinks from '../components/QuickLinks';
import theme from '../styles/theming.module.css';
import 'movement.css';

const QUICK_ENGINES = ['Bing', 'DuckDuckGo', 'Brave', 'Yahoo', 'Startpage', 'Ecosia', 'Kagi'];

const SearchContainer = memo(function SearchContainer({ logo = true, cls, nav = true, navigating }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeResult, setActiveResult] = useState(-1);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const latestQuery = useRef('');
  const navigate = useNavigate();
  const { options, updateOption } = useOptions();
  const [pickerOpen, setPickerOpen] = useState(false);
  const quickEngines = useMemo(
    () => searchConfig.filter((c) => QUICK_ENGINES.includes(c.option)),
    [],
  );

  const fetchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch('/return?q=' + encodeURIComponent(searchQuery));
      if (!response.ok) {
        if (latestQuery.current === searchQuery) setResults([]);
        return;
      }

      const data = await response.json();
      if (latestQuery.current !== searchQuery) return;
      const list = Array.isArray(data) ? data.filter((i) => i.phrase).slice(0, 4) : [];
      startTransition(() => setResults(list));
    } catch {
      if (latestQuery.current === searchQuery) setResults([]);
    }
  }, []);

  const go = (strin) => {
    if (nav) {
      navigate("/search", {
        state: {
          url: strin,
        }
      });
    } else {
      const processedUrl = navigating.process(strin);
      if (processedUrl) {
        navigating.go(navigating.id, processedUrl);
      }
    }
  }

  const handleInputChange = useCallback(
    (e) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      setActiveResult(-1);
      // Invalidate in-flight responses before the next debounced request starts.
      latestQuery.current = newQuery;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!newQuery.trim()) {
        latestQuery.current = '';
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(() => fetchResults(newQuery), 300);
    },
    [fetchResults],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' && results.length > 0 && !pickerOpen) {
        e.preventDefault();
        setActiveResult((current) => (current + 1) % results.length);
        return;
      }
      if (e.key === 'ArrowUp' && results.length > 0 && !pickerOpen) {
        e.preventDefault();
        setActiveResult((current) => current <= 0 ? results.length - 1 : current - 1);
        return;
      }
      if (e.key === 'Escape') {
        setActiveResult(-1);
        setResults([]);
        setPickerOpen(false);
        return;
      }
      if (e.key !== 'Enter') return;
      const trimmed = activeResult >= 0 && results[activeResult]
        ? results[activeResult].phrase
        : query.trim();
      if (!trimmed) return;
      go(trimmed);
    },
    [query, go, results, activeResult, pickerOpen],
  );

  const handleResultClick = useCallback(
    (phrase) => {
      go(phrase);
    },
    [go],
  );

  useEffect(() => {
    const handleGlobalShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  useEffect(() => {
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, []);

  const placeholder = useMemo(
    () => `Search ${options.engineName || 'Bing'} or type URL`,
    [options.engineName],
  );

  const iconSrc = useMemo(
    () =>
      options.engineIcon ??
      'https://www.bing.com/favicon.ico',
    [options.engineIcon],
  );

  return (
    <div
      className={clsx(
        !cls ? 'absolute w-full px-4 sm:px-20 py-4 flex flex-col items-center mt-8 z-50' : cls,
      )}
      data-m={!cls && 'bounce-up'}
      data-m-duration={!cls && '0.8'}
    >
      {logo && (
        <div className="flex flex-col items-center">
          <Logo options="w-[15.8rem] h-30" />
          <div className="mt-2 select-none text-sm font-extrabold tracking-[0.22em] opacity-90" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>DOGEUB OS</div>
        </div>
      )}
      <div className="flex w-full max-w-5xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
      <GlowWrapper
        glowOptions={{ color: options.glowWrapperColor || '255, 255, 255', size: 70, opacity: 0.2 }}
      >
        <div className="w-full max-w-[40.625rem] min-w-0">
          <div
            id="search-div"
            className={clsx(
              'flex items-center gap-3 shadow-xl pl-4 pr-4 w-full h-[3.41rem]',
              results.length || pickerOpen ? 'rounded-t-[14px] rounded-b-none' : 'rounded-[14px]',
              theme[`searchBarColor`],
              theme[`theme-${options.theme || 'default'}`],
            )}
          >
            <button
              type="button"
              className="shrink-0 cursor-pointer flex items-center gap-1 opacity-90 hover:opacity-100 duration-100"
              title="Change search engine"
              aria-label="Change search engine"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              {iconSrc ? (
                <img src={iconSrc} className="w-5 h-5" alt="Search engine" loading="lazy" />
              ) : (
                <Earth size={22} />
              )}
              <ChevronDown
                size={14}
                className={clsx('duration-150', pickerOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-hidden text-[16.5px] leading-[20px] placeholder:font-[Inter] placeholder:font-medium"
              autoComplete="off"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <LucideSearch className="w-[1.08rem] h-[1.08rem] shrink-0" />
          </div>

          {pickerOpen && (
            <div
              className={clsx(
                'shadow-xl mt-0 p-2 text-[14px] w-full rounded-b-[14px] flex flex-wrap gap-2',
                theme[`searchResultStyle`],
                theme[`theme-${options.theme || 'default'}`],
              )}
            >
              {quickEngines.map((c) => {
                const active = (options.engine || searchConfig[0].value.engine) === c.value.engine;
                return (
                  <button
                    type="button"
                    key={c.option}
                    className={clsx(
                      'flex items-center gap-2 rounded-[9px] h-9 px-3 cursor-pointer duration-100 ease-in hover:bg-[#d4d4d418]',
                      active && 'bg-[#d4d4d424]',
                    )}
                    onClick={() => {
                      updateOption(c.value);
                      setPickerOpen(false);
                    }}
                  >
                    <img src={c.value.engineIcon} className="w-4 h-4" alt="" loading="lazy" />
                    <span>{c.option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!pickerOpen && results.length > 0 && (
            <div
              className={clsx(
                'shadow-xl mt-0 p-2 text-[14px] w-full rounded-b-[14px] space-y-1',
                theme[`searchResultStyle`],
                theme[`theme-${options.theme || 'default'}`],
              )}
            >
              {results.map((result) => (
                <div
                  key={result.phrase}
                  role="option"
                  aria-selected={activeResult === results.indexOf(result)}
                  tabIndex={-1}
                  className={clsx(
                    'rounded-[9px] w-full h-11 cursor-pointer duration-100 ease-in px-3 pl-2.5 flex items-center',
                    activeResult === results.indexOf(result) ? 'bg-[#d4d4d424]' : 'hover:bg-[#d4d4d418]',
                  )}
                  onMouseEnter={() => setActiveResult(results.indexOf(result))}
                  onClick={() => handleResultClick(result.phrase)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '12px' }}
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <span className="text-[15px]">{result.phrase}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlowWrapper>
      </div>
      <QuickLinks compact cls="shrink-0 justify-center" />
      </div>
    </div>
  );
});

export default SearchContainer;
