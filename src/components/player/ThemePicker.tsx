import { Palette, Check, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { THEMES, type Theme } from "@/lib/themes";

type Props = {
  current: string;
  autoChange: boolean;
  onSelect: (theme: Theme) => void;
  onToggleAuto: (v: boolean) => void;
};

export function ThemePicker({ current, autoChange, onSelect, onToggleAuto }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Change theme" className="icon-btn h-9 w-9 shrink-0">
          <Palette className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="glass-strong w-72 rounded-2xl border-glass-border p-3">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 p-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--glow))]" />
            <div>
              <p className="text-xs font-semibold">Surprise me</p>
              <p className="text-[10px] text-muted-foreground">Auto-change on every track</p>
            </div>
          </div>
          <Switch checked={autoChange} onCheckedChange={onToggleAuto} aria-label="Auto theme" />
        </div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Themes</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {THEMES.map((t) => {
            const active = t.id === current;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className={`group relative flex items-center gap-2 rounded-xl  p-2 transition-all hover:border-white/20 hover:scale-[1.02] ${active ? "ring-2 ring-white/60" : ""}`}
                style={{
                  background: `linear-gradient(135deg, hsl(${t.glow3}), hsl(${t.glow}) 50%, hsl(${t.glow2}))`,
                }}
              >
                <span className="text-[11px] font-semibold text-black/80 drop-shadow">{t.name}</span>
                {active && <Check className="ml-auto h-3 w-3 text-black/80" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
