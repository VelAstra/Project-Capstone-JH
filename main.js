const { app, BrowserWindow, ipcMain } = require('electron');
const pptxToPdf = require('pptx-to-pdf');
const path = require('path');

// Hardware and memory optimization flags
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size');
app.commandLine.appendSwitch('disable-features', 'Autofill,Translate,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disk-cache-size', '16777216');
app.commandLine.appendSwitch('media-cache-size', '16777216');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-print-preview');

function getIconPath() {
  if (process.platform === 'win32') return path.join(__dirname, 'icon.ico');
  if (process.platform === 'linux') return path.join(__dirname, 'icon.png');
  return path.join(__dirname, 'icon.png');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 650,
    title: "OmniPDF Studio",
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
      backgroundThrottling: true,
      enableWebSQL: false
    }
  });

  win.loadFile('index.html');
  
  // Hide menu bar for cleaner dashboard visual layout
  win.setMenuBarVisibility(false);

  // Release memory on minimize
  win.on('minimize', () => {
    if (process.platform === 'win32') {
      win.webContents.invalidate();
    }
  });
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
