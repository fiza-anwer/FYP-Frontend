import type { ReactNode } from "react";
import { Link } from "react-router";

export default function DashboardPanel({
  title,
  subtitle,
  children,
  actionTo,
  actionLabel,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actionTo?: string;
  actionLabel?: string;
  headerExtra?: ReactNode;
}) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
          {headerExtra}
          {actionTo && actionLabel && (
            <Link
              to={actionTo}
              className="text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9] dark:text-violet-400"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
