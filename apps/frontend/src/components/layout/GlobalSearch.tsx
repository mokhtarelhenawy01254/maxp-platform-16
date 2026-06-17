import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Search, Loader2, Building2, Users, Code2, BarChart3, DollarSign, Key, Ticket, X, Package, ShoppingCart, UserRound, MessageSquare, Facebook, Briefcase, TrendingUp, Tag, FolderTree, Store, Megaphone, UserCheck, FileText } from "lucide-react";
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
  Package: <Package className="size-4" />,
  ShoppingCart: <ShoppingCart className="size-4" />,
  UserRound: <UserRound className="size-4" />,
  MessageSquare: <MessageSquare className="size-4" />,
  Facebook: <Facebook className="size-4" />,
  Briefcase: <Briefcase className="size-4" />,
  TrendingUp: <TrendingUp className="size-4" />,
  Tag: <Tag className="size-4" />,
  FolderTree: <FolderTree className="size-4" />,
  Store: <Store className="size-4" />,
  Megaphone: <Megaphone className="size-4" />,
  UserCheck: <UserCheck className="size-4" />,
  FileText: <FileText className="size-4" />,
};

const AR = {
  placeholder: "ابحث في النظام بالكامل...",
  searching: "جاري البحث...",
  noResults: "لا توجد نتائج",
  tryAdjusting: "حاول بتغيير كلمة البحث",
  hint: "اكتب أي كلمة أو حرف للبحث في جميع أقسام النظام",
  categories: {
    companies: "الشركات", users: "المستخدمين", projects: "مشاريع التطوير",
    tasks: "مهام التطوير", subscriptions: "الاشتراكات", aiKeys: "مفاتيح الذكاء الاصطناعي",
    tickets: "تذاكر الدعم", products: "المنتجات", orders: "الطلبات",
    customers: "العملاء", conversations: "المحادثات", facebookPages: "صفحات فيسبوك",
    whatsappSessions: "جلسات واتساب", employees: "الموظفين", competitors: "المنافسون",
    coupons: "الكوبونات", categories: "التصنيفات", merchants: "التجار",
    broadcastCampaigns: "الحملات الإعلانية", departments: "الأقسام", positions: "المناصب",
    invoices: "الفواتير",
  },
};
const typeLabelMap: Record<string, string> = {
  companies: AR.categories.companies, users: AR.categories.users, projects: AR.categories.projects,
  tasks: AR.categories.tasks, subscriptions: AR.categories.subscriptions, aiKeys: AR.categories.aiKeys,
  tickets: AR.categories.tickets, products: AR.categories.products, orders: AR.categories.orders,
  customers: AR.categories.customers, conversations: AR.categories.conversations, facebookPages: AR.categories.facebookPages,
  whatsappSessions: AR.categories.whatsappSessions, employees: AR.categories.employees, competitors: AR.categories.competitors,
  coupons: AR.categories.coupons, categories: AR.categories.categories, merchants: AR.categories.merchants,
  broadcastCampaigns: AR.categories.broadcastCampaigns, departments: AR.categories.departments, positions: AR.categories.positions,
  invoices: AR.categories.invoices,
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
  OPEN: "bg-blue-500",
  CLOSED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  CONNECTED: "bg-emerald-500",
  DISCONNECTED: "bg-gray-400",
  DRAFT: "bg-gray-400",
  SENT: "bg-blue-500",
  DELIVERED: "bg-emerald-500",
  FAILED: "bg-red-500",
};

const getStatusDot = (status?: string) => {
  if (!status) return null;
  const color = statusColorMap[status] || "bg-gray-400";
  return <span className={cn("inline-block size-1.5 rounded-full flex-shrink-0", color)} />;
};

const GlobalSearch: React.FC = () => {
  const { actualTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = actualTheme === "dark";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get("/super-admin/global-search", {
        params: { q: trimmed },
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
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4" dir="rtl">
      <div className={cn(
        "relative flex items-center rounded-xl border transition-all duration-200",
        isDark
          ? "bg-[#1e293b] border-white/10 focus-within:border-blue-500/50"
          : "bg-gray-100 border-transparent focus-within:border-blue-400 focus-within:bg-white",
        isOpen && (isDark ? "border-blue-500/50" : "border-blue-400 bg-white shadow-sm")
      )}>
        <div className="flex items-center px-3 order-1">
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
          placeholder={AR.placeholder}
          className={cn(
            "h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            "pr-2 pl-2",
            isDark ? "text-white" : "text-gray-900"
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="flex items-center px-2 text-muted-foreground hover:text-foreground transition-colors order-0"
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
                <span className="text-sm text-muted-foreground">{AR.searching}</span>
              </div>
            )}

            {!isLoading && !hasResults && hasSearched && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">{AR.noResults}</p>
                <p className="text-xs text-muted-foreground/60">{AR.tryAdjusting}</p>
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
                      <span>{typeLabelMap[group.type] || group.type}</span>
                      <span className={cn(
                        "mr-auto text-[10px] px-1.5 py-0.5 rounded-full",
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
                  {AR.hint}
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