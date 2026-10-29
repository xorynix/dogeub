import { WebSocketServer } from 'ws';
import { mouse, keyboard, screen, Point, Button, Key } from '@nut-tree-fork/nut-js';

const PORT = Number(process.env.DOGEUB_CONTROL_PORT || 8765);
const DEFAULT_ALLOWED_ORIGINS = [
  'https://schoolstudy.2122pspblore.workers.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...String(process.env.DOGEUB_ALLOWED_ORIGINS || '').split(',').map(normalizeOrigin).filter(Boolean),
]);

const keyMap = {
  Alt: Key.LeftAlt, Control: Key.LeftControl, Shift: Key.LeftShift, Meta: Key.LeftSuper,
  Enter: Key.Enter, Escape: Key.Escape, Backspace: Key.Backspace, Tab: Key.Tab,
  Delete: Key.Delete, Insert: Key.Insert, Home: Key.Home, End: Key.End,
  PageUp: Key.PageUp, PageDown: Key.PageDown, ArrowUp: Key.Up, ArrowDown: Key.Down,
  ArrowLeft: Key.Left, ArrowRight: Key.Right, Space: Key.Space,
  F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4, F5: Key.F5, F6: Key.F6,
  F7: Key.F7, F8: Key.F8, F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12
};
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') keyMap[letter] = Key[letter];
for (const letter of 'abcdefghijklmnopqrstuvwxyz') keyMap[letter] = Key[letter.toUpperCase()];
for (const digit of '0123456789') keyMap[digit] = Key[digit];

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });
let armed = false;
const heldKeys = new Map();
const heldButtons = new Set();

function send(ws, type, extra = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...extra }));
}

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  send(ws, 'agent-ready', { armed: false });

  ws.on('message', async raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    try {
      if (message.type === 'arm') {
        // Local confirmation is required every time the agent connects.
        armed = message.confirmed === true;
        send(ws, 'agent-state', { armed });
        return;
      }
      if (message.type === 'disarm') {
        armed = false;
        for (const key of heldKeys.values()) await keyboard.releaseKey(key).catch(() => {});
        heldKeys.clear();
        for (const button of heldButtons) await mouse.releaseButton(button).catch(() => {});
        heldButtons.clear();
        send(ws, 'agent-state', { armed: false });
        return;
      }
      if (!armed) return;

      if (message.type === 'pointer') {
        const x = Math.max(0, Math.min(1, Number(message.x)));
        const y = Math.max(0, Math.min(1, Number(message.y)));
        const width = await screen.width();
        const height = await screen.height();
        await mouse.setPosition(new Point(Math.round(x * (width - 1)), Math.round(y * (height - 1))));
      } else if (message.type === 'click' || message.type === 'mouse-down' || message.type === 'mouse-up') {
        const button = message.button === 'right' ? Button.RIGHT : message.button === 'middle' ? Button.MIDDLE : Button.LEFT;
        if (message.type === 'click') await mouse.click(button);
        else if (message.type === 'mouse-down') { heldButtons.add(button); await mouse.pressButton(button); }
        else if (heldButtons.has(button)) { await mouse.releaseButton(button); heldButtons.delete(button); }
      } else if (message.type === 'scroll') {
        const amount = Math.max(-10, Math.min(10, Number(message.amount) || 0));
        if (amount > 0) await mouse.scrollDown(amount);
        else if (amount < 0) await mouse.scrollUp(Math.abs(amount));
      } else if (message.type === 'key-down') {
        const key = keyMap[String(message.key)];
        if (key && !heldKeys.has(String(message.key))) {
          heldKeys.set(String(message.key), key);
          await keyboard.pressKey(key);
        }
      } else if (message.type === 'key-up') {
        const key = heldKeys.get(String(message.key));
        if (key) {
          await keyboard.releaseKey(key);
          heldKeys.delete(String(message.key));
        }
      } else if (message.type === 'type-text' && typeof message.text === 'string') {
        await keyboard.type(message.text.slice(0, 2000));
      }
    } catch (error) {
      send(ws, 'agent-error', { message: String(error?.message || 'Input operation failed').slice(0, 180) });
    }
  });

  ws.on('close', async () => {
    armed = false;
    for (const key of heldKeys.values()) await keyboard.releaseKey(key).catch(() => {});
    heldKeys.clear();
    for (const button of heldButtons) await mouse.releaseButton(button).catch(() => {});
    heldButtons.clear();
  });
});

wss.on('listening', () => console.log(`DogeUB Remote Desktop host agent listening on 127.0.0.1:${PORT}`));
wss.on('error', error => {
  console.error('Could not start DogeUB host agent:', error.message);
  process.exitCode = 1;
});
