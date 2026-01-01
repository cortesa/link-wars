import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Required for Docker on some systems
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['phaser'],
  },
});
