import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FontPicker from "./FontPicker";
import { useTheme } from "../../context/ThemeContext";
import { toFontFamilyCssValue } from "../../utils/fontSettings";

export default function FontSettings() {
  const {
    fontFamily,
    fontSource,
    fontLoadStatus,
    headingFontSize,
    textFontSize,
    setFontFamily,
    setHeadingFontSize,
    setTextFontSize,
  } = useTheme();

  const restoreDefaults = () => {
    setFontFamily("Outfit", "system");
    setHeadingFontSize(24);
    setTextFontSize(14);
  };

  return (
    <div className="space-y-6">
      <PageMeta title="Fonts | UniSell" description="Customize font family and heading and text sizes in your UniSell workspace." />
      <PageBreadcrumb pageTitle="Fonts" />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fonts</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Choose one font style for the whole website, then adjust heading and text sizes separately.
            </p>
          </div>
          <Link
            to="/settings/appearance"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Appearance
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <FontPicker
            id="site-font-picker"
            label="Font style"
            fontFamily={fontFamily}
            onChange={setFontFamily}
          />

          <div className="grid gap-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="heading-font-size" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Heading size
                </label>
                <output htmlFor="heading-font-size" className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                  {headingFontSize}px
                </output>
              </div>
              <input
                id="heading-font-size"
                type="range"
                min={18}
                max={50}
                step={1}
                value={headingFontSize}
                onChange={(event) => setHeadingFontSize(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Adjusts heading text throughout the website.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="text-font-size" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Text size
                </label>
                <output htmlFor="text-font-size" className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                  {textFontSize}px
                </output>
              </div>
              <input
                id="text-font-size"
                type="range"
                min={12}
                max={50}
                step={1}
                value={textFontSize}
                onChange={(event) => setTextFontSize(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Adjusts body text, labels, buttons, and table text.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Preview</p>
          <h2
            className="mt-3 font-semibold text-gray-900 dark:text-white"
            style={{
              fontFamily: toFontFamilyCssValue(fontFamily),
              fontSize: `${headingFontSize}px`,
            }}
          >
            Your store at a glance
          </h2>
          <p
            className="mt-2 text-gray-600 dark:text-gray-300"
            style={{
              fontFamily: toFontFamilyCssValue(fontFamily),
              fontSize: `${textFontSize}px`,
            }}
          >
            Products, inventory, and orders are easy to read with your chosen font and text size.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Font: {fontFamily}
            {fontSource === "google" && fontLoadStatus === "loading" ? " (loading)" : ""}
          </p>
          {fontSource === "google" && fontLoadStatus === "error" && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              The selected font could not be downloaded. Check your internet connection; the app is showing a fallback font.
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Restore defaults
          </button>
        </div>
      </section>
    </div>
  );
}
