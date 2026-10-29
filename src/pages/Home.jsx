import Nav from '../layouts/Nav';
import { Link } from 'react-router-dom';
import Search from '../components/SearchContainer';
import Footer from '../components/Footer';
import Widgets from '../components/Widgets';
import PopularActivityWidgets from '../components/PopularActivityWidgets';
import DesktopPerformanceWidget from '../components/DesktopPerformanceWidget';
import {
  ArrowUpRight,
  BookOpen,
  Gamepad2,
  Handshake,
  Monitor,
  SlidersHorizontal,
  Toolbox,
  Users,
} from 'lucide-react';
import { createElement, memo } from 'react';

const shortcuts = [
  { to: '/toolbox', icon: Toolbox, title: 'Toolbox', subtitle: 'Everyday utilities', color: 'text-amber-200 bg-amber-300/10' },
  { to: '/pc-center', icon: Monitor, title: 'PC Center', subtitle: 'Device and parts', color: 'text-sky-200 bg-sky-300/10' },
  { to: '/game-library', icon: Gamepad2, title: 'Game Library', subtitle: 'Your favorites', color: 'text-violet-200 bg-violet-300/10' },
  { to: '/student-center', icon: BookOpen, title: 'Student Center', subtitle: 'Tasks and revision', color: 'text-emerald-200 bg-emerald-300/10' },
  { to: '/social', icon: Users, title: 'Social Center', subtitle: 'Friends and profile', color: 'text-pink-200 bg-pink-300/10' },
  { to: '/remote-desktop', icon: Monitor, title: 'Remote Desktop', subtitle: 'Screen sharing', color: 'text-cyan-200 bg-cyan-300/10' },
  { to: '/collaboration-center', icon: Handshake, title: 'Collaboration Center', subtitle: 'Team workspaces', color: 'text-orange-200 bg-orange-300/10' },
  { to: '/dashboard', icon: SlidersHorizontal, title: 'Dashboard Studio', subtitle: 'Make it yours', color: 'text-indigo-200 bg-indigo-300/10' },
];

const Home = memo(() => {
  return (
    <>
      <Nav />
      <main className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-7 lg:px-10">
        <section className="pt-5 sm:pt-8">
          <Search cls="relative z-10 flex w-full flex-col items-center px-0 py-4 sm:py-6" />
        </section>

        <section className="mt-5 sm:mt-8" aria-labelledby="home-tools-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">DOGEUB Studio</p>
              <h1 id="home-tools-title" className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">A little of everything, in one place.</h1>
              <p className="mt-1 text-sm text-slate-400">Pick up where you left off or open something new.</p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              Customize dashboard <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {shortcuts.map(({ to, icon, title, subtitle, color }) => (
              <Link key={to} to={to} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.09] bg-slate-950/45 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-slate-900/75 hover:shadow-lg hover:shadow-cyan-950/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}>{createElement(icon, { size: 19, strokeWidth: 1.8, 'aria-hidden': true })}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">{subtitle}</span>
                </span>
                <ArrowUpRight size={14} className="shrink-0 text-white/25 transition group-hover:text-cyan-200" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-7 grid w-full grid-cols-1 items-start gap-3 sm:mt-9 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,1.6fr)_minmax(0,1fr)] lg:gap-4">
          <div className="min-w-0 lg:order-1"><PopularActivityWidgets only="games" /></div>
          <div className="min-w-0 lg:order-2"><Widgets cls="mt-0" /></div>
          <div className="min-w-0 lg:order-3"><PopularActivityWidgets only="sites" /></div>
        </section>
        <DesktopPerformanceWidget />
      </main>
      <Footer />
    </>
  );
});

Home.displayName = 'Home';
export default Home;
