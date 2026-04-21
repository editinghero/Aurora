# Aurora Desktop App - Build Instructions

## Prerequisites

- Node.js 16+
- Windows 10 or later

## Building from Source

### 1. Install Dependencies

```bash
npm install
```

This will automatically rebuild native modules for Electron.

### 2. Build Web App

From the parent directory:

```bash
cd ..
npm run build
```

### 3. Copy Build Files

```bash
Copy-Item -Recurse dist desktop-app/
```

### 4. Build Installer

```bash
cd desktop-app
npm run build
```

The installer will be created in `desktop-app/dist-installer/`

## Development

Run in development mode (requires web dev server on port 8080):

```bash
npm run dev
```

## Configuration

- **App Name**: Aurora Music Player
- **Window**: Frameless, no title bar
- **DevTools**: Disabled in production
- **Console**: Disabled in production
- **Icons**: Place icon.ico in desktop-app folder

## Notes

- Native modules (better-sqlite3, sharp) are automatically rebuilt for Electron
- The app uses frameless window for modern look
- Database is stored in user's AppData folder
- For detailed documentation, see SETUP.md
