const { app, BrowserWindow, ipcMain } = require('electron');
const pptxToPdf = require('pptx-to-pdf');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 650,
    title: "OmniPDF Studio",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  
  // Hide menu bar for cleaner dashboard visual layout
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  ipcMain.handle('convert-pptx', async (event, arrayBuffer) => {
    try {
      const buffer = Buffer.from(arrayBuffer);
      const pdfBuffer = await pptxToPdf.convert(buffer);
      return pdfBuffer;
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

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
