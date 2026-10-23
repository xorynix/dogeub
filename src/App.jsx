import Routing from './Routing';
import ReactGA from 'react-ga4';
import Search from './pages/Search';
import lazyLoad from './lazyWrapper';
import NotFound from './pages/NotFound';
import { useEffect, useMemo, memo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Popunder from './components/Popunder';
import PanicButton from './components/PanicButton';
import Taskbar from './components/Taskbar';
import AdminPanelWindow from './components/AdminPanelWindow';
import PatchLogs from './components/PatchLogs';
import AdminAnnouncement from './components/AdminAnnouncement';
import LockScreen from './components/LockScreen';
import DogeHub from './components/DogeHub';
import DogeAssistant from './components/DogeAssistant';
import PetBuddy from './components/PetBuddy';
import DogeNexus from './components/DogeNexus';
import PortalTransitions from './components/PortalTransitions';
import EmojiWidgets from './components/EmojiWidgets';
import InteractiveDots from './components/InteractiveDots';
import QuickLauncher from './components/QuickLauncher';
import SectionSwitcher from './components/SectionSwitcher';
import HolographicTabSwitcher from './components/HolographicTabSwitcher';
import NotificationCenter from './components/NotificationCenter';
import HoloSpace from './components/HoloSpace';
import { OptionsProvider, useOptions } from './utils/optionsContext';
import { initPreload } from './utils/preload';
import { designConfig as bgDesign } from './utils/config';
import useReg from './utils/hooks/loader/useReg';
import usePopunderStore from './utils/hooks/popunder/usePopunderStore';
import { validateAdKey } from './utils/hooks/popunder/validateAdKey';
import './index.css';
import 'nprogress/nprogress.css';

const importHome = () => import('./pages/Home');
const importApps = () => import('./pages/Apps');
const importGms = () => import('./pages/Apps2');
const importSettings = () => import('./pages/Settings');
const importRecommended = () => import('./pages/Recommended');
const importFiles = () => import('./pages/Files');
const importShortcuts = () => import('./pages/Shortcuts');
const importMessages = () => import('./pages/Messages');
const importDashboardStudio = () => import('./pages/DashboardStudio');
const importToolbox = () => import('./pages/Toolbox');
const importPCCenter = () => import('./pages/PCCenter');
const importGameLibrary = () => import('./pages/GameLibrary');
const importStudentCenter = () => import('./pages/StudentCenter');
const importSocialCenter = () => import('./pages/SocialCenter');
const importRemoteDesktop = () => import('./pages/RemoteDesktop');
const importCollaborationCenter = () => import('./pages/CollaborationCenter');
const importPublicProfile = () => import('./pages/PublicProfile');

const Home = lazyLoad(importHome);
const Apps = lazyLoad(importApps);
const Apps2 = lazyLoad(importGms);
const Settings = lazyLoad(importSettings);
const Recommended = lazyLoad(importRecommended);
const Files = lazyLoad(importFiles);
const Shortcuts = lazyLoad(importShortcuts);
const Messages = lazyLoad(importMessages);
const DashboardStudio = lazyLoad(importDashboardStudio);
const Toolbox = lazyLoad(importToolbox);
const PCCenter = lazyLoad(importPCCenter);
const GameLibrary = lazyLoad(importGameLibrary);
const StudentCenter = lazyLoad(importStudentCenter);
const SocialCenter = lazyLoad(importSocialCenter);
const RemoteDesktop = lazyLoad(importRemoteDesktop);
const CollaborationCenter = lazyLoad(importCollaborationCenter);
const PublicProfile = lazyLoad(importPublicProfile);
const Player = lazyLoad(() => import('./pages/Player'));

initPreload('/materials', importApps);
initPreload('/docs', importGms);
initPreload('/settings', importSettings);
initPreload('/', importHome);

function SiteControlNotice({ title, detail }) {
  return <main className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950 p-6 text-white"><section className="w-full max-w-xl rounded-3xl border border-amber-200/15 bg-white/[.03] p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-200/20 bg-amber-200/[.07] text-amber-100"><span className="text-2xl">⏸</span></div><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-white/60">{detail}</p><a href="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">Return home</a></section></main>;
}
function ShieldBanIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m9 9 6 6m0-6-6 6"/></svg>;
}

function Windows10Startup() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Starting DOGEUB"
      className="flex flex-col items-center justify-center text-white" style={{ position: "fixed", inset: 0, zIndex: 2147483647, backgroundColor: "#000000" }}
    >
      <div className="mb-16 flex h-24 w-24 -skew-y-2 flex-col gap-[4px]">
        <div className="flex flex-1 gap-[3px]">
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-white" />
        </div>
        <div className="flex flex-1 gap-[3px]">
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-white" />
        </div>
      </div>
      <div className="mb-3 text-sm font-normal tracking-wide">DOGEUB</div>
      <div className="mb-3 text-xs text-white/90">Starting Windows</div>
      <div className="flex h-8 items-center justify-center" aria-hidden="true">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      </div>
    </div>
  );
}

