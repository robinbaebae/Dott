const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openMain: () => ipcRenderer.send('open-main'),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  onPetMessage: (callback) => ipcRenderer.on('pet-message', (_event, message) => callback(message)),
  sendChat: (message) => ipcRenderer.invoke('pet-chat', message),
  onChatResponse: (cb) => ipcRenderer.on('pet-chat-response', (_e, msg) => cb(msg)),
  triggerAction: (action) => ipcRenderer.send('pet-action', action),
  resizePetWindow: (w, h) => ipcRenderer.send('pet-resize', { width: w, height: h }),
  platform: process.platform,
});
