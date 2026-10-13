import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Music,
  ImageIcon,
  Video,
  FileText,
  X,
  Briefcase,
  Layers,
  CheckCircle2,
  FileAudio,
  UploadCloud,
} from "lucide-react";
import { uploadService } from "../../services/uploadService";

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: "audio" | "image" | "video" | "other" | string;
  price?: number | string;
  isActive: boolean;
  samples?: Array<{ url: string; originalName: string; type: string }>;
}

const CATEGORIES = [
  { value: "audio", label: "صوتي وموسيقى", icon: Music, accept: "audio/*" },
  { value: "image", label: "تصميم وجرافيك", icon: ImageIcon, accept: "image/*" },
  { value: "video", label: "مونتاج وفيديو", icon: Video, accept: "video/*" },
  { value: "other", label: "خدمات أخرى", icon: FileText, accept: "*/*" },
];

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "srv-1",
    name: "هندسة صوتية ومكساج وماسترينج احترافي",
    description: "معالجة الترددات، إزالة الضوضاء، وضبط مستويات الصوت حسب المعايير العالمية للبث والمنصات.",
    category: "audio",
    price: 1500,
    isActive: true,
    samples: [{ url: "#", originalName: "sample_mastering.wav", type: "audio/wav" }],
  },
  {
    id: "srv-2",
    name: "تصميم هوية بصرية كاملة ودليل العلامة التجارية",
    description: "تصميم الشعار، لوحة الألوان، الخطوط، وتطبيقات المطبوعات مع ملفات المصدر الكاملة.",
    category: "image",
    price: 3500,
    isActive: true,
    samples: [{ url: "#", originalName: "brand_guidelines.pdf", type: "image/png" }],
  },
  {
    id: "srv-3",
    name: "مونتاج فيديو إعلاني ريلز وتيك توك عالي الجاذبية",
    description: "قص إيقاعي سريع، نصوص متحركة مشوقة، مؤثرات صوتية وبصرية محسنة لزيادة المشاهدات والتحويل.",
    category: "video",
    price: 1200,
    isActive: true,
    samples: [{ url: "#", originalName: "reel_preview.mp4", type: "video/mp4" }],
  },
  {
    id: "srv-4",
    name: "صياغة سيناريو وإسكريبت إعلاني تحويلي",
    description: "كتابة نصوص هوك جذابة واستراتيجيات محتوى مبنية على سيكولوجية الشراء المباشر.",
    category: "other",
    price: 800,
    isActive: true,
  },
];

