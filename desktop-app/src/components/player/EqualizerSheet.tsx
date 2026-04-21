import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EQ_BANDS } from "@/lib/types";
import { useSwipeDownClose } from "@/hooks/useSwipe";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  gains: number[];
  onChange: (i: number, v: number) => void;
  onReset: () => void;
};

const formatHz = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

export function EqualizerSheet({ open, onOpenChange, gains, onChange, onReset }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useSwipeDownClose(handleRef, () => onOpenChange(false), open);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="bottom" className="glass-strong border-t border-white/10 rounded-t-3xl pb-8">
        <div ref={handleRef} className="cursor-grab touch-none">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" aria-hidden />
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center">Equalizer</SheetTitle>
          </SheetHeader>
        </div>
        <div className="grid grid-cols-10 gap-2 px-1">
          {EQ_BANDS.map((freq, i) => (
            <div key={freq} className="flex flex-col items-center gap-2">
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {gains[i] > 0 ? "+" : ""}
                {gains[i].toFixed(0)}
              </div>
              <div className="h-40">
                <Slider
                  orientation="vertical"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={[gains[i]]}
                  onValueChange={(v) => onChange(i, v[0])}
                  className="h-full"
                />
              </div>
              <div className="text-[10px] text-muted-foreground">{formatHz(freq)}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <Button variant="secondary" size="sm" onClick={onReset} className="rounded-full">
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
