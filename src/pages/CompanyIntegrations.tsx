import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import { tenantApi, API_BASE, type CompanyIntegration, type Company, type IntegrationCredentialSchema } from "../api/client";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Checkbox from "../components/form/input/Checkbox";
import SetupFormShell, { SetupFormAside, SetupFormSection } from "../components/setup/SetupFormShell";
import { useStoreTour } from "../context/StoreTourContext";

function getStoreWebsiteUrl(integration: CompanyIntegration): string {
  const credentials = integration.credentials || {};
  const configuredUrl =
    credentials.storefront_url ||
    credentials.store_url ||
    credentials.website_url ||
    credentials.shop_url;
  const value =
    typeof configuredUrl === "string"
      ? configuredUrl
      : integration.integration_slug === "shopify" && typeof credentials.shop_domain === "string"
        ? credentials.shop_domain
        : "";
  if (!value.trim()) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeStoreWebsiteUrl(value: string): string | null {
  if (!value.trim()) return "";
  try {
    const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

type SetupState = "not-connected" | "in-progress" | "connected" | "needs-attention";

export default function CompanyIntegrations() {
  const { startPageTour } = useStoreTour();
  const location = useLocation();
  const navigate = useNavigate();
  const formVisible = location.pathname.endsWith("/setup");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [integrations, setIntegrations] = useState<Array<{ id: string; name: string; slug: string; credentials_schema: IntegrationCredentialSchema[] }>>([]);
  const [companyIntegrations, setCompanyIntegrations] = useState<CompanyIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CompanyIntegration | null>(null);
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formIntegrationId, setFormIntegrationId] = useState("");
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formStorefrontUrl, setFormStorefrontUrl] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formFeatures, setFormFeatures] = useState<{ orders: boolean; products: boolean; inventory: boolean }>({
    orders: true,
    products: true,
    inventory: true,
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [setupChecklistOpen, setSetupChecklistOpen] = useState(false);
  const [darazConnecting, setDarazConnecting] = useState(false);
  const [darazOAuthConnected, setDarazOAuthConnected] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const selectedIntegration = integrations.find((i) => i.id === formIntegrationId);
  const isDarazSelected = selectedIntegration?.slug === "daraz";

  const load = async () => {
    setError("");
    try {
      const [companiesRes, intRes, ciRes] = await Promise.all([
        tenantApi.getCompanies(),
        tenantApi.getIntegrations(),
        tenantApi.getCompanyIntegrations(),
      ]);
      setCompanies(Array.isArray(companiesRes?.companies) ? companiesRes.companies : []);
      setIntegrations(Array.isArray(intRes?.integrations) ? intRes.integrations : []);
      setCompanyIntegrations(Array.isArray(ciRes?.company_integrations) ? ciRes.company_integrations : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedSchema =
    isDarazSelected ? [] : selectedIntegration?.credentials_schema || [];

  const openCreate = (companyId = "", integrationId = "") => {
    setSuccessMessage("");
    setEditing(null);
    setFormCompanyId(companyId);
    setFormIntegrationId(integrationId);
    setFormCredentials({});
    setFormStorefrontUrl("");
    setDarazOAuthConnected(false);
    setDarazConnecting(false);
    setFormActive(true);
    setFormFeatures({ orders: true, products: true, inventory: true });
    navigate("/company-integrations/setup", { state: { companyId, integrationId } });
  };

  const hasConfiguredCredentials = (
    integration: (typeof integrations)[number],
    companyIntegration: CompanyIntegration
  ) => {
    const credentials = companyIntegration.credentials || {};
    if (integration.slug === "daraz") {
      return typeof credentials.access_token === "string" && credentials.access_token.length > 0;
    }

    const requiredFields = integration.credentials_schema.filter((field) => field.required);
    if (requiredFields.length > 0) {
      return requiredFields.every((field) => {
        const value = credentials[field.key];
        return typeof value === "string" && value.trim().length > 0;
      });
    }

    return Object.values(credentials).some(
      (value) => typeof value === "string" && value.trim().length > 0
    );
  };

  const getSetupState = (
    company: Company,
    integration: (typeof integrations)[number]
  ): { state: SetupState; connection?: CompanyIntegration; detail: string } => {
    const matches = companyIntegrations.filter(
      (item) => item.company_id === company.id && item.integration_id === integration.id
    );
    const configured = matches.find(
      (item) => item.status === 1 && hasConfiguredCredentials(integration, item)
    );

    if (!editing && formVisible && formCompanyId === company.id && formIntegrationId === integration.id) {
      return { state: "in-progress", connection: configured || matches[0], detail: "Finish the setup form and save to connect this store." };
    }
    if (configured) {
      return { state: "connected", connection: configured, detail: "Setup is saved and enabled in UniSell." };
    }
    if (matches.length > 0) {
      return {
        state: "needs-attention",
        connection: matches[0],
        detail: matches[0].status !== 1 ? "This integration is inactive, so UniSell will not sync it." : "Some required connection details are missing.",
      };
    }
    return { state: "not-connected", detail: "Connect a store to start syncing its data." };
  };

  const populateEditForm = (ci: CompanyIntegration) => {
    const credentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(ci.credentials || {})) {
      if (typeof value === "string") credentials[key] = value;
    }
    setEditing(ci);
    setFormCompanyId(ci.company_id || "");
    setFormIntegrationId(ci.integration_id);
    setFormCredentials(credentials);
    setFormStorefrontUrl(getStoreWebsiteUrl(ci));
    const isDaraz = ci.integration_slug === "daraz";
    setDarazOAuthConnected(
      isDaraz &&
        !!(
          ci.credentials?.oauth_connected ||
          ci.credentials?.access_token ||
          ci.credentials?.authorization_code
        )
    );
    setDarazConnecting(false);
    setFormActive(ci.status === 1);
    const features = Array.isArray(ci.features) ? ci.features : ["orders", "products", "inventory"];
    setFormFeatures({
      orders: features.includes("orders"),
      products: features.includes("products"),
      inventory: features.includes("inventory"),
    });
  };

  const openEdit = (ci: CompanyIntegration) => {
    populateEditForm(ci);
    navigate("/company-integrations/setup", { state: { integration: ci } });
  };

  useEffect(() => {
    if (!formVisible) return;
    const routeState = location.state as
      | { companyId?: string; integrationId?: string; integration?: CompanyIntegration }
      | null;
    if (routeState?.integration) {
      populateEditForm(routeState.integration);
    } else if (routeState) {
      setEditing(null);
      setFormCompanyId(routeState.companyId || "");
      setFormIntegrationId(routeState.integrationId || "");
      setFormCredentials({});
      setFormStorefrontUrl("");
      setDarazOAuthConnected(false);
      setDarazConnecting(false);
      setFormActive(true);
      setFormFeatures({ orders: true, products: true, inventory: true });
    }
  }, [formVisible, location.state]);

  const closeForm = () => {
    setEditing(null);
    navigate("/company-integrations");
  };

  useEffect(() => {
    if (formVisible && formContainerRef.current) {
      formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formVisible, location.pathname]);

  useEffect(() => {
    if (!formVisible) return;
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (data && typeof data === "object" && data.type === "DARAZ_CONNECTED") {
        setDarazConnecting(false);
        if (data.ok === false) {
          setDarazOAuthConnected(false);
          setError(String(data.error || "Daraz connect failed"));
          return;
        }
        setDarazOAuthConnected(true);
        const fromPopup =
          data.credentials && typeof data.credentials === "object"
            ? (data.credentials as Record<string, string>)
            : null;
        if (typeof fromPopup?.storefront_url === "string") {
          setFormStorefrontUrl(fromPopup.storefront_url);
        }
        setFormCredentials((prev) => ({
          ...prev,
          oauth_connected: "true",
          authorization_code: "",
          // Prefer tokens exchanged in callback (codes expire too fast to exchange on Save).
          ...(fromPopup
            ? {
                access_token: String(fromPopup.access_token || ""),
                refresh_token: String(fromPopup.refresh_token || ""),
                expires_in: String(fromPopup.expires_in || ""),
                refresh_expires_in: String(fromPopup.refresh_expires_in || ""),
                storefront_url: String(fromPopup.storefront_url || ""),
                shop_name: String(fromPopup.shop_name || ""),
                shop_short_code: String(fromPopup.shop_short_code || ""),
              }
            : data.code
              ? { authorization_code: String(data.code) }
              : {}),
        }));
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [formVisible]);

  const connectDaraz = useCallback(async () => {
    if (!formCompanyId) {
      setError("Select a company before connecting Daraz.");
      return;
    }
    setError("");
    setDarazConnecting(true);
    try {
      const res = await axios.get<{ url: string }>(`${API_BASE}/api/daraz/connect`);
      const url = res.data?.url;
      if (!url) throw new Error("No authorization URL returned from server");
      const popup = window.open(url, "Daraz Login", "width=600,height=700");
      if (!popup) {
        throw new Error("Popup blocked. Allow popups for this site and try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect Daraz");
      setDarazConnecting(false);
    }
  }, [formCompanyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const storefrontUrl = normalizeStoreWebsiteUrl(formStorefrontUrl);
    if (storefrontUrl === null) {
      setError("Enter a valid public website URL, such as https://www.daraz.pk/shop/your-store.");
      setSaving(false);
      return;
    }
    const selectedFeatures: string[] = [];
    if (formFeatures.orders) selectedFeatures.push("orders");
    if (formFeatures.products) selectedFeatures.push("products");
    if (formFeatures.inventory) selectedFeatures.push("inventory");
    if (selectedFeatures.length === 0) {
      setError("Select at least one feature: Orders, Products, or Inventory.");
      setSaving(false);
      return;
    }
    try {
      if (editing) {
        await tenantApi.updateCompanyIntegration(editing.id, {
          company_id: formCompanyId || undefined,
          credentials: { ...formCredentials, storefront_url: storefrontUrl },
          status: formActive ? 1 : 0,
          features: selectedFeatures,
        });
      } else {
        if (!formCompanyId) {
          setError("Select a company");
          setSaving(false);
          return;
        }
        if (!formIntegrationId) {
          setError("Select an integration");
          setSaving(false);
          return;
        }
        if (isDarazSelected && !darazOAuthConnected) {
          setError("Connect your Daraz account using the button below before saving.");
          setSaving(false);
          return;
        }
        await tenantApi.createCompanyIntegration({
          company_id: formCompanyId,
          integration_id: formIntegrationId,
          credentials: { ...formCredentials, storefront_url: storefrontUrl },
          status: formActive ? 1 : 0,
          features: selectedFeatures,
        });
      }
      closeForm();
      await load();
      if (isDarazSelected) {
        setSuccessMessage(
          "Daraz connected. Products are importing now (or use Sync on the Inventory page). This can take a minute."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ci: CompanyIntegration) => {
    if (!confirm("Delete " + ci.integration_name + " integration?")) return;
    setError("");
    try {
      await tenantApi.deleteCompanyIntegration(ci.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const setupStateStyles: Record<SetupState, string> = {
    "not-connected": "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    "in-progress": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "needs-attention": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const setupStateLabels: Record<SetupState, string> = {
    "not-connected": "Not connected",
    "in-progress": "Setup in progress",
    connected: "Connected",
    "needs-attention": "Needs attention",
  };

  const integrationColumns: DataGridColumn<CompanyIntegration>[] = [
    {
      key: "company_name",
      label: "Company",
      render: (v) => <span className="font-medium text-gray-900 dark:text-white">{String(v ?? "—")}</span>,
    },
    {
      key: "integration_name",
      label: "Integration",
      render: (v) => <span className="text-gray-700 dark:text-gray-300">{String(v ?? "—")}</span>,
    },
    {
      key: "status",
      label: "Connection",
      render: (_, row) => (
        <span
          className={
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
            (row.status === 1
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400")
          }
        >
          {row.status === 1 ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "credentials",
      label: "Website",
      render: (_, row) => {
        const url = getStoreWebsiteUrl(row);
        return (
          <div className="flex max-w-sm flex-col items-start gap-1">
            {url ? (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-full truncate text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                  title={url}
                >
                  {url}
                </a>
              </>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">No public URL</span>
            )}
          </div>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <span className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageMeta
        title={`${formVisible ? (editing ? "Edit" : "Add") : "Company"} Integrations | UniSell`}
        description={formVisible ? "Configure a company integration." : "Manage your company integrations."}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageBreadcrumb pageTitle={formVisible ? (editing ? "Edit integration" : "Add integration") : "Company Integrations"} />
        {!formVisible && (
          <div className="flex items-center gap-2">
            <button
              aria-expanded={setupChecklistOpen}
              aria-controls="store-connection-checklist"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              type="button"
              onClick={() => setSetupChecklistOpen((open) => !open)}
            >
              {setupChecklistOpen ? "Hide setup checklist" : "Setup checklist"}
            </button>
            <button
              aria-label="Take the Integrations tour"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-600 hover:border-violet-400 hover:text-violet-700 dark:border-gray-700 dark:text-gray-300"
              type="button"
              onClick={() => startPageTour("integrations")}
            >
              ?
            </button>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {!formVisible && setupChecklistOpen && <section id="store-connection-checklist" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Store connection checklist</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track each company’s setup and see what to do next. Connected means setup is saved and enabled in UniSell.
            </p>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading company setup…</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a company first, then return here to connect its stores.
            </p>
          ) : integrations.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              No store channels are available yet. Contact your UniSell administrator to configure integrations.
            </p>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div key={company.id} className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                    {company.name}
                  </h3>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {integrations.map((integration) => {
                      const setup = getSetupState(company, integration);
                      const busy = formVisible && setup.state === "in-progress";
                      return (
                        <div key={integration.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-48 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{integration.name}</span>
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${setupStateStyles[setup.state]}`}>
                                {setupStateLabels[setup.state]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{setup.detail}</p>
                          </div>
                          {busy ? (
                            <button
                              type="button"
                              onClick={() => formContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                              className="text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-sky-300"
                            >
                              Continue setup
                            </button>
                          ) : setup.connection ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (setup.connection) openEdit(setup.connection);
                              }}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            >
                              {setup.state === "connected" ? "Manage" : "Fix setup"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openCreate(company.id, integration.id)}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            >
                              Start setup
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Having trouble connecting a store?{" "}
            <Link to="/help-support" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Contact UniSell support
            </Link>
            . Share the error message, but never send passwords or API tokens.
          </p>
        </section>}

        {formVisible ? (
          <div ref={formContainerRef} data-tour="integrations-add" data-tour-form="integrations-list">
            <SetupFormShell
              title={editing ? "Edit integration" : "Add integration"}
              subtitle="Connect a marketplace or sales channel to sync orders, products, and inventory."
              badge="Integration"
              onCancel={closeForm}
              onSubmit={handleSave}
              aside={
                <SetupFormAside
                  title={isDarazSelected ? "Connect Daraz" : "Link your store"}
                  accent="sky"
                  steps={[
                    { label: "Pick company", detail: "Choose which legal entity owns this store connection." },
                    { label: "Choose channel", detail: "Select the marketplace or platform to integrate." },
                    ...(isDarazSelected
                      ? [{ label: "OAuth sign-in", detail: "Authorize UniSell in the Daraz popup before saving." }]
                      : [{ label: "Enter credentials", detail: "API keys from your platform developer console." }]),
                    { label: "Enable features", detail: "Turn on orders, products, and/or inventory sync." },
                  ]}
                  tips={
                    isDarazSelected
                      ? [
                          "Allow popups for this site when connecting Daraz.",
                          "Callback URL must be /api/daraz/callback in Daraz Open Platform.",
                          "Product import may take a minute after first connect.",
                        ]
                      : [
                          "Create a company first if the dropdown is empty.",
                          "Inactive integrations skip scheduled sync jobs.",
                          "You can edit credentials without changing company or channel.",
                        ]
                  }
                />
              }
              footer={
                <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                  <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600">
                    {saving ? "Saving…" : editing ? "Update integration" : "Create integration"}
                  </button>
                </div>
              }
            >
              <SetupFormSection title="Connection" description="Which company and sales channel to link.">
                <div>
                  <Label>Company</Label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    disabled={!!editing}
                    className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {!editing && companies.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Create a company first from the Companies page.</p>
                  )}
                </div>
                <div>
                  <Label>Integration</Label>
                  <select
                    value={formIntegrationId}
                    onChange={(e) => {
                      setFormIntegrationId(e.target.value);
                      setFormCredentials({});
                      setDarazOAuthConnected(false);
                      setDarazConnecting(false);
                    }}
                    disabled={!!editing}
                    className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select integration</option>
                    {integrations.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  {!editing && integrations.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">No integrations available. Run backend migration then refresh.</p>
                  )}
                </div>
              </SetupFormSection>

              {isDarazSelected && (
                <SetupFormSection title="Daraz account" description="Sign in with Daraz OAuth before saving a new connection.">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Callback URL in Daraz Open Platform must match <code className="text-xs">/api/daraz/callback</code>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {darazOAuthConnected ? (
                      <span className="inline-flex rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                        Daraz connected ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={connectDaraz}
                        disabled={darazConnecting || !formCompanyId}
                        className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600"
                      >
                        {darazConnecting ? "Opening Daraz…" : "Connect Daraz account"}
                      </button>
                    )}
                    {darazOAuthConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setDarazOAuthConnected(false);
                          setFormCredentials({});
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Connect again
                      </button>
                    )}
                  </div>
                  {!formCompanyId && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Select a company first, then connect Daraz.</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    After Connect succeeds, click <strong>Save</strong> right away so the new token is stored.
                  </p>
                </SetupFormSection>
              )}

              {!isDarazSelected && (
                <SetupFormSection title="Public website" description="Optional public storefront link. It is separate from the integration connection status.">
                  <div>
                    <Label className="text-sm">Store website URL</Label>
                    <Input
                      type="url"
                      placeholder="https://your-store.com"
                      value={formStorefrontUrl}
                      onChange={(e) => setFormStorefrontUrl(e.target.value)}
                      className="mt-1.5"
                    />
                    {selectedIntegration?.slug === "shopify" && !formStorefrontUrl && typeof formCredentials.shop_domain === "string" && (
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        If left blank, the Shopify shop domain will be used as the website URL.
                      </p>
                    )}
                  </div>
                </SetupFormSection>
              )}

              {selectedSchema.length > 0 && (
                <SetupFormSection title="Credentials" description="API keys from your platform developer console.">
                  {selectedSchema.map((field) => (
                    <div key={field.key}>
                      <Label className="text-sm">{field.label}</Label>
                      <Input
                        type={field.type === "password" ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={formCredentials[field.key] ?? ""}
                        onChange={(e) => setFormCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                  ))}
                </SetupFormSection>
              )}

              <SetupFormSection title="Sync options" description="Control what UniSell syncs for this connection.">
                <div className="flex items-center gap-2">
                  <Checkbox checked={formActive} onChange={setFormActive} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Active (sync jobs will run for this integration)
                  </span>
                </div>
                <div>
                  <Label className="text-sm">Features</Label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Choose what this integration should handle for the company.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Checkbox checked={formFeatures.orders} onChange={(v) => setFormFeatures((prev) => ({ ...prev, orders: v }))} />
                      <span>Orders</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Checkbox checked={formFeatures.products} onChange={(v) => setFormFeatures((prev) => ({ ...prev, products: v }))} />
                      <span>Products</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Checkbox checked={formFeatures.inventory} onChange={(v) => setFormFeatures((prev) => ({ ...prev, inventory: v }))} />
                      <span>Inventory</span>
                    </label>
                  </div>
                </div>
              </SetupFormSection>
            </SetupFormShell>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                data-tour="integrations-add"
                type="button"
                onClick={() => openCreate()}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Add integration
              </button>
            </div>
            <div data-tour="integrations-list">
              <DataGrid
                columns={integrationColumns}
                data={companyIntegrations}
                keyExtractor={(ci) => ci.id}
                emptyMessage="No integrations yet. Click Add integration to connect a store."
                loading={loading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
