import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DEFAULT_STORAGE_PATH = '.exif-editor-storage.json';

export function createNodeStorage(storagePath = DEFAULT_STORAGE_PATH) {
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      if (existsSync(storagePath)) {
        cache = JSON.parse(readFileSync(storagePath, 'utf8'));
      } else {
        cache = {};
      }
    } catch {
      cache = {};
    }
    return cache;
  }

  function persist() {
    try {
      const dir = dirname(storagePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(storagePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (e) {
      console.error('Storage persist failed:', e);
    }
  }

  return {
    async get(key) {
      const data = load();
      return data[key] ?? null;
    },
    async set(key, value) {
      const data = load();
      data[key] = value;
      persist();
    },
  };
}

// Default instance for convenience
export const nodeStorage = createNodeStorage();
