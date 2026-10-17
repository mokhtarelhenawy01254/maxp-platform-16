import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Check, CheckCircle2, Ban, AlertTriangle, FileText, ExternalLink, DollarSign } from 'lucide-react';
import { ProductionOrder, ProductionOrderStatus } from '../../manufacturingApi';

interface OrderCockpitHeaderProps {
  order: ProductionOrder;
  actionLoading: boolean;
  onRelease: () => void;
  onOpenStartDialog: () => void;
  onCompleteOrder: () => void;
  onOpenCancelDialog: () => void;
  costWarnings: Array<{ rawMaterialId: string; rawMaterialName?: string | null; warning: string }>;
}

export const OrderCockpitHeader: React.FC<OrderCockpitHeaderProps> = ({
  order,
  actionLoading,
  onRelease,
  onOpenStartDialog,
  onCompleteOrder,
  onOpenCancelDialog,
  costWarnings,
}) => {
  const planned = Number(order.plannedQuantity);
  const produced = Number(order.producedQuantity);
  const scrapped = Number(order.scrappedQuantity);
  const progressPercent = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;

  const salePrice = order.salePricePerUnit ? Number(order.salePricePerUnit) : null;
  const orderContractValue = salePrice ? planned * salePrice : null;

  const getOrderTypeBadge = (type?: string) => {
    switch (type) {
      case 'FULL_PACKAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">حزمة كاملة (Full Package)</span>;
      case 'CMT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">تشغيل للغير (CMT)</span>;
      case 'CUSTOMER_MATERIALS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">خامات عميل</span>;
      case 'OUTSOURCED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">تشغيل خارجي</span>;
      case 'SAMPLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">عينة بروتوتايب</span>;
      case 'REWORK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">إعادة تشغيل</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">حزمة كاملة</span>;
    }
  };

  const getStatusBadge = (status: ProductionOrderStatus) => {
    const config: Record<ProductionOrderStatus, { label: string; class: string }> = {
      PLANNED: { label: 'مخطط', class: 'bg-muted text-muted-foreground' },
      RELEASED: { label: 'معتمد للتشغيل', class: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' },
      IN_PROGRESS: { label: 'قيد التشغيل', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      QC_PENDING: { label: 'بانتظار الفحص', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
      COMPLETED: { label: 'مكتمل ومستلم', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
      CANCELLED: { label: 'ملغي', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
    };
    const c = config[status] || { label: status, class: 'bg-muted text-muted-foreground' };
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${c.class}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cockpit Status & Action Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-lg text-foreground">{order.orderNumber}</span>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              كود الـ BOM:{' '}
              <span className="font-mono font-semibold text-foreground">{order.bom?.code}</span>{' '}
              — تاريخ البدء: {order.startDate ? new Date(order.startDate).toLocaleDateString('ar-EG') : 'غير محدد'}
            </p>
          </div>

          {/* Lifecycle Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {order.status === 'PLANNED' && (
              <button
                onClick={onRelease}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>اعتماد التشغيل (RELEASE)</span>
              </button>
            )}

            {order.status === 'RELEASED' && (
              <button
                onClick={onOpenStartDialog}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>بدء التشغيل (START)</span>
              </button>
            )}

            {(order.status === 'IN_PROGRESS' || order.status === 'QC_PENDING') && (
              <button
                onClick={onCompleteOrder}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إقفال أمر الإنتاج (COMPLETE)</span>
              </button>
            )}

            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
              <button
                onClick={onOpenCancelDialog}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>إلغاء الأمر</span>
              </button>
            )}
          </div>
        </div>

        {/* Contract & Customer Layer (Wave 1) */}
        {(order.brandName || order.customer || order.customerOrder || salePrice || order.orderType) && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>{order.brandName || order.customer?.name || 'تصنيع للغير'}</span>
                {order.customerCountry && (
                  <span className="text-[10px] text-muted-foreground font-normal">({order.customerCountry})</span>
                )}
              </div>

              {getOrderTypeBadge(order.orderType)}

              {order.customerOrder && (
                <Link
                  to={`/manufacturing/customer-orders/${order.customerOrderId}`}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary hover:underline bg-background px-2 py-0.5 rounded border border-primary/30"
                >
                  <span>أمر العميل الأب: {order.customerOrder.orderNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums">
              {salePrice && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">سعر القطعة / القيمة:</span>
                  <span className="font-bold text-foreground">
                    {salePrice} ج.م <span className="text-muted-foreground font-normal">({orderContractValue?.toLocaleString()} ج.م)</span>
                  </span>
                </div>
              )}

              {order.customerOrder && order.customerOrder.paidAmount !== undefined && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">تحصيل أمر العميل:</span>
                  <span className="font-bold text-emerald-600">
                    {order.customerOrder.paidAmount.toLocaleString()} ج.م
                  </span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="font-bold text-amber-600">
                    {order.customerOrder.remainingAmount?.toLocaleString()} ج.م متبقي
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress & Metrics Strip */}
        <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[11px] text-muted-foreground block mb-0.5">الكمية المخططة</span>
            <span className="font-mono font-bold text-sm text-foreground">{planned} قطعة</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block mb-0.5">المستلم التام السليم</span>
            <span className="font-mono font-bold text-sm text-emerald-600">{produced} قطعة ({progressPercent}%)</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block mb-0.5">كمية الهالك المسجل</span>
            <span className="font-mono font-bold text-sm text-amber-600">{scrapped} قطعة</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block mb-0.5">التكلفة الفعلية المحققة</span>
            <span className="font-mono font-bold text-sm text-foreground">
              {Number(order.totalCost).toFixed(2)} ج.م{' '}
              {produced > 0 && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({Number(order.unitCost).toFixed(2)} ج.م/ق)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cost Warnings Banner */}
      {costWarnings && costWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">تحذير تكلفة مخزنية (Cost Warnings):</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
              {costWarnings.map((w, i) => (
                <li key={i}>{w.warning || `الخامة ${w.rawMaterialName || w.rawMaterialId} تم صرفها بتكلفة صفر.`}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
