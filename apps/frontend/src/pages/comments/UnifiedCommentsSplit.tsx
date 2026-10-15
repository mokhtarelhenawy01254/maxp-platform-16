import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CommentService from "../../services/commentService";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Settings,
  Layout,
  Grid3x3,
  List,
  ChevronRight,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

interface FacebookPage {
  pageId: string;
  pageName: string;
  totalPosts: number;
  totalComments: number;
}

interface FacebookPost {
  postId: string;
  message?: string;
  pictureUrl?: string;
  firstCommentTime: string;
  totalComments: number;
  pendingComments: number;
  responseRate: number;
  responseMethod?: string;
}

const UnifiedCommentsSplit: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateFt = useMemo(() => new Intl.DateTimeFormat(i18n.language || "ar-EG"), [i18n.language]);

  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
  });

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchPosts(selectedPage);
    } else {
      setPosts([]);
    }
  }, [selectedPage]);

  const fetchPages = async () => {
    setLoadingPages(true);
    try {
      const response = await CommentService.getFacebookPages();
      if (response?.success && response.data) {
        setPages(response.data);
        if (response.data.length > 0 && !selectedPage) {
          setSelectedPage(response.data[0].pageId);
        }
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchPosts = async (pageId: string) => {
    setLoading(true);
    try {
      const response = await CommentService.getPostsByPageId(pageId);
      if (response?.success && response.data) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getResponseMethodLabel = (method?: string) => {
    switch (method) {
      case "ai":
        return t("unifiedComments.autoResponse", "رد تلقائي ذكي");
      case "fixed":
        return t("unifiedComments.fixedResponse", "رد مسبق الإعداد");
      case "manual":
        return t("unifiedComments.manualResponse", "رد يدوي");
      default:
        return t("unifiedComments.notSpecified", "غير محدد");
    }
  };

  const getResponseMethodBadge = (method?: string) => {
    switch (method) {
      case "ai":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "fixed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "manual":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        filters.search === "" ||
        String(post.postId || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        (post.message && post.message.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "responded" && post.pendingComments === 0) ||
        (filters.status === "pending" && post.pendingComments > 0);
      return matchesSearch && matchesStatus;
    });
  }, [posts, filters.search, filters.status]);

  return (
    <div className="h-[calc(100dvh-64px)] overflow-hidden bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-border/70 bg-card px-4 py-3 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Layout className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              إدارة المنشورات الموحدة
            </h1>
            <p className="text-xs text-muted-foreground">
              عرض مقسم وموحد لإدارة صفحات فيسبوك والردود الآلية على التعليقات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedPage && fetchPosts(selectedPage)}
            disabled={loading || !selectedPage}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {/* Main Single-Surface Split Chassis */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Pages List */}
        <aside className="w-72 lg:w-80 border-l border-border/70 bg-card/60 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <List className="h-3.5 w-3.5" />
              الصفحات النشطة
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
              {pages.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingPages ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span>جاري تحميل الصفحات...</span>
              </div>
            ) : pages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد صفحات فيسبوك متصلة
              </div>
            ) : (
              pages.map((page) => {
                const isSelected = selectedPage === page.pageId;
                return (
                  <button
                    key={page.pageId}
                    type="button"
                    onClick={() => setSelectedPage(page.pageId)}
                    className={`w-full text-right p-3 rounded-lg border transition-all text-xs ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-foreground shadow-xs font-medium"
                        : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-foreground truncate max-w-[190px]">
                        {page.pageName}
                      </span>
                      {isSelected && <ChevronRight className="h-4 w-4 text-primary rtl:rotate-180" />}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono tabular-nums">
                      <span className="flex items-center gap-1">
                        <Grid3x3 className="h-3 w-3" /> {page.totalPosts} منشور
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {page.totalComments} تعليق
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Posts Explorer */}
        <main className="flex-1 bg-muted/10 flex flex-col min-w-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="p-3 bg-card border-b border-border/70 flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث في معرف أو محتوى المنشور..."
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                className="rounded-md border border-border/70 bg-background text-xs px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="responded">تم الرد بالكامل</option>
              </select>
            </div>
          </div>

          {/* Posts Grid & List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>جاري استرداد منشورات الصفحة...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-border/70 rounded-xl">
                <div className="p-3 bg-muted/30 rounded-full mb-3 text-muted-foreground">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">لا توجد منشورات</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {selectedPage
                    ? "لم يتم العثور على منشورات مطابقة لمعايير البحث المحددة."
                    : "يرجى تحديد صفحة من القائمة الجانبية لعرض المنشورات الخاصة بها."}
                </p>
              </div>
            ) : (
              filteredPosts.map((post, index) => (
                <article
                  key={post.postId || index}
                  className="rounded-lg border border-border/70 bg-card p-3.5 hover:border-primary/40 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {post.pictureUrl ? (
                      <img
                        src={post.pictureUrl}
                        alt="صورة المنشور"
                        className="h-16 w-16 rounded-md object-cover border border-border/60 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{String(post.postId || "").slice(-8)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium border ${getResponseMethodBadge(
                            post.responseMethod,
                          )}`}
                        >
                          {getResponseMethodLabel(post.responseMethod)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                          {dateFt.format(new Date(post.firstCommentTime || Date.now()))}
                        </span>
                      </div>

                      <p className="text-xs text-foreground line-clamp-2 font-normal leading-relaxed">
                        {post.message || "منشور بدون نص توضيحي"}
                      </p>

                      <div className="flex items-center gap-4 pt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                        <span className="flex items-center gap-1 text-foreground">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          <span>{post.totalComments} تعليق</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          <span>{post.pendingComments} معلق</span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{post.responseRate}% معدل الرد</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-border/60 justify-end flex-shrink-0">
                    <button
                      onClick={() => navigate(`/unified-comments/${post.postId}`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      التعليقات
                    </button>
                    <button
                      onClick={() => navigate(`/posts/${post.postId}/settings`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      الإعدادات
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UnifiedCommentsSplit;
