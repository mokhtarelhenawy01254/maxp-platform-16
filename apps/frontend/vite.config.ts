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
  /(?:^|\/)CartDrawer-/,
  /(?:^|\/)CartUpsellHost-/,
  /(?:^|\/)GlobalConversionHost-/,
  /(?:^|\/)StickyAddToCartHost-/,
  /(?:^|\/)marketplaceSampleData-/,
  /(?:^|\/)storefront-theme-presets-/,
  /(?:^|\/)apiClient-/,
  /(?:^|\/)tokenManager-/,
];
const STOREFRONT_THEME_PRESET_MODULE_PATTERN = /\/src\/storefront\/themes\//;
const STOREFRONT_THEME_DEFAULTS_MODULE_PATTERN =
  /\/src\/storefront\/engine\/themeDefaults\.ts$/;
const STOREFRONT_RUNTIME_THEME_MODULE_PATTERN =
  /\/src\/storefront\/themes\/(?:modern-minimal|khemet-luxe-eg)\.json(?:\?url)?$/;
const APP_UI_PRIMITIVES_MODULE_PATTERN =
  /\/src\/(?:components\/ui\/|lib\/utils\.ts$)/;

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
    normalizedId.includes('/xlsx/') ||
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

  // Isolate Radix UI primitives
  if (packageName.startsWith('@radix-ui/')) {
    return 'vendor-radix';
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

  // Isolate Base UI & MUI.
  if (
    packageName === '@base-ui/react' ||
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
    },
    root: '.',
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
        { find: '@', replacement: resolve(__dirname, 'src') },
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
          changeOrigin: false,
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
    },

    build: {
      modulePreload: {
        resolveDependencies(filename, deps) {
          return shouldFilterStorefrontPreloads(filename, deps)
            ? filterStorefrontDeferredPreloads(deps)
            : deps;
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
              },
              mangle: true,
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
          warn(warning);
        },
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (APP_UI_PRIMITIVES_MODULE_PATTERN.test(normalizedId)) {
              return 'app-ui-primitives';
            }

            // Route-based chunk grouping for app source files
            if (
              !normalizedId.includes(NODE_MODULES_SEGMENT) &&
              normalizedId.includes('/src/') &&
              /\.tsx?$/.test(normalizedId)
            ) {
              if (normalizedId.includes('/src/pages/hr/')) return 'route-hr';
              if (normalizedId.includes('/src/pages/orders/')) return 'route-orders';
              if (normalizedId.includes('/src/pages/products/')) return 'route-products';
              if (normalizedId.includes('/src/pages/customers/')) return 'route-customers';
              if (normalizedId.includes('/src/pages/advertising/')) return 'route-advertising';
              if (normalizedId.includes('/src/pages/affiliates/')) return 'route-affiliates';
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
              if (normalizedId.includes('/src/storefront/sections/')) return 'storefront-sections';
              if (normalizedId.includes('/src/storefront/themes/')) return 'storefront-themes';
              if (normalizedId.includes('/src/storefront/blueprints/')) return 'storefront-blueprints';
              if (normalizedId.includes('/src/storefront/engine/')) return 'storefront-engine';
              if (normalizedId.includes('/src/storefront/components/')) return 'storefront-components';
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
              if (normalizedId.includes('/src/pages/wallet/')) return 'route-wallet';
              if (normalizedId.includes('/src/pages/categories/')) return 'route-categories';
                            if (normalizedId.includes('/src/pages/tickets/')) return 'route-tickets';
              if (normalizedId.includes('/src/pages/legal/')) return 'route-legal';
              if (normalizedId.includes('/src/pages/owner/')) return 'route-owner';
              if (normalizedId.includes('/src/pages/my-custody/')) return 'route-my-custody';
              if (normalizedId.endsWith('/src/pages/LandingPage.tsx') || normalizedId.endsWith('/src/pages/PlatformLandingPage.tsx')) return 'route-landing';
              // Catch-all for any remaining src/pages/ .tsx/.ts files
              if (normalizedId.includes('/src/pages/')) return 'route-pages-other';
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
