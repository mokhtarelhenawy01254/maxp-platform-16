import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Search, Loader2, Building2, Users, Code2, BarChart3, DollarSign, Key, Ticket, Package, ShoppingCart, UserRound, MessageSquare, Facebook, Briefcase, TrendingUp, Tag, FolderTree, Store, Megaphone, UserCheck, FileText, HelpCircle, BookOpen, Target, Zap, ClipboardList, Star, Brain, Layout, Command, ArrowLeft, X } from "lucide-react";
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
  icon: string;
  items: SearchResultItem[];
};

type SearchMeta = {
  total: number;
  time: number;
  query: string;
  page?: number;
  maxResults?: number;
  totalPages?: number;
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
  HelpCircle: <HelpCircle className="size-4" />,
  BookOpen: <BookOpen className="size-4" />,
  Target: <Target className="size-4" />,
  Zap: <Zap className="size-4" />,
  ClipboardList: <ClipboardList className="size-4" />,
  Star: <Star className="size-4" />,
  Brain: <Brain className="size-4" />,
  Layout: <Layout className="size-4" />,
};

const AR = {
  placeholder: "ابحث في جميع أجزاء النظام...",
  searching: "جاري البحث...",
  noResults: "لا توجد نتائج",
  tryAdjusting: "حاول بتغيير كلمة البحث",
  hint: "اكتب أي كلمة أو حرف للبحث في جميع أقسام النظام",
  resultsCount: "نتائج",
  inMs: "مللي ثانية",
  categories: {
    companies: "الشركات", users: "المستخدمين", projects: "مشاريع التطوير",
    tasks: "مهام التطوير", generalTasks: "المهام العامة", subscriptions: "الاشتراكات",
    aiKeys: "مفاتيح الذكاء الاصطناعي", tickets: "تذاكر الدعم", products: "المنتجات",
    orders: "الطلبات", customers: "العملاء", conversations: "المحادثات",
    facebookPages: "صفحات فيسبوك", whatsappSessions: "جلسات واتساب",
    employees: "الموظفين", competitors: "المنافسون", coupons: "الكوبونات",
    categories: "التصنيفات", merchants: "التجار", broadcastCampaigns: "الحملات الإعلانية",
    departments: "الأقسام", positions: "المناصب", invoices: "الفواتير",
    messages: "رسائل المحادثات", faqs: "الأسئلة الشائعة", knowledgeBases: "قاعدة المعرفة",
    storePages: "صفحات المتجر", productReviews: "تقييمات المنتجات", jobPostings: "الوظائف",
    applicants: "المتقدمون", recruitmentForms: "نماذج التوظيف", goals: "الأهداف",
    feedbacks: "الملاحظات", supportMessages: "رسائل الدعم", whatsAppQuickReplies: "الردود السريعة",
    workReportForms: "نماذج تقارير العمل", promotions: "العروض الترويجية",
    facebookComments: "تعليقات فيسبوك", customerNotes: "ملاحظات العملاء",
    competitorReports: "تقارير المنافسين", appExplanations: "شروحات التطبيقات",
    conversationMemories: "ذاكرة المحادثات",
  },
};

const typeLabelMap: Record<string, string> = {
  companies: AR.categories.companies, users: AR.categories.users, projects: AR.categories.projects,
  tasks: AR.categories.tasks, subscriptions: AR.categories.subscriptions, aiKeys: AR.categories.aiKeys,
  tickets: AR.categories.tickets, products: AR.categories.products, orders: AR.categories.orders,
  customers: AR.categories.customers, conversations: AR.categories.conversations,
  facebookPages: AR.categories.facebookPages, whatsappSessions: AR.categories.whatsappSessions,
  employees: AR.categories.employees, competitors: AR.categories.competitors,
  coupons: AR.categories.coupons, categories: AR.categories.categories, merchants: AR.categories.merchants,
  broadcastCampaigns: AR.categories.broadcastCampaigns, departments: AR.categories.departments,
  positions: AR.categories.positions, invoices: AR.categories.invoices,
  generalTasks: AR.categories.generalTasks, messages: AR.categories.messages,
  faqs: AR.categories.faqs, knowledgeBases: AR.categories.knowledgeBases,
  storePages: AR.categories.storePages, productReviews: AR.categories.productReviews,
  jobPostings: AR.categories.jobPostings, applicants: AR.categories.applicants,
  recruitmentForms: AR.categories.recruitmentForms, goals: AR.categories.goals,
  feedbacks: AR.categories.feedbacks, supportMessages: AR.categories.supportMessages,
  whatsAppQuickReplies: AR.categories.whatsAppQuickReplies, workReportForms: AR.categories.workReportForms,
  promotions: AR.categories.promotions, facebookComments: AR.categories.facebookComments,
  customerNotes: AR.categories.customerNotes, competitorReports: AR.categories.competitorReports,
  appExplanations: AR.categories.appExplanations, conversationMemories: AR.categories.conversationMemories,
};

