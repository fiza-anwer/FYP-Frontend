import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLoading from "./components/common/AppLoading";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { setOnUnauthorized } from "./api/client";
import { AuthProvider, useAuth } from "./context/AuthContext";

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const AppLayout = lazy(() => import("./layout/AppLayout"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const Orders = lazy(() => import("./pages/Orders"));
const Reports = lazy(() => import("./pages/Reports"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyIntegrations = lazy(() => import("./pages/CompanyIntegrations"));
const CarrierIntegrations = lazy(() => import("./pages/CarrierIntegrations"));
const CarrierIntegrationServices = lazy(() => import("./pages/CarrierIntegrationServices"));
const Consignments = lazy(() => import("./pages/Consignments"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const InventoryAdjust = lazy(() => import("./pages/InventoryAdjust"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const EmailChangeAction = lazy(() => import("./pages/EmailChangeAction"));
const SuperadminTenants = lazy(() => import("./pages/Superadmin/Tenants"));

function AppRoutes() {
  const { logout } = useAuth();
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      window.location.href = "/signin";
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  return (
    <Suspense
      fallback={<AppLoading />}
    >
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/email-change" element={<EmailChangeAction />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/consignments" element={<Consignments />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/company-integrations" element={<CompanyIntegrations />} />
            <Route path="/company-integrations/setup" element={<CompanyIntegrations />} />
            <Route path="/carrier-integrations" element={<CarrierIntegrations />} />
            <Route path="/carrier-integration-services" element={<CarrierIntegrationServices />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/:productId/adjust" element={<InventoryAdjust />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/help-support" element={<HelpSupport />} />
            <Route path="/superadmin/tenants" element={<SuperadminTenants />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
