import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Shirt, Calendar, DollarSign, Tag, User, Building2 } from 'lucide-react';
import {
  manufacturingApi,
  SampleOrder,
  SampleOrderStatus,
  SampleMaterialSource,
  PartnerFactory,
} from '../manufacturingApi';

interface EditSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: SampleOrder | null;
  onUpdated: () => void;
}

export const EditSampleModal: React.FC<EditSampleModalProps> = ({
  isOpen,
  onClose,
  sample,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1);
  const [size, setSize] = useState('L');
  const [color, setColor] = useState('أسود');
  const [materialSource, setMaterialSource] = useState<SampleMaterialSource>('CUSTOMER');
  const [fee, setFee] = useState<string>('2500');
  const [totalAmount, setTotalAmount] = useState<string>('2500');
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [partnerFactoryId, setPartnerFactoryId] = useState<string>('');
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState<SampleOrderStatus>('DRAFT');
  const [sampleReceived, setSampleReceived] = useState<boolean>(false);
  const [receivedAt, setReceivedAt] = useState<string>('');
  const [designNotes, setDesignNotes] = useState('');

  // Factories list
  const [factories, setFactories] = useState<PartnerFactory[]>([]);

  useEffect(() => {
    if (isOpen) {
      manufacturingApi
        .listPartnerFactories()
        .then((res: any) => {
          setFactories(Array.isArray(res) ? res : res?.items || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (sample && isOpen) {
      setProductName(sample.productName || '');
      setBrandName(sample.brandName || '');
      setCustomerName(sample.customerName || (sample.customer ? `${sample.customer.firstName ?? ''} ${sample.customer.lastName ?? ''}`.trim() : ''));
      setPlannedQuantity(sample.plannedQuantity ? Number(sample.plannedQuantity) : 1);
      setSize(sample.size || 'L');
      setColor(sample.color || 'أسود');
      setMaterialSource(sample.materialSource || 'CUSTOMER');
      setFee(sample.fee !== null && sample.fee !== undefined ? String(sample.fee) : '');
      setTotalAmount(sample.totalAmount !== null && sample.totalAmount !== undefined ? String(sample.totalAmount) : '');
      setDepositAmount(sample.depositAmount !== null && sample.depositAmount !== undefined ? String(sample.depositAmount) : '0');
      setPartnerFactoryId(sample.partnerFactoryId || '');
      setExpectedDeliveryAt(sample.expectedDeliveryAt ? new Date(sample.expectedDeliveryAt).toISOString().slice(0, 10) : '');
      setDueDate(sample.dueDate ? new Date(sample.dueDate).toISOString().slice(0, 10) : '');
      setStatus(sample.status || 'DRAFT');
      setSampleReceived(Boolean(sample.sampleReceived));
      setReceivedAt(sample.receivedAt ? new Date(sample.receivedAt).toISOString().slice(0, 10) : '');
      setDesignNotes(sample.designNotes || '');
      setError(null);
    }
  }, [sample, isOpen]);

  if (!isOpen || !sample) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setError('اسم المنتج إلزامي');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Partial<SampleOrder> & Record<string, any> = {
        productName: productName.trim(),
        customerName: customerName.trim() || undefined,
        brandName: brandName.trim() || undefined,
        plannedQuantity: Number(plannedQuantity) || 1,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        materialSource,
        fee: fee !== '' ? Number(fee) : undefined,
        totalAmount: totalAmount !== '' ? Number(totalAmount) : undefined,
        depositAmount: depositAmount !== '' ? Number(depositAmount) : 0,
        partnerFactoryId: partnerFactoryId || undefined,
        expectedDeliveryAt: expectedDeliveryAt || undefined,
        dueDate: dueDate || undefined,
        status,
        sampleReceived,
        receivedAt: sampleReceived ? (receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString()) : undefined,
        designNotes: designNotes.trim() || undefined,
      };

      await manufacturingApi.updateSampleOrder(sample.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update sample order', err);
      setError(err?.response?.data?.message || err?.message || 'تعذر تعديل أمر العينة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shirt className="w-5 h-5 text-primary" />
              <span>
                تعديل أمر العينة: <span className="font-mono text-primary">{sample.sampleNumber}</span>
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تعديل بيانات المنتج، العميل، التكاليف، والمصنع المنفذ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-muted-foreground" />
                <span>اسم المنتج / العينة *</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثال: هودي قطن أوفر سايز، تيشيرت رياضي..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Customer / Brand */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>اسم العميل</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم العميل..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>اسم البراند التجاري</span>
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="مثال: Khemet, Nike..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">حالة العينة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SampleOrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DRAFT">مسودة (Draft)</option>
                <option value="IN_PROGRESS">قيد التنفيذ (In Progress)</option>
                <option value="APPROVED">معتمدة جاهزة للتحويل (Approved)</option>
                <option value="REJECTED">مرفوضة (Rejected)</option>
                <option value="CANCELLED">ملغاة (Cancelled)</option>
              </select>
            </div>

            {/* Material Source */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">مصدر القماش والخامة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialSource('CUSTOMER')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    materialSource === 'CUSTOMER'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة العميل
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialSource('COMPANY')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    materialSource === 'COMPANY'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  خامة من عندنا
                </button>
              </div>
            </div>

            {/* Quantity, Size, Color */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">الكمية والمقاس واللون</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="1"
                  value={plannedQuantity}
                  onChange={(e) => setPlannedQuantity(parseInt(e.target.value, 10) || 1)}
                  placeholder="الكمية"
                  className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                />
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="المقاس (L)"
                  className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="اللون"
                  className="px-2 py-2 text-xs rounded-lg border border-border bg-background text-foreground text-center"
                />
              </div>
            </div>

            {/* Partner Factory */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>المصنع المنفذ للعينة</span>
              </label>
              <select
                value={partnerFactoryId}
                onChange={(e) => setPartnerFactoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">بدون مصنع (تنفيذ داخلي)</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.code ? `(${f.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Financials: Fee, Total, Deposit */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span>إجمالي القيمة المطلوبة (ج.م)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span>تكلفة إعداد العينة (ج.م)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Expected Delivery & Due Date */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>تاريخ التسليم المتوقع</span>
              </label>
              <input
                type="date"
                value={expectedDeliveryAt}
                onChange={(e) => setExpectedDeliveryAt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>تاريخ الاستحقاق النهائي</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Sample Received Checkbox & Date */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={sampleReceived}
                onChange={(e) => setSampleReceived(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20"
              />
              <span>تم استلام العينة الفعلية من المصنع / الورشة</span>
            </label>
            {sampleReceived && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">تاريخ الاستلام:</span>
                <input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-border bg-background text-foreground"
                />
              </div>
            )}
          </div>

          {/* Design Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">ملاحظات ومواصفات العينة</label>
            <textarea
              rows={3}
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder="تفاصيل التطريز، الطباعة، قياسات الباترون، أي مواصفات خاصة..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSampleModal;
