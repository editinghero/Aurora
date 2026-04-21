import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Music2, Trash2, Search, X } from "lucide-react";
import type { Track } from "@/lib/types";
import { formatTime } from "@/lib/audio-utils";
import { FilePicker } from "./FilePicker";
import { FilePickerDesktop } from "./FilePickerDesktop";
import { useSwipeDownClose } from "@/hooks/useSwipe";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  queue: Track[];
  currentIndex: number;
  onSelect: (i: number) => void;
  onAdd: (tracks: Track[], replace: boolean) => void;
  onPlaylist: (playlistFile: File) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
};

const isElectron = typeof window !== 'undefined' && typeof window.require === 'function';

export function QueueSheet({ open, onOpenChange, queue, currentIndex, onSelect, onAdd, onPlaylist, onMove, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  useSwipeDownClose(headerRef, () => onOpenChange(false), open);

  // Filter queue based on search query
  const filteredQueue = searchQuery.trim()
    ? queue.filter((track, index) => {
        const query = searchQuery.toLowerCase();
        const matchesTitle = track.title.toLowerCase().includes(query);
        const matchesArtist = track.artist?.toLowerCase().includes(query);
        const matchesAlbum = track.album?.toLowerCase().includes(query);
        return matchesTitle || matchesArtist || matchesAlbum;
      })
    : queue;

  // Map filtered indices back to original queue indices
  const getOriginalIndex = (filteredIndex: number) => {
    if (!searchQuery.trim()) return filteredIndex;
    const track = filteredQueue[filteredIndex];
    return queue.findIndex(t => t.id === track.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="bottom" className="glass-strong h-[78vh] flex flex-col rounded-t-[1.75rem] border-t border-border px-0 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
        <div ref={headerRef} className="cursor-grab touch-none">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" aria-hidden />
        <SheetHeader className="mb-2 shrink-0 px-4">
          <SheetTitle className="text-center">Library</SheetTitle>
        </SheetHeader>
        </div>
        
        <div className="shrink-0 px-4 pb-3">
          {isElectron ? (
            <FilePickerDesktop variant="compact" />
          ) : (
            <FilePicker variant="compact" onTracks={onAdd} onPlaylist={onPlaylist} />
          )}
        </div>

        {/* Search Bar */}
        <div className="shrink-0 px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass w-full rounded-xl py-2 pl-10 pr-10 text-sm outline-none ring-1 ring-white/10 transition-all focus:ring-accent/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <span className="text-xs text-muted-foreground">
            {searchQuery ? `${filteredQueue.length} of ${queue.length}` : `${queue.length}`} {queue.length === 1 ? "track" : "tracks"}
          </span>
          {queue.length > 0 && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        
        <div 
          className="flex-1 px-3 pb-2" 
          style={{ 
            minHeight: 0,
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {filteredQueue.length === 0 && queue.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No tracks yet</div>
          )}
          {filteredQueue.length === 0 && queue.length > 0 && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No matches found</div>
          )}
          {filteredQueue.map((t, filteredIdx) => {
            const i = getOriginalIndex(filteredIdx);
            const active = i === currentIndex;
            const canMoveUp = i > 0;
            const canMoveDown = i < queue.length - 1;
            return (
              <div
                key={t.id}
                className={`mb-2 flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors ${
                  active ? "bg-accent/15 ring-1 ring-accent/25" : "hover:bg-secondary/40"
                }`}
              >
                <button onClick={() => onSelect(i)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <div 
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg transition-all duration-700"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--glow-3)) 0%, hsl(var(--glow)) 50%, hsl(var(--glow-2)) 100%)`,
                    }}
                  >
                    <Music2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${active ? "font-medium text-accent" : ""}`}>{t.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{t.artist || "Unknown artist"}</div>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">{formatTime(t.durationSec)}</div>
                  {!searchQuery && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${t.title} up`}
                        className="icon-btn h-7 w-7 disabled:opacity-30"
                        onClick={() => onMove(i, i - 1)}
                        disabled={!canMoveUp}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${t.title} down`}
                        className="icon-btn h-7 w-7 disabled:opacity-30"
                        onClick={() => onMove(i, i + 1)}
                        disabled={!canMoveDown}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
