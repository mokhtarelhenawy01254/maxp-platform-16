import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Search,
  Check,
  X,
  ChevronDown,
  MapPin,
  Loader2,
} from "lucide-react";

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
  publicMode?: boolean;
  companyId?: string | null;
}

const GovernorateAreaSearch: React.FC<GovernorateAreaSearchProps> = ({
  value,
  onChange,
  placeholder = "ابحث عن المنطقة...",
  searchPlaceholder = "اكتب اسم المنطقة أو المحافظة...",
  emptyText = "لا توجد نتائج مطابقة",
  loadingText = "جاري البحث...",
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

  const grouped = useMemo(() => {
    const groups = new Map<string, AreaSearchResult[]>();
    for (const r of results) {
      const key = r.governorate || "غير محدد";
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
        if ((error as { code?: string })?.code !== "ERR_CANCELED") {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [companyId, publicMode],
  );

  useEffect(() => {
    if (autoSearchText && autoSearchText.trim().length >= 2 && !value?.area) {
      setQuery(autoSearchText);
      void runSearch(autoSearchText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="w-full flex items-center justify-between px-3 py-2 text-right border rounded-lg bg-primary/10 border-primary/25 text-foreground shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="truncate text-xs font-medium">
              <span className="font-semibold text-primary">{selectedGov}</span>
              <span className="mx-1 text-muted-foreground">←</span>
              <span>{selectedArea}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange({ governorate: "", area: "" });
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-primary/20 transition-colors"
            aria-label="إلغاء التحديد"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`w-full flex items-center justify-between px-3 py-2 text-right border rounded-lg transition-colors text-xs ${
            disabled
              ? "bg-muted/50 cursor-not-allowed text-muted-foreground border-border/50"
              : "bg-card border-border/70 hover:border-border text-foreground shadow-xs"
          } ${open ? "ring-1 ring-primary/40 border-primary" : ""}`}
        >
          <span className={`truncate ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {placeholder}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 mr-2" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border/70 rounded-xl shadow-xl overflow-hidden divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative p-2 bg-muted/20">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-8 pl-7 py-1 text-xs bg-background border border-border/60 rounded-md outline-none text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="مسح البحث"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border/20">
            {loading ? (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>{loadingText}</span>
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center">
                {emptyText}
              </div>
            ) : (
              grouped.map(([governorate, items]) => (
                <div key={governorate}>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/30 border-b border-border/40 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>{governorate}</span>
                  </div>
                  {items.map((result) => {
                    const isSelected = selectedArea === result.area && selectedGov === result.governorate;
                    return (
                      <button
                        key={`${result.governorateId}-${result.areaId}`}
                        type="button"
                        onClick={() => handleSelect(result)}
                        className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isSelected && <Check className="size-3 text-primary shrink-0" />}
                          <span className="truncate">{result.area}</span>
                        </div>
                        {result.confidence < 0.7 && (
                          <span className="text-[10px] text-amber-500 font-medium shrink-0">
                            تأكيد
                          </span>
                        )}
                      </button>
                    );
                  })}
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
