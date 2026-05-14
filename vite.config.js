// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ReactCompilerConfig = { target: '19' };

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
  ],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 5173,
  },
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});