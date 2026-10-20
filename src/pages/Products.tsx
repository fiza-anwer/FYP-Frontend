import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataGrid, { type DataGridColumn } from "../components/common/DataGrid";
import {
  ProductChannelCell,
  ProductSyncStatus,
  getProductPushTargets,
  productStatusLabel,
} from "../components/common/ChannelSyncStatus";
import { tenantApi, type Product, type ProductVariant, type Company, type CompanyIntegration } from "../api/client";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import Radio from "../components/form/input/Radio";
import Checkbox from "../components/form/input/Checkbox";
import { PlusIcon, TrashBinIcon } from "../icons";

type SortKey = "name_asc" | "name_desc" | "price_asc" | "price_desc" | "newest" | "oldest";

/** One row in the list = one variant (or the product when it has no variants). */
type ProductListRow = {
  product: Product;
  variant: ProductVariant | null;
  variantIndex: number;
};

function getRowId(row: ProductListRow): string {
  return `${row.product.id}-${row.variantIndex}-${row.variant?.id ?? "0"}`;
}

function normalizeImageUrls(images: unknown): string[] {
  const values = Array.isArray(images) ? images : typeof images === "string" ? images.split(/\r?\n/) : [];
  return values
    .map((image) => {
      if (typeof image === "string") return image.trim();
      if (!image || typeof image !== "object") return "";
      const candidate = image as Record<string, unknown>;
      const url = candidate.src ?? candidate.url ?? candidate.originalSrc;
      return typeof url === "string" ? url.trim() : "";
    })
    .filter(Boolean);
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];
const SHIPPING_COUNTRIES = [
  { value: "", label: "Select country/region" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "EU", label: "European Union (general)" },
];

function companyWillSyncToStores(
  companyId: string,
  integrationSlugs: string[],
  companyIntegrations: CompanyIntegration[]
): boolean {
  if (!companyId) return false;
  const active = companyIntegrations.filter(
    (ci) => (ci.company_id || "") === companyId && ci.status === 1
  );
  if (active.length === 0) return false;
  if (integrationSlugs.length === 0) return true;
  return integrationSlugs.some((slug) =>
    active.some((ci) => (ci.integration_slug || "") === slug)
  );
}

function darazTargetsForForm(
  companyId: string,
  integrationSlugs: string[],
  companyIntegrations: CompanyIntegration[]
): boolean {
  if (!companyId) return false;
  const active = companyIntegrations.filter(
    (ci) => (ci.company_id || "") === companyId && ci.status === 1 && ci.integration_slug === "daraz"
  );
  if (active.length === 0) return false;
  if (integrationSlugs.length === 0) return true;
  return integrationSlugs.includes("daraz");
}

