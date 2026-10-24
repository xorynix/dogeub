import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react';

const sites = [
  { name: 'YouTube', description: 'Videos, tutorials, and music', url: 'https://www.youtube.com', color: '#ff3333' },
  { name: 'DuckDuckGo', description: 'Search the web with fewer trackers', url: 'https://duckduckgo.com', color: '#de5833' },
  { name: 'Brave Search', description: 'An alternative web search engine', url: 'https://search.brave.com', color: '#fb542b' },
  { name: 'Gemini', description: 'Google’s AI assistant', url: 'https://gemini.google.com', color: '#8b7cff' },
  { name: 'Discord', description: 'Chat with your communities', url: 'https://discord.com/app', color: '#5865f2' },
  { name: 'GitHub', description: 'Explore and build software', url: 'https://github.com', color: '#8b949e' },
  { name: 'Wikipedia', description: 'Explore knowledge and topics', url: 'https://www.wikipedia.org', color: '#9ca3af' },
  { name: 'Roblox', description: 'Play games and create worlds', url: 'https://www.roblox.com', color: '#e04444' },
  { name: 'Reddit', description: 'Communities for your interests', url: 'https://www.reddit.com', color: '#ff4500' },
  { name: 'Spotify', description: 'Listen to music and podcasts', url: 'https://open.spotify.com', color: '#1db954' },
  { name: 'Microsoft 365', description: 'Word, PowerPoint, and more', url: 'https://www.microsoft365.com', color: '#d83b01' },
  { name: 'Khan Academy', description: 'Learn and practice school subjects', url: 'https://www.khanacademy.org', color: '#14bf96' },
  { name: 'Canva', description: 'Make presentations, posters, and designs', url: 'https://www.canva.com', color: '#7d2ae8' },
  { name: 'Photopea', description: 'Edit images right in your browser', url: 'https://www.photopea.com', color: '#18a497' },
  { name: 'Scratch', description: 'Create games and animations with code blocks', url: 'https://scratch.mit.edu', color: '#f5a623' },
  { name: 'Steam', description: 'Discover PC games', url: 'https://store.steampowered.com', color: '#1b2838' },
];

export default function Recommended() {
  const navigate = useNavigate();
  const openSite = (url) => navigate('/search', { state: { url } });

  return (
    <main className="min-h-screen w-full px-5 py-8 sm:px-10" style={{ color: 'var(--recommended-text, inherit)' }}>
      <div className="mx-auto w-full max-w-6xl">
        <button onClick={() => navigate('/')} className="mb-7 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm opacity-75 transition hover:bg-white/10 hover:opacity-100">
          <ArrowLeft size={16} /> Home
        </button>
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg">
            <Sparkles size={23} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-60">DOGEUB OS</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>Recommended sites</h1>
            <p className="mt-1 text-sm opacity-70">Useful places to start, all in one spot.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <button key={site.name} onClick={() => openSite(site.url)} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/10">
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64`} alt="" className="h-7 w-7 object-contain" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="absolute -z-10" style={{ color: site.color }}>{site.name[0]}</span>
              </div>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{site.name}</span>
                <span className="mt-1 block text-sm opacity-65">{site.description}</span>
              </span>
              <ArrowUpRight size={17} className="shrink-0 opacity-35 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-90" />
            </button>
          ))}
        </div>
        <p className="mt-7 text-xs opacity-50">These are starter recommendations. Choose any card to open the site in DogeUB.</p>
      </div>
    </main>
  );
}
