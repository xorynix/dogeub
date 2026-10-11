import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { useOptions } from '/src/utils/optionsContext';

const ANIMALS = {
  cat: { emoji: '🐱', name: 'Mochi the Cat', lines: ['pspsps… you seem pawsome 💗', 'tiny reminder: you are doing great!', 'meow meow. that means hi!', 'I would nap on your keyboard if I could.', 'you deserve a little treat ✨', 'just checking in, hooman 🐾'] },
  dog: { emoji: '🐶', name: 'Biscuit the Dog', lines: ['WOOF! I am happy you are here!', 'you are my favorite human today 🦴', 'tail wagging at maximum speed!', 'remember to stretch your paws too!', 'I brought you an imaginary snack.', 'you got this! *happy dog noises*'] },
  bunny: { emoji: '🐰', name: 'Bunbun the Bunny', lines: ['sending you a teeny bunny hug 🥕', 'hop hop hooray, you are here!', 'you make my little ears wiggle.', 'today is a good day for soft things.', 'boing! that was my happy jump.', 'you are doing bun-believably well!'] },
  fox: { emoji: '🦊', name: 'Pip the Fox', lines: ['sly little reminder: take a breath 🍂', 'you are pretty clever, you know?', 'I found a shiny leaf for you.', 'fox fact: you are doing amazing.', 'heehee… I have a secret: you rock!', 'let us make today a good one.'] },
  bear: { emoji: '🐻', name: 'Honey the Bear', lines: ['sending you a big bear-sized hello!', 'you deserve a cozy little break 🍯', 'big hugs, tiny paws.', 'you are stronger than you think.', 'I saved you an imaginary honey jar.', 'slow and steady, buddy. You got this!'] },
  panda: { emoji: '🐼', name: 'Bamboo the Panda', lines: ['bamboo-lieve in yourself 🎋', 'my schedule today: snack, nap, repeat.', 'you are panda-stically cool!', 'remember to be gentle with yourself.', 'I am rolling by to say hi!', 'tiny paws, big dreams.'] },
  penguin: { emoji: '🐧', name: 'Pebble the Penguin', lines: ['you are ice-solutely awesome!', 'waddle I do without you? 💙', 'sending a chilly little high-five.', 'you make my day less chilly.', 'slide into today with confidence!', 'penguin hugs incoming!'] },
  frog: { emoji: '🐸', name: 'Sprout the Frog', lines: ['hope your day is ribbit-ing!', 'just popping in to say hi 🌱', 'you are toad-ally wonderful!', 'take a little hop break if you need.', 'I believe in you, froggy style.', 'small steps still count!'] },
  duck: { emoji: '🦆', name: 'Waffles the Duck', lines: ['quack! that is duck for you rock.', 'you are egg-cellent 🥚', 'just keep swimming… wait, wrong bird.', 'a little quack of encouragement!', 'you make this pond brighter.', 'waddle we do next?'] },
  capybara: { emoji: '🦫', name: 'Cappy the Capybara', lines: ['no rush, friend. we are chilling.', 'you are doing capy-tastic!', 'calm vibes and imaginary oranges 🍊', 'take things one tiny step at a time.', 'just vibing here with you.', 'you deserve a peaceful moment.'] },
};

const DEFAULT_LINES = ['hi friend! ✨', 'you are doing great!', 'sending you a tiny bit of joy 💗'];

export default function PetBuddy() {
  const { options } = useOptions();
  const [message, setMessage] = useState('');
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [gamingMode, setGamingMode] = useState(() => {
    try { return window.localStorage.getItem('dogeub-gaming-mode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const handleModeChange = (event) => setGamingMode(Boolean(event.detail?.enabled));
    window.addEventListener('dogeub-gaming-mode-change', handleModeChange);
    return () => window.removeEventListener('dogeub-gaming-mode-change', handleModeChange);
  }, []);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animal = ANIMALS[options.petBuddyAnimal] || ANIMALS.cat;

  useEffect(() => {
    if (!options.petBuddyEnabled) return undefined;
    const margin = 12;
    const widgetWidth = Math.min(window.innerWidth * 0.88, 270);
    const widgetHeight = 150;
    const moveToRandomSpot = () => {
      const maxX = Math.max(margin, window.innerWidth - widgetWidth - margin);
      const maxY = Math.max(margin, window.innerHeight - widgetHeight - margin);
      setPosition({
        x: margin + Math.random() * Math.max(0, maxX - margin),
        y: margin + Math.random() * Math.max(0, maxY - margin),
      });
    };
    setPosition({
      x: Math.max(margin, window.innerWidth - widgetWidth - margin),
      y: Math.max(margin, window.innerHeight - widgetHeight - 90),
    });
    const timer = window.setInterval(moveToRandomSpot, 4200);
    window.addEventListener('resize', moveToRandomSpot);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', moveToRandomSpot);
    };
  }, [options.petBuddyEnabled]);

  useEffect(() => {
    if (!options.petBuddyEnabled) return undefined;
    const saySomething = () => {
      const lines = animal.lines || DEFAULT_LINES;
      setMessage((previous) => {
        const choices = lines.filter((line) => line !== previous);
        return choices[Math.floor(Math.random() * choices.length)] || lines[0];
      });
      setBubbleOpen(true);
    };
    saySomething();
    const timer = window.setInterval(saySomething, 16000);
    return () => window.clearInterval(timer);
  }, [options.petBuddyEnabled, options.petBuddyAnimal, animal]);

  if (!options.petBuddyEnabled || gamingMode) return null;

  const sayHi = () => {
    const lines = animal.lines || DEFAULT_LINES;
    setMessage(lines[Math.floor(Math.random() * lines.length)]);
    setBubbleOpen(true);
  };

  return (
    <div
      className="fixed z-[10990] flex max-w-[min(88vw,270px)] flex-col items-end gap-2"
      style={{ left: `${position.x}px`, top: `${position.y}px`, transition: 'left 1.8s ease-in-out, top 1.8s ease-in-out' }}
      aria-label="DogeUB Pet Buddy"
    >
      {bubbleOpen && message && (
        <div className="relative rounded-2xl border border-pink-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-pink-950/10">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-pink-500"><Heart size={11} fill="currentColor" /> {animal.name}</div>
          <p className="pr-3 leading-snug">{message}</p>
          <button onClick={() => setBubbleOpen(false)} aria-label="Close pet message" className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={12} /></button>
          <span className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 border-b border-r border-pink-200/70 bg-white" />
        </div>
      )}
      <button onClick={sayHi} title={'Say hi to ' + animal.name} aria-label={'Say hi to ' + animal.name} className="group flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-pink-100 via-rose-100 to-purple-100 text-[38px] shadow-lg shadow-pink-950/20 transition duration-200 hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-300">
        <span className="transition-transform duration-200 group-hover:rotate-[-8deg]">{animal.emoji}</span>
      </button>
    </div>
  );
}
