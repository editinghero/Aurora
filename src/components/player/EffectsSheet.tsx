import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSwipeDownClose } from "@/hooks/useSwipe";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  speed: number;
  onSpeed: (v: number) => void;
  preservePitch: boolean;
  onPreservePitch: (v: boolean) => void;
  reverbWet: number;
  onReverbWet: (v: number) => void;
};

export function EffectsSheet(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useSwipeDownClose(handleRef, () => p.onOpenChange(false), p.open);
  return (
    <Sheet open={p.open} onOpenChange={p.onOpenChange}>
      <SheetContent ref={ref} side="bottom" className="glass-strong border-t border-white/10 rounded-t-3xl pb-8">
        <div ref={handleRef} className="cursor-grab touch-none">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" aria-hidden />
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center">Effects</SheetTitle>
          </SheetHeader>
        </div>

        <div className="space-y-8 px-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm">Speed</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{p.speed.toFixed(2)}x</span>
            </div>
            <Slider min={0.5} max={1.5} step={0.05} value={[p.speed]} onValueChange={(v) => p.onSpeed(v[0])} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0.5x</span><span>1.0x</span><span>1.5x</span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <Label htmlFor="pp" className="text-sm">Preserve pitch</Label>
              <Switch id="pp" checked={p.preservePitch} onCheckedChange={p.onPreservePitch} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm">Reverb</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{Math.round(p.reverbWet * 100)}%</span>
            </div>
            <Slider min={0} max={1} step={0.01} value={[p.reverbWet]} onValueChange={(v) => p.onReverbWet(v[0])} />
            <p className="text-xs text-muted-foreground mt-2">Adds spacious hall ambience to the song.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
