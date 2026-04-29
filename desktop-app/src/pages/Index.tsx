import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Waves } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AlbumArt } from "@/components/player/AlbumArt";
import { Visualizer } from "@/components/player/Visualizer";
import { FloatingNavbar } from "@/components/player/FloatingNavbar";
import { EqualizerSheet } from "@/components/player/EqualizerSheet";
import { EffectsSheet } from "@/components/player/EffectsSheet";
import { QueueSheet } from "@/components/player/QueueSheet";
import { HistorySheet } from "@/components/player/HistorySheet";
import { FilePicker } from "@/components/player/FilePicker";
import { FilePickerDesktop } from "@/components/player/FilePickerDesktop";
import { ThemePicker } from "@/components/player/ThemePicker";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useSwipe } from "@/hooks/useSwipe";
import type { Track, PlayHistoryEntry } from "@/lib/types";
import { formatTime } from "@/lib/audio-utils";
import { applyPlaylistOrder, parseM3U } from "@/lib/playlist-utils";
import { applyTheme, THEMES, type Theme } from "@/lib/themes";
import { savePlayHistory, getPlayHistory, clearPlayHistory } from "@/lib/history-utils";

type VizMode = "pulse" | "bars";

const QUEUE_META_KEY = "mp.queue.meta.v1";
const QUEUE_INDEX_KEY = "mp.queue.index.v1";
const THEME_KEY = "mp.theme.v1";
const THEME_AUTO_KEY = "mp.theme.auto.v1";

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';

