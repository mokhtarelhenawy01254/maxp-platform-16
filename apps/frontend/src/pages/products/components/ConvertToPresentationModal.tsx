import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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
  "╪¡┘ê┘æ┘ä ┘ç╪░╪º ╪º┘ä┘à┘å╪¬╪¼ (╪º┘ä┘à┘â╪▒╪▒) ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è ╪¬╪º╪¿╪╣ ┘ä┘à┘å╪¬╪¼ ╪ú╪╡┘ä┘è. ╪│┘è╪¬┘à ┘å┘é┘ä ╪º┘ä╪╡┘ê╪▒ ┘ê╪º┘ä╪╣┘å┘ê╪º┘å ┘ê╪º┘ä┘ê╪╡┘ü╪î ┘ê┘à╪┤╪º╪▒┘â╪⌐ ┘å┘ü╪│ ╪º┘ä┘à╪«╪▓┘ê┘å╪î ┘ê╪Ñ╪«┘ü╪º╪í ╪º┘ä╪╡┘ü╪¡╪⌐ ╪º┘ä┘à╪│╪¬┘é┘ä╪⌐ ╪╣┘å ╪º┘ä┘â╪¬╪º┘ä┘ê╪¼.";

const WARNING_TEXT =
  "╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘ç╪░╪º ╪º┘ä┘à┘å╪¬╪¼ ╪│┘è╪¬┘à ╪¬╪¡┘ê┘è┘ä┘ç╪º ┘ä┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è╪î ┘ê┘ä┘å ┘è╪╣┘à┘ä ╪▒╪º╪¿╪╖ ╪º┘ä╪╡┘ü╪¡╪⌐ ╪º┘ä┘é╪»┘è┘à╪⌐.";

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
        setSearchError("┘ü╪┤┘ä ┘ü┘è ╪¬╪¡┘à┘è┘ä ╪º┘ä┘à┘å╪¬╪¼╪º╪¬");
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
        err?.message || "┘ü╪┤┘ä ┘ü┘è ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à┘å╪¬╪¼ ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <ArrowPathIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                ╪¬╪¡┘ê┘è┘ä ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ╪º╪▒╪¿╪╖ ┘ç╪░╪º ╪º┘ä┘à┘å╪¬╪¼ ╪¿┘à┘å╪¬╪¼ ╪ú╪╡┘ä┘è ┘â╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="╪Ñ╪║┘ä╪º┘é"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {EXPLAINER_TEXT}
          </p>

          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
            <PhotoIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {WARNING_TEXT}
            </p>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="╪º╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê ╪º┘ä┘Ç SKU ╪ú┘ê ╪º┘ä┘à╪╣╪▒┘æ┘ü..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
            />
          </div>

          {searchError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {searchError}
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800 max-h-56 overflow-y-auto">
            {searchLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                ╪¼╪º╪▒┘è ╪º┘ä╪¿╪¡╪½...
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {results.map((product) => {
                  const isSelected = selected?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                        {product.mainImage ? (
                          <img
                            src={getImageUrl(product.mainImage) || ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PhotoIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {product.name || `┘à┘å╪¬╪¼ #${product.id}`}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {product.sku
                            ? `SKU: ${product.sku}`
                            : `ID: ${product.id}`}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                        {product.price != null
                          ? `${product.price}${
                              displayCurrency ? ` ${displayCurrency}` : ""
                            }`
                          : ""}
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                ┘ä╪º ╪¬┘ê╪¼╪» ┘à┘å╪¬╪¼╪º╪¬ ┘à╪╖╪º╪¿┘é╪⌐
              </div>
            )}
          </div>

          {selected && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs text-indigo-600 dark:text-indigo-300">
                  ╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä╪ú╪╡┘ä┘è ╪º┘ä┘à╪¡╪»╪»
                </div>
                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {selected.name || `┘à┘å╪¬╪¼ #${selected.id}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
              >
                ╪¬╪║┘è┘è╪▒
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-3 rounded-l-md">
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            ╪Ñ┘ä╪║╪º╪í
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            ╪¬╪ú┘â┘è╪» ╪º┘ä╪¬╪¡┘ê┘è┘ä
          </button>
        </div>
      </div>
    </div>
  );
};
