import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import {
  ProductNameCell,
  ProductPlatformLogos,
} from "../components/common/ChannelSyncStatus";
import {
  tenantApi,
  type Company,
  type CompanyIntegration,
  type Product,
  type ProductVariant,
} from "../api/client";

type InventoryRow = {
  product: Product;
  variant: ProductVariant | null;
  variantIndex: number;
};

function getRowId(row: InventoryRow): string {
  return `${row.product.id}-${row.variantIndex}-${row.variant?.id ?? "0"}`;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyIntegrations, setCompanyIntegrations] = useState<CompanyIntegration[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "free_low" | "free_high">(
    "newest"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const [failedSyncKeys, setFailedSyncKeys] = useState<Set<string>>(() => new Set());
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const outOfStockOnly = searchParams.get("stock") === "out";

  const load = useCallback(async () => {
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
  }, [companyFilter, typeFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    tenantApi
      .getCompanyIntegrations()
      .then((res) => setCompanyIntegrations(res.company_integrations || []))
      .catch(() => setCompanyIntegrations([]));
  }, []);

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
    if (platformFilter === "shopify") {
      list = list.filter(
        (row) =>
          !!row.product.shopify_synced || (row.product.source || "").toLowerCase() === "shopify"
      );
    } else if (platformFilter === "daraz") {
      list = list.filter(
        (row) => !!row.product.daraz_synced || (row.product.source || "").toLowerCase() === "daraz"
      );
    } else if (platformFilter === "both") {
      list = list.filter((row) => !!row.product.shopify_synced && !!row.product.daraz_synced);
    } else if (platformFilter === "local") {
      list = list.filter(
        (row) =>
          !row.product.shopify_synced &&
          !row.product.daraz_synced &&
          (row.product.source || "local").toLowerCase() === "local"
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
  }, [flattenedRows, search, typeFilter, platformFilter, sort, outOfStockOnly]);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedRowIds.includes(getRowId(row))),
    [filteredRows, selectedRowIds]
  );
  const hasSelection = selectedRows.length > 0;

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

  const openAdjust = (row: InventoryRow) => {
    navigate(`/inventory/${row.product.id}/adjust`, {
      state: {
        title: row.product.title,
        sku: row.variant?.sku ?? row.product.sku ?? "",
        quantity: typeof row.product.quantity === "number" ? row.product.quantity : 0,
      },
    });
  };

  const handleToolbarEdit = () => {
    if (!hasSelection) return;
    openAdjust(selectedRows[0]);
  };

  const handleToolbarDelete = async () => {
    if (!hasSelection) return;
    const uniqueProducts = new Map<string, Product>();
    for (const row of selectedRows) {
      uniqueProducts.set(row.product.id, row.product);
    }
    const list = Array.from(uniqueProducts.values());
    const label =
      list.length === 1
        ? `Delete product "${list[0].title}"?`
        : `Delete ${list.length} selected products?`;
    if (!window.confirm(label)) return;
    setError("");
    try {
      for (const p of list) {
        await tenantApi.deleteProduct(p.id);
      }
      setSelectedRowIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const handleRetryShopify = useCallback(
    async (product: Product) => {
      const key = `${product.id}:shopify`;
      setError("");
      setSyncMessage("");
      setRetryingKey(key);
      try {
        await tenantApi.pushProductToShopify(product.id);
        setFailedSyncKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setSyncMessage("Pushed to Shopify.");
        await load();
      } catch (err) {
        setFailedSyncKeys((prev) => new Set(prev).add(key));
        setError(err instanceof Error ? err.message : "Push to Shopify failed.");
      } finally {
        setRetryingKey(null);
      }
    },
    [load]
  );

  const handleRetryDaraz = useCallback(
    async (product: Product) => {
      const key = `${product.id}:daraz`;
      setError("");
      setSyncMessage("");
      setRetryingKey(key);
      try {
        const data = await tenantApi.pushProductToDaraz(product.id);
        setFailedSyncKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setSyncMessage(data?.message || "Pushed to Daraz.");
        await load();
      } catch (err) {
        setFailedSyncKeys((prev) => new Set(prev).add(key));
        setError(err instanceof Error ? err.message : "Push to Daraz failed.");
      } finally {
        setRetryingKey(null);
      }
    },
    [load]
  );

  const columns: DataGridColumn<InventoryRow>[] = useMemo(() => {
    const cols: DataGridColumn<InventoryRow>[] = [
      {
        key: "title",
        label: "Product",
        render: (_, row) => (
          <ProductNameCell
            title={row.product.title}
            status={row.product.status}
            className="font-medium text-gray-900 dark:text-white"
          />
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
          return Math.max(0, qty - alloc);
        },
      },
    ];

    if (platformFilter === "") {
      cols.push({
        key: "platform",
        label: "Platform",
        render: (_, row) => (
          <ProductPlatformLogos
            product={row.product}
            companyIntegrations={companyIntegrations}
            onRetryShopify={handleRetryShopify}
            onRetryDaraz={handleRetryDaraz}
            retryingShopify={retryingKey === `${row.product.id}:shopify`}
            retryingDaraz={retryingKey === `${row.product.id}:daraz`}
            failedShopify={failedSyncKeys.has(`${row.product.id}:shopify`)}
            failedDaraz={failedSyncKeys.has(`${row.product.id}:daraz`)}
          />
        ),
      });
    }

    return cols;
  }, [
    platformFilter,
    companyIntegrations,
    handleRetryShopify,
    handleRetryDaraz,
    retryingKey,
    failedSyncKeys,
  ]);

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
          <button
            type="button"
            onClick={handleToolbarEdit}
            disabled={!hasSelection}
            className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleToolbarDelete()}
            disabled={!hasSelection}
            className="h-11 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
          >
            Delete
          </button>
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
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Filter by platform"
          >
            <option value="">All platforms</option>
            <option value="both">Both (Shopify + Daraz)</option>
            <option value="shopify">Shopify</option>
            <option value="daraz">Daraz</option>
            <option value="local">Local only</option>
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
          Available = on-hand stock. Allocated = reserved by orders. Select a row then Edit (or double-click) to adjust stock; changes sync to Shopify/Daraz.
        </p>
        <DataGrid
          columns={columns}
          data={filteredRows}
          keyExtractor={(row) => getRowId(row)}
          emptyMessage="No inventory. Add products or import from a connected store."
          loading={loading}
          selectable
          selectedIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          onRowDoubleClick={(row) => openAdjust(row)}
        />
      </div>
    </div>
  );
}
