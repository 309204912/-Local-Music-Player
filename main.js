const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isLocked = true;
let ghostMode = false;
let windowBounds = { width: 320, height: 200, x: null, y: null };

function getMusicRoot() {
  const dir = app.getPath('music');
  console.log('[MusicFloat] music root:', dir);
  return dir;
}

function scanFolders() {
  const musicRoot = getMusicRoot();
  try {
    if (!fs.existsSync(musicRoot)) {
      fs.mkdirSync(musicRoot, { recursive: true });
      console.log('[MusicFloat] created music dir:', musicRoot);
    }
    const entries = fs.readdirSync(musicRoot, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    console.log('[MusicFloat] found folders:', dirs);
    return dirs;
  } catch (err) {
    console.error('[MusicFloat] scanFolders error:', err.message);
    return [];
  }
}

function scanAudioFiles(folderName) {
  const musicRoot = getMusicRoot();
  const folderPath = path.join(musicRoot, folderName);
  const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
  try {
    if (!fs.existsSync(folderPath)) {
      console.warn('[MusicFloat] folder not found:', folderPath);
      return [];
    }
    const files = fs.readdirSync(folderPath);
    const audioFiles = files.filter(f => audioExts.includes(path.extname(f).toLowerCase())).sort();
    console.log('[MusicFloat] audio files in', folderName, ':', audioFiles.length);
    return audioFiles;
  } catch (err) {
    console.error('[MusicFloat] scanAudioFiles error:', err.message);
    return [];
  }
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
  windowBounds.x = windowBounds.x ?? wx + ww - windowBounds.width - 20;
  windowBounds.y = windowBounds.y ?? wy + 20;
  console.log('[MusicFloat] window position:', windowBounds.x, windowBounds.y);

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.setMinimumSize(240, 200);
  mainWindow.setMovable(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('scan-folders', () => {
  return scanFolders();
});

ipcMain.handle('scan-audio-files', (_, folderName) => {
  return scanAudioFiles(folderName);
});

ipcMain.handle('get-music-root', () => {
  return getMusicRoot();
});

ipcMain.handle('set-locked', (_, locked) => {
  isLocked = locked;
  if (mainWindow) {
      mainWindow.setMovable(!locked);
    }
  return isLocked;
});

ipcMain.handle('get-locked', () => {
  return isLocked;
});

ipcMain.handle('get-window-bounds', () => {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return windowBounds;
});

ipcMain.handle('open-folder', (_, folderName) => {
  const musicRoot = getMusicRoot();
  const target = folderName ? path.join(musicRoot, folderName) : musicRoot;
  const { shell } = require('electron');
  shell.openPath(target);
});

ipcMain.handle('close-app', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('set-ghost', (_, enabled) => {
  ghostMode = enabled;
  if (mainWindow) {
    if (enabled) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
  return ghostMode;
});

ipcMain.handle('set-mouse-forward', (_, forward) => {
  if (mainWindow && ghostMode) {
    if (forward) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
});

ipcMain.handle('set-window-size', (_, w, h) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: Math.max(240, Math.min(600, w)),
      height: Math.max(200, Math.min(900, h))
    });
  }
});