function useTracking() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: location.pathname });
  }, [location]);
}

const ThemedApp = memo(() => {
  const { options, updateOption } = useOptions();
  const location = useLocation();
  const [siteStatus, setSiteStatus] = useState({ gamesDisabled: false, serverMuted: false, browsingDisabled: false, maintenanceMode: false, maintenanceMessage: '', maintenanceAdmin: false, maintenanceAuthenticated: false, banned: false, banReason: '' });
  const popunderEnabled = POPUNDER_ENABLED === 'true';
  const [customBackground, setCustomBackground] = useState(() => {
    try { return window.localStorage.getItem('dogeub-site-background') || ''; } catch { return ''; }
  });

  useEffect(() => {
    let active = true;
    const refreshSiteStatus = async () => {
      try {
        let username = '';
        try { username = window.localStorage.getItem('dogeub-os-username-v1') || ''; } catch {}
        const response = await fetch('/api/public/site-status?username=' + encodeURIComponent(username), { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setSiteStatus({
          gamesDisabled: data.gamesDisabled === true,
          serverMuted: data.serverMuted === true,
          browsingDisabled: data.browsingDisabled === true,
          maintenanceMode: data.maintenanceMode === true,
          maintenanceMessage: String(data.maintenanceMessage || ''),
          maintenanceAdmin: data.maintenanceAdmin === true,
          maintenanceAuthenticated: data.maintenanceAuthenticated === true,
          banned: data.banned === true,
          banReason: String(data.banReason || '')
        });
      } catch {}
    };
    refreshSiteStatus();
    const interval = window.setInterval(refreshSiteStatus, 10000);
    const onIdentityChange = () => refreshSiteStatus();
    window.addEventListener('storage', onIdentityChange);
    window.addEventListener('dogeub-identity-change', onIdentityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('storage', onIdentityChange);
      window.removeEventListener('dogeub-identity-change', onIdentityChange);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    if (customBackground) {
      body.style.setProperty('background-image', `url("${customBackground}")`, 'important');
      body.style.setProperty('background-size', 'cover', 'important');
      body.style.setProperty('background-position', 'center center', 'important');
      body.style.setProperty('background-repeat', 'no-repeat', 'important');
      body.style.setProperty('background-attachment', 'fixed', 'important');
      body.style.setProperty('background-color', options.bgColor || '#111827', 'important');
    } else {
      body.style.removeProperty('background-image');
      body.style.removeProperty('background-size');
      body.style.removeProperty('background-position');
      body.style.removeProperty('background-repeat');
      body.style.removeProperty('background-attachment');
      body.style.removeProperty('background-color');
    }
  }, [customBackground, options.bgColor]);

  useEffect(() => {
    const syncBackground = () => {
      try { setCustomBackground(window.localStorage.getItem('dogeub-site-background') || ''); } catch { setCustomBackground(''); }
    };
    window.addEventListener('dogeub-background-change', syncBackground);
    return () => window.removeEventListener('dogeub-background-change', syncBackground);
  }, []);
  const adKeyPassed = usePopunderStore((state) => state.adKeyPassed);
  const setAdKeyPassed = usePopunderStore((state) => state.setAdKeyPassed);
  useReg();
  useTracking();

  useEffect(() => {
    let cancaled = false;

    const run = async () => {
      const jocc =
        typeof options.adKeyInput === 'string' && options.adKeyInput.trim()
          ? options.adKeyInput.trim()
          : typeof options.adKey === 'string' && options.adKey.trim()
            ? options.adKey.trim()
            : '';

      if (!jocc) {
        if (!cancaled) setAdKeyPassed(false);
        return;
      }

      const valid = await validateAdKey(jocc);
      if (cancaled) return;

      setAdKeyPassed(valid);

      if (valid && (options.adKey !== jocc || options.adKeyInput !== jocc)) {
        updateOption({ adKey: jocc, adKeyInput: jocc });
      }
    };

    run();

    return () => {
      cancaled = true;
    };
  }, [options.adKey, options.adKeyInput, setAdKeyPassed, updateOption]);

  const pages = useMemo(
    () => [
      { path: '/', element: <Home /> },
      { path: '/materials', element: <Apps /> },
      { path: '/docs', element: <Apps2 /> },
      { path: '/docs/r', element: <Player /> },
      { path: '/search', element: <Search />},
      { path: '/settings', element: <Settings /> },
      { path: '/recommended', element: <Recommended /> },
      { path: '/files', element: <Files /> },
      { path: '/shortcuts', element: <Shortcuts /> },
      { path: '/messages', element: <Messages /> },
      { path: '/dashboard', element: <DashboardStudio /> },
      { path: '/toolbox', element: <Toolbox /> },
      { path: '/pc-center', element: <PCCenter /> },
      { path: '/game-library', element: <GameLibrary /> },
      { path: '/student-center', element: <StudentCenter /> },
      { path: '/social', element: <SocialCenter /> },
      { path: '/remote-desktop', element: <RemoteDesktop /> },
      { path: '/collaboration-center', element: <CollaborationCenter /> },
      { path: '/profile/:username', element: <PublicProfile /> },
      { path: '/portal/k12/*', element: <NotFound /> },
      { path: '/ham/*', element: <NotFound /> },
      { path: '*', element: <NotFound /> },
    ],
    [],
  );

  const backgroundStyle = useMemo(() => {
    const bgDesignConfig =
      options.bgDesign === 'None'
        ? 'none'
        : (
            bgDesign.find((d) => d.value.bgDesign === options.bgDesign) || bgDesign[0]
          ).value.getCSS?.(options.bgDesignColor || '102, 105, 109') || 'none';

    return `
      body {
        color: ${options.siteTextColor || '#a0b0c8'};
        background-image: ${customBackground ? `url("${customBackground}")` : bgDesignConfig};
        background-size: ${customBackground ? 'cover' : 'auto'};
        background-position: ${customBackground ? 'center center' : 'initial'};
        background-repeat: ${customBackground ? 'no-repeat' : 'repeat'};
        background-attachment: ${customBackground ? 'fixed' : 'scroll'};
        background-color: ${options.bgColor || '#111827'};
      }
    `;
  }, [options.siteTextColor, options.bgDesign, options.bgDesignColor, options.bgColor, customBackground]);

  return (
    <>
      <Windows10Startup />
      <PanicButton />
      <PatchLogs />
      {siteStatus.banned ? (
        <main className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950 p-6 text-white">
          <section className="w-full max-w-xl rounded-3xl border border-rose-300/20 bg-rose-300/[.05] p-8 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-200/20 bg-rose-200/10 text-rose-100"><ShieldBanIcon /></div>
            <h1 className="mt-5 text-2xl font-bold">DOGEUB access disabled</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">{siteStatus.banReason || 'An administrator has disabled access for this DOGEUB account.'}</p>
            <p className="mt-5 text-xs text-white/35">If you believe this is a mistake, contact a DOGEUB administrator.</p>
          </section>
        </main>
      ) : siteStatus.maintenanceMode && !siteStatus.maintenanceAdmin && (location.pathname !== '/messages' || siteStatus.maintenanceAuthenticated) ? (
        <main className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-slate-950 p-6 text-white">
          <section className="w-full max-w-xl rounded-3xl border border-cyan-200/15 bg-white/[.025] p-8 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/[.07] text-cyan-100"><span className="text-2xl">🛠</span></div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[.25em] text-cyan-200">DOGEUB status</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Temporarily unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">{siteStatus.maintenanceMessage || 'DOGEUB is temporarily unavailable while we perform maintenance. Please check back soon.'}</p>
            <p className="mt-5 text-xs text-white/30">Please check back later. Signed-in administrators can open the Admin Panel from the Start menu.</p>
            <a href="/messages" className="mt-5 inline-flex rounded-xl border border-cyan-200/20 px-4 py-2.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-200/[.06]">Administrator sign-in</a>
          </section>
        </main>
      ) : siteStatus.gamesDisabled && ['/docs', '/docs/r', '/game-library'].includes(location.pathname) ? (
        <SiteControlNotice title="Games are temporarily disabled" detail="A DOGEUB administrator has closed the Games section. Please try again later." />
      ) : siteStatus.browsingDisabled && ['/materials', '/search', '/recommended'].includes(location.pathname) ? (
        <SiteControlNotice title="Browsing tools are temporarily disabled" detail="A DOGEUB administrator has paused browsing tools inside DOGEUB. Other browser apps on your device are not affected." />
      ) : <Routing pages={pages} />}
      {siteStatus.serverMuted && !siteStatus.banned && <div role="status" className="fixed bottom-4 left-1/2 z-[2147482000] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-amber-200/20 bg-slate-950/95 px-4 py-3 text-center text-sm text-amber-100 shadow-2xl">Server-wide mute is active. Sending messages is temporarily disabled for non-admins.</div>}
      <AdminAnnouncement />
      <PortalTransitions />
      <Taskbar />
      <DogeAssistant />
      <AdminPanelWindow />
      <DogeHub />
      <DogeNexus />
      <EmojiWidgets />
      <InteractiveDots />
      <QuickLauncher />
      <SectionSwitcher />
      <HolographicTabSwitcher />
      <NotificationCenter />
      <HoloSpace />
      <PetBuddy />
      <LockScreen />
      {popunderEnabled && !adKeyPassed ? <Popunder /> : null}
      <style>{backgroundStyle}</style>
    </>
  );
});

ThemedApp.displayName = 'ThemedApp';

const App = () => (
  <OptionsProvider>
    <ThemedApp />
  </OptionsProvider>
);

export default App;
