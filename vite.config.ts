import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build also works when hosted under a sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // React changes rarely, so it caches independently of the app code.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  server: { port: 5190 },
  preview: { port: 4173 },
});
