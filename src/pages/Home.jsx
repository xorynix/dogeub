import Nav from '../layouts/Nav';
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
