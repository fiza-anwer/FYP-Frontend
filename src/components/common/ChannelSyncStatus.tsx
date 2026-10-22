import type { CompanyIntegration, Order, Product } from "../../api/client";
/** Bundled into the build (hashed URL) so deploy + ad blockers can't break them. */
import platformSfLogo from "../../assets/brand/platform-sf.png";
import platformDzLogo from "../../assets/brand/platform-dz.png";

export type ChannelSlug = "shopify" | "daraz";

/** Which marketplaces this product should sync to (based on company integrations + product settings). */
export function getProductPushTargets(
  product: Product,
  companyIntegrations: CompanyIntegration[]
): ChannelSlug[] {
  const companyId = product.company_id;
  if (!companyId) return [];

  const activeSlugs = companyIntegrations
    .filter(
      (ci) =>
        (ci.company_id || "") === companyId &&
        ci.status === 1 &&
        (ci.integration_slug === "shopify" || ci.integration_slug === "daraz")
    )
    .map((ci) => ci.integration_slug as ChannelSlug);

  const fromProduct = (product.integration_slugs ?? []).filter(
    (s): s is ChannelSlug => s === "shopify" || s === "daraz"
  );
  if (fromProduct.length > 0) {
    return fromProduct.filter((s) => activeSlugs.includes(s));
  }

  // Imported from one channel (e.g. Daraz) can still push to the other (Shopify) for the same company.
  return activeSlugs;
}

export function formatChannelLabel(source?: string | null): string | null {
  const s = (source || "").toLowerCase();
  if (s === "shopify") return "Shopify";
  if (s === "daraz") return "Daraz";
  return null;
}

export function getProductChannel(p: Product): ChannelSlug | null {
  const src = (p.source || "").toLowerCase();
  if (src === "shopify" || src === "daraz") return src;
  if (p.daraz_synced || (p.integration_slugs ?? []).includes("daraz")) return "daraz";
  if (p.shopify_synced || (p.integration_slugs ?? []).includes("shopify")) return "shopify";
  return null;
}

export function isProductSynced(p: Product): boolean {
  const ch = getProductChannel(p);
  if (ch === "shopify") return !!p.shopify_synced;
  if (ch === "daraz") return !!p.daraz_synced;
  return !!(p.shopify_synced || p.daraz_synced);
}

export function getOrderChannel(o: Order): ChannelSlug | null {
  const s = (o.source || "").toLowerCase();
  if (s === "shopify" || s === "daraz") return s;
  return null;
}

export function isOrderSynced(o: Order): boolean {
  const ch = getOrderChannel(o);
  return !!ch && !!o.external_id;
}

export function productStatusLabel(status?: string): string {
  const s = status || "active";
  if (s === "published") return "Active";
  if (s === "scheduled") return "Draft";
  if (s === "hidden") return "Archived";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase();
}

/** Normalized product status for display rules. */
export function normalizeProductStatusKey(status?: string): "active" | "draft" | "archived" | string {
  const s = String(status || "active").toLowerCase();
  if (s === "published" || s === "active") return "active";
  if (s === "scheduled" || s === "draft") return "draft";
  if (s === "hidden" || s === "archived") return "archived";
  return s;
}

/** Empty when Active; gray Draft/Archived badge otherwise. */
export function ProductStatusBadge({ status }: { status?: string }) {
  const key = normalizeProductStatusKey(status);
  if (key === "active") return null;
  const label = key === "draft" ? "Draft" : key === "archived" ? "Archived" : productStatusLabel(status);
  return (
    <span className="inline-flex shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {label}
    </span>
  );
}

/** Product title with inline Draft/Archived badge (no status column). */
export function ProductNameCell({
  title,
  status,
  className,
}: {
  title?: string | null;
  status?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <span>{title?.trim() ? title : "—"}</span>
      <ProductStatusBadge status={status} />
    </span>
  );
}

export function SyncStatusBadge({ synced }: { synced: boolean }) {
  return synced ? (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
      Synced
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
      Not synced
    </span>
  );
}

export function ChannelCell({ channel }: { channel?: string | null }) {
  const label = formatChannelLabel(channel);
  return (
    <span className="text-sm text-gray-700 dark:text-gray-300">{label ?? "—"}</span>
  );
}

