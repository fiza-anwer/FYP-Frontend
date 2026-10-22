import type { CompanyIntegration, Order, Product } from "../../api/client";

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

/** Inline SVG — no image files / assets folder needed for deploy. */
function ShopifyLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Shopify"
      role="img"
    >
      <path
        fill="#95BF47"
        d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z"
      />
    </svg>
  );
}

/** Real Daraz mark embedded as data URI (no public/assets files needed). */
const DARAZ_LOGO_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADvUlEQVR4nO2bQYhVZRiGn/dy/tMcEZFBZiUiLSzKpFwElYuIAhcuCuY/SNCiiHAxUVYgIw0iIkaigxQU1aKFNHCugtCiRULYSoWcgmYhRIuIVtIihPN3ZrxfCxtxMTXi/c85d5jzbO+57/fxcLj3/t93LnR0dHSsY9R2A2XuDmMkwOmsv3iz6frtC/BuXtLjmP0GHLLBoMjO3xo0Vb/XVKFVkbYhzanXu1R6t7upsqMjYBlpD3AlePd58G6i7nKjJwCQlCC9bnA9ePd28C6tq9ZIClhG0makWWA+eLe39C56jZEWcAfpEYNvBF8H73bEjF4bAgBJIO0DfgrenQzebYqRu2YE3EEaQ3oPWIhxN6w9ActIW4Fjw8asXQGAwTq+AyLRCWi7gbbpBLTdQNt0AtosXuYOoLGz/0q0JqD0bqeMb4VmDL60lkQ0LiB4Nx5y9xEwj/Q88EdWVK8CTxlcbrqfxgQE75Lg3QHgOmhKUnL361lRXcXsGYNXDH5vqq9GBATvnjX4AekTpC3/dV3WXxxkRXUWeNTgA4NQd2+1Cii92x686xt8J2nXvb4vK6q/sqKaBh4zuGA19liLgJC7jaV3xyQWkCal+xs+Z0X1S1ZULwEvGPwct8vbRBVQTia94N1+jAVJ74M2xMjNiuoi8ITBmwZ/xshcJpqA4N1uSZeQ5pC2xcpdJiuqpayoPgYeMvgiVu7QAsr9EHJ3HHHl35F2rWRFdQPskGFVjLxk9UtW4Zbbg3Q4Qi+rEnzSM5RjnJSUGsN/PA4vABrZ4oTb26IzinyXxRBQ61dp8G7C4DjiNVD0WjEE1ELpXSqYMpiRtLmuOiMnIEwmIO0FZpEernt9PVICgnc7DE5J7Gtqcz8CAmys9G6TYMZgStJYk9VHQABzgg1IE208rdG+AGl7m+W7mWDbDbRNJ6DtBtqmE9B2A23TCYiQ0eZmZ+jaMQT8iNU5t/0fpGvDRgwvQPre4MOmV1tmXMOYGTYn2s/vMk+fBGYFT8fKXAkzboAdAX2W9aulYfOinj/KPO0BLwMnBFtjZpvZEuhTwZGxfhVtNF7LAazM043ANPCOYOjjrRkXgYNZv4q+HKn1BFrm6YPAKYwX72s5ZPxq8C7oQtb/O3Z7QENjlzJPnwPOCHbey/VmdhN0Aux01l+sdUHa2AyizNMEOAAcFYyvdI3BAOMrxHRWVI2syBsfwpQ+3YI4CryhuwYyZlwV9pYsufzAubKxflr7z1CZp7swOwiMg85jg7PZuaVWnxfq6OjoWHf8A3ffDB7N2u+uAAAAAElFTkSuQmCC";

function DarazLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={DARAZ_LOGO_SRC}
      alt="Daraz"
      className={`rounded-sm object-contain ${className}`}
      width={32}
      height={32}
      draggable={false}
    />
  );
}

export type PlatformSyncState = "synced" | "pending" | "failed";

/** Only platforms this product is on (synced / source / its own integration_slugs) — not every company channel. */
function productPlatforms(product: Product): ChannelSlug[] {
  const src = (product.source || "").toLowerCase();
  const slugs = product.integration_slugs ?? [];
  const out: ChannelSlug[] = [];
  if (product.shopify_synced || src === "shopify" || slugs.includes("shopify")) {
    out.push("shopify");
  }
  if (product.daraz_synced || src === "daraz" || slugs.includes("daraz")) {
    out.push("daraz");
  }
  return out;
}

function channelSyncState(product: Product, slug: ChannelSlug): PlatformSyncState {
  const synced = slug === "shopify" ? !!product.shopify_synced : !!product.daraz_synced;
  if (synced) return "synced";
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
          className="text-xs font-semibold text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
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
  onRetryShopify,
  onRetryDaraz,
  retryingShopify,
  retryingDaraz,
  failedShopify,
  failedDaraz,
}: {
  product: Product;
  /** Kept for callers; logos use product sync/source only, not all company channels. */
  companyIntegrations?: CompanyIntegration[];
  onRetryShopify?: (product: Product) => void;
  onRetryDaraz?: (product: Product) => void;
  retryingShopify?: boolean;
  retryingDaraz?: boolean;
  failedShopify?: boolean;
  failedDaraz?: boolean;
}) {
  const platforms = productPlatforms(product);

  if (platforms.length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {platforms.map((slug) => {
        let state = channelSyncState(product, slug);
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
