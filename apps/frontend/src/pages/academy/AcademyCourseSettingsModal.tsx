import { useState, useEffect, type FormEvent } from "react";
import { Settings, Globe, Shield, X, Loader2 } from "lucide-react";
import { Course, AcademyStoreProduct } from "./academyApi";

interface AcademyCourseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  storeProducts: AcademyStoreProduct[];
  onSave: (payload: {
    title: string;
    description?: string;
    price: number;
    freePreviewLessons: number;
    storeProductId?: string | null;
    visibility: "PUBLIC" | "UNLISTED" | "INVITE_ONLY" | "TAG_GATED";
    allowedTags: string[];
    enableWatermark: boolean;
    isGlobal: boolean;
  }) => Promise<void>;
}

export function AcademyCourseSettingsModal({
  isOpen,
  onClose,
  course,
  storeProducts,
  onSave,
}: AcademyCourseSettingsModalProps) {
  const [editTitle, setEditTitle] = useState(course.title);
  const [editDesc, setEditDesc] = useState(course.description || "");
  const [editPrice, setEditPrice] = useState(String(course.price || 0));
  const [editFreePreviewCount, setEditFreePreviewCount] = useState(
    String(course.freePreviewLessons || 2)
  );
  const [editStoreProductId, setEditStoreProductId] = useState(
    course.storeProductId || ""
  );
  const [editVisibility, setEditVisibility] = useState<
    "PUBLIC" | "UNLISTED" | "INVITE_ONLY" | "TAG_GATED"
  >(course.visibility || "PUBLIC");
  const [editAllowedTags, setEditAllowedTags] = useState(
    course.allowedTags?.join(", ") || ""
  );
  const [editEnableWatermark, setEditEnableWatermark] = useState(
    course.enableWatermark !== false
  );
  const [editIsGlobal, setEditIsGlobal] = useState(course.isGlobal || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditTitle(course.title);
    setEditDesc(course.description || "");
    setEditPrice(String(course.price || 0));
    setEditFreePreviewCount(String(course.freePreviewLessons || 2));
    setEditStoreProductId(course.storeProductId || "");
    setEditVisibility(course.visibility || "PUBLIC");
    setEditAllowedTags(course.allowedTags?.join(", ") || "");
    setEditEnableWatermark(course.enableWatermark !== false);
    setEditIsGlobal(course.isGlobal || false);
  }, [course]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    try {
      setSaving(true);
      const tagsArray = editAllowedTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onSave({
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        price: Number(editPrice) || 0,
        freePreviewLessons: Number(editFreePreviewCount) || 2,
        storeProductId: editStoreProductId.trim() || null,
        visibility: editVisibility,
        allowedTags: editVisibility === "TAG_GATED" ? tagsArray : [],
        enableWatermark: editEnableWatermark,
        isGlobal: editIsGlobal,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl text-foreground text-right">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                إعدادات الدورة والخصوصية والعلامة المائية
              </h2>
              <p className="text-[11px] text-muted-foreground">تخصيص الوصول، الأسعار، وحماية الملكية الفكرية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              اسم الدورة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              وصف الدورة <span className="text-muted-foreground font-normal">(اختياري)</span>
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                سعر البيع (ج.م)
              </label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                الدروس المجانية (معاينة)
              </label>
              <input
                type="number"
                value={editFreePreviewCount}
                onChange={(e) => setEditFreePreviewCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              ربط بمنتج المتجر (للاشتراك والتسجيل التلقائي فور الدفع)
            </label>
            {storeProducts.length > 0 ? (
              <select
                value={editStoreProductId}
                onChange={(e) => {
                  const selId = e.target.value;
                  setEditStoreProductId(selId);
                  const prod = storeProducts.find((p) => p.id === selId);
                  if (prod && (!editPrice || editPrice === "0")) {
                    setEditPrice(String(prod.price));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- بدون ربط بمنتج متجر --</option>
                {storeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price} ج.م {p.sku ? `- SKU: ${p.sku}` : ""})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editStoreProductId}
                onChange={(e) => setEditStoreProductId(e.target.value)}
                placeholder="ID المنتج في المتجر"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition-all"
              />
            )}
          </div>

          {/* Privacy & Visibility Settings */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نطاق ظهور الدورة (الخصوصية والتحكم في الوصول)
              </label>
              <select
                value={editVisibility}
                onChange={(e: any) => setEditVisibility(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="PUBLIC">عام (معروض للجميع في كتالوج الأكاديمية)</option>
                <option value="UNLISTED">غير مدرج (مخفي من الكتالوج ومتاح برابط مباشر فقط)</option>
                <option value="INVITE_ONLY">خاص / دعوة فقط (لا يظهر إلا للمشتركين المسجلين)</option>
                <option value="TAG_GATED">مخصص لوسوم معينة (يظهر فقط لعملاء بوسوم CRM محددة)</option>
              </select>
            </div>

            {editVisibility === "TAG_GATED" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  الوسوم المصرح لها برؤية الكورس (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  value={editAllowedTags}
                  onChange={(e) => setEditAllowedTags(e.target.value)}
                  placeholder="مثال: vip, agency, media_buyer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition-all"
                />
              </div>
            )}

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={editEnableWatermark}
                onChange={(e) => setEditEnableWatermark(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary border-input accent-primary"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>تفعيل العلامة المائية ضد التسريب (Anti-Leak Watermark)</span>
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  تعرض اسم ورقم هاتف وتوقيت دخول الطالب متحركاً على الفيديو لمنع تصوير الشاشة.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsGlobal}
                onChange={(e) => setEditIsGlobal(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary border-input accent-primary"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span>كورس عام على مستوى المنصة (Global)</span>
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  عند التفعيل، يظهر هذا الكورس تلقائياً في كتالوج جميع التجار على المنصة.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