export function ProductChannelCell({ product }: { product: Product }) {
  return <ChannelCell channel={getProductChannel(product) ?? product.source} />;
}

export function ProductSyncStatus({ product }: { product: Product }) {
  const ch = getProductChannel(product);
  if (!ch && !product.company_id) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return <SyncStatusBadge synced={isProductSynced(product)} />;
}

function ShopifyLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={platformSfLogo}
      alt="Shopify"
      className={`object-contain ${className}`}
      width={32}
      height={32}
      draggable={false}
    />
  );
}

function DarazLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={platformDzLogo}
      alt="Daraz"
      className={`rounded-sm object-contain ${className}`}
      width={32}
      height={32}
      draggable={false}
    />
  );
}

export type PlatformSyncState = "synced" | "pending" | "failed";

function channelSyncState(
  product: Product,
  slug: ChannelSlug,
  targets: ChannelSlug[]
): PlatformSyncState | null {
  const synced = slug === "shopify" ? !!product.shopify_synced : !!product.daraz_synced;
  if (synced) return "synced";
  const src = (product.source || "").toLowerCase();
  const expected = targets.includes(slug) || src === slug;
  if (!expected) return null;
  // Expected but not linked yet → pending (yellow). No stored failure flag → treat as pending.
  return "pending";
}

function PlatformLogoChip({
  slug,
  state,
  onRetry,
  retrying,
}: {
  slug: ChannelSlug;
  state: PlatformSyncState;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const label = slug === "shopify" ? "Shopify" : "Daraz";
  const title =
    state === "synced"
      ? `${label} synced`
      : state === "failed"
        ? `${label} failed`
        : `${label} pending`;

  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className="relative inline-flex">
        {slug === "shopify" ? <ShopifyLogo /> : <DarazLogo />}
        {state === "pending" && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-gray-900"
            aria-label="Pending"
          />
        )}
        {state === "failed" && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900"
            aria-label="Failed"
          />
        )}
      </span>
      {(state === "pending" || state === "failed") && onRetry && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          disabled={retrying}
          className="text-[10px] font-medium text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
        >
          {retrying ? "…" : "Retry"}
        </button>
      )}
    </span>
  );
}

/**
 * One Platform column: Shopify / Daraz logos only.
 * Synced → logo only. Pending/Failed → amber/red dot on logo + Retry.
 */
export function ProductPlatformLogos({
  product,
  companyIntegrations,
  onRetryShopify,
  onRetryDaraz,
  retryingShopify,
  retryingDaraz,
  failedShopify,
  failedDaraz,
}: {
  product: Product;
  companyIntegrations: CompanyIntegration[];
  onRetryShopify?: (product: Product) => void;
  onRetryDaraz?: (product: Product) => void;
  retryingShopify?: boolean;
  retryingDaraz?: boolean;
  failedShopify?: boolean;
  failedDaraz?: boolean;
}) {
  const targets = getProductPushTargets(product, companyIntegrations);
  const platforms: ChannelSlug[] = [];
  if (product.shopify_synced || targets.includes("shopify") || (product.source || "").toLowerCase() === "shopify") {
    platforms.push("shopify");
  }
  if (product.daraz_synced || targets.includes("daraz") || (product.source || "").toLowerCase() === "daraz") {
    platforms.push("daraz");
  }

  if (platforms.length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {platforms.map((slug) => {
        let state = channelSyncState(product, slug, targets) || "pending";
        if (state !== "synced") {
          if (slug === "shopify" && failedShopify) state = "failed";
          if (slug === "daraz" && failedDaraz) state = "failed";
        }
        return (
          <PlatformLogoChip
            key={slug}
            slug={slug}
            state={state}
            retrying={slug === "shopify" ? retryingShopify : retryingDaraz}
            onRetry={
              state === "synced"
                ? undefined
                : slug === "shopify"
                  ? onRetryShopify
                    ? () => onRetryShopify(product)
                    : undefined
                  : onRetryDaraz
                    ? () => onRetryDaraz(product)
                    : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function OrderChannelCell({ order }: { order: Order }) {
  return <ChannelCell channel={order.source} />;
}

export function OrderSyncStatus({ order }: { order: Order }) {
  const ch = getOrderChannel(order);
  if (!ch && !order.company_id) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return <SyncStatusBadge synced={isOrderSynced(order)} />;
}
