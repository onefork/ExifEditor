// Web platform barrel file — re-exports all web platform adapters.
// This file contains ONLY re-exports; no logic.

export { webStorage } from './web-storage.js';
export { webImageDecoder, applyOrientation } from './web-image-decoder.js';
export { webFileSaver, triggerBrowserDownload } from './web-file-saver.js';
export { webNotifier } from './web-notifier.js';
export {
  setDocumentDirection,
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  applyTheme,
  getStoredTheme,
  setTheme,
  initTheme,
  initDomI18n,
} from './dom-i18n.js';
