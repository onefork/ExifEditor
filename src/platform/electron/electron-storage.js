import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// In Electron main process, 'electron' is available. In renderer, use IPC.
// This adapter is for main process usage.
let storagePath = null;

export function initElectronStorage(userDataPath) {
  storagePath = join(userDataPath, 'exif-editor-storage.json');
}

function load() {
  if (!storagePath) throw new Error('Electron storage not initialized. Call initElectronStorage(userDataPath) first.');
  try {
    if (existsSync(storagePath)) return JSON.parse(readFileSync(storagePath, 'utf8'));
    return {};
  } catch { return {}; }
}

function persist(data) {
  if (!storagePath) throw new Error('Electron storage not initialized.');
  writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8');
}

export const electronStorage = {
  async get(key) { const data = load(); return data[key] ?? null; },
  async set(key, value) { const data = load(); data[key] = value; persist(data); },
};
