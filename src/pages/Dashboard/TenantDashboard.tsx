import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { tenantApi, type DashboardAnalytics } from "../../api/client";
import DashboardOrdersLineChart from "../../components/dashboard/DashboardOrdersLineChart";
import DashboardRevenueBarChart from "../../components/dashboard/DashboardRevenueBarChart";
import DashboardGradientKpi from "../../components/dashboard/DashboardGradientKpi";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import Badge from "../../components/ui/badge/Badge";
import { useAuth } from "../../context/AuthContext";
import { onboardingStorageKey } from "../../context/StoreTourContext";
import {
  AlertHexaIcon,
  ArrowRightIcon,
  BoxIconLine,
  CalenderIcon,
  CheckCircleIcon,
  DollarLineIcon,
  TableIcon,
  TimeIcon,
} from "../../icons";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTenantName(name: string | undefined): string {
  if (!name) return "there";
  if (name.includes("_") && !name.includes(" ")) return name.replace(/_/g, " ");
  return name
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function sparkSlice(data: { count: number }[], len = 10): number[] {
  return data.slice(-len).map((d) => d.count);
}

function productInitial(title: string) {
  return (title.trim()[0] || "?").toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
];

const STRATEGY_STYLES: Record<string, { border: string; bg: string; accent: string }> = {
  discount: { border: "border-l-rose-500", bg: "bg-rose-50/80 dark:bg-rose-950/20", accent: "text-rose-600" },
  bundle: { border: "border-l-violet-500", bg: "bg-violet-50/80 dark:bg-violet-950/20", accent: "text-violet-600" },
  packaging: { border: "border-l-sky-500", bg: "bg-sky-50/80 dark:bg-sky-950/20", accent: "text-sky-600" },
  featured: { border: "border-l-indigo-500", bg: "bg-indigo-50/80 dark:bg-indigo-950/20", accent: "text-indigo-600" },
  clearance: { border: "border-l-orange-500", bg: "bg-orange-50/80 dark:bg-orange-950/20", accent: "text-orange-600" },
};

function orderStatusColor(status?: string): "success" | "info" | "warning" | "light" {
  if (status === "dispatched") return "success";
  if (status === "consigned") return "info";
  if (status === "pending") return "warning";
  return "light";
}

function activityDot(status?: string) {
  if (status === "dispatched") return "bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50";
  if (status === "consigned") return "bg-violet-500 ring-violet-100 dark:ring-violet-900/50";
  return "bg-blue-500 ring-blue-100 dark:ring-blue-900/50";
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function FeaturedHero({
  label,
  badge,
  product,
  gradient,
}: {
  label: string;
  badge: string;
  product: DashboardAnalytics["hero_product"];
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white shadow-lg ${gradient}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white/5" />
      <span className="relative inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
        {badge}
      </span>
      <p className="relative mt-2 text-sm text-white/80">{label}</p>
      {!product ? (
        <p className="relative mt-4 text-sm text-white/90">No sales data yet</p>
      ) : (
        <>
          <h3 className="relative mt-3 line-clamp-2 text-lg font-bold leading-snug">{product.title}</h3>
          {product.sku && <p className="relative mt-1 text-xs text-white/70">SKU {product.sku}</p>}
          <p className="relative mt-4 text-3xl font-extrabold">
            {product.order_count}
            <span className="ml-2 text-sm font-medium text-white/80">units</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function TenantDashboard({ data }: { data: DashboardAnalytics }) {
  const [showAllStaleProducts, setShowAllStaleProducts] = useState(false);
  const { user } = useAuth();
  const { summary } = data;
  const displayName = formatTenantName(user?.tenant_name);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const orderSpark = sparkSlice(data.orders_by_day);
  const revenueSpark = data.revenue_by_month.slice(-10).map((m) => m.revenue);
  const maxTop = Math.max(1, ...data.top_products.map((p) => p.order_count));
  const orders30Sum = data.orders_by_day.reduce((s, d) => s + d.count, 0);
  const [activeIntegration, setActiveIntegration] = useState<boolean | null>(null);
  const [processedOrder, setProcessedOrder] = useState<boolean | null>(null);
  const [integrationError, setIntegrationError] = useState("");
  const [orderProgressError, setOrderProgressError] = useState("");
  const [checklistDismissed, setChecklistDismissed] = useState(
    () => localStorage.getItem(`${onboardingStorageKey(user)}:checklist-dismissed`) === "true"
  );
  const loadIntegrationProgress = useCallback(async () => {
    setIntegrationError("");
    setOrderProgressError("");
    setActiveIntegration(null);
    setProcessedOrder(null);
    const [integrationsResult, ordersResult] = await Promise.allSettled([
      tenantApi.getCompanyIntegrations(),
      tenantApi.getOrders(),
    ]);
    if (integrationsResult.status === "fulfilled") {
      setActiveIntegration(integrationsResult.value.company_integrations.some((integration) => integration.status === 1));
    } else {
      setIntegrationError(integrationsResult.reason instanceof Error ? integrationsResult.reason.message : "Could not check integration setup.");
    }
    if (ordersResult.status === "fulfilled") {
      setProcessedOrder(ordersResult.value.orders.some((order) =>
        ["consigned", "dispatched", "fulfilled"].includes(order.status.toLowerCase()) ||
        order.fulfillment_status?.toLowerCase() === "fulfilled"
      ));
    } else {
      setOrderProgressError(ordersResult.reason instanceof Error ? ordersResult.reason.message : "Could not check order progress.");
    }
  }, []);

  useEffect(() => {
    void loadIntegrationProgress();
  }, [loadIntegrationProgress]);

  const checklist = [
    { label: "Create your account", path: "/profile", done: true },
    { label: "Complete your profile", path: "/profile", done: Boolean((user?.name?.trim() || user?.tenant_name?.trim() || user?.username?.trim()) && (user?.email || user?.username)) },
    { label: "Add your first product", path: "/products", done: summary.total_products > 0 },
    { label: "Connect an integration", path: "/company-integrations", done: activeIntegration === true },
    { label: "Process your first order", path: "/orders", done: processedOrder === true },
  ];
  const completedChecklistItems = checklist.filter((item) => item.done).length;
  const checklistComplete = completedChecklistItems === checklist.length;

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome + KPI — Skydash / Star Admin style */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12" data-tour="dashboard-overview">
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900 xl:col-span-5">
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-violet-100/80 blur-2xl dark:bg-violet-900/30" />
          <div className="pointer-events-none absolute bottom-0 right-4 hidden h-32 w-32 opacity-90 sm:block">
            <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
              <circle cx="60" cy="60" r="50" fill="#ede9fe" />
              <rect x="25" y="45" width="70" height="45" rx="6" fill="#7c3aed" opacity="0.9" />
              <rect x="35" y="55" width="20" height="8" rx="2" fill="#fff" opacity="0.5" />
              <rect x="35" y="68" width="35" height="6" rx="2" fill="#fff" opacity="0.35" />
              <circle cx="88" cy="38" r="14" fill="#f43f5e" opacity="0.85" />
            </svg>
          </div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{today}</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Your store performance at a glance — orders, revenue, bestsellers, and products that need attention.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-[#6d28d9]"
            >
              Manage orders
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              View products
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-7">
          <DashboardGradientKpi
            variant="purple"
            label="Total orders"
            value={summary.total_orders.toLocaleString()}
            change="All time volume"
            icon={<BoxIconLine className="size-5 text-white" />}
            sparklineData={orderSpark}
          />
          <DashboardGradientKpi
            variant="green"
            label="Revenue this month"
            value={formatMoney(summary.revenue_this_month)}
            change="Current calendar month"
            icon={<DollarLineIcon className="size-5 text-white" />}
            sparklineData={revenueSpark.length ? revenueSpark : orderSpark}
          />
          <DashboardGradientKpi
            variant="blue"
            label="Orders (30 days)"
            value={summary.orders_last_30_days.toLocaleString()}
            change={`${orders30Sum} in chart period`}
            icon={<CalenderIcon className="size-5 text-white" />}
            sparklineData={orderSpark}
          />
          <DashboardGradientKpi
            variant="coral"
            label="Catalog products"
            value={summary.total_products.toLocaleString()}
            change={
              data.stale_products.length > 0
                ? `${data.stale_products.length} need attention`
                : "All products active"
            }
            icon={<TableIcon className="size-5 text-white" />}
            sparklineData={orderSpark}
          />
        </div>
      </div>

      {!checklistDismissed && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50" aria-labelledby="getting-started-checklist-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Getting started</p>
              <h2 id="getting-started-checklist-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Set up your store</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{completedChecklistItems} of {checklist.length} done</p>
            </div>
            {checklistComplete && (
              <button
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                type="button"
                onClick={() => {
                  localStorage.setItem(`${onboardingStorageKey(user)}:checklist-dismissed`, "true");
                  setChecklistDismissed(true);
                }}
              >
                Dismiss checklist
              </button>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="progressbar" aria-label="Getting started progress" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={completedChecklistItems}>
            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${(completedChecklistItems / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5" to={item.path}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${item.done ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-transparent dark:border-gray-600"}`} aria-label={item.done ? "Completed" : "Not completed"}>
                    ✓
                  </span>
                  <span className={item.done ? "text-gray-500 line-through dark:text-gray-400" : ""}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {integrationError && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-amber-700 dark:text-amber-400" role="status">
              <span>Could not verify integration progress: {integrationError}</span>
              <button className="font-semibold underline" type="button" onClick={() => void loadIntegrationProgress()}>Try again</button>
            </div>
          )}
          {orderProgressError && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-amber-700 dark:text-amber-400" role="status">
              <span>Could not verify order progress: {orderProgressError}</span>
              <button className="font-semibold underline" type="button" onClick={() => void loadIntegrationProgress()}>Try again</button>
            </div>
          )}
        </section>
      )}

      {/* Hero products — Purple Admin featured cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FeaturedHero
          label="Best seller · all time"
          badge="Hero product"
          product={data.hero_product}
          gradient="bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#a78bfa]"
        />
        <FeaturedHero
          label="Best seller · this month"
          badge="Monthly hero"
          product={data.hero_product_month}
          gradient="bg-gradient-to-br from-[#be185d] via-[#ec4899] to-[#f472b6]"
        />
      </div>

      {/* Summary chart + Top selling — Star Admin layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardPanel title="Order summary" subtitle="Daily orders — last 30 days">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatPill label="30-day orders" value={orders30Sum} accent="text-rose-500" />
              <StatPill label="This month $" value={formatMoney(summary.revenue_this_month)} accent="text-emerald-600" />
              <StatPill label="Total orders" value={summary.total_orders} accent="text-violet-600" />
              <StatPill label="Slow movers" value={data.stale_products.length} accent="text-amber-600" />
            </div>
            <DashboardOrdersLineChart data={data.orders_by_day} />
          </DashboardPanel>
        </div>

        <div className="xl:col-span-4">
          <DashboardPanel
            title="Top selling"
            subtitle="By order volume"
            actionTo="/products"
            actionLabel="View all"
          >
            {data.top_products.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No sales yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.top_products.map((p, i) => (
                  <li key={p.product_id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-md ${AVATAR_GRADIENTS[i] ?? AVATAR_GRADIENTS[4]}`}
                    >
                      {productInitial(p.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{p.title}</p>
                      {p.sku && (
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{p.sku}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                            style={{ width: `${Math.round((p.order_count / maxTop) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                          {p.order_count}
                        </span>
                      </div>
                    </div>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {i + 1}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>
      </div>

      {/* Revenue + Activity */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardPanel title="Revenue report" subtitle="Monthly revenue — last 12 months">
            <DashboardRevenueBarChart data={data.revenue_by_month} />
          </DashboardPanel>
        </div>

        <div className="xl:col-span-4">
          <DashboardPanel
            title="Order activity"
            subtitle="Latest transactions"
            actionTo="/orders"
            actionLabel="View all"
          >
            {data.recent_orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No orders yet.</p>
            ) : (
              <ul className="relative space-y-0">
                {data.recent_orders.map((o, idx) => (
                  <li key={o.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {idx < data.recent_orders.length - 1 && (
                      <span className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                    <span
                      className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ${activityDot(o.status)}`}
                    >
                      <BoxIconLine className="size-3.5 text-white" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Order #{o.order_number ?? "—"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {o.company_name ?? "Store"} ·{" "}
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {typeof o.total === "number" ? formatMoney(o.total) : "—"}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge color={orderStatusColor(o.status)} size="sm">
                          {o.status ?? "—"}
                        </Badge>
                        <TimeIcon className="size-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400">Recent</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>
      </div>

      {/* Slow movers — warning panel */}
      <DashboardPanel
        title="Inventory alerts"
        subtitle="Products with no orders in 30+ days — recommended actions"
        headerExtra={
          data.stale_products.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              {data.stale_products.length} alerts
            </span>
          ) : null
        }
      >
        {data.stale_products.length === 0 ? (
          <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/80 px-5 py-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <CheckCircleIcon className="size-10 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">All products are moving</p>
              <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                Every product received at least one order in the last 30 days.
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.stale_products.slice(0, showAllStaleProducts ? undefined : 3).map((p) => {
              const style = STRATEGY_STYLES[p.strategy.id] ?? STRATEGY_STYLES.featured;
              return (
                <li
                  key={p.product_id}
                  className={`rounded-xl border border-gray-100 border-l-4 p-4 shadow-sm dark:border-gray-800 ${style.border} ${style.bg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{p.title}</p>
                      {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                    </div>
                    <AlertHexaIcon className="size-5 shrink-0 text-amber-500" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {p.last_order_at
                      ? `No sales for ${p.days_without_order ?? "?"} days`
                      : "Never sold"}
                  </p>
                  <div className="mt-3 border-t border-gray-200/80 pt-3 dark:border-gray-700/80">
                    <p className={`text-sm font-bold ${style.accent}`}>{p.strategy.label}</p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{p.strategy.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {data.stale_products.length > 3 && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAllStaleProducts((visible) => !visible)}
              className="text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {showAllStaleProducts
                ? "Show less"
                : `View all ${data.stale_products.length} alerts`}
            </button>
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}
