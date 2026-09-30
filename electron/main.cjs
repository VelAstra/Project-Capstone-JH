const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#FBFFE4',
    title: 'OmniPDF Studio - Offline Capstone',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Load the built application
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Simple clean menu
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
