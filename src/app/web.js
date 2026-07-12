// Web distribution entry point.
// Wires pure core modules to platform adapters and boots the Web UI.
// This file is the bundle entry for the Web (and Capacitor-over-WebView) build;
// index.html (Task 34) loads the bundle that starts here.

import { initPresetManager } from '../core/preset.js';
import { initExporter } from '../core/exporter.js';
import { initI18n, currentLanguage, onLanguageChanged } from '../core/i18n.js';
import { readExif } from '../core/exif-reader.js';
import { webStorage, webImageDecoder, webFileSaver, webNotifier } from '../platform/web/index.js';
import { capacitorFileSaver, capacitorNotifier, isAndroid } from '../platform/capacitor/index.js';
import { requestAndroidPermissions } from '../platform/capacitor/capacitor-permissions.js';
import { initDomI18n, initTheme } from '../platform/web/dom-i18n.js';
import { createApp } from '../ui/web/main.js';

// Select platform adapters based on whether we're running in Capacitor (Android).
// Capacitor runs inside a WebView, so it reuses the web image decoder (Canvas).
const fileSaver = isAndroid() ? capacitorFileSaver : webFileSaver;
const notifier = isAndroid() ? capacitorNotifier : webNotifier;
const imageDecoder = webImageDecoder;

// Initialize core modules with injected platform adapters.
// Both web and capacitor use localStorage-backed storage.
initPresetManager({ storage: webStorage });
initExporter({ fileSaver, notifier });

// Initialize i18n. Core has no LanguageDetector, so detect the language here.
const detectedLanguage = (() => {
  try {
    const stored = localStorage.getItem('exif-editor.language');
    if (stored) return stored;
  } catch (_) { /* private mode / unavailable */ }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
})();

await initI18n({ language: detectedLanguage });
// Bind DOM direction (RTL/LTR) to core i18n language-change events.
initDomI18n({ onLanguageChanged, currentLanguage });
initTheme();

// Request Android permissions (notifications + storage) if running on Android.
if (isAndroid()) {
  requestAndroidPermissions().catch(() => { /* permissions unavailable — ignore */ });
}

// Create and start the app, injecting the readExif function bound to the
// platform image decoder.
await createApp({ readExif: (file) => readExif(file, { imageDecoder }) });
