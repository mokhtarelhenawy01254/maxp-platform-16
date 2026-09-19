import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            path.resolve(__dirname, 'src/renderer/**/*.{html,js,ts,jsx,tsx}'),
            path.resolve(__dirname, 'src/renderer/index.html'),
          ],
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                background: '#020617',
              },
            },
          },
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 5175,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
