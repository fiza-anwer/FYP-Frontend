import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useTheme } from "../../context/ThemeContext";

export default function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="space-y-6">
      <PageMeta title="Appearance settings | UniSell" description="Choose the appearance of your UniSell workspace." />
      <PageBreadcrumb pageTitle="Appearance" />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose how UniSell looks on this device.
        </p>
        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">Color theme</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Current theme: {theme === "dark" ? "Dark" : "Light"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Switch to {nextTheme} mode
          </button>
        </div>
      </section>
    </div>
  );
}
