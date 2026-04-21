import { ListMusic, Sliders, Sparkles, Plus, History, Minimize2, Music2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { fileToTrack, isAudioFile } from "@/lib/audio-utils";
import type { Track } from "@/lib/types";

type Props = {
  onAddTracks: (tracks: Track[], replace: boolean) => void;
  onOpenQueue: () => void;
  onOpenEq: () => void;
  onOpenEffects: () => void;
  onOpenHistory?: () => void;
};

/**
 * Single uniform pill navbar with evenly-sized icon buttons.
 */
export function FloatingNavbar({ onAddTracks, onOpenQueue, onOpenEq, onOpenEffects, onOpenHistory }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = typeof window !== 'undefined' && 
                          typeof (window as any).require === 'function';
    setIsElectron(checkElectron);
    console.log('FloatingNavbar - isElectron:', checkElectron);
  }, []);

  const handle = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(isAudioFile);
    if (!arr.length) return;
    
    // Show dialog: Play Now or Add to Queue
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('show-add-files-dialog');
        
        if (!result) return; // User cancelled
        
        const tracks = await Promise.all(arr.map(fileToTrack));
        
        if (result === 'play-now') {
          // Add to top of queue and play
          const event = new CustomEvent('play-now', { detail: tracks });
          window.dispatchEvent(event);
        } else {
          // Add to end of queue
          onAddTracks(tracks, false);
        }
      } catch (err) {
        console.error('Failed to show dialog:', err);
        // Fallback: just add to queue
        const tracks = await Promise.all(arr.map(fileToTrack));
        onAddTracks(tracks, false);
      }
    } else {
      // Web app: just add to queue
      const tracks = await Promise.all(arr.map(fileToTrack));
      onAddTracks(tracks, false);
    }
  };

  const toggleMiniPlayer = () => {
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('toggle-mini-player');
    }
  };

  const items = [
    { label: "Add songs", icon: Plus, onClick: () => fileRef.current?.click() },
    { label: "Library", icon: ListMusic, onClick: onOpenQueue },
    ...(onOpenHistory ? [{ label: "History", icon: History, onClick: onOpenHistory }] : []),
    { label: "Equalizer", icon: Sliders, onClick: onOpenEq },
    { label: "Effects", icon: Sparkles, onClick: onOpenEffects },
    ...(isElectron ? [{ label: "Mini Player", icon: Minimize2, onClick: toggleMiniPlayer }] : []),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 pointer-events-none"
      aria-label="Player controls"
    >
      <div className="mx-auto flex max-w-xs justify-center px-4 pointer-events-auto">
        <div className="glass-pill flex items-center gap-1 p-1.5">
          {items.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              aria-label={label}
              onClick={onClick}
              className="icon-btn h-11 w-11"
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => { handle(e.target.files); e.target.value = ""; }}
      />
    </nav>
  );
}
