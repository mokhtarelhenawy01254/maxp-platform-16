import React, { useState, FormEvent } from 'react';
import { BookOpen, X, Loader2 } from 'lucide-react';
import { AcademyStoreProduct } from './academyApi';

interface AcademyCreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description?: string;
    price: number;
    freePreviewLessons: number;
    storeProductId?: string;
    visibility: 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY' | 'TAG_GATED';
    allowedTags: string[];
    enableWatermark: boolean;
  }) => Promise<void>;
  storeProducts: AcademyStoreProduct[];
}

export const AcademyCreateCourseModal: React.FC<AcademyCreateCourseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  storeProducts,
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('1499');
  const [previewCount, setPreviewCount] = useState('2');
  const [storeProductId, setStoreProductId] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY' | 'TAG_GATED'>('PUBLIC');
  const [allowedTags, setAllowedTags] = useState('');
  const [enableWatermark, setEnableWatermark] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSubmitting(true);
      const tagsArray = allowedTags.split(',').map(t => t.trim()).filter(Boolean);
      await onSubmit({
        title: title.trim(),
        description: desc.trim() || undefined,
        price: Number(price) || 0,
        freePreviewLessons: Number(previewCount) || 2,
        storeProductId: storeProductId.trim() || undefined,
        visibility,
        allowedTags: visibility === 'TAG_GATED' ? tagsArray : [],
        enableWatermark,
      });
      setTitle('');
      setDesc('');
      setAllowedTags('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto text-foreground text-right">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">إنشاء دورة تدريبية جديدة</h2>
              <p className="text-[11px] text-muted-foreground">أضف بيانات الدورة وابدأ في بناء وحداتها ودروسها</p>
            </div>
          </div>
          <button
            type="button"
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
              اسم الدورة التدريبية <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: دبلومة الميديا باير الاحترافية"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              وصف الدورة (الأهداف والنتائج المتوقعة) <span className="text-muted-foreground font-normal">(اختياري)</span>
            </label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن الكورس وما سيتعلمه المتدرب..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                سعر البيع (ج.م)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                الدروس المجانية (معاينة)
              </label>
              <input
                type="number"
                value={previewCount}
                onChange={(e) => setPreviewCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              ربط بمنتج المتجر (للاشتراك التلقائي فور الشراء)
            </label>
            {storeProducts.length > 0 ? (
              <select
                value={storeProductId}
                onChange={(e) => {
                  const selId = e.target.value;
                  setStoreProductId(selId);
                  const prod = storeProducts.find(p => p.id === selId);
                  if (prod && (!price || price === '0' || price === '1499')) {
                    setPrice(String(prod.price));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- بدون ربط بمنتج متجر --</option>
                {storeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price} ج.م {p.sku ? `- SKU: ${p.sku}` : ''})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={storeProductId}
                onChange={(e) => setStoreProductId(e.target.value)}
                placeholder="ID المنتج في المتجر"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              نطاق ظهور الدورة (الخصوصية)
            </label>
            <select
              value={visibility}
              onChange={(e: any) => setVisibility(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="PUBLIC">عام (معروض للجميع في كتالوج الأكاديمية)</option>
              <option value="UNLISTED">غير مدرج (متاح فقط برابط مباشر)</option>
              <option value="INVITE_ONLY">خاص (دعوة وتسجيل يدوي فقط)</option>
              <option value="TAG_GATED">مخصص لوسوم معينة (VIP/CRM)</option>
            </select>
          </div>

          {visibility === 'TAG_GATED' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                الوسوم المصرح لها بالرؤية (مفصولة بفواصل)
              </label>
              <input
                type="text"
                value={allowedTags}
                onChange={(e) => setAllowedTags(e.target.value)}
                placeholder="vip, media_buyer, agency"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="watermarkToggle"
              checked={enableWatermark}
              onChange={(e) => setEnableWatermark(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-input accent-primary"
            />
            <label htmlFor="watermarkToggle" className="text-xs text-foreground cursor-pointer font-medium leading-relaxed">
              تفعيل العلامة المائية الديناميكية لحماية الفيديوهات من التسريب
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
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'جاري الإنشاء...' : 'إنشاء الدورة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
