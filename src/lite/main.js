import appsData from '../data/apps.json';

const $ = (selector) => document.querySelector(selector);
const gameHost = $('#games');
const tabsHost = $('#tabs');
const notice = $('#notice');
const favoriteKey = 'dogeub-lite-favorites-v1';
let category = 'All';
let query = '';
let favoritesOnly = false;
let installPrompt = null;
let games = [];

const readFavorites = () => {
  try { const value = JSON.parse(localStorage.getItem(favoriteKey) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};
let favorites = new Set(readFavorites());

const flattenCatalog = (data) => {
  const catalog = data?.games && typeof data.games === 'object' ? data.games : {};
  return Object.entries(catalog).flatMap(([group, entries]) =>
    (Array.isArray(entries) ? entries : []).map((entry, index) => ({
      id: String(entry?.id || entry?.appName || (group + '-' + index)),
      name: String(entry?.appName || 'Untitled game'),
      category: String(group),
      description: String(entry?.desc || 'Open this game website.'),
      icon: String(entry?.icon || ''),
      url: Array.isArray(entry?.url) ? String(entry.url[0] || '') : String(entry?.url || ''),
      disabled: entry?.disabled === true,
    }))
  ).filter((game) => game.url && /^https?:\/\//i.test(game.url));
};

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}
function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) && Boolean(parsed.hostname) ? parsed.href : '';
  } catch { return ''; }
}
function saveFavorites() {
  try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); } catch {}
}
function renderTabs() {
  const categories = ['All', ...new Set(games.map((game) => game.category))];
  tabsHost.replaceChildren();
  categories.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'tab' + (item === category ? ' active' : '');
    button.type = 'button';
    button.textContent = item;
    button.setAttribute('aria-pressed', String(item === category));
    button.addEventListener('click', () => { category = item; renderTabs(); renderGames(); });
    tabsHost.append(button);
  });
}
function createGameCard(game) {
  const card = document.createElement('article');
  card.className = 'game';
  const header = document.createElement('div');
  header.className = 'gamehead';
  if (safeUrl(game.icon)) {
    const img = document.createElement('img');
    img.className = 'gameicon';
    img.loading = 'lazy';
    img.alt = '';
    img.src = safeUrl(game.icon);
    img.onerror = () => { img.remove(); const fallback = document.createElement('div'); fallback.className = 'gameicon fallback'; fallback.textContent = '🎮'; header.prepend(fallback); };
    header.append(img);
  } else {
    const icon = document.createElement('div'); icon.className = 'gameicon fallback'; icon.textContent = '🎮'; header.append(icon);
  }
  const titleBox = document.createElement('div');
  titleBox.style.minWidth = '0';
  const title = document.createElement('h3'); title.textContent = game.name;
  const group = document.createElement('div'); group.className = 'cat'; group.textContent = game.category;
  titleBox.append(title, group); header.append(titleBox);
  const description = document.createElement('p'); description.textContent = game.description;
  const footer = document.createElement('div'); footer.className = 'gamefoot';
  const play = document.createElement('button'); play.className = 'play'; play.type = 'button'; play.textContent = game.disabled ? 'Unavailable' : 'Open ↗'; play.disabled = game.disabled;
  play.addEventListener('click', () => { const url = safeUrl(game.url); if (url && !game.disabled) window.open(url, '_blank', 'noopener,noreferrer'); });
  const favorite = document.createElement('button'); favorite.className = 'fav' + (favorites.has(game.id) ? ' on' : ''); favorite.type = 'button'; favorite.setAttribute('aria-label', favorites.has(game.id) ? 'Remove favorite' : 'Add favorite'); favorite.textContent = favorites.has(game.id) ? '♥' : '♡';
  favorite.addEventListener('click', () => { if (favorites.has(game.id)) favorites.delete(game.id); else favorites.add(game.id); saveFavorites(); renderGames(); });
  footer.append(play, favorite); card.append(header, description, footer);
  return card;
}
function renderGames() {
  const normalized = query.toLowerCase().trim();
  const visible = games.filter((game) =>
    (category === 'All' || game.category === category) &&
    (!favoritesOnly || favorites.has(game.id)) &&
    (game.name + ' ' + game.description + ' ' + game.category).toLowerCase().includes(normalized)
  );
  $('#gameCount').textContent = String(games.length);
  gameHost.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = games.length ? 'No games match these filters.' : 'No catalog entries are available yet. Connect once to load the catalog.'; gameHost.append(empty); return;
  }
  const fragment = document.createDocumentFragment();
  visible.forEach((game) => fragment.append(createGameCard(game)));
  gameHost.append(fragment);
}

try {
  games = flattenCatalog(appsData);
  if (!games.length) showNotice('The catalog data was empty in this build. Rebuild while the official DOGEUB catalog source is available.');
} catch {
  games = [];
  showNotice('Could not read the bundled catalog. Connect to the internet and refresh the Lite site.');
}
renderTabs();
renderGames();

$('#search').addEventListener('input', (event) => { query = event.target.value; renderGames(); });
$('#favoritesOnly').addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  $('#favoritesOnly').setAttribute('aria-pressed', String(favoritesOnly));
  $('#favoritesOnly').textContent = favoritesOnly ? '♥ Favorites only' : '♡ Favorites';
  renderGames();
});
$('#refreshBtn').addEventListener('click', () => {
  showNotice('The catalog is bundled into this build. To refresh it, update and redeploy DOGEUB Lite.');
});
document.querySelectorAll('[data-site]').forEach((button) => button.addEventListener('click', () => {
  const url = safeUrl(button.getAttribute('data-site'));
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}));

const chatlog = $('#chatlog');
const chatStatus = $('#chatstatus');
const chatHistory = [];
function addBubble(role, content) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + role;
  bubble.textContent = content;
  chatlog.append(bubble);
  chatlog.scrollTop = chatlog.scrollHeight;
}
$('#chatform').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chatinput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addBubble('user', text);
  chatHistory.push({ role: 'user', content: text });
  while (chatHistory.length > 10) chatHistory.shift();
  chatStatus.textContent = 'Thinking…';
  const send = $('#chatform button[type="submit"]');
  send.disabled = true;
  try {
    const response = await fetch('/api/doge-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Doge AI is not available right now.');
    const reply = String(result.reply || 'I did not get a response. Try again.').slice(0, 1500);
    addBubble('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    while (chatHistory.length > 10) chatHistory.shift();
    chatStatus.textContent = 'Ready';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed.';
    addBubble('assistant', message);
    chatStatus.textContent = 'AI unavailable · Your saved catalog still works offline';
  } finally {
    send.disabled = false;
    input.focus();
  }
});

function updateConnection() {
  const node = $('#connection');
  if (navigator.onLine) { node.textContent = 'Online · AI and game sites available'; node.className = 'online'; }
  else { node.textContent = 'Offline · Cached shell and catalog only'; node.className = 'offline'; }
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('#installBtn').hidden = false;
});
$('#installBtn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  $('#installBtn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/lite/sw.js', { scope: '/lite/' }).then(() => {
      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      }
    }).catch(() => {});
  });
}
