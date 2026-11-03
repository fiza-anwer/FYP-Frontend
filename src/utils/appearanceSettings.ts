export type ThemePreference = "system" | "light" | "dark";

export type AccentPalette = {
  id: string;
  name: string;
  color: string;
};

export const DEFAULT_ACCENT_PALETTE = "blue";
export const ACCENT_PALETTE_STORAGE_KEY = "app-accent-palette";

export const ACCENT_PALETTES: AccentPalette[] = [
  { id: "blue", name: "Blue", color: "#465fff" },
  { id: "slate", name: "Slate", color: "#64748b" },
  { id: "sky", name: "Sky", color: "#0ea5e9" },
  { id: "teal", name: "Teal", color: "#14b8a6" },
  { id: "green", name: "Green", color: "#22c55e" },
  { id: "lime", name: "Lime", color: "#84cc16" },
  { id: "amber", name: "Amber", color: "#eab308" },
  { id: "orange", name: "Orange", color: "#f97316" },
  { id: "coral", name: "Coral", color: "#f87171" },
  { id: "rose", name: "Rose", color: "#f43f5e" },
  { id: "pink", name: "Pink", color: "#ec4899" },
  { id: "fuchsia", name: "Fuchsia", color: "#d946ef" },
  { id: "purple", name: "Purple", color: "#a855f7" },
  { id: "violet", name: "Violet", color: "#8b5cf6" },
  { id: "indigo", name: "Indigo", color: "#6366f1" },
];

export function getAccentPalette(id: string): AccentPalette {
  return ACCENT_PALETTES.find((palette) => palette.id === id) ?? ACCENT_PALETTES[0];
}

function mixColors(first: string, second: string, amount: number): string {
  const firstRgb = first.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const secondRgb = second.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const channels = firstRgb.map((channel, index) =>
    Math.round(channel + ((secondRgb[index] ?? 0) - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function applyAccentPalette(color: string): void {
  const root = document.documentElement;
  const accentShades: Array<[number, string]> = [
    [25, mixColors(color, "#ffffff", 0.97)],
    [50, mixColors(color, "#ffffff", 0.94)],
    [100, mixColors(color, "#ffffff", 0.88)],
    [200, mixColors(color, "#ffffff", 0.76)],
    [300, mixColors(color, "#ffffff", 0.58)],
    [400, mixColors(color, "#ffffff", 0.3)],
    [500, color],
    [600, mixColors(color, "#000000", 0.12)],
    [700, mixColors(color, "#000000", 0.26)],
    [800, mixColors(color, "#000000", 0.4)],
    [900, mixColors(color, "#000000", 0.55)],
    [950, mixColors(color, "#000000", 0.7)],
  ];

  accentShades.forEach(([shade, value]) => {
    root.style.setProperty(`--color-indigo-${shade}`, value);
    root.style.setProperty(`--color-violet-${shade}`, value);
    root.style.setProperty(`--color-brand-${shade}`, value);
  });
}
