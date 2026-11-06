export interface StatusConfig {
  labelAr: string;
  labelEn: string;
  badgeClass: string;
}

export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  INCOMPLETE: {
    labelAr: 'غير مكتملة (مسودة)',
    labelEn: 'Incomplete / Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  PENDING: {
    labelAr: 'قيد الانتظار',
    labelEn: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  CONFIRMED: {
    labelAr: 'تم التأكيد',
    labelEn: 'Confirmed',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  ASSIGNED: {
    labelAr: 'مسندة للمندوب / قيد التنفيذ',
    labelEn: 'Assigned to Courier',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  },
  PICKED_UP: {
    labelAr: 'مسلمة للمندوب',
    labelEn: 'Handed to Courier',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800',
  },
  RECEIVED_AT_HUB: {
    labelAr: 'تم الاستلام في الهاَب',
    labelEn: 'Received at Hub',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800',
  },
  IN_TRANSIT: {
    labelAr: 'قيد النقل',
    labelEn: 'In Transit',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
  },
  OUT_FOR_DELIVERY: {
    labelAr: 'خرجت للتوصيل',
    labelEn: 'Out for Delivery',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  },
  POSTPONED: {
    labelAr: 'مؤجلة مع المندوب',
    labelEn: 'Postponed with Courier',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
  },
  DELIVERED: {
    labelAr: 'تم التسليم بنجاح',
    labelEn: 'Delivered',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  PARTIALLY_DELIVERED: {
    labelAr: 'تسليم جزئي',
    labelEn: 'Partially Delivered',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  REMITTED: {
    labelAr: 'تم التوريد',
    labelEn: 'Remitted / Settled',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
  },
  FAILED: {
    labelAr: 'تعذر التسليم / معلقة',
    labelEn: 'Delivery Failed',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
  FAILED_ATTEMPT: {
    labelAr: 'محاولة فاشلة',
    labelEn: 'Failed Attempt',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
  },
  RETURNED_AT_COMPANY: {
    labelAr: 'مرتجعات في الشركة',
    labelEn: 'Returned at Company Hub',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  },
  RETURNED_RECEIVED: {
    labelAr: 'مرتجعات وصلتني',
    labelEn: 'Returns Received by Merchant',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-400 dark:border-fuchsia-800',
  },
  RETURNED_DAMAGED: {
    labelAr: 'مرتجعات معدومة',
    labelEn: 'Damaged / Write-off',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  },
  RETURNED_LOST: {
    labelAr: 'مرتجعات مفقودة',
    labelEn: 'Lost in Transit',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  },
  RESHIPPED: {
    labelAr: 'معاد إرسالها',
    labelEn: 'Reshipped',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800',
  },
  RETURNED: {
    labelAr: 'مرتجع',
    labelEn: 'Returned',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
  CLOSED: {
    labelAr: 'مغلقة',
    labelEn: 'Closed',
    badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  },
  CANCELLED: {
    labelAr: 'ملغية',
    labelEn: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

export const PICKUP_STATUS_CONFIGS: Record<string, StatusConfig> = {
  REQUESTED: {
    labelAr: 'مطلوب',
    labelEn: 'Requested',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  SCHEDULED: {
    labelAr: 'مجدول',
    labelEn: 'Scheduled',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  ASSIGNED: {
    labelAr: 'تم الإسناد للمندوب',
    labelEn: 'Assigned',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
  },
  COMPLETED: {
    labelAr: 'مكتمل',
    labelEn: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  CANCELLED: {
    labelAr: 'ملغي',
    labelEn: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

export function getStatusBadge(status?: string | null, isEn = false) {
  const norm = (status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIGS[norm] || {
    labelAr: norm,
    labelEn: norm,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };
  return {
    label: isEn ? config.labelEn : config.labelAr,
    badgeClass: config.badgeClass,
  };
}

export function getPickupStatusBadge(status?: string | null, isEn = false) {
  const norm = (status || 'REQUESTED').toUpperCase();
  const config = PICKUP_STATUS_CONFIGS[norm] || {
    labelAr: norm,
    labelEn: norm,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };
  return {
    label: isEn ? config.labelEn : config.labelAr,
    badgeClass: config.badgeClass,
  };
}

export async function printShipmentLabel(
  shipmentId: string,
  trackingNumber?: string,
  template: string = 'WAYBILL',
  copies: number = 1
) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(
      `/api/v1/shipping-portal/shipments/${shipmentId}/print?template=${encodeURIComponent(template)}&copies=${copies}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'فشل تحميل مستند الشحن');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.toLowerCase()}-${trackingNumber || shipmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err: any) {
    console.error('Print error:', err);
    alert(err.message || 'حدث خطأ أثناء طباعة المستند');
  }
}

export async function printBatchShipments(
  shipmentIds: string[],
  template: string = 'WAYBILL',
  copies: number = 1
) {
  if (!shipmentIds || shipmentIds.length === 0) {
    alert('يرجى تحديد شحنة واحدة على الأقل للطباعة');
    return;
  }
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/v1/shipping-portal/print/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipmentIds,
        template,
        copies,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'فشل توليد ملف الطباعة المجمع');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${template.toLowerCase()}-${shipmentIds.length}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err: any) {
    console.error('Batch print error:', err);
    alert(err.message || 'حدث خطأ أثناء الطباعة المجمعة');
  }
}

export async function downloadOrdersImportTemplate() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/v1/shipping-portal/orders/import-template', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error('فشل تحميل نموذج الاستيراد');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders_import_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err: any) {
    console.error('Download template error:', err);
    alert(err.message || 'تعذر تحميل نموذج الاستيراد');
  }
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount?: number | null, currency = 'EGP'): string {
  if (amount === undefined || amount === null) return `0 ${currency}`;
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export interface ShippingBranch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  governorate: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupRequest {
  id: string;
  companyId: string;
  merchantId?: string | null;
  pickupNumber: string;
  status: string;
  scheduledDate: string;
  timeSlot?: string | null;
  contactName: string;
  contactPhone: string;
  pickupAddress: string;
  city?: string | null;
  governorate: string;
  expectedParcels: number;
  actualParcels?: number | null;
  assignedCourierId?: string | null;
  branchId?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: ShippingBranch | null;
  assignedCourier?: { id: string; name: string; phone?: string } | null;
  shipments?: Array<{ id: string; trackingNumber?: string; barcode?: string; status: string; recipientName?: string }>;
}
