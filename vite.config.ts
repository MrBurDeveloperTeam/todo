import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore Shared JavaScript build integration.
import { sharedGamesPlugin } from './node_modules/@mrburdeveloperteam/pet-function/scripts/vite-games.mjs';

export default defineConfig({
  plugins: [react(), sharedGamesPlugin()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://sso.mrburstudio.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
