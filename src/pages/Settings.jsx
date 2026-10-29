import clsx from 'clsx';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Nav from '../layouts/Nav';
import theme from '../styles/theming.module.css';
import { Search, HatGlasses, Palette, Globe, Wrench, ShieldCheck } from 'lucide-react';
import AdminPanel from '../components/AdminPanel';
import { useOptions } from '/src/utils/optionsContext';
import RenderSetting from '../components/Settings';

let asyncConfs = [];
const baseConfigs = [
  {
    name: 'Privacy',
    icon: HatGlasses,
    keywords: ['title', 'cloak', 'cloaking', 'tab cloak', 'about', 'about:blank', 'blank'],
    key: 'privacyConfig',
  },
  {
    name: 'Customize',
    icon: Palette,
    keywords: [
      'theme',
      'color',
      'appearance',
      'ui',
      'interface',
      'games',
      'pages',
      'apps',
      'scale',
      'nav',
      'navigation bar',
      'nav bar',
      'navbar',
      'size',
      'donate',
      'donation',
      'tabs bar',
      'tab bar',
      'device mode',
      'mobile',
      'tablet',
      'responsive',
    ],
    key: 'customizeConfig',
  },
  {
    name: 'Browsing',
    icon: Globe,
    keywords: ['tabs', 'tab', 'type', 'search engine',],
    key: 'browsingConfig',
  },
  {
    name: 'Advanced',
    icon: Wrench,
    keywords: [
      'wisp',
      'type',
      'bare',
      'leave confirm',
      'debug',
      'reset instance',
      'experimental',
      'inspect',
      'clear cache',
    ],
    key: 'advancedConfig',
  },
];

const Settings = () => {
  const { options, updateOption, effectiveDeviceMode } = useOptions();
  const mobileLayout = effectiveDeviceMode === 'mobile';
  const [q, setQ] = useState('');
  const [content, setContent] = useState('Privacy');

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let m = true;
    import('/src/data/settings.js').then((mod) => {
      if (!m) return;
      asyncConfs = baseConfigs.map((c) => ({ ...c, fn: mod[c.key] }));
      setLoaded(true);
    });
    return () => {
      m = false;
    };
  }, []);

  const settings = useMemo(
    () =>
      loaded
        ? asyncConfs.map(({ fn, ...c }) => ({
            ...c,
            items: Object.values(fn({ options, updateOption })).map(({ name, desc }) => ({
              name,
              desc,
            })),
          }))
        : [],
    [options, updateOption, loaded],
  );

  const fq = q.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      !fq
        ? settings
        : settings.filter(
            ({ name, keywords, items }) =>
              name.toLowerCase().includes(fq) ||
              keywords.some((kw) => kw.toLowerCase().includes(fq)) ||
              items.some((i) => i.name.toLowerCase().includes(fq)),
          ),
    [settings, fq],
  );

  const matchCount = useMemo(
    () =>
      settings.reduce(
        (c, s) => c + s.items.filter((i) => i.name.toLowerCase().includes(fq)).length,
        0,
      ),
    [settings, fq],
  );

  const showKeywordTip =
    !!fq &&
    filtered.length > 0 &&
    !filtered.some((s) => s.name.toLowerCase().includes(fq)) &&
    filtered.some((s) => s.keywords.some((kw) => kw.toLowerCase().includes(fq)));

  return (
    <div data-device-settings="true" className="flex h-[100dvh] min-h-0 flex-col">
      <div className="shrink-0">
        <Nav />
      </div>

      <div className={clsx('flex min-h-0 flex-1 overflow-hidden', mobileLayout && 'flex-col')}>
        <div
          className={clsx(
            theme['settings-panelColor'],
            theme[`theme-${options.theme || 'default'}`],
            mobileLayout ? 'w-full max-h-32 shrink-0 overflow-hidden p-2' : 'w-60 shrink-0 overflow-y-auto p-2 pt-3',
          )}
        >
          <div
            className="mx-auto flex h-7 w-full max-w-52 items-center rounded-lg px-2"
            style={{ backgroundColor: options.settingsSearchBar || '#3c475a' }}
          >
            <Search className="w-4 mr-1.5" />
            <input
              type="text"
              placeholder="Filter settings"
              className="bg-transparent outline-hidden w-full text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {showKeywordTip && (
            <div className="mt-2 text-xs text-gray-400 text-center px-2">
              May contain what you're looking for
            </div>
          )}
          {fq && matchCount > 1 && (
            <div className="mt-2 text-xs text-gray-400 text-center px-2">
              Found {matchCount} matching settings
            </div>
          )}

          <div className={clsx('mt-2 flex gap-2', mobileLayout ? 'overflow-x-auto pb-1' : 'flex-col gap-3 mt-5')}>
            {filtered.map(({ name, icon: Icon, items }) => {
              const matched = fq ? items.filter((i) => i.name.toLowerCase().includes(fq)) : [];
              return (
                <div
                  key={name}
                  className={clsx(
                    'flex cursor-pointer flex-col rounded-xl duration-75',
                    mobileLayout ? 'w-auto min-w-max shrink-0 px-3 py-2' : 'w-full px-5 py-2',
                    content !== name && 'bg-transparent hover:bg-[#ffffff23]',
                  )}
                  style={{
                    backgroundColor:
                      content === name
                        ? options.settingsPanelItemBackgroundColor || '#405a77'
                        : undefined,
                  }}
                  onClick={() => setContent((prev) => (prev === name ? '' : name))}
                >
                  <div className="flex items-center h-6">
                    <Icon className="w-5" />
                    <p className="mx-4">{name}</p>
                  </div>
                  {matched.length > 0 && (
                    <p className="ml-9 text-xs text-gray-400 truncate">
                      {matched.map((i) => i.name).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
            {(!fq || 'admin panel administrator control center'.includes(fq)) && (
              <div
                key="Admin Panel"
                className={clsx(
                  'flex cursor-pointer flex-col rounded-xl duration-75',
                  mobileLayout ? 'w-auto min-w-max shrink-0 px-3 py-2' : 'w-full px-5 py-2',
                  content !== 'Admin Panel' && 'bg-transparent hover:bg-[#ffffff23]',
                )}
                style={{
                  backgroundColor:
                    content === 'Admin Panel'
                      ? options.settingsPanelItemBackgroundColor || '#405a77'
                      : undefined,
                }}
                onClick={() => setContent((prev) => (prev === 'Admin Panel' ? '' : 'Admin Panel'))}
              >
                <div className="flex items-center h-6">
                  <ShieldCheck className="w-5 text-cyan-300" />
                  <p className="mx-4">Admin Panel</p>
                </div>
                <p className="ml-9 text-[10px] text-cyan-200/65">Restricted controls</p>
              </div>
            )}
          </div>
        </div>

        {loaded ? (
          content === 'Admin Panel' ? <AdminPanel /> : <RenderSetting setting={content} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default Settings;
