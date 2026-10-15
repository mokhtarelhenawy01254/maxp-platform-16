import React from 'react';
import {
  CircleDollarSign,
  CheckCircle2,
  AlertCircle,
  Package,
  RotateCcw,
  Wallet
} from 'lucide-react';
import { DeliveryRun } from '../../../services/courierService';

interface CourierSettlementFormProps {
  selectedRun: DeliveryRun;
  deliveredShipments: any[];
  returnedShipments: any[];
  expectedDeliveredTotal: number;
  actualCash: number;
  setActualCash: (val: number) => void;
  notes: string;
  setNotes: (val: string) => void;
  selectedAccountId: string;
  setSelectedAccountId: (val: string) => void;
  treasuryAccounts: Array<{ id: string; name: string; type: string; balance: number }>;
  cashDiscrepancy: number;
  submitting: boolean;
  onSettle: () => void;
  formatPrice: (val: number | string) => string;
  formatDate: (date: string) => string;
}

export const CourierSettlementForm: React.FC<CourierSettlementFormProps> = ({
  selectedRun,
  deliveredShipments,
  returnedShipments,
  expectedDeliveredTotal,
  actualCash,
  setActualCash,
  notes,
  setNotes,
  selectedAccountId,
  setSelectedAccountId,
  treasuryAccounts,
  cashDiscrepancy,
  submitting,
  onSettle,
  formatPrice,
  formatDate
}) => {
  const isSettled = selectedRun.status === 'SETTLED';

  return (
    <div className="space-y-6">
      {/* Telemetry Bar for Selected Run */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-4">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">المندوب المسند</div>
          <div className="font-semibold text-foreground text-sm mt-0.5">{selectedRun.courier?.name || 'غير محدد'}</div>
          <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">{selectedRun.courier?.phone || '-'}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">شحنات سلمت</div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 font-mono tabular-nums">
            {deliveredShipments.length} طرد
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">مرتجع أو ملغى</div>
          <div className="font-semibold text-rose-600 dark:text-rose-400 text-sm mt-0.5 font-mono tabular-nums">
            {returnedShipments.length} طرد
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">كاش مطلوب توريده</div>
          <div className="font-semibold text-primary text-sm mt-0.5 font-mono tabular-nums">
            {formatPrice(expectedDeliveredTotal)}
          </div>
        </div>
      </div>

      {/* Settlement Form & Cash Input */}
      <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <CircleDollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-sm text-foreground">إيداع النقدية بخزينة الشركة</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">الخزينة المستلمة للتوريد *</label>
            <select
              value={selectedAccountId}
              disabled={isSettled}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'} - رصيد: {formatPrice(acc.balance)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-foreground mb-1">المبلغ النقدي المستلم فعلياً (ج.م) *</label>
            <input
              type="number"
              step="1"
              min="0"
              disabled={isSettled}
              value={actualCash}
              onChange={(e) => setActualCash(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border/70 rounded-lg font-bold font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums disabled:opacity-50"
            />
          </div>
        </div>

        {/* Discrepancy Alert */}
        {!isSettled && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
              cashDiscrepancy === 0
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : cashDiscrepancy < 0
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {cashDiscrepancy === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-medium">
                {cashDiscrepancy === 0
                  ? 'المبلغ المستلم مطابق تماماً لإجمالي الطرود المسلمة'
                  : cashDiscrepancy < 0
                  ? `عجز في التوريد المالي بقيمة: ${formatPrice(Math.abs(cashDiscrepancy))}`
                  : `فائض في التوريد المالي بقيمة: ${formatPrice(cashDiscrepancy)}`}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">ملاحظات التوريد وإيصال القبض</label>
          <input
            type="text"
            disabled={isSettled}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات تخص الفروق النقدية أو حالة الطرود..."
            className="w-full px-3 py-2 bg-background border border-border/70 rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>

        {/* Action CTA */}
        {isSettled ? (
          <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs text-center font-medium text-muted-foreground">
            تمت تسوية هذه المأمورية وتوريد النقدية بنجاح بتاريخ {formatDate(selectedRun.settledAt || '')}
          </div>
        ) : (
          <button
            onClick={onSettle}
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition active:scale-[0.98] disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {submitting ? 'جاري توريد النقدية وإغلاق الوردية...' : 'تأكيد التوريد وإيداع المبلغ في الخزينة'}
          </button>
        )}
      </div>

      {/* Parcels Breakdown */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span>تفاصيل طرود الوردية ({selectedRun.shipments?.length || 0})</span>
          </div>
          <span className="text-muted-foreground font-normal">المسلمة والمرتجعة</span>
        </div>
        <div className="divide-y divide-border/50 max-h-80 overflow-y-auto text-xs">
          {(!selectedRun.shipments || selectedRun.shipments.length === 0) ? (
            <div className="p-4 text-center text-muted-foreground text-xs">لا توجد طرود مسجلة في هذه الوردية</div>
          ) : (
            selectedRun.shipments.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition">
                <div>
                  <div className="font-mono font-medium text-foreground">{s.order?.orderNumber || s.id}</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    {s.order?.customerName || 'عميل'} {s.order?.city || s.destinationCity ? `- ${s.order?.city || s.destinationCity}` : ''}
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-semibold font-mono tabular-nums text-foreground">
                    {formatPrice(s.collectedAmount !== null && s.collectedAmount !== undefined ? s.collectedAmount : (s.order?.total || 0))}
                  </div>
                  <span
                    className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium mt-0.5 ${
                      s.status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : s.status === 'RETURNED'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {s.status === 'DELIVERED' ? 'تم التسليم' : s.status === 'RETURNED' ? 'مرتجع' : 'مؤجل / جاري'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
