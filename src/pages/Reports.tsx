import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import Label from "../components/form/Label";
import { tenantApi, type Company, type SalesReportRow } from "../api/client";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "No change" : "New";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function TrendChart({
  title,
  points,
  valueFormatter,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
  valueFormatter: (value: number) => string;
}) {
  const width = 640;
  const height = 220;
  const paddingX = 36;
  const paddingY = 24;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length < 2 ? width / 2 : paddingX + (index * (width - paddingX * 2)) / (points.length - 1),
    y: height - paddingY - (point.value / max) * (height - paddingY * 2),
  }));
  const labelIndexes = new Set(
    [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((index) => index >= 0)
  );

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h3>
      {points.length === 0 ? (
        <p className="py-8 text-sm text-gray-500 dark:text-gray-400">No trend data for this selection.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full overflow-visible"
          role="img"
          aria-label={`${title} trend chart`}
        >
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="stroke-gray-200 dark:stroke-gray-700" />
          {coordinates.length > 1 && (
            <polyline
              points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-indigo-500"
            />
          )}
          {coordinates.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={point.x} cy={point.y} r="4" className="fill-indigo-600 dark:fill-indigo-400">
                <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
              </circle>
              {labelIndexes.has(index) && (
                <text
                  x={point.x}
                  y={height - 3}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  className="fill-gray-500 text-[11px] dark:fill-gray-400"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export default function Reports() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [from, setFrom] = useState(formatDateInput(thirtyDaysAgo));
  const [to, setTo] = useState(formatDateInput(today));
  const [interval, setInterval] = useState<"day" | "month">("month");
  const [companyId, setCompanyId] = useState("");
  const [storeSource, setStoreSource] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reportRows, setReportRows] = useState<SalesReportRow[]>([]);
  const [previousRows, setPreviousRows] = useState<SalesReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const durationDays =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  const previousTo = shiftDate(from, -1);
  const previousFrom = shiftDate(previousTo, -(durationDays - 1));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReportRows([]);
    setPreviousRows([]);
    Promise.all([
      tenantApi.getCompanies(),
      tenantApi.getSalesReport(from, to, interval),
      tenantApi.getSalesReport(previousFrom, previousTo, interval),
    ])
      .then(([companiesResponse, report, previousReport]) => {
        if (!active) return;
        setCompanies(companiesResponse.companies);
        setReportRows(report.rows);
        setPreviousRows(previousReport.rows);
        setError("");
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load the sales report.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [from, to, interval, previousFrom, previousTo]);

  const stores = useMemo(
    () => [...new Map(reportRows.map((row) => [row.source, row.store_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [reportRows]
  );

  const filteredRows = useMemo(
    () => reportRows.filter((row) =>
      (!companyId || row.company_id === companyId) &&
      (!storeSource || row.source === storeSource)
    ),
    [reportRows, companyId, storeSource]
  );
  const filteredPreviousRows = useMemo(
    () => previousRows.filter((row) =>
      (!companyId || row.company_id === companyId) &&
      (!storeSource || row.source === storeSource)
    ),
    [previousRows, companyId, storeSource]
  );

  const totalOrders = filteredRows.reduce((total, row) => total + row.order_count, 0);
  const previousTotalOrders = filteredPreviousRows.reduce((total, row) => total + row.order_count, 0);
  const salesByCurrency = filteredRows.reduce<Record<string, number>>((totals, row) => {
    const currency = row.currency || "Unknown currency";
    totals[currency] = (totals[currency] || 0) + row.sales;
    return totals;
  }, {});
  const ordersByPeriod = filteredRows.reduce<Record<string, number>>((totals, row) => {
    totals[row.period] = (totals[row.period] || 0) + row.order_count;
    return totals;
  }, {});
  const busiestPeriod = Object.entries(ordersByPeriod).sort((a, b) => b[1] - a[1])[0];
  const storePerformance = filteredRows.reduce<Record<string, { company: string; store: string; currency: string; sales: number; orders: number }>>((groups, row) => {
    const currency = row.currency || "Unknown currency";
    const key = `${row.company_id || "unassigned"}-${row.source}-${currency}`;
    const existing = groups[key] || {
      company: row.company_name,
      store: row.store_name,
      currency,
      sales: 0,
      orders: 0,
    };
    existing.sales += row.sales;
    existing.orders += row.order_count;
    groups[key] = existing;
    return groups;
  }, {});
  const topStoresByCurrency = Object.values(storePerformance).reduce<typeof storePerformance>((leaders, current) => {
    const leader = leaders[current.currency];
    if (!leader || current.sales > leader.sales) leaders[current.currency] = current;
    return leaders;
  }, {});
  const previousSalesByCurrency = filteredPreviousRows.reduce<Record<string, number>>((totals, row) => {
    const currency = row.currency || "Unknown currency";
    totals[currency] = (totals[currency] || 0) + row.sales;
    return totals;
  }, {});
  const trendPoints = Object.entries(ordersByPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
  const salesTrendByCurrency = Object.keys(salesByCurrency).sort().map((currency) => ({
    currency,
    points: [...new Set(filteredRows.map((row) => row.period))].sort().map((period) => ({
      label: period,
      value: filteredRows
        .filter((row) => row.period === period && (row.currency || "Unknown currency") === currency)
        .reduce((total, row) => total + row.sales, 0),
    })),
  }));
  const previousPeriodLabel = `${previousFrom} – ${previousTo}`;
  const comparisonCurrencies = [...new Set([
    ...Object.keys(salesByCurrency),
    ...Object.keys(previousSalesByCurrency),
  ])].sort();

  const columns: DataGridColumn<SalesReportRow>[] = [
    { key: "period", label: interval === "month" ? "Month" : "Date" },
    { key: "company_name", label: "Company" },
    { key: "store_name", label: "Store" },
    { key: "order_count", label: "Orders", align: "right" },
    {
      key: "sales",
      label: "Gross sales",
      align: "right",
      render: (value, row) => `${formatAmount(Number(value) || 0)} ${row.currency || "(currency unknown)"}`,
    },
  ];

  const downloadReport = () => {
    const header = ["Comparison period", "From", "To", "Period", "Company", "Store", "Orders", "Gross sales", "Currency"];
    const rows = [
      ...filteredRows.map((row) => [
        "Selected",
        from,
        to,
        row.period,
        row.company_name,
        row.store_name,
        row.order_count,
        row.sales,
        row.currency || "Unknown",
      ]),
      ...filteredPreviousRows.map((row) => [
        "Previous",
        previousFrom,
        previousTo,
        row.period,
        row.company_name,
        row.store_name,
        row.order_count,
        row.sales,
        row.currency || "Unknown",
      ]),
    ];
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `unisell-sales-report-${from}-to-${to}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDateChange = (setter: (value: string) => void, value: string, other: string, isFrom: boolean) => {
    if (!value) return;
    if (isFrom ? value > other : value < other) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError("");
    setter(value);
  };

  return (
    <div>
      <PageMeta title="Business Reports | UniSell" description="Compare sales and orders across companies and stores." />
      <PageBreadcrumb pageTitle="Business Reports" />
      <div className="space-y-5">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="report-from">From</Label>
              <input
                id="report-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => handleDateChange(setFrom, event.target.value, to, true)}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="report-to">To</Label>
              <input
                id="report-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => handleDateChange(setTo, event.target.value, from, false)}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="report-company">Company</Label>
              <select
                id="report-company"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">All companies</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="report-store">Store</Label>
              <select
                id="report-store"
                value={storeSource}
                onChange={(event) => setStoreSource(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">All stores</option>
                {stores.map(([source, name]) => <option key={source} value={source}>{name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="report-interval">Compare by</Label>
              <select
                id="report-interval"
                value={interval}
                onChange={(event) => setInterval(event.target.value as "day" | "month")}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="month">Month</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Orders in selected period</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totalOrders.toLocaleString()}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {formatChange(totalOrders, previousTotalOrders)} vs {previousPeriodLabel} ({previousTotalOrders.toLocaleString()} orders)
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross sales vs previous {previousPeriodLabel}</p>
            {comparisonCurrencies.length > 0 ? (
              <div className="mt-2 space-y-2">
                {comparisonCurrencies.map((currency) => {
                  const current = salesByCurrency[currency] || 0;
                  const previous = previousSalesByCurrency[currency] || 0;
                  return (
                    <p key={currency} className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatAmount(current)} <span className="text-sm font-normal text-gray-500">{currency}</span>
                      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {formatChange(current, previous)} (previous: {formatAmount(previous)})
                      </span>
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-lg font-semibold text-gray-400">—</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Trends over time</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Uses the selected company and store filters. Sales charts are separated by currency.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <TrendChart
              title={`Orders by ${interval === "month" ? "month" : "day"}`}
              points={trendPoints}
              valueFormatter={(value) => `${value.toLocaleString()} orders`}
            />
            {salesTrendByCurrency.map((trend) => (
              <TrendChart
                key={trend.currency}
                title={`Gross sales (${trend.currency})`}
                points={trend.points}
                valueFormatter={(value) => `${formatAmount(value)} ${trend.currency}`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Insights for this selection</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Based on the selected dates, companies, and stores. Sales are compared only within the same currency.
          </p>
          {filteredRows.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              There isn’t enough order data in this selection to calculate insights yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.values(topStoresByCurrency).map((store) => (
                <li key={`${store.company}-${store.store}-${store.currency}`} className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Top sales: {store.store} · {store.company}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {formatAmount(store.sales)} {store.currency} across {store.orders.toLocaleString()} orders
                  </p>
                </li>
              ))}
              {busiestPeriod && (
                <li className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Busiest {interval === "month" ? "month" : "day"}: {busiestPeriod[0]}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {busiestPeriod[1].toLocaleString()} orders in that period
                  </p>
                </li>
              )}
              {Object.entries(salesByCurrency).map(([currency, sales]) => {
                const orders = filteredRows
                  .filter((row) => (row.currency || "Unknown currency") === currency)
                  .reduce((total, row) => total + row.order_count, 0);
                if (orders === 0) return null;
                return (
                  <li key={`average-${currency}`} className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Average gross order value</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {formatAmount(sales / orders)} {currency} across {orders.toLocaleString()} orders
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sales and orders by period, company, and store</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sales amounts retain each store’s currency. Currency is marked unknown when it was not included with an order.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadReport}
              disabled={loading || filteredRows.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Download CSV
            </button>
          </div>
          <DataGrid
            columns={columns}
            data={filteredRows}
            keyExtractor={(row) => `${row.period}-${row.company_id || "unassigned"}-${row.source}-${row.currency || "unknown"}`}
            emptyMessage="No sales or orders found for the selected filters."
            loading={loading}
          />
        </section>
      </div>
    </div>
  );
}
