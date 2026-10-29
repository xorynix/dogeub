import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PortalTransitions() {
  const location = useLocation();
  const routeKey = location.pathname + location.search;
  const lastRoute = useRef(routeKey);
  const timeout = useRef(null);
  const nextId = useRef(0);
  const [portal, setPortal] = useState(null);

  const trigger = useCallback((detail = {}) => {
    const x = typeof detail.x === 'number' && Number.isFinite(detail.x)
      ? detail.x
      : window.innerWidth / 2;
    const y = typeof detail.y === 'number' && Number.isFinite(detail.y)
      ? detail.y
      : window.innerHeight / 2;

    setPortal({ id: ++nextId.current, x, y });
    if (timeout.current) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => setPortal(null), 820);
  }, []);

  useEffect(() => {
    if (lastRoute.current === routeKey) return;
    lastRoute.current = routeKey;
    trigger();
  }, [routeKey, trigger]);

  useEffect(() => {
    const onPortal = (event) => trigger(event.detail || {});
    window.addEventListener('dogeub-portal-transition', onPortal);
    return () => window.removeEventListener('dogeub-portal-transition', onPortal);
  }, [trigger]);

  useEffect(() => () => {
    if (timeout.current) window.clearTimeout(timeout.current);
  }, []);

  if (!portal) return null;

  return (
    <div
      key={portal.id}
      className="dogeub-portal-transition"
      style={{ '--portal-x': portal.x + 'px', '--portal-y': portal.y + 'px' }}
      aria-hidden="true"
    >
      <div key={'outer-' + portal.id} className="dogeub-portal-transition__ring" />
      <div key={'inner-' + portal.id} className="dogeub-portal-transition__ring dogeub-portal-transition__ring--inner" />
      <div key={'core-' + portal.id} className="dogeub-portal-transition__core" />
    </div>
  );
}
