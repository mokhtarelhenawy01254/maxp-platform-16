import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import i18n from "../../../../i18n";
import { tToast } from "../../../../utils/i18n-toast";
import tokenManager from "../../../../utils/tokenManager";
import { WooCommerceProduct } from "./types";

export function useWooCommerceImportController() {
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(async () => {
    if (!storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      tToast.error("WooCommerceImport.msg_9c80");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/woocommerce/fetch-products", {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          storeUrl: storeUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const fetchedProducts: WooCommerceProduct[] = data.data?.products ?? [];
        setProducts(fetchedProducts);
        toast.success(data.message || `تم جلب ${fetchedProducts.length} منتج`);
        setSelectedProducts(new Set(fetchedProducts.map((_, i) => i)));
      } else {
        toast.error(data.message || i18n.t("WooCommerceImport.failed_fetch_579a"));
      }
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      tToast.error("WooCommerceImport.msg_d18b");
    } finally {
      setLoading(false);
    }
  }, [storeUrl, consumerKey, consumerSecret]);

  const clearData = useCallback(() => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm("");
  }, []);

  const importProducts = useCallback(async () => {
    if (selectedProducts.size === 0) {
      tToast.error("WooCommerceImport.msg_7f37");
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map((i) => products[i]);
      const response = await fetch("/api/v1/woocommerce/import-selected", {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ products: selectedProductsList }),
      });

      const data = await response.json();
      if (data.success) {
        const { imported, failed, skipped } = data.data || {};
        let message = `تم استيراد ${imported || 0} منتج بنجاح`;
        if (skipped > 0) message += ` | تم تخطي ${skipped} منتج موجود`;
        if (failed > 0) message += ` | فشل ${failed} منتج`;
        toast.success(message);
        clearData();
      } else {
        toast.error(data.message || i18n.t("WooCommerceImport.msg_b68b"));
      }
    } catch (error: unknown) {
      console.error("Error importing products:", error);
      tToast.error("WooCommerceImport.msg_c438");
    } finally {
      setImporting(false);
    }
  }, [selectedProducts, products, clearData]);

  const toggleProduct = useCallback((index: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const toggleAll = useCallback(() => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => products.indexOf(p))));
    }
  }, [selectedProducts.size, filteredProducts, products]);

  return {
    storeUrl,
    setStoreUrl,
    consumerKey,
    setConsumerKey,
    consumerSecret,
    setConsumerSecret,
    products,
    selectedProducts,
    loading,
    importing,
    searchTerm,
    setSearchTerm,
    filteredProducts,
    fetchProducts,
    clearData,
    importProducts,
    toggleProduct,
    toggleAll,
  };
}
