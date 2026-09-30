const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AeroMark - Markdown Editor & Reader',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'html/index.html'));
  Menu.setApplicationMenu(null);
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown & Text Files', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return [];

  return result.filePaths.map(filePath => ({
    name: path.basename(filePath),
    path: filePath,
    content: fs.readFileSync(filePath, 'utf-8')
  }));
});

ipcMain.handle('dialog:saveFile', async (event, { filePath, content }) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'Markdown Files', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    filePath = result.filePath;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return { path: filePath, name: path.basename(filePath) };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
