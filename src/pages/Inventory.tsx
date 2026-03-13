import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const navigate = useNavigate();

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
  }, [flattenedRows, search, typeFilter, sort]);

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
      key: "shopify_synced",
      label: "Shopify",
      render: (_, row) =>
        row.product.shopify_synced ? (
          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Synced
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            Not synced
          </span>
        ),
    },
    {
      key: "product_id",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => openAdjust(row)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Adjust
        </button>
      ),
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
                setSyncMessage(
                  `Synced: ${res.products_imported} products, ${res.orders_imported} orders, ${res.inventory_synced} inventory updates.`
                );
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
          Available = on-hand stock. Allocated = reserved by orders. Adjust available stock below; changes sync to Shopify when the product is linked.
        </p>
        <DataGrid
          columns={columns}
          data={filteredRows}
          keyExtractor={(row) => `${row.product.id}-${row.variantIndex}`}
          emptyMessage="No inventory. Add products or import from Shopify."
          loading={loading}
        />
      </div>
    </div>
  );
}
