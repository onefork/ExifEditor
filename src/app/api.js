// API entry point — creates Node.js adapters, injects them into core modules,
// and starts the HTTP API server.
//
// Run with: node src/app/api.js  (PORT env var optional, defaults to 3000)

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
} from '../core/index.js';
import {
  nodeStorage,
  nodeImageDecoder,
  nodeFileSaver,
  nodeNotifier,
} from '../platform/node/index.js';
import { startServer } from '../ui/api/server.js';

// Initialize core modules with injected platform adapters
initPresetManager({ storage: nodeStorage });
initExporter({ fileSaver: nodeFileSaver, notifier: nodeNotifier });
await initI18n({ language: 'en' });

// Assemble dependencies to pass into the HTTP server / route handlers
const deps = {
  readExif: (file) => readExif(file, { imageDecoder: nodeImageDecoder }),
  writeExif,
  createImageStore: () =>
    createImageStore({
      readExif: (file) => readExif(file, { imageDecoder: nodeImageDecoder }),
    }),
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
  t,
};

const port = process.env.PORT || 3000;
startServer(deps, port);
