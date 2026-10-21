import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Package,
  Plus,
  Minus,
  Check,
  Loader2,
  X,
  Store,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "../../../utils/currency";
import {
  ProcurementCatalogItem,
  ProductCatalogGroup,
  SelectedProcurementItem,
} from "./types";
import {
  fetchProcurementCatalog,
  groupCatalogItems,
} from "./procurementCatalogService";

interface ProcurementCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSelectItems: (items: SelectedProcurementItem[]) => void;
  initialItems?: ProcurementCatalogItem[];
}

export const ProcurementCatalogModal: React.FC<ProcurementCatalogModalProps> = ({
  open,
  onClose,
  onSelectItems,
  initialItems = [],
}) => {
  const [items, setItems] = useState<ProcurementCatalogItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMap, setSelectedMap] = useState<
    Record<string, { item: ProcurementCatalogItem; quantity: number }>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      loadCatalog(search);
    } else {
      setSelectedMap({});
      setSearch("");
    }
  }, [open]);

  const loadCatalog = async (query: string) => {
    try {
      setLoading(true);
      const data = await fetchProcurementCatalog(query);
      setItems(data);
      // Expand all products with variants by default
      const grouped = groupCatalogItems(data);
      setExpandedIds(new Set(grouped.map((g) => g.productId)));
    } catch (err) {
      console.error("Error loading procurement catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadCatalog(val);
    }, 300);
  };

  const productGroups = useMemo(() => {
    return groupCatalogItems(items);
  }, [items]);

  const toggleItemSelection = (item: ProcurementCatalogItem) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { item, quantity: 1 };
      }
      return next;
    });
  };

  const toggleSelectAllGroup = (group: ProductCatalogGroup) => {
    const allSelected = group.variants.every((v) => Boolean(selectedMap[v.id]));
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allSelected) {
        // Deselect all
        group.variants.forEach((v) => {
          delete next[v.id];
        });
      } else {
        // Select all
        group.variants.forEach((v) => {
          if (!next[v.id]) {
            next[v.id] = { item: v, quantity: 1 };
          }
        });
      }
      return next;
    });
  };

  const toggleExpand = (productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedMap((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = Math.max(1, current.quantity + delta);
      return {
        ...prev,
        [itemId]: { ...current, quantity: newQty },
      };
    });
  };

  const handleConfirm = () => {
    const list: SelectedProcurementItem[] = Object.values(selectedMap).map(
      ({ item, quantity }) => {
        const displayName = item.variantName
          ? `${item.parentName || item.name} - ${item.variantName}`
          : item.name;
        return {
          productId: item.productId,
          variantId: item.variantId || null,
          productName: displayName,
          unitPrice: item.cost || 0,
          quantity,
          sku: item.sku || undefined,
          description: item.category || (item.sku ? `SKU: ${item.sku}` : undefined),
        };
      },
    );

    onSelectItems(list);
    onClose();
  };

  const selectedCount = useMemo(() => Object.keys(selectedMap).length, [selectedMap]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl border-border/80 bg-background/95 backdrop-blur-md">
        {/* Header with Search */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/60 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Store className="size-5 text-primary" />
              استعراض منتجات المتجر والمخزون
            </DialogTitle>
            <div className="text-xs text-muted-foreground font-medium hidden sm:block">
              {productGroups.length} منتج • {items.length} صنف متاح
            </div>
          </div>

          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ابحث بالاسم، رمز SKU، أو التصنيف..."
              className="ps-9 pe-9 h-10 rounded-xl bg-muted/40 border-border/60 text-sm"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Hierarchical List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-[280px] max-h-[52vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">جاري جلب المنتجات والمتغيرات...</p>
            </div>
          ) : productGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-center text-muted-foreground">
              <Package className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">لم يتم العثور على منتجات مطابقة</p>
              <p className="text-xs">جرب البحث بكلمة أخرى أو أضف الصنف يدوياً</p>
            </div>
          ) : (
            productGroups.map((group) => {
              const isExpanded = expandedIds.has(group.productId);
              const groupSelectedCount = group.variants.filter((v) =>
                Boolean(selectedMap[v.id]),
              ).length;
              const isAllGroupSelected =
                group.variants.length > 0 &&
                groupSelectedCount === group.variants.length;

              return (
                <div
                  key={group.productId}
                  className="rounded-2xl border border-border/70 bg-card/70 overflow-hidden shadow-xs transition-all"
                >
                  {/* Parent Product Header */}
                  <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="size-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/60">
                        {group.imageUrl ? (
                          <img
                            src={group.imageUrl}
                            alt={group.name}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="size-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Parent Product Name & Meta */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {group.name}
                          </span>
                          {group.hasVariants ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              <Layers className="size-3" />
                              {group.variants.length} متغيرات
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              صنف مباشر
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {group.sku && <span className="font-mono">SKU: {group.sku}</span>}
                          <span className="font-mono">
                            إجمالي المخزون:{" "}
                            <strong className="text-foreground">{group.totalStock}</strong>
                          </span>
                          {group.minCost > 0 && (
                            <span>
                              • التكلفة:{" "}
                              <strong className="text-foreground font-mono">
                                {formatCurrency(group.minCost)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Parent Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {group.hasVariants ? (
                        <>
                          <Button
                            type="button"
                            variant={isAllGroupSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleSelectAllGroup(group)}
                            className="text-xs h-8 px-2.5 rounded-lg"
                          >
                            <CheckSquare className="size-3.5 me-1" />
                            {isAllGroupSelected
                              ? "إلغاء الكل"
                              : groupSelectedCount > 0
                                ? `محدد (${groupSelectedCount}/${group.variants.length})`
                                : "تحديد الكل"}
                          </Button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(group.productId)}
                            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Toggle variants"
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        // Standalone product without variants
                        (() => {
                          const singleItem = group.variants[0];
                          if (!singleItem) return null;
                          const isSelected = Boolean(selectedMap[singleItem.id]);
                          const qty = selectedMap[singleItem.id]?.quantity || 1;

                          return (
                            <div className="flex items-center gap-3">
                              {isSelected && (
                                <div
                                  className="flex items-center gap-1 bg-background border border-border/80 rounded-lg p-0.5 shadow-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(singleItem.id, -1)}
                                    className="size-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="w-6 text-center font-mono font-bold text-xs">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(singleItem.id, 1)}
                                    className="size-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleItemSelection(singleItem)}
                                className="text-xs h-8 px-3 rounded-lg"
                              >
                                {isSelected ? "محدد" : "إضافة"}
                              </Button>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Nested Variants Sub-list */}
                  {group.hasVariants && isExpanded && (
                    <div className="p-2 sm:p-3 space-y-1.5 border-t border-border/50 bg-background/50">
                      {group.variants.map((v) => {
                        const isSelected = Boolean(selectedMap[v.id]);
                        const qty = selectedMap[v.id]?.quantity || 1;

                        return (
                          <div
                            key={v.id}
                            onClick={() => toggleItemSelection(v)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 sm:gap-3 ${
                              isSelected
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-card/40 border-border/40 hover:border-border hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Checkbox */}
                              <div
                                className={`size-4.5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-background"
                                }`}
                              >
                                {isSelected && <Check className="size-3 stroke-[3]" />}
                              </div>

                              {/* Variant Name Badge */}
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-xs text-foreground">
                                    {v.variantName || v.name}
                                  </span>
                                  {v.sku && (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {v.sku}
                                    </span>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                                      v.stock > 0
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-red-500/10 text-red-500"
                                    }`}
                                  >
                                    المخزون: {v.stock}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Pricing & Stepper */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-xs font-bold font-mono text-foreground">
                                {formatCurrency(v.cost)}
                              </span>

                              {isSelected && (
                                <div
                                  className="flex items-center gap-1 bg-background border border-border/80 rounded-lg p-0.5 shadow-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(v.id, -1)}
                                    className="size-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                                  >
                                    <Minus className="size-2.5" />
                                  </button>
                                  <span className="w-5 text-center font-mono font-bold text-xs">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(v.id, 1)}
                                    className="size-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                                  >
                                    <Plus className="size-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground font-medium">
            تم تحديد <strong className="text-foreground font-bold">{selectedCount}</strong> صنف/متغير
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="text-xs rounded-xl gap-1.5"
            >
              <Check className="size-3.5" />
              إضافة الأصناف المحددة ({selectedCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
