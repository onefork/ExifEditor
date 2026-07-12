import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../ui/react/App.jsx';
import { initPresetManager, initExporter, initI18n, readExif } from '../core/index.js';
import { webStorage, webImageDecoder, webFileSaver, webNotifier } from '../platform/web/index.js';
import { initDomI18n, initTheme } from '../platform/web/dom-i18n.js';
import { onLanguageChanged, currentLanguage } from '../core/i18n.js';

// --- Inject platform adapters into the core layer ---
initPresetManager({ storage: webStorage });
initExporter({ fileSaver: webFileSaver, notifier: webNotifier });

// --- Detect initial language (localStorage -> navigator -> fallback) ---
const detectedLanguage = (() => {
  try {
    const s = localStorage.getItem('exif-editor.language');
    if (s) return s;
  } catch (_) { /* ignore */ }
  return (typeof navigator !== 'undefined' && navigator.language) || 'en';
})();

// initI18n returns a promise (i18next.init); await before rendering so the
// first render uses the correct language pack.
await initI18n({ language: detectedLanguage });

// initDomI18n takes a single coreI18n object exposing onLanguageChanged + currentLanguage.
initDomI18n({ onLanguageChanged, currentLanguage });
initTheme();

// Bind the web image decoder to readExif so the store decodes thumbnails.
const imageDecoder = webImageDecoder;
const readExifWithDecoder = (file) => readExif(file, { imageDecoder });

const root = createRoot(document.getElementById('app'));
root.render(React.createElement(App, { readExif: readExifWithDecoder }));
