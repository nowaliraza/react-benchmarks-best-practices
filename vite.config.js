import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(() => {
  const buildType = process.env.LAB_BUILD_TYPE ?? 'production';
  const matrixBuild = process.env.LAB_BUILD_TYPE !== undefined;
  return {
    plugins: [react()],
    define: { __LAB_BUILD_TYPE__: JSON.stringify(buildType) },
    resolve: {
      alias: buildType === 'profiling'
        ? [{ find: 'react-dom/client', replacement: path.resolve('node_modules/react-dom/profiling.js') }]
        : [],
    },
    build: {
      sourcemap: true,
      manifest: true,
      outDir: matrixBuild ? `dist/${buildType}` : 'dist',
      emptyOutDir: !matrixBuild || buildType === 'production',
    },
    server: { strictPort: true },
    preview: { strictPort: true },
  };
});
