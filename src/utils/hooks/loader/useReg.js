import { useEffect } from 'react';
import { BareMuxConnection } from 'bare-mux-fork';
import { useOptions } from '/src/utils/optionsContext';
import { makecodec } from './of';
import { resolveWispServer } from './wispServer';

export default function useReg() {
  const { options } = useOptions();
  const sws = [
    { path: new URL('/sw.js', location.origin).href, scope: new URL('/portal/k12/', location.origin).href },
    { path: new URL('/s_sw.js', location.origin).href, scope: new URL('/ham/', location.origin).href }
  ];

  useEffect(() => {
    const init = async () => {
      if (!window.scr) {
        const script = document.createElement('script');
        script.src = '/eggs/scramjet.all.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const { ScramjetController } = $scramjetLoadController();

      const hamPrefix = '/ham/';
      const eggsPath = '/eggs/';

      window.scr = new ScramjetController({
        prefix: hamPrefix,
        files: {
          wasm: eggsPath + 'scramjet.wasm.wasm',
          all: eggsPath + 'scramjet.all.js',
          sync: eggsPath + 'scramjet.sync.js',
        },
        flags: { rewriterLogs: false, scramitize: false, cleanErrors: true, sourcemaps: true },
        codec: makecodec()
      });

      window.scr.init();

      for (const sw of sws) {
        try {
          await navigator.serviceWorker.register(
            sw.path,
            sw.scope ? { scope: sw.scope } : undefined,
          );
        } catch (err) {
          console.warn(`SW reg err (${sw.path}):`, err);
        }
      }

      const baremuxPath = new URL('/baremux/worker.js', location.origin).href;
      const connection = new BareMuxConnection(baremuxPath);

      const libcurlPath = '/libcurl/index.mjs';
      const wisp = resolveWispServer(options.wServer);
      await connection.setTransport(libcurlPath, [
        {
          wisp: wisp,
        },
      ]);
    };

    init();
  }, [options.wServer]);
}
