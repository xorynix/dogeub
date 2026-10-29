import { defineConfig, normalizePath } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { logging, server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createBareServer } from '@tomphttp/bare-server-node';
import { bareModulePath } from '@mercuryworkshop/bare-as-module3';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { baremuxPath } from 'bare-mux-fork/node';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import dotenv from 'dotenv';

dotenv.config();
const useBare = process.env.BARE === 'true';

const __dirname = dirname(fileURLToPath(import.meta.url));
logging.set_level(logging.NONE);
let bare;

// Tiles to hide from the remote apps list (matched by exact appName, case-insensitive).
const HIDDEN_APPS = new Set(['fmhy.net', 'movies/tv', 'google']);

// Tiles added on top of the remote apps list (skipped if an app with the same name already exists).
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

function removeHiddenApps(data) {
  const name = (a) => String(a?.appName ?? '').trim().toLowerCase();
  const keep = (a) => !HIDDEN_APPS.has(name(a));
  for (const key of ['apps', 'default']) {
    if (Array.isArray(data?.[key])) data[key] = data[key].filter(keep);
  }
  if (Array.isArray(data?.apps)) {
    const have = new Set(data.apps.map(name));
    data.apps.push(...EXTRA_APPS.filter((a) => !have.has(name(a))));
  }
  return data;
}

async function remoteApps(urls =['https://ci.baylib.top/apps.json?t=' + Date.now()]) {
  const list = Array.isArray(urls) ? urls : [urls];
  let lastErr;

  for (const u of list) {
    try {
      const res = await fetch(u, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`apps.json ${res.status}`);
      }

      return JSON.stringify(removeHiddenApps(await res.json()));
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('apps.json unavailable');
}

Object.assign(wisp.options, {
  dns_method: 'resolve',
  dns_servers: ['1.1.1.3', '1.0.0.3'],
  dns_result_order: 'ipv4first',
});

const routeRequest = (req, resOrSocket, head) => {
  if (req.url?.startsWith('/wisp/')) return wisp.routeRequest(req, resOrSocket, head);
  if (bare.shouldRoute(req))
    return head ? bare.routeUpgrade(req, resOrSocket, head) : bare.routeRequest(req, resOrSocket);
};

const obf = {
  enable: true,
  autoExcludeNodeModules: true,
  threadPool: false,
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'mangled',
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: [],
    stringArrayCallsTransform: false,
    stringArrayThreshold: 0.5,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    ignoreImports: true,
  },
};

export default defineConfig(({ command }) => {
  const environment = command === 'serve' ? 'dev' : 'stable';

  return {
    base: '/',
    plugins: [
      react(),
      vitePluginBundleObfuscator(obf),
      viteStaticCopy({
        targets: [
          { src: [normalizePath(resolve(libcurlPath, '*'))], dest: 'libcurl' },
          { src: [normalizePath(resolve(baremuxPath, '*'))], dest: 'baremux' },
          { src: [normalizePath(resolve(scramjetPath, '*'))], dest: 'eggs' },
          useBare && { src: [normalizePath(resolve(bareModulePath, '*'))], dest: 'baremod' },
          {
            src: [
              normalizePath(resolve(uvPath, 'uv.handler.js')),
              normalizePath(resolve(uvPath, 'uv.client.js')),
              normalizePath(resolve(uvPath, 'uv.bundle.js')),
              normalizePath(resolve(uvPath, 'uv.sw.js')),
            ],
            dest: 'portal',
          },
        ].filter(Boolean),
      }),
      {
        name: 'server',
        apply: 'serve',
        configureServer(server) {
          bare = createBareServer('/seal/');
          server.httpServer?.on('upgrade', (req, sock, head) => routeRequest(req, sock, head));
          server.middlewares.use((req, res, next) => routeRequest(req, res) || next());
        },
      },
      {
        name: 'search',
        apply: 'serve',
        configureServer(s) {
          s.middlewares.use('/return', async (req, res) => {
            const q = new URL(req.url, 'http://x').searchParams.get('q');
            try {
              const r = q && (await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(r ? await r.json() : { error: 'query parameter?' }));
            } catch {
              res.end(JSON.stringify({ error: 'request failed' }));
            }
          });
        },
      },
      {
        name: 'redirect',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/ds') {
              res.writeHead(302, { Location: 'https://discord.gg/ZBef7HnAeg' });
              res.end();
            } else {
              next();
            }
          });
        },
      },
      {
        name: 'remote-apps-json',
        apply: 'build',
        async load(id) {
          const cleanId = normalizePath(id).split('?')[0];

          if (!cleanId.endsWith('/src/data/apps.json')) {
            return null;
          }

          return remoteApps();
        },
      },

    ].filter(Boolean),
    build: {
      target: 'es2022',
      reportCompressedSize: false,
      esbuild: {
        legalComments: 'none',
        treeShaking: true,
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: '[hash].js',
          chunkFileNames: 'chunks/[name].[hash].js',
          assetFileNames: 'assets/[hash].[ext]',
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return;
            const m = id.split('node_modules/')[1];
            const pkg = m.startsWith('@') ? m.split('/').slice(0, 2).join('/') : m.split('/')[0];
            if (/react-router|react-dom|react\b/.test(pkg)) return 'react';
            if (/^@mui\//.test(pkg) || /^@emotion\//.test(pkg)) return 'mui';
            if (/lucide/.test(pkg)) return 'icons';
            if (/react-ga4/.test(pkg)) return 'analytics';
            if (/nprogress/.test(pkg)) return 'progress';
            if (/^(docx|dompurify|exceljs|mammoth|pptxgenjs|jszip|archiver|dayjs|fast-csv|readable-stream|saxes|tmp|unzipper|uuid|hash\.js|nanoid|@xmldom\/xmldom|argparse|base64-js|dingbat-to-unicode|lop|underscore|xmlbuilder|image-size)$/.test(pkg)) return 'office-libraries';
            return 'vendor';
          },
        },
        treeshake: {
          moduleSideEffects: 'no-external',
        },
      },
      minify: 'esbuild',
      sourcemap: false,
    },
    css: {
      modules: {
        generateScopedName: () =>
          String.fromCharCode(97 + Math.floor(Math.random() * 17)) +
          Math.random().toString(36).substring(2, 8),
      },
    },
    server: {
      proxy: {
        '/api/messages': {
          target: process.env.DOGEUB_API_PROXY || 'http://localhost:2345',
          changeOrigin: true,
        },
        '/assets/img': {
          target: 'https://dogeub-assets.pages.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/assets\/img/, '/img'),
        },
        '/assets-fb': {
          target: 'https://dogeub-assets.pages.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/assets-fb/, '/img/server'),
        },
      },
    },
    define: {
      __ENVIRONMENT__: JSON.stringify(environment),
      POPUNDER_ENABLED: JSON.stringify(process.env.POPUNDER_ENABLED),
      POPUNDER_URL: JSON.stringify(process.env.POPUNDER_URL),
    },
  };
});
