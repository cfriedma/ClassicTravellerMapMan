const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ctmm', {
  getItem: (key) => ipcRenderer.invoke('kv:get', key),
  setItem: (key, value) => ipcRenderer.invoke('kv:set', key, value),
  removeItem: (key) => ipcRenderer.invoke('kv:remove', key)
});
