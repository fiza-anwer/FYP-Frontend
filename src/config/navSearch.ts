export type SearchPage = { name: string; path: string; group: string; keywords?: string };

export const tenantSearchPages: SearchPage[] = [
  { name: "Dashboard", path: "/", group: "Menu", keywords: "home overview analytics" },
  { name: "Orders", path: "/orders", group: "Orders", keywords: "order sales" },
  { name: "Consignments", path: "/consignments", group: "Orders", keywords: "shipping tracking" },
  { name: "Products", path: "/products", group: "Catalog", keywords: "items sku catalog" },
  { name: "Inventory", path: "/inventory", group: "Catalog", keywords: "stock quantity warehouse" },
  { name: "Companies", path: "/companies", group: "Setup", keywords: "store brand" },
  { name: "Company Integrations", path: "/company-integrations", group: "Setup", keywords: "shopify daraz channel" },
  { name: "Carrier Integrations", path: "/carrier-integrations", group: "Setup", keywords: "leopard dhl courier" },
  { name: "Carrier Services", path: "/carrier-integration-services", group: "Setup", keywords: "delivery service" },
  { name: "Help & support", path: "/help-support", group: "Help", keywords: "guide support faq" },
  { name: "Settings", path: "/settings", group: "Settings", keywords: "preferences configuration" },
  { name: "Appearance", path: "/settings/appearance", group: "Settings", keywords: "theme light dark display" },
  { name: "Fonts", path: "/settings/appearance/fonts", group: "Settings", keywords: "font typography text appearance" },
];

export const superadminSearchPages: SearchPage[] = [
  { name: "Dashboard", path: "/", group: "Menu" },
  { name: "Tenant Management", path: "/superadmin/tenants", group: "Admin", keywords: "tenants users approve" },
];

export function filterPages(pages: SearchPage[], query: string): SearchPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages.slice(0, 6);
  return pages.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.group.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      (p.keywords && p.keywords.toLowerCase().includes(q))
  );
}
