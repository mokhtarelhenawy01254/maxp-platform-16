import { useState, useEffect, useMemo } from "react";
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
        if (isNew) setServices((prev) => [item, ...prev]);
        else setServices((prev) => prev.map((s) => (s.id === item.id ? item : s)));
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
    <div className="w-full space-y-3.5" dir="rtl">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
            <Briefcase className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">كتالوج الخدمات ونماذج الأعمال</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />{services.length} خدمة
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">التحكم في خدمات الصوت والتصميم والمونتاج وعيناتها التسويقية المعروضة للعملاء</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ name: "", category: "audio", isActive: true })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-xs active:scale-[0.98]"
        >
          <Plus className="size-3.5" /><span>إضافة خدمة جديدة</span>
        </button>
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الخدمات</span>
            <Layers className="size-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{services.length}</div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">خدمة مسجلة في الكتالوج</p>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الخدمات النشطة</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">متاحة للطلب الفوري</p>
        </div>
        <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">عينات الأعمال</span>
            <FileAudio className="size-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{sampleCount}</div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ملف صوتي ومرئي معروض</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60 no-scrollbar">
        <button
          onClick={() => setSelectedCat("all")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            selectedCat === "all" ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80" : "text-muted-foreground hover:text-foreground"
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
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCat === c.value ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" /><span>{c.label} ({count})</span>
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
            <div key={s.id} className="rounded-xl border border-border/80 bg-card/40 p-3.5 shadow-xs flex flex-col justify-between hover:border-border transition-colors space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xs text-foreground truncate">{s.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">{catInfo?.label || s.category}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    s.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {s.isActive ? "نشط" : "معطل"}
                  </span>
                </div>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{s.description}</p>}
                {s.samples && s.samples.length > 0 && (
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground block">نماذج معروضة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s.samples.map((sm, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-muted/40 border border-border/60 text-foreground">
                          <FileAudio className="size-2.5 text-primary" /><span className="truncate max-w-[120px]">{sm.originalName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {s.price ? `${Number(s.price).toLocaleString()} ج.م` : "سعر مخصص"}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setModal(s); setSampleFiles([]); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60" title="تعديل">
                    <Pencil className="size-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-500/10" title="حذف">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <div className="col-span-full py-10 text-center text-xs font-mono text-muted-foreground rounded-xl border border-border/80 bg-card/40">
            لا توجد خدمات في هذا التصنيف حالياً
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-lg space-y-3.5 p-4.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
              <h2 className="text-xs sm:text-sm font-bold text-foreground">{modal.id ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="size-4" /></button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1 text-[11px]">اسم الخدمة *</label>
                <input
                  value={modal.name || ""}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  placeholder="مثال: هندسة صوتية وتوزيع موسيقي"
                  className="w-full bg-background/50 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-foreground mb-1 text-[11px]">التصنيف</label>
                  <select
                    value={modal.category || "audio"}
                    onChange={(e) => setModal({ ...modal, category: e.target.value })}
                    className="w-full bg-background/50 border border-border/70 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1 text-[11px]">السعر التقديري (ج.م)</label>
                  <input
                    type="number"
                    value={modal.price || ""}
                    onChange={(e) => setModal({ ...modal, price: e.target.value })}
                    placeholder="1500"
                    className="w-full bg-background/50 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1 text-[11px]">وصف الخدمة ومميزاتها</label>
                <textarea
                  rows={2}
                  value={modal.description || ""}
                  onChange={(e) => setModal({ ...modal, description: e.target.value })}
                  placeholder="تفاصيل التنفيذ والمخرجات المسلمة للعميل..."
                  className="w-full bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1 text-[11px]">رفع عينات أعمال إضافية</label>
                <label className="border border-dashed border-border/80 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors">
                  <UploadCloud className="size-5 text-muted-foreground mb-1" />
                  <span className="text-[11px] text-muted-foreground font-mono">اختر ملفات (صوت، فيديو، تصميم)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) setSampleFiles(Array.from(e.target.files));
                    }}
                  />
                </label>
                {sampleFiles.length > 0 && <p className="text-[10px] font-mono text-muted-foreground mt-1">تم اختيار {sampleFiles.length} ملفات جاهزة للرفع</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border/70">
              <button onClick={() => setModal(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border/70 text-foreground hover:bg-muted/50 font-mono">إلغاء</button>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 font-mono active:scale-[0.98] disabled:opacity-50"
              >
                {uploading ? "جاري الرفع والحفظ..." : modal.id ? "حفظ التعديلات" : "إضافة الخدمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
