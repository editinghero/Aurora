import { Music } from "lucide-react";
import type { Track } from "@/lib/types";

export function AlbumArt({ track }: { track?: Track }) {
  return (
    <div className="relative aspect-square w-full mx-auto">
      <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
        {/* Dynamic gradient that changes with theme */}
        <div 
          className="h-full w-full flex items-center justify-center transition-all duration-700"
          style={{
            background: `linear-gradient(135deg, hsl(var(--glow-3)) 0%, hsl(var(--glow)) 50%, hsl(var(--glow-2)) 100%)`,
          }}
        >
          <Music className="h-16 w-16 text-primary-foreground/85" />
        </div>
      </div>
    </div>
  );
}
