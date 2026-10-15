import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  Search,
  Image as ImageIcon,
  X,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { getImageUrl } from "../../../utils/imageUrl";
import type { ConvertPresentationResult } from "../hooks/useProductPresentations";

interface TargetProductOption {
  id: string;
  name: string;
  sku: string;
  price?: number | null;
  mainImage?: string | null;
}

interface ConvertToPresentationModalProps {
  open: boolean;
  currentProductId: string | null | undefined;
  displayCurrency?: string;
  onClose: () => void;
  onConvert: (
    targetProductId: string,
  ) => Promise<ConvertPresentationResult | null>;
  onSuccess: (result: ConvertPresentationResult) => void;
}

const EXPLAINER_TEXT =
  "حوّل هذا المنتج (المكرر) إلى عرض تقديمي تابع لمنتج أصلي. سيتم نقل الصور والعنوان والوصف، ومشاركة نفس المخزون، وإخفاء الصفحة المستقلة عن الكتالوج.";

const WARNING_TEXT =
  "الطلبات القديمة المرتبطة بهذا المنتج سيتم تحويلها للمنتج الأصلي، ولن يعمل رابط الصفحة القديمة.";

const mapToOption = (
  raw: Record<string, unknown>,
  currentProductId: string,
): TargetProductOption | null => {
  const id = String(raw["id"] || "");
  if (!id || id === currentProductId) return null;
  const images = Array.isArray(raw["images"]) ? raw["images"] : [];
  return {
    id,
    name: String(raw["name"] || ""),
    sku: String(raw["sku"] || ""),
    price: raw["price"] != null ? Number(raw["price"]) : null,
    mainImage:
      (raw["mainImage"] as string | undefined) ||
      (images.length > 0 ? String(images[0]) : null) ||
      null,
  };
};

export const ConvertToPresentationModal: React.FC<
  ConvertToPresentationModalProps
> = ({
  open,
  currentProductId,
  displayCurrency,
  onClose,
  onConvert,
  onSuccess,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TargetProductOption[]>([]);
  const [selected, setSelected] = useState<TargetProductOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadResults = useCallback(
    async (query: string) => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await apiClient.get<{
          success?: boolean;
          data?: Array<Record<string, unknown>>;
        }>("/products", {
          params: { search: query.trim() || undefined, limit: 20 },
          _skipTransientRetry: true,
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          const next = res.data.data
            .map((product) => mapToOption(product, currentProductId || ""))
            .filter((item): item is TargetProductOption => item !== null)
            .slice(0, 8);
          setResults(next);
        } else {
          setResults([]);
        }
      } catch {
        setSearchError("فشل في تحميل المنتجات");
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [currentProductId],
  );

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(null);
    setError(null);
    setSearchError(null);
    setResults([]);
    setSearchLoading(true);
    loadResults("");
  }, [open, loadResults]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      loadResults(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, loadResults]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSelect = (product: TargetProductOption) => {
    setSelected(product);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await onConvert(selected.id);
      if (result) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(
        err?.message || "فشل في تحويل المنتج إلى عرض تقديمي",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card border border-border/70 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col text-right animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                تحويل إلى عرض تقديمي
              </h3>
              <p className="text-xs text-muted-foreground">
                اربط هذا المنتج بمنتج أصلي ليعمل كعرض تقديمي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {EXPLAINER_TEXT}
          </p>

          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {WARNING_TEXT}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الـ SKU أو المعرّف..."
              autoComplete="off"
              className="w-full rounded-lg border border-border/70 bg-background pr-9 pl-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground font-medium"
            />
          </div>

          {searchError && (
            <p className="text-xs text-destructive">
              {searchError}
            </p>
          )}

          <div className="rounded-lg border border-border/60 bg-background/50 max-h-56 overflow-y-auto">
            {searchLoading ? (
              <div className="px-4 py-3 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>جاري البحث...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-border/40">
                {results.map((product) => {
                  const isSelected = selected?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-right transition-colors ${
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-md bg-muted border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                        {product.mainImage ? (
                          <img
                            src={getImageUrl(product.mainImage) || ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {product.name || `منتج #${product.id}`}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {product.sku
                            ? `SKU: ${product.sku}`
                            : `ID: ${product.id}`}
                        </div>
                      </div>
                      <div className="text-xs font-mono tabular-nums font-semibold text-foreground shrink-0">
                        {product.price != null
                          ? `${product.price}${
                              displayCurrency ? ` ${displayCurrency}` : ""
                            }`
                          : ""}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                لا توجد منتجات مطابقة للبحث
              </div>
            )}
          </div>

          {selected && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[11px] text-primary font-medium">
                  المنتج الأصلي المختار:
                </div>
                <div className="truncate text-xs font-semibold text-foreground">
                  {selected.name || `منتج #${selected.id}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-destructive hover:underline shrink-0 font-medium"
              >
                تغيير
              </button>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border-r-4 border-destructive p-3 rounded-l-md">
              <p className="text-xs text-destructive font-medium">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-1.5 text-xs font-medium text-foreground border border-border/70 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-xs"
          >
            {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <span>تأكيد التحويل</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToPresentationModal;
