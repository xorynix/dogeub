import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Minus, Maximize2, X, LayoutGrid, Monitor } from 'lucide-react';
import './OSWindow.css';

const TITLES = [
  [/^\/$/, 'DOGEUB Desktop'], [/^\/materials/, 'Apps'], [/^\/docs/, 'Games & Resources'],
  [/^\/search/, 'Browser'], [/^\/settings/, 'Settings'], [/^\/recommended/, 'Recommended'],
  [/^\/files/, 'DogeFiler'], [/^\/shortcuts/, 'Keyboard Shortcuts'], [/^\/messages/, 'Doge Messages'],
  [/^\/dashboard/, 'Dashboard Studio'], [/^\/toolbox/, 'Toolbox'], [/^\/pc-center/, 'PC Center'],
  [/^\/game-library/, 'Game Library'], [/^\/student-center/, 'Student Center'], [/^\/social/, 'Social Center'],
  [/^\/remote-desktop/, 'Remote Desktop'], [/^\/collaboration-center/, 'Collaboration Center'],
  [/^\/office\/word/, 'DOGEUB Writer'], [/^\/office\/sheet/, 'DOGEUB Sheets'],
  [/^\/office\/slides/, 'DOGEUB Slides'], [/^\/office/, 'DOGEUB Office'], [/^\/profile/, 'Profile'],
];

const titleFor = (path) => TITLES.find(([pattern]) => pattern.test(path))?.[1] || 'DOGEUB App';
const readLayout = () => {
  try {
    const version = window.localStorage.getItem('dogeub-app-layout-version');
    if (version !== '2') {
      window.localStorage.setItem('dogeub-app-layout', 'desktop');
      window.localStorage.setItem('dogeub-app-layout-version', '2');
      return 'desktop';
    }
    return window.localStorage.getItem('dogeub-app-layout') || 'desktop';
  } catch { return 'desktop'; }
};

function defaultBounds() {
  const width = Math.min(1180, Math.max(420, window.innerWidth - 132));
  const height = Math.min(760, Math.max(300, window.innerHeight - 112));
  const availableWidth = Math.max(0, window.innerWidth - 112);
  return {
    x: Math.max(8, 112 + Math.round((availableWidth - width) / 2)),
    y: 28,
    width: Math.min(width, window.innerWidth - 16),
    height: Math.min(height, window.innerHeight - 82),
  };
}

const MIN_WIDTH = 360;
const MIN_HEIGHT = 260;

