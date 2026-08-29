import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

const defaultContent = JSON.stringify([
  { type: "p", text: "اكتب مقدمة المقال هنا..." },
  { type: "h2", text: "العنوان الفرعي الأول", id: "section-1" },
  { type: "p", text: "محتوى الفقرة..." },
  { type: "proTip", text: "💡 نصيحة: اكتب Pro Tip هنا" }
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
    }).catch(() => toast.error("فشل تحميل المقال")).finally(()=>setLoading(false));
  }, [id, isEdit]);

  const handleChange = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (publish?: boolean) => {
    const payload = { ...form, isPublished: publish ?? form.isPublished };
    // validate JSON fields
    for (const k of ['content','amazonProducts','faqItems','tocItems','sources'] as const) {
      try { if (payload[k]) JSON.parse(payload[k] as string); } catch { toast.error(`حقل ${k} ليس JSON صالح`); return; }
    }
    if (!payload.title.trim()) { toast.error("العنوان مطلوب"); return; }
    setSaving(true);
    try {
      if (isEdit && id) {
        await apiClient.put(`/articles/${id}`, payload);
        toast.success("تم التحديث");
      } else {
        const res = await apiClient.post("/articles", payload);
        toast.success("تم إنشاء المقال");
        navigate(`/articles/${res.data.data.id}`);
        return;
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل الحفظ");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Link to="/articles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> العودة للمقالات</Link>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="px-5 py-2 rounded-full border font-bold hover:bg-muted disabled:opacity-50">حفظ مسودة</button>
          <button onClick={() => handleSave(true)} disabled={saving} className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-black inline-flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {form.isPublished ? 'تحديث ونشر' : 'نشر المقال'}</button>
        </div>
      </div>

      <h1 className="text-2xl font-black">{isEdit ? 'تعديل المقال' : 'مقال جديد - MensGroomingPro Style'}</h1>

      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-bold">العنوان *</span>
            <input value={form.title} onChange={e=>handleChange('title', e.target.value)} placeholder="How To Choose..." className="w-full border rounded-xl px-3 py-2.5" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-bold">Slug (الرابط)</span>
            <input value={form.slug} onChange={e=>handleChange('slug', e.target.value)} placeholder="how-to-choose..." className="w-full border rounded-xl px-3 py-2.5 font-mono text-sm" dir="ltr" />
            <span className="text-xs text-muted-foreground">يولد تلقائيا من العنوان إذا ترك فارغا</span>
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-bold">الوصف المختصر (Excerpt)</span>
          <textarea value={form.excerpt} onChange={e=>handleChange('excerpt', e.target.value)} rows={2} className="w-full border rounded-xl px-3 py-2" placeholder="ملخص 160 حرف للسيو..." />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-bold">صورة الغلاف Hero</span>
            <input value={form.heroImage} onChange={e=>handleChange('heroImage', e.target.value)} placeholder="https://..." className="w-full border rounded-xl px-3 py-2.5" dir="ltr" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-bold">التصنيف</span>
            <select value={form.category} onChange={e=>handleChange('category', e.target.value)} className="w-full border rounded-xl px-3 py-2.5">
              <option>Guides</option><option>Reviews</option><option>Beard Care</option><option>Skin Care</option>
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-bold">الكاتب</span>
            <input value={form.authorName} onChange={e=>handleChange('authorName', e.target.value)} className="w-full border rounded-xl px-3 py-2.5" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-bold">SEO Title</span>
            <input value={form.seoTitle} onChange={e=>handleChange('seoTitle', e.target.value)} placeholder="يترك فارغ = العنوان" className="w-full border rounded-xl px-3 py-2.5" />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-bold">محتوى المقال (Blocks JSON)</span>
          <textarea value={form.content} onChange={e=>handleChange('content', e.target.value)} rows={10} className="w-full border rounded-xl px-3 py-2 font-mono text-xs" dir="ltr" />
          <span className="text-xs text-muted-foreground">يدعم blocks: {`{type:"h2"|"p"|"proTip"|"image", text, id}` } - TOC يولد تلقائيا من الـ h2</span>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold">منتجات أمازون (Amazon Cards JSON)</span>
          <textarea value={form.amazonProducts} onChange={e=>handleChange('amazonProducts', e.target.value)} rows={5} className="w-full border rounded-xl px-3 py-2 font-mono text-xs" dir="ltr" />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-bold">FAQ (JSON)</span>
            <textarea value={form.faqItems} onChange={e=>handleChange('faqItems', e.target.value)} rows={6} className="w-full border rounded-xl px-3 py-2 font-mono text-xs" dir="ltr" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-bold">TOC / Sources (JSON)</span>
            <textarea value={form.tocItems} onChange={e=>handleChange('tocItems', e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2 font-mono text-xs" dir="ltr" />
            <textarea value={form.sources} onChange={e=>handleChange('sources', e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2 font-mono text-xs mt-2" dir="ltr" placeholder="sources" />
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isPublished} onChange={e=>handleChange('isPublished', e.target.checked)} />
          <span className="font-bold">نشر فورا (isPublished)</span>
        </label>
      </div>
    </div>
  );
};

export default ArticleEditor;
