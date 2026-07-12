import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { initElectronStorage, electronStorage, electronFileSaver, electronNotifier } from '../platform/electron/index.js';
import { initPresetManager, initExporter, initI18n } from '../core/index.js';

// Initialize core with Electron adapters
app.whenReady().then(async () => {
  initElectronStorage(app.getPath('userData'));
  initPresetManager({ storage: electronStorage });
  initExporter({ fileSaver: electronFileSaver, notifier: electronNotifier });
  await initI18n({ language: 'en' });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../ui/electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server; in production, load built file
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