const Index = () => {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eqOpen, setEqOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>([]);
  const [vizMode, setVizMode] = useState<VizMode>("pulse");
  const [playlistEntries, setPlaylistEntries] = useState<string[]>([]);
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem(THEME_KEY) || "ember");
  const [autoTheme, setAutoTheme] = useState<boolean>(() => {
    const stored = localStorage.getItem(THEME_AUTO_KEY);
    return stored === null ? true : stored === "1";
  });

  const engine = useAudioEngine(queue, currentIndex, setCurrentIndex);
  const current = queue[currentIndex];
  const swipeRef = useRef<HTMLElement>(null);

  // Sync to mini player (Electron only)
  useEffect(() => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Sync playback state to mini player
        ipcRenderer.send('sync-to-mini', {
          isPlaying: engine.state.isPlaying,
          title: current?.title,
          artist: current?.artist,
          currentTime: engine.state.currentTime,
          duration: engine.state.duration
        });
      } catch (err) {
        // Not in Electron, ignore
      }
    }
  }, [engine.state.isPlaying, engine.state.currentTime, engine.state.duration, current]);

  // Listen for mini player controls (Electron only)
  useEffect(() => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        const handleControl = (_event: any, command: string) => {
          switch (command) {
            case 'toggle':
              engine.toggle();
              break;
            case 'next':
              engine.next();
              break;
            case 'previous':
              engine.prev();
              break;
          }
        };

        const handleSeek = (_event: any, time: number) => {
          engine.seek(time);
        };

        ipcRenderer.on('player-control', handleControl);
        ipcRenderer.on('player-seek', handleSeek);

        return () => {
          ipcRenderer.removeListener('player-control', handleControl);
          ipcRenderer.removeListener('player-seek', handleSeek);
        };
      } catch (err) {
        // Not in Electron, ignore
      }
    }
  }, [engine]);

  // Load play history on mount
  useEffect(() => {
    if (isElectron) {
      // Load from database in desktop app
      loadHistoryFromDatabase();
    } else {
      // Load from localStorage in web app
      setPlayHistory(getPlayHistory());
    }
  }, []);

  const loadHistoryFromDatabase = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        const dbHistory = await ipcRenderer.invoke('get-history', 100);
        
        // Convert database history to PlayHistoryEntry format
        const history: PlayHistoryEntry[] = dbHistory.map((item: any) => ({
          trackId: item.track_id.toString(),
          title: item.title,
          artist: item.artist,
          album: item.album,
          durationSec: item.duration,
          playedAt: new Date(item.played_at).getTime()
        }));
        
        setPlayHistory(history);
      } catch (err) {
        console.error('Failed to load history from database:', err);
      }
    }
  };

  // Track when a song starts playing
  useEffect(() => {
    if (current && engine.state.isPlaying) {
      if (isElectron) {
        // Save to database in desktop app
        saveToDatabase(current);
      } else {
        // Save to localStorage in web app
        savePlayHistory(current);
        setPlayHistory(getPlayHistory());
      }
    }
  }, [current?.id, engine.state.isPlaying]);

  const saveToDatabase = async (track: Track) => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        // Extract track ID from the track (if it came from database)
        const trackId = parseInt(track.id.split('-')[0]);
        if (!isNaN(trackId)) {
          await ipcRenderer.invoke('add-to-history', trackId);
          await loadHistoryFromDatabase();
        }
      } catch (err) {
        console.error('Failed to save to database:', err);
      }
    }
  };

  useEffect(() => {
    const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
    
    // If auto theme is disabled, apply the selected theme
    if (!autoTheme) {
      applyTheme(t);
    } else if (current) {
      // If autoTheme is on, a random theme is already applied in the next useEffect.
    } else {
      applyTheme(t);
    }
    
    localStorage.setItem(THEME_KEY, t.id);
  }, [themeId, autoTheme, current?.id]);

  useEffect(() => {
    localStorage.setItem(THEME_AUTO_KEY, autoTheme ? "1" : "0");
    
    // If auto theme is enabled, pick a random theme when songs change
    if (autoTheme && current) {
      const idx = Math.floor(Math.random() * THEMES.length);
      const randomTheme = THEMES[idx];
      applyTheme(randomTheme);
      console.log('Auto theme applied:', randomTheme.name);
    }
  }, [autoTheme, current?.id]);

  useSwipe(swipeRef, {
    onSwipeLeft: () => engine.next(),
    onSwipeRight: () => engine.prev(),
    onSwipeUp: () => setQueueOpen(true),
    onSwipeDown: () => {
      if (eqOpen) setEqOpen(false);
      else if (fxOpen) setFxOpen(false);
      else if (queueOpen) setQueueOpen(false);
    },
  });

  // Restore last index on first load (file objects can't persist — only metadata hint)
  useEffect(() => {
    const idx = Number(localStorage.getItem(QUEUE_INDEX_KEY) || 0);
    if (!Number.isNaN(idx)) setCurrentIndex(idx);
  }, []);

  // Persist last queue metadata + index
  useEffect(() => {
    localStorage.setItem(QUEUE_INDEX_KEY, String(currentIndex));
    const meta = queue.map((t) => ({ id: t.id, title: t.title, artist: t.artist, album: t.album }));
    localStorage.setItem(QUEUE_META_KEY, JSON.stringify(meta));
  }, [queue, currentIndex]);

  const addTracks = (tracks: Track[], replace: boolean) => {
    const base = replace ? [] : queue;
    const seen = new Set(base.map((t) => t.id));
    const merged = [...base];
    for (const t of tracks) if (!seen.has(t.id)) merged.push(t);

    const ordered = playlistEntries.length ? applyPlaylistOrder(merged, playlistEntries) : merged;
    const activeId = replace ? ordered[0]?.id : current?.id;

    setQueue(ordered);

    // Always autoplay when adding tracks
    if (replace) {
      // Starting fresh - play first track
      setCurrentIndex(0);
      setTimeout(() => {
        console.log('Autoplay: Starting playback after replace');
        engine.play();
      }, 200);
    } else if (queue.length === 0 && tracks.length > 0) {
      // Queue was empty, now has tracks - play first track
      setCurrentIndex(0);
      setTimeout(() => {
        console.log('Autoplay: Starting playback for empty queue');
        engine.play();
      }, 200);
    } else if (!engine.state.isPlaying && tracks.length > 0) {
      // Adding to existing queue and not playing - start playing the first new track
      const firstNewTrackIndex = ordered.findIndex(t => tracks.some(newT => newT.id === t.id));
      if (firstNewTrackIndex >= 0) {
        setCurrentIndex(firstNewTrackIndex);
        setTimeout(() => {
          console.log('Autoplay: Starting playback for new tracks');
          engine.play();
        }, 200);
      }
    }

    if (activeId && engine.state.isPlaying) {
      const nextIndex = ordered.findIndex((track) => track.id === activeId);
      if (nextIndex >= 0 && nextIndex !== currentIndex) setCurrentIndex(nextIndex);
    }
  };

  const clearQueue = () => {
    queue.forEach((t) => t.artworkUrl && URL.revokeObjectURL(t.artworkUrl));
    setQueue([]);
    setCurrentIndex(0);
    engine.pause();
  };

  const importPlaylist = async (playlistFile: File) => {
    try {
      console.log('Importing playlist:', playlistFile.name);
      const text = await playlistFile.text();
      console.log('Playlist content:', text.substring(0, 200));
      
      const entries = parseM3U(text);
      console.log('Parsed entries:', entries.length, entries);
      
      if (!entries.length) {
        console.warn('No valid entries found in playlist');
        return;
      }

      setPlaylistEntries(entries);
      
      if (!queue.length) {
        console.log('Queue is empty, playlist will be applied when tracks are added');
        return;
      }

      const activeId = current?.id;
      const ordered = applyPlaylistOrder(queue, entries);
      console.log('Reordered queue:', ordered.length, 'tracks');
      setQueue(ordered);

      if (activeId) {
        const nextIndex = ordered.findIndex((track) => track.id === activeId);
        if (nextIndex >= 0 && nextIndex !== currentIndex) setCurrentIndex(nextIndex);
      }
    } catch (err) {
      console.error('Failed to import playlist:', err);
    }
  };

  const moveQueueItem = (from: number, to: number) => {
    if (from === to || to < 0 || to >= queue.length) return;

    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });

    setCurrentIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  };

  const playFromHistory = (trackId: string) => {
    if (isElectron) {
      // In desktop app, load track from database if not in queue
      const idx = queue.findIndex((t) => t.id === trackId || t.id.startsWith(trackId + '-'));
      if (idx >= 0) {
        setCurrentIndex(idx);
        setTimeout(() => engine.play(), 0);
        setHistoryOpen(false);
      } else {
        // Track not in queue, load from database
        loadTrackFromDatabase(trackId);
      }
    } else {
      // In web app, only play if in queue
      const idx = queue.findIndex((t) => t.id === trackId);
      if (idx >= 0) {
        setCurrentIndex(idx);
        setTimeout(() => engine.play(), 0);
        setHistoryOpen(false);
      }
    }
  };

  const loadTrackFromDatabase = async (trackId: string) => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        const dbTracks = await ipcRenderer.invoke('get-tracks');
        const dbTrack = dbTracks.find((t: any) => t.id.toString() === trackId);
        
        if (dbTrack) {
          const tracks = await convertDatabaseTracksToTracks([dbTrack]);
          if (tracks.length > 0) {
            addTracks(tracks, false);
            // Find and play the newly added track
            setTimeout(() => {
              const idx = queue.findIndex((t) => t.id === tracks[0].id);
              if (idx >= 0) {
                setCurrentIndex(idx);
                setTimeout(() => engine.play(), 0);
              }
            }, 200);
            setHistoryOpen(false);
          }
        }
      } catch (err) {
        console.error('Failed to load track from database:', err);
      }
    }
  };

  const convertDatabaseTracksToTracks = async (dbTracks: any[]): Promise<Track[]> => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        const tracks: Track[] = [];
        
        for (const dbTrack of dbTracks) {
          try {
            // Get artwork from database
            let artworkUrl: string | undefined;
            try {
              const artworkData = await ipcRenderer.invoke('get-artwork', dbTrack.id);
              if (artworkData) {
                artworkUrl = artworkData;
              }
            } catch (err) {
              console.warn('Failed to load artwork for track:', dbTrack.id);
            }
            
            // Create a File object with the actual file path as a blob URL
            // We'll use the file:// protocol which Electron can handle
            const fileUrl = `file:///${dbTrack.path.replace(/\\/g, '/')}`;
            
            // Create a minimal File object - the audio element will load from the path
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const file = new File([blob], dbTrack.path.split(/[\\/]/).pop() || 'unknown.mp3', { 
              type: 'audio/mpeg',
              lastModified: Date.now()
            });
            
            const track: Track = {
              id: `${dbTrack.id}-${dbTrack.path}`,
              file: file,
              name: dbTrack.path.split(/[\\/]/).pop() || 'unknown.mp3',
              title: dbTrack.title || 'Unknown',
              artist: dbTrack.artist,
              album: dbTrack.album,
              durationSec: dbTrack.duration,
              artworkUrl: artworkUrl
            };
            
            tracks.push(track);
          } catch (err) {
            console.error('Failed to convert track:', dbTrack.path, err);
          }
        }
        
        return tracks;
      } catch (err) {
        console.error('Failed to convert database tracks:', err);
        return [];
      }
    }
    return [];
  };

  // Listen for load-from-database event (from FilePickerDesktop)
  useEffect(() => {
    const handleLoadFromDatabase = async (event: any) => {
      const dbTracks = event.detail;
      console.log('Converting database tracks to Track format:', dbTracks.length);
      const tracks = await convertDatabaseTracksToTracks(dbTracks);
      console.log('Converted tracks:', tracks.length);
      if (tracks.length > 0) {
        addTracks(tracks, false);
      }
    };

    const handleClearAndLoad = async () => {
      console.log('handleClearAndLoad called');
      
      // Then load from database
      if (typeof window.require === 'function') {
        try {
          const { ipcRenderer } = window.require('electron');
          const dbTracks = await ipcRenderer.invoke('get-tracks-limit', 100);
          console.log('Loaded tracks for clear and load:', dbTracks.length);
          const tracks = await convertDatabaseTracksToTracks(dbTracks);
          console.log('Converted tracks for clear and load:', tracks.length);
          if (tracks.length > 0) {
            // Clear queue first, then add new tracks
            clearQueue();
            setTimeout(() => {
              addTracks(tracks, true);
            }, 100);
          }
        } catch (err) {
          console.error('Failed to clear and load:', err);
        }
      }
    };

    const handlePlayNow = (event: any) => {
      const tracks: Track[] = event.detail;
      // Add tracks to beginning of queue
      setQueue((prev) => [...tracks, ...prev]);
      // Play first new track
      setCurrentIndex(0);
      setTimeout(() => engine.play(), 100);
    };

    window.addEventListener('load-from-database', handleLoadFromDatabase);
    window.addEventListener('clear-and-load-database', handleClearAndLoad);
    window.addEventListener('play-now', handlePlayNow);
    
    return () => {
      window.removeEventListener('load-from-database', handleLoadFromDatabase);
      window.removeEventListener('clear-and-load-database', handleClearAndLoad);
      window.removeEventListener('play-now', handlePlayNow);
    };
  }, [queue, engine]);

  const handleClearHistory = async () => {
    if (isElectron) {
      // Clear from database in desktop app
      if (typeof window.require === 'function') {
        try {
          const { ipcRenderer } = window.require('electron');
          await ipcRenderer.invoke('clear-history');
          setPlayHistory([]);
        } catch (err) {
          console.error('Failed to clear history from database:', err);
        }
      }
    } else {
      // Clear from localStorage in web app
      clearPlayHistory();
      setPlayHistory([]);
    }
  };

  return (
    <main ref={swipeRef} className="relative min-h-screen overflow-hidden touch-pan-y">
      {/* SEO */}
      <h1 className="sr-only">Aurora Music Player — sleek local audio player with EQ and reverb</h1>

      {/* Ambient backdrop (theme-driven) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--glow) / 0.55), hsl(var(--glow-2) / 0.35) 55%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-20 h-[380px] w-[380px] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--glow-2) / 0.5), transparent 70%)" }} />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-28 pt-2 sm:pb-32 sm:pt-4">
        {/* Top bar */}
        <header className="mb-2 flex items-center gap-2 animate-fade-in-up">
          <ThemePicker
            current={themeId}
            autoChange={autoTheme}
            onSelect={(t) => setThemeId(t.id)}
            onToggleAuto={setAutoTheme}
          />
          <div className="min-w-0 flex-1 px-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">Now Playing</p>
            <h2 className="mt-0.5 truncate text-sm font-semibold sm:text-base">{current?.title ?? "Nothing loaded"}</h2>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {current?.artist || (queue.length ? "Unknown artist" : "Swipe ← → to skip · ↑ for library")}
            </p>
          </div>
          <button
            onClick={() => setVizMode((m) => (m === "pulse" ? "bars" : "pulse"))}
            className="icon-btn h-9 w-9 shrink-0"
            aria-label="Toggle bars visualizer"
            title="Toggle bars visualizer"
          >
            <Waves className="h-4 w-4" />
          </button>
        </header>

        {/* Album + visualizer */}
        <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center pt-1">
          <div className="relative aspect-square w-full max-w-[200px] sm:max-w-[320px] lg:max-w-[440px]">
            {/* Animated moving blurred circles */}
            <div className="pointer-events-none absolute inset-[-18px] sm:inset-[-24px] lg:inset-[-30px]">
              <div className="art-glow-circle-1 absolute w-32 h-32 rounded-full" />
              <div className="art-glow-circle-2 absolute w-40 h-40 rounded-full" />
              <div className="art-glow-circle-3 absolute w-36 h-36 rounded-full" />
            </div>
            <div className="relative h-full w-full">
              <AlbumArt track={current} />
            </div>
          </div>

          {/* Bars visualizer below album */}
          {vizMode === "bars" && (
            <div className="mt-3 h-16 w-full sm:mt-4 sm:h-20">
              <Visualizer getAnalyser={engine.getAnalyser} mode="bars" active={engine.state.isPlaying} />
            </div>
          )}
        </section>

        {/* Progress + controls */}
        <section className="mt-3 space-y-2.5">
          <div className="space-y-1.5">
            <Slider
              min={0}
              max={engine.state.duration || 0}
              step={0.1}
              value={[Math.min(engine.state.currentTime, engine.state.duration || 0)]}
              onValueChange={(v) => engine.seek(v[0])}
              disabled={!current}
            />
            <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">
              <span>{formatTime(engine.state.currentTime)}</span>
              <span>{formatTime(engine.state.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              aria-label="Shuffle"
              onClick={engine.toggleShuffle}
              className={`icon-btn h-9 w-9 sm:h-10 sm:w-10 ${engine.state.shuffle ? "text-accent" : ""}`}
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button aria-label="Previous" onClick={engine.prev} className="icon-btn h-10 w-10 sm:h-11 sm:w-11" disabled={!queue.length}>
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                aria-label={engine.state.isPlaying ? "Pause" : "Play"}
                onClick={engine.toggle}
                disabled={!current}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-95 disabled:opacity-40 sm:h-14 sm:w-14"
                style={{ background: "linear-gradient(135deg, hsl(var(--glow-3)), hsl(var(--glow)) 55%, hsl(var(--glow-2)))" }}
              >
                {engine.state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button aria-label="Next" onClick={engine.next} className="icon-btn h-10 w-10 sm:h-11 sm:w-11" disabled={!queue.length}>
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <button
              aria-label="Repeat"
              onClick={engine.cycleRepeat}
              className={`icon-btn h-9 w-9 sm:h-10 sm:w-10 ${engine.state.repeat !== "off" ? "text-accent" : ""}`}
            >
              {engine.state.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>
        </section>

        {/* Empty state */}
        {queue.length === 0 && (
          <section className="mt-6 animate-fade-in-up">
            {isElectron ? (
              <FilePickerDesktop variant="full" />
            ) : (
              <FilePicker variant="full" onTracks={addTracks} onPlaylist={importPlaylist} />
            )}
          </section>
        )}
      </div>

      {/* Floating nav */}
      <FloatingNavbar
        onAddTracks={addTracks}
        onOpenQueue={() => setQueueOpen(true)}
        onOpenEq={() => setEqOpen(true)}
        onOpenEffects={() => setFxOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Sheets */}
      <EqualizerSheet
        open={eqOpen}
        onOpenChange={setEqOpen}
        gains={engine.state.eqGains}
        onChange={engine.setEqGain}
        onReset={engine.resetEq}
      />
      <EffectsSheet
        open={fxOpen}
        onOpenChange={setFxOpen}
        speed={engine.state.speed}
        onSpeed={engine.setSpeed}
        preservePitch={engine.state.preservePitch}
        onPreservePitch={engine.setPreservePitch}
        reverbWet={engine.state.reverbWet}
        onReverbWet={engine.setReverbWet}
        eightDEnabled={engine.state.eightDEnabled}
        onEightDEnabled={engine.setEightDEnabled}
        eightDSpeed={engine.state.eightDSpeed}
        onEightDSpeed={engine.setEightDSpeed}
      />
      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        currentIndex={currentIndex}
        onSelect={(i) => { setCurrentIndex(i); setTimeout(() => engine.play(), 0); }}
        onAdd={addTracks}
        onPlaylist={importPlaylist}
        onMove={moveQueueItem}
        onClear={clearQueue}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={playHistory}
        onPlay={playFromHistory}
        onClear={handleClearHistory}
      />
    </main>
  );
};

export default Index;
