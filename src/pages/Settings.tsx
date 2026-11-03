import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

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
              Choose a light or dark color theme.
            </span>
          </span>
          <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
