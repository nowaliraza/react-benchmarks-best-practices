import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    manifest: true,
  },
  server: { strictPort: true },
  preview: { strictPort: true },
});
