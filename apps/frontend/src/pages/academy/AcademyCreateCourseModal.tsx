import React, { useState, FormEvent } from 'react';
import { BookOpen, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-card border border-border/70 rounded-xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">إنشاء دورة تدريبية جديدة</h2>
              <p className="text-xs text-muted-foreground">أضف بيانات الدورة وابدأ في بناء وحداتها ودروسها</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              اسم الدورة التدريبية *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: دبلومة الميديا باير الاحترافية"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              وصف الدورة (الأهداف والنتائج المتوقعة)
            </label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن الكورس وما سيتعلمه المتدرب..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                سعر البيع (ج.م)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                عدد الدروس المجانية (معاينة)
              </label>
              <input
                type="number"
                value={previewCount}
                onChange={(e) => setPreviewCount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
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
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
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
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              نطاق ظهور الدورة (الخصوصية)
            </label>
            <select
              value={visibility}
              onChange={(e: any) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            >
              <option value="PUBLIC">عام (معروض للجميع في كتالوج الأكاديمية)</option>
              <option value="UNLISTED">غير مدرج (متاح فقط برابط مباشر)</option>
              <option value="INVITE_ONLY">خاص (دعوة وتسجيل يدوي فقط)</option>
              <option value="TAG_GATED">مخصص لوسوم معينة (VIP/CRM)</option>
            </select>
          </div>

          {visibility === 'TAG_GATED' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                الوسوم المصرح لها بالرؤية (مفصولة بفواصل)
              </label>
              <input
                type="text"
                value={allowedTags}
                onChange={(e) => setAllowedTags(e.target.value)}
                placeholder="vip, media_buyer, agency"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="watermarkToggle"
              checked={enableWatermark}
              onChange={(e) => setEnableWatermark(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border/70"
            />
            <label htmlFor="watermarkToggle" className="text-xs text-foreground cursor-pointer font-medium">
              تفعيل العلامة المائية الديناميكية لحماية الفيديوهات من التسريب
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition"
            >
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الدورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
