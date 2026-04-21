const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const sharp = require('sharp');

// Dynamic import for ES module
let mm;
(async () => {
  mm = await import('music-metadata');
})();

let mainWindow;
let miniPlayerWindow;
let db;

// Initialize database
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'aurora.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      duration REAL,
      artwork BLOB,
      file_size INTEGER,
      format TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER,
      track_id INTEGER,
      position INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      PRIMARY KEY (playlist_id, track_id)
    );
    
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
    CREATE INDEX IF NOT EXISTS idx_history_played ON play_history(played_at DESC);
  `);
  
  console.log('Database initialized at:', dbPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f1014',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      devTools: true
    },
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1014',
      symbolColor: '#ffffff',
      height: 40
    },
    title: 'Aurora Music Player',
    icon: path.join(__dirname, 'icon.png'),
    show: false
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the web app
  const isDev = process.argv.includes('--dev');
  
  // Always load from dist folder (built files)
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('Loading from:', indexPath);
  console.log('__dirname:', __dirname);
  console.log('File exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    // Use file:// protocol explicitly
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load file:', err);
      dialog.showErrorBox('Load Error', `Failed to load application: ${err.message}`);
    });
    
    // Open DevTools in dev mode
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
    // Debug: Log when page loads
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      dialog.showErrorBox('Load Failed', `Error ${errorCode}: ${errorDescription}`);
    });
  } else {
    console.error('dist/index.html not found at:', indexPath);
    dialog.showErrorBox(
      'Files Missing',
      `Could not find application files at:\n${indexPath}\n\nPlease run: npm run build:web`
    );
    app.quit();
  }
}

function createMiniPlayer() {
  if (miniPlayerWindow) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 350,
    height: 120,
    minWidth: 350,
    minHeight: 120,
    maxWidth: 500,
    maxHeight: 120,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    transparent: false,
    backgroundColor: '#0f1014',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: true
    },
    show: false
  });

  const isDev = process.argv.includes('--dev');
  
  // Always load from dist folder
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  miniPlayerWindow.loadFile(indexPath, { hash: 'mini' }).catch(err => {
    console.error('Failed to load mini player:', err);
  });
  
  if (isDev) {
    miniPlayerWindow.webContents.openDevTools();
  }

  miniPlayerWindow.once('ready-to-show', () => {
    miniPlayerWindow.show();
    console.log('Mini player shown');
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

// IPC Handlers

// Scan folder for music files
ipcMain.handle('scan-folder', async (event, folderPath) => {
  // Wait for music-metadata to load
  if (!mm) {
    mm = await import('music-metadata');
  }
  
  const results = [];
  let scanned = 0;
  let added = 0;
  
  async function scanDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        let stat;
        
        try {
          stat = fs.statSync(filePath);
        } catch (err) {
          console.warn('Cannot access:', filePath, err.message);
          continue;
        }
        
        if (stat.isDirectory()) {
          await scanDir(filePath);
        } else if (/\.(mp3|m4a|flac|wav|ogg)$/i.test(file)) {
          scanned++;
          
          try {
            // Check if already in database
            const existing = db.prepare('SELECT id FROM tracks WHERE path = ?').get(filePath);
            if (existing) {
              console.log('Already in database:', filePath);
              continue;
            }
            
            const metadata = await mm.parseFile(filePath);
            const common = metadata.common;
            const format = metadata.format;
            
            // Extract artwork
            let artworkBuffer = null;
            if (common.picture && common.picture.length > 0) {
              const picture = common.picture[0];
              try {
                // Resize to 300x300 for storage
                artworkBuffer = await sharp(picture.data)
                  .resize(300, 300, { fit: 'cover' })
                  .jpeg({ quality: 85 })
                  .toBuffer();
              } catch (imgErr) {
                console.warn('Failed to process artwork for:', filePath, imgErr.message);
              }
            }
            
            // Insert into database
            const stmt = db.prepare(`
              INSERT INTO tracks (path, title, artist, album, duration, artwork, file_size, format)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const info = stmt.run(
              filePath,
              common.title || path.basename(file, path.extname(file)),
              common.artist || 'Unknown Artist',
              common.album || 'Unknown Album',
              format.duration || 0,
              artworkBuffer,
              stat.size,
              format.container || path.extname(file).slice(1).toUpperCase()
            );
            
            added++;
            results.push({
              id: info.lastInsertRowid,
              path: filePath,
              title: common.title || path.basename(file, path.extname(file)),
              artist: common.artist || 'Unknown Artist',
              album: common.album || 'Unknown Album'
            });
            
            // Send progress update
            event.sender.send('scan-progress', { scanned, added });
            
          } catch (err) {
            console.error('Error processing file:', filePath, err.message);
          }
        }
      }
    } catch (err) {
      console.error('Error scanning directory:', dir, err.message);
    }
  }
  
  await scanDir(folderPath);
  return { results, scanned, added };
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Music Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Show folder action dialog
ipcMain.handle('show-folder-dialog', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Add Music',
    message: 'How would you like to add these tracks?',
    buttons: ['Clear Queue & Play', 'Add to Queue', 'Cancel'],
    defaultId: 0,
    cancelId: 2
  });
  
  if (result.response === 0) return 'clear';
  if (result.response === 1) return 'add';
  return null;
});

// Show add files dialog
ipcMain.handle('show-add-files-dialog', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Add Songs',
    message: 'How would you like to add these songs?',
    buttons: ['Play Now', 'Add to Queue', 'Cancel'],
    defaultId: 0,
    cancelId: 2
  });
  
  if (result.response === 0) return 'play-now';
  if (result.response === 1) return 'add';
  return null;
});

