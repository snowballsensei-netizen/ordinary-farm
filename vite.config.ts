import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true, port: 5199 },
  build: { chunkSizeWarningLimit: 2500 },
});
