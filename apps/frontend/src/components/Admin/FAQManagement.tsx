import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ThumbsUp,
  HelpCircle,
  CheckCircle2,
  Search,
  Sparkles,
  Download,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import FAQModal, { FAQItem } from "./faq/FAQModal";
import FAQStarterPackModal from "./faq/FAQStarterPackModal";
import { StarterQuestion } from "./faq/faqPresets";

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [starterPackOpen, setStarterPackOpen] = useState(false);
  const [isInstallingPack, setIsInstallingPack] = useState(false);

  // Fetch FAQs from database
  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/faqs", {
        params: { includeInactive: "true" },
      });
      const raw: any = res?.data;
      let list: FAQItem[] = [];

      if (Array.isArray(raw)) {
        list = raw as FAQItem[];
      } else if (raw?.data && Array.isArray(raw.data)) {
        list = raw.data as FAQItem[];
      } else if (raw?.items && Array.isArray(raw.items)) {
        list = raw.items as FAQItem[];
      } else if (raw?.faqs && typeof raw.faqs === "object") {
        list = Object.values(raw.faqs).flat() as FAQItem[];
      }

      setFaqs(list);
    } catch {
      toast.error("فشل تحميل الأسئلة من السيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Dynamic Categories from data
  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    faqs.forEach((f) => {
      const cat = f.category?.trim() || "عام";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [faqs]);

  // Filtered FAQs
  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const catMatch = selectedCat === "all" || (f.category?.trim() || "عام") === selectedCat;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" ? f.isActive : !f.isActive);
      const searchLower = search.toLowerCase().trim();
      const searchMatch =
        !searchLower ||
        f.question?.toLowerCase().includes(searchLower) ||
        f.answer?.toLowerCase().includes(searchLower) ||
        (Array.isArray(f.tags) && f.tags.some((t) => t.toLowerCase().includes(searchLower)));

      return catMatch && statusMatch && searchMatch;
    });
  }, [faqs, selectedCat, statusFilter, search]);

  // Actions
  const handleOpenAdd = () => {
    setEditingFaq(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (faq: FAQItem) => {
    setEditingFaq(faq);
    setModalOpen(true);
  };

  const handleSaveFAQ = async (formData: {
    question: string;
    answer: string;
    category: string;
    tags: string[];
    isActive: boolean;
  }) => {
    setIsSaving(true);
    try {
      if (editingFaq) {
        const res = await apiClient.put(`/faqs/${editingFaq.id}`, formData);
        const updated = (res?.data && (res.data as any).id) ? (res.data as FAQItem) : { ...editingFaq, ...formData };
        setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? updated : f)));
        toast.success("تم تحديث السؤال وتحديث قاعدة المعرفة");
      } else {
        const res = await apiClient.post("/faqs", formData);
        const created = (res?.data && (res.data as any).id)
          ? (res.data as FAQItem)
          : { id: `faq-${Date.now()}`, ...formData, helpful: 0 };
        setFaqs((prev) => [created, ...prev]);
        toast.success("تمت إضافة السؤال وحفظه في قاعدة المعرفة بنجاح");
      }
      setModalOpen(false);
    } catch {
      toast.error("حدث خطأ أثناء حفظ السؤال");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال نهائياً من قاعدة المعرفة؟")) return;
    try {
      await apiClient.delete(`/faqs/${id}`);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success("تم حذف السؤال بنجاح");
    } catch {
      toast.error("فشل حذف السؤال");
    }
  };

  const toggleActive = async (faq: FAQItem) => {
    const newStatus = !faq.isActive;
    try {
      await apiClient.put(`/faqs/${faq.id}`, { isActive: newStatus });
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, isActive: newStatus } : f))
      );
      toast.success(newStatus ? "تم تفعيل السؤال" : "تم تعطيل السؤال");
    } catch {
      toast.error("فشل تغيير حالة السؤال");
    }
  };

  const handleInstallStarterPack = async (questions: StarterQuestion[]) => {
    setIsInstallingPack(true);
    try {
      await apiClient.post("/faqs/batch", { items: questions });
      toast.success(`تم تثبيت ${questions.length} سؤال بنجاح في قاعدة المعرفة`);
      setStarterPackOpen(false);
      await fetchFaqs();
    } catch {
      toast.error("فشل تثبيت حزمة الأسئلة");
    } finally {
      setIsInstallingPack(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (faqs.length === 0) {
      toast.error("لا توجد أسئلة لتصديرها");
      return;
    }
    const headers = ["السؤال", "الإجابة", "التصنيف", "الكلمات المفتاحية", "الحالة", "التقييم"];
    const rows = faqs.map((f) => [
      `"${(f.question || "").replace(/"/g, '""')}"`,
      `"${(f.answer || "").replace(/"/g, '""')}"`,
      `"${(f.category || "عام").replace(/"/g, '""')}"`,
      `"${(Array.isArray(f.tags) ? f.tags.join(", ") : "").replace(/"/g, '""')}"`,
      f.isActive ? "نشط" : "معطل",
      f.helpful || 0,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `faqs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير الأسئلة بنجاح");
  };

  // KPIs
  const activeCount = faqs.filter((f) => f.isActive).length;
  const totalHelpful = faqs.reduce((acc, f) => acc + (f.helpful || 0), 0);
  const categoriesCount = dynamicCategories.length;

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              إدارة الأسئلة الشائعة وقاعدة المعرفة
            </h1>
            <p className="text-xs text-muted-foreground">
              الأسئلة المعتمدة للردود الآلية للذكاء الاصطناعي (WhatsApp/Chatbot) والمعروضة للعملاء
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-card border border-border/80 text-foreground text-xs font-semibold rounded-xl hover:bg-muted transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              تصدير CSV
            </button>
            <button
              type="button"
              onClick={() => setStarterPackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted text-foreground text-xs font-semibold rounded-xl hover:bg-muted/80 transition cursor-pointer border border-border/70"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              حزم الأنشطة الجاهزة
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة سؤال جديد
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي الأسئلة</span>
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{faqs.length}</div>
            <div className="text-[11px] text-muted-foreground">سؤال في قاعدة المعرفة</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>الأسئلة النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground">متاحة لردود الذكاء الاصطناعي</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>التصنيفات المخصصة</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {categoriesCount}
            </div>
            <div className="text-[11px] text-muted-foreground">تصنيف نشط لنشاطك</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>تقييمات الفائدة</span>
              <ThumbsUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-primary">
              {totalHelpful}
            </div>
            <div className="text-[11px] text-muted-foreground">تفاعل إيجابي من العملاء</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-card border border-border/70 rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في السؤال، الإجابة، أو الكلمات المفتاحية..."
                className="w-full pr-8 pl-3 py-1.5 bg-background border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكل ({faqs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-background text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                نشط ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  statusFilter === "inactive"
                    ? "bg-background text-rose-600 dark:text-rose-400 font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                معطل ({faqs.length - activeCount})
              </button>
            </div>
          </div>

          {/* Dynamic Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-border/60">
            <button
              type="button"
              onClick={() => setSelectedCat("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCat === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              جميع الفئات
              <span className="font-mono tabular-nums text-[10px] opacity-80">({faqs.length})</span>
            </button>
            {dynamicCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCat(c.name)}
                className={`px-2.5 py-1 rounded-lg text-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCat === c.name
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c.name}
                <span className="font-mono tabular-nums text-[10px] opacity-80">({c.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Table / List */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">السؤال والإجابة</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الكلمات المفتاحية والـ AI</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التقييم</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      جاري تحميل الأسئلة من قاعدة المعرفة...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 space-y-2">
                      <div className="text-sm font-semibold text-foreground">لا توجد أسئلة تطابق البحث الحالي</div>
                      <p className="text-xs text-muted-foreground">
                        يمكنك إضافة سؤال جديد أو اختيار حزمة أسئلة جاهزة متوافقة مع نشاطك بضغطة زر واحدة
                      </p>
                      <button
                        type="button"
                        onClick={() => setStarterPackOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 transition cursor-pointer mt-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        تصفح حزم الأنشطة الجاهزة
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((faq) => (
                    <tr key={faq.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-md">
                        <div className="font-semibold text-xs leading-snug">{faq.question}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {faq.answer}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground border border-border/60 font-medium">
                          {faq.category || "عام"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center max-w-xs">
                        {Array.isArray(faq.tags) && faq.tags.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {faq.tags.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted/60 text-muted-foreground font-mono"
                              >
                                #{t}
                              </span>
                            ))}
                            {faq.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{faq.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">+{faq.helpful || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleActive(faq)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                            faq.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {faq.isActive ? "نشط" : "معطل"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(faq)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            title="تعديل"
                            aria-label="تعديل السؤال"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(faq.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition cursor-pointer"
                            title="حذف"
                            aria-label="حذف السؤال"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit / Add Modal */}
      <FAQModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveFAQ}
        editingFaq={editingFaq}
        existingCategories={dynamicCategories.map((c) => c.name)}
        isSaving={isSaving}
      />

      {/* Starter Pack Modal */}
      <FAQStarterPackModal
        isOpen={starterPackOpen}
        onClose={() => setStarterPackOpen(false)}
        onInstall={handleInstallStarterPack}
        isInstalling={isInstallingPack}
      />
    </div>
  );
}
