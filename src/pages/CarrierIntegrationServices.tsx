import { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import StickyToolbar from "../components/common/StickyToolbar";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import { tenantApi, type CarrierIntegration, type CarrierIntegrationService } from "../api/client";
import Label from "../components/form/Label";
import SetupFormShell, { SetupFormAside, SetupFormSection } from "../components/setup/SetupFormShell";

export default function CarrierIntegrationServices() {
  const [carrierIntegrations, setCarrierIntegrations] = useState<CarrierIntegration[]>([]);
  const [services, setServices] = useState<CarrierIntegrationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [filterCarrierIntegrationId, setFilterCarrierIntegrationId] = useState("");
  const [formCarrierIntegrationId, setFormCarrierIntegrationId] = useState("");
  const [formCarrierServiceId, setFormCarrierServiceId] = useState("");
  const [carrierServices, setCarrierServices] = useState<Array<{ id: string; name: string; code: string; carrier_id: string }>>([]);
  const [saving, setSaving] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setError("");
    try {
      const [ciRes, svcRes] = await Promise.all([
        tenantApi.getCarrierIntegrations(),
        tenantApi.getCarrierIntegrationServices(filterCarrierIntegrationId ? { carrier_integration_id: filterCarrierIntegrationId } : undefined),
      ]);
      setCarrierIntegrations(Array.isArray(ciRes?.carrier_integrations) ? ciRes.carrier_integrations : []);
      setServices(Array.isArray(svcRes?.carrier_integration_services) ? svcRes.carrier_integration_services : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterCarrierIntegrationId]);

  const openCreate = () => {
    setFormCarrierIntegrationId(filterCarrierIntegrationId || (carrierIntegrations[0]?.id ?? ""));
    setFormCarrierServiceId("");
    setFormVisible(true);
    const cid = filterCarrierIntegrationId || (carrierIntegrations[0]?.id ?? "");
    if (cid) {
      const ci = carrierIntegrations.find((c) => c.id === cid);
      if (ci) {
        tenantApi.getCarrierServices({ carrier_id: ci.carrier_id }).then((r) => setCarrierServices(r.carrier_services));
      } else {
        setCarrierServices([]);
      }
    } else {
      setCarrierServices([]);
    }
  };

  const onFormCarrierIntegrationChange = (id: string) => {
    setFormCarrierIntegrationId(id);
    setFormCarrierServiceId("");
    const ci = carrierIntegrations.find((c) => c.id === id);
    if (ci) {
      tenantApi.getCarrierServices({ carrier_id: ci.carrier_id }).then((r) => setCarrierServices(r.carrier_services));
    } else {
      setCarrierServices([]);
    }
  };

  const closeForm = () => {
    setFormVisible(false);
  };

  useEffect(() => {
    if (formVisible && formContainerRef.current) {
      formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formVisible]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCarrierIntegrationId || !formCarrierServiceId) {
      setError("Select carrier integration and service");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await tenantApi.createCarrierIntegrationService({
        carrier_integration_id: formCarrierIntegrationId,
        carrier_service_id: formCarrierServiceId,
      });
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svc: CarrierIntegrationService) => {
    if (!confirm(`Remove service "${svc.carrier_service_name}"?`)) return;
    setError("");
    try {
      await tenantApi.deleteCarrierIntegrationService(svc.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const columns: DataGridColumn<CarrierIntegrationService>[] = [
    {
      key: "carrier_integration_id",
      label: "Carrier integration",
      render: (_, row) => {
        const ci = carrierIntegrations.find((c) => c.id === row.carrier_integration_id);
        return <span className="font-medium text-gray-900 dark:text-white">{ci?.carrier_name ?? row.carrier_integration_id}</span>;
      },
    },
    {
      key: "carrier_service_name",
      label: "Service",
      render: (v) => <span className="text-gray-700 dark:text-gray-300">{String(v ?? "—")}</span>,
    },
    {
      key: "carrier_service_code",
      label: "Code",
      render: (v) => <span className="text-gray-500 dark:text-gray-400">{String(v ?? "—")}</span>,
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleDelete(row)}
          className="text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageMeta title="Carrier Integration Services | UniSell" description="Manage services for carrier integrations." />
      <PageBreadcrumb pageTitle="Carrier Integration Services" />
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {formVisible ? (
          <div ref={formContainerRef}>
            <SetupFormShell
              title="Add carrier service"
              subtitle="Map a shipping service to your carrier integration for consignments."
              badge="Courier"
              onCancel={closeForm}
              onSubmit={handleSave}
              aside={
                <SetupFormAside
                  title="Enable shipping options"
                  accent="amber"
                  steps={[
                    { label: "Pick integration", detail: "The carrier account you already connected." },
                    { label: "Choose service", detail: "Service code from your carrier contract." },
                    { label: "Book shipments", detail: "Use this service when creating consignments." },
                  ]}
                  tips={[
                    "Connect a carrier integration before adding services.",
                    "Service codes must match what your carrier API expects.",
                    "Filter the list above to manage services per integration.",
                  ]}
                />
              }
              footer={
                <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                  <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-600">
                    {saving ? "Saving…" : "Add service"}
                  </button>
                </div>
              }
            >
              <SetupFormSection title="Service mapping" description="Link a carrier service to your integration.">
                <div>
                  <Label>Carrier integration</Label>
                  <select
                    value={formCarrierIntegrationId}
                    onChange={(e) => onFormCarrierIntegrationChange(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select</option>
                    {carrierIntegrations.map((c) => (
                      <option key={c.id} value={c.id}>{c.carrier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Service</Label>
                  <select
                    value={formCarrierServiceId}
                    onChange={(e) => setFormCarrierServiceId(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select</option>
                    {carrierServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                  {carrierIntegrations.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Create a carrier integration first.</p>
                  )}
                </div>
              </SetupFormSection>
            </SetupFormShell>
          </div>
        ) : (
          <>
            <StickyToolbar className="flex flex-wrap items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Carrier integration</label>
              <select
                value={filterCarrierIntegrationId}
                onChange={(e) => setFilterCarrierIntegrationId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[200px]"
              >
                <option value="">All</option>
                {carrierIntegrations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.carrier_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Add service
              </button>
            </StickyToolbar>
            <DataGrid
              columns={columns}
              data={services}
              keyExtractor={(s) => s.id}
              emptyMessage="No carrier integration services yet. Select a carrier integration and click Add service."
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}