export default function OSWindow({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [layout, setLayout] = useState(readLayout);
  const [position, setPosition] = useState(defaultBounds);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const restoreBounds = useRef(null);
  const title = titleFor(location.pathname);

  useEffect(() => {
    const sync = () => {
      try { setLayout(window.localStorage.getItem('dogeub-app-layout') || 'desktop'); }
      catch { setLayout('desktop'); }
    };
    const restore = () => setMinimized(false);
    window.addEventListener('storage', sync);
    window.addEventListener('dogeub-app-layout-change', sync);
    window.addEventListener('dogeub-restore-window', restore);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('dogeub-app-layout-change', sync);
      window.removeEventListener('dogeub-restore-window', restore);
    };
  }, []);

  useEffect(() => {
    setMinimized(false);
    setSnapOpen(false);
  }, [location.pathname]);

  const snap = (kind) => {
    const width = window.innerWidth;
    const height = Math.max(260, window.innerHeight - 70);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    const layouts = {
      left: { x: 8, y: 8, width: Math.max(320, halfW - 12), height: height - 8 },
      right: { x: halfW + 4, y: 8, width: Math.max(320, width - halfW - 12), height: height - 8 },
      topLeft: { x: 8, y: 8, width: Math.max(320, halfW - 12), height: Math.max(220, halfH - 8) },
      topRight: { x: halfW + 4, y: 8, width: Math.max(320, width - halfW - 12), height: Math.max(220, halfH - 8) },
      bottomLeft: { x: 8, y: halfH + 4, width: Math.max(320, halfW - 12), height: Math.max(220, height - halfH - 12) },
      bottomRight: { x: halfW + 4, y: halfH + 4, width: Math.max(320, width - halfW - 12), height: Math.max(220, height - halfH - 12) },
      maximize: { x: 0, y: 0, width, height },
      center: defaultBounds(),
    };
    if (kind === 'maximize' && !maximized) restoreBounds.current = position;
    setPosition(layouts[kind] || layouts.center);
    setMaximized(kind === 'maximize');
    setSnapOpen(false);
  };

  const toggleMaximize = () => {
    if (maximized) {
      setPosition(restoreBounds.current || defaultBounds());
      setMaximized(false);
    } else {
      restoreBounds.current = position;
      setMaximized(true);
      setSnapOpen(false);
    }
  };

  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button, [data-window-no-drag]')) return;
    event.preventDefault();
    const bounds = maximized ? (restoreBounds.current || defaultBounds()) : position;
    if (maximized) {
      setPosition(bounds);
      setMaximized(false);
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const beginResize = (direction, event) => {
    if (event.button !== 0 || maximized) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      pointerId: event.pointerId,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      ...position,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const movePointer = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      const drag = dragRef.current;
      const x = Math.max(0, Math.min(window.innerWidth - 120, drag.x + event.clientX - drag.startX));
      const y = Math.max(0, Math.min(window.innerHeight - 76, drag.y + event.clientY - drag.startY));
      setPosition((current) => ({ ...current, x, y }));
      return;
    }

    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    const direction = resize.direction;
    let { x, y, width, height } = resize;
    const minWidth = Math.min(MIN_WIDTH, window.innerWidth - 16);
    const minHeight = Math.min(MIN_HEIGHT, window.innerHeight - 76);

    if (direction.includes('e')) width = Math.max(minWidth, resize.width + dx);
    if (direction.includes('s')) height = Math.max(minHeight, resize.height + dy);
    if (direction.includes('w')) {
      width = Math.max(minWidth, resize.width - dx);
      x = resize.x + resize.width - width;
    }
    if (direction.includes('n')) {
      height = Math.max(minHeight, resize.height - dy);
      y = resize.y + resize.height - height;
    }

    x = Math.max(0, Math.min(x, window.innerWidth - minWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - 76));
    width = Math.max(minWidth, Math.min(width, window.innerWidth - x));
    height = Math.max(minHeight, Math.min(height, window.innerHeight - 70 - y));
    setPosition({ x, y, width, height });
  };

  const endPointer = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
    setDragging(false);
  };

  const toggleLayout = () => {
    const next = layout === 'taskbar' ? 'desktop' : 'taskbar';
    setLayout(next);
    try { window.localStorage.setItem('dogeub-app-layout', next); } catch {}
    window.dispatchEvent(new CustomEvent('dogeub-app-layout-change', { detail: { layout: next } }));
  };

  if (minimized) {
    return (
      <button
        type="button"
        className="dogeub-window-restore"
        data-window-restore="true"
        onClick={() => setMinimized(false)}
        title={'Restore ' + title}
        aria-label={'Restore ' + title}
      >
        <Monitor size={16} />
        <span>{title}</span>
      </button>
    );
  }

  const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <section
      className={'dogeub-os-window' + (maximized ? ' is-maximized' : '') + (dragging ? ' is-dragging' : '')}
      data-dogeub-os-window="true"
      style={{ left: position.x, top: position.y, width: position.width, height: position.height }}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={endPointer}
    >
      {resizeDirections.map((direction) => (
        <div
          key={direction}
          className={'dogeub-window-resize dogeub-window-resize-' + direction}
          role="separator"
          aria-label={'Resize window ' + direction}
          onPointerDown={(event) => beginResize(direction, event)}
        />
      ))}

      <header
        className="dogeub-window-titlebar"
        onPointerDown={beginDrag}
        onDoubleClick={(event) => {
          if (!event.target.closest('button, [data-window-no-drag]')) toggleMaximize();
        }}
        aria-label={title + ' window title bar'}
      >
        <div className="dogeub-window-traffic" data-window-no-drag="true">
          <button className="dogeub-window-control close" type="button" aria-label="Close window" title="Close" onClick={() => navigate('/')}><X size={8} /></button>
          <button className="dogeub-window-control minimize" type="button" aria-label="Minimize window" title="Minimize" onClick={() => setMinimized(true)}><Minus size={8} /></button>
          <button className="dogeub-window-control maximize" type="button" aria-label={maximized ? 'Restore window size' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={toggleMaximize}><Maximize2 size={8} /></button>
        </div>
        <span className="dogeub-window-title">{title}</span>
        <div className="dogeub-window-actions" data-window-no-drag="true">
          <button type="button" title={layout === 'taskbar' ? 'Switch to desktop app icons' : 'Switch to taskbar app layout'} aria-label="Toggle app layout" onClick={toggleLayout}><Monitor size={14} /></button>
          <div className="dogeub-snap-wrap">
            <button type="button" title="Snap layouts" aria-label="Open snap layouts" aria-expanded={snapOpen} onClick={() => setSnapOpen((value) => !value)}><LayoutGrid size={14} /></button>
            {snapOpen && (
              <div className="dogeub-snap-menu">
                {[['left', 'Left half'], ['right', 'Right half'], ['topLeft', 'Top left'], ['topRight', 'Top right'], ['bottomLeft', 'Bottom left'], ['bottomRight', 'Bottom right'], ['center', 'Centered'], ['maximize', 'Full screen']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => snap(key)}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="dogeub-window-content">{children}</div>
    </section>
  );
}
