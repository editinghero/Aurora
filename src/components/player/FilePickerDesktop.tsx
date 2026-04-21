import { FolderOpen, Music2, ListMusic } from "lucide-react";

type Props = {
  variant?: "icon" | "full" | "compact";
};

export function FilePickerDesktop({ variant = "icon" }: Props) {
  const scanFolder = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Open folder selection dialog
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (!folderPath) return;
        
        console.log('Scanning folder:', folderPath);
        
        // Start scanning (this happens in background)
        const result = await ipcRenderer.invoke('scan-folder', folderPath);
        console.log('Scan complete:', result);
        
        // Optionally reload tracks after scan
        // The user can then load from library
      } catch (err) {
        console.error('Failed to scan folder:', err);
      }
    }
  };

  const loadFromDatabase = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        const dbTracks = await ipcRenderer.invoke('get-tracks');
        console.log('Loaded tracks from database:', dbTracks.length);
        
        // Trigger custom event to load tracks in Index.tsx
        const event = new CustomEvent('load-from-database', { detail: dbTracks });
        window.dispatchEvent(event);
      } catch (err) {
        console.error('Failed to load from database:', err);
      }
    }
  };

  if (variant === "icon") {
    return (
      <button
        aria-label="Scan music folder"
        className="icon-btn h-10 w-10"
        onClick={scanFolder}
        title="Scan folder for music"
      >
        <FolderOpen className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="grid grid-cols-2 gap-2 auto-rows-fr">
        <button
          className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
          onClick={scanFolder}
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Scan Folder</div>
            <div className="truncate text-[11px] text-muted-foreground">Add to library</div>
          </div>
        </button>
        <button
          className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
          onClick={loadFromDatabase}
        >
          <ListMusic className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Library</div>
            <div className="truncate text-[11px] text-muted-foreground">Load saved</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 auto-rows-fr">
      <button
        className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
        onClick={scanFolder}
      >
        <FolderOpen className="mb-2 h-5 w-5 text-accent" />
        <div className="text-sm font-medium">Scan Folder</div>
        <div className="text-xs text-muted-foreground">Add music to library</div>
      </button>
      <button
        className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
        onClick={loadFromDatabase}
      >
        <Music2 className="mb-2 h-5 w-5 text-accent" />
        <div className="text-sm font-medium">Load Library</div>
        <div className="text-xs text-muted-foreground">From database</div>
      </button>
    </div>
  );
}
