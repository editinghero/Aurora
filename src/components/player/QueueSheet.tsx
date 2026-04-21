import { useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Music2, Trash2 } from "lucide-react";
import type { Track } from "@/lib/types";
import { formatTime } from "@/lib/audio-utils";
import { FilePicker } from "./FilePicker";
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

export function QueueSheet({ open, onOpenChange, queue, currentIndex, onSelect, onAdd, onPlaylist, onMove, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Only close on swipe-down from the header strip (avoid hijacking list scroll)
  const headerRef = useRef<HTMLDivElement>(null);
  useSwipeDownClose(headerRef, () => onOpenChange(false), open);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="bottom" className="glass-strong h-[78vh] overflow-hidden rounded-t-[1.75rem] border-t border-border px-0 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
        <div ref={headerRef} className="cursor-grab touch-none">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" aria-hidden />
        <SheetHeader className="mb-2 shrink-0 px-4">
          <SheetTitle className="text-center">Library</SheetTitle>
        </SheetHeader>
        </div>
        <div className="shrink-0 px-4 pb-3">
          <FilePicker variant="compact" onTracks={onAdd} onPlaylist={onPlaylist} />
        </div>
        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <span className="text-xs text-muted-foreground">{queue.length} {queue.length === 1 ? "track" : "tracks"}</span>
          {queue.length > 0 && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {queue.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No tracks yet</div>
          )}
          {queue.map((t, i) => {
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
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
