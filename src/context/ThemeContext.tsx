"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_HEADING_FONT_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  HEADING_FONT_SIZE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  FONT_SOURCE_STORAGE_KEY,
  TEXT_FONT_SIZE_STORAGE_KEY,
  getGoogleFontsStylesheetUrl,
  getValidFontSize,
  isValidFontFamily,
  toFontFamilyCssValue,
  type FontLoadStatus,
  type FontSource,
} from "../utils/fontSettings";
import {
  ACCENT_PALETTE_STORAGE_KEY,
  applyAccentPalette,
  DEFAULT_ACCENT_PALETTE,
  getAccentPalette,
  type ThemePreference,
} from "../utils/appearanceSettings";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  accentPalette: string;
  setAccentPalette: (paletteId: string) => void;
  fontFamily: string;
  fontSource: FontSource;
  fontLoadStatus: FontLoadStatus;
  headingFontSize: number;
  textFontSize: number;
  setFontFamily: (fontFamily: string, source?: FontSource) => void;
  setHeadingFontSize: (fontSize: number) => void;
  setTextFontSize: (fontSize: number) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [accentPalette, setAccentPaletteState] = useState(DEFAULT_ACCENT_PALETTE);
  const [fontFamily, setFontFamilyState] = useState(DEFAULT_FONT_FAMILY);
  const [fontSource, setFontSource] = useState<FontSource>("system");
  const [headingFontSize, setHeadingFontSizeState] = useState(DEFAULT_HEADING_FONT_SIZE);
  const [textFontSize, setTextFontSizeState] = useState(DEFAULT_TEXT_FONT_SIZE);
  const [fontLoadStatus, setFontLoadStatus] = useState<FontLoadStatus>("idle");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This code will only run on the client side
    const savedTheme = localStorage.getItem("theme");
    const initialThemePreference: ThemePreference =
      savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
        ? savedTheme
        : "system";
    const savedPalette = localStorage.getItem(ACCENT_PALETTE_STORAGE_KEY);
    const savedFontFamily = localStorage.getItem(FONT_STORAGE_KEY);
    const savedFontSource = localStorage.getItem(FONT_SOURCE_STORAGE_KEY);
    const savedHeadingFontSize = localStorage.getItem(HEADING_FONT_SIZE_STORAGE_KEY);
    const savedTextFontSize = localStorage.getItem(TEXT_FONT_SIZE_STORAGE_KEY);

    setThemePreferenceState(initialThemePreference);
    setAccentPaletteState(getAccentPalette(savedPalette ?? DEFAULT_ACCENT_PALETTE).id);
    if (savedFontFamily && isValidFontFamily(savedFontFamily)) {
      setFontFamilyState(savedFontFamily.trim());
      setFontSource(savedFontSource === "google" ? "google" : "system");
    }
    setHeadingFontSizeState(getValidFontSize(savedHeadingFontSize, DEFAULT_HEADING_FONT_SIZE, 18, 50));
    setTextFontSizeState(getValidFontSize(savedTextFontSize, DEFAULT_TEXT_FONT_SIZE, 12, 50));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const activeTheme =
        themePreference === "system"
          ? mediaQuery.matches ? "dark" : "light"
          : themePreference;
      setTheme(activeTheme);
      document.documentElement.classList.toggle("dark", activeTheme === "dark");
      localStorage.setItem("theme", themePreference);
    };

    applyTheme();
    if (themePreference !== "system") return;
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themePreference, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(ACCENT_PALETTE_STORAGE_KEY, accentPalette);
      applyAccentPalette(getAccentPalette(accentPalette).color);
    }
  }, [accentPalette, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(FONT_STORAGE_KEY, fontFamily);
      localStorage.setItem(FONT_SOURCE_STORAGE_KEY, fontSource);
      localStorage.setItem(HEADING_FONT_SIZE_STORAGE_KEY, String(headingFontSize));
      localStorage.setItem(TEXT_FONT_SIZE_STORAGE_KEY, String(textFontSize));
      document.documentElement.style.setProperty(
        "--app-font-family",
        toFontFamilyCssValue(fontFamily),
      );
      document.documentElement.style.setProperty(
        "--app-heading-font-size",
        `${headingFontSize}px`,
      );
      document.documentElement.style.setProperty("--app-text-font-size", `${textFontSize}px`);
      document.documentElement.style.setProperty(
        "--expanded-sidebar-width",
        `clamp(320px, ${190 + textFontSize * 9}px, 55vw)`,
      );
    }
  }, [fontFamily, fontSource, headingFontSize, textFontSize, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    const existingStylesheet = document.getElementById("app-google-fonts");
    existingStylesheet?.remove();
    const googleFamilies = [
      ...(fontSource === "google" ? [fontFamily] : []),
    ];
    if (googleFamilies.length === 0) {
      setFontLoadStatus("loaded");
      return;
    }

    if (fontSource === "google") setFontLoadStatus("loading");
    else setFontLoadStatus("loaded");
    const stylesheet = document.createElement("link");
    stylesheet.id = "app-google-fonts";
    stylesheet.rel = "stylesheet";
    stylesheet.href = getGoogleFontsStylesheetUrl([...new Set(googleFamilies)]);
    stylesheet.onload = () => {
      if (fontSource === "google") setFontLoadStatus("loaded");
    };
    stylesheet.onerror = () => {
      if (fontSource === "google") setFontLoadStatus("error");
    };
    document.head.appendChild(stylesheet);

    return () => {
      stylesheet.onload = null;
      stylesheet.onerror = null;
      stylesheet.remove();
    };
  }, [fontFamily, fontSource, isInitialized]);

  const toggleTheme = () => {
    setThemePreferenceState(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference: setThemePreferenceState,
        toggleTheme,
        accentPalette,
        setAccentPalette: (paletteId) => {
          setAccentPaletteState(getAccentPalette(paletteId).id);
        },
        fontFamily,
        fontSource,
        fontLoadStatus,
        headingFontSize,
        textFontSize,
        setFontFamily: (nextFontFamily, source = "system") => {
          if (isValidFontFamily(nextFontFamily)) {
            setFontFamilyState(nextFontFamily.trim());
            setFontSource(source);
          }
        },
        setHeadingFontSize: (nextFontSize) => {
          if (Number.isFinite(nextFontSize) && nextFontSize >= 18 && nextFontSize <= 50) {
            setHeadingFontSizeState(nextFontSize);
          }
        },
        setTextFontSize: (nextFontSize) => {
          if (Number.isFinite(nextFontSize) && nextFontSize >= 12 && nextFontSize <= 50) {
            setTextFontSizeState(nextFontSize);
          }
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
