import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AppLoading from "../../components/common/AppLoading";
import { useAuth } from "../../context/AuthContext";
import { tenantApi, authApi, type DashboardAnalytics, type TenantRow } from "../../api/client";
import TenantDashboard from "./TenantDashboard";
import SuperadminDashboard from "./SuperadminDashboard";

function formatTenantName(name: string | undefined): string {
  if (!name) return "";
  if (name.includes("_") && !name.includes(" ")) return name;
  return name
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function Home() {
  const { isSuperadmin, user } = useAuth();
  const location = useLocation();
  const dashboardTitle = isSuperadmin ? "Admin" : (formatTenantName(user?.tenant_name) || "UniSell");
  const pageTitle = `Dashboard | ${dashboardTitle}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalytics | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);

  const loadData = useCallback(() => {
    let cancelled = false;
    setError("");
    setLoading(true);

    if (isSuperadmin) {
      authApi
        .getTenants()
        .then((list) => {
          if (cancelled) return;
          setTenants(Array.isArray(list) ? list : []);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tenants");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      tenantApi
        .getDashboardAnalytics()
        .then((data) => {
          if (cancelled) return;
          setDashboardAnalytics(data);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [isSuperadmin]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const cleanup = loadData();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [location.pathname, isSuperadmin, loadData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && location.pathname === "/") loadData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [location.pathname, loadData]);

  if (loading) {
    return (
      <>
        <PageMeta title={pageTitle} description="Dashboard overview" />
        <AppLoading inline message="Loading your dashboard..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta title={pageTitle} description="Dashboard overview" />
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      </>
    );
  }

  if (isSuperadmin) {
    return (
      <>
        <PageMeta title={pageTitle} description="Admin dashboard" />
        <SuperadminDashboard tenants={tenants} />
      </>
    );
  }

  if (!dashboardAnalytics) {
    return (
      <>
        <PageMeta title={pageTitle} description="Dashboard overview" />
        <div className="text-gray-500 dark:text-gray-400">No dashboard data available.</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={pageTitle} description="Dashboard overview" />
      <TenantDashboard data={dashboardAnalytics} />
    </>
  );
}
