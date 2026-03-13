import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import { tenantApi } from "../api/client";

type LocationState = {
  title?: string;
  sku?: string;
  quantity?: number;
};

export default function InventoryAdjust() {
  const { productId } = useParams<{ productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const [title, setTitle] = useState(state.title ?? "");
  const [sku] = useState(state.sku ?? "");
  const [quantity, setQuantity] = useState(
    state.quantity !== undefined ? String(state.quantity) : ""
  );
  // If we already have quantity from navigation state (even 0), we are not loading
  const [loading, setLoading] = useState(state.quantity === undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;
    // If we already have quantity from state, skip extra fetch
    if (state.quantity !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const inv = await tenantApi.getInventoryByProduct(productId);
        if (!cancelled && inv) {
          setQuantity(String(inv.quantity ?? 0));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load inventory");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, state.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) {
      setError("Enter a valid quantity (0 or more).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await tenantApi.patchInventory(productId, { quantity: qty });
      navigate("/inventory");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = title || "Adjust inventory";

  return (
    <div>
      <PageMeta title="Adjust Inventory | UniSell" description="Adjust available stock for a product." />
      <PageBreadcrumb pageTitle="Adjust inventory" />
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Adjust available stock
            </h2>
            {pageTitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {pageTitle}
                {sku ? ` • SKU ${sku}` : ""}
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-5 max-w-md">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/30">
                <Label>Quantity (available)</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  disabled={loading}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Available = on-hand stock that can be sold. Changes sync to Shopify when the product is linked.
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 pt-6 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

