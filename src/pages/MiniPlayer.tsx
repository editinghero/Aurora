import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, X, Maximize2 } from "lucide-react";

// Declare electron for TypeScript
declare global {
  interface Window {
    require?: any;
  }
}

const MiniPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{
    title: string;
    artist: string;
    progress: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');

      // Listen for playback state updates from main window
      ipcRenderer.on('playback-state', (_event: any, data: any) => {
        setIsPlaying(data.isPlaying);
        setCurrentTrack({
          title: data.title || 'No track',
          artist: data.artist || 'Unknown artist',
          progress: data.currentTime || 0,
          duration: data.duration || 0
        });
      });

      return () => {
        ipcRenderer.removeAllListeners('playback-state');
      };
    }
  }, []);

  const sendControl = (command: string) => {
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mini-control', command);
    }
  };

  const closeMiniPlayer = () => {
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('close-mini-player');
    }
  };

  const openMainWindow = () => {
    closeMiniPlayer();
    // Main window should already be open
  };

  const progressPercent = currentTrack 
    ? (currentTrack.progress / currentTrack.duration) * 100 
    : 0;

  return (
    <div 
      className="h-screen w-full bg-gradient-to-br from-background via-background to-secondary/20 border border-border/50 flex flex-col"
      style={{ 
        background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)',
        borderRadius: '12px'
      }}
    >
      {/* Draggable area */}
      <div 
        className="flex-1 px-3 py-2 cursor-move select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Track info */}
        <div className="mb-2">
          <div className="text-sm font-semibold truncate text-foreground">
            {currentTrack?.title || 'No track playing'}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {currentTrack?.artist || 'Unknown artist'}
          </div>
        </div>

        {/* Controls */}
        <div 
          className="flex items-center justify-center gap-2 mb-2"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={() => sendControl('previous')}
            className="h-8 w-8 rounded-full hover:bg-accent/20 flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => sendControl('toggle')}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, hsl(var(--glow-3)), hsl(var(--glow)) 55%, hsl(var(--glow-2)))' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-primary-foreground" />
            ) : (
              <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => sendControl('next')}
            className="h-8 w-8 rounded-full hover:bg-accent/20 flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 bg-secondary/30 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{ 
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, hsl(var(--glow-3)), hsl(var(--glow)))'
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div 
        className="flex items-center justify-end gap-1 px-2 pb-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={openMainWindow}
          className="h-6 w-6 rounded hover:bg-accent/20 flex items-center justify-center transition-colors"
          aria-label="Open main window"
          title="Open main window"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        <button
          onClick={closeMiniPlayer}
          className="h-6 w-6 rounded hover:bg-destructive/20 flex items-center justify-center transition-colors"
          aria-label="Close mini player"
          title="Close mini player"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;
