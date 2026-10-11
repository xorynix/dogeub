// Runtime tweaks to the apps list (the list itself is downloaded at build time).
// Hidden: matched by appName OR by the app's hostname. Extra: added if no app with that name exists.
const HIDDEN_NAMES = new Set(['fmhy.net', 'movies/tv', 'google']);
const HIDDEN_HOSTS = new Set(['fmhy.net', 'www.fmhy.net', 'google.com', 'www.google.com', 'cineby.gd', 'www.cineby.gd']);

const EXTRA_APPS = [
  {
    appName: 'Gemini AI',
    desc: "Google's AI assistant for questions, writing and ideas.",
    icon: 'https://gemini.google.com/favicon.ico',
    url: 'https://gemini.google.com',
    disabled: false,
  },
  {
    appName: 'YouTube',
    desc: 'Watch and share videos.',
    icon: 'https://www.youtube.com/favicon.ico',
    url: 'https://www.youtube.com',
    disabled: false,
  },
];

const nameOf = (a) => String(a?.appName ?? '').trim().toLowerCase();
const hostOf = (a) => {
  try {
    return new URL(a?.url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

export function adjustApps(list) {
  const kept = (Array.isArray(list) ? list : []).filter(
    (a) => !HIDDEN_NAMES.has(nameOf(a)) && !HIDDEN_HOSTS.has(hostOf(a)),
  );
  const have = new Set(kept.map(nameOf));
  return [...kept, ...EXTRA_APPS.filter((a) => !have.has(nameOf(a)))];
}
