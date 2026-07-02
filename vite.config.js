import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  // GitHub Pages はリポジトリ名のサブパス配信なので build 時のみ base を付ける。
  // Vercel はルート配信（ビルド環境に VERCEL=1 が立つ）なので '/' のまま。
  base: !process.env.VERCEL && command === 'build' ? '/tomari-guruguru/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    open: '/talk.html',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        guruguru: resolve(import.meta.dirname, 'guruguru.html'),
        talk: resolve(import.meta.dirname, 'talk.html'),
        oclive: resolve(import.meta.dirname, 'oc-live.html'),
      },
    },
  },
}));
