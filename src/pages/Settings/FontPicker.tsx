import { useEffect, useMemo, useRef, useState } from "react";
import {
  getGoogleFontsStylesheetUrl,
  toFontFamilyCssValue,
} from "../../utils/fontSettings";
import { GOOGLE_FONT_FAMILIES } from "../../config/googleFonts";

const FONT_PRESETS = [
  "Outfit",
  "Arial",
  "Arial Black",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Impact",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "system-ui",
];
const FONT_OPTIONS = [...new Set([...FONT_PRESETS, ...GOOGLE_FONT_FAMILIES])].sort(
  (first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }),
);
const GOOGLE_FONT_FAMILY_SET = new Set<string>(GOOGLE_FONT_FAMILIES);

type FontPickerProps = {
  id: string;
  label: string;
  fontFamily: string;
  onChange: (fontFamily: string, source: "system" | "google") => void;
};

export default function FontPicker({
  id,
  label,
  fontFamily,
  onChange,
}: FontPickerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fontStyleGroups, setFontStyleGroups] = useState([0]);
  const matchingFonts = useMemo(
    () => FONT_OPTIONS.filter((font) => font.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );

  useEffect(() => {
    if (!isOpen) return;

    const stylesheets = fontStyleGroups.flatMap((groupIndex) => {
      const families = matchingFonts
        .slice(groupIndex * 30, (groupIndex + 1) * 30)
        .filter((font) => GOOGLE_FONT_FAMILY_SET.has(font));
      if (families.length === 0) return [];

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = getGoogleFontsStylesheetUrl(families);
      stylesheet.dataset.fontPickerStylesheet = id;
      document.head.appendChild(stylesheet);
      return [stylesheet];
    });

    return () => stylesheets.forEach((stylesheet) => stylesheet.remove());
  }, [fontStyleGroups, id, isOpen, matchingFonts]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </label>
      <div ref={dropdownRef} className="relative w-full">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${id}-options`}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          style={{ fontFamily: toFontFamilyCssValue(fontFamily) }}
        >
          <span>{fontFamily}</span>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <label className="sr-only" htmlFor={`${id}-search`}>Search fonts A to Z</label>
              <input
                id={`${id}-search`}
                type="search"
                autoFocus
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setFontStyleGroups([0]);
                }}
                placeholder="Search fonts A to Z"
                className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <ul
              id={`${id}-options`}
              role="listbox"
              aria-label={`${label} options listed alphabetically`}
              className="max-h-72 overflow-y-auto p-1"
              onScroll={(event) => {
                const groupIndex = Math.floor(event.currentTarget.scrollTop / (40 * 30));
                setFontStyleGroups((groups) =>
                  groups.includes(groupIndex) ? groups : [...groups, groupIndex],
                );
              }}
            >
              {matchingFonts.map((font) => (
                <li key={font} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={fontFamily === font}
                    onClick={() => {
                      onChange(font, GOOGLE_FONT_FAMILY_SET.has(font) ? "google" : "system");
                      setSearch("");
                      setIsOpen(false);
                    }}
                    className={`min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      fontFamily === font
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                    style={{ fontFamily: toFontFamilyCssValue(font) }}
                  >
                    {font}
                  </button>
                </li>
              ))}
              {matchingFonts.length === 0 && (
                <li className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  No fonts match your search.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {FONT_OPTIONS.length.toLocaleString()} fonts, listed from A to Z.
      </p>
    </div>
  );
}
