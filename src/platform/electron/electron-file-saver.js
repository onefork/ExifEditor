import { dialog, BrowserWindow } from 'electron';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export const electronFileSaver = {
  async saveBlob(blob, filename) {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      defaultPath: filename,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'zip'] }],
    });
    if (result.canceled || !result.filePath) return;
    const buffer = blob instanceof Buffer ? blob : Buffer.from(await blob.arrayBuffer());
    const dir = dirname(result.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(result.filePath, buffer);
  },

  async saveBatch(blobs, filenames) {
    // For batch, show a directory selection dialog
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return;
    const dir = result.filePaths[0];
    for (let i = 0; i < blobs.length; i++) {
      const buffer = blobs[i] instanceof Buffer ? blobs[i] : Buffer.from(await blobs[i].arrayBuffer());
      writeFileSync(`${dir}/${filenames[i]}`, buffer);
    }
  },

  async saveZip(zipBlob) {
    await this.saveBlob(zipBlob, 'edited_images.zip');
  },
};
