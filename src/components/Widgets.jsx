import clsx from 'clsx';
import { memo, useEffect, useState } from 'react';
import { useOptions } from '../utils/optionsContext';
import theme from '../styles/theming.module.css';

const TIME_ZONE = 'America/New_York';
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=40.7178&longitude=-74.0431&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/New_York';
const REFRESH_MS = 10 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});
const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const describeWeather = (code) => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

const Clock = memo(function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col justify-center items-center text-center sm:items-start sm:text-left">
      <div className="max-w-full whitespace-nowrap text-2xl font-semibold tabular-nums sm:text-3xl">{timeFormat.format(now)}</div>
      <div className="mt-1 max-w-full text-xs leading-relaxed opacity-70 sm:text-sm">{dateFormat.format(now)}</div>
    </div>
  );
});

const Weather = memo(function Weather() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(WEATHER_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
        const data = await res.json();
        if (!data?.current) throw new Error('Malformed weather response');
        if (!cancelled) {
          setWeather(data.current);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  let body;
  if (weather) {
    body = (
      <>
        <div className="flex max-w-full flex-wrap items-baseline justify-center gap-x-2 gap-y-1 sm:justify-end">
          <span className="text-2xl font-semibold tabular-nums sm:text-3xl">{Math.round(weather.temperature_2m)}°F</span>
          <span className="text-sm opacity-80">{describeWeather(weather.weather_code)}</span>
        </div>
        <div className="mt-1 max-w-full text-xs leading-relaxed opacity-70">
          Feels like {Math.round(weather.apparent_temperature)}°F · Humidity {Math.round(weather.relative_humidity_2m)}% · Wind {Math.round(weather.wind_speed_10m)} mph
        </div>
      </>
    );
  } else if (error) {
    body = <div className="text-sm opacity-70">Weather unavailable</div>;
  } else {
    body = <div className="text-sm opacity-70">Loading weather…</div>;
  }

  return (
    <div className="flex min-w-0 w-full flex-col justify-center items-center text-center sm:items-end sm:text-right">
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Jersey City, NJ</div>
      {body}
    </div>
  );
});

const Widgets = memo(function Widgets({ cls }) {
  const { options } = useOptions();

  return (
    <div className={clsx('w-full min-w-0 flex justify-center', cls || 'mt-[16rem]')}>
      <div
        className={clsx(
          'w-full min-w-0 rounded-[14px] shadow-xl px-4 py-4 sm:px-5 bg-white/5 backdrop-blur',
          'grid grid-cols-1 items-center gap-4 sm:grid-cols-2 sm:gap-6',
          theme[`searchBarColor`],
          theme[`theme-${options.theme || 'default'}`],
        )}
      >
        <Clock />
        <Weather />
      </div>
    </div>
  );
});

Widgets.displayName = 'Widgets';
export default Widgets;
