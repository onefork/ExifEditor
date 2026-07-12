import { defineConfig } from 'vite';

// `base` 按构建模式切换:
//   - `vite build --mode web`  -> '/ExifEditor/'  用于 GitHub Pages 子路径部署
//   - `vite build --mode vue`  -> '/ExifEditor/'  Vue SPA 同样部署到 Pages 子路径
//   - `vite build --mode react`-> '/ExifEditor/'  React SPA 同样部署到 Pages 子路径
//   - 其它 (默认 production)    -> '/'              用于 Capacitor WebView (把 dist/ 当根)
export default defineConfig(async ({ mode }) => {
  const plugins = [];

  // Vue 模式：加载 @vitejs/plugin-vue（仅在该模式下动态导入，包未安装时跳过）
  if (mode === 'vue') {
    try {
      const { default: vue } = await import('@vitejs/plugin-vue');
      plugins.push(vue());
    } catch {
      console.warn('[vite] @vitejs/plugin-vue not installed, skipping Vue plugin');
    }
  }

  // React 模式：加载 @vitejs/plugin-react（仅在该模式下动态导入）
  if (mode === 'react') {
    try {
      const { default: react } = await import('@vitejs/plugin-react');
      plugins.push(react());
    } catch {
      console.warn('[vite] @vitejs/plugin-react not installed, skipping React plugin');
    }
  }

  // Vue / React 模式使用各自的 HTML 入口
  const inputHtml = mode === 'vue'
    ? new URL('./index-vue.html', import.meta.url).pathname
    : mode === 'react'
      ? new URL('./index-react.html', import.meta.url).pathname
      : new URL('./index.html', import.meta.url).pathname;

  return {
    base: mode === 'web' || mode === 'vue' || mode === 'react' ? '/ExifEditor/' : '/',
    plugins,
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
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        input: {
          main: inputHtml,
        },
      },
    },
    server: {
      host: true,
      port: 5173,
    },
  };
});
