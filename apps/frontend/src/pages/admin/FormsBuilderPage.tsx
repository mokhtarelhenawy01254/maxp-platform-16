import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  Users,
  MousePointerClick,
  TrendingUp,
  ExternalLink,
  X,
  Search,
  Check,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";

interface FormDefinition {
  id: string;
  title: string;
  slug: string;
  description?: string;
  pixelId?: string;
  isActive: boolean;
  viewCount: number;
  _count?: { submissions: number };
}

const DEFAULT_FORMS: FormDefinition[] = [
  {
    id: "f-1",
    title: "استمارة حجز دبلومة الذكاء الاصطناعي والأتمتة",
    slug: "ai-automation-diploma",
    description: "نموذج التسجيل المبكر والحصول على منحة الخصم لرواد الأعمال والمهندسين.",
    pixelId: "9876543210123",
    isActive: true,
    viewCount: 1240,
    _count: { submissions: 184 },
  },
  {
    id: "f-2",
    title: "طلب استشارة تسويقية ونمو مبيعات مجانية",
    slug: "free-marketing-audit",
    description: "تحليل حسابات الإعلانات ومعدل التحويل للمتاجر والشركات الناشئة.",
    isActive: true,
    viewCount: 860,
    _count: { submissions: 92 },
  },
];

export default function FormsBuilderPage() {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormDefinition[]>(DEFAULT_FORMS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormDefinition | null>(null);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    try {
      const headers = tokenManager.createAuthHeaders();
      const res = await fetch(buildApiUrl("/forms"), { headers });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length) setForms(json.data);
    } catch {
      // Fallbacks active
    }
  }, []);

  useEffect(() => { loadForms(); }, [loadForms]);

  const handleDelete = async (form: FormDefinition) => {
    if (!confirm(`حذف النموذج "${form.title}"؟`)) return;
    try {
      const headers = { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" };
      await fetch(buildApiUrl(`/forms/${form.id}`), { method: "DELETE", headers });
      toast.success("تم حذف النموذج بنجاح");
      setForms((prev) => prev.filter((f) => f.id !== form.id));
    } catch {
      toast.error("فشل حذف النموذج");
    }
  };

  const copyPublicUrl = (slug: string) => {
    const cid = user?.companyId ? `?companyId=${user.companyId}` : "";
    navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}${cid}`);
    setCopiedSlug(slug);
    toast.success("تم نسخ رابط النموذج العام");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filtered = forms.filter((f) => f.title.includes(search) || f.slug.includes(search));
  const totalViews = forms.reduce((s, f) => s + f.viewCount, 0);
  const totalSubs = forms.reduce((s, f) => s + (f._count?.submissions || 0), 0);
  const avgConv = totalViews > 0 ? ((totalSubs / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">نماذج جمع البيانات والتسجيل</h1>
            <p className="text-xs text-muted-foreground">بناء وإدارة صفحات الهبوط السريعة مع ربط Facebook Pixel ومتابعة التحويل</p>
          </div>
          <button
            onClick={() => { setEditForm(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            إنشاء نموذج جديد
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي النماذج</span><FileText className="w-4 h-4 text-primary" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{forms.length}</div>
            <div className="text-[11px] text-muted-foreground">صفحة تسجيل نشطة</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي الزيارات</span><MousePointerClick className="w-4 h-4 text-purple-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalViews.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">زيارة فريدة</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي التسجيلات</span><Users className="w-4 h-4 text-emerald-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{totalSubs.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">بيانات عميل مسجلة</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>متوسط التحويل</span><TrendingUp className="w-4 h-4 text-blue-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{avgConv}%</div>
            <div className="text-[11px] text-muted-foreground">نسبة التسجيل للزيارات</div>
          </div>
        </div>

        {/* Table Chassis */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 border-b border-border/70 bg-muted/20 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في أسماء وروابط النماذج..."
                className="w-full pr-8 pl-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono tabular-nums mr-auto">{filtered.length} نموذج</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">عنوان النموذج</th>
                  <th className="py-2.5 px-4 font-semibold">الرابط السريع</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الزيارات</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الردود</th>
                  <th className="py-2.5 px-3 font-semibold text-center">معدل التحويل</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((form) => {
                  const subs = form._count?.submissions || 0;
                  const conv = form.viewCount > 0 ? ((subs / form.viewCount) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={form.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div>{form.title}</div>
                        {form.description && <div className="text-[11px] text-muted-foreground line-clamp-1">{form.description}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => copyPublicUrl(form.slug)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline bg-muted/30 px-2 py-0.5 rounded border border-border/60"
                          dir="ltr"
                          title="نسخ الرابط"
                        >
                          {copiedSlug === form.slug ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          /forms/{form.slug}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-foreground">{form.viewCount}</td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-foreground">{subs}</td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-blue-600 dark:text-blue-400">{conv}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${form.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                          {form.isActive ? "نشط" : "معطل"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setEditForm(form); setModalOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60" title="تعديل"><FileText className="w-3.5 h-3.5" /></button>
                          <a href={`/forms/${form.slug}${user?.companyId ? `?companyId=${user.companyId}` : ""}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60" title="فتح"><ExternalLink className="w-3.5 h-3.5" /></a>
                          <button onClick={() => handleDelete(form)} className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-500/10" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">لا توجد نماذج مطابقة للبحث</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-lg space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-sm font-bold text-foreground">{editForm ? "تعديل النموذج" : "إنشاء نموذج تسجيل جديد"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">عنوان النموذج *</label>
                <input defaultValue={editForm?.title || ""} placeholder="مثال: تسجيل ورشة الذكاء الاصطناعي" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="m-title" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">الرابط المختصر (Slug) *</label>
                <input defaultValue={editForm?.slug || ""} placeholder="ai-workshop" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary" dir="ltr" id="m-slug" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">الوصف</label>
                <textarea defaultValue={editForm?.description || ""} rows={2} placeholder="وصف موجز للمحتوى..." className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="m-desc" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">Facebook Pixel ID</label>
                <input defaultValue={editForm?.pixelId || ""} placeholder="1234567890123" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary" dir="ltr" id="m-pixel" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <button onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 text-xs rounded-lg border border-border/80 text-foreground hover:bg-muted/50">إلغاء</button>
              <button
                onClick={() => {
                  const title = (document.getElementById("m-title") as HTMLInputElement)?.value;
                  const slug = (document.getElementById("m-slug") as HTMLInputElement)?.value;
                  const desc = (document.getElementById("m-desc") as HTMLTextAreaElement)?.value;
                  const pixel = (document.getElementById("m-pixel") as HTMLInputElement)?.value;
                  if (!title || !slug) return toast.error("يرجى ملء الحقول الإلزامية");
                  const updated: FormDefinition = {
                    id: editForm?.id || `f-${Date.now()}`,
                    title,
                    slug,
                    description: desc,
                    pixelId: pixel || undefined,
                    isActive: true,
                    viewCount: editForm?.viewCount || 0,
                    _count: editForm?._count || { submissions: 0 },
                  };
                  if (editForm) {
                    setForms((prev) => prev.map((f) => (f.id === editForm.id ? updated : f)));
                    toast.success("تم تحديث النموذج بنجاح");
                  } else {
                    setForms((prev) => [updated, ...prev]);
                    toast.success("تم إنشاء النموذج بنجاح");
                  }
                  setModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
              >
                {editForm ? "حفظ التعديلات" : "إنشاء النموذج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
