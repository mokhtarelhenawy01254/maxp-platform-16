import React, { useState, useEffect, useRef, useMemo } from "react";
import { Package, ChevronsUpDown, Plus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "../../../utils/currency";
import { ProcurementCatalogItem } from "./types";
import { fetchProcurementCatalog } from "./procurementCatalogService";

interface ProcurementItemComboboxProps {
  value: string;
  onSelect: (item: {
    productId: string | null;
    variantId?: string | null;
    productName: string;
    unitPrice?: number;
    sku?: string;
    description?: string;
  }) => void;
  initialCatalog?: ProcurementCatalogItem[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const ProcurementItemCombobox: React.FC<ProcurementItemComboboxProps> = ({
  value,
  onSelect,
  initialCatalog = [],
  placeholder = "اختر صنفاً أو اكتب اسمه...",
  className = "",
  disabled = false,
  onKeyDown,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] = useState<ProcurementCatalogItem[]>(initialCatalog);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialCatalog.length > 0 && catalog.length === 0) {
      setCatalog(initialCatalog);
    }
  }, [initialCatalog]);

  // Click outside to close
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const triggerCatalogLoad = async (query = "") => {
    try {
      setLoading(true);
      const data = await fetchProcurementCatalog(query);
      setCatalog(data);
    } catch (err) {
      console.error("Error loading combobox catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (catalog.length === 0) {
      triggerCatalogLoad(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSelect({
      productId: null,
      variantId: null,
      productName: val,
    });
    setIsOpen(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      triggerCatalogLoad(val);
    }, 250);
  };

  const handleSelectItem = (item: ProcurementCatalogItem) => {
    const displayName = item.variantName
      ? `${item.name} (${item.variantName})`
      : item.name;

    onSelect({
      productId: item.productId,
      variantId: item.variantId || null,
      productName: displayName,
      unitPrice: item.cost,
      sku: item.sku || undefined,
      description: item.category || (item.sku ? `SKU: ${item.sku}` : undefined),
    });
    setIsOpen(false);
  };

  const handleSelectFree = () => {
    if (!value.trim()) return;
    onSelect({
      productId: null,
      variantId: null,
      productName: value.trim(),
    });
    setIsOpen(false);
  };

  // Filter local catalog when already cached
  const filteredCatalog = useMemo(() => {
    if (!value.trim()) return catalog;
    const q = value.toLowerCase().trim();
    return catalog.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.variantName && it.variantName.toLowerCase().includes(q)) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q)),
    );
  }, [catalog, value]);

  const hasExactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return true;
    return catalog.some(
      (it) =>
        it.name.toLowerCase() === q ||
        `${it.name} (${it.variantName || ""})`.toLowerCase() === q,
    );
  }, [catalog, value]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
            if (onKeyDown) onKeyDown(e);
          }}
          className="pe-9 h-10 rounded-lg text-sm bg-background"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!isOpen && catalog.length === 0) triggerCatalogLoad(value);
            setIsOpen((prev) => !prev);
          }}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <ChevronsUpDown className="size-4" />
          )}
        </button>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute top-full start-0 min-w-full sm:min-w-[340px] z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-2xl p-1 text-popover-foreground overscroll-contain animate-in fade-in-0 zoom-in-95">
          {/* Free item option */}
          {value.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={handleSelectFree}
              className="w-full flex items-center gap-2 p-2 text-xs rounded-lg text-primary hover:bg-primary/10 border border-primary/20 bg-primary/5 transition-colors text-start font-medium mb-1"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">
                استخدام كصنف حر: <strong>«{value}»</strong>
              </span>
            </button>
          )}

          {/* Catalog items list */}
          {filteredCatalog.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {loading ? "جاري البحث..." : "لا توجد منتجات مطابقة في الكتالوج"}
            </div>
          ) : (
            filteredCatalog.slice(0, 20).map((catItem) => (
              <button
                key={catItem.id}
                type="button"
                onClick={() => handleSelectItem(catItem)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-muted text-start transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                    {catItem.imageUrl ? (
                      <img
                        src={catItem.imageUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-foreground truncate">
                        {catItem.name}
                      </span>
                      {catItem.variantName && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {catItem.variantName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      {catItem.sku && <span>SKU: {catItem.sku}</span>}
                      <span
                        className={
                          catItem.stock > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }
                      >
                        مخزون: {catItem.stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-end">
                  <span className="font-bold font-mono text-foreground text-xs block">
                    {formatCurrency(catItem.cost)}
                  </span>
                  {catItem.type === "dental_material" && (
                    <span className="text-[9px] text-cyan-600">خامة أسنان</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default ProcurementItemCombobox;
