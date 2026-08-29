import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus, Edit, Trash2, Eye, ExternalLink } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

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

  useEffect(() => { fetchArticles(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المقال؟")) return;
    try {
      await apiClient.delete(`/articles/${id}`);
      toast.success("تم الحذف");
      fetchArticles();
    } catch (e: any) {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="w-6 h-6" /> المدونة والـ SEO
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مقالات مثل MensGroomingPro — {total} مقال</p>
        </div>
        <Link to="/articles/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-bold hover:opacity-90">
          <Plus className="w-4 h-4" /> مقال جديد
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">جاري التحميل...</div>
      ) : articles.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl py-16 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 font-bold">لا يوجد مقالات بعد</p>
          <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء أول مقال SEO جاهز لـ Amazon Affiliate</p>
          <Link to="/articles/new" className="mt-4 inline-flex bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold">+ إنشاء مقال</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((a) => (
            <div key={a.id} className="flex gap-4 p-4 rounded-2xl border bg-card hover:shadow-md transition">
              {a.heroImage ? (
                <img src={a.heroImage} alt={a.title} className="w-32 h-20 object-cover rounded-xl shrink-0" />
              ) : (
                <div className="w-32 h-20 bg-muted rounded-xl shrink-0 flex items-center justify-center"><FileText className="w-6 h-6 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${a.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.isPublished ? 'منشور' : 'مسودة'}</span>
                  <span className="text-xs text-muted-foreground">{a.category || 'Guides'} • {a.views} مشاهدة</span>
                </div>
                <h3 className="font-bold truncate mt-1">{a.title}</h3>
                <p className="text-xs text-muted-foreground truncate">/{a.slug}</p>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{a.excerpt || 'بدون وصف'}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Link to={`/articles/${a.id}`} className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-full hover:bg-muted"><Edit className="w-3.5 h-3.5" /> تعديل</Link>
                <a href={`/store/articles/${a.slug}?companyId=${localStorage.getItem('companyId') || localStorage.getItem('currentCompanyId') || ''}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Eye className="w-3.5 h-3.5" /> معاينة <ExternalLink className="w-3 h-3" /></a>
                <button onClick={() => handleDelete(a.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticlesList;
