import { lazy, Suspense } from "react";
import { Link } from "react-router";
import type { TenantRow } from "../../api/client";
import DashboardGradientKpi from "../../components/dashboard/DashboardGradientKpi";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DeferredChart from "../../components/dashboard/DeferredChart";
import Badge from "../../components/ui/badge/Badge";
import {
  ArrowRightIcon,
  CalenderIcon,
  CheckCircleIcon,
  GroupIcon,
  TimeIcon,
} from "../../icons";

const DashboardOrdersLineChart = lazy(() => import("../../components/dashboard/DashboardOrdersLineChart"));
const DashboardRevenueBarChart = lazy(() => import("../../components/dashboard/DashboardRevenueBarChart"));

function formatTenantName(name: string): string {
  if (!name) return "—";
  if (name.includes("_") && !name.includes(" ")) return name.replace(/_/g, " ");
  return name
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function tenantInitial(name: string) {
  return (formatTenantName(name).trim()[0] || "?").toUpperCase();
}

function signupsByDay(tenants: TenantRow[], days = 30): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const t of tenants) {
    if (!t.created_at) continue;
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

function sparkFromSignups(data: { count: number }[]) {
  return data.slice(-10).map((d) => d.count);
}

function statusColor(status: string): "success" | "warning" | "error" | "light" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "error";
  return "light";
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

export default function SuperadminDashboard({ tenants }: { tenants: TenantRow[] }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const total = tenants.length;
  const pending = tenants.filter((t) => t.status === "pending");
  const approved = tenants.filter((t) => t.status === "approved");
  const signups = signupsByDay(tenants);
  const signups30 = signups.reduce((s, d) => s + d.count, 0);
  const signupSpark = sparkFromSignups(signups);

  const statusChart = [
    { month: "approved", label: "Approved", revenue: approved.length },
    { month: "pending", label: "Pending", revenue: pending.length },
    { month: "rejected", label: "Rejected", revenue: tenants.filter((t) => t.status === "rejected").length },
  ];

  const recent = [...tenants]
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 8);

  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900 xl:col-span-5">
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-violet-100/80 blur-2xl dark:bg-violet-900/30" />
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{today}</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Admin control center
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Monitor tenant signups, approvals, and platform health from one place.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link
              to="/superadmin/tenants"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-[#6d28d9]"
            >
              Manage tenants
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-7">
          <DashboardGradientKpi
            variant="purple"
            label="Total tenants"
            value={total}
            change={`${approved.length} active`}
            icon={<GroupIcon className="size-5 text-white" />}
            sparklineData={signupSpark}
          />
          <DashboardGradientKpi
            variant="amber"
            label="Pending approval"
            value={pending.length}
            change={pending.length ? "Needs review" : "All caught up"}
            icon={<TimeIcon className="size-5 text-white" />}
            sparklineData={signupSpark}
          />
          <DashboardGradientKpi
            variant="green"
            label="Approved"
            value={approved.length}
            change="Active stores"
            icon={<CheckCircleIcon className="size-5 text-white" />}
            sparklineData={signupSpark}
          />
          <DashboardGradientKpi
            variant="blue"
            label="Signups (30 days)"
            value={signups30}
            change="New registrations"
            icon={<CalenderIcon className="size-5 text-white" />}
            sparklineData={signupSpark}
          />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Action required</p>
              <p className="mt-1 text-xl font-bold">
                {pending.length} tenant{pending.length === 1 ? "" : "s"} awaiting approval
              </p>
              <p className="mt-1 text-sm text-amber-50/90">
                {pending.length === 1
                  ? `${formatTenantName(pending[0]?.tenant_name)} needs your review.`
                  : `${formatTenantName(pending[0]?.tenant_name)} and ${pending.length - 1} more need your review.`}
              </p>
            </div>
            <Link
              to="/superadmin/tenants"
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow hover:bg-amber-50"
            >
              Review now
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardPanel title="Tenant signups" subtitle="New registrations — last 30 days">
            <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" role="status"><span className="sr-only">Loading chart...</span></div>}>
              <DeferredChart>
                <DashboardOrdersLineChart data={signups} />
              </DeferredChart>
            </Suspense>
          </DashboardPanel>
        </div>
        <div className="xl:col-span-4">
          <DashboardPanel title="Status overview" subtitle="By approval state">
            <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" role="status"><span className="sr-only">Loading chart...</span></div>}>
              <DeferredChart>
                <DashboardRevenueBarChart data={statusChart} />
              </DeferredChart>
            </Suspense>
          </DashboardPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <DashboardPanel
            title="Recent tenants"
            subtitle="Latest registrations"
            actionTo="/superadmin/tenants"
            actionLabel="View all"
          >
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No tenants yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {recent.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]}`}
                    >
                      {tenantInitial(t.tenant_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {formatTenantName(t.tenant_name)}
                      </p>
                      <p className="truncate text-xs text-gray-500">{t.email}</p>
                    </div>
                    <Badge color={statusColor(t.status)} size="sm">
                      {t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>

        <div className="xl:col-span-5">
          <DashboardPanel title="Pending queue" subtitle="Awaiting approval">
            {pending.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-5 dark:bg-emerald-950/20">
                <CheckCircleIcon className="size-9 shrink-0 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  No pending tenants — you are all caught up.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {pending.slice(0, 6).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatTenantName(t.tenant_name)}
                    </p>
                    <p className="text-xs text-gray-500">{t.email}</p>
                    <Link
                      to="/superadmin/tenants"
                      className="mt-2 inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Open tenant management →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
