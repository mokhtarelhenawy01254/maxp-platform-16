import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Music,
  Image as ImageIcon,
  Video,
  FileText,
  X,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileAudio,
} from "lucide-react";
import { uploadService } from "../../services/uploadService";

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: "audio" | "image" | "video" | "other" | string;
  price?: number | string;
  isActive: boolean;
  icon?: string;
  samples?: Array<{ url: string; originalName: string; type: string }>;
}

const CATEGORIES = [
  { value: "audio", label: "صوتي (موسيقى/أغاني)", icon: Music, accept: "audio/*" },
  { value: "image", label: "تصميم (صور)", icon: ImageIcon, accept: "image/*" },
  { value: "video", label: "فيديو (مونتاج)", icon: Video, accept: "video/*" },
  { value: "other", label: "أخرى", icon: FileText, accept: "*/*" },
];

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function ServiceManagementPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [uploadingSamples, setUploadingSamples] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const r = await fetch(`/api/v1/services`, { headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) setServices(d.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadNewSamples = async (): Promise<any[]> => {
    if (sampleFiles.length === 0) return modal.samples || [];
    setUploadingSamples(true);
    const uploaded: any[] = [...(modal.samples || [])];
    for (const file of sampleFiles) {
      const r = await uploadService.uploadServiceFile(file);
      if (r.success && r.data) {
        uploaded.push({ url: r.data.url, originalName: r.data.originalName, type: r.data.type });
      } else {
        toast.error(`فشل رفع: ${file.name}`);
      }
    }
    setUploadingSamples(false);
    return uploaded;
  };

  const save = async () => {
    if (!modal.name?.trim()) return tToast.error("ServiceManagementPage.name_required_6f37");
    const isNew = !modal.id;
    const samples = await uploadNewSamples();
    try {
      const r = await fetch(isNew ? `/api/v1/services` : `/api/v1/services/${modal.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { ...authHeaders() as any, "Content-Type": "application/json" },
        body: JSON.stringify({ ...modal, samples }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(isNew ? "تمت إضافة الخدمة بنجاح" : "تم تحديث بيانات الخدمة");
        setModal(null);
        setSampleFiles([]);
        fetchServices();
      } else {
        toast.error(d.error || "حدث خطأ أثناء الحفظ");
      }
    } catch (e) {
      tToast.error("ServiceManagementPage.error_error_0d92");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    try {
      const r = await fetch(`/api/v1/services/${id}`, { method: "DELETE", headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) {
        tToast.success("ServiceManagementPage.msg_9174");
        fetchServices();
      }
    } catch (e) {
      tToast.error("ServiceManagementPage.error_error_0d92");
    }
  };

  const filteredServices = useMemo(() => {
    if (selectedCategory === "all") return services;
    return services.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const samples = services.reduce((acc, s) => acc + (s.samples?.length || 0), 0);
    return { total, active, samples };
  }, [services]);

  const getCategoryIcon = (category: string) => {
    const matched = CATEGORIES.find((c) => c.value === category);
    if (!matched) return Briefcase;
    return matched.icon;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل الخدمات...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              إدارة الكتالوج
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} خدمة مسجلة
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            إدارة الخدمات وعينات الإنتاج
          </h1>
          <p className="text-xs text-muted-foreground">
            التحكم في خدمات الصوت والتصميم والمونتاج وعيناتها التسويقية المعروضة للعملاء
          </p>
        </div>

        <button
          onClick={() => setModal({ name: "", category: "audio", isActive: true })}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="w-4 h-4" />
          إضافة خدمة جديدة
        </button>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي الخدمات</div>
            <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">الخدمات النشطة</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.active}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">عينات الأعمال المرفوعة</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
              {stats.samples}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <FileAudio className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          كل الخدمات ({services.length})
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = services.filter((s) => s.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">لا توجد خدمات في هذا التصنيف</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            قم بالضغط على "إضافة خدمة جديدة" للبدء في إدراج خدماتك ونماذج أعمالها
          </p>
          <button
            onClick={() => setModal({ name: "", category: selectedCategory === "all" ? "audio" : selectedCategory, isActive: true })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة خدمة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((s) => {
            const CatIcon = getCategoryIcon(s.category);
            const categoryInfo = CATEGORIES.find((c) => c.value === s.category);
            return (
              <div
                key={s.id}
                className={`group bg-card border border-border/80 hover:border-primary/40 rounded-xl p-4.5 transition-all shadow-xs flex flex-col justify-between ${
                  !s.isActive ? "opacity-60 bg-muted/20" : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {s.name}
                        </h3>
                        <span className="text-[11px] text-muted-foreground">
                          {categoryInfo?.label || s.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.isActive ? "نشط" : "معطل"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {s.description || "لا يوجد وصف مدخل لهذه الخدمة"}
                  </p>

                  {/* Meta Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {s.price ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono tabular-nums">
                        {s.price} ج.م
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground">
                        سعر مخصص
                      </span>
                    )}

                    {s.samples && s.samples.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono tabular-nums">
                        <FileAudio className="w-3 h-3" />
                        {s.samples.length} عينة
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2 pt-4 mt-3 border-t border-border/60">
                  <button
                    onClick={() => setModal(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/60 text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="inline-flex items-center justify-center p-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="حذف الخدمة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => {
            setModal(null);
            setSampleFiles([]);
          }}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {modal.id ? "تعديل الخدمة" : "إضافة خدمة جديدة"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setModal(null);
                  setSampleFiles([]);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">اسم الخدمة *</label>
                <input
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="مثال: هندسة صوتية وماسترينج احترافي"
                  value={modal.name || ""}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">وصف الخدمة</label>
                <textarea
                  rows={2}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="تفاصيل الخدمة وما يحصل عليه العميل..."
                  value={modal.description || ""}
                  onChange={(e) => setModal({ ...modal, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">التصنيف</label>
                  <select
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={modal.category || "audio"}
                    onChange={(e) => setModal({ ...modal, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">السعر المقترح (ج.م)</label>
                  <input
                    type="number"
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="اختياري"
                    value={modal.price || ""}
                    onChange={(e) => setModal({ ...modal, price: e.target.value })}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary"
                  checked={modal.isActive !== false}
                  onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
                />
                <span className="font-medium text-foreground">الخدمة نشطة ومتاحة للطلب الآن</span>
              </label>

              {/* Samples Section */}
              <div className="pt-3 border-t border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground">
                    عينات ونماذج الأعمال السابقة
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {CATEGORIES.find((c) => c.value === modal.category)?.label}
                  </span>
                </div>

                {modal.samples?.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {modal.samples.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted/30 border border-border/60 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {s.type?.startsWith("image/") ? (
                            <ImageIcon className="w-4 h-4 shrink-0 text-purple-500" />
                          ) : s.type?.startsWith("video/") ? (
                            <Video className="w-4 h-4 shrink-0 text-purple-500" />
                          ) : s.type?.startsWith("audio/") ? (
                            <Music className="w-4 h-4 shrink-0 text-purple-500" />
                          ) : (
                            <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{s.originalName || "عينة مرفوعة"}</span>
                        </div>
                        <button
                          onClick={() =>
                            setModal({
                              ...modal,
                              samples: modal.samples.filter((_: any, j: number) => j !== i),
                            })
                          }
                          className="text-red-500 hover:text-red-700 p-1 rounded-sm"
                          title="حذف العينة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                    <UploadCloud className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-[11px] text-foreground font-medium">
                      اضغط لاختيار ملفات العينات
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      (صوت، صور، أو فيديو بحسب نوع الخدمة)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept={CATEGORIES.find((c) => c.value === modal.category)?.accept || "*/*"}
                      onChange={(e) =>
                        setSampleFiles((prev) => [...prev, ...Array.from(e.target.files || [])])
                      }
                      className="hidden"
                    />
                  </label>

                  {sampleFiles.length > 0 && (
                    <div className="space-y-1">
                      {sampleFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md"
                        >
                          <span className="truncate">{f.name}</span>
                          <button
                            onClick={() =>
                              setSampleFiles((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-4 border-t border-border/80">
              <button
                onClick={save}
                disabled={uploadingSamples || !modal.name?.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {uploadingSamples ? "جاري رفع العينات..." : "حفظ التغييرات"}
              </button>
              <button
                onClick={() => {
                  setModal(null);
                  setSampleFiles([]);
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
