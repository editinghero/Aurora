import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, X, Maximize2 } from "lucide-react";

const MiniPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{
    title: string;
    artist: string;
    progress: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');

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

  const closeMiniPlayer = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('close-mini-player');
      } catch (err) {
        console.error('Failed to close mini player:', err);
      }
    }
  };

  const progressPercent = currentTrack 
    ? (currentTrack.progress / currentTrack.duration) * 100 
    : 0;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f1014 0%, #1a1520 100%)',
      color: '#f5f1ed',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      WebkitAppRegion: 'drag'
    } as any}>
      {/* Close button - top right corner */}
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        zIndex: 1000,
        WebkitAppRegion: 'no-drag'
      } as any}>
        <button
          onClick={closeMiniPlayer}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            WebkitAppRegion: 'no-drag'
          } as any}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Close mini player"
        >
          <X size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Draggable area */}
      <div style={{
        flex: 1,
        padding: '8px 12px',
        cursor: 'move',
        userSelect: 'none'
      }}>
        {/* Track info */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentTrack?.title || 'No track playing'}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#a89f96',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentTrack?.artist || 'Unknown artist'}
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px',
          WebkitAppRegion: 'no-drag'
        } as any}>
          <button
            onClick={() => sendControl('previous')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: '#f5f1ed',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              WebkitAppRegion: 'no-drag'
            } as any}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 53, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <SkipBack size={16} />
          </button>
          
          <button
            onClick={() => sendControl('toggle')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #ffa94d, #ff6b35, #f72585)',
              color: '#0f1014',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
              WebkitAppRegion: 'no-drag'
            } as any}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
          </button>
          
          <button
            onClick={() => sendControl('next')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: '#f5f1ed',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              WebkitAppRegion: 'no-drag'
            } as any}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 53, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div 
          onClick={(e) => {
            if (!currentTrack || !currentTrack.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const newTime = percent * currentTrack.duration;
            
            console.log('Seeking to:', newTime, 'seconds');
            
            if (typeof window.require === 'function') {
              const { ipcRenderer } = window.require('electron');
              ipcRenderer.send('mini-seek', newTime);
            }
          }}
          style={{
            position: 'relative',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag'
          } as any}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #ffa94d, #ff6b35)',
            borderRadius: '2px',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
