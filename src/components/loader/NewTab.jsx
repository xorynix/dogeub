import Search from '../SearchContainer';
import QuickLinks from '../QuickLinks';
import Logo from '../Logo';
import Widgets from '../Widgets';

import { process } from '/src/utils/hooks/loader/utils';

const NewTab = ({ id, updateFn, options = {} }) => {
  const navigating = {
    id: id,
    go: updateFn,
    process: (input) => process(input, false, options.prType || 'auto', options.engine || undefined),
  };
  return (
    <div className="w-full min-h-full flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="flex justify-center w-full">
          <Logo options="w-[15.8rem] h-30 mr-5 mb-2" />
        </div>
        <Search nav={false} logo={false} cls="w-full -mt-3 relative z-50" navigating={navigating} />
        <Widgets cls="mt-6" />
        <a
          href="https://studylive.up.railway.app/"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-blue-300/25 bg-[#0b1f4d] px-6 py-4 font-sans text-base font-semibold tracking-wide text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:bg-[#123574] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-400/60"
          aria-label="Go to StudyLive home page"
        >
          Open StudyLive Home
          <span className="ml-3 text-lg" aria-hidden="true">→</span>
        </a>
        <QuickLinks cls="w-full mt-6" nav={false} navigating={navigating} />
      </div>
    </div>
  );
};

export default NewTab;
