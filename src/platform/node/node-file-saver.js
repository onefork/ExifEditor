import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

export function createNodeFileSaver(outputDir = process.cwd()) {
  return {
    async saveBlob(blob, filename) {
      const buffer = blob instanceof Buffer ? blob : Buffer.from(await blob.arrayBuffer());
      const fullPath = resolve(outputDir, filename);
      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, buffer);
    },

    async saveBatch(blobs, filenames) {
      for (let i = 0; i < blobs.length; i++) {
        await this.saveBlob(blobs[i], filenames[i]);
      }
    },

    async saveZip(zipBlob) {
      await this.saveBlob(zipBlob, 'edited_images.zip');
    },
  };
}

// Default instance saving to current directory
export const nodeFileSaver = createNodeFileSaver();
