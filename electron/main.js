const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function openDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'ctmm.sqlite');
  const rebuiltBinding = path.join(
    path.dirname(require.resolve('better-sqlite3/package.json')),
    'build',
    'Release',
    'better_sqlite3.node'
  );
  const options = fs.existsSync(rebuiltBinding) ? { nativeBinding: rebuiltBinding } : {};
  const db = new Database(dbPath, options);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  return db;
}

function registerIpc(db) {
  const select = db.prepare('SELECT value FROM kv WHERE key = ?');
  const upsert = db.prepare(`
    INSERT INTO kv (key, value, updated_at)
    VALUES (@key, @value, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  const remove = db.prepare('DELETE FROM kv WHERE key = ?');

  ipcMain.handle('kv:get', (_event, key) => {
    if (!KEY_PATTERN.test(key)) {
      throw new Error('Invalid key');
    }
    const row = select.get(key);
    return row ? row.value : null;
  });

  ipcMain.handle('kv:set', (_event, key, value) => {
    if (!KEY_PATTERN.test(key) || typeof value !== 'string') {
      throw new Error('Invalid key or value');
    }
    upsert.run({ key, value });
  });

  ipcMain.handle('kv:remove', (_event, key) => {
    if (!KEY_PATTERN.test(key)) {
      throw new Error('Invalid key');
    }
    remove.run(key);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '../dist/classic-traveller-map-man/index.html'));
}

app.whenReady().then(() => {
  const db = openDatabase();
  registerIpc(db);
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
