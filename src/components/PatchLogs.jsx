import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Button } from '@headlessui/react';
import { useOptions } from '/src/utils/optionsContext';

export const PATCH_LOGS_KEY = 'showPatchLogs';

export const isPatchLogsEnabled = () => {
  try {
    return localStorage.getItem(PATCH_LOGS_KEY) !== 'false';
  } catch {
    return true;
  }
};

const PATCH_DATE = '2026-10-11';

const PATCH_LOGS = [
  'Added Notification Center with a cyan glass drawer, unread indicators, mark-all-read and clear-all controls, keyboard toggle (Alt+Shift+N), and browser-local notification storage. Live alerts require an explicit feature integration.',
  'Added HoloSpace with Main, School, Games, and Projects workspaces, remembered last DOGEUB route per workspace, and Ctrl+Alt+Left/Right switching.',
  'Updated the Doge Shortcuts catalog with Notification Center and HoloSpace keyboard controls.',
  'Added resizable Admin Panel windows and changed minimize to hide the existing window without unmounting its content, preserving in-progress state.',
  'Added a Collaboration Center shortcut directly in the Messages sidebar so Global Chat users can jump to team workspaces, project notes, and tasks.',
  'Expanded Remote Desktop with viewer-side mouse movement, click, scroll, and keyboard event relay; added host-side confirmation and emergency disconnect. Full OS input requires the optional local host agent and is not available from browser-only mode.',
  'Added an optional local remote-control host agent with origin checks, explicit arming, and key-release cleanup. The host must run it locally; it is not launched by Railway.',
  'Added Remote Desktop app with consent-based local screen preview, visible sharing status, and a clear note that remote connections require a paired host agent and signaling backend.',
  'Added Collaboration Center with browser-saved project workspaces, editable notes, task tracking, JSON export, and shortcuts to DOGEUB Messages and Social Center. Real-time workspace sync is not enabled yet.',
  'Added DOGEUB OS usernames during first-time setup and linked each OS identity to the same unique username in DOGEUB Messages.',
  'Synced username changes between the OS taskbar profile and DOGEUB Messages so the site no longer labels people as a generic DogeUB user.',
  'Expanded the Admin Panel with a conversation browser that can join group chats or observe direct-message conversations. Private-conversation joins create visible notices, notify participants, and are logged.',
  'Added global announcement broadcasts from the Admin Panel. Broadcasts are pinned and labelled in Global Chat and sent to other accounts in their notification center.',
  'Added admin conversation replies with visible admin labels, moderator notices, refreshed read receipts/unread counts for observed DMs, and protections against deleting administrator access notices.',
  'Added a restricted Admin Panel section to Settings with a code gate, site metrics, account suspension controls, report review, site-wide announcements, registration pause, and an admin audit log.',
  'Protected administrative APIs with the server-side DOGEUB_ADMIN_USERNAMES allowlist. The Settings passcode is a UI gate only and is not used as server authorization.',
  'Added a public announcement banner that displays the current enabled message from the Messages service and can be dismissed per page session.',
  'Added a customizable DOGEUB Studio dashboard with reorderable and hideable widgets, saved shortcuts, sticky notes, and a focus timer.',
  'Added DOGEUB Toolbox utilities: text transformations and counters, JSON formatting, color picking, QR-code generation, and local image resizing.',
  'Added PC Center with browser-reported device details, a CPU/GPU class explorer, and a practical PC health checklist.',
  'Added a Game Library with search, favorites, recently opened games, and user-saved game shortcuts.',
  'Added Student Center with a saved homework planner, focus timer, and editable flashcards.',
  'Added Social Center APIs and UI for friends, friend requests, online/away/offline presence, profile bios/status/banner color, blocking, persistent notifications, and a moderator-only report queue.',
  'Expanded the Messages service with friend/block enforcement and persistent notification events for direct messages and group messages.',
  'Added homescreen widgets: weather and clock (merged in PR #4).',
  'Quick links updated: Discord, GitHub, YouTube, and Gemini AI (PR #5).',
  'Fixed production crash on startup caused by an EACCES error during npm install; start command changed to "node server.js".',
  'Site domain moved to studylive.up.railway.app.',
  'Added a search engine picker to the home search bar: click the engine icon to switch between Bing, DuckDuckGo, Brave, Yahoo, Startpage, Ecosia, and Kagi (PR #12).',
  'Added a Windows-style taskbar across DogeUB with Start menu, app shortcuts, search, clock/date, and quick-settings panel.',
  'Fixed taskbar search so URL-like input is opened as a website instead of treated as a search query.',
  'Improved floating browser windows so their controls stay above the taskbar.',
  'Made homepage quick-link icons draggable and reorderable.',
  'Added custom site-wide wallpaper uploads from the Start menu; uploaded backgrounds persist after refresh.',
  'Improved wallpaper uploads by resizing and compressing large images before saving, with support for images up to 12 MB.',
  'Applied custom wallpapers directly to the page background for more consistent display across DogeUB.',
  'Changed floating-window creation so opening a new floating browser closes/replaces the previous floating browser window.',
  'Changed the Start menu power button to show a confirmation and then switch DogeUB into a shutdown screen; websites cannot reliably close tabs opened normally by a user.',
  'Added a taskbar device-specs panel showing browser-reported CPU core count, approximate memory when exposed, screen resolution, browser, and platform.',
  'Replaced the volume control in Quick Settings with live battery percentage/charging information and browser-reported network status, connection type, estimated downlink, and latency. Availability depends on browser support.',
  'Added snap layouts for floating windows: left/right halves, four corners, and maximize.',
  'Added save and restore controls for floating browser windows; window details are stored in browser local storage and restored on request.',
  'Added Study Sprint to the homepage: a focus/break timer, saved homework checklist, task progress bar, and completed-session counter.',
  'Added a required DogeUB password screen: first-time password creation, sign-in after reload, Ctrl+L page locking, and password-required shutdown/unlock.',
  'Fixed the Study Sprint production build by simplifying its dynamic theme class expression, which was causing a Vite/esbuild syntax error.',
  'Improved password locking: added Alt+L and Ctrl+Shift+L shortcuts plus a dedicated Lock button in the Start menu, since browsers often reserve Ctrl+L for the address bar.',
  'Fixed password input focus and pointer interaction so the password and confirmation fields can receive typing reliably.',
  'Added an on-screen password-box tip: press Esc to focus the password field.',
  'Added a reminder popup after patch logs explaining how to lock DogeUB with Ctrl+L, plus fallback lock options.',
  'Added a live date/time panel and optional location-based current weather beside the password screen.',
  'Resized the Patch Logs window into a compact square with its own scrollable update list.',
  'Added Doge Hub with a control center, local text-file manager and recycle bin, widgets board, multitasking workspace, sticky notes, and theme customization.',
  'Reduced Doge Hub background work while closed and lowered blur effects to improve performance on slower devices.',
  'Added PC file import/export and desktop-pinned icons that can be dragged around or unpinned.',
  'Added a Windows-style image viewer for imported pictures and a top Dynamic Island showing media, battery, and connection status.',
  'Added a toggleable Pet Buddy with 10 animals, cute random messages, and an animal picker in Settings.',
  'Updated Recommended Sites: removed Google and ChatGPT shortcuts, added DuckDuckGo and Brave Search, plus Canva, Photopea, Scratch, and Steam.',
  'Added DOGEUB OS Studio: desktop dashboard, live clock and optional weather, five workspaces and modes, school task planner, gaming launchpad, Doge AI local preview, command terminal, theme presets, world clocks, DogeDrop text sharing, browser diagnostics, achievements, and a boot-screen preview.',
  'Added cinematic DOGEUB OS startup and shutdown previews with an orbital logo, animated starfield, scan light, glowing progress sequence, theme-matched accents, and a dedicated Startup / Shutdown panel.',
  'Added a dedicated Startup / Shutdown shortcut to the Start menu so the cinematic previews open directly without hunting through OS Studio.',
  'Connected the Start menu power confirmation to the cinematic shutdown screen; exiting the preview locks DogeUB and requires sign-in.',
  'Added a Files app (nav bar, Start menu, and taskbar): import screenshots, videos, documents, and other files from your computer by button or drag-and-drop, preview them, organize them into folders, and export one file or a .zip of many. Files are saved in this browser only (PR #42).',
  'Improved Quick Launcher access with Ctrl + K while keeping Alt + Space and Ctrl + Shift + P shortcuts.',
  'Added recent-tool history to Quick Launcher, stored locally in the browser.',
  'Connected game launches to the Most Played Games activity widget so game launches can be counted locally.',
  'Clarified Task Manager limitations: its metrics describe the current DOGEUB page and cannot inspect or end Windows processes.',
  'Added a required five-second post-sign-in notice reminding users that DOGEUB is not responsible for off-task classroom use or cheating with its tools.',
  'Added Doge Messages with global chat, private conversations, unique usernames, custom profile pictures, server-side profanity filtering, reporting, and DogeFiler file attachments.',
  'Doge Messages stores account and chat data on the server. Configure DOGEUB_DATA_DIR to a persistent writable volume in production so accounts, profile pictures, attachments, and history survive redeploys.',
  'Expanded Doge Messages with per-conversation unread badges, read receipts, typing indicators, emoji reactions, replies, group management and invite codes, in-chat search, pins, message editing/deletion, and mute controls.',
  'Added incoming global-chat, DM, and group-chat pop-up notifications, optional desktop alerts, and saved group chats that users can join or create by typing a group name.',
];

