import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shirt, Calendar, DollarSign, Tag, User } from 'lucide-react';
import { manufacturingApi, BillOfMaterials, SampleMaterialSource } from '../manufacturingApi';

interface CreateSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSampleModal: React.FC<CreateSampleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1);
  const [size, setSize] = useState('L');
  const [color, setColor] = useState('أسود');
  const [materialSource, setMaterialSource] = useState<SampleMaterialSource>('CUSTOMER');
  const [fee, setFee] = useState<string>('2500');
  const [dueDate, setDueDate] = useState<string>('');
  const [designNotes, setDesignNotes] = useState('');
  const [bomId, setBomId] = useState<string>('');

  // BOMs list for optional linking
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

  // Default stages
  const [stages, setStages] = useState<Array<{ name: string; sequence: number }>>([
    { name: 'قص وتجهيز القماش', sequence: 1 },
    { name: 'خياطة وتجميع العينة', sequence: 2 },
    { name: 'تشطيب وكي وفحص الجودة', sequence: 3 },
  ]);

  useEffect(() => {
    if (isOpen) {
      manufacturingApi
        .listBoms()
        .then((res: any) => {
          setBoms(Array.isArray(res) ? res : (res?.items || []));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddStage = () => {
    setStages([...stages, { name: '', sequence: stages.length + 1 }]);
  };

  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, val: string) => {
    const updated = [...stages];
    updated[index].name = val;
    setStages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setError('اسم المنتج إلزامي لإنشاء أمر العينة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validStages = stages
        .filter((s) => s.name.trim())
        .map((s, idx) => ({
          name: s.name.trim(),
          sequence: idx + 1,
        }));

      await manufacturingApi.createSampleOrder({
        productName: productName.trim(),
        customerName: customerName.trim() || undefined,
        brandName: brandName.trim() || undefined,
        plannedQuantity: Number(plannedQuantity) || 1,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        materialSource,
        fee: fee ? Number(fee) : undefined,
        dueDate: dueDate || undefined,
        designNotes: designNotes.trim() || undefined,
        bomId: bomId || undefined,
        stages: validStages.length > 0 ? validStages : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إنشاء أمر العينة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-base font-bold text-foreground">إنشاء أمر تصنيع عينة جديد (SMP)</h2>
            <p className="text-xs text-muted-foreground">
              سجل تفاصيل العينة ومواصفاتها سواء كانت خامة من العميل أو من المصنع
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Row 1: Product & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                اسم المنتج <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="مثال: هودي قطن أوفر سايز (Hoodie Oversized)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Shirt className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">العلامة التجارية (البراند)</label>
              <div className="relative">
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="مثال: Brand Z / Huinzo"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Tag className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Row 2: Customer & BOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                اسم العميل (حر أو غير مسجل)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أحمد مختار / شركة Z للملابس"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                قائمة المكونات (BOM) <span className="text-muted-foreground text-[10px]">(اختياري للعينة)</span>
              </label>
              <select
                value={bomId}
                onChange={(e) => setBomId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">بدون قائمة مكونات مسبقة</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Specs (Qty, Size, Color, Material Source) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">الكمية المطلوبة</label>
              <input
                type="number"
                min="1"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">المقاس</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="L / XL / Oversize"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">اللون</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="أسود / كحلي"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">سعر/تكلفة العينة</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="2500"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
                />
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Row 4: Material Source Toggle & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">مصدر الخامة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialSource('CUSTOMER')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    materialSource === 'CUSTOMER'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة من العميل (CMT)
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialSource('COMPANY')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    materialSource === 'COMPANY'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة من عندنا (كامل)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">موعد التسليم المتوقع</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Row 5: Stages Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">مراحل تشغيل العينة المبسطة</label>
              <button
                type="button"
                onClick={handleAddStage}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة مرحلة
              </button>
            </div>
            <div className="space-y-2">
              {stages.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={st.name}
                    onChange={(e) => handleStageChange(idx, e.target.value)}
                    placeholder="اسم المرحلة"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Row 6: Design Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              ملاحظات التصميم والمواصفات الفنية
            </label>
            <textarea
              rows={2}
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder="تفاصيل التطريز، الطباعة، مواصفات خياطة الجيوب أو الباترون..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء أمر العينة (SMP)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
