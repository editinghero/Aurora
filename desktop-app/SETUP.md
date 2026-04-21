# Aurora Desktop App - Developer Setup

Developer guide for building and modifying the Aurora desktop application.

## Prerequisites

- Node.js 16 or later
- npm package manager
- Windows 10 or later (for testing)
- Visual Studio Build Tools (for native modules)

## Installation

### Install Dependencies

```bash
cd desktop-app
npm install
```

This installs:
- `electron` - Desktop framework
- `better-sqlite3` - SQLite database (native module)
- `music-metadata` - Audio file metadata parsing
- `sharp` - Image processing (native module)
- `electron-builder` - Installer creation

### Native Module Compilation

If you encounter errors with native modules:

```bash
npm install --build-from-source
```

Or rebuild for Electron:

```bash
npm rebuild --runtime=electron --target=28.0.0 --disturl=https://electronjs.org/headers --abi=127
```

## Development

### Development Mode

Terminal 1 - Start web app dev server:
```bash
cd ..
npm run dev
```

Terminal 2 - Start desktop app:
```bash
cd desktop-app
npm run dev
```

The desktop app will:
- Connect to `http://localhost:5173`
- Open DevTools automatically
- Enable hot reload for web app changes
- Show console logs for debugging

### Building for Production

1. Build the web app:
```bash
cd ..
npm run build
```

2. Copy dist folder:
```powershell
Copy-Item -Recurse dist desktop-app/
```

3. Test production build:
```bash
cd desktop-app
npm start
```

4. Create installer:
```bash
npm run build
```

Output: `desktop-app/dist/Aurora Music Player Setup.exe`

## Project Structure

```
desktop-app/
├── main.js              # Electron main process
├── package.json         # Dependencies and build config
├── README.md            # User documentation
├── SETUP.md             # This file
├── dist/                # Web app build (copied from parent)
└── node_modules/        # Dependencies
```

## Main Process (main.js)

### Key Components

**Database Initialization**
- Creates SQLite database in user data directory
- Sets up tables and indexes
- Handles migrations

**Window Management**
- Creates main browser window
- Loads web app (dev or production)
- Handles window events

**IPC Handlers**
- Exposes database operations to renderer
- Handles file system operations
- Manages folder scanning

### IPC Handler Reference

**Library Management**
```javascript
ipcMain.handle('scan-folder', async (event, folderPath) => {...})
ipcMain.handle('select-folder', async () => {...})
ipcMain.handle('get-tracks', () => {...})
ipcMain.handle('get-albums', () => {...})
ipcMain.handle('get-artists', () => {...})
ipcMain.handle('search-tracks', (event, query) => {...})
ipcMain.handle('remove-track', (event, trackId) => {...})
```

**Artwork**
```javascript
ipcMain.handle('get-artwork', (event, trackId) => {...})
```

**History**
```javascript
ipcMain.handle('add-to-history', (event, trackId) => {...})
ipcMain.handle('get-history', (event, limit) => {...})
ipcMain.handle('clear-history', () => {...})
```

**Statistics**
```javascript
ipcMain.handle('get-stats', () => {...})
ipcMain.handle('get-db-path', () => {...})
```

## Database Schema

### Tables

**tracks**
```sql
CREATE TABLE tracks (
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
```

**playlists**
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**playlist_tracks**
```sql
CREATE TABLE playlist_tracks (
  playlist_id INTEGER,
  track_id INTEGER,
  position INTEGER,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  PRIMARY KEY (playlist_id, track_id)
);
```

