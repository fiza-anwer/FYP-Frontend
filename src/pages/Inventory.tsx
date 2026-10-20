import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import { ProductChannelCell, ProductSyncStatus } from "../components/common/ChannelSyncStatus";
import { tenantApi, type Company, type Product, type ProductVariant } from "../api/client";

type InventoryRow = {
  product: Product;
  variant: ProductVariant | null;
  variantIndex: number;
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "free_low" | "free_high">(
    "newest"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkAdjustVisible, setBulkAdjustVisible] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const outOfStockOnly = searchParams.get("stock") === "out";

  const load = async () => {
    setError("");
    try {
      const params: { company_id?: string; product_type?: string; sort?: string } = {};
      if (companyFilter) params.company_id = companyFilter;
      if (typeFilter.trim()) params.product_type = typeFilter.trim();
      params.sort = sort;
      const [prodRes, companiesRes] = await Promise.all([
        tenantApi.getProducts(params),
        tenantApi.getCompanies(),
      ]);
      setProducts(Array.isArray(prodRes?.products) ? prodRes.products : []);
      setCompanies(Array.isArray(companiesRes?.companies) ? companiesRes.companies : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyFilter, typeFilter, sort]);

  const flattenedRows = useMemo(() => {
    const rows: InventoryRow[] = [];
    for (const product of products) {
      const variants = product.variants ?? [];
      if (variants.length > 0) {
        variants.forEach((variant, idx) => {
          rows.push({ product, variant, variantIndex: idx });
        });
      } else {
        rows.push({ product, variant: null, variantIndex: 0 });
      }
    }
    return rows;
  }, [products]);

  const filteredRows = useMemo(() => {
    let list = [...flattenedRows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row) => {
        const p = row.product;
        const v = row.variant;
        return (
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.product_type ?? "").trim().toLowerCase().includes(q) ||
          (v?.sku ?? "").toLowerCase().includes(q) ||
          (v?.option1 ?? "").toLowerCase().includes(q) ||
          (v?.title ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (typeFilter.trim()) {
      const typeLower = typeFilter.trim().toLowerCase();
      list = list.filter(
        (row) => (row.product.product_type ?? "").trim().toLowerCase() === typeLower
      );
    }
    if (outOfStockOnly) {
      list = list.filter((row) => {
        const qty = typeof row.product.quantity === "number" ? row.product.quantity : 0;
        return qty <= 0;
      });
    }
    const freeStock = (row: InventoryRow) => {
      const qty = typeof row.product.quantity === "number" ? row.product.quantity : 0;
      const alloc = typeof row.product.allocated === "number" ? row.product.allocated : 0;
      return Math.max(0, qty - alloc);
    };
    switch (sort) {
      case "name_asc":
        list.sort((a, b) => (a.product.title ?? "").localeCompare(b.product.title ?? ""));
        break;
      case "name_desc":
        list.sort((a, b) => (b.product.title ?? "").localeCompare(a.product.title ?? ""));
        break;
      case "free_low":
        list.sort((a, b) => freeStock(a) - freeStock(b));
        break;
      case "free_high":
        list.sort((a, b) => freeStock(b) - freeStock(a));
        break;
      case "oldest":
        list.sort((a, b) => {
          const ta = a.product.created_at ? new Date(a.product.created_at).getTime() : 0;
          const tb = b.product.created_at ? new Date(b.product.created_at).getTime() : 0;
          return ta - tb;
        });
        break;
      case "newest":
      default:
        list.sort((a, b) => {
          const ta = a.product.created_at ? new Date(a.product.created_at).getTime() : 0;
          const tb = b.product.created_at ? new Date(b.product.created_at).getTime() : 0;
          return tb - ta;
        });
        break;
    }
    return list;
  }, [flattenedRows, search, typeFilter, sort, outOfStockOnly]);

  const uniqueTypes = useMemo(() => {
    const byLower = new Map<string, string>();
    const capitalize = (s: string) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
    products.forEach((p) => {
      const t = (p.product_type ?? "").trim();
      if (t) {
        const key = t.toLowerCase();
        if (!byLower.has(key)) byLower.set(key, capitalize(t));
      }
    });
    return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [products]);

  const getRowId = (row: InventoryRow) => `${row.product.id}-${row.variantIndex}`;
  const selectedRows = useMemo(
    () => flattenedRows.filter((row) => selectedRowIds.includes(getRowId(row))),
    [flattenedRows, selectedRowIds]
  );
  const selectedProducts = useMemo(
    () => Array.from(new Map(selectedRows.map((row) => [row.product.id, row.product])).values()),
    [selectedRows]
  );

  const openAdjust = (row: InventoryRow) => {
    navigate(`/inventory/${row.product.id}/adjust`, {
      state: {
        title: row.product.title,
        sku: row.variant?.sku ?? row.product.sku ?? "",
        quantity: typeof row.product.quantity === "number" ? row.product.quantity : 0,
      },
    });
  };

  const handleBulkAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (bulkSaving || selectedProducts.length === 0) return;
    const quantity = Number(bulkQuantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Enter a valid non-negative whole number for available stock.");
      return;
    }

    setError("");
    setBulkSaving(true);
    try {
      const results = await Promise.allSettled(
        selectedProducts.map((product) => tenantApi.patchInventory(product.id, { quantity }))
      );
      const failed = results.filter((result) => result.status === "rejected");
      setSelectedRowIds([]);
      setBulkAdjustVisible(false);
      setBulkQuantity("");
      await load();
      if (failed.length > 0) {
        const firstFailure = failed[0];
        setError(
          `${failed.length} product(s) could not be adjusted.${firstFailure.status === "rejected" && firstFailure.reason instanceof Error ? ` ${firstFailure.reason.message}` : ""}`
        );
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    const names = selectedProducts.slice(0, 3).map((product) => `"${product.title}"`).join(", ");
    const remaining = selectedProducts.length > 3 ? ` and ${selectedProducts.length - 3} more` : "";
    if (!window.confirm(`Delete ${selectedProducts.length} selected product(s) and their inventory: ${names}${remaining}?`)) return;

    setError("");
    const results = await Promise.allSettled(
      selectedProducts.map((product) => tenantApi.deleteProduct(product.id))
    );
    const failed = results.filter((result) => result.status === "rejected");
    setSelectedRowIds([]);
    await load();
    if (failed.length > 0) {
      const firstFailure = failed[0];
      setError(
        `${failed.length} product(s) could not be deleted.${firstFailure.status === "rejected" && firstFailure.reason instanceof Error ? ` ${firstFailure.reason.message}` : ""}`
      );
    }
  };

  const columns: DataGridColumn<InventoryRow>[] = [
    {
      key: "title",
      label: "Product",
      render: (_, row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.product.title || "—"}
        </span>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      render: (_, row) => {
        const sku = row.variant?.sku ?? row.product.sku;
        return sku ? String(sku) : "—";
      },
    },
    {
      key: "option",
      label: "Variant (e.g. Size/Color)",
      render: (_, row) => String(row.variant?.option1 ?? row.variant?.title ?? "—"),
    },
    {
      key: "quantity",
      label: "Available (total)",
      render: (_, row) => (typeof row.product.quantity === "number" ? row.product.quantity : 0),
    },
    {
      key: "allocated",
      label: "Allocated (ordered)",
      render: (_, row) => (typeof row.product.allocated === "number" ? row.product.allocated : 0),
    },
    {
      key: "free",
      label: "Free stock",
      render: (_, row) => {
        const qty = typeof row.product.quantity === "number" ? row.product.quantity : 0;
        const alloc = typeof row.product.allocated === "number" ? row.product.allocated : 0;
        const free = Math.max(0, qty - alloc);
        return free;
      },
    },
    {
      key: "channel",
      label: "Company",
      render: (_, row) => <ProductChannelCell product={row.product} />,
    },
    {
      key: "sync_status",
      label: "Status",
      render: (_, row) => <ProductSyncStatus product={row.product} />,
    },
  ];

  return (
    <div>
      <PageMeta title="Inventory | UniSell" description="Stock levels and adjustments." />
      <PageBreadcrumb pageTitle="Inventory" />
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {syncMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {syncMessage}
          </div>
        )}
        {outOfStockOnly && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
            <span>Showing out-of-stock products only.</span>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="font-medium underline hover:no-underline"
            >
              Show all
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, SKU, variants..."
            className="h-11 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Filter by company"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as typeof sort)
            }
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Sort inventory"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="free_high">Free stock: high to low</option>
            <option value="free_low">Free stock: low to high</option>
          </select>
          <button
            type="button"
            onClick={async () => {
              setError("");
              setSyncMessage("");
              setSyncing(true);
              try {
                const res = await tenantApi.syncAll();
                const parts = [];
                if (res.products_fetched != null && res.products_fetched > 0) {
                  parts.push(
                    `${res.products_fetched} product(s) from stores (${res.products_imported} new, ${res.products_updated ?? 0} updated)`
                  );
                } else if ((res.products_updated ?? 0) > 0) {
                  parts.push(`${res.products_updated} product(s) updated from stores`);
                } else {
                  parts.push(`${res.products_imported} new product(s) imported`);
                }
                if (res.orders_fetched != null && res.orders_fetched > 0) {
                  parts.push(
                    `${res.orders_fetched} order(s) from stores (${res.orders_imported} new, ${res.orders_updated ?? 0} updated)`
                  );
                } else {
                  parts.push(`${res.orders_imported} new order(s)`);
                }
                if ((res.products_pushed_daraz ?? 0) > 0) {
                  parts.push(`${res.products_pushed_daraz} pushed to Daraz`);
                }
                parts.push(`${res.inventory_synced} inventory update(s) to channels`);
                setSyncMessage(`Synced: ${parts.join("; ")}.`);
                if (res.errors?.length) {
                  const errPreview = res.errors
                    .slice(0, 3)
                    .map((e) => `${e.scope}: ${e.error}`)
                    .join(" | ");
                  setError(
                    res.errors.length > 3
                      ? `${errPreview} (+${res.errors.length - 3} more — see backend log)`
                      : errPreview
                  );
                } else {
                  setError("");
                }
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Sync failed");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="ml-auto h-11 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-600 dark:bg-sky-900/20 dark:text-sky-200 dark:hover:bg-sky-900/30"
          >
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Available = on-hand stock. Allocated = reserved by orders. Select products to adjust available stock; changes sync to the linked channel (Shopify or Daraz).
        </p>
        {selectedRowIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {selectedRowIds.length} row(s) selected
              {selectedProducts.length !== selectedRowIds.length &&
                ` · ${selectedProducts.length} product(s)`}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedProducts.length === 1) openAdjust(selectedRows[0]);
                  else {
                    setBulkQuantity("");
                    setBulkAdjustVisible(true);
                  }
                }}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                {selectedProducts.length === 1 ? "Edit" : "Bulk edit"}
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        )}
        <DataGrid
          columns={columns}
          data={filteredRows}
          keyExtractor={getRowId}
          emptyMessage="No inventory. Add products or import from a connected store."
          loading={loading}
          selectable
          selectedIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          onRowClick={openAdjust}
        />
      </div>
      {bulkAdjustVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !bulkSaving && setBulkAdjustVisible(false)}
        >
          <form
            onSubmit={handleBulkAdjust}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk edit inventory</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Set available stock to this quantity for {selectedProducts.length} selected product(s). Allocated stock is unchanged.
            </p>
            <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="bulk-inventory-quantity">
              Available stock
            </label>
            <input
              id="bulk-inventory-quantity"
              type="number"
              min="0"
              step="1"
              required
              value={bulkQuantity}
              onChange={(event) => setBulkQuantity(event.target.value)}
              disabled={bulkSaving}
              className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => setBulkAdjustVisible(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkSaving}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500"
              >
                {bulkSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
