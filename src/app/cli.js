#!/usr/bin/env node

// CLI entry point — creates Node.js platform adapters, injects them into the
// core layer, and launches the CLI interface.

import {
  initPresetManager,
  initExporter,
  initI18n,
  readExif,
  writeExif,
  createImageStore,
  exportOneByOne,
  exportZip,
  listPresets,
  savePreset,
  deletePreset,
  getPresetDisplayName,
  applyPresetToImage,
  movePresetUp,
  movePresetDown,
  ensureDefaultsOnce,
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  t,
  humanSize,
  formatExifDate,
  formatGps,
  parseExifDate,
  dtToExif,
} from '../core/index.js';

import {
  nodeStorage,
  nodeImageDecoder,
  createNodeFileSaver,
  nodeNotifier,
} from '../platform/node/index.js';

import { runCli } from '../ui/cli/index.js';

// --- Initialize core layer with Node.js adapters ---
initPresetManager({ storage: nodeStorage });
initExporter({ fileSaver: createNodeFileSaver(process.cwd()), notifier: nodeNotifier });

// Detect language from process.env.LANG (e.g. "en_US.UTF-8" → "en-US").
// Falls back to English if the detected language is not supported.
const envLang = (process.env.LANG || FALLBACK_LANGUAGE).split('.')[0].replace('_', '-');
const lang = SUPPORTED_LANGUAGES.some((l) => l.code === envLang) ? envLang : FALLBACK_LANGUAGE;
await initI18n({ language: lang });

// --- Assemble deps for the CLI UI layer ---
// readExif is bound with the Node.js image decoder so the UI layer doesn't
// need to know about platform-specific adapters.
const readExifWithDecoder = (file) => readExif(file, { imageDecoder: nodeImageDecoder });

const deps = {
  readExif: readExifWithDecoder,
  writeExif,
  createImageStore: (opts) => createImageStore({ readExif: readExifWithDecoder, ...opts }),
  exportOneByOne,
  exportZip,
  listPresets,
  savePreset,
  deletePreset,
  getPresetDisplayName,
  applyPresetToImage,
  movePresetUp,
  movePresetDown,
  ensureDefaultsOnce,
  humanSize,
  formatExifDate,
  formatGps,
  parseExifDate,
  dtToExif,
  t,
  // Re-initialize the exporter with a file saver pointing at a custom output dir.
  // Used by batch/export --output-dir.
  setOutputDir: (dir) => {
    initExporter({ fileSaver: createNodeFileSaver(dir), notifier: nodeNotifier });
  },
};

runCli(deps).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
