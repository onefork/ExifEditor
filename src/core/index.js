// Core layer barrel file — re-exports all core module public APIs.
// This file contains ONLY re-exports; no business logic.
// Other modules (utils.js, exif-reader.js, exif-writer.js, exporter.js) are
// created by parallel agents; export names below follow the spec (FR-7).

export * from './utils.js';
export { readExif } from './exif-reader.js';
export { writeExif } from './exif-writer.js';
export { createImageStore, EDITABLE_FIELDS } from './image-store.js';
export {
  initPresetManager,
  listPresets,
  savePreset,
  deletePreset,
  getPresetDisplayName,
  applyPresetToImage,
  movePresetUp,
  movePresetDown,
  ensureDefaultsOnce,
  DEFAULT_PRESETS,
} from './preset.js';
export {
  initExporter,
  exportOneByOne,
  exportZip,
} from './exporter.js';
export {
  initI18n,
  t,
  changeLanguage,
  currentLanguage,
  onLanguageChanged,
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  isRTL,
} from './i18n.js';
