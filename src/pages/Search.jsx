import Tabs from '/src/components/loader/Tabs';
import Omnibox from '/src/components/loader/Omnibox';
import Viewer from '/src/components/loader/Viewer';
import Menu from '/src/components/loader/Menu';
import FloatingWindows from '/src/components/loader/FloatingWindows';
import loaderStore from '/src/utils/hooks/loader/useLoaderStore';
import { process } from '/src/utils/hooks/loader/utils';
import { useOptions } from '../utils/optionsContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function Loader({ config = {} }) {
  const location = useLocation();
  const { url, ui = true, zoom, alerts = false } = config;
  const { options } = useOptions();
  const tabs = loaderStore((state) => state.tabs);
  const updateUrl = loaderStore((state) => state.updateUrl);
  const barStyle = {
    backgroundColor: options.barColor || '#09121e',
  };

  useEffect(() => {
    if (url && tabs.length > 0) {
      //only 1 tab on initial load so tabs[0]
      const tab = tabs[0];
      const processedUrl = process(url, false, options.prType || 'auto', options.engine || 'https://www.bing.com/search?q=');
      if (processedUrl && tab.url !== processedUrl) {
        updateUrl(tab.id, processedUrl);
      }
    }
  }, [url, tabs, updateUrl, options.prType]);

  useEffect(() => {
    // The section switcher passes this state when returning to the browser so its tabs survive route changes.
    if (location.state?.dogeubSectionSwitcher) {
      if (location.state.browserTabId) {
        loaderStore.getState().setActive(location.state.browserTabId);
      }
      return;
    }

    // Keep the usual fresh-browser behavior for normal visits to /search.
    loaderStore.getState().clearStore({ showTb: options.showTb ?? true });
  }, [location.key, location.state, options.showTb]);

  return (
    <div className="relative flex flex-col w-full h-screen">
      {ui && (
        <>
          <div
            className="flex flex-col w-full"
            style={barStyle}
            onClick={() => loaderStore.getState().showMenu && loaderStore.getState().toggleMenu()}
          >
            <div
              className="relative flex w-full shrink-0 items-center gap-3 border-b border-white/10 px-4"
              style={{ backgroundColor: options.barColor || '#09121e', minHeight: '42px', height: '42px', zIndex: 2, color: '#ffffff' }}
            >
              <span
                aria-hidden="true"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0, borderRadius: '7px', background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', color: '#fff', fontSize: '13px', fontWeight: 900 }}
              >D</span>
              <span
                className="select-none"
                style={{ display: 'inline-block', color: '#fff', fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontSize: '13px', fontWeight: 800, letterSpacing: '0.18em', lineHeight: 1.2, whiteSpace: 'nowrap' }}
              >DOGEUB OS</span>
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em' }}>BROWSER</span>
            </div>
            <Tabs />
            <Omnibox />
          </div>
          <Menu />
        </>
      )}
      <div
        className="flex-1 w-full min-h-0"
        onClick={() => loaderStore.getState().showMenu && loaderStore.getState().toggleMenu()}
      >
        <Viewer conf={{ zoom: zoom, alerts: alerts }} />
      </div>
      <FloatingWindows />
    </div>
  );
}