**play_history**
```sql
CREATE TABLE play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

**settings**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### Indexes

```sql
CREATE INDEX idx_tracks_path ON tracks(path);
CREATE INDEX idx_tracks_artist ON tracks(artist);
CREATE INDEX idx_tracks_album ON tracks(album);
CREATE INDEX idx_history_played ON play_history(played_at DESC);
```

## Folder Scanning

### Process Flow

1. User selects folder via dialog
2. Recursive directory traversal
3. Filter for audio files (mp3, m4a, flac, wav, ogg)
4. Parse metadata with music-metadata
5. Extract and resize artwork with sharp
6. Insert into database
7. Send progress updates to renderer

### Performance Optimization

- Skip files already in database
- Resize artwork to 300x300 (JPEG 85% quality)
- Use prepared statements for inserts
- Batch operations where possible
- Send progress updates every file

### Error Handling

- Skip files with permission errors
- Log parsing errors but continue
- Handle missing artwork gracefully
- Catch and report database errors

## Building Installers

### Configuration (package.json)

```json
{
  "build": {
    "appId": "com.aurora.musicplayer",
    "productName": "Aurora Music Player",
    "directories": {
      "output": "dist"
    },
    "files": [
      "**/*",
      "!node_modules",
      "!dist"
    ],
    "win": {
      "target": "nsis",
      "icon": "icon.ico"
    }
  }
}
```

### NSIS Installer Options

Edit package.json to customize:
- Install directory
- Start menu shortcuts
- Desktop shortcut
- File associations
- Uninstaller

### Code Signing

For production distribution:

1. Obtain code signing certificate
2. Add to package.json:
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

3. Build with signing:
```bash
npm run build
```

## Testing

### Manual Testing

1. Test folder scanning with various music collections
2. Test database operations (add, remove, search)
3. Test artwork extraction
4. Test play history
5. Test with corrupted files
6. Test with missing metadata
7. Test with large libraries (10,000+ files)

### Database Testing

Use DB Browser for SQLite to inspect:
- Table structure
- Data integrity
- Index performance
- Query optimization

### Performance Testing

Monitor:
- Scan speed (files per second)
- Memory usage during scan
- Database query times
- Artwork loading speed

## Debugging

### Enable Logging

Add to main.js:
```javascript
const log = require('electron-log');
log.transports.file.level = 'debug';
```

### DevTools

DevTools open automatically in development mode.

Access in production:
```javascript
mainWindow.webContents.openDevTools();
```

### Database Inspection

Location:
```
C:\Users\<username>\AppData\Roaming\aurora-desktop\aurora.db
```

Use SQLite browser to inspect.

### Common Issues

**Native module errors**
- Rebuild for Electron version
- Check Node.js version compatibility
- Install Visual Studio Build Tools

**Database locked**
- Close all app instances
- Check for zombie processes
- Delete database and rescan

**Artwork not loading**
- Check BLOB size limits
- Verify Sharp installation
- Test with different image formats

## Deployment

### Pre-release Checklist

- [ ] Test on clean Windows installation
- [ ] Verify all features work
- [ ] Check installer size
- [ ] Test uninstaller
- [ ] Verify database migrations
- [ ] Check for memory leaks
- [ ] Test with large libraries
- [ ] Verify code signing (if applicable)

### Distribution

Options:
1. Direct download from website
2. Microsoft Store submission
3. Chocolatey package
4. Winget package

### Auto-updates

Implement with electron-updater:

1. Install:
```bash
npm install electron-updater
```

2. Configure in main.js:
```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

3. Host updates on GitHub Releases or custom server

## Future Enhancements

### Planned Features

- System tray integration
- Global keyboard shortcuts
- File associations (.mp3, .m4a, etc.)
- Drag and drop support
- Library view with grid/list toggle
- Advanced search filters
- Playlist management UI
- Lyrics display
- Audio output device selection
- Crossfade between tracks

### Integration Ideas

- Last.fm scrobbling
- Discord Rich Presence
- Windows Media Controls
- Taskbar progress
- Jump list integration

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/wiki/API)
- [music-metadata](https://github.com/Borewit/music-metadata)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [electron-builder](https://www.electron.build/)

## Contributing

When contributing to the desktop app:

1. Test on Windows 10 and 11
2. Ensure database migrations work
3. Handle errors gracefully
4. Add logging for debugging
5. Update documentation
6. Test with various music collections

## License

This project is provided as-is for personal use.
