const { app, BrowserWindow, ipcMain, dialog, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  ensureVaultStructure,
  syncWorkspaceFilesToDisk,
} = require('./vaultSync.cjs');

let mainWindow = null;

function getAppConfigPath() {
  return path.join(app.getPath('userData'), 'noteflow-config.json');
}

function getDefaultVaultPath() {
  return path.join(os.homedir(), 'Documents', 'NoteFlowVault');
}

function readAppConfig() {
  try {
    const configPath = getAppConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.vaultPath) return parsed;
    }
  } catch (err) {
    console.error('Failed to read config:', err);
  }
  return { vaultPath: getDefaultVaultPath() };
}

function writeAppConfig(config) {
  try {
    const configPath = getAppConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 660,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 16 },
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = 'http://localhost:5173';
  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('vault:get-info', async () => {
    const config = readAppConfig();
    ensureVaultStructure(config.vaultPath);
    const metaPath = path.join(config.vaultPath, '.noteflow-workspace.json');
    let workspace = null;
    if (fs.existsSync(metaPath)) {
      try {
        workspace = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse existing workspace file:', e);
      }
    }
    return {
      vaultPath: config.vaultPath,
      workspace,
      isElectron: true,
    };
  });

  ipcMain.handle('vault:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Local Folder for Your Notes Vault',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Use This Folder for Notes',
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const chosenPath = result.filePaths[0];
    writeAppConfig({ vaultPath: chosenPath });
    ensureVaultStructure(chosenPath);

    const metaPath = path.join(chosenPath, '.noteflow-workspace.json');
    let existingWorkspace = null;
    if (fs.existsSync(metaPath)) {
      try {
        existingWorkspace = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch (e) {
        console.error('Error reading existing workspace in chosen folder:', e);
      }
    }

    return {
      canceled: false,
      vaultPath: chosenPath,
      existingWorkspace,
    };
  });

  ipcMain.handle('vault:save-workspace', async (_event, workspaceData) => {
    const config = readAppConfig();
    return syncWorkspaceFilesToDisk(config.vaultPath, workspaceData);
  });

  ipcMain.handle('vault:reveal-in-finder', async () => {
    const config = readAppConfig();
    ensureVaultStructure(config.vaultPath);
    await shell.openPath(config.vaultPath);
    return { ok: true };
  });

  ipcMain.handle('system:get-idle-time', async () => {
    try {
      return powerMonitor.getSystemIdleTime();
    } catch (_e) {
      return 0;
    }
  });

  ipcMain.handle('vault:export-file', async (_event, { defaultName, content, ext }) => {
    const filters =
      ext === 'html'
        ? [{ name: 'HTML Document', extensions: ['html'] }]
        : ext === 'txt'
        ? [{ name: 'Plain Text File', extensions: ['txt'] }]
        : [{ name: 'Markdown File', extensions: ['md'] }];

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Note',
      defaultPath: path.join(os.homedir(), 'Downloads', defaultName),
      filters,
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { canceled: false, filePath: result.filePath };
  });

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
