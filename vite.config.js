import { defineConfig } from 'vite';

// `base` 按构建模式切换:
//   - `vite build --mode web`  -> '/ExifEditor/'  用于 GitHub Pages 子路径部署
//   - 其它 (默认 production)    -> '/'              用于 Capacitor WebView (把 dist/ 当根)
export default defineConfig(({ mode }) => ({
  base: mode === 'web' ? '/ExifEditor/' : '/',
  optimizeDeps: {
    include: ['piexifjs', 'jszip', 'i18next', 'i18next-browser-languagedetector'],
    esbuildOptions: {
      mainFields: ['module', 'main'],
      platform: 'browser',
    },
  },
  commonjsOptions: {
    include: [/node_modules/],
    transformMixedEsModules: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}));
