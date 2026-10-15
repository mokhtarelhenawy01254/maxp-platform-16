import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  ArrowRight, 
  Save, 
  Eye, 
  FileText, 
  Sparkles, 
  Globe, 
  Tag, 
  ShoppingBag, 
  HelpCircle, 
  CheckCircle2, 
  Clock,
  Code2
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

const defaultContent = JSON.stringify([
  { type: "p", text: "اكتب مقدمة المقال هنا..." },
  { type: "h2", text: "العنوان الفرعي الأول", id: "section-1" },
  { type: "p", text: "محتوى الفقرة..." },
  { type: "proTip", text: "نصيحة احترافية: اكتب تفاصيل النصيحة هنا لتحسين القيمة الإرشادية" }
], null, 2);

const ArticleEditor: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    heroImage: "",
    category: "Guides",
    content: defaultContent,
    amazonProducts: JSON.stringify([
      { badge: "Best Overall", title: "Ufree Professional Beard Trimmer", price: "$35.99", image: "https://m.media-amazon.com/images/I/51rmE5C51HL._SL500_.jpg", href: "https://www.amazon.com/dp/B0BMKLJW22?tag=mensgroomingpro-20" }
    ], null, 2),
    faqItems: JSON.stringify([
      { q: "Do I need a cordless trimmer?", a: "Yes. Cordless provides consistent power." },
      { q: "How often clean blades?", a: "After every use." }
    ], null, 2),
    tocItems: JSON.stringify(["Our Top Picks","Quick Answer","Motor Power","FAQ"], null, 2),
    sources: JSON.stringify(["The Beard Club","Electric Shaver GURU"], null, 2),
    authorName: "Jake Morrison",
    seoTitle: "",
    seoDescription: "",
    isPublished: false,
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    apiClient.get(`/articles/${id}`).then(res => {
      const a = res.data?.data;
      if (a) {
        setForm({
          title: a.title || "",
          slug: a.slug || "",
          excerpt: a.excerpt || "",
          heroImage: a.heroImage || "",
          category: a.category || "Guides",
          content: a.content || defaultContent,
          amazonProducts: a.amazonProducts || "[]",
          faqItems: a.faqItems || "[]",
          tocItems: a.tocItems || "[]",
          sources: a.sources || "[]",
          authorName: a.authorName || "Jake Morrison",
          seoTitle: a.seoTitle || "",
          seoDescription: a.seoDescription || "",
          isPublished: Boolean(a.isPublished),
        });
      }
    }).catch(() => toast.error("فشل تحميل المقال")).finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (publish?: boolean) => {
    const payload = { ...form, isPublished: publish ?? form.isPublished };
    for (const k of ['content','amazonProducts','faqItems','tocItems','sources'] as const) {
      try { 
        if (payload[k]) JSON.parse(payload[k] as string); 
      } catch { 
        toast.error(`حقل ${k} ليس بتنسيق JSON صالح`); 
        return; 
      }
    }
    if (!payload.title.trim()) { 
      toast.error("عنوان المقال مطلوب"); 
      return; 
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await apiClient.put(`/articles/${id}`, payload);
        toast.success("تم تحديث بيانات المقال بنجاح");
      } else {
        const res = await apiClient.post("/articles", payload);
        toast.success("تم إنشاء المقال الجديد بنجاح");
        navigate(`/articles/${res.data.data.id}`);
        return;
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل حفظ المقال");
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">جاري تحميل بيانات المقال...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/articles" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" /> 
            <span>المقالات</span>
          </Link>
          <div className="h-4 w-px bg-border/70" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-foreground">
              {isEdit ? 'تعديل المقال' : 'مقال جديد'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              form.isPublished 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {form.isPublished ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{form.isPublished ? 'منشور مباشرة' : 'مسودة قيد الإعداد'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => handleSave(false)} 
            disabled={saving} 
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted/30 text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
            <span>حفظ كمسودة</span>
          </button>
          <button 
            type="button"
            onClick={() => handleSave(true)} 
            disabled={saving} 
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{form.isPublished ? 'تحديث وتثبيت النشر' : 'نشر المقال الآن'}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Core Info Surface */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-3">
            <FileText className="w-4 h-4 text-primary" />
            <span>البيانات الأساسية للمقال</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>عنوان المقال الرئيسي</span>
                <span className="text-[10px] text-destructive font-medium">* مطلوب</span>
              </label>
              <input 
                value={form.title} 
                onChange={e => handleChange('title', e.target.value)} 
                placeholder="مثال: الدليل الشامل لاختيار ماكينات الحلاقة الاحترافية" 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>الرابط الدائم (Slug)</span>
                <span className="text-[10px] text-muted-foreground font-mono">LTR</span>
              </label>
              <input 
                value={form.slug} 
                onChange={e => handleChange('slug', e.target.value)} 
                placeholder="complete-guide-to-professional-shavers" 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary" 
                dir="ltr" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">الموجز والوصف المختصر (Excerpt)</label>
            <textarea 
              value={form.excerpt} 
              onChange={e => handleChange('excerpt', e.target.value)} 
              rows={2} 
              className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" 
              placeholder="ملخص محكم في حدود 150-160 حرف لتصدر نتائج محركات البحث ووسائل المشاركة..." 
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">رابط صورة الغلاف Hero</label>
              <input 
                value={form.heroImage} 
                onChange={e => handleChange('heroImage', e.target.value)} 
                placeholder="https://..." 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary" 
                dir="ltr" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">التصنيف الرئيسي</label>
              <select 
                value={form.category} 
                onChange={e => handleChange('category', e.target.value)} 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Guides">Guides (أدلة شاملة)</option>
                <option value="Reviews">Reviews (مراجعات منتجات)</option>
                <option value="Beard Care">Beard Care (عناية باللحية)</option>
                <option value="Skin Care">Skin Care (عناية بالبشرة)</option>
                <option value="Hair Styling">Hair Styling (تصفيف الشعر)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">اسم الكاتب أو المراجع</label>
              <input 
                value={form.authorName} 
                onChange={e => handleChange('authorName', e.target.value)} 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
              />
            </div>
          </div>
        </div>

        {/* SEO Meta Surface */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-3">
            <Globe className="w-4 h-4 text-primary" />
            <span>تهيئة محركات البحث (SEO Meta)</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">عنوان الصفحة في السيو (Meta Title)</label>
              <input 
                value={form.seoTitle} 
                onChange={e => handleChange('seoTitle', e.target.value)} 
                placeholder="اتركه فارغاً للاستعانة بالعنوان الرئيسي تلقائياً" 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">وصف السيو الترويجي (Meta Description)</label>
              <input 
                value={form.seoDescription} 
                onChange={e => handleChange('seoDescription', e.target.value)} 
                placeholder="اتركه فارغاً للاستعانة بالموجز تلقائياً" 
                className="w-full border border-border/70 bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
              />
            </div>
          </div>
        </div>

        {/* Structured Blocks & Content */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Code2 className="w-4 h-4 text-primary" />
              <span>محتوى المقال التفاعلي (Blocks JSON)</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              يدعم بلوكات: h2, p, proTip, image
            </span>
          </div>

          <textarea 
            value={form.content} 
            onChange={e => handleChange('content', e.target.value)} 
            rows={9} 
            className="w-full border border-border/70 bg-background rounded-lg p-3 font-mono text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary" 
            dir="ltr" 
          />
        </div>

        {/* Amazon & Affiliate Products */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span>منتجات أمازون والعمولة (Amazon Product Cards JSON)</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Array of {`{badge, title, price, image, href}`}
            </span>
          </div>

          <textarea 
            value={form.amazonProducts} 
            onChange={e => handleChange('amazonProducts', e.target.value)} 
            rows={5} 
            className="w-full border border-border/70 bg-background rounded-lg p-3 font-mono text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary" 
            dir="ltr" 
          />
        </div>

        {/* FAQ & TOC Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span>الأسئلة الشائعة (FAQ JSON)</span>
            </div>
            <textarea 
              value={form.faqItems} 
              onChange={e => handleChange('faqItems', e.target.value)} 
              rows={6} 
              className="w-full border border-border/70 bg-background rounded-lg p-3 font-mono text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary" 
              dir="ltr" 
            />
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
              <Tag className="w-4 h-4 text-primary" />
              <span>جدول المحتويات والمصادر (TOC / Sources JSON)</span>
            </div>
            <div className="space-y-2">
              <textarea 
                value={form.tocItems} 
                onChange={e => handleChange('tocItems', e.target.value)} 
                rows={3} 
                placeholder="TOC items array"
                className="w-full border border-border/70 bg-background rounded-lg p-2.5 font-mono text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary" 
                dir="ltr" 
              />
              <textarea 
                value={form.sources} 
                onChange={e => handleChange('sources', e.target.value)} 
                rows={3} 
                placeholder="Sources array"
                className="w-full border border-border/70 bg-background rounded-lg p-2.5 font-mono text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary" 
                dir="ltr" 
              />
            </div>
          </div>
        </div>

        {/* Publication Control Ribbon */}
        <div className="bg-muted/20 border border-border/70 rounded-xl p-4 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={form.isPublished} 
              onChange={e => handleChange('isPublished', e.target.checked)} 
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-bold text-foreground block">تفعيل النشر المباشر (Publish Status)</span>
              <span className="text-[11px] text-muted-foreground">عند التفعيل، سيتاح المقال للقراء في المتجر فور إجراء الحفظ</span>
            </div>
          </label>
          <div className="text-xs font-semibold text-muted-foreground font-mono">
            {form.isPublished ? 'Status: LIVE' : 'Status: DRAFT'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
