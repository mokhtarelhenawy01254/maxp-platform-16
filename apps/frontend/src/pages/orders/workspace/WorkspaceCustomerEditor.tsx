import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilSquareIcon,
  CheckIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import { GovernorateAreaSearch } from '../../../components/ui/GovernorateAreaSearch';
import { WorkspaceOrder, AgentWorkload } from './types';

interface WorkspaceCustomerEditorProps {
  order: WorkspaceOrder;
  isArabic: boolean;
  isManager?: boolean;
  agents?: AgentWorkload[];
  onAssignOrder?: (orderId: string, targetUserId: string) => Promise<void>;
  onSaveCustomer?: (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

export const parseCleanAddress = (rawAddress?: string): string => {
  if (!rawAddress) return '';
  try {
    const parsed = JSON.parse(rawAddress);
    if (parsed && typeof parsed === 'object') {
      return (
        parsed.address ||
        parsed.detailedAddress ||
        parsed.street ||
        Object.values(parsed).filter((v) => typeof v === 'string').join(' ')
      );
    }
  } catch {
    // rawAddress is plain text
  }
  return rawAddress;
};

export const WorkspaceCustomerEditor: React.FC<WorkspaceCustomerEditorProps> = ({
  order,
  isArabic,
  isManager,
  agents = [],
  onAssignOrder,
  onSaveCustomer,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(order.secondaryPhone || '');
  const [governorate, setGovernorate] = useState(order.governorate || '');
  const [city, setCity] = useState(order.city || '');
  const [shippingAddress, setShippingAddress] = useState(parseCleanAddress(order.shippingAddress));
  const [notes, setNotes] = useState(order.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedShipping, setSuggestedShipping] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const isGovernorateChanged = Boolean(
    order.governorate && governorate && governorate.trim() !== order.governorate.trim(),
  );

  useEffect(() => {
    setIsEditing(false);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setSecondaryPhone(order.secondaryPhone || '');
    setGovernorate(order.governorate || '');
    setCity(order.city || '');
    setShippingAddress(parseCleanAddress(order.shippingAddress));
    setNotes(order.notes || '');
    setSuggestedShipping(null);
  }, [order.id]);

  const calculateSuggestedShipping = async (targetGov: string, targetCity?: string) => {
    if (!targetGov) return;
    try {
      setIsCalculatingShipping(true);
      const response = await apiClient.post('/turbo/calculate', {
        weight: 1,
        governorate: targetGov,
        city: targetCity || targetGov,
        address: shippingAddress || '',
        orderId: order.id,
        cod: order.total,
      });

      if (response.data?.success) {
        const data = response.data.data;
        const cost = Number(data?.cost || data?.price || data?.shippingCost);
        if (Number.isFinite(cost)) {
          setSuggestedShipping(cost);
        }
      }
    } catch {
      // Graceful fallback: UI displays reminder warning
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handleSave = async () => {
    if (!onSaveCustomer) return;
    try {
      setIsSaving(true);
      await onSaveCustomer(order.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        // سلسلة فارغة صريحة كي يحذف الخادم phone2 من العنوان — undefined كان يتجاهَل
        // فيبقى الرقم القديم مخزنًا ويظهر من جديد بعد الحفظ
        secondaryPhone: secondaryPhone.trim(),
        governorate: governorate.trim(),
        city: city.trim(),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim(),
      });
      if (isGovernorateChanged) {
        toast.warning(
          isArabic
            ? 'تنبيه: تم تعديل المحافظة. يرجى التأكد من تحديث سعر الشحن للطلب لتفادي فرق السعر.'
            : 'Notice: Governorate updated. Please verify and update order shipping rate.',
        );
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-foreground truncate">
          {customerName || (isArabic ? 'عميل بدون اسم' : 'Unnamed Customer')}
        </h3>
        {onSaveCustomer && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded p-0.5 text-muted-foreground hover:text-primary transition-colors"
            title={isArabic ? 'تعديل بيانات العميل' : 'Edit Customer'}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground" dir="ltr">
        {customerPhone ? (
          <span className="inline-flex items-center gap-1">
            {/* اتصال بنقرة: البديل الأول لما هاتف الوورك-سبيس يكون أوفلاين */}
            <a
              href={`tel:${customerPhone.replace(/\s/g, '')}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
              title={isArabic ? 'اتصال بالرقم من الجهاز الحالي' : 'Dial this number'}
            >
              {customerPhone}
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(customerPhone).then(
                  () => toast.success(isArabic ? 'تم نسخ الرقم' : 'Number copied'),
                  () => toast.error(isArabic ? 'تعذر النسخ' : 'Copy failed'),
                );
              }}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              title={isArabic ? 'نسخ الرقم' : 'Copy number'}
              aria-label={isArabic ? 'نسخ رقم العميل' : 'Copy customer number'}
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span>{isArabic ? 'بدون هاتف' : 'No phone'}</span>
        )}
        {secondaryPhone && secondaryPhone !== customerPhone && (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
            <span className="text-[10px] text-muted-foreground">{isArabic ? 'بديل:' : 'Alt:'}</span>
            <a
              href={`tel:${secondaryPhone.replace(/\s/g, '')}`}
              className="hover:text-primary hover:underline"
              title={isArabic ? 'اتصال بالرقم البديل' : 'Dial alternate number'}
            >
              {secondaryPhone}
            </a>
          </span>
        )}
      </div>

      {isEditing ? (
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
                setGovernorate(next.governorate);
                setCity(next.area);
              }}
              placeholder={isArabic ? 'ابحث عن المحافظة أو المنطقة…' : 'Search governorate / area…'}
            />
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
              onClick={() => setIsEditing(false)}
              className="rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>{isSaving ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ البيانات' : 'Save Details')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="leading-snug">
            {[order.governorate, order.city, parseCleanAddress(order.shippingAddress)].filter(Boolean).join(' • ') || '—'}
          </span>
        </div>
      )}

      {isManager && agents.length > 0 && onAssignOrder && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {isArabic ? 'الموظف المسؤول:' : 'Assigned Agent:'}
            </span>
            <span className="font-medium text-primary">
              {order.assignedToName || (isArabic ? 'غير موزع' : 'Unassigned')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">{isArabic ? 'تعيين:' : 'Assign:'}</span>
            <select
              value={order.assignedTo || ''}
              onChange={(e) => {
                if (e.target.value) {
                  void onAssignOrder(order.id, e.target.value);
                }
              }}
              className="h-6 rounded border border-border/60 bg-background px-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="" disabled>
                {isArabic ? 'اختر موظف…' : 'Select agent…'}
              </option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.pendingCount})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
