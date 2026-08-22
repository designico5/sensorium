const { app, BrowserWindow, dialog, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const TRUSTED_REPOSITORY_PATH = '/designico5/sensorium';
const TRUSTED_REPOSITORY_HOST = 'github.com';
const LOCAL_ORIGINS = new Set(['file:']);

let mainWindow;

function isTrustedExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:'
      && url.hostname === TRUSTED_REPOSITORY_HOST
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && (url.pathname === TRUSTED_REPOSITORY_PATH
        || url.pathname.startsWith(`${TRUSTED_REPOSITORY_PATH}/`));
  } catch {
    return false;
  }
}

function isLocalOrigin(rawOrigin) {
  try {
    return LOCAL_ORIGINS.has(new URL(rawOrigin).protocol);
  } catch {
    return false;
  }
}

async function openTrustedExternalUrl(rawUrl) {
  if (!isTrustedExternalUrl(rawUrl)) return;

  try {
    await shell.openExternal(rawUrl);
  } catch (error) {
    console.error('[Sensorium] Could not open trusted external link:', error);
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Link konnte nicht geöffnet werden',
        message: 'Der GitHub-Link konnte nicht an Windows übergeben werden.',
        detail: 'Bitte prüfe deine Standardbrowser- und Netzwerk-Einstellungen.',
      });
    } catch (dialogError) {
      console.error('[Sensorium] Could not show external-link error:', dialogError);
    }
  }
}

function configurePermissions() {
  const appSession = session.defaultSession;

  appSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const isMainContents = webContents === mainWindow?.webContents;
    const requestingUrl = details.requestingUrl || details.securityOrigin || webContents?.getURL?.();
    const isNormalMidiRequest = permission === 'midi';
    callback(Boolean(isMainContents && isNormalMidiRequest && isLocalOrigin(requestingUrl)));
  });

  appSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const isMainContents = webContents === mainWindow?.webContents;
    return Boolean(isMainContents && permission === 'midi' && isLocalOrigin(requestingOrigin));
  });
}

async function showLoadFailure(error) {
  console.error('[Sensorium] Renderer failed to load:', error);

  const options = {
    type: 'error',
    title: 'Sensorium konnte nicht gestartet werden',
    message: 'Die lokale Benutzeroberfläche konnte nicht geladen werden.',
    detail: 'Bitte starte die Vorschau erneut. Falls das Problem bleibt, prüfe die Installation oder öffne die Web-App im Browser.',
  };

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, options);
    } else {
      await dialog.showMessageBox(options);
    }
  } catch (dialogError) {
    console.error('[Sensorium] Could not show renderer-load error:', dialogError);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: 'Sensorium Preview',
    backgroundColor: '#05080c',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  configurePermissions();
  const rendererUrl = pathToFileURL(path.join(__dirname, 'dist', 'index.html')).href;

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openTrustedExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = undefined; });

  try {
    await mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== rendererUrl && url !== mainWindow.webContents.getURL()) event.preventDefault();
    });
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    throw error;
  }
}

async function startApp() {
  try {
    await createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch((error) => {
          void showLoadFailure(error).finally(() => app.exit(1));
        });
      }
    });
  } catch (error) {
    await showLoadFailure(error);
    app.exit(1);
  }
}

app.whenReady().then(startApp).catch(async (error) => {
  console.error('[Sensorium] Electron startup failed:', error);
  try {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Sensorium konnte nicht gestartet werden',
      message: 'Die Desktop-App konnte nicht initialisiert werden.',
      detail: 'Bitte starte die Vorschau erneut oder verwende die Web-App.',
    });
  } catch (dialogError) {
    console.error('[Sensorium] Could not show startup error:', dialogError);
  }
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
