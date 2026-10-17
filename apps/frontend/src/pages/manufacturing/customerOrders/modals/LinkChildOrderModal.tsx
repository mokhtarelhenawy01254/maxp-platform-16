import React, { useState, useEffect } from 'react';
import { X, Link2, Plus, Factory, DollarSign, Layers } from 'lucide-react';
import {
  manufacturingApi,
  BillOfMaterials,
  ProductionOrder,
  ProductionOrderType,
} from '../../manufacturingApi';

interface LinkChildOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerOrderId: string;
  brandName?: string | null;
  customerId?: string | null;
  currency?: string;
  onChildLinked: () => void;
}

export const LinkChildOrderModal: React.FC<LinkChildOrderModalProps> = ({
  isOpen,
  onClose,
  customerOrderId,
  brandName,
  customerId,
  currency = 'EGP',
  onChildLinked,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [unlinkedOrders, setUnlinkedOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link mode state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [linkSalePrice, setLinkSalePrice] = useState<number>(0);
  const [linkOrderType, setLinkOrderType] = useState<ProductionOrderType>('FULL_PACKAGE');

  // Create mode state
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(500);
  const [createSalePrice, setCreateSalePrice] = useState<number>(150);
  const [createOrderType, setCreateOrderType] = useState<ProductionOrderType>('FULL_PACKAGE');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        manufacturingApi.listOrders().catch(() => []),
        manufacturingApi.listBoms({ isActive: true }).catch(() => []),
      ]).then(([allOrders, allBoms]) => {
        // Filter unlinked orders
        const available = allOrders.filter((o) => !o.customerOrderId);
        setUnlinkedOrders(available);
        if (available.length > 0) {
          setSelectedOrderId(available[0].id);
          setLinkSalePrice(available[0].salePricePerUnit || 0);
          setLinkOrderType(available[0].orderType || 'FULL_PACKAGE');
        }

        setBoms(allBoms);
        if (allBoms.length > 0) {
          setSelectedBomId(allBoms[0].id);
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'link') {
        if (!selectedOrderId) {
          setError('يرجى اختيار أمر تشغيل للربط');
          setSubmitting(false);
          return;
        }

        await manufacturingApi.linkOrCreateChildOrder(customerOrderId, {
          existingOrderId: selectedOrderId,
          orderType: linkOrderType,
          salePricePerUnit: Number(linkSalePrice) || 0,
        });
      } else {
        if (!selectedBomId || plannedQuantity <= 0) {
          setError('يرجى اختيار قائمة المكونات وتحديد كمية أكبر من الصفر');
          setSubmitting(false);
          return;
        }

        await manufacturingApi.linkOrCreateChildOrder(customerOrderId, {
          bomId: selectedBomId,
          plannedQuantity: Number(plannedQuantity),
          salePricePerUnit: Number(createSalePrice) || 0,
          orderType: createOrderType,
          customerId: customerId || undefined,
          brandName: brandName || undefined,
        });
      }

      onChildLinked();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل ربط أمر التشغيل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">إضافة / ربط أمر تشغيل فرعي (Work Order)</h2>
              <p className="text-[11px] text-muted-foreground">تخصيص كميات التشغيل وسعر بيع القطعة وتحديد نمط التصنيع</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Link vs Create */}
        <div className="px-5 pt-3 border-b border-border/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              mode === 'link'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>ربط أمر تشغيل موجود</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              mode === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء أمر تشغيل جديد مرتبط</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {mode === 'link' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  اختر أمر الإنتاج المراد ربطه بالعقد
                </label>
                {unlinkedOrders.length === 0 ? (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center text-muted-foreground">
                    لا توجد أوامر تشغيل حرة غير مرتبطة حالياً. يمكنك التبديل لخيار «إنشاء أمر تشغيل جديد».
                  </div>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => {
                      setSelectedOrderId(e.target.value);
                      const ord = unlinkedOrders.find((o) => o.id === e.target.value);
                      if (ord) {
                        setLinkSalePrice(ord.salePricePerUnit || 0);
                        setLinkOrderType(ord.orderType || 'FULL_PACKAGE');
                      }
                    }}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {unlinkedOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.bom?.name || 'موديل'} ({o.plannedQuantity} قطعة)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    نمط التصنيع
                  </label>
                  <select
                    value={linkOrderType}
                    onChange={(e) => setLinkOrderType(e.target.value as ProductionOrderType)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="FULL_PACKAGE">حزمة كاملة (Full Package)</option>
                    <option value="CMT">تشغيل للغير قص وخياطة (CMT)</option>
                    <option value="CUSTOMER_MATERIALS">تشغيل بخامات العميل</option>
                    <option value="OUTSOURCED">تشغيل خارجي لدى الغير</option>
                    <option value="SAMPLE">عينة / بروتوتايب (Sample)</option>
                    <option value="REWORK">إعادة تشغيل (Rework)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    سعر بيع القطعة للعميل ({currency})
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linkSalePrice}
                      onChange={(e) => setLinkSalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  قائمة المكونات المعتمدة (BOM) *
                </label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name} (v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    الكمية المخططة (قطعة) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={plannedQuantity}
                    onChange={(e) => setPlannedQuantity(parseInt(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    سعر بيع القطعة للعميل ({currency}) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={createSalePrice}
                      onChange={(e) => setCreateSalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  نمط التصنيع المطلوب
                </label>
                <select
                  value={createOrderType}
                  onChange={(e) => setCreateOrderType(e.target.value as ProductionOrderType)}
                  className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="FULL_PACKAGE">حزمة كاملة (Full Package - قماش + تصنيع)</option>
                  <option value="CMT">تشغيل للغير (CMT - قص وخياطة فقط)</option>
                  <option value="CUSTOMER_MATERIALS">تشغيل بخامات العميل</option>
                  <option value="OUTSOURCED">تشغيل خارجي لدى الغير</option>
                  <option value="SAMPLE">عينة / بروتوتايب (Sample)</option>
                  <option value="REWORK">إعادة تشغيل (Rework)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">القيمة التقديرية للأمر الفرعي:</span>
                <span className="font-mono font-bold text-primary text-sm tabular-nums">
                  {(plannedQuantity * createSalePrice).toLocaleString()} {currency}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || (mode === 'link' && unlinkedOrders.length === 0)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'جاري الحفظ...' : mode === 'link' ? 'تأكيد الربط' : 'إنشاء وربط أمر التشغيل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
