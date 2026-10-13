// rebuild-v2
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_NODE_MODULES = resolve(__dirname, 'node_modules');
const WORKSPACE_NODE_MODULES = resolve(__dirname, '../../node_modules');
const FRONTEND_NODE_MODULES = fs.existsSync(resolve(LOCAL_NODE_MODULES, 'react'))
  ? LOCAL_NODE_MODULES
  : WORKSPACE_NODE_MODULES;
const NODE_MODULES_SEGMENT = '/node_modules/';
const REACT_RUNTIME_PACKAGES = new Set([
  'react',
  'react-dom',
  'scheduler',
  'react-router',
  'react-router-dom',
  '@remix-run/router',
  'use-sync-external-store',
  'react-redux',
]);
const STOREFRONT_BOOTSTRAP_PRELOAD_PATTERN = /(?:^|\/)(?:StorefrontBootstrap|StorefrontShell)-/;
const STOREFRONT_DEFERRED_PRELOAD_CHUNKS = [
  /(?:^|\/)vendor-ui-framework-/,
  /(?:^|\/)vendor-class-utils-/,
  /(?:^|\/)vendor-mui-/,
  /(?:^|\/)vendor-base-ui-/,
  /(?:^|\/)vendor-framer-motion-/,
  /(?:^|\/)vendor-toast-/,
  /(?:^|\/)vendor-datepicker-/,
  /(?:^|\/)vendor-date-utils-/,
  /(?:^|\/)vendor-viz-interactive-/,
  /(?:^|\/)vendor-builder-/,
  /(?:^|\/)vendor-export-/,
  /(?:^|\/)vendor-core-runtime-/,
  /(?:^|\/)route-dashboard-/,
  /(?:^|\/)route-inbox-/,
  /(?:^|\/)route-orders-/,
  /(?:^|\/)route-analytics-/,
  /(?:^|\/)CartDrawer-/,
  /(?:^|\/)CartUpsellHost-/,
  /(?:^|\/)GlobalConversionHost-/,
  /(?:^|\/)StickyAddToCartHost-/,
  /(?:^|\/)marketplaceSampleData-/,
  /(?:^|\/)storefront-theme-presets-/,
  /(?:^|\/)storefront-themes-/,
  /(?:^|\/)apiClient-/,
  /(?:^|\/)tokenManager-/,
  /(?:^|\/)app-i18n-/,
  /(?:^|\/)route-storefront-studio-/,
  /(?:^|\/)app-providers-core-/,
  /(?:^|\/)app-route-guards-/,
  /(?:^|\/)app-tracking-/,
  /(?:^|\/)app-query-client-/,
  /(?:^|\/)vendor-qrcode-/,
  /(?:^|\/)vendor-dompurify-/,
  /(?:^|\/)i18n-en-/,
];
const STOREFRONT_THEME_PRESET_MODULE_PATTERN = /\/src\/storefront\/themes\//;
const STOREFRONT_THEME_DEFAULTS_MODULE_PATTERN =
  /\/src\/storefront\/engine\/themeDefaults\.ts$/;
const STOREFRONT_RUNTIME_THEME_MODULE_PATTERN =
  /\/src\/storefront\/themes\/[^/]+\.json(?:\?url)?$/;
const APP_UI_PRIMITIVES_MODULE_PATTERN =
  /\/src\/(?:components\/ui\/|components\/icons\/brands\.tsx?$|components\/theme-provider\.tsx?$|hooks\/useTheme\.tsx?$|lib\/utils\.ts$)/;

// Tiny admin bootstrap utilities. These are statically imported by the entry
// chunk (main.tsx) and must never be absorbed into a big route chunk — doing
// so forces the whole route chunk (e.g. route-hr, route-dashboard) to be
// executed on every page load.
const APP_BOOTSTRAP_CORE_MODULE_PATTERN =
  /\/src\/(?:bootstrap\/requestTarget|utils\/(?:chunkLoadRecovery|swCacheFlush))\.ts$/;

// i18n ships ~1.8MB of translation JSON. Default Rollup placement merged it
// into the route-storefront chunk (StorefrontShell imports it), so any
// platform page importing i18n dragged the whole storefront chunk in, and the
// admin bootstrap loaded 500KB+ of storefront code just to get i18n. Keep it
// in its own chunk so both apps share the module without sharing a route
// chunk (2026-08-29 storefront first-load fix).
const APP_I18N_MODULE_PATTERN = /\/src\/i18n\/index\.ts$/;