export default function ServiceManagementPage() {
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [modal, setModal] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
        const res = await fetch("/api/v1/services", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length && active) {
          setServices(json.data);
        }
      } catch {
        // Fallbacks active
      }
    };
    fetchServices();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    if (!modal.name?.trim()) return toast.error("يرجى إدخال اسم الخدمة");
    setUploading(true);
    let uploaded = [...(modal.samples || [])];
    try {
      for (const file of sampleFiles) {
        const r = await uploadService.uploadServiceFile(file).catch(() => ({ success: false }));
        if (r.success && r.data) {
          uploaded.push({ url: r.data.url, originalName: r.data.originalName, type: r.data.type });
        }
      }
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      const isNew = !modal.id;
      const res = await fetch(isNew ? "/api/v1/services" : `/api/v1/services/${modal.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...modal, samples: uploaded }),
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success || isNew) {
        const item: ServiceItem = {
          id: modal.id || `srv-${Date.now()}`,
          name: modal.name,
          description: modal.description,
          category: modal.category || "audio",
          price: modal.price ? Number(modal.price) : undefined,
          isActive: modal.isActive !== false,
          samples: uploaded,
        };
        if (isNew) {
          setServices((prev) => [item, ...prev]);
        } else {
          setServices((prev) => prev.map((s) => (s.id === item.id ? item : s)));
        }
        toast.success(isNew ? "تمت إضافة الخدمة بنجاح" : "تم تحديث بيانات الخدمة");
        setModal(null);
        setSampleFiles([]);
      }
    } catch {
      toast.error("فشل حفظ الخدمة");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      await fetch(`/api/v1/services/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("تم حذف الخدمة");
    } catch {
      toast.error("فشل حذف الخدمة");
    }
  };

  const filtered = useMemo(() => {
    if (selectedCat === "all") return services;
    return services.filter((s) => s.category === selectedCat);
  }, [services, selectedCat]);

  const activeCount = services.filter((s) => s.isActive).length;
  const sampleCount = services.reduce((acc, s) => acc + (s.samples?.length || 0), 0);

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">كتالوج الخدمات ونماذج الأعمال</h1>
            <p className="text-xs text-muted-foreground">التحكم في خدمات الصوت والتصميم والمونتاج وعيناتها التسويقية المعروضة للعملاء</p>
          </div>
          <button
            onClick={() => setModal({ name: "", category: "audio", isActive: true })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            إضافة خدمة جديدة
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي الخدمات</span><Layers className="w-4 h-4 text-primary" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{services.length}</div>
            <div className="text-[11px] text-muted-foreground">خدمة مسجلة في الكتالوج</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>الخدمات النشطة</span><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <div className="text-[11px] text-muted-foreground">متاحة للطلب الآن</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>عينات الأعمال</span><FileAudio className="w-4 h-4 text-purple-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{sampleCount}</div>
            <div className="text-[11px] text-muted-foreground">ملف صوتي ومرئي معروض</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
          <button
            onClick={() => setSelectedCat("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCat === "all" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            كل الخدمات ({services.length})
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const count = services.filter((s) => s.category === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => setSelectedCat(c.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCat === c.value ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const catInfo = CATEGORIES.find((c) => c.value === s.category);
            const Icon = catInfo?.icon || Briefcase;
            return (
              <div key={s.id} className="bg-card border border-border/70 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-border transition-colors space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-xs text-foreground truncate">{s.name}</h3>
                        <span className="text-[11px] text-muted-foreground">{catInfo?.label || s.category}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      s.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {s.isActive ? "نشط" : "معطل"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{s.description || "لا يوجد وصف مدخل لهذه الخدمة"}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {s.price ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                        {s.price} ج.م
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-muted-foreground border border-border/60">
                        سعر تقديري عند الطلب
                      </span>
                    )}
                    {s.samples && s.samples.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <FileAudio className="w-3 h-3" />
                        {s.samples.length} عينة
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <button
                    onClick={() => setModal(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    تعديل
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-card border border-border/70 rounded-xl">
              لا توجد خدمات مسجلة في هذا التصنيف
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-lg space-y-4 p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-sm font-bold text-foreground">{modal.id ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">اسم الخدمة *</label>
                <input value={modal.name || ""} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="مثال: هندسة صوتية وماسترينج احترافي" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">وصف الخدمة</label>
                <textarea rows={2} value={modal.description || ""} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="تفاصيل ومخرجات الخدمة للعميل..." className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">التصنيف</label>
                  <select value={modal.category || "audio"} onChange={(e) => setModal({ ...modal, category: e.target.value })} className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">السعر المبدئي (ج.م)</label>
                  <input type="number" value={modal.price || ""} onChange={(e) => setModal({ ...modal, price: e.target.value })} placeholder="اختياري" className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={modal.isActive !== false} onChange={(e) => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                <span className="font-medium text-foreground">الخدمة نشطة ومتاحة للطلب الفوري</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
              <button onClick={() => setModal(null)} className="px-3.5 py-1.5 text-xs rounded-lg border border-border/80 text-foreground hover:bg-muted/50">إلغاء</button>
              <button onClick={handleSave} disabled={uploading} className="px-3.5 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {uploading ? "جاري الحفظ..." : modal.id ? "حفظ التعديلات" : "إضافة الخدمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
