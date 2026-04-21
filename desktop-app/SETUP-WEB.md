# Aurora Music Player - Developer Setup

This guide is for developers who want to build and modify Aurora Music Player.

## Prerequisites

- Node.js 16 or later
- npm or yarn package manager
- Git (optional)

## Web App Development

### Installation

1. Clone or download the repository
2. Install dependencies:
```bash
npm install
```

### Development Server

Start the development server with hot reload:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Building for Production

Create optimized production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Linting

Check code quality:
```bash
npm run lint
```

## Desktop App Development

### Installation

Navigate to desktop app folder and install dependencies:
```bash
cd desktop-app
npm install
```

### Development Mode

Terminal 1 - Start web app dev server:
```bash
npm run dev
```

Terminal 2 - Start desktop app:
```bash
cd desktop-app
npm run dev
```

The desktop app will connect to `http://localhost:5173` for hot reload.

### Building Desktop App

1. Build the web app:
```bash
npm run build
```

2. Copy dist folder to desktop-app:
```powershell
Copy-Item -Recurse dist desktop-app/
```

3. Build the desktop app:
```bash
cd desktop-app
npm run build
```

The installer will be created in `desktop-app/dist/`

## Project Structure

```
opus-harmony-player-main/
├── src/
│   ├── components/
│   │   ├── player/          # Player-specific components
│   │   └── ui/              # Reusable UI components (shadcn)
│   ├── hooks/               # Custom React hooks
│   │   ├── useAudioEngine.ts    # Main audio engine
│   │   ├── useSwipe.ts          # Touch gesture handling
│   │   └── use-mobile.tsx       # Mobile detection
│   ├── lib/                 # Utilities and helpers
│   │   ├── audio-utils.ts       # Audio processing utilities
│   │   ├── history-utils.ts     # Play history management
│   │   ├── playlist-utils.ts    # M3U playlist parsing
│   │   ├── reverb.ts            # Reverb effect implementation
│   │   ├── themes.ts            # Theme definitions
│   │   ├── types.ts             # TypeScript types
│   │   └── utils.ts             # General utilities
│   ├── pages/               # Page components
│   │   ├── Index.tsx            # Main player page
│   │   └── NotFound.tsx         # 404 page
│   └── main.tsx             # Entry point
├── desktop-app/             # Electron desktop application
│   ├── main.js              # Electron main process
│   ├── package.json         # Desktop dependencies
│   ├── README.md            # Desktop app user guide
│   └── SETUP.md             # Desktop app dev guide
├── public/                  # Static assets
│   ├── *.png                # PWA icons
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker (generated)
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Technologies Used

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI for accessible components
- shadcn/ui component library

### Audio Processing
- Web Audio API
- music-metadata-browser for file parsing
- Custom equalizer implementation
- Custom reverb effect using ConvolverNode

### PWA
- Vite PWA Plugin
- Workbox for service worker
- IndexedDB for offline storage

### Desktop
- Electron 28
- better-sqlite3 for database
- music-metadata for file parsing
- Sharp for image processing

## Key Features Implementation

### Audio Engine (useAudioEngine.ts)
- HTMLAudioElement for playback
- Web Audio API for effects
- 10-band equalizer using BiquadFilterNode
- Reverb using ConvolverNode
- Playback speed with pitch preservation
- Position saving to localStorage

### Color Extraction (Index.tsx)
- ColorThief library for palette extraction
- RGB to HSL conversion
- Dynamic CSS custom property updates
- Fallback to random theme on error

### PWA (vite.config.ts)
- Service worker generation
- Asset caching strategy
- Offline functionality
- Manifest generation

### Desktop Database (desktop-app/main.js)
- SQLite schema with indexes
- IPC handlers for renderer communication
- Automatic folder scanning
- Album artwork extraction and storage

## Development Tips

### Hot Reload
Changes to React components are reflected immediately. Audio engine changes may require page refresh.

### Debugging
- Use browser DevTools for web app
- Use Electron DevTools for desktop app (opens automatically in dev mode)
- Check console for audio engine logs

### Performance
- Large audio files may cause memory issues
- Artwork is resized to 300x300 for storage
- Database queries are indexed for speed

### Testing Audio Features
- Use various audio formats (MP3, FLAC, WAV)
- Test with files that have/don't have album art
- Test with different sample rates and bit depths

## Building for Production

### Web App Deployment

Deploy to static hosting:
- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- GitHub Pages: Push to gh-pages branch
- Cloudflare Pages: Connect repository

### Desktop App Distribution

1. Code signing (recommended for production):
   - Obtain code signing certificate
   - Configure in package.json
   - Sign the installer

2. Create installer:
```bash
npm run build
```

3. Test installer on clean Windows machine

4. Distribute via:
   - Direct download
   - Microsoft Store
   - Chocolatey package

## Contributing

### Code Style
- Use TypeScript for type safety
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components small and focused

### Commit Messages
- Use conventional commits format
- Examples: `feat:`, `fix:`, `docs:`, `style:`

### Pull Requests
- Create feature branch
- Write clear description
- Test thoroughly before submitting

## Troubleshooting

### Build Errors

**Module not found**
- Run `npm install` to ensure all dependencies are installed

**TypeScript errors**
- Check tsconfig.json settings
- Ensure all types are properly imported

**Vite build fails**
- Clear node_modules and reinstall
- Check for conflicting dependencies

### Runtime Errors

**Audio not playing**
- Check browser console for errors
- Ensure file format is supported
- Check Web Audio API compatibility

**PWA not installing**
- Must be served over HTTPS
- Check manifest.json is valid
- Check service worker registration

**Desktop app crashes**
- Check Electron console for errors
- Verify database file permissions
- Check file paths are correct

## License

This project is provided as-is for personal use.

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
