// Vue SPA entry point.
// Creates Web platform adapters, injects them into the pure core layer,
// initializes i18n/theme, and mounts the root Vue component.
//
// Resolving the `vue` import requires @vitejs/plugin-vue (added in Task 34).
import { createApp } from 'vue';
import App from '../ui/vue/App.vue';
import {
  initPresetManager,
  initExporter,
  initI18n,
  readExif,
  onLanguageChanged,
  currentLanguage,
} from '../core/index.js';
import {
  webStorage,
  webImageDecoder,
  webFileSaver,
  webNotifier,
} from '../platform/web/index.js';
import { initDomI18n, initTheme } from '../platform/web/dom-i18n.js';

// Inject Web adapters into the pure core modules.
initPresetManager({ storage: webStorage });
initExporter({ fileSaver: webFileSaver, notifier: webNotifier });

// Detect initial language: localStorage → navigator → fallback 'en'.
const detectedLanguage = (() => {
  try {
    const stored = localStorage.getItem('exif-editor.language');
    if (stored) return stored;
  } catch (_) { /* ignore */ }
  return (typeof navigator !== 'undefined' && navigator.language) || 'en';
})();

// Initialize the pure i18n engine (no DOM side-effects here).
await initI18n({ language: detectedLanguage });

// Bind DOM side-effects (document direction) to the core i18n language-changed
// event. initDomI18n expects an object with onLanguageChanged(cb) and
// currentLanguage() — both are exported by core/i18n.js.
initDomI18n({ onLanguageChanged, currentLanguage });

// Apply persisted / system theme to <html data-theme>.
initTheme();

// Wire the Web image decoder into readExif (core accepts an injected decoder).
const imageDecoder = webImageDecoder;
const readExifWithDecoder = (file) => readExif(file, { imageDecoder });

const app = createApp(App, { readExif: readExifWithDecoder });
app.mount('#app');
