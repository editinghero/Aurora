# Developer Setup Guide

This guide will help you set up Aurora Music Player for local development.

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify: `git --version`

### For Desktop App Development

4. **Python** (for native module compilation)
   - Download from [python.org](https://www.python.org/)
   - Required for `better-sqlite3` and `sharp` modules

5. **Visual Studio Build Tools** (Windows)
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++" workload

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/editinghero/aurora-music-player.git
cd aurora-music-player
```

### 2. Install Dependencies

#### Web App (Root folder)
```bash
npm install
```

#### Desktop App
```bash
cd desktop-app
npm install
cd ..
```

## 🌐 Web App Development

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

Output: `dist/` folder

### Deploy to Cloudflare Pages

1. Build the project: `npm run build`
2. Push to GitHub
3. Connect repository to Cloudflare Pages
4. Set build command: `npm run build`
5. Set output directory: `dist`

## 🖥️ Desktop App Development

### Development Mode

```bash
cd desktop-app
npm run dev
```

This will:
- Build the web assets with Vite
- Launch Electron with DevTools open
- Enable hot reload for renderer process

### Build Web Assets Only

```bash
cd desktop-app
npm run build:web
```

Output: `desktop-app/dist/` folder

### Build Executable

```bash
cd desktop-app
npm run build
```

This will:
1. Build web assets with Vite
2. Package with electron-builder
3. Create installer and portable versions

Output: `desktop-app/dist-installer/`
- `Aurora Music Player-1.0.0-Portable.exe` - Portable version
- `Aurora Music Player-Setup-1.0.0.exe` - Installer version

### Testing the Executable

```bash
cd desktop-app/dist-installer
./Aurora Music Player-1.0.0-Portable.exe
```

## 📁 Project Structure

```
aurora-music-player/
├── src/                          # Web app source
│   ├── components/
│   │   ├── player/              # Player components
│   │   └── ui/                  # UI components (shadcn)
│   ├── hooks/                   # React hooks
│   ├── lib/                     # Utilities and types
│   └── pages/                   # Page components
├── desktop-app/                 # Desktop app
│   ├── main.js                  # Electron main process
│   ├── src/                     # Desktop app source (similar to web)
│   └── dist/                    # Built web assets
├── public/                      # Static assets
└── dist/                        # Web app build output
```

## 🔧 Configuration Files

### Web App

- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Desktop App

- `desktop-app/main.js` - Electron main process
- `desktop-app/vite.config.ts` - Vite configuration for desktop
- `desktop-app/package.json` - Desktop app dependencies

## 🗄️ Database (Desktop App)

The desktop app uses SQLite for music library management.

**Database Location**: `%APPDATA%/aurora-desktop/aurora.db`

**Tables**:
- `tracks` - Music file metadata
- `playlists` - User playlists
- `playlist_tracks` - Playlist contents
- `play_history` - Playback history
- `settings` - App settings

**Accessing Database**:
```javascript
// In main.js
const dbPath = path.join(app.getPath('userData'), 'aurora.db');
```

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS with custom theme variables.

**Theme Variables** (in `src/index.css`):
```css
--glow: /* Primary theme color */
--glow-2: /* Secondary theme color */
--glow-3: /* Tertiary theme color */
```

### Adding New Themes

Edit `src/lib/themes.ts`:
```typescript
export const THEMES: Theme[] = [
  {
    id: "new-theme",
    name: "New Theme",
    glow: "30 100% 60%",      // HSL values
    glow2: "40 100% 55%",
    glow3: "20 100% 65%"
  }
];
```

## 🧪 Testing

### Run Tests

```bash
npm run test
```

### Add New Tests

Create test files in `src/test/` or `desktop-app/src/test/`

## 📦 Building for Release

### Web App

1. Update version in `package.json`
2. Build: `npm run build`
3. Test the build: `npm run preview`
4. Deploy to Cloudflare Pages

### Desktop App

1. Update version in `desktop-app/package.json`
2. Build: `cd desktop-app && npm run build`
3. Test executables in `desktop-app/dist-installer/`
4. Create GitHub release and upload executables

## 🔍 Debugging

### Web App

- Use browser DevTools (F12)
- Check console for errors
- Use React DevTools extension

### Desktop App

#### Renderer Process
- DevTools open automatically in dev mode
- Or: View → Toggle Developer Tools

#### Main Process
```bash
electron . --dev --inspect
```

Then open `chrome://inspect` in Chrome

### Common Issues

**Module not found errors**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Native module errors (desktop)**:
```bash
cd desktop-app
npm run rebuild
```

**Build fails**:
- Check Node.js version (v18+)
- Ensure Python and build tools are installed
- Clear cache: `rm -rf dist desktop-app/dist`

## 🚢 Deployment

### Web App (Cloudflare Pages)

1. Push to GitHub
2. Go to Cloudflare Pages dashboard
3. Create new project
4. Connect GitHub repository
5. Configure:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `/` (leave empty)
6. Deploy

### Desktop App (GitHub Releases)

1. Build executables: `cd desktop-app && npm run build`
2. Create new release on GitHub
3. Upload files from `desktop-app/dist-installer/`:
   - `Aurora Music Player-1.0.0-Portable.exe`
   - `Aurora Music Player-Setup-1.0.0.exe`
4. Write release notes
5. Publish release

## 🤝 Contributing

### Code Style

- Use TypeScript for type safety
- Follow existing code structure
- Use Prettier for formatting
- Write meaningful commit messages

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Message Format

```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(player): add crossfade between tracks

Implements smooth crossfade transition when switching tracks.
Configurable duration in settings.

Closes #123
```

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 🐛 Reporting Issues

When reporting issues, please include:
- OS and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Console errors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/editinghero/aurora-music-player/issues)
- **Discussions**: [GitHub Discussions](https://github.com/editinghero/aurora-music-player/discussions)

---

**[Back to Main README](README.md)**