// Shared HTTP layer + tiny cross-app utilities used by EVERY app page and by
// the storefront.
//
// ⚠️ 2026-10-13: every module statically imported by App.tsx must be covered
// by one of the neutral app-* patterns. Uncovered shared modules (then:
// telephonyService, AndroidAppUpdateModal, …) got hoisted by Rollup into
// whichever route chunk also imported them, producing STATIC App →
// route-orders/route-settings edges that downloaded the whole admin graph
// (~3.5MB / 80 files) on every page — public landings included. Guarded by
// scripts/check-entry-chunks.cjs rule 1b.
const APP_SHARED_CORE_MODULE_PATTERN =
  /\/src\/(?:config\/(?:index|environment|appRegistry|templates|themes\/index)|services\/(?:api|apiClient|uploadService|pushNotificationService|appUpdateService|orderSoundPatterns|socketService|telephonyService)|hooks\/(?:useAuthSimple|useDebounce)|utils\/(?:pushNotifications|statusRegistry|tokenManager|imageUrl|urlHelper|storeShortcut|storeUrl|deviceFingerprint|sessionRefresh|textEncoding)|components\/settings\/DefaultPageSelector)\.tsx?$/;

// Shared TanStack Query Client instances
const APP_QUERY_CLIENT_MODULE_PATTERN =
  /\/src\/(?:utils|config)\/queryClient\.ts$/;

// Analytics & Pixel tracking (isolated so it never drags storefront preview into auth/landing)
const APP_TRACKING_MODULE_PATTERN =
  /\/src\/(?:utils\/(?:facebookPixel|platformSiteMetaPixel)|hooks\/usePlatformSiteMetaPixel|services\/platformSiteMetaPixelService)\.ts$/;

// Core context providers and wrappers (isolated from route chunks)
const APP_PROVIDERS_CORE_MODULE_PATTERN =
  /\/src\/(?:providers\/AppProviders|contexts\/(?:CompanyContext|TimerContext|VisualThemeContext)|templates\/Template(?:Provider|ComponentRegistry|Slot)|components\/ErrorBoundary)\.tsx?$/;

// Route guards and post-auth navigation utilities (isolated from page chunks)
const APP_ROUTE_GUARDS_MODULE_PATTERN =
  /\/src\/(?:components\/protection\/(?:CompanyProtectedRoute|AppAccessRoute|AccessDenied)|components\/routing\/DefaultPageRedirect|components\/PerformanceOptimizer|components\/common\/(?:PageSkeleton|Skeleton|ErrorBoundary)|components\/mobile\/AndroidAppUpdateModal|utils\/(?:merchantAccess|postAuthRouting|routeAccess))\.tsx?$/;

// Shared business-page shell components (BusinessPageShell, BusinessSurface,
// BusinessFilters, BusinessMetrics).
const APP_BUSINESS_SHELL_MODULE_PATTERN = /\/src\/components\/business\//;

const shouldFilterStorefrontPreloads = (
  filename: string,
  deps: string[] = [],
): boolean =>
  STOREFRONT_BOOTSTRAP_PRELOAD_PATTERN.test(filename.replace(/\\/g, '/')) ||
  deps.some((dep) =>
    STOREFRONT_BOOTSTRAP_PRELOAD_PATTERN.test(dep.replace(/\\/g, '/')),
  );

const filterStorefrontDeferredPreloads = (deps: string[]): string[] =>
  deps.filter((dep) => {
    const normalizedDep = dep.replace(/\\/g, '/');
    return !STOREFRONT_DEFERRED_PRELOAD_CHUNKS.some((pattern) =>
      pattern.test(normalizedDep),
    );
  });

const filterLazyRoutePreloads = (deps: string[]): string[] =>
  deps.filter((dep) => {
    const normalizedDep = dep.replace(/\\/g, '/');
    const basename = normalizedDep.split('/').pop() || '';
    // Never preload storefront or route chunks during startup.
    // All route chunks are loaded dynamically on demand when navigating.
    if (/^(?:route-|storefront-)[^/]+\.js$/.test(basename)) {
      return false;
    }
    return true;
  });

const getPackageName = (normalizedId: string): string | null => {
  const nodeModulesIndex = normalizedId.lastIndexOf(NODE_MODULES_SEGMENT);

  if (nodeModulesIndex === -1) {
    return null;
  }

  const packagePath = normalizedId
    .slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length)
    .split('/');

  if (packagePath[0]?.startsWith('@') && packagePath[1]) {
    return `${packagePath[0]}/${packagePath[1]}`;
  }

  return packagePath[0] || null;
};

