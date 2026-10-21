import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Package, ChevronsUpDown, Plus, Loader2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "../../../utils/currency";
import { ProcurementCatalogItem } from "./types";
import {
  fetchProcurementCatalog,
  groupCatalogItems,
} from "./procurementCatalogService";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
    minWidth: number;
  } | null>(null);

  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const isRtl =
      document.documentElement.dir === "rtl" || document.body.dir === "rtl";
    setDropdownCoords({
      top: r.bottom + 4,
      ...(isRtl
        ? { right: Math.max(8, window.innerWidth - r.right) }
        : { left: Math.max(8, r.left) }),
      minWidth: Math.max(380, r.width),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (initialCatalog.length > 0 && catalog.length === 0) {
      setCatalog(initialCatalog);
    }
  }, [initialCatalog, catalog.length]);

  // Click outside to close (handles portal dropdown safely)
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
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
      ? `${item.parentName || item.name} - ${item.variantName}`
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
        (it.parentName && it.parentName.toLowerCase().includes(q)) ||
        (it.variantName && it.variantName.toLowerCase().includes(q)) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q)),
    );
  }, [catalog, value]);

  // Group filtered catalog items hierarchically by parent product
  const groupedCatalog = useMemo(() => {
    return groupCatalogItems(filteredCatalog);
  }, [filteredCatalog]);

  const hasExactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return true;
    return catalog.some(
      (it) =>
        it.name.toLowerCase() === q ||
        `${it.parentName || it.name} - ${it.variantName || ""}`.toLowerCase() === q ||
        `${it.name} (${it.variantName || ""})`.toLowerCase() === q,
    );
  }, [catalog, value]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-50" : "z-auto"} ${className}`}
    >
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

      {/* Floating Hierarchical Dropdown rendered via React Portal */}
      {isOpen &&
        dropdownCoords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${dropdownCoords.top}px`,
              ...(dropdownCoords.right !== undefined
                ? { right: `${dropdownCoords.right}px` }
                : { left: `${dropdownCoords.left}px` }),
              width: `${dropdownCoords.minWidth}px`,
              maxWidth: "calc(100vw - 24px)",
              zIndex: 9999,
            }}
            className="max-h-72 overflow-y-auto rounded-xl border border-border bg-white dark:bg-card shadow-2xl p-2 text-foreground overscroll-contain animate-in fade-in-0 zoom-in-95 space-y-2"
          >
            {/* Free item option */}
            {value.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={handleSelectFree}
                className="w-full flex items-center gap-2 p-2 text-xs rounded-lg text-primary hover:bg-primary/10 border border-primary/20 bg-primary/5 transition-colors text-start font-medium"
              >
                <Plus className="size-3.5 shrink-0" />
                <span className="truncate">
                  استخدام كصنف حر: <strong>«{value}»</strong>
                </span>
              </button>
            )}

            {/* Grouped Catalog items */}
            {groupedCatalog.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {loading ? "جاري البحث..." : "لا توجد منتجات مطابقة في الكتالوج"}
              </div>
            ) : (
              groupedCatalog.map((group) => (
                <div
                  key={group.productId}
                  className="rounded-lg border border-border/50 bg-card/40 overflow-hidden"
                >
                  {/* Parent Product Header */}
                  <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-5 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                        {group.imageUrl ? (
                          <img
                            src={group.imageUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-bold text-xs text-foreground truncate">
                        {group.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground font-mono">
                      {group.hasVariants ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                          <Layers className="size-2.5" />
                          {group.variants.length} متغيرات
                        </span>
                      ) : (
                        <span>المخزون: {group.totalStock}</span>
                      )}
                    </div>
                  </div>

                  {/* Variants List or Single Item */}
                  <div className="p-1 space-y-0.5">
                    {group.hasVariants ? (
                      group.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectItem(v)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-muted text-start transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                            <span className="font-semibold text-foreground text-xs truncate">
                              {v.variantName || v.name}
                            </span>
                            {v.sku && (
                              <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                                ({v.sku})
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono px-1 rounded ${
                                v.stock > 0
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              مخزون: {v.stock}
                            </span>
                          </div>

                          <span className="font-bold font-mono text-foreground text-xs shrink-0">
                            {formatCurrency(v.cost)}
                          </span>
                        </button>
                      ))
                    ) : (
                      // Standalone product
                      <button
                        type="button"
                        onClick={() => handleSelectItem(group.variants[0])}
                        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-muted text-start transition-colors"
                      >
                        <span className="text-xs text-muted-foreground">اختيار هذا المنتج</span>
                        <span className="font-bold font-mono text-foreground text-xs">
                          {formatCurrency(group.minCost)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
export default ProcurementItemCombobox;
