'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('xk', {
  bambu: { open: inv('bambu:open'), find: inv('bambu:find'), pick: inv('bambu:pick') },
  update: {
    check: inv('update:check'),
    download: inv('update:download'),
    install: inv('update:install'),
    openPage: inv('update:openPage'),
    onProgress: (fn) => {
      const h = (e, d) => fn(d);
      ipcRenderer.on('update:progress', h);
      return () => ipcRenderer.off('update:progress', h);
    },
  },
  version: process.env.npm_package_version || '',
});
