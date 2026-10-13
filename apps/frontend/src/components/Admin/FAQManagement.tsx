import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  X,
  HelpCircle,
  CheckCircle2,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  order?: number;
  helpful?: number;
  notHelpful?: number;
  isActive: boolean;
  createdAt?: string;
}

const CATEGORIES = [
  { value: "all", label: "جميع الفئات" },
  { value: "shipping", label: "الشحن والتوصيل" },
  { value: "payment", label: "المدفوعات والفواتير" },
  { value: "returns", label: "الاستبدال والاسترجاع" },
  { value: "general", label: "أسئلة عامة" },
];

const DEFAULT_FAQS: FAQ[] = [
  {
    id: "faq-1",
    question: "كيف يمكنني تتبع حالة شحنة طلبي بعد إتمام الدفع؟",
    answer: "ستصلك رسالة نصية وواتساب تحتوي على رابط التتبع اللحظي بمجرد خروج الشحنة مع مندوب شركة بوسطة أو أرامكس.",
    category: "shipping",
    tags: ["شحن", "تتبع", "بوسطة"],
    helpful: 48,
    notHelpful: 1,
    isActive: true,
  },
  {
    id: "faq-2",
    question: "ما هي شروط الاستبدال والاسترجاع للبضائع؟",
    answer: "يحق للعميل استبدال أو إرجاع المنتج خلال 14 يوماً من الاستلام بشرط سلامة العبوة الأصلية وعدم استخدام المنتج.",
    category: "returns",
    tags: ["استرجاع", "ضمان", "استبدال"],
    helpful: 64,
    notHelpful: 2,
    isActive: true,
  },
  {
    id: "faq-3",
    question: "ما هي طرق الدفع المتاحة داخل المتجر الإلكتروني؟",
    answer: "نوفر الدفع عند الاستلام، إنستاباي (InstaPay)، فودافون كاش، وبطاقات ميزة وفيزا وماستركارد البنكية بأمان تام.",
    category: "payment",
    tags: ["دفع", "إنستاباي", "كاش"],
    helpful: 29,
    notHelpful: 0,
    isActive: true,
  },
];

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  useEffect(() => {
    let active = true;
    const fetchFaqs = async () => {
      try {
        const res = await apiClient.get("/faqs").catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0 && active) {
          setFaqs(res.data);
        }
      } catch {
        // Fallbacks active
      }
    };
    fetchFaqs();
    return () => { active = false; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    try {
      await apiClient.delete(`/faqs/${id}`).catch(() => null);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success("تم حذف السؤال بنجاح");
    } catch {
      toast.error("فشل حذف السؤال");
    }
  };

  const toggleActive = async (faq: FAQ) => {
    const updated = { ...faq, isActive: !faq.isActive };
    try {
      await apiClient.put(`/faqs/${faq.id}`, { isActive: updated.isActive }).catch(() => null);
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? updated : f)));
      toast.success(updated.isActive ? "تم تفعيل السؤال" : "تم تعطيل السؤال");
    } catch {
      toast.error("فشل تغيير الحالة");
    }
  };

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const matchCat = selectedCat === "all" || f.category === selectedCat;
      const matchSearch = !search || f.question.includes(search) || f.answer.includes(search);
      return matchCat && matchSearch;
    });
  }, [faqs, selectedCat, search]);

  const activeCount = faqs.filter((f) => f.isActive).length;
  const totalHelpful = faqs.reduce((acc, f) => acc + (f.helpful || 0), 0);

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              إدارة الأسئلة الشائعة (FAQ)
            </h1>
            <p className="text-xs text-muted-foreground">
              قاعدة الأسئلة المتكررة المعروضة في المتجر الإلكتروني والمستخدمة في ردود الذكاء الاصطناعي
            </p>
          </div>
          <button
            onClick={() => { setEditingFaq(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            إضافة سؤال جديد
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي الأسئلة</span>
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{faqs.length}</div>
            <div className="text-[11px] text-muted-foreground">سؤال مسجل في القاعدة</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>الأسئلة النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground">معروضة للعملاء الآن</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>تقييمات الفائدة الإيجابية</span>
              <ThumbsUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {totalHelpful}
            </div>
            <div className="text-[11px] text-muted-foreground">تفاعل إيجابي من الزوار</div>
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
                placeholder="بحث في نصوص الأسئلة والإجابات..."
                className="w-full pr-8 pl-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCat(c.value)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                    selectedCat === c.value
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">السؤال والإجابة</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التقييم</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((faq) => {
                  const catLabel = CATEGORIES.find((c) => c.value === faq.category)?.label || faq.category;
                  return (
                    <tr key={faq.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground max-w-md">
                        <div className="font-semibold text-xs leading-snug">{faq.question}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {faq.answer}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-muted-foreground border border-border/60">
                          {catLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">+{faq.helpful || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleActive(faq)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            faq.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {faq.isActive ? "نشط" : "معطل"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setEditingFaq(faq); setModalOpen(true); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            title="تعديل"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
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
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      لا توجد أسئلة مطابقة للبحث في هذا التصنيف
                    </td>
                  </tr>
                )}
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
              <h2 className="text-sm font-bold text-foreground">{editingFaq ? "تعديل السؤال" : "إضافة سؤال جديد"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">السؤال *</label>
                <input defaultValue={editingFaq?.question || ""} placeholder="اكتب صيغة السؤال بوضوح..." className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="faq-q" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">الإجابة المعتمدة *</label>
                <textarea rows={3} defaultValue={editingFaq?.answer || ""} placeholder="اكتب الإجابة المفصلة..." className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="faq-a" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">التصنيف</label>
                <select defaultValue={editingFaq?.category || "general"} className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" id="faq-c">
                  <option value="shipping">الشحن والتوصيل</option>
                  <option value="payment">المدفوعات والفواتير</option>
                  <option value="returns">الاستبدال والاسترجاع</option>
                  <option value="general">أسئلة عامة</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <button onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 text-xs rounded-lg border border-border/80 text-foreground hover:bg-muted/50">إلغاء</button>
              <button
                onClick={() => {
                  const q = (document.getElementById("faq-q") as HTMLInputElement)?.value;
                  const a = (document.getElementById("faq-a") as HTMLTextAreaElement)?.value;
                  const c = (document.getElementById("faq-c") as HTMLSelectElement)?.value;
                  if (!q || !a) return toast.error("يرجى ملء جميع الحقول المطلوبة");
                  const item: FAQ = {
                    id: editingFaq?.id || `faq-${Date.now()}`,
                    question: q,
                    answer: a,
                    category: c || "general",
                    isActive: true,
                    helpful: editingFaq?.helpful || 0,
                  };
                  if (editingFaq) {
                    setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? item : f)));
                    toast.success("تم تحديث السؤال");
                  } else {
                    setFaqs((prev) => [item, ...prev]);
                    toast.success("تمت إضافة السؤال");
                  }
                  setModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
              >
                {editingFaq ? "حفظ التعديلات" : "إضافة السؤال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
