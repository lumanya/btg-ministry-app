import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the dashboard works at any address (e.g. GitHub Pages at /btg-ministry-app/).
  base: './',
});
