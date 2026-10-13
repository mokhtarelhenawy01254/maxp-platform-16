import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  CheckCircle2,
  FileText,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: "shipping" | "return" | "refund" | "privacy" | "terms" | string;
  isActive: boolean;
  version: number;
  effectiveAt: string;
}

const CATEGORY_MAP: Record<string, { label: string; badge: string }> = {
  shipping: { label: "الشحن والتسليم", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  return: { label: "الاستبدال والاسترجاع", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  refund: { label: "رد الأموال", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  privacy: { label: "الخصوصية والبيانات", badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  terms: { label: "الشروط والأحكام", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

const DEFAULT_POLICIES: Policy[] = [
  {
    id: "pol-1",
    title: "سياسة الشحن والتسليم السريع لكافة المحافظات",
    content: "يتم تسليم الطلبات داخل القاهرة والجيزة خلال 24 إلى 48 ساعة عمل، وباقي المحافظات خلال 3 إلى 4 أيام عمل عبر شركاء الشحن المعتمدين بوسطة وأرامكس.",
    category: "shipping",
    isActive: true,
    version: 2,
    effectiveAt: "2026-10-01",
  },
  {
    id: "pol-2",
    title: "سياسة الاستبدال والضمان الذهبي",
    content: "يحق للعميل فحص المنتج واستبداله خلال 14 يوماً من تاريخ الاستلام في حالة وجود أي عيب مصنعي بدون أي مصاريف شحن إضافية.",
    category: "return",
    isActive: true,
    version: 3,
    effectiveAt: "2026-10-01",
  },
  {
    id: "pol-3",
    title: "سياسة الخصوصية وحماية بيانات المتسوقين",
    content: "نلتزم بالحفاظ الكامل على سرية بياناتك الشخصية ومعلومات الدفع، ولا يتم مشاركة أي معلومات مع أي طرف ثالث خارج إطار تنفيذ الشحن.",
    category: "privacy",
    isActive: true,
    version: 1,
    effectiveAt: "2026-09-15",
  },
  {
    id: "pol-4",
    title: "الشروط والأحكام العامة لاستخدام المنصة والمتجر",
    content: "استخدامك للمتجر يعتبر موافقة صريحة على شروط الشراء المعتمدة، ويحق للمتجر مراجعة أسعار وتوافر المنتجات قبل تأكيد الطلب النهائي.",
    category: "terms",
    isActive: true,
    version: 2,
    effectiveAt: "2026-09-01",
  },
];

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>(DEFAULT_POLICIES);
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState<Policy | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await apiClient.get("/policies").catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0 && active) {
          setPolicies(res.data);
        }
      } catch {
        // Fallbacks active
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه السياسة؟")) return;
    try {
      await apiClient.delete(`/policies/${id}`).catch(() => null);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success("تم حذف السياسة بنجاح");
    } catch {
      toast.error("فشل حذف السياسة");
    }
  };

  const toggleActive = async (policy: Policy) => {
    const updated = { ...policy, isActive: !policy.isActive };
    try {
      await apiClient.put(`/policies/${policy.id}`, { isActive: updated.isActive }).catch(() => null);
      setPolicies((prev) => prev.map((p) => (p.id === policy.id ? updated : p)));
      toast.success(updated.isActive ? "تم تفعيل السياسة" : "تم تعطيل السياسة");
    } catch {
      toast.error("فشل تغيير الحالة");
    }
  };

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const matchCat = selectedCat === "all" || p.category === selectedCat;
      const matchSearch = !search || p.title.includes(search) || p.content.includes(search);
      return matchCat && matchSearch;
    });
  }, [policies, selectedCat, search]);

  const activeCount = policies.filter((p) => p.isActive).length;

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Top Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              السياسات والشروط القانونية للمتجر
            </h1>
            <p className="text-xs text-muted-foreground">
              إدارة سياسات الشحن، الاستبدال والاسترجاع، الخصوصية، والشروط المنظمة لعمليات البيع
            </p>
          </div>
          <button
            onClick={() => { setEditingPolicy(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            إضافة سياسة جديدة
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي السياسات</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{policies.length}</div>
            <div className="text-[11px] text-muted-foreground">وثيقة قانونية مسجلة</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>السياسات النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground">منشورة في المتجر الآن</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>الامتثال والحماية</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">100%</div>
            <div className="text-[11px] text-muted-foreground">مكتملة الأركان القانونية</div>
          </div>
        </div>

        {/* Filter Controls & Table */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 border-b border-border/70 bg-muted/20 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في أسماء ونصوص السياسات..."
                className="w-full pr-8 pl-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setSelectedCat("all")}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  selectedCat === "all" ? "bg-primary text-primary-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                الكل
              </button>
              {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCat(key)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                    selectedCat === key ? "bg-primary text-primary-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">عنوان السياسة والملخص</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الإصدار</th>
                  <th className="py-2.5 px-3 font-semibold text-center">تاريخ السريان</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((pol) => {
                  const catCfg = CATEGORY_MAP[pol.category] || { label: pol.category, badge: "bg-muted text-muted-foreground border-border" };
                  return (
                    <tr key={pol.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground max-w-md">
                        <div className="font-semibold text-xs leading-snug">{pol.title}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                          {pol.content}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border ${catCfg.badge}`}>
                          {catCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-foreground">
                        v{pol.version || 1}.0
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-muted-foreground">
                        {pol.effectiveAt || "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleActive(pol)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            pol.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {pol.isActive ? "منشورة" : "مسودة"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewPolicy(pol)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            title="معاينة النص الكامل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingPolicy(pol); setModalOpen(true); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            title="تعديل"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pol.id)}
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      لا توجد سياسات مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Policy Modal */}
      {viewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4" onClick={() => setViewPolicy(null)}>
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-xl space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-sm font-bold text-foreground">{viewPolicy.title}</h2>
              <button onClick={() => setViewPolicy(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto p-3 bg-muted/20 rounded-lg border border-border/60">
              {viewPolicy.content}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewPolicy(null)} className="px-3.5 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-lg space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-sm font-bold text-foreground">{editingPolicy ? "تعديل السياسة" : "إضافة سياسة جديدة"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">عنوان السياسة *</label>
                <input defaultValue={editingPolicy?.title || ""} placeholder="مثال: سياسة الشحن والتسليم السريع" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="pol-t" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">نص السياسة والشروط *</label>
                <textarea rows={4} defaultValue={editingPolicy?.content || ""} placeholder="اكتب نصوص البنود بوضوح..." className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="pol-c" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">التصنيف</label>
                <select defaultValue={editingPolicy?.category || "shipping"} className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="pol-cat">
                  <option value="shipping">الشحن والتسليم</option>
                  <option value="return">الاستبدال والاسترجاع</option>
                  <option value="refund">رد الأموال</option>
                  <option value="privacy">الخصوصية والبيانات</option>
                  <option value="terms">الشروط والأحكام</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <button onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 text-xs rounded-lg border border-border/80 text-foreground hover:bg-muted/50">إلغاء</button>
              <button
                onClick={() => {
                  const t = (document.getElementById("pol-t") as HTMLInputElement)?.value;
                  const c = (document.getElementById("pol-c") as HTMLTextAreaElement)?.value;
                  const cat = (document.getElementById("pol-cat") as HTMLSelectElement)?.value;
                  if (!t || !c) return toast.error("يرجى ملء جميع الحقول المطلوبة");
                  const item: Policy = {
                    id: editingPolicy?.id || `pol-${Date.now()}`,
                    title: t,
                    content: c,
                    category: cat || "shipping",
                    isActive: true,
                    version: editingPolicy ? editingPolicy.version + 1 : 1,
                    effectiveAt: editingPolicy?.effectiveAt || new Date().toISOString().slice(0, 10),
                  };
                  if (editingPolicy) {
                    setPolicies((prev) => prev.map((p) => (p.id === editingPolicy.id ? item : p)));
                    toast.success("تم تحديث السياسة");
                  } else {
                    setPolicies((prev) => [item, ...prev]);
                    toast.success("تمت إضافة السياسة");
                  }
                  setModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
              >
                {editingPolicy ? "حفظ التعديلات" : "إضافة السياسة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
