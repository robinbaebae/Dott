const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openMain: () => ipcRenderer.send('open-main'),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  onPetMessage: (callback) => ipcRenderer.on('pet-message', (_event, message) => callback(message)),
  sendChat: (message) => ipcRenderer.invoke('pet-chat', message),
  onChatResponse: (cb) => ipcRenderer.on('pet-chat-response', (_e, msg) => cb(msg)),
  triggerAction: (action) => ipcRenderer.send('pet-action', action),
  resizePetWindow: (w, h) => ipcRenderer.send('pet-resize', { width: w, height: h }),
  onDndPrompt: (cb) => ipcRenderer.on('pet-dnd-prompt', (_e, meetingTitle) => cb(meetingTitle)),
  respondDnd: (accepted) => ipcRenderer.send('pet-dnd-response', accepted),
  onDndEnd: (cb) => ipcRenderer.on('pet-dnd-end', () => cb()),
  startDrag: () => ipcRenderer.send('pet-start-drag'),
  dragMove: (x, y) => ipcRenderer.send('pet-drag-move', { x, y }),
  platform: process.platform,
});