const statusColorMap: Record<string, string> = {
  active: "bg-emerald-500", inactive: "bg-gray-400",
  ACTIVE: "bg-emerald-500", INACTIVE: "bg-gray-400",
  PLANNING: "bg-blue-500", IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500", BACKLOG: "bg-gray-400",
  TODO: "bg-blue-500", DONE: "bg-emerald-500",
  CANCELLED: "bg-red-500", OPEN: "bg-blue-500",
  CLOSED: "bg-emerald-500", PENDING: "bg-amber-500",
  CONNECTED: "bg-emerald-500", DISCONNECTED: "bg-gray-400",
  DRAFT: "bg-gray-400", SENT: "bg-blue-500",
  DELIVERED: "bg-emerald-500", FAILED: "bg-red-500",
};

const getStatusDot = (status?: string) => {
  if (!status) return null;
  const color = statusColorMap[status] || "bg-gray-400";
  return <span className={cn("inline-block size-1.5 rounded-full flex-shrink-0", color)} />;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const escaped = escapeRegex(query.trim());
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return text;
  const qLower = query.trim().toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === qLower
          ? <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-sm px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

const loadingSkeleton = (
  <div className="px-4 py-4 space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="size-8 rounded-lg bg-muted/30" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-3/4 rounded bg-muted/30" />
          <div className="h-2.5 w-1/2 rounded bg-muted/20" />
        </div>
      </div>
    ))}
  </div>
);

