import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

const androidApkUrl =
  import.meta.env.VITE_ANDROID_APK_URL?.trim() ||
  "https://github.com/SabaNoreen121/FYP-Unisell-Mobile/releases/download/v1.0.0/unisell-mobile-v1.0.0.apk";
const isAllowedApkUrl =
  androidApkUrl.startsWith("/") && !androidApkUrl.startsWith("//")
    ? true
    : (() => {
        try {
          return new URL(androidApkUrl).protocol === "https:";
        } catch {
          return false;
        }
      })();

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageMeta title="Settings | UniSell" description="Manage your UniSell preferences." />
      <PageBreadcrumb pageTitle="Settings" />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your workspace preferences.
        </p>
        <Link
          to="/settings/appearance"
          className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:bg-violet-50/50 dark:border-gray-700 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
        >
          <span>
            <span className="block font-medium text-gray-900 dark:text-white">Appearance</span>
            <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
              Choose a color mode and accent palette, and customize fonts and text sizes.
            </span>
          </span>
          <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
          </svg>
        </Link>
        {isAllowedApkUrl ? (
          <a
            href={androidApkUrl}
            download
            className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:bg-violet-50/50 dark:border-gray-700 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
          >
            <span>
              <span className="block font-medium text-gray-900 dark:text-white">Download mobile app</span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                Download the UniSell Android app (APK) for direct installation.
              </span>
            </span>
            <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
            </svg>
          </a>
        ) : (
          <div
            aria-disabled="true"
            className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 opacity-70 dark:border-gray-700"
          >
            <span>
              <span className="block font-medium text-gray-900 dark:text-white">Download mobile app</span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                The Android APK is not published yet.
              </span>
            </span>
            <span className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Coming soon
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
