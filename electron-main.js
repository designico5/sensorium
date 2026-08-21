/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Native Electron Entrypoint for Windows 11 Standalone Client
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: "Sensorium Pro: Windows 11 ASIO Clock & MIDI Bridge",
    icon: path.join(__dirname, 'public', 'icon.ico'),
    frame: true, // Keep native windows frame or set to false for custom acrylic titlebars
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Premium Windows 11 Glass Styling
    backgroundColor: '#0a0a0c',
  });

  // Load the compiled index.html
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
