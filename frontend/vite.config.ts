import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';

const backendUrl =
  process.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'https://training-api.test';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false, // allow self-signed certs from Herd
      },
      '/sanctum': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
      '/storage': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
