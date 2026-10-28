/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      // só latim e sem o wasm do scanner (que precisa de rede de qualquer jeito): precache enxuto
      injectManifest: { globPatterns: ['**/*.{js,css,html,webp,svg}', 'assets/inter-latin-*.woff2', 'pwa-192.png'] },
      manifest: {
        name: 'Galáticos',
        short_name: 'Galáticos',
        description: 'Listas, passaporte e times dos jogos do Galáticos.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F0F11',
        theme_color: '#0F0F11',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8096', '/_': 'http://127.0.0.1:8096' },
  },
  build: { outDir: 'pocketbase/pb_public', emptyOutDir: true },
  test: { include: ['tests/**/*.test.ts'], globalSetup: 'tests/setup.ts', testTimeout: 20000 },
})
