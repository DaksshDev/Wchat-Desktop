// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    quitApp: () => ipcRenderer.send('quit-app'),
    isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
    onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
    onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback),
});
