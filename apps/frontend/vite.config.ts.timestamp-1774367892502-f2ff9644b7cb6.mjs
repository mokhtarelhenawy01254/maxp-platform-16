// vite.config.ts
import { defineConfig, loadEnv } from "file:///H:/max_p_new/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///H:/max_p_new/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import viteCompression from "file:///H:/max_p_new/frontend/node_modules/vite-plugin-compression/dist/index.mjs";
import { visualizer } from "file:///H:/max_p_new/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///H:/max_p_new/frontend/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const disableCompression = env["VITE_DISABLE_COMPRESSION"] === "1" || env["VITE_DISABLE_COMPRESSION"] === "true";
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
          target: env["VITE_PROXY_TARGET"] || "http://localhost:3007",
          changeOrigin: false
        },
        "/webhooks": {
          target: env["VITE_PROXY_TARGET"] || "http://localhost:3007",
          changeOrigin: false
        },
        "/socket.io": {
          target: env["VITE_PROXY_TARGET"] || "http://localhost:3007",
          changeOrigin: false,
          ws: true
        },
        "/uploads": {
          target: env["VITE_PROXY_TARGET"] || "http://localhost:3007",
          changeOrigin: false
        }
      }
    },
    // Optimization
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "axios"
      ]
    },
    build: {
      // Drop console and debugger in production
      esbuild: {
        drop: mode === "production" ? ["console", "debugger"] : []
      },
      outDir: "dist",
      target: "es2020",
      sourcemap: mode === "production" ? enableBuildSourcemap ? "hidden" : false : true,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 2e3,
      reportCompressedSize: false,
      rollupOptions: {
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
            if (!normalizedId.includes("node_modules")) {
              return;
            }
            if (normalizedId.includes("/recharts/") || normalizedId.includes("/chart.js/") || normalizedId.includes("/react-chartjs-2/")) {
              return "vendor-charts";
            }
            if (normalizedId.includes("/@craftjs/") || normalizedId.includes("/@dnd-kit/")) {
              return "vendor-builder";
            }
            if (normalizedId.includes("/date-fns/") || normalizedId.includes("/react-datepicker/") || normalizedId.includes("/@mui/x-date-pickers/")) {
              return "vendor-dates";
            }
            if (normalizedId.includes("/framer-motion/") || normalizedId.includes("/emoji-picker-react/") || normalizedId.includes("/react-select/")) {
              return "vendor-interactive";
            }
            if (normalizedId.includes("/jspdf/") || normalizedId.includes("/jspdf-autotable/") || normalizedId.includes("/xlsx/")) {
              return "vendor-export";
            }
            return "vendor-core";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJIOlxcXFxtYXhfcF9uZXdcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkg6XFxcXG1heF9wX25ld1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSDovbWF4X3BfbmV3L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHZpdGVDb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbic7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCB7IHJlc29sdmUsIGRpcm5hbWUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gZGlybmFtZShfX2ZpbGVuYW1lKTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCBlbnYgZmlsZSBiYXNlZCBvbiBgbW9kZWAgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuICBjb25zdCBkaXNhYmxlQ29tcHJlc3Npb24gPVxuICAgIGVudlsnVklURV9ESVNBQkxFX0NPTVBSRVNTSU9OJ10gPT09ICcxJyB8fFxuICAgIGVudlsnVklURV9ESVNBQkxFX0NPTVBSRVNTSU9OJ10gPT09ICd0cnVlJztcbiAgY29uc3QgZW5hYmxlQnVpbGRTb3VyY2VtYXAgPVxuICAgIGVudlsnVklURV9CVUlMRF9TT1VSQ0VNQVAnXSA9PT0gJzEnIHx8XG4gICAgZW52WydWSVRFX0JVSUxEX1NPVVJDRU1BUCddID09PSAndHJ1ZSc7XG4gIGNvbnN0IGV4cGxpY2l0SG1yUG9ydCA9IGVudlsnVklURV9ITVJfUE9SVCddXG4gICAgPyBwYXJzZUludChlbnZbJ1ZJVEVfSE1SX1BPUlQnXSwgMTApXG4gICAgOiB1bmRlZmluZWQ7XG4gIGNvbnN0IGFsbG93ZWRIb3N0cyA9IGVudlsnVklURV9BTExPV0VEX0hPU1RTJ11cbiAgICA/IGVudlsnVklURV9BTExPV0VEX0hPU1RTJ11cbiAgICAgIC5zcGxpdCgnLCcpXG4gICAgICAubWFwKChob3N0KSA9PiBob3N0LnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICA6IFsnbG9jYWxob3N0JywgJzEyNy4wLjAuMScsICcubG9jYWxob3N0JywgJy5sdmgubWUnXTtcblxuICBjb25zb2xlLmxvZygnXHUyNkExIFZpdGUgQ29uZmlnOiBSZXNvbHZpbmcgQCBhbGlhcyB0bzonLCByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJykpO1xuXG4gIHJldHVybiB7XG4gICAgZGVmaW5lOiB7XG4gICAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShtb2RlKSxcbiAgICAgICdwcm9jZXNzLmVudic6IHt9LFxuICAgICAgJ2dsb2JhbCc6ICd3aW5kb3cnLFxuICAgIH0sXG4gICAgcm9vdDogJy4nLFxuICAgIC8vIFBhdGggcmVzb2x1dGlvblxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiBbXG4gICAgICAgIHsgZmluZDogJ0AnLCByZXBsYWNlbWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICAhZGlzYWJsZUNvbXByZXNzaW9uICYmXG4gICAgICAgIHZpdGVDb21wcmVzc2lvbih7XG4gICAgICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXG4gICAgICAgICAgZXh0OiAnLmd6JyxcbiAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQwLFxuICAgICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICB9KSxcbiAgICAgICFkaXNhYmxlQ29tcHJlc3Npb24gJiZcbiAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycsXG4gICAgICAgICAgZXh0OiAnLmJyJyxcbiAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQwLFxuICAgICAgICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgICAgICB9KSxcbiAgICAgIC8vIEJ1bmRsZSBhbmFseXplciAtIG9ubHkgaW4gYW5hbHl6ZSBtb2RlXG4gICAgICBtb2RlID09PSAnYW5hbHl6ZScgJiYgdmlzdWFsaXplcih7XG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgIHRlbXBsYXRlOiAndHJlZW1hcCcsXG4gICAgICB9KSxcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcblxuICAgIC8qIEZpeCBmb3IgV2ViU29ja2V0IEhNUiAmIFByb3h5IGlzc3VlcyAqL1xuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogcGFyc2VJbnQoZW52WydWSVRFX1BPUlQnXSB8fCAnMzAwMCcpLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGFsbG93ZWRIb3N0cyxcbiAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICAgIGNvcnM6IHRydWUsXG4gICAgICBobXI6IHtcbiAgICAgICAgcHJvdG9jb2w6ICd3cycsXG4gICAgICAgIC4uLihlbnZbJ1ZJVEVfSE1SX0hPU1QnXSA/IHsgaG9zdDogZW52WydWSVRFX0hNUl9IT1NUJ10gfSA6IHt9KSxcbiAgICAgICAgLi4uKGV4cGxpY2l0SG1yUG9ydFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBwb3J0OiBleHBsaWNpdEhtclBvcnQsXG4gICAgICAgICAgICAgIGNsaWVudFBvcnQ6IGV4cGxpY2l0SG1yUG9ydCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHt9KSxcbiAgICAgICAgb3ZlcmxheTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudlsnVklURV9QUk9YWV9UQVJHRVQnXSB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDA3JyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL3dlYmhvb2tzJzoge1xuICAgICAgICAgIHRhcmdldDogZW52WydWSVRFX1BST1hZX1RBUkdFVCddIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDcnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICAgIHRhcmdldDogZW52WydWSVRFX1BST1hZX1RBUkdFVCddIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDcnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogZmFsc2UsXG4gICAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgICcvdXBsb2Fkcyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudlsnVklURV9QUk9YWV9UQVJHRVQnXSB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDA3JyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gT3B0aW1pemF0aW9uXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdyZWFjdCcsXG4gICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAnYXhpb3MnLFxuICAgICAgXSxcbiAgICB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgIC8vIERyb3AgY29uc29sZSBhbmQgZGVidWdnZXIgaW4gcHJvZHVjdGlvblxuICAgICAgZXNidWlsZDoge1xuICAgICAgICBkcm9wOiBtb2RlID09PSAncHJvZHVjdGlvbicgPyBbJ2NvbnNvbGUnLCAnZGVidWdnZXInXSA6IFtdLFxuICAgICAgfSxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nXG4gICAgICAgID8gKGVuYWJsZUJ1aWxkU291cmNlbWFwID8gJ2hpZGRlbicgOiBmYWxzZSlcbiAgICAgICAgOiB0cnVlLFxuICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAyMDAwLFxuICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvbndhcm4od2FybmluZywgd2Fybikge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHdhcm5pbmcuY29kZSA9PT0gJ01PRFVMRV9MRVZFTF9ESVJFQ1RJVkUnICYmXG4gICAgICAgICAgICB0eXBlb2Ygd2FybmluZy5tZXNzYWdlID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgd2FybmluZy5tZXNzYWdlLmluY2x1ZGVzKCd1c2UgY2xpZW50JylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdhcm5pbmcuY29kZSA9PT0gJ1NPVVJDRU1BUF9FUlJPUicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2Fybih3YXJuaW5nKTtcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkSWQgPSBpZC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAgICAgICAgIGlmICghbm9ybWFsaXplZElkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvcmVjaGFydHMvJykgfHxcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvY2hhcnQuanMvJykgfHxcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvcmVhY3QtY2hhcnRqcy0yLycpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY2hhcnRzJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9AY3JhZnRqcy8nKSB8fFxuICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9AZG5kLWtpdC8nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWJ1aWxkZXInO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL2RhdGUtZm5zLycpIHx8XG4gICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL3JlYWN0LWRhdGVwaWNrZXIvJykgfHxcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvQG11aS94LWRhdGUtcGlja2Vycy8nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWRhdGVzJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9mcmFtZXItbW90aW9uLycpIHx8XG4gICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL2Vtb2ppLXBpY2tlci1yZWFjdC8nKSB8fFxuICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJy9yZWFjdC1zZWxlY3QvJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pbnRlcmFjdGl2ZSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvanNwZGYvJykgfHxcbiAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvanNwZGYtYXV0b3RhYmxlLycpIHx8XG4gICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnL3hsc3gvJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1leHBvcnQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1jb3JlJztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVQLFNBQVMsY0FBYyxlQUFlO0FBQzdSLE9BQU8sV0FBVztBQUNsQixPQUFPLHFCQUFxQjtBQUM1QixTQUFTLGtCQUFrQjtBQUMzQixTQUFTLFNBQVMsZUFBZTtBQUNqQyxTQUFTLHFCQUFxQjtBQUx5SCxJQUFNLDJDQUEyQztBQU94TSxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksUUFBUSxVQUFVO0FBR3BDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFNLHFCQUNKLElBQUksMEJBQTBCLE1BQU0sT0FDcEMsSUFBSSwwQkFBMEIsTUFBTTtBQUN0QyxRQUFNLHVCQUNKLElBQUksc0JBQXNCLE1BQU0sT0FDaEMsSUFBSSxzQkFBc0IsTUFBTTtBQUNsQyxRQUFNLGtCQUFrQixJQUFJLGVBQWUsSUFDdkMsU0FBUyxJQUFJLGVBQWUsR0FBRyxFQUFFLElBQ2pDO0FBQ0osUUFBTSxlQUFlLElBQUksb0JBQW9CLElBQ3pDLElBQUksb0JBQW9CLEVBQ3ZCLE1BQU0sR0FBRyxFQUNULElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLEVBQ3pCLE9BQU8sT0FBTyxJQUNmLENBQUMsYUFBYSxhQUFhLGNBQWMsU0FBUztBQUV0RCxVQUFRLElBQUksNkNBQXdDLFFBQVEsV0FBVyxPQUFPLENBQUM7QUFFL0UsU0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLE1BQ04sd0JBQXdCLEtBQUssVUFBVSxJQUFJO0FBQUEsTUFDM0MsZUFBZSxDQUFDO0FBQUEsTUFDaEIsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLE1BQU07QUFBQTtB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
