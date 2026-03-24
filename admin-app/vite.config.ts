import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy Netlify functions to the main site during local dev
    proxy: {
      '/.netlify/functions': {
        target: 'https://growth4u.io',
        changeOrigin: true,
      },
    },
  },
});
