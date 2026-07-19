// vite.config.ts
import { defineConfig, loadEnv } from "file:///H:/max_p_new/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///H:/max_p_new/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import viteCompression from "file:///H:/max_p_new/frontend/node_modules/vite-plugin-compression/dist/index.mjs";
import { visualizer } from "file:///H:/max_p_new/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { resolve, dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///X:/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var NODE_MODULES_SEGMENT = "/node_modules/";
var REACT_RUNTIME_PACKAGES = /* @__PURE__ */ new Set([
  "react",
  "react-dom",
  "scheduler",
  "react-router",
  "react-router-dom",
  "@remix-run/router",
  "use-sync-external-store",
  "react-redux"
]);
var getPackageName = (normalizedId) => {
  const nodeModulesIndex = normalizedId.lastIndexOf(NODE_MODULES_SEGMENT);
  if (nodeModulesIndex === -1) {
    return null;
  }
  const packagePath = normalizedId.slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length).split("/");
  if (packagePath[0]?.startsWith("@") && packagePath[1]) {
    return `${packagePath[0]}/${packagePath[1]}`;
  }
  return packagePath[0] || null;
};
var getVendorChunkName = (normalizedId) => {
  if (!normalizedId.includes(NODE_MODULES_SEGMENT)) {
    return void 0;
  }
  const packageName = getPackageName(normalizedId);
  if (!packageName) {
    return void 0;
  }
  if (normalizedId.includes("/recharts/") || normalizedId.includes("/chart.js/") || normalizedId.includes("/react-chartjs-2/") || normalizedId.includes("/emoji-picker-react/") || normalizedId.includes("/react-select/")) {
    return "vendor-viz-interactive";
  }
  if (normalizedId.includes("/@craftjs/") || normalizedId.includes("/@dnd-kit/")) {
    return "vendor-builder";
  }
  if (normalizedId.includes("/date-fns/") || normalizedId.includes("/react-datepicker/") || normalizedId.includes("/@mui/x-date-pickers/") || packageName.startsWith("@tanstack/") || packageName === "axios" || packageName === "zustand" || packageName === "idb-keyval") {
    return "vendor-data-utils";
  }
  if (normalizedId.includes("/jspdf/") || normalizedId.includes("/jspdf-autotable/") || normalizedId.includes("/xlsx/") || packageName === "i18next" || packageName === "react-i18next" || packageName === "i18next-browser-languagedetector") {
    return "vendor-core-runtime";
  }
  if (REACT_RUNTIME_PACKAGES.has(packageName)) {
    return "vendor-react";
  }
  if (packageName === "framer-motion" || normalizedId.includes("/framer-motion/")) {
    return "vendor-framer-motion";
  }
  if (packageName === "lucide-react" || packageName === "@heroicons/react" || packageName === "react-icons") {
    return "vendor-icons";
  }
  if (packageName.startsWith("@radix-ui/")) {
    return "vendor-radix";
  }
  if (packageName === "@base-ui/react" || packageName.startsWith("@mui/") || packageName.startsWith("@emotion/")) {
    return "vendor-mui";
  }
  if (packageName === "@headlessui/react" || packageName === "clsx" || packageName === "tailwind-merge") {
    return "vendor-ui-framework";
  }
  return void 0;
};
var getEnvValueFromFiles = (filePaths, key) => {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const fileContent = fs.readFileSync(filePath, "utf8");
    const matchingLine = fileContent.split(/\r?\n/).map((line) => line.trim()).find(
      (line) => line && !line.startsWith("#") && line.startsWith(`${key}=`)
    );
    if (!matchingLine) {
      continue;
    }
    return matchingLine.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
};
var resolveDefaultProxyTarget = () => {
  const backendPort = getEnvValueFromFiles(
    [
      resolve(__dirname, "../backend/.env.local"),
      resolve(__dirname, "../backend/.env")
    ],
    "PORT"
  ) || "3007";
  return `http://localhost:${backendPort}`;
};
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const disableCompression = env["VITE_DISABLE_COMPRESSION"] === "1" || env["VITE_DISABLE_COMPRESSION"] === "true";
  const proxyTarget = env["VITE_PROXY_TARGET"] || resolveDefaultProxyTarget();
  const requestedMinifier = String(env["VITE_BUILD_MINIFY"] || "terser").trim().toLowerCase();
  const buildMinifier = requestedMinifier === "false" || requestedMinifier === "none" ? false : requestedMinifier === "esbuild" ? "esbuild" : "terser";
  const enableBuildSourcemap = env["VITE_BUILD_SOURCEMAP"] === "1" || env["VITE_BUILD_SOURCEMAP"] === "true";
  const explicitHmrPort = env["VITE_HMR_PORT"] ? parseInt(env["VITE_HMR_PORT"], 10) : void 0;
  const allowedHosts = env["VITE_ALLOWED_HOSTS"] ? env["VITE_ALLOWED_HOSTS"].split(",").map((host) => host.trim()).filter(Boolean) : ["localhost", "127.0.0.1", ".localhost", ".lvh.me"];
  console.log("\u26A1 Vite Config: Resolving @ alias to:", resolve(__dirname, "./src"));
  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env": {},
      "global": "window"
    },
    root: ".",
    // Path resolution
    resolve: {
      alias: [
        { find: "@", replacement: resolve(__dirname, "src") }
      ]
    },
    plugins: [
      react(),
      !disableCompression && viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240,
        verbose: false
      }),
      !disableCompression && viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 10240,
        verbose: false
      }),
      // Bundle analyzer - only in analyze mode
      mode === "analyze" && visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap"
      })
    ].filter(Boolean),
    /* Fix for WebSocket HMR & Proxy issues */
    server: {
      port: parseInt(env["VITE_PORT"] || "3000"),
      host: true,
      allowedHosts,
      open: false,
      strictPort: true,
      cors: true,
      hmr: {
        protocol: "ws",
        ...env["VITE_HMR_HOST"] ? { host: env["VITE_HMR_HOST"] } : {},
        ...explicitHmrPort ? {
          port: explicitHmrPort,
          clientPort: explicitHmrPort
        } : {},
        overlay: true
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: false
        },
        "/webhooks": {
          target: proxyTarget,
          changeOrigin: false
        },
        "/socket.io": {
          target: proxyTarget,
          changeOrigin: false,
          ws: true
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: false
        }
      }
    },
    // Optimization
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "@tanstack/react-query",
        "axios",
        // React subpath runtimes can be requested before Vite finishes
        // inferring them from transformed TSX on Windows, which leaves the
        // browser stuck on 504 "Outdated Optimize Dep" for the home page.
        "scheduler",
        // Lazy-loaded order screens import date-fns for the first time during
        // navigation; prebundling it up front avoids dev-time 504
        // "Outdated Optimize Dep" responses while Vite re-optimizes deps.
        "date-fns",
        // Shared UI wrappers deep-import Base UI primitives; prebundle the
        // dialog primitives that appear in lazy-loaded admin routes to avoid
        // dev-time 504 "Outdated Optimize Dep" failures during navigation.
        "@base-ui/react/dialog",
        "@base-ui/react/alert-dialog"
      ]
    },
    build: {
      minify: buildMinifier,
      ...buildMinifier === "terser" ? {
        terserOptions: {
          compress: {
            drop_console: mode === "production",
            drop_debugger: mode === "production",
            pure_funcs: mode === "production" ? ["console.log", "console.debug"] : []
          },
          mangle: true,
          format: {
            comments: false
          }
        }
      } : {},
      outDir: "dist",
      target: "esnext",
      sourcemap: mode === "production" ? enableBuildSourcemap ? "hidden" : false : true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      reportCompressedSize: false,
      rollupOptions: {
        // maxParallelFileOps removed — default (20) is faster for CI/CD
        onwarn(warning, warn) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE" && typeof warning.message === "string" && warning.message.includes("use client")) {
            return;
          }
          if (warning.code === "SOURCEMAP_ERROR") {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, "/");
            return getVendorChunkName(normalizedId);
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJYOlxcXFxcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIlg6XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9YOi92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgdml0ZUNvbXByZXNzaW9uIGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJztcclxuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gJ3JvbGx1cC1wbHVnaW4tdmlzdWFsaXplcic7XHJcbmltcG9ydCB7IHJlc29sdmUsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5jb25zdCBOT0RFX01PRFVMRVNfU0VHTUVOVCA9ICcvbm9kZV9tb2R1bGVzLyc7XHJcbmNvbnN0IFJFQUNUX1JVTlRJTUVfUEFDS0FHRVMgPSBuZXcgU2V0KFtcclxuICAncmVhY3QnLFxyXG4gICdyZWFjdC1kb20nLFxyXG4gICdzY2hlZHVsZXInLFxyXG4gICdyZWFjdC1yb3V0ZXInLFxyXG4gICdyZWFjdC1yb3V0ZXItZG9tJyxcclxuICAnQHJlbWl4LXJ1bi9yb3V0ZXInLFxyXG4gICd1c2Utc3luYy1leHRlcm5hbC1zdG9yZScsXHJcbiAgJ3JlYWN0LXJlZHV4JyxcclxuXSk7XHJcblxyXG5jb25zdCBnZXRQYWNrYWdlTmFtZSA9IChub3JtYWxpemVkSWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4ge1xyXG4gIGNvbnN0IG5vZGVNb2R1bGVzSW5kZXggPSBub3JtYWxpemVkSWQubGFzdEluZGV4T2YoTk9ERV9NT0RVTEVTX1NFR01FTlQpO1xyXG5cclxuICBpZiAobm9kZU1vZHVsZXNJbmRleCA9PT0gLTEpIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcGFja2FnZVBhdGggPSBub3JtYWxpemVkSWRcclxuICAgIC5zbGljZShub2RlTW9kdWxlc0luZGV4ICsgTk9ERV9NT0RVTEVTX1NFR01FTlQubGVuZ3RoKVxyXG4gICAgLnNwbGl0KCcvJyk7XHJcblxyXG4gIGlmIChwYWNrYWdlUGF0aFswXT8uc3RhcnRzV2l0aCgnQCcpICYmIHBhY2thZ2VQYXRoWzFdKSB7XHJcbiAgICByZXR1cm4gYCR7cGFja2FnZVBhdGhbMF19LyR7cGFja2FnZVBhdGhbMV19YDtcclxuICB9XHJcblxyXG4gIHJldHVybiBwYWNrYWdlUGF0aFswXSB8fCBudWxsO1xyXG59O1xyXG5cclxuY29uc3QgZ2V0VmVuZG9yQ2h1bmtOYW1lID0gKG5vcm1hbGl6ZWRJZDogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkID0+IHtcclxuICBpZiAoIW5vcm1hbGl6ZWRJZC5pbmNsdWRlcyhOT0RFX01PRFVMRVNfU0VHTUVOVCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBjb25zdCBwYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKG5vcm1hbGl6ZWRJZCk7XHJcblxyXG4gIGlmICghcGFja2FnZU5hbWUpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBpZiAoXHJcbiAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9yZWNoYXJ0cy8nKSB8fFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvY2hhcnQuanMvJykgfHxcclxuICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL3JlYWN0LWNoYXJ0anMtMi8nKSB8fFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvZW1vamktcGlja2VyLXJlYWN0LycpIHx8XHJcbiAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9yZWFjdC1zZWxlY3QvJylcclxuICApIHtcclxuICAgIHJldHVybiAndmVuZG9yLXZpei1pbnRlcmFjdGl2ZSc7XHJcbiAgfVxyXG5cclxuICBpZiAoXHJcbiAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9AY3JhZnRqcy8nKSB8fFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvQGRuZC1raXQvJylcclxuICApIHtcclxuICAgIHJldHVybiAndmVuZG9yLWJ1aWxkZXInO1xyXG4gIH1cclxuXHJcbiAgaWYgKFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvZGF0ZS1mbnMvJykgfHxcclxuICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL3JlYWN0LWRhdGVwaWNrZXIvJykgfHxcclxuICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL0BtdWkveC1kYXRlLXBpY2tlcnMvJykgfHxcclxuICAgIHBhY2thZ2VOYW1lLnN0YXJ0c1dpdGgoJ0B0YW5zdGFjay8nKSB8fFxyXG4gICAgcGFja2FnZU5hbWUgPT09ICdheGlvcycgfHxcclxuICAgIHBhY2thZ2VOYW1lID09PSAnenVzdGFuZCcgfHxcclxuICAgIHBhY2thZ2VOYW1lID09PSAnaWRiLWtleXZhbCdcclxuICApIHtcclxuICAgIHJldHVybiAndmVuZG9yLWRhdGEtdXRpbHMnO1xyXG4gIH1cclxuXHJcbiAgaWYgKFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvanNwZGYvJykgfHxcclxuICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL2pzcGRmLWF1dG90YWJsZS8nKSB8fFxyXG4gICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcveGxzeC8nKSB8fFxyXG4gICAgcGFja2FnZU5hbWUgPT09ICdpMThuZXh0JyB8fFxyXG4gICAgcGFja2FnZU5hbWUgPT09ICdyZWFjdC1pMThuZXh0JyB8fFxyXG4gICAgcGFja2FnZU5hbWUgPT09ICdpMThuZXh0LWJyb3dzZXItbGFuZ3VhZ2VkZXRlY3RvcidcclxuICApIHtcclxuICAgIHJldHVybiAndmVuZG9yLWNvcmUtcnVudGltZSc7XHJcbiAgfVxyXG5cclxuICBpZiAoUkVBQ1RfUlVOVElNRV9QQUNLQUdFUy5oYXMocGFja2FnZU5hbWUpKSB7XHJcbiAgICByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XHJcbiAgfVxyXG5cclxuICAvLyBJc29sYXRlIHZlcnkgaGVhdnkgYW5pbWF0aW9uIGxpYnJhcmllc1xyXG4gIGlmIChwYWNrYWdlTmFtZSA9PT0gJ2ZyYW1lci1tb3Rpb24nIHx8IG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL2ZyYW1lci1tb3Rpb24vJykpIHtcclxuICAgIHJldHVybiAndmVuZG9yLWZyYW1lci1tb3Rpb24nO1xyXG4gIH1cclxuXHJcbiAgLy8gSXNvbGF0ZSBpY29uIHNldHNcclxuICBpZiAocGFja2FnZU5hbWUgPT09ICdsdWNpZGUtcmVhY3QnIHx8IHBhY2thZ2VOYW1lID09PSAnQGhlcm9pY29ucy9yZWFjdCcgfHwgcGFja2FnZU5hbWUgPT09ICdyZWFjdC1pY29ucycpIHtcclxuICAgIHJldHVybiAndmVuZG9yLWljb25zJztcclxuICB9XHJcblxyXG4gIC8vIElzb2xhdGUgUmFkaXggVUkgcHJpbWl0aXZlc1xyXG4gIGlmIChwYWNrYWdlTmFtZS5zdGFydHNXaXRoKCdAcmFkaXgtdWkvJykpIHtcclxuICAgIHJldHVybiAndmVuZG9yLXJhZGl4JztcclxuICB9XHJcblxyXG4gIC8vIElzb2xhdGUgQmFzZSBVSSAmIE1VSVxyXG4gIGlmIChwYWNrYWdlTmFtZSA9PT0gJ0BiYXNlLXVpL3JlYWN0JyB8fCBwYWNrYWdlTmFtZS5zdGFydHNXaXRoKCdAbXVpLycpIHx8IHBhY2thZ2VOYW1lLnN0YXJ0c1dpdGgoJ0BlbW90aW9uLycpKSB7XHJcbiAgICByZXR1cm4gJ3ZlbmRvci1tdWknO1xyXG4gIH1cclxuXHJcbiAgLy8gRXZlcnl0aGluZyBlbHNlIFVJLXJlbGF0ZWQgZ29lcyB0byBnZW5lcmljIGZyYW1ld29ya1xyXG4gIGlmIChcclxuICAgIHBhY2thZ2VOYW1lID09PSAnQGhlYWRsZXNzdWkvcmVhY3QnIHx8XHJcbiAgICBwYWNrYWdlTmFtZSA9PT0gJ2Nsc3gnIHx8XHJcbiAgICBwYWNrYWdlTmFtZSA9PT0gJ3RhaWx3aW5kLW1lcmdlJ1xyXG4gICkge1xyXG4gICAgcmV0dXJuICd2ZW5kb3ItdWktZnJhbWV3b3JrJztcclxuICB9XHJcblxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn07XHJcblxyXG5jb25zdCBnZXRFbnZWYWx1ZUZyb21GaWxlcyA9IChcclxuICBmaWxlUGF0aHM6IHN0cmluZ1tdLFxyXG4gIGtleTogc3RyaW5nLFxyXG4pOiBzdHJpbmcgfCBudWxsID0+IHtcclxuICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVQYXRocykge1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSkge1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcclxuICAgIGNvbnN0IG1hdGNoaW5nTGluZSA9IGZpbGVDb250ZW50XHJcbiAgICAgIC5zcGxpdCgvXFxyP1xcbi8pXHJcbiAgICAgIC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxyXG4gICAgICAuZmluZChcclxuICAgICAgICAobGluZSkgPT5cclxuICAgICAgICAgIGxpbmUgJiZcclxuICAgICAgICAgICFsaW5lLnN0YXJ0c1dpdGgoJyMnKSAmJlxyXG4gICAgICAgICAgbGluZS5zdGFydHNXaXRoKGAke2tleX09YCksXHJcbiAgICAgICk7XHJcblxyXG4gICAgaWYgKCFtYXRjaGluZ0xpbmUpIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hdGNoaW5nTGluZVxyXG4gICAgICAuc2xpY2Uoa2V5Lmxlbmd0aCArIDEpXHJcbiAgICAgIC50cmltKClcclxuICAgICAgLnJlcGxhY2UoL15bJ1wiXXxbJ1wiXSQvZywgJycpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG51bGw7XHJcbn07XHJcblxyXG5jb25zdCByZXNvbHZlRGVmYXVsdFByb3h5VGFyZ2V0ID0gKCk6IHN0cmluZyA9PiB7XHJcbiAgY29uc3QgYmFja2VuZFBvcnQgPVxyXG4gICAgZ2V0RW52VmFsdWVGcm9tRmlsZXMoXHJcbiAgICAgIFtcclxuICAgICAgICByZXNvbHZlKF9fZGlybmFtZSwgJy4uL2JhY2tlbmQvLmVudi5sb2NhbCcpLFxyXG4gICAgICAgIHJlc29sdmUoX19kaXJuYW1lLCAnLi4vYmFja2VuZC8uZW52JyksXHJcbiAgICAgIF0sXHJcbiAgICAgICdQT1JUJyxcclxuICAgICkgfHwgJzMwMDcnO1xyXG5cclxuICByZXR1cm4gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtiYWNrZW5kUG9ydH1gO1xyXG59O1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIC8vIExvYWQgZW52IGZpbGUgYmFzZWQgb24gYG1vZGVgIGluIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xyXG4gIGNvbnN0IGRpc2FibGVDb21wcmVzc2lvbiA9XHJcbiAgICBlbnZbJ1ZJVEVfRElTQUJMRV9DT01QUkVTU0lPTiddID09PSAnMScgfHxcclxuICAgIGVudlsnVklURV9ESVNBQkxFX0NPTVBSRVNTSU9OJ10gPT09ICd0cnVlJztcclxuICBjb25zdCBwcm94eVRhcmdldCA9IGVudlsnVklURV9QUk9YWV9UQVJHRVQnXSB8fCByZXNvbHZlRGVmYXVsdFByb3h5VGFyZ2V0KCk7XHJcbiAgY29uc3QgcmVxdWVzdGVkTWluaWZpZXIgPSBTdHJpbmcoZW52WydWSVRFX0JVSUxEX01JTklGWSddIHx8ICd0ZXJzZXInKS50cmltKCkudG9Mb3dlckNhc2UoKTtcclxuICBjb25zdCBidWlsZE1pbmlmaWVyID1cclxuICAgIHJlcXVlc3RlZE1pbmlmaWVyID09PSAnZmFsc2UnIHx8IHJlcXVlc3RlZE1pbmlmaWVyID09PSAnbm9uZSdcclxuICAgICAgPyBmYWxzZVxyXG4gICAgICA6IHJlcXVlc3RlZE1pbmlmaWVyID09PSAnZXNidWlsZCdcclxuICAgICAgICA/ICdlc2J1aWxkJ1xyXG4gICAgICAgIDogJ3RlcnNlcic7XHJcbiAgY29uc3QgZW5hYmxlQnVpbGRTb3VyY2VtYXAgPVxyXG4gICAgZW52WydWSVRFX0JVSUxEX1NPVVJDRU1BUCddID09PSAnMScgfHxcclxuICAgIGVudlsnVklURV9CVUlMRF9TT1VSQ0VNQVAnXSA9PT0gJ3RydWUnO1xyXG4gIGNvbnN0IGV4cGxpY2l0SG1yUG9ydCA9IGVudlsnVklURV9ITVJfUE9SVCddXHJcbiAgICA/IHBhcnNlSW50KGVudlsnVklURV9ITVJfUE9SVCddLCAxMClcclxuICAgIDogdW5kZWZpbmVkO1xyXG4gIGNvbnN0IGFsbG93ZWRIb3N0cyA9IGVudlsnVklURV9BTExPV0VEX0hPU1RTJ11cclxuICAgID8gZW52WydWSVRFX0FMTE9XRURfSE9TVFMnXVxyXG4gICAgICAuc3BsaXQoJywnKVxyXG4gICAgICAubWFwKChob3N0KSA9PiBob3N0LnRyaW0oKSlcclxuICAgICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgOiBbJ2xvY2FsaG9zdCcsICcxMjcuMC4wLjEnLCAnLmxvY2FsaG9zdCcsICcubHZoLm1lJ107XHJcblxyXG4gIGNvbnNvbGUubG9nKCdcdTI2QTEgVml0ZSBDb25maWc6IFJlc29sdmluZyBAIGFsaWFzIHRvOicsIHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkobW9kZSksXHJcbiAgICAgICdwcm9jZXNzLmVudic6IHt9LFxyXG4gICAgICAnZ2xvYmFsJzogJ3dpbmRvdycsXHJcbiAgICB9LFxyXG4gICAgcm9vdDogJy4nLFxyXG4gICAgLy8gUGF0aCByZXNvbHV0aW9uXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiBbXHJcbiAgICAgICAgeyBmaW5kOiAnQCcsIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICAhZGlzYWJsZUNvbXByZXNzaW9uICYmXHJcbiAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcclxuICAgICAgICAgIGFsZ29yaXRobTogJ2d6aXAnLFxyXG4gICAgICAgICAgZXh0OiAnLmd6JyxcclxuICAgICAgICAgIHRocmVzaG9sZDogMTAyNDAsXHJcbiAgICAgICAgICB2ZXJib3NlOiBmYWxzZSxcclxuICAgICAgICB9KSxcclxuICAgICAgIWRpc2FibGVDb21wcmVzc2lvbiAmJlxyXG4gICAgICAgIHZpdGVDb21wcmVzc2lvbih7XHJcbiAgICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycsXHJcbiAgICAgICAgICBleHQ6ICcuYnInLFxyXG4gICAgICAgICAgdGhyZXNob2xkOiAxMDI0MCxcclxuICAgICAgICAgIHZlcmJvc2U6IGZhbHNlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgLSBvbmx5IGluIGFuYWx5emUgbW9kZVxyXG4gICAgICBtb2RlID09PSAnYW5hbHl6ZScgJiYgdmlzdWFsaXplcih7XHJcbiAgICAgICAgb3BlbjogdHJ1ZSxcclxuICAgICAgICBmaWxlbmFtZTogJ2Rpc3Qvc3RhdHMuaHRtbCcsXHJcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXHJcbiAgICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogJ3RyZWVtYXAnLFxyXG4gICAgICB9KSxcclxuICAgIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG5cclxuICAgIC8qIEZpeCBmb3IgV2ViU29ja2V0IEhNUiAmIFByb3h5IGlzc3VlcyAqL1xyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIHBvcnQ6IHBhcnNlSW50KGVudlsnVklURV9QT1JUJ10gfHwgJzMwMDAnKSxcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgICAgYWxsb3dlZEhvc3RzLFxyXG4gICAgICBvcGVuOiBmYWxzZSxcclxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgICAgY29yczogdHJ1ZSxcclxuICAgICAgaG1yOiB7XHJcbiAgICAgICAgcHJvdG9jb2w6ICd3cycsXHJcbiAgICAgICAgLi4uKGVudlsnVklURV9ITVJfSE9TVCddID8geyBob3N0OiBlbnZbJ1ZJVEVfSE1SX0hPU1QnXSB9IDoge30pLFxyXG4gICAgICAgIC4uLihleHBsaWNpdEhtclBvcnRcclxuICAgICAgICAgID8ge1xyXG4gICAgICAgICAgICAgIHBvcnQ6IGV4cGxpY2l0SG1yUG9ydCxcclxuICAgICAgICAgICAgICBjbGllbnRQb3J0OiBleHBsaWNpdEhtclBvcnQsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIDoge30pLFxyXG4gICAgICAgIG92ZXJsYXk6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb3h5OiB7XHJcbiAgICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IHByb3h5VGFyZ2V0LFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgICcvd2ViaG9va3MnOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IHByb3h5VGFyZ2V0LFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiBwcm94eVRhcmdldCxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogZmFsc2UsXHJcbiAgICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgICcvdXBsb2Fkcyc6IHtcclxuICAgICAgICAgIHRhcmdldDogcHJveHlUYXJnZXQsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIE9wdGltaXphdGlvblxyXG4gICAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICAgIGluY2x1ZGU6IFtcclxuICAgICAgICAncmVhY3QnLFxyXG4gICAgICAgICdyZWFjdC9qc3gtcnVudGltZScsXHJcbiAgICAgICAgJ3JlYWN0L2pzeC1kZXYtcnVudGltZScsXHJcbiAgICAgICAgJ3JlYWN0LWRvbScsXHJcbiAgICAgICAgJ3JlYWN0LWRvbS9jbGllbnQnLFxyXG4gICAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcclxuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcclxuICAgICAgICAnYXhpb3MnLFxyXG4gICAgICAgIC8vIFJlYWN0IHN1YnBhdGggcnVudGltZXMgY2FuIGJlIHJlcXVlc3RlZCBiZWZvcmUgVml0ZSBmaW5pc2hlc1xyXG4gICAgICAgIC8vIGluZmVycmluZyB0aGVtIGZyb20gdHJhbnNmb3JtZWQgVFNYIG9uIFdpbmRvd3MsIHdoaWNoIGxlYXZlcyB0aGVcclxuICAgICAgICAvLyBicm93c2VyIHN0dWNrIG9uIDUwNCBcIk91dGRhdGVkIE9wdGltaXplIERlcFwiIGZvciB0aGUgaG9tZSBwYWdlLlxyXG4gICAgICAgICdzY2hlZHVsZXInLFxyXG4gICAgICAgIC8vIExhenktbG9hZGVkIG9yZGVyIHNjcmVlbnMgaW1wb3J0IGRhdGUtZm5zIGZvciB0aGUgZmlyc3QgdGltZSBkdXJpbmdcclxuICAgICAgICAvLyBuYXZpZ2F0aW9uOyBwcmVidW5kbGluZyBpdCB1cCBmcm9udCBhdm9pZHMgZGV2LXRpbWUgNTA0XHJcbiAgICAgICAgLy8gXCJPdXRkYXRlZCBPcHRpbWl6ZSBEZXBcIiByZXNwb25zZXMgd2hpbGUgVml0ZSByZS1vcHRpbWl6ZXMgZGVwcy5cclxuICAgICAgICAnZGF0ZS1mbnMnLFxyXG4gICAgICAgIC8vIFNoYXJlZCBVSSB3cmFwcGVycyBkZWVwLWltcG9ydCBCYXNlIFVJIHByaW1pdGl2ZXM7IHByZWJ1bmRsZSB0aGVcclxuICAgICAgICAvLyBkaWFsb2cgcHJpbWl0aXZlcyB0aGF0IGFwcGVhciBpbiBsYXp5LWxvYWRlZCBhZG1pbiByb3V0ZXMgdG8gYXZvaWRcclxuICAgICAgICAvLyBkZXYtdGltZSA1MDQgXCJPdXRkYXRlZCBPcHRpbWl6ZSBEZXBcIiBmYWlsdXJlcyBkdXJpbmcgbmF2aWdhdGlvbi5cclxuICAgICAgICAnQGJhc2UtdWkvcmVhY3QvZGlhbG9nJyxcclxuICAgICAgICAnQGJhc2UtdWkvcmVhY3QvYWxlcnQtZGlhbG9nJyxcclxuICAgICAgXSxcclxuICAgIH0sXHJcblxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgbWluaWZ5OiBidWlsZE1pbmlmaWVyLFxyXG4gICAgICAuLi4oYnVpbGRNaW5pZmllciA9PT0gJ3RlcnNlcidcclxuICAgICAgICA/IHtcclxuICAgICAgICAgICAgdGVyc2VyT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNvbXByZXNzOiB7XHJcbiAgICAgICAgICAgICAgICBkcm9wX2NvbnNvbGU6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgICAgICAgICAgIGRyb3BfZGVidWdnZXI6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgICAgICAgICAgIHB1cmVfZnVuY3M6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5kZWJ1ZyddIDogW10sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBtYW5nbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICBjb21tZW50czogZmFsc2UsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH1cclxuICAgICAgICA6IHt9KSxcclxuICAgICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICAgIHRhcmdldDogJ2VzbmV4dCcsXHJcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nXHJcbiAgICAgICAgPyAoZW5hYmxlQnVpbGRTb3VyY2VtYXAgPyAnaGlkZGVuJyA6IGZhbHNlKVxyXG4gICAgICAgIDogdHJ1ZSxcclxuICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxyXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMCxcclxuICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgLy8gbWF4UGFyYWxsZWxGaWxlT3BzIHJlbW92ZWQgXHUyMDE0IGRlZmF1bHQgKDIwKSBpcyBmYXN0ZXIgZm9yIENJL0NEXHJcbiAgICAgICAgb253YXJuKHdhcm5pbmcsIHdhcm4pIHtcclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgd2FybmluZy5jb2RlID09PSAnTU9EVUxFX0xFVkVMX0RJUkVDVElWRScgJiZcclxuICAgICAgICAgICAgdHlwZW9mIHdhcm5pbmcubWVzc2FnZSA9PT0gJ3N0cmluZycgJiZcclxuICAgICAgICAgICAgd2FybmluZy5tZXNzYWdlLmluY2x1ZGVzKCd1c2UgY2xpZW50JylcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSAnU09VUkNFTUFQX0VSUk9SJykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB3YXJuKHdhcm5pbmcpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZElkID0gaWQucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xyXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVuZG9yQ2h1bmtOYW1lKG5vcm1hbGl6ZWRJZCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRMLFNBQVMsY0FBYyxlQUFlO0FBQ2xPLE9BQU8sV0FBVztBQUNsQixPQUFPLHFCQUFxQjtBQUM1QixTQUFTLGtCQUFrQjtBQUMzQixTQUFTLFNBQVMsZUFBZTtBQUNqQyxPQUFPLFFBQVE7QUFDZixTQUFTLHFCQUFxQjtBQU5pRixJQUFNLDJDQUEyQztBQVFoSyxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksUUFBUSxVQUFVO0FBQ3BDLElBQU0sdUJBQXVCO0FBQzdCLElBQU0seUJBQXlCLG9CQUFJLElBQUk7QUFBQSxFQUNyQztBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtB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
