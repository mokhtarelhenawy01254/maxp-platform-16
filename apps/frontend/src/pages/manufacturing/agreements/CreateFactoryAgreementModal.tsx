import React, { useState, useEffect } from 'react';
import { X, Building2, FileSignature, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { manufacturingApi, FactoryAgreement, FactoryAgreementPricingMode } from '../manufacturingApi';

interface CreateFactoryAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAgreement: FactoryAgreement) => void;
  initialFactoryId?: string;
}

export const CreateFactoryAgreementModal: React.FC<CreateFactoryAgreementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFactoryId,
}) => {
  const [factories, setFactories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);

  // Form fields
  const [partnerFactoryId, setPartnerFactoryId] = useState<string>(initialFactoryId || '');
  const [title, setTitle] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [pricingMode, setPricingMode] = useState<FactoryAgreementPricingMode>('PER_PIECE');
  const [totalValue, setTotalValue] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EGP');
  const [orderId, setOrderId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 10 Terms
  const [activeTermsTab, setActiveTermsTab] = useState<'ops' | 'quality' | 'delivery'>('ops');
  const [scopeOfOperations, setScopeOfOperations] = useState<string>('');
  const [productsDesc, setProductsDesc] = useState<string>('');
  const [quantitiesNotes, setQuantitiesNotes] = useState<string>('');
  const [qualityTerms, setQualityTerms] = useState<string>('');
  const [materialOwnership, setMaterialOwnership] = useState<string>('');
  const [wastePolicy, setWastePolicy] = useState<string>('');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('');
  const [reworkPolicy, setReworkPolicy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingInitial(true);
    setError(null);

    Promise.all([
      manufacturingApi.listPartnerFactories({ isActive: true }).catch(() => ({ data: [] })),
      manufacturingApi.listOrders({ limit: 50 }).catch(() => ({ data: [] })),
    ])
      .then(([fRes, oRes]) => {
        setFactories(fRes.data || []);
        setOrders(oRes.data || []);
        if (initialFactoryId) setPartnerFactoryId(initialFactoryId);
      })
      .finally(() => setLoadingInitial(false));
  }, [isOpen, initialFactoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFactoryId) {
      setError('يرجى اختيار المصنع الشريك');
      return;
    }
    if (!title.trim()) {
      setError('عنوان الاتفاقية مطلوب');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Partial<FactoryAgreement> = {
        partnerFactoryId,
        title: title.trim(),
        code: code.trim() || undefined,
        pricingMode,
        totalValue: totalValue ? Number(totalValue) : undefined,
        currency,
        orderId: orderId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        scopeOfOperations: scopeOfOperations.trim() || undefined,
        productsDesc: productsDesc.trim() || undefined,
        quantitiesNotes: quantitiesNotes.trim() || undefined,
        qualityTerms: qualityTerms.trim() || undefined,
        materialOwnership: materialOwnership.trim() || undefined,
        wastePolicy: wastePolicy.trim() || undefined,
        deliveryTerms: deliveryTerms.trim() || undefined,
        reworkPolicy: reworkPolicy.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await manufacturingApi.createFactoryAgreement(payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ الاتفاقية');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                إنشاء اتفاقية جديدة لمصنع شريك
              </h2>
              <p className="text-xs text-muted-foreground">
                اتفاق تشغيل مستقل ببنوده التعاقدية وجدول دفعاته المنفصل عن عقد العميل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Section 1: Basic Agreement Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. البيانات الأساسية للاتفاقية
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  المصنع الشريك <span className="text-destructive">*</span>
                </label>
                <select
                  value={partnerFactoryId}
                  onChange={(e) => setPartnerFactoryId(e.target.value)}
                  disabled={loadingInitial}
                  className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المصنع الشريك --</option>
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.code ? `(${f.code})` : ''} - {f.specialty || 'عام'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  عنوان أو مسمى الاتفاقية <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: اتفاقية حياكة وتشطيب دفعة الشتاء"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  نوع التسعير والاتفاق
                </label>
                <select
                  value={pricingMode}
                  onChange={(e) => setPricingMode(e.target.value as FactoryAgreementPricingMode)}
                  className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="PER_PIECE">سعر بالقطعة (Per Piece)</option>
                  <option value="PER_STAGE">سعر بالمرحلة (Per Stage)</option>
                  <option value="HOURLY">سعر بالساعة التشغيلية (Hourly)</option>
                  <option value="FIXED">مقطوعية ثابتة للتشغيلة (Fixed Batch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  إجمالي قيمة الاتفاقية (ج.م)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="مثال: 12000"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className="w-full text-xs py-2 px-3 pr-8 bg-background border border-border rounded-lg text-foreground font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  ربط بأمر إنتاج وتشغيل (اختياري)
                </label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="">-- بدون ربط أمر الآن --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.brandName || 'بدون علامة'} ({o.plannedQuantity} قطعة)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    تاريخ البدء
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs py-2 px-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs py-2 px-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contractual Terms (البنود العشرة) */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                2. بنود ومواصفات الاتفاقية (Terms & Policies)
              </h3>
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTermsTab('ops')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTermsTab === 'ops' ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  العمليات والكميات
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTermsTab('quality')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTermsTab === 'quality' ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  الجودة والهالك
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTermsTab('delivery')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTermsTab === 'delivery' ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  التسليم وإعادة التشغيل
                </button>
              </div>
            </div>

            {activeTermsTab === 'ops' && (
              <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    نطاق العمليات المسندة (Scope of Operations)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="حدد العمليات المطلوبة من المصنع (قص، تطريز، حياكة كاملة، تشطيب وتغليف)..."
                    value={scopeOfOperations}
                    onChange={(e) => setScopeOfOperations(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    وصف المنتجات والموديلات (Products Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="وصف تفصيلي للموديلات وأنواع الأقمشة المستهدفة بالتشغيل..."
                    value={productsDesc}
                    onChange={(e) => setProductsDesc(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    ملاحظات الكميات والتشغيل (Quantities Notes)
                  </label>
                  <input
                    type="text"
                    placeholder="ملاحظات حول الحد الأدنى للتشغيل، الدفعات الجزئية، إلخ..."
                    value={quantitiesNotes}
                    onChange={(e) => setQuantitiesNotes(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTermsTab === 'quality' && (
              <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    شروط ومعايير الجودة ومستوى الفحص (Quality Terms)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شروط الفحص النهائي، معايير المقاسات والعيوب المسموحة AQL..."
                    value={qualityTerms}
                    onChange={(e) => setQualityTerms(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    ملكية الخامات والتوريدات (Material Ownership)
                  </label>
                  <input
                    type="text"
                    placeholder="الخامات المسلمة ملك للشركة ولا يجوز استخدامها لغير أمر التشغيل..."
                    value={materialOwnership}
                    onChange={(e) => setMaterialOwnership(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    سياسة الهالك ونسب التفاوت المسموحة (Waste Policy)
                  </label>
                  <input
                    type="text"
                    placeholder="نسبة الهالك القصوى المسموحة (مثلاً 2%) وما زاد يتحمله المصنع..."
                    value={wastePolicy}
                    onChange={(e) => setWastePolicy(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTermsTab === 'delivery' && (
              <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    شروط ومواعيد التسليم (Delivery Terms)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مكان التسليم، طريقة الشحن، التزام المصنع بالجدول الزمني..."
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    سياسة إعادة التشغيل والإصلاح (Rework Policy)
                  </label>
                  <input
                    type="text"
                    placeholder="إعادة تشغيل القطع المعيبة على نفقة المصنع خلال مدة أقصاها 48 ساعة..."
                    value={reworkPolicy}
                    onChange={(e) => setReworkPolicy(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    ملاحظات عامة وإضافية (General Notes)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أي اتفاقات خاصة إضافية بين الطرفين..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium border border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'جاري الإنشاء...' : 'حفظ كمسودة (DRAFT)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFactoryAgreementModal;
