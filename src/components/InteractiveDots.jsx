import { useEffect, useRef } from 'react';
import { useOptions } from '../utils/optionsContext';

const SPACING = 24;
const SNAP_RADIUS = 10;

function getPoint(x, y) {
  const col = Math.round((x - SPACING / 2) / SPACING);
  const row = Math.round((y - SPACING / 2) / SPACING);
  const point = { x: SPACING / 2 + col * SPACING, y: SPACING / 2 + row * SPACING };
  return Math.hypot(point.x - x, point.y - y) <= SNAP_RADIUS ? point : null;
}

export default function InteractiveDots() {
  const canvasRef = useRef(null);
  const { options } = useOptions();
  const enabled = options.bgDesign === 'dots' || options.bgDesign === 'Dots';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let points = [];
    let sparks = [];
    let resizeFrame = 0;
    let animationFrame = 0;

    const paint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (points.length > 1) {
        const gradient = ctx.createLinearGradient(
          points[0].x, points[0].y,
          points[points.length - 1].x, points[points.length - 1].y,
        );
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.95)');
        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 1)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 1)');
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.95)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      sparks = sparks.filter((spark) => spark.life > 0);
      sparks.forEach((spark) => {
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 1.2 + spark.life * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 132, 252, ' + spark.life + ')';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.95)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        spark.life -= 0.035;
      });

      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.98)';
        ctx.shadowColor = 'rgba(168, 85, 247, 0.95)';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    };

    const isInteractive = (target) =>
      target instanceof Element &&
      Boolean(target.closest('a, button, input, textarea, select, [role="button"], [contenteditable="true"]'));

    const eventPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return getPoint(event.clientX - rect.left, event.clientY - rect.top);
    };

    const onMove = (event) => {
      // Free-draw by moving over the dots; no mouse button or click state needed.
      if (isInteractive(event.target)) return;
      const point = eventPoint(event);
      if (!point) return;
      const last = points[points.length - 1];
      if (last && last.x === point.x && last.y === point.y) return;
      if (last && Math.hypot(last.x - point.x, last.y - point.y) > SPACING * 1.6) return;
      points.push(point);
      sparks.push({ x: point.x, y: point.y, life: 1 });
      paint();
    };

    const clear = () => { points = []; sparks = []; paint(); };
    const onKeyDown = (event) => { if (event.key === 'Escape') clear(); };
    const scheduleResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(resize);
    };
    const animate = () => {
      if (sparks.length) paint();
      animationFrame = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', scheduleResize);
    document.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleResize);
      document.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-[1] pointer-events-none" />;
}
