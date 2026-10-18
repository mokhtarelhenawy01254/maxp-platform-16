import React from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { GovernorateAreaSearch } from '../../../components/ui/GovernorateAreaSearch';

export interface WorkspaceCustomerEditFormProps {
  customerName: string;
  customerPhone: string;
  secondaryPhone: string;
  governorate: string;
  city: string;
  shippingAddress: string;
  notes: string;
  isSaving: boolean;
  isArabic: boolean;
  isGovernorateChanged: boolean;
  orderGovernorate?: string;
  orderShipping?: number;
  suggestedShipping: number | null;
  isCalculatingShipping: boolean;
  setCustomerName: (val: string) => void;
  setCustomerPhone: (val: string) => void;
  setSecondaryPhone: (val: string) => void;
  setGovernorate: (val: string) => void;
  setCity: (val: string) => void;
  setShippingAddress: (val: string) => void;
  setNotes: (val: string) => void;
  onCalculateSuggestedShipping: (gov: string, city?: string) => Promise<void>;
  onCancel: () => void;
  onSave: () => void;
}

export const WorkspaceCustomerEditForm: React.FC<WorkspaceCustomerEditFormProps> = ({
  customerName,
  customerPhone,
  secondaryPhone,
  governorate,
  city,
  shippingAddress,
  notes,
  isSaving,
  isArabic,
  isGovernorateChanged,
  orderGovernorate,
  orderShipping = 0,
  suggestedShipping,
  isCalculatingShipping,
  setCustomerName,
  setCustomerPhone,
  setSecondaryPhone,
  setGovernorate,
  setCity,
  setShippingAddress,
  setNotes,
  onCalculateSuggestedShipping,
  onCancel,
  onSave,
}) => {
  return (
    <div className="mt-2.5 space-y-2.5 rounded-md border border-primary/30 bg-muted/20 p-2.5 text-xs">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
            {isArabic ? 'اسم العميل' : 'Customer Name'}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
            {isArabic ? 'رقم الهاتف الأساسي' : 'Primary Phone'}
          </label>
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
            {isArabic ? 'هاتف بديل (اختياري)' : 'Alt Phone (Optional)'}
          </label>
          <input
            type="text"
            value={secondaryPhone}
            onChange={(e) => setSecondaryPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
          {isArabic ? 'المحافظة والمنطقة / المدينة (خريطة الشحن)' : 'Governorate & City / Area'}
        </label>
        <GovernorateAreaSearch
          value={{
            governorate: governorate || '',
            area: city || '',
          }}
          onChange={(next) => {
            const prevGov = governorate;
            setGovernorate(next.governorate);
            setCity(next.area);
            if (next.governorate && next.governorate !== prevGov) {
              void onCalculateSuggestedShipping(next.governorate, next.area);
            }
          }}
          placeholder={isArabic ? 'ابحث عن المحافظة أو المنطقة…' : 'Search governorate / area…'}
        />

        {isGovernorateChanged && (
          <div
            data-testid="governorate-shipping-warning"
            className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-300"
          >
            <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {isArabic
                  ? `⚠️ تم تعديل المحافظة من (${orderGovernorate}) إلى (${governorate})`
                  : `⚠️ Governorate changed from (${orderGovernorate}) to (${governorate})`}
              </p>
              <p className="text-[10px] text-amber-700/90 dark:text-amber-400/90">
                {suggestedShipping !== null
                  ? isArabic
                    ? `سعر الشحن التقديري للمحافظة الجديدة: ${suggestedShipping} ج.م (الحالي بالطلب: ${orderShipping} ج.م). يُرجى تعديل الشحن في بنود الطلب لتفادي فرق السعر.`
                    : `Estimated shipping for new governorate: ${suggestedShipping} (Current: ${orderShipping}). Please update shipping in order items.`
                  : isCalculatingShipping
                  ? (isArabic ? 'جارٍ احتساب تسعيرة الشحن المقترحة…' : 'Calculating suggested shipping rate…')
                  : (isArabic
                    ? 'تنبيه: يُرجى مراجعة وتحديث مصاريف الشحن في قسم المنتجات لتفادي خسارة فارق سعر التوصيل.'
                    : 'Reminder: Please review shipping fee in order items to avoid freight discrepancies.')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
          {isArabic ? 'العنوان بالتفصيل' : 'Detailed Address'}
        </label>
        <textarea
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          rows={2}
          placeholder={isArabic ? 'الشارع، رقم العقار، رقم الشقة، علامة مميزة…' : 'Street, building, apt, landmark…'}
          className="w-full rounded border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
          {isArabic ? 'ملاحظات العميل أو الطلب' : 'Notes'}
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isArabic ? 'ملاحظات خاصة بالتوصيل أو الاستلام…' : 'Special delivery notes…'}
          className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-1.5 pt-1 border-t border-border/30">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer"
        >
          {isArabic ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          <span>{isSaving ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ البيانات' : 'Save Details')}</span>
        </button>
      </div>
    </div>
  );
};

export default WorkspaceCustomerEditForm;
