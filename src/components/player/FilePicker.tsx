import { useRef } from "react";
import { FolderOpen, ListMusic, Music2, Plus } from "lucide-react";
import { fileToTrack, isAudioFile } from "@/lib/audio-utils";
import type { Track } from "@/lib/types";

type Props = {
  variant?: "icon" | "full" | "compact";
  onTracks: (tracks: Track[], replace: boolean) => void;
  onPlaylist?: (playlistFile: File) => void;
};

export function FilePicker({ onTracks, onPlaylist, variant = "icon" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const playlistRef = useRef<HTMLInputElement>(null);

  const handle = async (files: FileList | null, replace: boolean) => {
    if (!files) return;
    const arr = Array.from(files).filter(isAudioFile);
    if (!arr.length) return;
    const tracks = await Promise.all(arr.map(fileToTrack));
    onTracks(tracks, replace);
  };

  const handlePlaylist = (files: FileList | null) => {
    const playlistFile = files?.[0];
    if (!playlistFile || !onPlaylist) return;
    void onPlaylist(playlistFile);
  };

  if (variant === "icon") {
    return (
      <>
        <button
          aria-label="Add songs"
          className="icon-btn h-10 w-10"
          onClick={() => fileRef.current?.click()}
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => { handle(e.target.files, false); e.target.value = ""; }}
        />
        <input
          ref={dirRef}
          type="file"
          hidden
          // @ts-expect-error non-standard but supported
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => { handle(e.target.files, false); e.target.value = ""; }}
        />
        <input
          ref={playlistRef}
          type="file"
          accept=".m3u,.m3u8,audio/x-mpegurl,audio/mpegurl,application/vnd.apple.mpegurl"
          hidden
          onChange={(e) => { handlePlaylist(e.target.files); e.target.value = ""; }}
        />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <div className="grid grid-cols-3 gap-2 auto-rows-fr">
          <button
            className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
            onClick={() => fileRef.current?.click()}
          >
            <Music2 className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Songs</div>
              <div className="truncate text-[11px] text-muted-foreground">Add files</div>
            </div>
          </button>
          <button
            className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
            onClick={() => dirRef.current?.click()}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Folder</div>
              <div className="truncate text-[11px] text-muted-foreground">Import all</div>
            </div>
          </button>
          <button
            className="glass flex min-h-[76px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary/60"
            onClick={() => playlistRef.current?.click()}
          >
            <ListMusic className="h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Playlist</div>
              <div className="truncate text-[11px] text-muted-foreground">Load M3U</div>
            </div>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => { handle(e.target.files, false); e.target.value = ""; }}
        />
        <input
          ref={dirRef}
          type="file"
          hidden
          // @ts-expect-error non-standard but supported
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => { handle(e.target.files, false); e.target.value = ""; }}
        />
        <input
          ref={playlistRef}
          type="file"
          accept=".m3u,.m3u8,audio/x-mpegurl,audio/mpegurl,application/vnd.apple.mpegurl"
          hidden
          onChange={(e) => { handlePlaylist(e.target.files); e.target.value = ""; }}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 auto-rows-fr">
        <button
          className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
          onClick={() => fileRef.current?.click()}
        >
          <Music2 className="mb-2 h-5 w-5 text-accent" />
          <div className="text-sm font-medium">Choose songs</div>
          <div className="text-xs text-muted-foreground">Pick audio files</div>
        </button>
        <button
          className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
          onClick={() => dirRef.current?.click()}
        >
          <FolderOpen className="mb-2 h-5 w-5 text-accent" />
          <div className="text-sm font-medium">Open folder</div>
          <div className="text-xs text-muted-foreground">Load a folder</div>
        </button>
        <button
          className="glass flex min-h-[158px] min-w-0 flex-col justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-secondary/50"
          onClick={() => playlistRef.current?.click()}
        >
          <ListMusic className="mb-2 h-5 w-5 text-accent" />
          <div className="text-sm font-medium">Import playlist</div>
          <div className="text-xs text-muted-foreground">M3U / M3U8</div>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => { handle(e.target.files, true); e.target.value = ""; }}
      />
      <input
        ref={dirRef}
        type="file"
        hidden
        // @ts-expect-error non-standard
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => { handle(e.target.files, true); e.target.value = ""; }}
      />
      <input
        ref={playlistRef}
        type="file"
        accept=".m3u,.m3u8,audio/x-mpegurl,audio/mpegurl,application/vnd.apple.mpegurl"
        hidden
        onChange={(e) => { handlePlaylist(e.target.files); e.target.value = ""; }}
      />
    </>
  );
}
