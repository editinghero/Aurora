export type Theme = {
  id: string;
  name: string;
  // HSL triplets (no hsl() wrapper)
  background: string;
  foreground: string;
  card: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  ring: string;
  glow: string;
  glow2: string;
  glow3: string;
  gradientApp: string;
};

const make = (
  id: string,
  name: string,
  glow: string,
  glow2: string,
  glow3: string,
  bg: string,
  bgMid: string,
  bgTop: string,
  accent = glow,
): Theme => ({
  id,
  name,
  background: bg,
  foreground: "30 25% 96%",
  card: bg.replace(/(\d+)%$/, (m) => `${Math.min(parseInt(m) + 4, 100)}%`),
  popover: bg,
  primary: glow,
  primaryForeground: "240 20% 6%",
  secondary: bgMid,
  muted: bgMid,
  mutedForeground: "30 12% 70%",
  accent,
  border: "0 0% 100% / 0.08",
  ring: accent,
  glow,
  glow2,
  glow3,
  gradientApp: `radial-gradient(120% 90% at 50% 0%, hsl(${bgTop}) 0%, hsl(${bgMid}) 45%, hsl(${bg}) 100%)`,
});

export const THEMES: Theme[] = [
  make("ember", "Ember", "18 95% 62%", "332 88% 64%", "42 96% 62%", "285 30% 5%", "295 25% 9%", "330 45% 14%"),
  make("ocean", "Ocean", "196 92% 58%", "220 85% 62%", "168 78% 52%", "215 45% 6%", "212 40% 10%", "200 60% 14%"),
  make("forest", "Forest", "142 70% 50%", "168 78% 52%", "85 75% 58%", "150 30% 5%", "152 28% 9%", "160 40% 13%"),
  make("sunset", "Sunset", "12 95% 62%", "340 88% 64%", "35 96% 60%", "340 35% 6%", "350 30% 10%", "10 45% 14%"),
  make("violet", "Violet", "270 88% 68%", "300 85% 65%", "240 90% 70%", "265 35% 5%", "270 30% 9%", "285 40% 13%"),
  make("mono", "Mono", "0 0% 88%", "0 0% 70%", "0 0% 95%", "0 0% 5%", "0 0% 9%", "0 0% 13%", "0 0% 88%"),
  make("cyberpunk", "Cyberpunk", "320 95% 60%", "180 95% 55%", "55 100% 60%", "265 50% 5%", "275 45% 9%", "300 55% 13%"),
  make("ice", "Ice", "190 90% 65%", "210 85% 70%", "170 70% 60%", "210 35% 6%", "208 32% 10%", "200 40% 14%"),
  make("rose", "Rose Gold", "350 80% 65%", "20 75% 65%", "330 60% 60%", "340 25% 6%", "345 22% 10%", "355 35% 14%"),
  make("midnight", "Midnight", "230 85% 65%", "260 80% 68%", "200 80% 60%", "230 40% 4%", "235 35% 8%", "245 45% 12%"),
];

/**
 * Converts an HSL string like "285 30% 5%" to a Hex color string.
 */
function hslToHex(hslStr: string): string {
  const parts = hslStr.split(" ");
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", "")) / 100;
  const l = parseFloat(parts[2].replace("%", "")) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyTheme(theme: Theme) {
  const r = document.documentElement;

  r.style.setProperty("--background", theme.background);
  r.style.setProperty("--foreground", theme.foreground);
  r.style.setProperty("--card", theme.card);
  r.style.setProperty("--card-foreground", theme.foreground);
  r.style.setProperty("--popover", theme.popover);
  r.style.setProperty("--popover-foreground", theme.foreground);
  r.style.setProperty("--primary", theme.primary);
  r.style.setProperty("--primary-foreground", theme.primaryForeground);
  r.style.setProperty("--secondary", theme.secondary);
  r.style.setProperty("--secondary-foreground", theme.foreground);
  r.style.setProperty("--muted", theme.muted);
  r.style.setProperty("--muted-foreground", theme.mutedForeground);
  r.style.setProperty("--accent", theme.accent);
  r.style.setProperty("--accent-foreground", theme.primaryForeground);
  r.style.setProperty("--border", theme.border);
  r.style.setProperty("--input", theme.border);
  r.style.setProperty("--ring", theme.ring);
  r.style.setProperty("--glow", theme.glow);
  r.style.setProperty("--glow-2", theme.glow2);
  r.style.setProperty("--glow-3", theme.glow3);
  r.style.setProperty("--gradient-app", theme.gradientApp);
}