function validateDarazImageUrls(images: string[]): string | null {
  const urls = images.map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) return "Add at least one image URL to sync to Daraz.";
  for (const u of urls) {
    if (!/^https:\/\//i.test(u)) return "Image URLs must start with https://";
    if (/\.html?(\?|#|$)/i.test(u)) {
      return "One URL is a web page, not a photo. Right-click the product photo → Copy image address (should end with .jpg or .png).";
    }
    if (/\.(jpe?g|png)(\?|#|$)/i.test(u)) continue;
    if (/slatic\.net|cdn\.shopify\.com|picsum\.photos|i\.imgur\.com/i.test(u)) continue;
    if (/bluestone\.com|\/jewell|\/collections\/|\/products\/[^/]+\/?(\?|$)/i.test(u)) {
      return "Use a direct image link (ends with .jpg or .png), not a jewellery shop page URL.";
    }
    return "Use a direct image link ending in .jpg or .png.";
  }
  return null;
}

function emptyForm() {
  return {
    title: "",
    page_title: "",
    meta_description: "",
    handle: "",
    description: "",
    sku: "",
    product_type: "",
    price: "",
    price_old: "",
    quantity: "",
    coupon: "",
    status: "active" as "active" | "draft" | "archived",
    sizes: [] as string[],
    shipping_country: "",
    images: [] as string[],
    tags: [] as string[],
    vendor: "",
    company_id: "" as string,
    integration_slugs: [] as string[],
    variants: [] as ProductVariant[],
  };
}

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) setSearch(q);
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  /** When set, we're editing only this variant index of the product (from list row). */
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkEditVisible, setBulkEditVisible] = useState(false);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    product_type: "",
    status: "",
    vendor: "",
    price: "",
    price_old: "",
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyIntegrations, setCompanyIntegrations] = useState<CompanyIntegration[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [listingChoiceOpen, setListingChoiceOpen] = useState(false);
  const [aiKeywordsOpen, setAiKeywordsOpen] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiCompanyId, setAiCompanyId] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const params: { company_id?: string; product_type?: string; sort?: string } = {};
      if (companyFilter) params.company_id = companyFilter;
      if (typeFilter.trim()) params.product_type = typeFilter.trim();
      params.sort = sort;
      const res = await tenantApi.getProducts(params);
      setProducts(Array.isArray(res?.products) ? res.products : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [companyFilter, typeFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    tenantApi.getCompanies().then((res) => setCompanies(res.companies || [])).catch(() => setCompanies([]));
  }, []);
  useEffect(() => {
    tenantApi.getCompanyIntegrations().then((res) => setCompanyIntegrations(res.company_integrations || [])).catch(() => setCompanyIntegrations([]));
  }, []);

  useEffect(() => {
    if (formVisible && formContainerRef.current) {
      formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formVisible]);

  const openCreateForm = (prefill?: ReturnType<typeof emptyForm>) => {
    setError("");
    setEditing(null);
    setEditingVariantIndex(null);
    setSyncWarning(null);
    setForm(prefill ?? emptyForm());
    setFormVisible(true);
  };

  const openCreate = () => {
    setListingChoiceOpen(true);
  };

  const startManualListing = () => {
    setListingChoiceOpen(false);
    openCreateForm();
  };

  const startAiListing = () => {
    setListingChoiceOpen(false);
    setAiKeywords("");
    setAiCompanyId(companyFilter || companies[0]?.id || "");
    setAiKeywordsOpen(true);
  };

  useEffect(() => {
    if (!aiKeywordsOpen) return;
    setAiConfigLoading(true);
    tenantApi
      .getAiConfig()
      .then((cfg) => {
        setAiConfigured(cfg.configured);
        setAiModels(cfg.models || []);
        setAiModel(cfg.model || cfg.models?.[0] || "gemini-2.5-flash");
      })
      .catch(() => {
        setAiConfigured(false);
        setAiModels(["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]);
        setAiModel("gemini-2.5-flash");
      })
      .finally(() => setAiConfigLoading(false));
  }, [aiKeywordsOpen]);

  const runAiListing = async () => {
    const keywords = aiKeywords.trim();
    if (!keywords) {
      setError("Enter keywords describing your product.");
      return;
    }
    if (!aiConfigured) {
      setError("Gemini API key is missing. Add GEMINI_API_KEY to backend/.env and restart the server.");
      return;
    }
    setError("");
    setAiGenerating(true);
    try {
      const { listing, model_used } = await tenantApi.generateProductListing(keywords, aiModel || undefined);
      if (model_used && model_used !== aiModel) {
        setAiModel(model_used);
      }
      setAiKeywordsOpen(false);
      openCreateForm({
        ...emptyForm(),
        company_id: aiCompanyId,
        title: listing.title,
        page_title: listing.page_title,
        meta_description: listing.meta_description,
        handle: listing.handle,
        description: listing.description,
        sku: listing.sku,
        product_type: listing.product_type,
        price: listing.price != null ? String(listing.price) : "",
        price_old: listing.price_old != null ? String(listing.price_old) : "",
        vendor: listing.vendor,
        tags: listing.tags ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI listing failed");
    } finally {
      setAiGenerating(false);
    }
  };

  /** Open edit form. When variantIndex is set, only that variant is shown and saved. */
  const openEdit = (p: Product, variantIndex?: number) => {
    setError("");
    setEditing(p);
    setEditingVariantIndex(variantIndex ?? null);
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const singleVariant =
      variantIndex != null && variants[variantIndex] != null ? [variants[variantIndex]] : variants;
    const variantForPrice =
      variantIndex != null && variants[variantIndex] != null
        ? variants[variantIndex]
        : null;
    const displayPrice = variantForPrice?.price ?? p.price;
    const displayPriceOld = p.price_old;
    setForm({
      title: p.title ?? "",
      page_title: p.page_title ?? "",
      meta_description: p.meta_description ?? "",
      handle: p.handle ?? "",
      description: p.description ?? "",
      sku: p.sku ?? "",
      product_type: p.product_type ?? "",
      price: displayPrice != null ? String(displayPrice) : "",
      price_old: displayPriceOld != null ? String(displayPriceOld) : "",
      quantity: p.quantity != null ? String(p.quantity) : "",
      coupon: p.coupon ?? "",
      status: (["active", "draft", "archived"].includes(String(p.status || "")) ? (p.status as "active" | "draft" | "archived") : (p.status === "published" ? "active" : p.status === "scheduled" ? "draft" : p.status === "hidden" ? "archived" : "active")) as "active" | "draft" | "archived",
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      shipping_country: p.shipping_country ?? "",
      images: normalizeImageUrls(p.images),
      tags: Array.isArray(p.tags) ? p.tags : [],
      vendor: p.vendor ?? "",
      company_id: p.company_id ?? "",
      integration_slugs: Array.isArray(p.integration_slugs) ? p.integration_slugs : [],
      variants: singleVariant,
    });
    setFormVisible(true);
    setSelectedRowIds([]);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditing(null);
    setEditingVariantIndex(null);
  };

  useEffect(() => {
    if (!formVisible) return;
    const handleBackspace = (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      event.preventDefault();
      closeForm();
    };

    document.addEventListener("keydown", handleBackspace);
    return () => document.removeEventListener("keydown", handleBackspace);
  }, [formVisible]);

  const toggleSize = (size: string) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { sku: "", option1: "", price: undefined }],
    }));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number | undefined) => {
    setForm((prev) => {
      const next = [...prev.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, variants: next };
    });
  };

  const removeVariant = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const parsePrice = (val: string | number | undefined | null): number | null => {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) return null;
    const n = Number(typeof val === "string" ? val.trim() : val);
    return Number.isNaN(n) ? null : n;
  };

  const parseQuantity = (val: string): number | null => {
    const t = val.trim();
    if (t === "") return null;
    const n = Number(t);
    if (Number.isNaN(n) || n < 0) return null;
    return Math.floor(n);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const title = form.title.trim();
    if (!title) {
      setError("Product title is required.");
      return;
    }
    const willSyncToStores = companyWillSyncToStores(
      form.company_id,
      form.integration_slugs,
      companyIntegrations
    );
    const categoryTrimmed = form.product_type.trim();
    if (willSyncToStores && !categoryTrimmed) {
      setError(
        "Category is required when publishing to connected stores (e.g. Laptops, Jewellery, T-Shirts)."
      );
      return;
    }
    const wantsDaraz = darazTargetsForForm(form.company_id, form.integration_slugs, companyIntegrations);
    if (wantsDaraz) {
      if (!categoryTrimmed) {
        setError("Category is required for Daraz (e.g. Jewellery, T-Shirts).");
        return;
      }
      if (!form.sku.trim()) {
        setError("SKU is required to sync to Daraz.");
        return;
      }
      const imgErr = validateDarazImageUrls(form.images);
      if (imgErr) {
        setError(imgErr);
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const price = parsePrice(form.price);
      const price_old = parsePrice(form.price_old);
      const stockQty = parseQuantity(form.quantity);
      const variants = form.variants.map((v) => ({
        ...v,
        price: parsePrice(v.price as string | number),
        ...(stockQty != null && v.inventory_quantity == null ? { inventory_quantity: stockQty } : {}),
      }));
      if (editing) {
        let variantsToSend: typeof variants | undefined = variants.length ? variants : undefined;
        if (editingVariantIndex != null && editing.variants?.length) {
          const merged = editing.variants.map((v) => ({ ...v }));
          const updated = variants[0];
          if (updated) {
            merged[editingVariantIndex] = { ...merged[editingVariantIndex], ...updated };
            if (price !== null) merged[editingVariantIndex].price = price;
            variantsToSend = merged;
          }
        }
        const updatePayload = {
          title,
          company_id: form.company_id.trim() || null,
          page_title: form.page_title.trim() || undefined,
          meta_description: form.meta_description.trim() || undefined,
          handle: form.handle.trim() || undefined,
          description: form.description.trim() || undefined,
          sku: form.sku.trim() || undefined,
          product_type: form.product_type.trim() || undefined,
          price: price !== null ? price : null,
          price_old: price_old !== null ? price_old : null,
          coupon: form.coupon.trim() || undefined,
          status: form.status,
          sizes: form.sizes.length ? form.sizes : undefined,
          shipping_country: form.shipping_country || undefined,
          images: form.images.length ? form.images : undefined,
          tags: form.tags.length ? form.tags : undefined,
          vendor: form.vendor.trim() || undefined,
          integration_slugs: form.integration_slugs,
          variants: variantsToSend,
        };
        const data = await tenantApi.updateProduct(editing.id, updatePayload) as Product & {
          daraz_sync_warning?: string;
        };
        if (stockQty != null) {
          await tenantApi.patchInventory(editing.id, { quantity: stockQty });
        }
        if (data?.daraz_sync_warning) {
          setSyncWarning(`Daraz sync: ${data.daraz_sync_warning}`);
        } else if (data?.daraz_synced) {
          setSyncWarning("Product synced to Daraz.");
        } else {
          setSyncWarning(null);
        }
        await load();
        closeForm();
        return;
      } else {
        const created = await tenantApi.createProduct({
          title,
          company_id: form.company_id.trim() || undefined,
          page_title: form.page_title.trim() || undefined,
          meta_description: form.meta_description.trim() || undefined,
          handle: form.handle.trim() || undefined,
          description: form.description.trim() || undefined,
          sku: form.sku.trim() || undefined,
          product_type: form.product_type.trim() || undefined,
          price: price !== null ? price : undefined,
          price_old: price_old !== null ? price_old : undefined,
          coupon: form.coupon.trim() || undefined,
          status: form.status,
          sizes: form.sizes.length ? form.sizes : undefined,
          shipping_country: form.shipping_country || undefined,
          images: form.images.length ? form.images : undefined,
          tags: form.tags.length ? form.tags : undefined,
          vendor: form.vendor.trim() || undefined,
          integration_slugs: form.integration_slugs,
          source: "local",
          quantity: stockQty != null ? stockQty : undefined,
          variants: variants.length ? variants : undefined,
        }) as Product & { category_warning?: string; daraz_sync_warning?: string };
        const warn = created?.category_warning || created?.daraz_sync_warning;
        if (warn) {
          setSyncWarning(
            created?.daraz_sync_warning ? `Daraz sync: ${created.daraz_sync_warning}` : warn
          );
        } else if (created?.company_id) {
          setSyncWarning("Product saved.");
        } else {
          setSyncWarning(null);
        }
        setCompanyFilter(created?.company_id ?? "");
      }
      await load();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSyncWarning(null);
    } finally {
      setSaving(false);
    }
  };

  /** One row per variant (or one row per product when no variants). */
  const flattenedRows = useMemo(() => {
    const rows: ProductListRow[] = [];
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

  const filteredAndSorted = useMemo(() => {
    let list = [...flattenedRows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row) => {
        const p = row.product;
        const v = row.variant;
        return (
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.product_type ?? "").toLowerCase().includes(q) ||
          (v?.sku ?? "").toLowerCase().includes(q) ||
          (v?.option1 ?? "").toLowerCase().includes(q) ||
          (v?.title ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter) {
      list = list.filter((row) => {
        const s = row.product.status ?? "active";
        const normalized = s === "published" ? "active" : s === "scheduled" ? "draft" : s === "hidden" ? "archived" : s;
        return normalized === statusFilter;
      });
    }
    if (typeFilter.trim()) {
      const typeLower = typeFilter.trim().toLowerCase();
      list = list.filter((row) => (row.product.product_type ?? "").trim().toLowerCase() === typeLower);
    }
    const rowPrice = (row: ProductListRow) => row.variant?.price ?? row.product.price ?? 0;
    switch (sort) {
      case "name_asc":
        list.sort((a, b) => (a.product.title ?? "").localeCompare(b.product.title ?? ""));
        break;
      case "name_desc":
        list.sort((a, b) => (b.product.title ?? "").localeCompare(a.product.title ?? ""));
        break;
      case "price_asc":
        list.sort((a, b) => rowPrice(a) - rowPrice(b));
        break;
      case "price_desc":
        list.sort((a, b) => rowPrice(b) - rowPrice(a));
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
  }, [flattenedRows, search, statusFilter, typeFilter, sort]);

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

  const selectedRows = useMemo(
    () => flattenedRows.filter((row) => selectedRowIds.includes(getRowId(row))),
    [flattenedRows, selectedRowIds]
  );
  const selectedProducts = useMemo(
    () => Array.from(new Map(selectedRows.map((row) => [row.product.id, row.product])).values()),
    [selectedRows]
  );

  const handlePushToShopify = async (product: Product) => {
    setError("");
    try {
      const data = await tenantApi.pushProductToShopify(product.id) as Product & { category_warning?: string };
      setSyncWarning(data?.category_warning ?? null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push to Shopify failed.");
      setSyncWarning(null);
    }
  };

  const handlePushToDaraz = async (product: Product) => {
    setError("");
    setSyncWarning(null);
    const imageError = validateDarazImageUrls(Array.isArray(product.images) ? product.images : []);
    if (imageError) {
      setError(imageError);
      return;
    }
    try {
      const result = await tenantApi.pushProductToDaraz(product.id);
      setSyncWarning(result?.message || "Product synced to Daraz.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push to Daraz failed.");
    }
  };

  const handleSelectionEdit = () => {
    if (selectedProducts.length !== 1) {
      setBulkEditForm({ product_type: "", status: "", vendor: "", price: "", price_old: "" });
      setBulkEditVisible(true);
      return;
    }
    const row = selectedRows[0];
    openEdit(selectedProducts[0], selectedRows.length === 1 ? row.variantIndex : undefined);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    const names = selectedProducts.slice(0, 3).map((product) => `"${product.title}"`).join(", ");
    const remaining = selectedProducts.length > 3 ? ` and ${selectedProducts.length - 3} more` : "";
    if (!window.confirm(`Delete ${selectedProducts.length} selected product(s): ${names}${remaining}?`)) return;

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

  const handleBulkEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (bulkEditSaving || selectedProducts.length === 0) return;

    const fields = bulkEditForm;
    const price = fields.price.trim() ? Number(fields.price) : undefined;
    const priceOld = fields.price_old.trim() ? Number(fields.price_old) : undefined;
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      setError("Enter a valid non-negative price.");
      return;
    }
    if (priceOld !== undefined && (!Number.isFinite(priceOld) || priceOld < 0)) {
      setError("Enter a valid non-negative original price.");
      return;
    }

    const update: {
      product_type?: string;
      status?: string;
      vendor?: string;
      price?: number;
      price_old?: number;
    } = {};
    if (fields.product_type.trim()) update.product_type = fields.product_type.trim();
    if (fields.status) update.status = fields.status;
    if (fields.vendor.trim()) update.vendor = fields.vendor.trim();
    if (price !== undefined) update.price = price;
    if (priceOld !== undefined) update.price_old = priceOld;
    if (Object.keys(update).length === 0) {
      setError("Choose at least one field to update.");
      return;
    }

    setError("");
    setBulkEditSaving(true);
    try {
      const results = await Promise.allSettled(
        selectedProducts.map((product) => tenantApi.updateProduct(product.id, update))
      );
      const failed = results.filter((result) => result.status === "rejected");
      setSelectedRowIds([]);
      setBulkEditVisible(false);
      await load();
      if (failed.length > 0) {
        const firstFailure = failed[0];
        setError(
          `${failed.length} product(s) could not be updated.${firstFailure.status === "rejected" && firstFailure.reason instanceof Error ? ` ${firstFailure.reason.message}` : ""}`
        );
      }
    } finally {
      setBulkEditSaving(false);
    }
  };

  const columns: DataGridColumn<ProductListRow>[] = [
    { key: "title", label: "Product", render: (_, row) => String(row.product.title || "—") },
    {
      key: "sku",
      label: "SKU",
      render: (_, row) =>
        String((row.variant?.sku ?? row.product.sku ?? "").trim() || "—"),
    },
    { key: "product_type", label: "Category", render: (_, row) => String(row.product.product_type || "—") },
    {
      key: "option",
      label: "Variant (e.g. Size/Color)",
      render: (_, row) => String(row.variant?.option1 ?? row.variant?.title ?? "—"),
    },
    {
      key: "price",
      label: "Price",
      align: "right",
      render: (_, row) => {
        const p = row.variant?.price ?? row.product.price;
        const old = row.product.price_old;
        if (p != null && old != null)
          return (
            <span>
              {Number(p).toFixed(2)}{" "}
              <span className="text-gray-400 line-through text-xs">{Number(old).toFixed(2)}</span>
            </span>
          );
        if (p != null) return Number(p).toFixed(2);
        return "—";
      },
    },
    {
      key: "quantity",
      label: "Quantity",
      align: "right",
      render: (_, row) => {
        const q = row.product.quantity;
        return typeof q === "number" ? q : 0;
      },
    },
    {
      key: "channel",
      label: "Company",
      render: (_, row) => <ProductChannelCell product={row.product} />,
    },
    {
      key: "product_status",
      label: "Product status",
      render: (_, row) => productStatusLabel(row.product.status),
    },
    {
      key: "sync_status",
      label: "Status",
      render: (_, row) => <ProductSyncStatus product={row.product} />,
    },
  ];

  return (
    <div>
      <PageMeta
        title="Products | UniSell"
        description="All products from your connected stores and local catalog."
      />
      <PageBreadcrumb pageTitle="Products" />

      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}
        {syncWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            {syncWarning.includes("Setup → Company Integrations") ? (
              <>
                {syncWarning.split("Setup → Company Integrations")[0]}
                <Link to="/company-integrations" className="font-medium underline hover:no-underline">
                  Setup → Company Integrations
                </Link>
                {syncWarning.split("Setup → Company Integrations")[1] || ""}
              </>
            ) : (
              syncWarning
            )}
            <button
              type="button"
              onClick={() => setSyncWarning(null)}
              className="ml-2 underline focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        )}

        {formVisible ? (
          <div
            ref={formContainerRef}
            className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {editing
                    ? editingVariantIndex != null
                      ? "Edit variant"
                      : "Edit product"
                    : "Add product"}
                </h2>
                {!editing && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Add to your catalog and optionally publish to connected stores (Shopify, Daraz, and others).
                  </p>
                )}
                {editing && editingVariantIndex != null && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Editing this variant only. Other variants of &quot;{editing.title}&quot; are unchanged.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                ← Back to list
              </button>
            </div>

            <form id="product-form" onSubmit={handleSave} className="p-6">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Pricing
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Product price (current)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={form.price}
                          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                          placeholder="e.g. 29.99"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Product price (original / compare at)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={form.price_old}
                          onChange={(e) => setForm((f) => ({ ...f, price_old: e.target.value }))}
                          placeholder="e.g. 39.99"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Quantity in stock</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={form.quantity}
                          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value.replace(/[^\d]/g, "") }))}
                          placeholder="e.g. 100"
                          className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Starting inventory for this product. You can adjust it later from Inventory.
                        </p>
                      </div>
                      <div>
                        <Label>Product coupon / discount code</Label>
                        <Input
                          value={form.coupon}
                          onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value }))}
                          placeholder="e.g. SAVE10"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Visibility
                    </h3>
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                      Active products can be listed on connected stores; draft and archived are hidden from sale.
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <Radio
                        id="vis-active"
                        name="visibility"
                        value="active"
                        checked={form.status === "active"}
                        label="Active"
                        onChange={(v) => setForm((f) => ({ ...f, status: v as "active" }))}
                      />
                      <Radio
                        id="vis-draft"
                        name="visibility"
                        value="draft"
                        checked={form.status === "draft"}
                        label="Draft"
                        onChange={(v) => setForm((f) => ({ ...f, status: v as "draft" }))}
                      />
                      <Radio
                        id="vis-archived"
                        name="visibility"
                        value="archived"
                        checked={form.status === "archived"}
                        label="Archived"
                        onChange={(v) => setForm((f) => ({ ...f, status: v as "archived" }))}
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Size
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {SIZE_OPTIONS.map((size) => (
                        <Checkbox
                          key={size}
                          label={size}
                          checked={form.sizes.includes(size)}
                          onChange={() => toggleSize(size)}
                        />
                      ))}
                    </div>
                  </section>

                  {editingVariantIndex == null && (
                    <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Variants
                      </h3>
                      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                        Optional variants with Option 1 (e.g. size or color), SKU, and price per variant. Use a clear option name instead of &quot;Default Title&quot; on connected stores.
                      </p>
                      <div className="space-y-3">
                        {form.variants.map((v, i) => (
                          <div
                            key={i}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
                          >
                            <Input
                              value={v.sku ?? ""}
                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              placeholder="SKU"
                              className="flex-1 min-w-[80px]"
                            />
                            <Input
                              value={v.option1 ?? v.title ?? ""}
                              onChange={(e) => updateVariant(i, "option1", e.target.value)}
                              placeholder="Option 1 (e.g. Size or Color)"
                              className="flex-1 min-w-[80px]"
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={v.price != null ? String(v.price) : ""}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                if (raw === "") {
                                  updateVariant(i, "price", undefined);
                                  return;
                                }
                                const num = Number(raw);
                                updateVariant(i, "price", Number.isNaN(num) ? undefined : num);
                              }}
                              placeholder="Price"
                              className="w-24"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(i)}
                              className="rounded p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                              aria-label="Remove variant"
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addVariant}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-sky-400 hover:text-sky-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-sky-500 dark:hover:text-sky-400"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add variant
                        </button>
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-6">
                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Basic information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Product title</Label>
                        <Input
                          value={form.title}
                          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Classic Cotton T-Shirt"
                          className="mt-1.5"
                          required
                        />
                      </div>
                      <div>
                        <Label>
                          Category
                          {companyWillSyncToStores(form.company_id, form.integration_slugs, companyIntegrations) && (
                            <span className="ml-1 text-rose-600 dark:text-rose-400">*</span>
                          )}
                        </Label>
                        <Input
                          value={form.product_type}
                          onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value }))}
                          placeholder="e.g. Laptops, Jewellery, Trousers, T-Shirts"
                          className="mt-1.5"
                          list="category-suggestions"
                        />
                        <datalist id="category-suggestions">
                          <option value="Laptops" />
                          <option value="Jewellery" />
                          <option value="Trousers" />
                          <option value="T-Shirts" />
                          <option value="Accessories" />
                          <option value="Electronics" />
                        </datalist>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Maps to marketplace categories on connected stores (e.g. Jewellery, T-Shirts).
                          Required when publishing to any connected store.
                        </p>
                      </div>
                      <div>
                        <Label>URL handle</Label>
                        <Input
                          value={form.handle}
                          onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                          placeholder="e.g. classic-cotton-tshirt"
                          className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Used in product page URL. Leave blank to auto-generate from title.
                        </p>
                      </div>
                      <div>
                        <Label>Page title (SEO meta title)</Label>
                        <Input
                          value={form.page_title}
                          onChange={(e) => setForm((f) => ({ ...f, page_title: e.target.value }))}
                          placeholder="e.g. Buy Classic Cotton T-Shirt Online"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Meta description (SEO)</Label>
                        <TextArea
                          value={form.meta_description}
                          onChange={(value) => setForm((f) => ({ ...f, meta_description: value }))}
                          placeholder="Short description for search engines (max ~160 characters)"
                          rows={2}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>SKU</Label>
                          <Input
                            value={form.sku}
                            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                            placeholder="e.g. TSH-001"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>Brand / vendor</Label>
                          <Input
                            value={form.vendor}
                            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                            placeholder="e.g. My Brand"
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          value={form.tags.join(", ")}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            }))
                          }
                          placeholder="e.g. jewellery, gold, gift"
                          className="mt-1.5"
                        />
                      </div>
                      {!editing && (
                        <>
                          <div>
                            <Label>Company (required to publish on channels)</Label>
                            <select
                              value={form.company_id}
                              onChange={(e) => {
                                const v = e.target.value;
                                setForm((f) => ({ ...f, company_id: v, integration_slugs: [] }));
                              }}
                              className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                            >
                              <option value="">Select company (product will be local only if empty)</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name || c.id}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              If this product already exists for the company (e.g. imported from a store), edit it from the list instead of adding again to avoid duplicates.
                            </p>
                          </div>
                          {form.company_id && (() => {
                            const integrationsForCompany = companyIntegrations.filter(
                              (ci) => (ci.company_id || "") === form.company_id && ci.status === 1
                            );
                            if (integrationsForCompany.length === 0) return null;
                            return (
                              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                                <Label>Show this product on</Label>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  All platforms = every connected store for this company. Or choose specific channels only.
                                </p>
                                <div className="mt-3 space-y-2">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="integration_scope"
                                      checked={form.integration_slugs.length === 0}
                                      onChange={() => setForm((f) => ({ ...f, integration_slugs: [] }))}
                                      className="h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="text-sm">All platforms (all stores for this company)</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="integration_scope"
                                      checked={form.integration_slugs.length > 0}
                                      onChange={() => setForm((f) => ({ ...f, integration_slugs: integrationsForCompany.map((i) => i.integration_slug || "").filter(Boolean) }))}
                                      className="h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="text-sm">Only selected platforms:</span>
                                  </label>
                                  {form.integration_slugs.length > 0 && (
                                    <div className="ml-6 flex flex-wrap gap-3">
                                      {integrationsForCompany.map((ci) => (
                                        <label key={ci.id} className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={form.integration_slugs.includes(ci.integration_slug || "")}
                                            onChange={(e) => {
                                              const slug = ci.integration_slug || "";
                                              if (!slug) return;
                                              setForm((f) =>
                                                e.target.checked
                                                  ? { ...f, integration_slugs: [...f.integration_slugs, slug] }
                                                  : { ...f, integration_slugs: f.integration_slugs.filter((s) => s !== slug) }
                                              );
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                          />
                                          <span className="text-sm">{ci.integration_name || ci.integration_slug || "Unknown"}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                      {editing && form.company_id && (() => {
                        const integrationsForCompany = companyIntegrations.filter(
                          (ci) => (ci.company_id || "") === form.company_id && ci.status === 1
                        );
                        if (integrationsForCompany.length === 0) return null;
                        return (
                          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                            <Label>Show this product on</Label>
                            <div className="mt-3 space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="integration_scope_edit"
                                  checked={form.integration_slugs.length === 0}
                                  onChange={() => setForm((f) => ({ ...f, integration_slugs: [] }))}
                                  className="h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-sm">All platforms</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="integration_scope_edit"
                                  checked={form.integration_slugs.length > 0}
                                  onChange={() => setForm((f) => ({ ...f, integration_slugs: integrationsForCompany.map((i) => i.integration_slug || "").filter(Boolean) }))}
                                  className="h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-sm">Only selected:</span>
                              </label>
                              {form.integration_slugs.length > 0 && (
                                <div className="ml-6 flex flex-wrap gap-3">
                                  {integrationsForCompany.map((ci) => (
                                    <label key={ci.id} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={form.integration_slugs.includes(ci.integration_slug || "")}
                                        onChange={(e) => {
                                          const slug = ci.integration_slug || "";
                                          if (!slug) return;
                                          setForm((f) =>
                                            e.target.checked
                                              ? { ...f, integration_slugs: [...f.integration_slugs, slug] }
                                              : { ...f, integration_slugs: f.integration_slugs.filter((s) => s !== slug) }
                                          );
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                      />
                                      <span className="text-sm">{ci.integration_name || ci.integration_slug || "Unknown"}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <Label>Description</Label>
                    <TextArea
                      value={form.description}
                      onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                      placeholder="Enter product description here."
                      rows={5}
                      className="mt-1.5"
                    />
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <Label>Shipping country / region</Label>
                    <select
                      value={form.shipping_country}
                      onChange={(e) => setForm((f) => ({ ...f, shipping_country: e.target.value }))}
                      className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-sky-500"
                    >
                      {SHIPPING_COUNTRIES.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Product images
                    </h3>
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                      One URL per line. Must be a direct photo link (ends with .jpg or .png), not a
                      shop page. Tip: right‑click the photo → Copy image address.
                    </p>
                    {form.images.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {form.images.map((imageUrl, index) => (
                          <a
                            key={`${imageUrl}-${index}`}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block size-20 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                            aria-label={`Open product image ${index + 1}`}
                          >
                            <img
                              src={imageUrl}
                              alt={`${form.title || "Product"} image ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <TextArea
                      value={form.images.join("\n")}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          images: v
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </section>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[200px] flex-1">
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, option or category…"
                  className="rounded-lg border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  Add product
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
              {selectedRowIds.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {selectedRowIds.length} row(s) selected
                    {selectedProducts.length !== selectedRowIds.length &&
                      ` · ${selectedProducts.length} product(s)`}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSelectionEdit}
                      className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                    >
                      {selectedProducts.length === 1 ? "Edit" : "Bulk edit"}
                    </button>
                    {selectedProducts.length === 1 &&
                      getProductPushTargets(selectedProducts[0], companyIntegrations).includes("shopify") &&
                      !selectedProducts[0].shopify_synced && (
                        <button
                          type="button"
                          onClick={() => void handlePushToShopify(selectedProducts[0])}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Push to Shopify
                        </button>
                      )}
                    {selectedProducts.length === 1 &&
                      getProductPushTargets(selectedProducts[0], companyIntegrations).includes("daraz") &&
                      !selectedProducts[0].daraz_synced && (
                        <button
                          type="button"
                          onClick={() => void handlePushToDaraz(selectedProducts[0])}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Push to Daraz
                        </button>
                      )}
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
                data={filteredAndSorted}
                keyExtractor={getRowId}
                emptyMessage="No products match your filters. Add a product to get started."
                loading={loading}
                selectable
                selectedIds={selectedRowIds}
                onSelectionChange={setSelectedRowIds}
                onRowDoubleClick={(row) => openEdit(row.product, row.variantIndex)}
              />
            </div>
          </>
        )}
      </div>

      {bulkEditVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !bulkEditSaving && setBulkEditVisible(false)}
        >
          <form
            onSubmit={handleBulkEdit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk edit products</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Changes apply to {selectedProducts.length} selected product(s). Leave fields unchanged to keep their current values.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Input
                  value={bulkEditForm.product_type}
                  onChange={(event) => setBulkEditForm((form) => ({ ...form, product_type: event.target.value }))}
                  placeholder="Leave unchanged"
                  className="mt-1.5"
                  disabled={bulkEditSaving}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={bulkEditForm.status}
                  onChange={(event) => setBulkEditForm((form) => ({ ...form, status: event.target.value }))}
                  disabled={bulkEditSaving}
                  className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">Leave unchanged</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label>Vendor</Label>
                <Input
                  value={bulkEditForm.vendor}
                  onChange={(event) => setBulkEditForm((form) => ({ ...form, vendor: event.target.value }))}
                  placeholder="Leave unchanged"
                  className="mt-1.5"
                  disabled={bulkEditSaving}
                />
              </div>
              <div>
                <Label>Product price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={bulkEditForm.price}
                  onChange={(event) => setBulkEditForm((form) => ({ ...form, price: event.target.value }))}
                  placeholder="Leave unchanged"
                  className="mt-1.5"
                  disabled={bulkEditSaving}
                />
              </div>
              <div>
                <Label>Original price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={bulkEditForm.price_old}
                  onChange={(event) => setBulkEditForm((form) => ({ ...form, price_old: event.target.value }))}
                  placeholder="Leave unchanged"
                  className="mt-1.5"
                  disabled={bulkEditSaving}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkEditSaving}
                onClick={() => setBulkEditVisible(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkEditSaving}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500"
              >
                {bulkEditSaving ? "Saving…" : "Apply changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {listingChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setListingChoiceOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add product</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Choose how you want to create this listing.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startManualListing}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Manual listing
              </button>
              <button
                type="button"
                onClick={startAiListing}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-3 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                AI listing
              </button>
            </div>
          </div>
        </div>
      )}

      {aiKeywordsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !aiGenerating && setAiKeywordsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI product listing</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Describe your product in a few words. Gemini will fill title, description, SEO fields, SKU, price, and more.
              If you see a quota error, switch to <strong className="font-medium">gemini-2.5-flash</strong> below.
            </p>
            {aiConfigLoading ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading Gemini models…</p>
            ) : aiConfigured === false ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Gemini API key not detected. Add GEMINI_API_KEY to backend/.env and restart the server.
              </p>
            ) : (
              <p className="mt-3 text-xs text-green-700 dark:text-green-400">
                Gemini connected{aiModel ? ` · model: ${aiModel}` : ""}
              </p>
            )}
            {aiModels.length > 0 && (
              <div className="mt-4">
                <Label>Gemini model</Label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  disabled={aiGenerating || aiConfigLoading}
                  className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {aiModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-4">
              <Label>Company</Label>
              <select
                value={aiCompanyId}
                onChange={(e) => setAiCompanyId(e.target.value)}
                disabled={aiGenerating}
                className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Local only (no store sync)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose which company this product belongs to. Required if you want to publish to connected stores.
              </p>
              {companies.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  No companies yet. Create one under Setup → Companies first.
                </p>
              )}
            </div>
            <div className="mt-4">
              <Label>Keywords</Label>
              <Input
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="e.g. shirt cotton comfort for men"
                className="mt-1.5"
                disabled={aiGenerating}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={aiGenerating}
                onClick={() => setAiKeywordsOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiGenerating || !aiKeywords.trim() || aiConfigured === false}
                onClick={() => void runAiListing()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-500"
              >
                {aiGenerating ? "Generating…" : "Generate listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
