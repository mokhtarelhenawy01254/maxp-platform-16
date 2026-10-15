import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImage?: string;
  category?: string;
  isPublished: boolean;
  publishedAt?: string;
  views: number;
  createdAt: string;
}

const ArticlesList: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const navigate = useNavigate();

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/articles", { params: { limit: 50 } });
      if (res.data?.success) {
        setArticles(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل تحميل المقالات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    try {
      await apiClient.delete(`/articles/${id}`);
      toast.success("تم حذف المقال بنجاح");
      fetchArticles();
    } catch (e: any) {
      toast.error("فشل حذف المقال");
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.slug.toLowerCase().includes(search.toLowerCase()) ||
        (a.category && a.category.toLowerCase().includes(search.toLowerCase()));

      if (statusFilter === "PUBLISHED") return matchSearch && a.isPublished;
      if (statusFilter === "DRAFT") return matchSearch && !a.isPublished;
      return matchSearch;
    });
  }, [articles, search, statusFilter]);

  const totalViews = useMemo(() => {
    return articles.reduce((sum, a) => sum + (a.views || 0), 0);
  }, [articles]);

  const publishedCount = useMemo(() => {
    return articles.filter((a) => a.isPublished).length;
  }, [articles]);

  const draftCount = total - publishedCount;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                المدونة وصناعة المحتوى الترويجي (SEO Articles)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                كتابة وتوثيق مقالات التجارة، أدلة الشراء، ومراجعات المنتجات لتعزيز الظهور العضوي
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/articles/new">
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>مقال جديد</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>إجمالي المقالات</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {total.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">أدلة ومراجعات محفوظة</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>المقالات المنشورة</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {publishedCount.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">متاحة ومفهرسة للمتسوقين</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>المسودات قيد الإعداد</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {draftCount.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">بانتظار المراجعة والنشر</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>إجمالي القراءات والمشاهدات</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {totalViews.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">قراءات تراكمية للمقالات</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Filter Bar */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardContent className="p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان، الرابط، أو القسم..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "ALL"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({articles.length})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "PUBLISHED"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              منشور ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "DRAFT"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مسودة ({draftCount})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Articles List / Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>جاري تحميل المقالات والمحتوى الترويجي...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="bg-card border-border/70 shadow-xs border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <div className="text-sm font-bold text-foreground">لا توجد مقالات تطابق الفلاتر المحددة</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              ابدأ الآن بإنشاء أول مقال ترويجي محسن لمحركات البحث ومربوط بمنتجات متجرك وروابط الإحالة.
            </p>
            <Link to="/articles/new">
              <Button size="sm" className="mt-2 text-xs">
                + إنشاء مقال جديد
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredArticles.map((a) => (
            <Card
              key={a.id}
              className="bg-card border-border/70 hover:border-border transition-all shadow-xs overflow-hidden"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {a.heroImage ? (
                    <img
                      src={a.heroImage}
                      alt={a.title}
                      className="w-24 h-16 object-cover rounded-lg shrink-0 border border-border/60 bg-muted"
                    />
                  ) : (
                    <div className="w-24 h-16 rounded-lg bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center text-muted-foreground">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 border ${
                          a.isPublished
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {a.isPublished ? "منشور" : "مسودة"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        {a.category || "دليل عام"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {a.views.toLocaleString()} مشاهدة
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground truncate">
                      {a.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {a.excerpt || "بدون وصف مختصر..."}
                    </p>
                    <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                      /{a.slug}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link to={`/articles/${a.id}`}>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1 border-border/70">
                      <Edit3 className="h-3 w-3" />
                      <span>تعديل</span>
                    </Button>
                  </Link>

                  <a
                    href={`/store/articles/${a.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>معاينة</span>
                    </Button>
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticlesList;
