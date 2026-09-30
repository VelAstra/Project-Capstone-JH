const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  convertPptx: async (buffer) => {
    return await ipcRenderer.invoke('convert-pptx', buffer);
  }
});
