import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    host: true,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Firebase shim aliases (Workstream B2: Firebase removal)
      // Redirect firebase imports to local API-backed shims
      "firebase/firestore": path.resolve(__dirname, "./src/lib/firestore-shim/index.ts"),
      "firebase/functions": path.resolve(__dirname, "./src/lib/firebase-shim/functions.ts"),
      "firebase/storage": path.resolve(__dirname, "./src/lib/firebase-shim/storage.ts"),
      "firebase/app": path.resolve(__dirname, "./src/lib/firebase-shim/app.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is copied to dist
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'sw.js') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  publicDir: 'public',
}));
