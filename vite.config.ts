/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8096', '/_': 'http://127.0.0.1:8096' },
  },
  build: { outDir: 'pocketbase/pb_public', emptyOutDir: true },
  test: { globalSetup: 'tests/setup.ts', testTimeout: 20000 },
})
