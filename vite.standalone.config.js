import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

// guruguru profile ページの単一 HTML 書き出し用（→ guruguru-standalone.html）。
// JS/CSS を全部インラインし、画像素材は本番同様 CDN 絶対 URL のまま参照する
// （wall-asset.js / character-config.js / oc-layers.js がすべて CDN 直指しのため）。
// 使い方: npm run build:standalone
export default defineConfig({
  base: '/',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-standalone',
    rollupOptions: {
      input: resolve(import.meta.dirname, 'guruguru.html'),
    },
  },
});