// Get all tracks
ipcMain.handle('get-tracks', () => {
  const stmt = db.prepare('SELECT id, path, title, artist, album, duration, format, added_at FROM tracks ORDER BY added_at DESC');
  return stmt.all();
});

// Get tracks with limit
ipcMain.handle('get-tracks-limit', (event, limit) => {
  const stmt = db.prepare('SELECT id, path, title, artist, album, duration, format, added_at FROM tracks ORDER BY added_at DESC LIMIT ?');
  return stmt.all(limit || 100);
});

// Get track artwork
ipcMain.handle('get-artwork', (event, trackId) => {
  const stmt = db.prepare('SELECT artwork FROM tracks WHERE id = ?');
  const row = stmt.get(trackId);
  
  if (row && row.artwork) {
    return `data:image/jpeg;base64,${row.artwork.toString('base64')}`;
  }
  return null;
});

// Search tracks
ipcMain.handle('search-tracks', (event, query) => {
  const stmt = db.prepare(`
    SELECT id, path, title, artist, album, duration, format
    FROM tracks 
    WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
    ORDER BY title
  `);
  const searchTerm = `%${query}%`;
  return stmt.all(searchTerm, searchTerm, searchTerm);
});

// Get tracks by album
ipcMain.handle('get-tracks-by-album', (event, album) => {
  const stmt = db.prepare(`
    SELECT id, path, title, artist, album, duration, format
    FROM tracks 
    WHERE album = ?
    ORDER BY title
  `);
  return stmt.all(album);
});

// Get tracks by artist
ipcMain.handle('get-tracks-by-artist', (event, artist) => {
  const stmt = db.prepare(`
    SELECT id, path, title, artist, album, duration, format
    FROM tracks 
    WHERE artist = ?
    ORDER BY album, title
  `);
  return stmt.all(artist);
});

// Get all albums
ipcMain.handle('get-albums', () => {
  const stmt = db.prepare(`
    SELECT album, artist, COUNT(*) as track_count, MIN(id) as first_track_id
    FROM tracks
    GROUP BY album, artist
    ORDER BY album
  `);
  return stmt.all();
});

// Get all artists
ipcMain.handle('get-artists', () => {
  const stmt = db.prepare(`
    SELECT artist, COUNT(*) as track_count
    FROM tracks
    GROUP BY artist
    ORDER BY artist
  `);
  return stmt.all();
});

// Add to play history
ipcMain.handle('add-to-history', (event, trackId) => {
  const stmt = db.prepare('INSERT INTO play_history (track_id) VALUES (?)');
  stmt.run(trackId);
});

// Get play history
ipcMain.handle('get-history', (event, limit = 100) => {
  const stmt = db.prepare(`
    SELECT h.id, h.played_at, t.id as track_id, t.path, t.title, t.artist, t.album, t.duration
    FROM play_history h
    JOIN tracks t ON h.track_id = t.id
    ORDER BY h.played_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
});

// Clear history
ipcMain.handle('clear-history', () => {
  const stmt = db.prepare('DELETE FROM play_history');
  const info = stmt.run();
  return info.changes;
});

// Get database stats
ipcMain.handle('get-stats', () => {
  const trackCount = db.prepare('SELECT COUNT(*) as count FROM tracks').get();
  const playlistCount = db.prepare('SELECT COUNT(*) as count FROM playlists').get();
  const historyCount = db.prepare('SELECT COUNT(*) as count FROM play_history').get();
  const totalDuration = db.prepare('SELECT SUM(duration) as total FROM tracks').get();
  const totalSize = db.prepare('SELECT SUM(file_size) as total FROM tracks').get();
  
  return {
    tracks: trackCount.count,
    playlists: playlistCount.count,
    historyEntries: historyCount.count,
    totalDuration: totalDuration.total || 0,
    totalSize: totalSize.total || 0
  };
});

// Remove track from database
ipcMain.handle('remove-track', (event, trackId) => {
  const stmt = db.prepare('DELETE FROM tracks WHERE id = ?');
  const info = stmt.run(trackId);
  return info.changes > 0;
});

// Get database path
ipcMain.handle('get-db-path', () => {
  return path.join(app.getPath('userData'), 'aurora.db');
});

// Save last scanned folder
ipcMain.handle('save-last-folder', (event, folderPath) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run('last_folder', folderPath);
  return true;
});

// Get last scanned folder
ipcMain.handle('get-last-folder', () => {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('last_folder');
  return row ? row.value : null;
});

// Get Windows Music folder
ipcMain.handle('get-windows-music-folder', () => {
  const musicFolder = path.join(app.getPath('music'));
  return fs.existsSync(musicFolder) ? musicFolder : null;
});

// Load actual audio file by path
ipcMain.handle('load-audio-file', (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (err) {
    console.error('Failed to load audio file:', filePath, err);
    throw err;
  }
});

// Mini Player Controls
ipcMain.handle('toggle-mini-player', () => {
  if (miniPlayerWindow) {
    if (miniPlayerWindow.isVisible()) {
      miniPlayerWindow.hide();
      return false;
    } else {
      miniPlayerWindow.show();
      miniPlayerWindow.focus();
      return true;
    }
  } else {
    createMiniPlayer();
    return true;
  }
});

ipcMain.handle('close-mini-player', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }
});

// Sync playback state from main to mini
ipcMain.on('sync-to-mini', (event, data) => {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.webContents.send('playback-state', data);
  }
});

// Send control commands from mini to main
ipcMain.on('mini-control', (event, command) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player-control', command);
  }
});

// Send seek command from mini to main
ipcMain.on('mini-seek', (event, time) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player-seek', time);
  }
});

console.log('Aurora Desktop App Started');
console.log('User Data Path:', app.getPath('userData'));