const getVendorChunkName = (normalizedId: string): string | undefined => {
  if (STOREFRONT_THEME_DEFAULTS_MODULE_PATTERN.test(normalizedId)) {
    return 'storefront-theme-runtime';
  }

  if (STOREFRONT_RUNTIME_THEME_MODULE_PATTERN.test(normalizedId)) {
    return undefined;
  }

  if (STOREFRONT_THEME_PRESET_MODULE_PATTERN.test(normalizedId)) {
    return 'storefront-theme-presets';
  }

  if (!normalizedId.includes(NODE_MODULES_SEGMENT)) {
    return undefined;
  }

  const packageName = getPackageName(normalizedId);

  if (!packageName) {
    return undefined;
  }

  if (
    normalizedId.includes('/recharts/') ||
    normalizedId.includes('/chart.js/') ||
    normalizedId.includes('/react-chartjs-2/') ||
    normalizedId.includes('/emoji-picker-react/') ||
    normalizedId.includes('/react-select/')
  ) {
    return 'vendor-viz-interactive';
  }

  if (
    normalizedId.includes('/@craftjs/') ||
    normalizedId.includes('/@dnd-kit/')
  ) {
    return 'vendor-builder';
  }

  if (normalizedId.includes('/react-datepicker/')) {
    return 'vendor-datepicker';
  }

  if (normalizedId.includes('/date-fns/')) {
    return 'vendor-date-utils';
  }

  if (
    packageName.startsWith('@tanstack/') ||
    packageName === 'axios' ||
    packageName === 'zustand' ||
    packageName === 'idb-keyval'
  ) {
    return 'vendor-data-utils';
  }

  if (
    normalizedId.includes('/jspdf/') ||
    normalizedId.includes('/jspdf-autotable/') ||
    normalizedId.includes('/xlsx/')
  ) {
    return 'vendor-export';
  }

  if (
    packageName === 'i18next' ||
    packageName === 'react-i18next' ||
    packageName === 'i18next-browser-languagedetector'
  ) {
    return 'vendor-core-runtime';
  }

  if (REACT_RUNTIME_PACKAGES.has(packageName)) {
    return 'vendor-react';
  }

  // Isolate very heavy animation libraries
  if (packageName === 'framer-motion' || normalizedId.includes('/framer-motion/')) {
    return 'vendor-framer-motion';
  }

  // Isolate icon sets
  if (packageName === 'lucide-react' || packageName === '@heroicons/react' || packageName === 'react-icons') {
    return 'vendor-icons';
  }

  // Toast library — used by both apps; must not merge into a route chunk
  // (STOREFRONT_DEFERRED_PRELOAD_CHUNKS expects a /vendor-toast-/ chunk).
  if (packageName === 'sonner') {
    return 'vendor-toast';
  }

  // Keep tiny class-name helpers independent from MUI. Storefront sections use
  // cn(...) in the PDP critical path, so this must not pull the full MUI chunk.
  if (
    packageName === 'class-variance-authority' ||
    packageName === 'clsx' ||
    packageName === 'tailwind-merge'
  ) {
    return 'vendor-class-utils';
  }

  // Isolate Base UI independently from MUI so storefront does not pull MUI + Emotion (~1.3MB)
  if (packageName === '@base-ui/react') {
    return 'vendor-base-ui';
  }

  // Isolate heavy admin MUI & Emotion
  if (
    packageName.startsWith('@mui/') ||
    packageName.startsWith('@emotion/')
  ) {
    return 'vendor-mui';
  }

  // Everything else UI-related goes to generic framework
  if (
    packageName === '@headlessui/react'
  ) {
    return 'vendor-ui-framework';
  }

  if (packageName === 'qrcode.react' || packageName.startsWith('qrcode')) {
    return 'vendor-qrcode';
  }

  if (packageName === 'dompurify') {
    return 'vendor-dompurify';
  }

  return undefined;
};

const getEnvValueFromFiles = (
  filePaths: string[],
  key: string,
): string | null => {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const matchingLine = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !line.startsWith('#') &&
          line.startsWith(`${key}=`),
      );

    if (!matchingLine) {
      continue;
    }

    return matchingLine
      .slice(key.length + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }

  return null;
};

