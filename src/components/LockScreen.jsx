import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, ShieldCheck, Eye, EyeOff, CloudSun, MapPin, RefreshCw } from 'lucide-react';

const PASSWORD_KEY = 'dogeub-password-credential-v1';

function toBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 180000, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function readCredential() {
  try {
    const value = window.localStorage.getItem(PASSWORD_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export default function LockScreen() {
  const [credential, setCredential] = useState(readCredential);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(null);
  const [weatherMessage, setWeatherMessage] = useState('Allow location to show local weather.');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadWeather = () => {
    if (!navigator.geolocation) {
      setWeatherMessage('Location is not supported by this browser.');
      return;
    }
    setWeatherLoading(true);
    setWeatherMessage('Getting your local weather…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather request failed');
        const data = await response.json();
        const code = data.current?.weather_code;
        const description = code === 0 ? 'Clear sky'
          : [1, 2].includes(code) ? 'Mostly clear'
          : code === 3 ? 'Cloudy'
          : [45, 48].includes(code) ? 'Foggy'
          : [51, 53, 55, 56, 57].includes(code) ? 'Drizzle'
          : [61, 63, 65, 66, 67, 80, 81, 82].includes(code) ? 'Rain'
          : [71, 73, 75, 77, 85, 86].includes(code) ? 'Snow'
          : [95, 96, 99].includes(code) ? 'Thunderstorms'
          : 'Current conditions';
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          description,
        });
        setWeatherMessage('');
      } catch {
        setWeatherMessage('Weather could not load. Try again.');
      } finally {
        setWeatherLoading(false);
      }
    }, () => {
      setWeatherMessage('Location permission was denied. Allow it to see local weather.');
      setWeatherLoading(false);
    }, { timeout: 10000, maximumAge: 600000 });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => passwordInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [unlocked, credential]);

  useEffect(() => {
    const lock = () => {
      setUnlocked(false);
      setPassword('');
      setConfirmPassword('');
      setError('');
    };
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      // Escape gives users a keyboard shortcut to return focus to the password box.
      if (key === 'escape') {
        // While locked, Escape returns focus to the password field.
        // Once unlocked, let DOGEUB overlays and page controls handle Escape normally.
        if (!unlocked) {
          event.preventDefault();
          event.stopPropagation();
          window.setTimeout(() => passwordInputRef.current?.focus(), 0);
        }
        return;
      }
      // Ctrl+L is reserved by many browsers for the address bar, so provide
      // Alt+L and Ctrl+Shift+L as reliable in-page alternatives too.
      const lockShortcut =
        ((event.ctrlKey || event.metaKey) && key === 'l') ||
        (event.altKey && !event.ctrlKey && !event.metaKey && key === 'l') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'l');
      if (lockShortcut) {
        event.preventDefault();
        event.stopPropagation();
        lock();
      }
    };
    window.addEventListener('dogeub-lock', lock);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('dogeub-lock', lock);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [unlocked]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!password) {
      setError('Enter a password to continue.');
      return;
    }
    if (!credential) {
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Those passwords do not match.');
        return;
      }
    }

    setBusy(true);
    try {
      if (!window.crypto?.subtle) {
        setError('Secure password setup is unavailable in this browser. Open DogeUB over HTTPS and try again.');
        return;
      }
      if (!credential) {
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        const salt = toBase64(saltBytes);
        const hash = await hashPassword(password, salt);
        const saved = { salt, hash, version: 1 };
        window.localStorage.setItem(PASSWORD_KEY, JSON.stringify(saved));
        setCredential(saved);
        setUnlocked(true);
        window.dispatchEvent(new CustomEvent('dogeub-unlocked'));
        setPassword('');
        setConfirmPassword('');
      } else {
        const hash = await hashPassword(password, credential.salt);
        if (hash !== credential.hash) {
          setError('Incorrect password. Try again.');
          return;
        }
        setUnlocked(true);
        window.dispatchEvent(new CustomEvent('dogeub-unlocked'));
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Could not save or verify your password. Check that browser storage is enabled.');
    } finally {
      setBusy(false);
    }
  };

  if (unlocked) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex min-h-screen items-center justify-center overflow-y-auto bg-[#070b14] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 20% 25%, #164e63 0, transparent 42%), radial-gradient(circle at 85% 80%, #312e81 0, transparent 35%)' }} />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-stretch justify-center gap-6 md:flex-row md:items-center md:gap-10">
      <aside className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:max-w-md md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">DogeUB • Welcome</p>
        <p className="mt-5 text-5xl font-light tracking-tight tabular-nums sm:text-6xl">
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className="mt-2 text-base text-white/65">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white/75">
            <CloudSun size={18} className="text-sky-300" /> Local weather
          </div>
          {weather ? (
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-light">{weather.temperature}°C</p>
                <p className="mt-1 text-sm text-white/70">{weather.description}</p>
                <p className="mt-1 text-xs text-white/45">Feels like {weather.feelsLike}°C</p>
              </div>
              <CloudSun size={42} className="text-sky-300" />
            </div>
          ) : (
            <p className="mt-2 text-sm leading-5 text-white/55">{weatherMessage}</p>
          )}
          <button
            type="button"
            onClick={loadWeather}
            disabled={weatherLoading}
            className="mt-4 flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            {weatherLoading ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={14} />}
            {weatherLoading ? 'Loading weather…' : weather ? 'Refresh local weather' : 'Show my local weather'}
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-white/35">Weather uses your location only if you allow browser location access.</p>
      </aside>
      <section role="dialog" aria-modal="true" aria-labelledby="dogeub-lock-title" className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#111827]/95 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
          {credential ? <LockKeyhole size={27} /> : <ShieldCheck size={27} />}
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">DogeUB Security</p>
        <h1 id="dogeub-lock-title" className="mt-2 text-center text-2xl font-bold tracking-tight">
          {credential ? 'Welcome back' : 'Create your password'}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-white/60">
          {credential
            ? 'DogeUB is locked. Sign in with your password to continue.'
            : 'Set a password for this browser before using DogeUB. You will need it whenever DogeUB locks.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <p className="rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs leading-5 text-sky-100/80">
            Can't select the password box? Press <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-semibold text-white">Esc</kbd> to focus it, then type.
          </p>
          <label className="block text-xs font-medium text-white/70" htmlFor="dogeub-password">Password</label>
          <div className="flex items-center rounded-xl border border-white/15 bg-black/25 px-3 focus-within:border-sky-400">
            <input
              id="dogeub-password"
              ref={passwordInputRef}
              autoFocus
              tabIndex={0}
              style={{ pointerEvents: "auto", userSelect: "text", WebkitUserSelect: "text" }}
              autoComplete={credential ? 'current-password' : 'new-password'}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={credential ? 'Enter your password' : 'At least 8 characters'}
              className="relative z-10 min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-white/30"
            />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-1.5 text-white/50 hover:text-white">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {!credential && (
            <>
              <label className="block pt-1 text-xs font-medium text-white/70" htmlFor="dogeub-confirm-password">Confirm password</label>
              <input
                id="dogeub-confirm-password"
                tabIndex={0}
                style={{ pointerEvents: "auto", userSelect: "text", WebkitUserSelect: "text" }}
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Type it again"
                className="relative z-10 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm outline-none placeholder:text-white/30 focus:border-sky-400"
              />
            </>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">{error}</p>}
          <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
            <LockKeyhole size={16} /> {busy ? 'Please wait…' : credential ? 'Sign in to DogeUB' : 'Create password & continue'}
          </button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-white/35">This locks the DogeUB page in this browser. It is not a replacement for server-side account security.</p>
      </section>
      </div>
    </div>
  );
}
