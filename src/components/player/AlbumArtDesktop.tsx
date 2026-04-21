import { Music } from "lucide-react";
import type { Track } from "@/lib/types";

export function AlbumArtDesktop({ track }: { track?: Track }) {
  return (
    <div className="relative aspect-square w-full mx-auto">
      <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
        {track?.artworkUrl ? (
          // Show actual artwork in desktop app
          <img
            src={track.artworkUrl}
            alt={`${track.title} cover art`}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          // Show dynamic gradient if no artwork
          <div 
            className="h-full w-full flex items-center justify-center transition-all duration-700"
            style={{
              background: `linear-gradient(135deg, hsl(var(--glow-3)) 0%, hsl(var(--glow)) 50%, hsl(var(--glow-2)) 100%)`,
            }}
          >
            <Music className="h-16 w-16 text-primary-foreground/85" />
          </div>
        )}
      </div>
    </div>
  );
}
