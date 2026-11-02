import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Globe, Copy, Check } from 'lucide-react';
import { SampleOrder, manufacturingApi } from '../../manufacturingApi';

export interface SampleInfoTabProps {
  sample: SampleOrder;
  isAddingExpense: boolean;
  setIsAddingExpense: (val: boolean) => void;
  expenseNameInput: string;
  setExpenseNameInput: (val: string) => void;
  expenseAmountInput: string;
  setExpenseAmountInput: (val: string) => void;
  expenseSubmitting: boolean;
  onAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const SampleInfoTab: React.FC<SampleInfoTabProps> = ({
  sample,
  isAddingExpense,
  setIsAddingExpense,
  expenseNameInput,
  setExpenseNameInput,
  expenseAmountInput,
  setExpenseAmountInput,
  expenseSubmitting,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [portalUrl, setPortalUrl] = useState<string | null>(() => {
    if (sample.customerPortalUrl) {
      return sample.customerPortalUrl.startsWith('http')
        ? sample.customerPortalUrl
        : `${window.location.origin}${sample.customerPortalUrl}`;
    }
    return null;
  });
  const [copiedPortal, setCopiedPortal] = useState(false);

  useEffect(() => {
    if (sample.customerPortalUrl) {
      setPortalUrl(
        sample.customerPortalUrl.startsWith('http')
          ? sample.customerPortalUrl
          : `${window.location.origin}${sample.customerPortalUrl}`
      );
    } else if (sample.id) {
      manufacturingApi
        .listSampleShareLinks(sample.id)
        .then((links) => {
          const cust = links.find((l) => l.kind === 'CUSTOMER' && !l.revokedAt);
          if (cust?.token) {
            setPortalUrl(`${window.location.origin}/share/sample/${cust.token}`);
          }
        })
        .catch(() => {});
    }
  }, [sample.id, sample.customerPortalUrl]);

  const handleCopyPortalLink = async () => {
    if (!portalUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(portalUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = portalUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedPortal(true);
      setTimeout(() => setCopiedPortal(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="space-y-3 text-xs">
      {portalUrl && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-xs text-foreground block">بوابة العميل</span>
              <span className="text-[11px] text-muted-foreground truncate block font-mono" dir="ltr">
                {portalUrl}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyPortalLink}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1 shrink-0 transition-colors"
            title="نسخ رابط بوابة العميل"
          >
            {copiedPortal ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedPortal ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>
      )}
      {sample.items && sample.items.length > 0 && (
        <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-foreground text-xs">منتجات العينة ({sample.items.length})</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              إجمالي الكمية: {sample.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)} قطعة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="py-1 px-1 font-medium">المنتج</th>
                  <th className="py-1 px-1 font-medium">الكمية</th>
                  <th className="py-1 px-1 font-medium">المقاس</th>
                  <th className="py-1 px-1 font-medium">اللون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sample.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-muted/30">
                    <td className="py-1.5 px-1 font-medium text-foreground">{it.productName}</td>
                    <td className="py-1.5 px-1 tabular-nums">{it.quantity}</td>
                    <td className="py-1.5 px-1">{it.size || '-'}</td>
                    <td className="py-1.5 px-1">{it.color || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">اسم المنتج:</span>
          <span className="font-bold text-foreground">
            {sample.productName}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">العميل:</span>
          <span className="font-medium">
            {sample.customerName || 'عميل غير مسجل'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">العلامة التجارية:</span>
          <span className="font-medium">{sample.brandName || '-'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">الكمية:</span>
          <span className="font-semibold tabular-nums">
            {sample.plannedQuantity} قطعة
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">المقاس / اللون:</span>
          <span className="font-semibold">
            {sample.size || '-'} / {sample.color || '-'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">مصدر الخامة:</span>
          <span className="font-medium">
            {sample.materialSource === 'CUSTOMER'
              ? 'خامة من العميل (CMT)'
              : 'خامة من المصنع'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">سعر / تكلفة العينة:</span>
          <span className="font-bold text-foreground tabular-nums">
            {sample.fee ? `${sample.fee} ج.م` : 'غير محدد'}
          </span>
        </div>
        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-muted-foreground">
            المصاريف ({sample.expenses?.length || 0}):
          </span>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">
              {Number(sample.expensesTotal || 0).toLocaleString()} ج.م
            </span>
            {sample.status !== 'CONVERTED' && !isAddingExpense && (
              <button
                type="button"
                onClick={() => setIsAddingExpense(true)}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-0.5"
                title="إضافة مصروف للعينة"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>إضافة</span>
              </button>
            )}
          </div>
        </div>

        {isAddingExpense && (
          <div className="p-2 rounded bg-muted/40 border border-border/70 space-y-2 mb-1">
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="اسم المصروف (مثال: شحن)"
                value={expenseNameInput}
                onChange={(e) => setExpenseNameInput(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-border bg-background"
              />
              <input
                type="number"
                placeholder="المبلغ (ج.م)"
                min="0"
                value={expenseAmountInput}
                onChange={(e) => setExpenseAmountInput(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-border bg-background"
              />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={expenseSubmitting || !expenseNameInput.trim()}
                onClick={onAddExpense}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {expenseSubmitting ? 'جاري الإضافة...' : 'حفظ'}
              </button>
            </div>
          </div>
        )}

        {sample.expenses?.map((ex) => (
          <div
            key={ex.id}
            className="flex justify-between items-center text-[11px] text-muted-foreground pr-2 border-b pb-1"
          >
            <span className="flex items-center gap-1.5">
              {sample.status !== 'CONVERTED' && (
                <button
                  type="button"
                  onClick={() => onDeleteExpense(ex.id)}
                  className="hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="حذف هذا المصروف"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-rose-600" />
                </button>
              )}
              <span>· {ex.name}</span>
            </span>
            <span className="tabular-nums font-medium text-foreground">
              {Number(ex.amount).toLocaleString()} ج.م
            </span>
          </div>
        ))}

        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">
            التكلفة الإجمالية للعينة:
          </span>
          <span className="font-bold text-foreground tabular-nums">
            {Number(sample.totalCost || 0).toLocaleString()} ج.م
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">موعد تسليم العميل:</span>
          <span className="font-medium tabular-nums">
            {sample.dueDate
              ? new Date(sample.dueDate).toLocaleDateString('ar-EG')
              : '-'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">المصنع المنفذ:</span>
          <span className="font-semibold text-foreground">
            {sample.partnerFactory?.name || 'بدون مصنع'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">موعد استلام المصنع:</span>
          <span className="font-medium tabular-nums">
            {sample.expectedDeliveryAt
              ? new Date(sample.expectedDeliveryAt).toLocaleDateString('ar-EG')
              : 'غير محدد'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">حالة استلام العينة:</span>
          <div>
            {sample.sampleReceived ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  تم الاستلام{' '}
                  {sample.receivedAt
                    ? `(${new Date(sample.receivedAt).toLocaleDateString(
                        'ar-EG'
                      )})`
                    : ''}
                </span>
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                في انتظار الاستلام من المصنع
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">الحساب المالي:</span>
          <span className="font-bold text-foreground tabular-nums">
            {(() => {
              const total =
                sample.totalAmount !== null && sample.totalAmount !== undefined
                  ? Number(sample.totalAmount)
                  : Number(sample.fee || 0);
              const paid = Number(sample.paidAmount || 0);
              const rem =
                sample.remaining !== undefined
                  ? Number(sample.remaining)
                  : total - paid;
              return `إجمالي: ${total.toLocaleString()} · مدفوع: ${paid.toLocaleString()} · متبقي: ${rem.toLocaleString()} ج.م`;
            })()}
          </span>
        </div>
      </div>

      {sample.designNotes && (
        <div className="p-3 rounded-xl border border-border/70 bg-muted/20">
          <p className="font-semibold text-foreground mb-1">
            ملاحظات التصميم:
          </p>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {sample.designNotes}
          </p>
        </div>
      )}
    </div>
  );
};