const GlobalSearch: React.FC = () => {
  const { actualTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = actualTheme === "dark";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const allItems = useMemo(() => {
    const items: (SearchResultItem & { groupIndex: number })[] = [];
    results.forEach((group, gi) => {
      group.items.forEach((item) => {
        items.push({ ...item, groupIndex: gi });
      });
    });
    return items;
  }, [results]);

  const performSearch = useCallback(async (q: string, pg?: number) => {
    const trimmed = q.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setResults([]);
      setMeta(null);
      setIsOpen(false);
      setHasSearched(false);
      setSelectedIndex(-1);
      setSearchError(null);
      setPage(1);
      setTotalPages(1);
      return;
    }

    setIsLoading(true);
    setSelectedIndex(-1);
    setSearchError(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await apiClient.get("/super-admin/global-search", {
        params: { q: trimmed, page: pg || 1 },
        _skipErrorToast: true,
        signal: controller.signal,
      });
      const data = res.data?.data || [];
      const responseMeta = res.data?.meta;
      setResults(data);
      setMeta(responseMeta || null);
      setPage(responseMeta?.page || 1);
      setTotalPages(responseMeta?.totalPages || 1);
      setIsOpen(true);
      setHasSearched(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[GlobalSearch] API error:", err);
      setResults([]);
      setMeta(null);
      setHasSearched(true);
      setSearchError("تعذر إكمال البحث. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setPage(1);
    setTotalPages(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(val);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && allItems.length > 0) { setIsOpen(true); return; }
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        handleItemClick(allItems[selectedIndex]);
      } else {
        performSearch(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setMeta(null);
    setIsOpen(false);
    setHasSearched(false);
    setSelectedIndex(-1);
    setSearchError(null);
    setPage(1);
    setTotalPages(1);
    inputRef.current?.focus();
  };

  const handleItemClick = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setMeta(null);
    setHasSearched(false);
    setSelectedIndex(-1);
    setSearchError(null);
    setPage(1);
    setTotalPages(1);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        if (query) setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-search-item]");
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const hasResults = results.length > 0;
  const totalResults = meta?.total || 0;

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
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={AR.placeholder}
          dir="auto"
          className={cn(
            "h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            "pr-2 pl-2",
            isDark ? "text-white" : "text-gray-900"
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="flex items-center px-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors order-2"
          >
            <X className="size-3.5" />
          </button>
        )}
        <div className="hidden sm:flex items-center px-2 order-3">
          <kbd className={cn(
            "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
            isDark ? "border-white/10 bg-white/5 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-400"
          )}>
            <Command className="size-2.5" />
            K
          </kbd>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute top-full mt-2 w-full min-w-[320px] sm:min-w-[450px] rounded-xl border shadow-xl z-50 overflow-hidden",
            "animate-in fade-in slide-in-from-top-2 duration-150",
            isDark ? "bg-[#1e293b] border-white/10" : "bg-white border-gray-200"
          )} style={{ right: 0, left: 'auto' }}>
            {isLoading && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-inherit/10">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{AR.searching}</span>
              </div>
            )}

            {!isLoading && searchError && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Search className="size-8 text-red-400/50" />
                <p className="text-sm font-medium text-red-500">{searchError}</p>
              </div>
            )}

            {!isLoading && !searchError && !hasResults && hasSearched && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">{AR.noResults}</p>
                <p className="text-xs text-muted-foreground/60">{AR.tryAdjusting}</p>
              </div>
            )}

            {!isLoading && hasResults && (
              <div ref={listRef} className="max-h-[70vh] overflow-y-auto" role="listbox">
                {results.map((group, gi) => (
                  <div key={group.type}>
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider sticky top-0 z-10",
                      isDark ? "text-gray-400 bg-[#0f172a]/95 backdrop-blur-sm" : "text-gray-500 bg-gray-50/95 backdrop-blur-sm"
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
                    {group.items.map((item, ii) => {
                      const globalIdx = allItems.findIndex(
                        (ai) => ai.id === item.id && ai.groupIndex === gi
                      );
                      const isSelected = selectedIndex === globalIdx;
                      return (
                        <button
                          key={`${group.type}-${item.id}`}
                          data-search-item
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleItemClick(item)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-right transition-colors",
                            isDark
                              ? "hover:bg-blue-500/10 text-gray-300"
                              : "hover:bg-blue-50 text-gray-700",
                            isSelected && (isDark ? "bg-blue-500/15 ring-1 ring-blue-500/20" : "bg-blue-50 ring-1 ring-blue-200")
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
                              <span className="text-sm font-medium truncate">
                                {highlightText(item.title, query)}
                              </span>
                            </div>
                            {item.subtitle && (
                              <span className={cn(
                                "block text-xs truncate mt-0.5",
                                isDark ? "text-gray-500" : "text-gray-400"
                              )}>
                                {highlightText(item.subtitle, query)}
                              </span>
                            )}
                          </div>
                          <ArrowLeft className={cn(
                            "size-3 flex-shrink-0 transition-opacity",
                            isSelected ? "opacity-60" : "opacity-0"
                          )} />
                        </button>
                      );
                    })}
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

            {(hasResults || hasSearched) && !isLoading && (
              <div className={cn(
                "flex items-center justify-between px-4 py-1.5 border-t text-[10px]",
                isDark ? "border-white/5 text-gray-500" : "border-gray-100 text-gray-400"
              )}>
                <span>
                  {totalResults > 0 && `${totalResults} ${AR.resultsCount}`}
                  {meta?.time != null && ` · ${meta.time}${AR.inMs}`}
                  {meta?.cached && ' ·⚡'}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => performSearch(query, page - 1)}
                      disabled={page <= 1}
                      className={cn("px-1.5 py-0.5 rounded text-[10px] transition-colors",
                        page <= 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10",
                      )}
                    >
                      ‹
                    </button>
                    <span className="px-1">{page} / {totalPages}</span>
                    <button
                      onClick={() => performSearch(query, page + 1)}
                      disabled={page >= totalPages}
                      className={cn("px-1.5 py-0.5 rounded text-[10px] transition-colors",
                        page >= totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10",
                      )}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSearch;
