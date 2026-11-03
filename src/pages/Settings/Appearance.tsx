import type { ReactNode } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useTheme } from "../../context/ThemeContext";
import {
  ACCENT_PALETTES,
  DEFAULT_ACCENT_PALETTE,
  type ThemePreference,
} from "../../utils/appearanceSettings";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}> = [
  {
    value: "system",
    label: "System",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3" y="4" width="18" height="13" rx="2" strokeWidth="1.7" />
        <path d="M8 21h8m-4-4v4" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="4" strokeWidth="1.7" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function AppearanceSettings() {
  const { theme, themePreference, setThemePreference, accentPalette, setAccentPalette } = useTheme();
  const selectedPalette = ACCENT_PALETTES.find((palette) => palette.id === accentPalette) ?? ACCENT_PALETTES[0];

  return (
    <div className="space-y-6">
      <PageMeta title="Appearance settings | UniSell" description="Choose the appearance and accent color of your UniSell workspace." />
      <PageBreadcrumb pageTitle="Appearance" />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#23374d] dark:bg-[#081d2e] sm:p-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          Customize the color mode and accent colors used throughout your workspace.
        </p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#24354d] dark:bg-[#0d1f34]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium text-gray-900 dark:text-white">Overall appearance</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                {themePreference === "system"
                  ? `Following your device setting (${theme === "dark" ? "Dark" : "Light"}).`
                  : `${theme === "dark" ? "Dark" : "Light"} appearance is active.`}
              </p>
            </div>
            <div
              role="group"
              aria-label="Color mode"
              className="grid w-full grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-[#2b3d57] dark:bg-[#11263f] sm:w-auto"
            >
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={themePreference === option.value}
                  onClick={() => setThemePreference(option.value)}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                    themePreference === option.value
                      ? "bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 dark:bg-[#1a2d44] dark:text-white dark:ring-[#3a4f6a]"
                      : "text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-[#24354d] dark:bg-[#0d1f34]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium text-gray-900 dark:text-white">Color palette</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Choose an accent color for buttons, links, highlights, and selected states.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAccentPalette(DEFAULT_ACCENT_PALETTE)}
              disabled={accentPalette === DEFAULT_ACCENT_PALETTE}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-default disabled:text-gray-400 dark:text-slate-200 dark:hover:bg-[#12263d] dark:disabled:text-slate-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Restore default
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label="Accent color palette"
            className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#24354d] dark:bg-[#0f233b]"
          >
            {ACCENT_PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={accentPalette === palette.id}
                aria-label={`${palette.name} accent`}
                title={palette.name}
                onClick={() => setAccentPalette(palette.id)}
                className="grid h-12 w-12 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                style={
                  accentPalette === palette.id
                    ? {
                        boxShadow: `0 0 0 2px ${palette.color}`,
                        transform: "scale(1.02)",
                      }
                    : undefined
                }
              >
                <span
                  className="h-10 w-10 rounded-full border border-black/10 dark:border-white/20"
                  style={{
                    background: `linear-gradient(to bottom, ${palette.color} 50%, color-mix(in srgb, ${palette.color} 22%, white) 50%)`,
                  }}
                />
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
            Selected: <span className="font-medium" style={{ color: selectedPalette.color }}>{selectedPalette.name}</span>
          </p>
        </div>

        <Link
          to="/settings/appearance/fonts"
          className="mt-4 flex min-h-20 items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 hover:border-gray-300 hover:bg-gray-50 dark:border-[#24354d] dark:bg-[#0d1f34] dark:text-white dark:hover:border-[#3a4f6a] dark:hover:bg-[#10273e]"
        >
          <span>
            <span className="block font-medium text-gray-900 dark:text-white">Fonts</span>
            <span className="mt-1 block text-sm text-gray-600 dark:text-slate-300">
              Customize the font family and text sizes used across your workspace.
            </span>
          </span>
          <svg className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
