import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  Download,
  Layers,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import PolicyModal, { PolicyItem } from "./policies/PolicyModal";
import PolicyStarterPackModal from "./policies/PolicyStarterPackModal";
import { StarterPolicy } from "./policies/policyPresets";

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [viewPolicy, setViewPolicy] = useState<PolicyItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [starterPackOpen, setStarterPackOpen] = useState(false);
  const [isInstallingPack, setIsInstallingPack] = useState(false);

  // Fetch policies from database
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/policies");
      const raw: any = res?.data;
      let list: PolicyItem[] = [];

      if (Array.isArray(raw)) {
        list = raw as PolicyItem[];
      } else if (raw?.data && Array.isArray(raw.data)) {
        list = raw.data as PolicyItem[];
      }

      setPolicies(list);
    } catch {
      toast.error("فشل تحميل السياسات من السيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Dynamic Categories from data
  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    policies.forEach((p) => {
      const cat = p.category?.trim() || "عام";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [policies]);

  // Filtered Policies
  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const catMatch = selectedCat === "all" || (p.category?.trim() || "عام") === selectedCat;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.isActive : !p.isActive);
      const searchLower = search.toLowerCase().trim();
      const searchMatch =
        !searchLower ||
        p.title?.toLowerCase().includes(searchLower) ||
        p.content?.toLowerCase().includes(searchLower) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(searchLower)));

      return catMatch && statusMatch && searchMatch;
    });
  }, [policies, selectedCat, statusFilter, search]);

  // Actions
  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (policy: PolicyItem) => {
    setEditingPolicy(policy);
    setModalOpen(true);
  };

  const handleSavePolicy = async (formData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    isActive: boolean;
    effectiveAt?: string;
  }) => {
    setIsSaving(true);
    try {
      if (editingPolicy) {
        const res = await apiClient.put(`/policies/${editingPolicy.id}`, formData);
        const updated = (res?.data && (res.data as any).id) ? (res.data as PolicyItem) : { ...editingPolicy, ...formData };
        setPolicies((prev) => prev.map((p) => (p.id === editingPolicy.id ? updated : p)));
        toast.success("تم تحديث السياسة بنجاح");
      } else {
        const res = await apiClient.post("/policies", formData);
        const created = (res?.data && (res.data as any).id)
          ? (res.data as PolicyItem)
          : { id: `pol-${Date.now()}`, ...formData, version: 1 };
        setPolicies((prev) => [created, ...prev]);
        toast.success("تمت إضافة السياسة وحفظها في قاعدة المعرفة بنجاح");
      }
      setModalOpen(false);
    } catch {
      toast.error("حدث خطأ أثناء حفظ السياسة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه السياسة نهائياً؟")) return;
    try {
      await apiClient.delete(`/policies/${id}`);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success("تم حذف السياسة بنجاح");
    } catch {
      toast.error("فشل حذف السياسة");
    }
  };

  const toggleActive = async (policy: PolicyItem) => {
    const newStatus = !policy.isActive;
    try {
      await apiClient.put(`/policies/${policy.id}`, { isActive: newStatus });
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? { ...p, isActive: newStatus } : p))
      );
      toast.success(newStatus ? "تم تفعيل السياسة" : "تم تعطيل السياسة");
    } catch {
      toast.error("فشل تغيير حالة السياسة");
    }
  };

  const handleInstallStarterPack = async (policiesToInstall: StarterPolicy[]) => {
    setIsInstallingPack(true);
    try {
      await apiClient.post("/policies/batch", { items: policiesToInstall });
      toast.success(`تم تثبيت ${policiesToInstall.length} سياسات بنجاح في قاعدة المعرفة`);
      setStarterPackOpen(false);
      await fetchPolicies();
    } catch {
      toast.error("فشل تثبيت حزمة السياسات");
    } finally {
      setIsInstallingPack(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (policies.length === 0) {
      toast.error("لا توجد سياسات لتصديرها");
      return;
    }
    const headers = ["العنوان", "البنود والشروط", "التصنيف", "الكلمات المفتاحية", "الحالة", "تاريخ السريان"];
    const rows = policies.map((p) => [
      `"${(p.title || "").replace(/"/g, '""')}"`,
      `"${(p.content || "").replace(/"/g, '""')}"`,
      `"${(p.category || "عام").replace(/"/g, '""')}"`,
      `"${(Array.isArray(p.tags) ? p.tags.join(", ") : "").replace(/"/g, '""')}"`,
      p.isActive ? "نشط" : "معطل",
      p.effectiveAt ? p.effectiveAt.slice(0, 10) : "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `policies-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير السياسات بنجاح");
  };

  // KPIs
  const activeCount = policies.filter((p) => p.isActive).length;
  const categoriesCount = dynamicCategories.length;

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              إدارة السياسات والشروط والضمانات
            </h1>
            <p className="text-xs text-muted-foreground">
              السياسات المعتمدة المعروضة للعملاء والمستخدمة في إرشادات الذكاء الاصطناعي وبوابات الخدمة
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
              حزم السياسات الجاهزة
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة سياسة جديدة
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي السياسات</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{policies.length}</div>
            <div className="text-[11px] text-muted-foreground">سياسة مسجلة في القاعدة</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>السياسات السارية</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground">مفعلة وتلزم الردود والعملاء</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>التصنيفات المخصصة</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {categoriesCount}
            </div>
            <div className="text-[11px] text-muted-foreground">تصنيف نشط لنشاط شركتك</div>
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
                placeholder="بحث في العنوان، البنود، أو الكلمات المفتاحية..."
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
                الكل ({policies.length})
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
                سارية ({activeCount})
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
                معطلة ({policies.length - activeCount})
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
              <span className="font-mono tabular-nums text-[10px] opacity-80">({policies.length})</span>
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

        {/* Policies Table */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                  <th className="py-2.5 px-4 font-semibold">عنوان السياسة والبنود</th>
                  <th className="py-2.5 px-3 font-semibold text-center">التصنيف</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الكلمات المفتاحية والـ AI</th>
                  <th className="py-2.5 px-3 font-semibold text-center">تاريخ السريان</th>
                  <th className="py-2.5 px-3 font-semibold text-center">الحالة</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      جاري تحميل السياسات من قاعدة المعرفة...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 space-y-2">
                      <div className="text-sm font-semibold text-foreground">لا توجد سياسات تطابق البحث الحالي</div>
                      <p className="text-xs text-muted-foreground">
                        يمكنك إضافة سياسة جديدة أو اختيار حزمة سياسات جاهزة متوافقة مع نشاط شركتك بضغطة زر واحدة
                      </p>
                      <button
                        type="button"
                        onClick={() => setStarterPackOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 transition cursor-pointer mt-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        تصفح حزم السياسات الجاهزة
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((policy) => (
                    <tr key={policy.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-md">
                        <div className="font-semibold text-xs leading-snug">{policy.title}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {policy.content}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground border border-border/60 font-medium">
                          {policy.category || "عام"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center max-w-xs">
                        {Array.isArray(policy.tags) && policy.tags.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {policy.tags.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted/60 text-muted-foreground font-mono"
                              >
                                #{t}
                              </span>
                            ))}
                            {policy.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{policy.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                        {policy.effectiveAt ? policy.effectiveAt.slice(0, 10) : "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleActive(policy)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                            policy.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {policy.isActive ? "سارية" : "معطلة"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewPolicy(policy)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            title="عرض النص الكامل"
                            aria-label="عرض السياسة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(policy)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            title="تعديل"
                            aria-label="تعديل السياسة"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(policy.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition cursor-pointer"
                            title="حذف"
                            aria-label="حذف السياسة"
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

      {/* View Policy Full Text Modal */}
      {viewPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4"
          onClick={() => setViewPolicy(null)}
          dir="rtl"
        >
          <div
            className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-foreground p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h2 className="text-sm sm:text-base font-bold text-foreground">{viewPolicy.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewPolicy(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                {viewPolicy.category}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                تاريخ السريان: {viewPolicy.effectiveAt ? viewPolicy.effectiveAt.slice(0, 10) : "فوري"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 border border-border/60 rounded-xl text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {viewPolicy.content}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewPolicy(null)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      <PolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePolicy}
        editingPolicy={editingPolicy}
        existingCategories={dynamicCategories.map((c) => c.name)}
        isSaving={isSaving}
      />

      {/* Starter Pack Modal */}
      <PolicyStarterPackModal
        isOpen={starterPackOpen}
        onClose={() => setStarterPackOpen(false)}
        onInstall={handleInstallStarterPack}
        isInstalling={isInstallingPack}
      />
    </div>
  );
}
