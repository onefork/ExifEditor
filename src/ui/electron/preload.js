const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (blob, filename) => ipcRenderer.invoke('save-file', blob, filename),
  saveBatch: (blobs, filenames) => ipcRenderer.invoke('save-batch', blobs, filenames),
  saveZip: (blob) => ipcRenderer.invoke('save-zip', blob),
  notify: (title, body) => ipcRenderer.send('notify', title, body),
  showProgress: (percent) => ipcRenderer.send('show-progress', percent),
  cancelProgress: () => ipcRenderer.send('cancel-progress'),
});