const PatchLogs = () => {
  const { options } = useOptions();
  // Wait until the password screen unlocks before opening modal dialogs.
  // Headless UI's modal focus trap can otherwise make the password inputs inert.
  const [open, setOpen] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [showClassroomNotice, setShowClassroomNotice] = useState(false);

  useEffect(() => {
    let noticeTimer;
    const onUnlocked = () => {
      setShowClassroomNotice(true);
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => setShowClassroomNotice(false), 5000);
      if (isPatchLogsEnabled()) setOpen(true);
    };
    window.addEventListener('dogeub-unlocked', onUnlocked);
    return () => { window.removeEventListener('dogeub-unlocked', onUnlocked); window.clearTimeout(noticeTimer); };
  }, []);
  const closePatchLogs = () => {
    setOpen(false);
    setShowLockWarning(true);
  };

  return (
    <>
    {showClassroomNotice && <div role="alertdialog" aria-modal="true" aria-label="Classroom use notice" className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black px-6 text-center text-white"><p className="max-w-3xl text-xl font-semibold leading-relaxed sm:text-3xl">Dogeub is not responsible for any user getting into trouble for going offtask in class and cheating with the tools</p></div>}
    <Dialog open={open} onClose={closePatchLogs} className="fixed inset-0 bg-black/40 z-50">
      <div className="flex justify-center items-center h-full p-4">
        <DialogPanel
          className="flex aspect-square w-[min(88vw,28rem)] max-h-[85vh] flex-col gap-3 overflow-hidden rounded-xl p-5 shadow-2xl"
          style={{ backgroundColor: options.quickModalBgColor || '#252f3e' }}
        >
          <DialogTitle className="shrink-0 text-[1.1rem] font-medium">Patch Logs</DialogTitle>
          <p className="shrink-0 text-[0.7rem] opacity-70">{PATCH_DATE}</p>
          <ul className="min-h-0 flex-1 list-disc space-y-2 overflow-y-auto pl-5 text-[0.85rem]">
            {PATCH_LOGS.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
          <div className="flex shrink-0 justify-end border-t border-white/10 pt-3">
            <Button
              onClick={closePatchLogs}
              className="cursor-pointer duration-150 hover:opacity-80"
            >
              Close
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
    <Dialog open={showLockWarning} onClose={() => setShowLockWarning(false)} className="fixed inset-0 z-[60] bg-black/50">
      <div className="flex h-full items-center justify-center p-4">
        <DialogPanel
          className="w-full max-w-sm rounded-2xl border border-sky-400/30 p-6 shadow-2xl"
          style={{ backgroundColor: options.quickModalBgColor || '#252f3e' }}
        >
          <DialogTitle className="text-lg font-semibold">Quick tip: Lock DogeUB</DialogTitle>
          <p className="mt-3 text-sm leading-6 opacity-90">
            Press <kbd className="rounded border border-white/30 px-1.5 py-0.5 font-semibold">Ctrl + L</kbd> to lock DogeUB and require your password again.
          </p>
          <p className="mt-2 text-xs leading-5 opacity-70">
            Some browsers reserve Ctrl + L for the address bar. If it doesn't work, use Alt + L, Ctrl + Shift + L, or the Lock button in the Start menu.
          </p>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => setShowLockWarning(false)}
              className="cursor-pointer rounded-lg bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
            >
              Got it
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
    </>
  );
};

export default PatchLogs;
