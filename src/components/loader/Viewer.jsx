import clsx from 'clsx';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { useOptions } from '/src/utils/optionsContext';
import { useRef, useEffect, useState } from 'react';
import { Loader, WifiOff, RotateCw } from 'lucide-react';

import NewTab from './NewTab';

const getProxyError = (iframe) => {
  try {
    const doc = iframe?.contentWindow?.document;
    const trace = doc?.getElementById('errorTrace-wrapper');
    const hostname = doc?.getElementById('uvHostname');
    if (!trace && !hostname) return null;

    const text = String(trace?.innerText || doc?.body?.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
    const match = text.match(/(?:TypeError|Error processing your request|Failed to load|Internal Server Error|Could not connect)[^.]{0,180}/i);
    return {
      detail: match?.[0]?.slice(0, 180) ||
        'The browsing page returned a connection error from its proxy service.'
    };
  } catch {
    return null;
  }
};

const updateProxyErrorState = (setProxyErrors, tabId, error) => {
  setProxyErrors((previous) => {
    if (error && previous[tabId]?.detail === error.detail) return previous;
    if (!error && !previous[tabId]) return previous;

    const next = { ...previous };
    if (error) next[tabId] = error;
    else delete next[tabId];
    return next;
  });
};

const Viewer = ({ conf = {} }) => {
  const tabs = loaderStore((state) => state.tabs);
  const [proxyErrors, setProxyErrors] = useState({});
  const refreshTab = loaderStore((state) => state.refreshTab);
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
          const proxyError = getProxyError(iframe);
          updateProxyErrorState(setProxyErrors, tab.id, proxyError);
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
          const proxyError = getProxyError(iframe);
          updateProxyErrorState(setProxyErrors, tab.id, proxyError);
          if (proxyError) return;
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

            {active && proxyErrors[id] && (
              <div
                role="alert"
                className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/95 p-5 text-white backdrop-blur-xl sm:p-8"
              >
                <div className="w-full max-w-xl rounded-3xl border border-rose-200/15 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200/20 bg-rose-300/10 text-rose-100">
                    <WifiOff size={23} />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[.22em] text-rose-100/65">Browser connection</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Couldn't connect to the browsing server</h2>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    DOGEUB received a connection error from the browsing service. The server may be offline or unreachable. Retrying can help if the issue was temporary.
                  </p>
                  <p className="mt-4 break-words rounded-xl border border-white/10 bg-black/25 px-3 py-3 font-mono text-xs leading-5 text-white/55">
                    {proxyErrors[id].detail}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        updateProxyErrorState(setProxyErrors, id, null);
                        setLoading(id, true);
                        refreshTab(id);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-100 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white"
                    >
                      <RotateCw size={15} /> Retry connection
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateUrl(id, 'tabs://new');
                        updateTitle(id, 'New Tab');
                        updateProxyErrorState(setProxyErrors, id, null);
                      }}
                      className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                    >
                      Back to New Tab
                    </button>
                  </div>
                </div>
              </div>
            )}

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
