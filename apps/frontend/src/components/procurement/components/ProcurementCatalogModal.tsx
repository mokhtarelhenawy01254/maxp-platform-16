import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Package, Plus, Minus, Check, Loader2, X, Store } from "lucide-react";
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
import { ProcurementCatalogItem, SelectedProcurementItem } from "./types";
import { fetchProcurementCatalog } from "./procurementCatalogService";

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
    const list: SelectedProcurementItem[] = Object.values(selectedMap).map(({ item, quantity }) => {
      const displayName = item.variantName
        ? `${item.name} (${item.variantName})`
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
    });

    onSelectItems(list);
    onClose();
  };

  const selectedCount = useMemo(() => Object.keys(selectedMap).length, [selectedMap]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl border-border/80 bg-background/95 backdrop-blur-md">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/60 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Store className="size-5 text-primary" />
              استعراض منتجات المتجر والمخزون
            </DialogTitle>
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

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-border/40 min-h-[260px] max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">جاري جلب المنتجات والمتغيرات...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-center text-muted-foreground">
              <Package className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">لم يتم العثور على أصناف مطابقة</p>
              <p className="text-xs">جرب البحث بكلمة أخرى أو أضف الصنف يدوياً</p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = Boolean(selectedMap[item.id]);
              const qty = selectedMap[item.id]?.quantity || 1;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItemSelection(item)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/5 border border-primary/20 shadow-sm"
                      : "hover:bg-muted/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`size-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>

                    {/* Thumbnail */}
                    <div className="size-11 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="size-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {item.name}
                        </span>
                        {item.variantName && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {item.variantName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                            item.stock > 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          المخزون: {item.stock}
                        </span>
                        {item.category && <span>• {item.category}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Stepper */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ms-8 sm:ms-0">
                    <div className="text-start sm:text-end">
                      <span className="text-xs text-muted-foreground block">سعر التكلفة:</span>
                      <span className="text-sm font-bold font-mono text-foreground">
                        {formatCurrency(item.cost)}
                      </span>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-1 bg-background border border-border/80 rounded-lg p-0.5 shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="size-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="size-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border/60 flex items-center justify-between gap-3 bg-muted/20">
          <span className="text-xs text-muted-foreground font-medium">
            تم تحديد <strong className="text-foreground font-mono">{selectedCount}</strong> صنف
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="rounded-xl font-semibold gap-1.5"
            >
              <Check className="size-4" />
              إضافة الأصناف المحددة ({selectedCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ProcurementCatalogModal;
