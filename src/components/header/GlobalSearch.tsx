import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { authApi, tenantApi, type Order, type Product, type TenantRow } from "../../api/client";
import {
  filterPages,
  superadminSearchPages,
  tenantSearchPages,
  type SearchPage,
} from "../../config/navSearch";

type ResultItem =
  | { kind: "page"; page: SearchPage }
  | { kind: "product"; product: Product }
  | { kind: "order"; order: Order }
  | { kind: "tenant"; tenant: TenantRow };

type GlobalSearchProps = {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  isSuperadmin?: boolean;
};

export default function GlobalSearch({ inputRef, className = "", isSuperadmin = false }: GlobalSearchProps) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const mergedRef = inputRef ?? localInputRef;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = isSuperadmin ? superadminSearchPages : tenantSearchPages;

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      const pageHits = filterPages(pages, trimmed).map((page) => ({ kind: "page" as const, page }));

      if (trimmed.length < 2) {
        setItems(pageHits.slice(0, 8));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isSuperadmin) {
          const list = await authApi.getTenants();
          const q = trimmed.toLowerCase();
          const tenantHits = (Array.isArray(list) ? list : [])
            .filter(
              (t) =>
                t.tenant_name?.toLowerCase().includes(q) ||
                t.email?.toLowerCase().includes(q) ||
                t.status?.toLowerCase().includes(q)
            )
            .slice(0, 6)
            .map((tenant) => ({ kind: "tenant" as const, tenant }));
          setItems([...pageHits.slice(0, 4), ...tenantHits].slice(0, 12));
        } else {
          const [productsRes, ordersRes] = await Promise.all([
            tenantApi.getProducts({ search: trimmed, sort: "newest" }),
            tenantApi.getOrders({ search: trimmed, sort: "newest" }),
          ]);
          const products = (productsRes?.products ?? []).slice(0, 5).map((product) => ({
            kind: "product" as const,
            product,
          }));
          const orders = (ordersRes?.orders ?? []).slice(0, 5).map((order) => ({
            kind: "order" as const,
            order,
          }));
          setItems([...pageHits.slice(0, 4), ...products, ...orders].slice(0, 12));
        }
      } catch {
        setItems(pageHits.slice(0, 8));
      } finally {
        setLoading(false);
      }
    },
    [isSuperadmin, pages]
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => runSearch(query), 280);
    return () => window.clearTimeout(t);
  }, [query, open, runSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goTo = (item: ResultItem) => {
    setOpen(false);
    setQuery("");
    if (item.kind === "page") {
      navigate(item.page.path);
    } else if (item.kind === "product") {
      navigate(`/products?search=${encodeURIComponent(item.product.title || item.product.sku || "")}`);
    } else if (item.kind === "tenant") {
      navigate("/superadmin/tenants");
    } else {
      const label = String(item.order.order_number ?? item.order.email ?? "");
      navigate(`/orders?search=${encodeURIComponent(label)}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      mergedRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) goTo(items[activeIndex]);
      else if (query.trim()) {
        setOpen(false);
        navigate(
          isSuperadmin
            ? "/"
            : `/products?search=${encodeURIComponent(query.trim())}`
        );
      }
    }
  };

  const grouped = items.reduce<Record<string, ResultItem[]>>((acc, item) => {
    const key =
      item.kind === "page"
        ? "Pages"
        : item.kind === "product"
        ? "Products"
        : item.kind === "tenant"
        ? "Tenants"
        : "Orders";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div ref={wrapRef} data-tour="global-search" className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (items[activeIndex]) goTo(items[activeIndex]);
          else if (query.trim() && !isSuperadmin) {
            navigate(`/products?search=${encodeURIComponent(query.trim())}`);
            setOpen(false);
          }
        }}
      >
        <div className="relative">
          <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2 text-pink-400 dark:text-pink-400">
            <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>
          <input
            ref={mergedRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              runSearch(query);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search..."
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
            autoComplete="off"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
          />
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100000] max-h-[min(420px,70vh)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900 xl:w-[430px]">
          {loading && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Searching…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results found</p>
          )}
          {!loading &&
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="px-2 py-1">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group}
                </p>
                <ul>
                  {groupItems.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const active = idx === activeIndex;
                    let label = "";
                    let meta = "";
                    if (item.kind === "page") {
                      label = item.page.name;
                      meta = item.page.path;
                    } else if (item.kind === "product") {
                      label = item.product.title;
                      meta = item.product.sku ? `SKU ${item.product.sku}` : "Product";
                    } else if (item.kind === "tenant") {
                      label = item.tenant.tenant_name;
                      meta = `${item.tenant.email} · ${item.tenant.status}`;
                    } else {
                      label = `Order #${item.order.order_number ?? "—"}`;
                      meta = item.order.email || item.order.company_name || "Order";
                    }
                    return (
                      <li key={`${item.kind}-${label}-${idx}`}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => goTo(item)}
                          className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition ${
                            active
                              ? "bg-violet-50 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100"
                              : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{meta}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
