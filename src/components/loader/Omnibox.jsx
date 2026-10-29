import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Folders,
  Menu,
  SquareArrowOutUpRight,
  Info,
  Search,
  Lock,
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useRef, useMemo } from 'react';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { process, openEmbed } from '/src/utils/hooks/loader/utils';
import { useOptions } from '/src/utils/optionsContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Action = ({ Icon, size = 15, action = () => alert('nothing here yet'), disabled = false }) => {
  const { options } = useOptions();
  return (
    <button
      className={clsx(
        'flex justify-center items-center',
        'h-6 w-7 rounded-md',
        disabled ? 'cursor-not-allowed opacity-70' : '',
        options.type != 'light' ? 'hover:bg-[#fff3]' : 'hover:bg-[#97979773]',
      )}
      onClick={(e) => {
        if (!disabled) {
          action(e);
        }
      }}
    >
      <Icon size={size} />
    </button>
  );
};

const Omnibox = () => {
  const [Icon, setIcon] = useState(Info);
  const activeTab = loaderStore((state) => state.tabs.find((tab) => tab.active));
  const { updateUrl, refreshTab, goBack, goForward, toggleTabs, toggleMenu, showUI } = loaderStore();
  const inputRef = useRef(null);
  const { options } = useOptions();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { iframeUrls } = loaderStore();

  const isProcied = (url) => url?.includes('portal/k12/') || url?.includes('ham/');
  const isNewTab = (url) => !url || url === 'tabs://new' || url.endsWith('/new');

  const updateIcon = (url) => {
    if (isNewTab(url)) {
      setIcon(Info);
    } else if (isProcied(url)) {
      const decoded = process(url, true, options.prType || 'auto', options.engine || undefined);
      setIcon(decoded.startsWith('https://') ? Lock : Info);
    } else {
      setIcon(Info);
    }
  };

  const getDisplayUrl = (url) => {
    if (isNewTab(url)) return '';
    if (isProcied(url)) {
      const decoded = process(url, true, options.prType || 'auto', options.engine || undefined);
      return decoded.startsWith('https://') ? decoded.slice(8) : decoded;
    }
    return url;
  };

  const [input, setInput] = useState(getDisplayUrl(activeTab?.url));

  useEffect(() => {
    const url = iframeUrls[activeTab?.id];
    if (activeTab?.url === 'tabs://new') {
      setInput('');
    } else if (url && url !== 'about:blank') {
      setInput(getDisplayUrl(url));
      updateIcon(url);
    }
  }, [iframeUrls, activeTab?.id]);

  useEffect(() => {
    if (state?.url && activeTab) {
      const processedUrl = process(state.url, false, options.prType || 'auto', options.engine || undefined);
      if (processedUrl) {
        updateUrl(activeTab.id, processedUrl);
      }
      navigate('.', { replace: true, state: {} });
    }
  }, [state?.url, activeTab?.id]);

  useEffect(() => {
    if (activeTab) {
      updateIcon(activeTab.url);
    }
  }, [activeTab]);

  return (
    <div className={clsx("h-10 flex items-center overflow-hidden gap-1 px-2", showUI ? '' : 'hidden')}>
      <Action
        Icon={ArrowLeft}
        size="17"
        action={() =>
          activeTab &&
          goBack(activeTab.id, () => {
            setInput('');
          })
        }
      />
      {/** ^^ callback used if going back to a new tab only */}
      <Action Icon={ArrowRight} size="17" action={() => activeTab && goForward(activeTab.id)} />
      <Action Icon={RotateCw} size="16" action={() => activeTab && refreshTab(activeTab.id)} />
      <div
        className={clsx(
          ' h-[calc(100%-8px)] w-full',
          'rounded-lg border-1 flex items-center px-2 ml-1 mr-1',
        )}
        style={{
          backgroundColor: options.omninputColor || '#06080d8f',
          borderColor: options.type == 'light' ? '#a1a1a173' : "#efefef30",
        }}
      >
        <Icon size="15" />
        <input
          className="h-full w-full outline-0 text-[0.8rem] ml-2"
          placeholder="Search with Bing or enter address"
          onSelect={() => setIcon(Search)}
          onBlur={() => updateIcon(iframeUrls[activeTab?.id])}
          value={input}
          ref={inputRef}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeTab && input.length !== 0) {
              const processedUrl = process(input, false, options.prType || 'auto', options.engine || undefined);
              if (processedUrl) {
                updateUrl(activeTab.id, processedUrl);
              }
              inputRef.current.blur();
            }
          }}
        ></input>
      </div>
      <Action
        Icon={SquareArrowOutUpRight}
        size="15"
        action={() => openEmbed(activeTab?.url)}
        disabled={activeTab?.url == 'tabs://new'}
      />
      <Action Icon={Folders} size="17" action={toggleTabs} />
      <Action Icon={Menu} size="17" action={(e) => {
        e?.stopPropagation();
        toggleMenu();
      }} />
    </div>
  );
};

export default Omnibox;