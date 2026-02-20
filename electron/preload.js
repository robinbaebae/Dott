const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openMain: () => ipcRenderer.send('open-main'),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  platform: process.platform,
});
