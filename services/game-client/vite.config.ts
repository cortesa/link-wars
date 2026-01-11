import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    watch: {
      usePolling: true, // Required for Docker on some systems
    },
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game.html"),
        thumbnail: resolve(__dirname, "thumbnail.html"),
      },
    },
  },
  optimizeDeps: {
    include: ["phaser"],
  },
});
