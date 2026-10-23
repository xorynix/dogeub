import Nav from '../layouts/Nav';
import { Link } from 'react-router-dom';
import Search from '../components/SearchContainer';
import Footer from '../components/Footer';
import Widgets from '../components/Widgets';
import PopularActivityWidgets from '../components/PopularActivityWidgets';
import DesktopPerformanceWidget from '../components/DesktopPerformanceWidget';
import { memo } from 'react';

const Home = memo(() => {
  return (
    <>
      <Nav />
      <section className="relative z-10 w-full px-4 pt-5 sm:px-8 lg:px-12">
        <Search cls="relative z-10 flex w-full flex-col items-center px-0 py-4" />
      </section>
      <section className="mx-auto mt-2 w-full max-w-7xl px-4 sm:px-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">DOGEUB Studio</p><h2 className="mt-1 text-lg font-semibold text-white">Your tools, all in one place</h2></div><Link to="/dashboard" className="text-xs font-semibold text-cyan-200 hover:text-white">Customize dashboard ↗</Link></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {[{to:'/toolbox',icon:'🧰',title:'Toolbox',sub:'Everyday utilities'},{to:'/pc-center',icon:'🖥️',title:'PC Center',sub:'Device & parts'},{to:'/game-library',icon:'🎮',title:'Game Library',sub:'Your favorites'},{to:'/student-center',icon:'📚',title:'Student Center',sub:'Tasks & revision'},{to:'/social',icon:'👥',title:'Social Center',sub:'Friends & profile'},{to:'/remote-desktop',icon:'🖥️',title:'Remote Desktop',sub:'Screen sharing'},{to:'/collaboration-center',icon:'🤝',title:'Collaboration Center',sub:'Team workspaces'},{to:'/dashboard',icon:'⚙️',title:'Dashboard 2.0',sub:'Make it yours'}].map((item) => <Link key={item.to} to={item.to} className="group rounded-2xl border border-white/10 bg-slate-950/45 p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"><span className="text-lg">{item.icon}</span><span className="mt-2 block text-sm font-semibold text-white">{item.title}</span><span className="mt-1 block text-[11px] text-slate-400">{item.sub}</span></Link>)}
        </div>
      </section>
      <div className="mx-auto mt-4 grid w-full max-w-7xl grid-cols-1 items-start gap-4 px-4 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,2fr)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 lg:order-1"><PopularActivityWidgets only="games" /></div>
        <div className="order-1 min-w-0 lg:order-2"><Widgets cls="mt-0" /></div>
        <div className="order-3 min-w-0"><PopularActivityWidgets only="sites" /></div>
      </div>
      <div className="mx-auto mt-5 w-full max-w-7xl px-4">
        <DesktopPerformanceWidget />
      </div>
      <Footer />
    </>
  );
});

Home.displayName = 'Home';
export default Home;
