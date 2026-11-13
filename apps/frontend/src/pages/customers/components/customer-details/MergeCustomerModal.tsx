import React, { useState, useEffect, useRef } from "react";
import { Search, GitMerge, Loader2, X, AlertTriangle } from "lucide-react";
import { customerService, type Customer } from "@/services/customerService";

interface MergeCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
  onMerged: () => void;
}

const fullName = (c: { firstName?: string; lastName?: string }) =>
  `${c.firstName || ""} ${c.lastName || ""}`.trim() || "عميل غير مسمى";

export const MergeCustomerModal: React.FC<MergeCustomerModalProps> = ({
  isOpen,
  onClose,
  targetCustomer,
  onMerged,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Customer | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await customerService.getCustomers({
          search: value.trim(),
          limit: 8,
        });
        setResults(
          (response.data || []).filter((c) => c.id !== targetCustomer.id),
        );
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "فشل البحث");
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleMerge = async () => {
    if (!selectedSource) return;
    setIsMerging(true);
    setError("");
    try {
      await customerService.mergeCustomers(targetCustomer.id, selectedSource.id);
      onMerged();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "فشل دمج العملاء",
      );
    } finally {
      setIsMerging(false);
    }
  };

  const targetName = fullName(targetCustomer);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                دمج مكرر
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                الهدف: {targetName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ابحث عن العميل المكرر (اسم أو هاتف)..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          {isSearching && (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400" />
          )}
        </div>

        {/* Results / confirm state */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {selectedSource ? (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-3">
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  سيتم نقل كل الأوردرات والمحادثات من{" "}
                  <span className="font-bold">{fullName(selectedSource)}</span>{" "}
                  إلى <span className="font-bold">{targetName}</span> وحذف{" "}
                  <span className="font-bold">{fullName(selectedSource)}</span>{" "}
                  نهائيًا
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSource(null)}
                  disabled={isMerging}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-[0.97]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={isMerging}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري الدمج...</span>
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-3.5 w-3.5" />
                      <span>تأكيد</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {searchQuery.trim().length >= 2 &&
                !isSearching &&
                results.length === 0 && (
                  <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 py-4">
                    لا نتائج مطابقة
                  </p>
                )}
              {results.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {fullName(c)}
                    </div>
                    {c.phone && (
                      <div
                        dir="ltr"
                        className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums text-right"
                      >
                        {c.phone}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSource(c)}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-all active:scale-[0.97]"
                  >
                    دمج
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <p className="mt-3 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default MergeCustomerModal;