const resolveDefaultProxyTarget = (): string => {
  const backendPort =
    getEnvValueFromFiles(
      [
        resolve(__dirname, '../backend/.env.local'),
        resolve(__dirname, '../backend/.env'),
      ],
      'PORT',
    ) || '3007';

  return `http://localhost:${backendPort}`;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const requestedDisableCompression = env['VITE_DISABLE_COMPRESSION'];
  const normalizedDisableCompression = String(requestedDisableCompression ?? '')
    .trim()
    .toLowerCase();
  const disableCompression =
    normalizedDisableCompression === '1' ||
    normalizedDisableCompression === 'true';
  const proxyTarget = env['VITE_PROXY_TARGET'] || resolveDefaultProxyTarget();
  const requestedMinifier = env['VITE_BUILD_MINIFY'];
  const normalizedRequestedMinifier = String(requestedMinifier ?? 'esbuild')
    .trim()
    .toLowerCase();
  const buildMinifier =
    normalizedRequestedMinifier === 'false' || normalizedRequestedMinifier === 'none'
      ? false
      : normalizedRequestedMinifier === 'esbuild'
        ? 'esbuild'
        : 'terser';
  const enableBuildSourcemap =
    env['VITE_BUILD_SOURCEMAP'] === '1' ||
    env['VITE_BUILD_SOURCEMAP'] === 'true';
  const explicitHmrPort = env['VITE_HMR_PORT']
    ? parseInt(env['VITE_HMR_PORT'], 10)
    : undefined;
  const allowedHosts = env['VITE_ALLOWED_HOSTS']
    ? env['VITE_ALLOWED_HOSTS']
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean)
    : ['localhost', '127.0.0.1', '.localhost', '.lvh.me'];
  const useConservativeWindowsOptimizeDeps =
    mode === 'development' && process.platform === 'win32';

  console.log('⚡ Vite Config: Resolving @ alias to:', resolve(__dirname, './src'));

  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {},
      'global': 'window',
    },
    esbuild: {
      sourcemap: false,
      keepNames: true,
    },
    root: '.',
    worker: {
      format: 'es',
    },
    // Path resolution
    resolve: {
      dedupe: Array.from(REACT_RUNTIME_PACKAGES),
      alias: [
        { find: 'react', replacement: resolve(FRONTEND_NODE_MODULES, 'react') },
        {
          find: 'react/jsx-runtime',
          replacement: resolve(FRONTEND_NODE_MODULES, 'react/jsx-runtime.js'),
        },
        {
          find: 'react/jsx-dev-runtime',
          replacement: resolve(FRONTEND_NODE_MODULES, 'react/jsx-dev-runtime.js'),
        },
        { find: 'react-dom', replacement: resolve(FRONTEND_NODE_MODULES, 'react-dom') },
        {
          find: 'react-dom/client',
          replacement: resolve(FRONTEND_NODE_MODULES, 'react-dom/client.js'),
        },
        { find: 'scheduler', replacement: resolve(FRONTEND_NODE_MODULES, 'scheduler') },
        {
          find: 'use-sync-external-store',
          replacement: resolve(FRONTEND_NODE_MODULES, 'use-sync-external-store'),
        },
        { find: 'react-router', replacement: resolve(FRONTEND_NODE_MODULES, 'react-router') },
        { find: 'react-router-dom', replacement: resolve(FRONTEND_NODE_MODULES, 'react-router-dom') },
        { find: '@', replacement: resolve(__dirname, 'src') },
        { find: '@icr/polyseg-wasm', replacement: resolve(__dirname, 'src/components/radiology/polysegStub.js') },
      ],
    },
    plugins: [
      react(),
      !disableCompression &&
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240,
          verbose: false,
        }),
      !disableCompression &&
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 10240,
          verbose: false,
        }),
      // Bundle analyzer - only in analyze mode
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      // 2026-10-13 boot waterfall fix: the always-loaded shell loads through a
      // SERIAL dynamic-import chain (entry → AdminAppBootstrap → App → page).
      // On high-RTT links each hop waits for the previous chunk to download
      // AND execute before the next request even starts — measured ~20s from
      // commit to first paint on maxp.online even after the chunk-graph fix.
      // Inject hashed modulepreload hints for the shell chain into index.html
      // so the browser fetches every hop in parallel with the entry. Skipped
      // at runtime for storefront visitors via __MAXP_IS_STOREFRONT__
      // (set by /js/storefront-detection.js, which parses before this script).
      {
        name: 'maxp-preload-shell-chain',
        apply: 'build',
        transformIndexHtml(html, ctx) {
          const bundle = ctx.bundle;
          if (!bundle) return html;
          const baseName = (f: string) => f.split('/').pop() || '';
          const shellFiles: string[] = [];
          const seen = new Set<string>();
          const addStaticClosure = (fileName: string) => {
            if (seen.has(fileName)) return;
            const chunk = bundle[fileName];
            if (!chunk || chunk.type !== 'chunk') return;
            seen.add(fileName);
            shellFiles.push(fileName);
            for (const dep of chunk.imports ?? []) addStaticClosure(dep);
          };
          for (const [fileName, b] of Object.entries(bundle)) {
            if (b.type !== 'chunk') continue;
            // bundle keys carry the 'assets/' prefix — match on basename.
            if (!/^AdminAppBootstrap(?:-|\.)/.test(baseName(fileName))) continue;
            addStaticClosure(fileName);
            for (const dyn of b.dynamicImports ?? []) {
              // The App chunk hosts the router and mounts on every page.
              if (/^App(?:-|\.)/.test(baseName(dyn))) addStaticClosure(dyn);
            }
          }
          // Defensive: never preload route/storefront chunks at boot.
          const urls = shellFiles.filter(
            (f) => !/^(?:route-|storefront-)[^/]*\.js$/.test(f.split('/').pop() || ''),
          );
          if (urls.length === 0) return html;
          const preloadScript =
            '<script>(function(){if(window.__MAXP_IS_STOREFRONT__)return;var h=document.head;[' +
            urls.map((f) => `'/${f}'`).join(',') +
            '].forEach(function(u){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=u;h.appendChild(l);});})();</script>';
          return html.replace('</head>', `${preloadScript}</head>`);
        },
      },
    ].filter(Boolean),

    /* Fix for WebSocket HMR & Proxy issues */
    server: {
      port: parseInt(env['VITE_PORT'] || '3000'),
      host: true,
      allowedHosts,
      fs: {
        allow: [
          '.',
          '../../node_modules',
        ],
      },
      open: false,
      strictPort: false,
      cors: true,
      hmr: {
        protocol: 'ws',
        ...(env['VITE_HMR_HOST'] ? { host: env['VITE_HMR_HOST'] } : {}),
        ...(explicitHmrPort
          ? {
              port: explicitHmrPort,
              clientPort: explicitHmrPort,
            }
          : {}),
        overlay: true,
      },
      watch: {
        ignored: ['**/node_modules/**', '**/.tmp/**'],
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          timeout: 120000,
          proxyTimeout: 120000,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Backend unavailable', message: 'الخادم غير متاح مؤقتاً' }));
              }
            });
          },
        },
        '/webhooks': {
          target: proxyTarget,
          changeOrigin: false,
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: false,
          ws: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: false,
        },
      },
    },

    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/webhooks': {
          target: proxyTarget,
          changeOrigin: false,
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: false,
          ws: true,
        },
      },
    },

    // Optimization
    optimizeDeps: {
      // On this Windows workspace the default dependency crawler can push
      // esbuild into an OOM crash for the full admin + storefront graph.
      // Keep dev stable by constraining crawl entry points instead of
      // disabling optimization entirely, otherwise the browser ends up
      // loading too many raw modules and trips ERR_INSUFFICIENT_RESOURCES.
      ...(useConservativeWindowsOptimizeDeps
        ? {
            entries: [
              'src/main.tsx',
              'src/bootstrap/AdminAppBootstrap.tsx',
              'src/storefront/StorefrontBootstrap.tsx',
            ],
          }
        : {}),
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        // Lazy-loaded order screens import date-fns for the first time during
        // navigation; prebundling it up front avoids dev-time 504
        // "Outdated Optimize Dep" responses while Vite re-optimizes deps.
        'date-fns',
        // Shared UI wrappers deep-import Base UI primitives; prebundle the
        // dialog primitives that appear in lazy-loaded admin routes to avoid
        // dev-time 504 "Outdated Optimize Dep" failures during navigation.
        '@base-ui/react/dialog',
        '@base-ui/react/alert-dialog',
      ],
      // Node-only codecs (used by the radiology DICOM viewer) must not be
      // pre-bundled: they `require('fs')`/`path` and crash the esbuild
      // dep-optimizer at dev startup. They load fine as raw modules.
      exclude: [
        '@cornerstonejs/codec-charls',
        '@cornerstonejs/codec-libjpeg-turbo-8bit',
        '@cornerstonejs/codec-openjpeg',
        '@cornerstonejs/codec-openjph',
        '@cornerstonejs/core',
        '@cornerstonejs/dicom-image-loader',
        '@cornerstonejs/tools',
      ],
    },

    build: {
      // The radiology DICOM codec wrappers `require("fs")`/`path` inside
      // `if(ENVIRONMENT_IS_NODE)` guards that never run in the browser.
      // Leave those Node built-ins as raw `require()` calls instead of letting
      // the CJS transform resolve them, otherwise the build fails with
      // `Failed to resolve entry for package "fs"`.
      commonjsOptions: {
        ignore: [
          'fs', 'path', 'buffer', 'child_process', 'stream', 'util', 'url',
          'zlib', 'os', 'crypto', 'net', 'http', 'https', 'events', 'assert',
          'string_decoder', 'tty', 'querystring', 'punycode', 'dns', 'timers',
          'constants', 'module', 'vm', 'worker_threads', 'process', 'tls',
          'dgram', 'readline', 'cluster',
        ],
      },
      modulePreload: {
        resolveDependencies(filename, deps) {
          // 2026-08 perf patch 2: always defer heavy vendor chunks from initial
          // preload (saves ~1.6MB for storefront visitors). Admin will lazy-load
          // them on first navigation to dashboard/inbox if needed.
          return filterLazyRoutePreloads(filterStorefrontDeferredPreloads(deps));
        },
      },
      minify: buildMinifier,
      ...(buildMinifier === 'terser'
        ? {
            terserOptions: {
              compress: {
                drop_console: mode === 'production',
                drop_debugger: mode === 'production',
                pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : [],
                unused: false,
                dead_code: false,
              },
              mangle: {
                keep_classnames: true,
                keep_fnames: true,
              },
              format: {
                comments: false,
              },
            },
          }
        : {}),
      outDir: 'dist',
      target: 'esnext',
      sourcemap: mode === 'production'
        ? (enableBuildSourcemap ? 'hidden' : false)
        : true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      reportCompressedSize: false,
      rollupOptions: {
        // Node built-ins referenced by the emscripten DICOM codec wrappers
        // inside `if(ENVIRONMENT_IS_NODE)` guards (never executed in browser).
        // Keep them external so Rollup stops failing with
        // `Failed to resolve entry for package "fs"` while the radiology
        // viewer's lazy chunk is built.
        external(id) {
          return (
            id.startsWith('node:') ||
            id.includes('@cornerstonejs/codec-') ||
            [
              'fs', 'path', 'buffer', 'child_process', 'stream', 'util', 'url',
              'zlib', 'os', 'crypto', 'net', 'http', 'https', 'events', 'assert',
              'string_decoder', 'tty', 'querystring', 'punycode', 'dns', 'timers',
              'constants', 'module', 'vm', 'worker_threads', 'process', 'tls',
              'dgram', 'readline', 'cluster',
            ].includes(id)
          );
        },
        // maxParallelFileOps removed — default (20) is faster for CI/CD
        onwarn(warning, warn) {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            typeof warning.message === 'string' &&
            warning.message.includes('use client')
          ) {
            return;
          }
          if (warning.code === 'SOURCEMAP_ERROR') {
            return;
          }
          if (
            (warning.code === 'UNRESOLVED_IMPORT' || warning.code === 'PLUGIN_WARNING') &&
            typeof warning.message === 'string' &&
            warning.message.includes('@cornerstonejs')
          ) {
            return;
          }
          warn(warning);
        },
        output: {
          // Avoid hoisting every transitively-imported chunk into the entry
          // chunk. This stops the entry from eagerly importing all route
          // chunks (and executing them) on every page load.
          hoistTransitiveImports: false,
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            // The vite preload helper (__vitePreload) must live in a neutral
            // chunk. Default placement merged it into route-storefront, which
            // forced a static entry → route-storefront import; that made every
            // page chunk touching route-storefront statically reachable from
            // the entry, and Rollup answered their lazy imports with facades
            // hosted IN the entry — which then statically imported those route
            // chunks (caught by scripts/check-entry-chunks.cjs).
            if (normalizedId.includes('vite/preload-helper')) {
              return 'app-bootstrap-core';
            }

            // Chart wrappers import recharts (vendor-viz, 195KB brotli) but
            // are only used by analytics pages. Leaving them matched by the
            // ui-primitives pattern below made EVERY page — storefront
            // visitors included — download the charting library at boot.
            if (
              normalizedId.includes('/src/components/ui/chart.tsx') ||
              normalizedId.includes('/src/components/ui/DeferredResponsiveContainer.tsx')
            ) {
              return undefined;
            }

            if (APP_UI_PRIMITIVES_MODULE_PATTERN.test(normalizedId)) {
              return 'app-ui-primitives';
            }

            if (APP_BOOTSTRAP_CORE_MODULE_PATTERN.test(normalizedId)) {
              return 'app-bootstrap-core';
            }

            if (normalizedId.includes('/locales/en/')) {
              return 'i18n-en';
            }

            if (APP_I18N_MODULE_PATTERN.test(normalizedId) || normalizedId.includes('/locales/ar/')) {
              return 'app-i18n';
            }

            if (normalizedId.includes('/src/utils/i18n-toast.ts')) {
              return 'admin-i18n-toast';
            }

            if (APP_SHARED_CORE_MODULE_PATTERN.test(normalizedId)) {
              return 'app-shared-core';
            }

            if (APP_BUSINESS_SHELL_MODULE_PATTERN.test(normalizedId)) {
              return 'app-business-shell';
            }

            if (APP_QUERY_CLIENT_MODULE_PATTERN.test(normalizedId)) {
              return 'app-query-client';
            }

            if (APP_TRACKING_MODULE_PATTERN.test(normalizedId)) {
              return 'app-tracking';
            }

            if (APP_PROVIDERS_CORE_MODULE_PATTERN.test(normalizedId)) {
              return 'app-providers-core';
            }

            if (APP_ROUTE_GUARDS_MODULE_PATTERN.test(normalizedId)) {
              return 'app-route-guards';
            }

            if (normalizedId.includes('@cornerstonejs') || normalizedId.includes(NODE_MODULES_SEGMENT + 'dicom-parser/')) return 'cornerstone';

            // Route-based chunk grouping for app source files
            if (
              !normalizedId.includes(NODE_MODULES_SEGMENT) &&
              normalizedId.includes('/src/') &&
              /\.tsx?$/.test(normalizedId)
            ) {
              if (normalizedId.includes('/src/pages/hr/')) return 'route-hr';
              if (normalizedId.includes('/src/pages/orders/')) return 'route-orders';
              if (normalizedId.includes('/src/pages/products/')) return 'route-products';
              // TemplateCenter + النطاقات (طلبات/عملاء/أسنان) chunk مشترك بدل ما يسقط
              // في route-pages-other (1.5MB) — يتسمّى مرة ويُخزَّن للصفحات الثلاثة
              if (normalizedId.includes('/src/pages/templates/')) return 'route-templates';
              // غلاف /customers/customer-notifications صفحة قوالب (7 أسطر) — بدون
              // القاعدة دي كانت تنزّل route-customers كامل (509KB) معها
              if (normalizedId.includes('/src/pages/customers/CustomerNotifications')) return 'route-customer-notifications';
              if (normalizedId.includes('/src/pages/customers/')) return 'route-customers';
              if (normalizedId.includes('/src/pages/advertising/product-landing/')) return 'route-product-landing';
              if (normalizedId.includes('/src/pages/advertising/marketing-studio/')) return 'route-marketing-studio';
              if (normalizedId.includes('/src/pages/advertising/creative-studio/')) return 'route-creative-studio';
              if (normalizedId.includes('/src/pages/advertising/')) return 'route-advertising';
              if (normalizedId.includes('/src/pages/affiliates/')) return 'route-affiliates';
if (normalizedId.includes('SuperAdminAIKeyManager')) return 'route-ai-key-manager';
              if (normalizedId.includes('/src/pages/super-admin/')) return 'route-super-admin';
              if (normalizedId.includes('/src/pages/settings/')) return 'route-settings';
              if (normalizedId.includes('/src/pages/whatsapp/')) return 'route-whatsapp';
              if (normalizedId.includes('/src/pages/facebook-inbox/') || normalizedId.includes('/src/pages/instagram-inbox/') || normalizedId.includes('/src/pages/unified-inbox/')) return 'route-inbox';
              if (normalizedId.includes('/src/pages/tasks/')) return 'route-tasks';
              if (normalizedId.includes('/src/pages/inventory/')) return 'route-inventory';
              if (normalizedId.includes('/src/pages/analytics/') || normalizedId.includes('/src/pages/Analytics/') || normalizedId.includes('/src/pages/reports/')) return 'route-analytics';
              if (normalizedId.includes('/src/pages/support/')) return 'route-support';
              if (normalizedId.includes('/src/pages/telegram/')) return 'route-telegram';
              if (normalizedId.includes('/src/pages/employee/')) return 'route-employee';
              if (normalizedId.includes('/src/pages/procurement/')) return 'route-procurement';
              if (normalizedId.includes('/src/pages/shipments/')) return 'route-shipments';
              if (normalizedId.includes('/src/storefront/variants/')) return 'storefront-variants';
              // 2026-08 perf patch 3 REVERTED: per-section splitting caused circular
              // chunk TDZ runtime error ("Cannot access ... before initialization")
              // and broke storefront rendering. Sections stay in one chunk.
              if (normalizedId.includes('/src/storefront/sections/')) return 'storefront-sections';
              if (normalizedId.includes('/src/storefront/themes/')) return 'storefront-themes';
              if (normalizedId.includes('/src/storefront/blueprints/')) return 'storefront-blueprints';
              if (normalizedId.includes('/src/storefront/engine/')) return 'storefront-engine';
              if (normalizedId.includes('/src/storefront/components/')) return 'storefront-components';
              if (normalizedId.includes('/src/storefront/studio/')) return 'route-storefront-studio';
              if (normalizedId.includes('/src/storefront/')) return 'route-storefront';
              if (normalizedId.includes('/src/pages/profile/')) return 'route-profile';
              if (normalizedId.includes('/src/pages/dashboard/')) return 'route-dashboard';
              if (normalizedId.includes('/src/pages/auth/')) return 'route-auth';
              if (normalizedId.includes('/src/pages/admin/')) return 'route-admin';
              if (normalizedId.includes('/src/pages/marketplace/')) return 'route-marketplace';
              if (normalizedId.includes('/src/pages/subscription/')) return 'route-subscription';
              if (normalizedId.includes('/src/pages/comments/')) return 'route-comments';
              if (normalizedId.includes('/src/pages/conversations/')) return 'route-conversations';
              if (normalizedId.includes('/src/pages/merchants/') || normalizedId.includes('/src/pages/merchant-portal/')) return 'route-merchants';
              if (normalizedId.includes('/src/pages/public/') || normalizedId.includes('/src/pages/landing/')) return 'route-public';
              if (normalizedId.includes('/src/pages/themes/')) return 'route-themes';
              if (normalizedId.includes('/src/pages/platform-integrations/') || normalizedId.includes('/src/pages/platform-partner/') || normalizedId.includes('/src/pages/platform/')) return 'route-platform';
              if (normalizedId.includes('/src/pages/returns/')) return 'route-returns';
              if (normalizedId.includes('/src/pages/shipping/')) return 'route-shipping';
              if (normalizedId.includes('/src/pages/woocommerce/')) return 'route-woocommerce';
              if (normalizedId.includes('/src/pages/coupons/')) return 'route-coupons';
              if (normalizedId.includes('/src/pages/appointments/')) return 'route-appointments';
              if (normalizedId.includes('/src/pages/bulk-search/')) return 'route-bulk-search';
              if (normalizedId.includes('/src/pages/broadcast/')) return 'route-broadcast';
              if (normalizedId.includes('/src/pages/whatsapp-inbox/')) return 'route-whatsapp-inbox';
              if (normalizedId.includes('/src/pages/pos/')) return 'route-pos';
              if (normalizedId.includes('/src/pages/radiology/')) return 'route-radiology';
              if (normalizedId.includes('/src/pages/wallet/')) return 'route-wallet';
              if (normalizedId.includes('/src/pages/categories/')) return 'route-categories';
                            if (normalizedId.includes('/src/pages/tickets/')) return 'route-tickets';
              if (normalizedId.includes('/src/pages/legal/')) return 'route-legal';
              if (normalizedId.includes('/src/pages/owner/')) return 'route-owner';
              if (normalizedId.includes('/src/pages/my-custody/')) return 'route-my-custody';
              if (normalizedId.endsWith('/src/pages/LandingPage.tsx') || normalizedId.endsWith('/src/pages/PlatformLandingPage.tsx')) return 'route-landing';
              // Catch-all for any remaining src/pages/ .tsx/.ts files.
              //
              // 2026-08-29 storefront first-load fix: DO NOT assign unmatched
              // pages to a manual chunk (neither a shared `route-pages-other`
              // pot nor per-page chunks) — with manual chunking, Rollup answers
              // some pages' React.lazy imports with re-export facades hosted
              // IN THE ENTRY chunk, bridging static imports from the entry
              // into route chunks and dragging the whole platform graph
              // (~2.5MB) into every storefront visitor's first load (caught
              // by scripts/check-entry-chunks.cjs). Default Rollup chunking
              // gives dynamic entries standalone chunks with direct imports.
              // Shared modules were moved OUT of route chunks into neutral
              // app-* chunks (i18n, apiClient/tokenManager, imageUrl/
              // i18n-toast, sonner, components/business) so pages stop
              // depending on route chunks statically.
              if (normalizedId.includes('/src/pages/')) {
                return undefined;
              }
            }

            return getVendorChunkName(normalizedId);
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
