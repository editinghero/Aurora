import { Clock, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/audio-utils";
import type { PlayHistoryEntry } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: PlayHistoryEntry[];
  onPlay: (trackId: string) => void;
  onClear: () => void;
};

export function HistorySheet({ open, onOpenChange, history, onPlay, onClear }: Props) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] glass-strong border-t border-white/10">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Play History
            </SheetTitle>
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="icon-btn h-9 w-9"
                aria-label="Clear history"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No play history yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Songs you play will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {history.map((entry, idx) => (
                <button
                  key={`${entry.trackId}-${entry.playedAt}-${idx}`}
                  onClick={() => onPlay(entry.trackId)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div 
                    className="h-12 w-12 rounded-md shrink-0 flex items-center justify-center transition-all duration-700"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--glow-3)) 0%, hsl(var(--glow)) 50%, hsl(var(--glow-2)) 100%)`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.artist || "Unknown artist"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDate(entry.playedAt)}
                    </p>
                  </div>
                  {entry.durationSec && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTime(entry.durationSec)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
