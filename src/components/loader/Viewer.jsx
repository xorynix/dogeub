import clsx from 'clsx';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { useOptions } from '/src/utils/optionsContext';
import { useRef, useEffect } from 'react';
import { Loader } from 'lucide-react';

import NewTab from './NewTab';

const Viewer = ({ conf = {} }) => {
  const tabs = loaderStore((state) => state.tabs);
  const updateUrl = loaderStore((state) => state.updateUrl);
  const updateTitle = loaderStore((state) => state.updateTitle);
  const setLoading = loaderStore((state) => state.setLoading);
  const setFrameRefs = loaderStore((state) => state.setFrameRefs);
  const { iframeUrls, setIframeUrl, showMenu, toggleMenu } = loaderStore();
  const frameRefs = useRef({});
  const prevURL = useRef({});
  const prevTitle = useRef({});
  const { options } = useOptions();
  const updateActiveFrameRef = loaderStore((state) => state.updateActiveFrameRef);
  const activeFrameRef = loaderStore((state) => state.activeFrameRef);
  const enableAlerts = conf.alerts ?? true;

  useEffect(() => {
    setFrameRefs(frameRefs);
    const tabIds = new Set(tabs.map((t) => t.id));
    Object.keys(frameRefs.current).forEach((id) => {
      if (!tabIds.has(id)) delete frameRefs.current[id];
    });
  }, [setFrameRefs, tabs]);

  useEffect(() => {
    const listeners = [];
    tabs.forEach((tab) => {
      if (tab.url === 'tabs://new') return;
      const iframe = frameRefs.current[tab.id];
      if (!iframe) return;
      const handleLoad = () => {
        setLoading(tab.id, false);
        try {
          const d = iframe.contentWindow?.document;
          if (d?.getElementById('errorTrace-wrapper') || d?.getElementById('uvHostname')) {
            iframe.contentWindow.location.replace(tab.url);
          }
          if (!enableAlerts && iframe.contentWindow) {
            iframe.contentWindow.alert = () => {};
          }
        } catch {}
      };
      const checkState = () => {
        try {
          const curURL = iframe.contentWindow.location.href;
          const curTTL = iframe.contentWindow.document.title;
          if (curURL === 'about:blank') return;
          // url shouldnt be updating if tab is still loading...will cause race condition
          if (!tab.isLoading && curURL !== prevURL.current[tab.id] && curURL !== tab.url) {
            prevURL.current[tab.id] = curURL;
            updateUrl(tab.id, curURL);
          }
          if (curTTL && curTTL !== prevTitle.current[tab.id] && curTTL !== tab.title) {
            prevTitle.current[tab.id] = curTTL;
            updateTitle(tab.id, curTTL);
          }
        } catch (e) {}
      };
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('load', checkState);
      listeners.push({ iframe, handleLoad, checkState, tabId: tab.id });
      
      //try to remove it again
      if (!enableAlerts) {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.alert = () => {};
          }
        } catch {}
      }
    });
    const interval = setInterval(() => {
      tabs.forEach((tab) => {
        if (tab.url === 'tabs://new') return;
        const iframe = frameRefs.current[tab.id];
        if (!iframe) return;
        try {
          const curURL = iframe.contentWindow.location.href;
          const curTTL = iframe.contentWindow.document.title;
          if (curURL === 'about:blank') return;
          const d = iframe.contentWindow?.document;
          if (d?.getElementById('errorTrace-wrapper') || d?.getElementById('uvHostname')) {
            iframe.contentWindow.location.replace(tab.url);
            return;
          }
          if (!enableAlerts && iframe.contentWindow) {
            iframe.contentWindow.alert = () => {};
          }
          // tab cant be loading while URL is being updated
          if (!tab.isLoading && curURL !== prevURL.current[tab.id] && curURL !== tab.url) {
            prevURL.current[tab.id] = curURL;
            setIframeUrl(tab.id, curURL);
          }
          if (curTTL && curTTL !== prevTitle.current[tab.id] && curTTL !== tab.title) {
            prevTitle.current[tab.id] = curTTL;
            updateTitle(tab.id, curTTL);
          }
        } catch (e) {}
      });
    }, 50);
    return () => {
      listeners.forEach(({ iframe, handleLoad, checkState }) => {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('load', checkState);
      });
      clearInterval(interval);
    };
  }, [tabs, setLoading, updateTitle, setIframeUrl, enableAlerts]);

  useEffect(() => {
    const interval = setInterval(() => {
      tabs.forEach((tab) => {
        if (tab.url === 'tabs://new') return;
        const iframe = frameRefs.current[tab.id];
        if (!iframe) return;
        try {
          const currentUrl = iframe.contentWindow.location.href;
          if (currentUrl !== iframeUrls[tab.id]) {
            setIframeUrl(tab.id, currentUrl);
          }
        } catch (e) {}
      });
    }, 500);

    return () => clearInterval(interval);
  }, [tabs, iframeUrls, setIframeUrl]);

  useEffect(() => {
    if (activeFrameRef?.current) {
      try {
        activeFrameRef.current.contentWindow.document.body.style.zoom = conf.zoom;
      } catch (e) {}
    }
  }, [activeFrameRef, conf.zoom]);

  useEffect(() => {
    const activeTab = tabs.find((tab) => tab.active);
    if (activeTab) {
      const iframeRef = { current: frameRefs.current[activeTab.id] };
      updateActiveFrameRef(iframeRef);
    }

    // The parent page cannot inspect YouTube's cross-origin iframe media element.
    // Send the active browser tab's metadata so the taskbar island can still identify YouTube.
    const url = activeTab?.url || '';
    const isYouTube = /(^|\.)youtube\.com|(^|\.)youtu\.be/i.test(url.replace(/^https?:\/\//i, '').split('/')[0]);
    window.dispatchEvent(new CustomEvent('dogeub-browser-media', {
      detail: isYouTube
        ? { title: activeTab?.title && activeTab.title !== 'New Tab' ? activeTab.title.replace(/\s*-\s*YouTube\s*$/i, '') : 'YouTube video', artist: 'YouTube · Browser', playing: true, hasMedia: true }
        : { title: '', artist: '', playing: false, hasMedia: false },
    }));
  }, [tabs, updateActiveFrameRef]);

  const activeNewTab = tabs.find((tab) => tab.url === 'tabs://new' && tab.active);

  return (
    <div className="relative w-full h-full">
      {tabs.map(({ id, url, active }) => {
        if (url === 'tabs://new') return null;
        return (
          <div
            key={id}
            className={clsx(
              'absolute inset-0 w-full h-full',
              active ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none',
            )}
          >
            {active && (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center -z-20"
                style={{ backgroundColor: options.tabBarColor || '#070e15' }}
              >
                <Loader size={32} className="animate-spin" />
              </div>
            )}
            <iframe
              ref={(el) => (frameRefs.current[id] = el)}
              src={url}
              style={{ display: 'block', width: '100%', height: '100%' }}
              className="absolute inset-0 w-full h-full transition-opacity duration-200"
            />

            {/*transparent overlay for when click on content */}
            {showMenu && (
              <div className="absolute inset-0 w-full h-full z-50" onClick={() => toggleMenu()} />
            )}
          </div>
        );
      })}
      {activeNewTab && (
        <div
          key={activeNewTab.id}
          className={clsx('absolute inset-0 w-full h-full', 'opacity-100 z-10 pointer-events-auto')}
        >
          <NewTab id={activeNewTab.id} updateFn={updateUrl} options={options} />
        </div>
      )}
    </div>
  );
};

export default Viewer;
