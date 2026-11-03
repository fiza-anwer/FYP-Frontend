export const DEFAULT_FONT_FAMILY = "Outfit";
export const FONT_STORAGE_KEY = "app-font-family";
export const FONT_SOURCE_STORAGE_KEY = "app-font-source";
export const DEFAULT_HEADING_FONT_SIZE = 24;
export const DEFAULT_TEXT_FONT_SIZE = 14;
export const HEADING_FONT_SIZE_STORAGE_KEY = "app-heading-font-size";
export const TEXT_FONT_SIZE_STORAGE_KEY = "app-text-font-size";

export type FontSource = "system" | "google";
export type FontLoadStatus = "idle" | "loading" | "loaded" | "error";

export function getValidFontSize(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null) return fallback;
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < min) return fallback;
  return Math.min(parsedValue, max);
}

const GENERIC_FONT_FAMILIES = new Set([
  "cursive",
  "fantasy",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
]);

export function isValidFontFamily(fontFamily: string): boolean {
  const trimmedFontFamily = fontFamily.trim();
  if (trimmedFontFamily.length === 0 || trimmedFontFamily.length > 80) {
    return false;
  }

  for (let index = 0; index < trimmedFontFamily.length; index += 1) {
    const characterCode = trimmedFontFamily.charCodeAt(index);
    if (characterCode < 32 || characterCode === 127) {
      return false;
    }
  }
  return true;
}

export function toFontFamilyCssValue(fontFamily: string): string {
  if (GENERIC_FONT_FAMILIES.has(fontFamily.toLowerCase())) {
    return fontFamily.toLowerCase();
  }
  return `"${fontFamily.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}", sans-serif`;
}

export function getGoogleFontStylesheetUrl(fontFamily: string): string {
  const family = encodeURIComponent(fontFamily).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
}

export function getGoogleFontsStylesheetUrl(fontFamilies: string[]): string {
  const query = new URLSearchParams();
  fontFamilies.forEach((fontFamily) => query.append("family", fontFamily));
  query.set("display", "swap");
  return `https://fonts.googleapis.com/css2?${query.toString()}`;
}
