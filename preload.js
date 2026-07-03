const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  gerarPDF: (config) => ipcRenderer.invoke('gerar-pdf', config)
});