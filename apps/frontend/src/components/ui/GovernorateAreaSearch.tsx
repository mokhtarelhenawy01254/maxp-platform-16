import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export interface AreaSearchResult {
  governorateId: string;
  governorate: string;
  areaId: string;
  area: string;
  confidence: number;
}

interface GovernorateAreaSearchProps {
  value?: { governorate?: string; area?: string } | null;
  onChange: (value: { governorate: string; area: string }) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  disabled?: boolean;
  autoSearchText?: string;
  /** Use the public storefront endpoint (no auth). Requires companyId. */
  publicMode?: boolean;
  /** Company id used when publicMode is true. */
  companyId?: string | null;
}

/**
 * ╪¿╪¡╪½ ╪░┘â┘è ╪╣┘å ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ + ╪º┘ä┘à┘å╪╖┘é╪⌐ ╪╣┘ä┘ë ╪«╪▒┘è╪╖╪⌐ ╪┤╪▒┘â╪⌐ ╪º┘ä╪┤╪¡┘å.
 * ┘è╪¿╪¡╪½ ╪╣╪¿╪▒ /api/v1/turbo/search-area ┘ê┘è╪╣╪▒╪╢ ╪º┘ä┘å╪¬╪º╪ª╪¼ ┘à╪¼┘à┘æ╪╣╪⌐ ╪¡╪│╪¿ ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐
 * (┘à╪½┘ä ╪«╪▒┘è╪╖╪⌐ ╪¬┘ê╪▒╪¿┘ê ╪º┘ä╪»╪º╪«┘ä┘è╪⌐). ╪º╪«╪¬┘è╪º╪▒ ┘å╪¬┘è╪¼╪⌐ ┘è┘à┘ä╪ú ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐ ┘à╪╣╪º┘ï.
 */
const GovernorateAreaSearch: React.FC<GovernorateAreaSearchProps> = ({
  value,
  onChange,
  placeholder = "╪º╪¿╪¡╪½ ╪╣┘å ╪º┘ä┘à┘å╪╖┘é╪⌐...",
  searchPlaceholder = "╪º┘â╪¬╪¿ ╪º╪│┘à ╪º┘ä┘à┘å╪╖┘é╪⌐ ╪ú┘ê ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐...",
  emptyText = "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐",
  loadingText = "╪¼╪º╪▒┘è ╪º┘ä╪¿╪¡╪½...",
  disabled = false,
  autoSearchText = "",
  publicMode = false,
  companyId = null,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Group results by governorate for display.
  const grouped = useMemo(() => {
    const groups = new Map<string, AreaSearchResult[]>();
    for (const r of results) {
      const key = r.governorate || "╪║┘è╪▒ ┘à╪¡╪»╪»";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries());
  }, [results]);

  const runSearch = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        let matches: AreaSearchResult[] = [];
        if (publicMode) {
          const params = new URLSearchParams({ q, limit: "25" });
          if (companyId) params.set("companyId", String(companyId));
          const url = `/api/v1/public/turbo/location/search-area?${params.toString()}`;
          const response = await fetch(url, { signal: controller.signal });
          const payload = await response.json();
          matches =
            ((payload as { data?: { matches?: AreaSearchResult[] } })?.data
              ?.matches as AreaSearchResult[] | undefined) || [];
        } else {
          const { apiClient } = await import("../../services/apiClient");
          const response = await apiClient.get<{
            data?: { matches?: AreaSearchResult[] };
          }>("/turbo/search-area", {
            params: { q, limit: 25 },
            signal: controller.signal,
          });
          matches = response.data?.data?.matches || [];
        }
        setResults(matches);
      } catch (error) {
        // Ignore abort; on real failures keep whatever we had.
        if ((error as { code?: string })?.code !== "ERR_CANCELED") {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [companyId, publicMode],
  );

  // Auto-search: if the caller supplies pre-filled text (e.g. an existing
  // address), run it once on mount so the merchant sees suggested areas.
  useEffect(() => {
    if (autoSearchText && autoSearchText.trim().length >= 2 && !value?.area) {
      setQuery(autoSearchText);
      void runSearch(autoSearchText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search as the merchant types.
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(text), 350);
  };

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: AreaSearchResult) => {
    onChange({
      governorate: result.governorate,
      area: result.area,
    });
    setOpen(false);
    setQuery("");
  };

  const selectedGov = value?.governorate || "";
  const selectedArea = value?.area || "";

  return (
    <div ref={containerRef} className="relative">
      {selectedGov && selectedArea ? (
        <div className="w-full flex items-center justify-between px-3 py-2 text-right border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <MapPinIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate text-sm">
              <span className="font-semibold">{selectedGov}</span>
              <span className="mx-1 text-gray-400 dark:text-gray-500">ΓåÆ</span>
              <span>{selectedArea}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange({ governorate: "", area: "" });
              setOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
            aria-label="╪Ñ┘ä╪║╪º╪í ╪º┘ä╪¬╪¡╪»┘è╪»"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-3 py-2 text-right border rounded-md transition-colors ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100"
          } ${open ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
        >
          <span className={`truncate text-sm ${value ? "" : "text-gray-400 dark:text-gray-500"}`}>
            {placeholder}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div className="relative border-b border-gray-200 dark:border-gray-600">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-9 pl-3 py-2 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                {loadingText}
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-3 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                {emptyText}
              </div>
            ) : (
              grouped.map(([governorate, items]) => (
                <div key={governorate}>
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-600 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm bg-blue-500/70" />
                    {governorate}
                  </div>
                  {items.map((result) => (
                    <button
                      key={`${result.governorateId}-${result.areaId}`}
                      onClick={() => handleSelect(result)}
                      className={`w-full text-right px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        selectedArea === result.area &&
                        selectedGov === result.governorate
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selectedArea === result.area &&
                          selectedGov === result.governorate
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {selectedArea === result.area &&
                          selectedGov === result.governorate && (
                            <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                      </span>
                      <span className="truncate">{result.area}</span>
                      {result.confidence < 0.7 && (
                        <span className="ml-auto text-[10px] text-amber-500 shrink-0">
                          ╪¬╪ú┘â┘è╪»
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { GovernorateAreaSearch };
export type { GovernorateAreaSearchProps };
