import { useEffect } from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import { preloadTenantListData, tenantApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import StockAlertsBanner from "../components/common/StockAlertsBanner";
import { StoreTourProvider } from "../context/StoreTourContext";

const LayoutContent: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const { isSuperadmin, user } = useAuth();

  useEffect(() => {
    if (!user || isSuperadmin) return;
    const preloadTimer = window.setTimeout(() => {
      void tenantApi.getProducts({ sort: "newest", limit: 10, offset: 0 }).catch((error: unknown) => {
        console.warn("Could not preload products:", error);
      });
      void import("../pages/Products").catch((error: unknown) => {
        console.warn("Could not preload the products page:", error);
      });
      void preloadTenantListData().catch((error: unknown) => {
        console.warn("Could not preload orders and consignments:", error);
      });
      void import("../pages/Orders").catch((error: unknown) => {
        console.warn("Could not preload the orders page:", error);
      });
      void import("../pages/Consignments").catch((error: unknown) => {
        console.warn("Could not preload the consignments page:", error);
      });
    }, 1200);

    return () => window.clearTimeout(preloadTimer);
  }, [isSuperadmin, user]);

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${
          isExpanded ? "sidebar-content-offset" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="w-full p-4 md:p-6">
          <StockAlertsBanner />
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <StoreTourProvider>
        <LayoutContent />
      </StoreTourProvider>
    </SidebarProvider>
  );
};

export default AppLayout;
