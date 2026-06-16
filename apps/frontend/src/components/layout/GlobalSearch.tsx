import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Building2, Users, Code2, BarChart3, DollarSign, Key, Ticket, X } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { apiClient } from "../../services/apiClient";
import { cn } from "@/lib/utils";

type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  status?: string;
  link: string;
  color?: string | null;
};

type SearchResultGroup = {
  type: string;
  label: string;
  labelEn: string;
  icon: string;
  items: SearchResultItem[];
};

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="size-4" />,
  Users: <Users className="size-4" />,
  Code2: <Code2 className="size-4" />,
  BarChart3: <BarChart3 className="size-4" />,
  DollarSign: <DollarSign className="size-4" />,
  Key: <Key className="size-4" />,
  Ticket: <Ticket className="size-4" />,
};

const typeLabelKeyMap: Record<string, string> = {
  companies: "superAdmin.companies",
  users: "superAdmin.users",
  projects: "superAdmin.sidebar.devProjects",
  tasks: "superAdmin.sidebar.tasks",
  subscriptions: "superAdmin.subscriptions",
  aiKeys: "superAdmin.evaluation.aiProviders",
  tickets: "superAdmin.sidebar.allTickets",
};

const statusColorMap: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-gray-400",
  ACTIVE: "bg-emerald-500",
  INACTIVE: "bg-gray-400",
  PLANNING: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  BACKLOG: "bg-gray-400",
  TODO: "bg-blue-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

const getStatusDot = (status?: string) => {
  if (!status) return null;
  const color = statusColorMap[status] || "bg-gray-400";
  return <span className={cn("inline-block size-1.5 rounded-full flex-shrink-0", color)} />;
};

const GlobalSearch: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const isRtl = i18n.language === "ar";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get("/super-admin/global-search", {
        params: { q: q.trim() },
        _skipErrorToast: true,
      });
      const data = res.data?.data || [];
      setResults(data);
      setIsOpen(true);
      setHasSearched(true);
    } catch {
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 300);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleItemClick = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    navigate(item.link);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasResults = results.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4">
      <div className={cn(
        "relative flex items-center rounded-xl border transition-all duration-200",
        isDark
          ? "bg-[#1e293b] border-white/10 focus-within:border-blue-500/50"
          : "bg-gray-100 border-transparent focus-within:border-blue-400 focus-within:bg-white",
        isOpen && (isDark ? "border-blue-500/50" : "border-blue-400 bg-white shadow-sm")
      )}>
        <div className={cn("flex items-center px-3", isRtl ? "order-1" : "")}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-4 text-muted-foreground" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={t("superAdmin.globalSearchPlaceholder") || "Search everything..."}
          className={cn(
            "h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            isRtl ? "pr-2 pl-2" : "pl-2 pr-2",
            isDark ? "text-white" : "text-gray-900"
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className={cn("flex items-center px-2 text-muted-foreground hover:text-foreground transition-colors", isRtl ? "order-0" : "")}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute top-full mt-2 w-full min-w-[320px] sm:min-w-[400px] rounded-xl border shadow-xl z-50 overflow-hidden",
            isDark ? "bg-[#1e293b] border-white/10" : "bg-white border-gray-200"
          )}>
            {isLoading && (
              <div className="flex items-center gap-3 px-4 py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("common.searching") || "Searching..."}</span>
              </div>
            )}

            {!isLoading && !hasResults && hasSearched && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">{t("common.noResults") || "No results found"}</p>
                <p className="text-xs text-muted-foreground/60">{t("common.tryAdjustingSearch") || "Try adjusting your search term"}</p>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="max-h-[70vh] overflow-y-auto">
                {results.map((group) => (
                  <div key={group.type}>
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider",
                      isDark ? "text-gray-400 bg-[#0f172a]/50" : "text-gray-500 bg-gray-50"
                    )}>
                      {iconMap[group.icon] || <Search className="size-3.5" />}
                      <span>{typeLabelKeyMap[group.type] ? t(typeLabelKeyMap[group.type]) : group.type}</span>
                      <span className={cn(
                        "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
                        isDark ? "bg-white/5 text-gray-400" : "bg-gray-200 text-gray-500"
                      )}>
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <button
                        key={`${group.type}-${item.id}`}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-right transition-colors",
                          isDark
                            ? "hover:bg-blue-500/10 text-gray-300"
                            : "hover:bg-blue-50 text-gray-700"
                        )}
                      >
                        {item.image ? (
                          <img src={item.image} alt="" className="size-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className={cn(
                            "flex size-8 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold",
                            isDark ? "bg-[#0f172a] text-gray-400" : "bg-gray-100 text-gray-500"
                          )}>
                            {item.title?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-center gap-2">
                            {getStatusDot(item.status)}
                            <span className="text-sm font-medium truncate">{item.title}</span>
                          </div>
                          {item.subtitle && (
                            <span className={cn(
                              "block text-xs truncate mt-0.5",
                              isDark ? "text-gray-500" : "text-gray-400"
                            )}>
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !hasSearched && !query && (
              <div className="px-4 py-6 text-center">
                <Search className="mx-auto size-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground/50">
                  {t("superAdmin.globalSearchHint") || "Type at least 2 characters to search"}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSearch;
