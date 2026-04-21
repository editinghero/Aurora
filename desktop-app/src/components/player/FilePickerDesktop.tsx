import { FolderOpen, Music2, ListMusic } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  variant?: "icon" | "full" | "compact";
};

export function FilePickerDesktop({ variant = "icon" }: Props) {
  const [lastFolder, setLastFolder] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, added: 0 });

  useEffect(() => {
    // Load last folder path from database
    loadLastFolder();

    // Listen for scan progress
    if (typeof window.require === 'function') {
      const { ipcRenderer } = window.require('electron');
      
      const handleProgress = (_event: any, progress: any) => {
        setScanProgress(progress);
      };

      ipcRenderer.on('scan-progress', handleProgress);
      return () => {
        ipcRenderer.removeListener('scan-progress', handleProgress);
      };
    }
  }, []);

  const loadLastFolder = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        const folder = await ipcRenderer.invoke('get-last-folder');
        setLastFolder(folder);
      } catch (err) {
        console.error('Failed to load last folder:', err);
      }
    }
  };

  const selectAndScanFolder = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Ask user: Clear queue or Add to queue?
        const result = await ipcRenderer.invoke('show-folder-dialog');
        if (!result) return; // User cancelled
        
        console.log('User choice:', result);
        
        // Open folder selection dialog
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (!folderPath) return;
        
        console.log('Selected folder:', folderPath);
        
        setIsScanning(true);
        setScanProgress({ scanned: 0, added: 0 });
        
        // Start scanning
        console.log('Starting scan...');
        const scanResult = await ipcRenderer.invoke('scan-folder', folderPath);
        console.log('Scan complete:', scanResult);
        
        // Save as last folder
        await ipcRenderer.invoke('save-last-folder', folderPath);
        setLastFolder(folderPath);
        
        setIsScanning(false);
        
        // ALWAYS load tracks after scanning, regardless of how many were added
        // The scan may have found 0 NEW files, but there are existing files in database
        if (result === 'clear') {
          console.log('Clearing queue and loading...');
          // Clear queue and load new tracks
          const event = new CustomEvent('clear-and-load-database', { detail: null });
          window.dispatchEvent(event);
        } else if (result === 'add') {
          console.log('Adding to queue...');
          // Add to existing queue - load ALL tracks from database, not just new ones
          await loadFromDatabase();
        }
      } catch (err) {
        console.error('Failed to scan folder:', err);
        setIsScanning(false);
      }
    }
  };

  const rescanLastFolder = async () => {
    if (!lastFolder) return;
    
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        setIsScanning(true);
        setScanProgress({ scanned: 0, added: 0 });
        
        // Rescan the last folder
        const result = await ipcRenderer.invoke('scan-folder', lastFolder);
        console.log('Rescan complete:', result);
        
        setIsScanning(false);
        
        // Auto-load after rescan
        await loadFromDatabase();
      } catch (err) {
        console.error('Failed to rescan folder:', err);
        setIsScanning(false);
      }
    }
  };

  const loadFromDatabase = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Load only first 100 tracks to avoid hanging
        const tracks = await ipcRenderer.invoke('get-tracks-limit', 100);
        console.log('Loaded tracks from database:', tracks.length);
        
        // Trigger custom event to load tracks in Index.tsx
        const event = new CustomEvent('load-from-database', { detail: tracks });
        window.dispatchEvent(event);
      } catch (err) {
        console.error('Failed to load from database:', err);
      }
    }
  };

  const scanWindowsMusic = async () => {
    if (typeof window.require === 'function') {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Get Windows Music folder path
        const musicFolder = await ipcRenderer.invoke('get-windows-music-folder');
        if (!musicFolder) {
          console.error('Could not find Windows Music folder');
          return;
        }
        
        setIsScanning(true);
        setScanProgress({ scanned: 0, added: 0 });
        
        // Scan Windows Music folder
        const result = await ipcRenderer.invoke('scan-folder', musicFolder);
        console.log('Windows Music scan complete:', result);
        
        // Save as last folder
        await ipcRenderer.invoke('save-last-folder', musicFolder);
        setLastFolder(musicFolder);
        
        setIsScanning(false);
        
        // Auto-load after scan
        await loadFromDatabase();
      } catch (err) {
        console.error('Failed to scan Windows Music folder:', err);
        setIsScanning(false);
      }
    }
  };

  if (variant === "icon") {
    return (
      <button
        aria-label="Scan music folder"
        className="icon-btn h-10 w-10"
        onClick={selectAndScanFolder}
        title="Scan folder for music"
        disabled={isScanning}
      >
        <FolderOpen className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {isScanning && (
          <div className="glass rounded-2xl px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground">
              Scanning: {scanProgress.scanned} files, {scanProgress.added} added
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 auto-rows-fr">
          <button
            className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
            onClick={selectAndScanFolder}
            disabled={isScanning}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Open Folder</div>
              <div className="truncate text-[11px] text-muted-foreground">Add music</div>
            </div>
          </button>
          <button
            className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
            onClick={loadFromDatabase}
            disabled={isScanning}
          >
            <ListMusic className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Library</div>
              <div className="truncate text-[11px] text-muted-foreground">Load saved</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isScanning && (
        <div className="glass rounded-[1.5rem] p-4 text-center">
          <div className="text-sm font-medium">Scanning your music...</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {scanProgress.scanned} files scanned, {scanProgress.added} tracks added
          </div>
        </div>
      )}
      
      {lastFolder ? (
        <div className="space-y-3">
          <div className="glass rounded-[1.5rem] p-4">
            <div className="text-xs text-muted-foreground mb-1">Last scanned folder:</div>
            <div className="text-sm font-medium truncate">{lastFolder}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 auto-rows-fr">
            <button
              className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
              onClick={selectAndScanFolder}
              disabled={isScanning}
            >
              <FolderOpen className="mb-2 h-5 w-5 text-accent" />
              <div className="text-sm font-medium">Open Folder</div>
              <div className="text-xs text-muted-foreground">Add more music</div>
            </button>
            <button
              className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
              onClick={loadFromDatabase}
              disabled={isScanning}
            >
              <Music2 className="mb-2 h-5 w-5 text-accent" />
              <div className="text-sm font-medium">Library</div>
              <div className="text-xs text-muted-foreground">Load saved tracks</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 auto-rows-fr">
          <button
            className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
            onClick={selectAndScanFolder}
            disabled={isScanning}
          >
            <FolderOpen className="mb-2 h-5 w-5 text-accent" />
            <div className="text-sm font-medium">Open Folder</div>
            <div className="text-xs text-muted-foreground">Choose your music folder</div>
          </button>
          <button
            className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
            onClick={loadFromDatabase}
            disabled={isScanning}
          >
            <Music2 className="mb-2 h-5 w-5 text-accent" />
            <div className="text-sm font-medium">Library</div>
            <div className="text-xs text-muted-foreground">Load saved tracks</div>
          </button>
        </div>
      )}
    </div>
  );
}
