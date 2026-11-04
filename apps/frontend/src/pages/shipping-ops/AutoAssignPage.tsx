import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Calendar,
  MapPin,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Package,
} from 'lucide-react';
import { formatCurrency } from './shippingOpsShared';

interface CourierOption {
  id: string;
  name: string;
  phone: string;
  status: string;
  zones: string[];
  currentLoad: number;
}

interface AssignmentItem {
  shipmentId: string;
  trackingNumber?: string;
  recipientName?: string;
  destinationGovernorate?: string;
  destinationCity?: string;
  codAmount?: number;
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  reason?: string;
  applied?: boolean;
}

interface UnassignedItem {
  shipmentId: string;
  orderNumber?: string;
  trackingNumber?: string;
  destinationGovernorate?: string;
  reason?: string;
  details?: string;
}

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الدقهلية', 'الغربية',
  'المنوفية', 'الشرقية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية',
  'السويس', 'البحيرة', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط',
  'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح'
];

export const AutoAssignPage: React.FC = () => {
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [governorate, setGovernorate] = useState('');
  const [date, setDate] = useState('');
  const [strategy, setStrategy] = useState<'LEAST_LOAD' | 'ROUND_ROBIN' | 'ZONE_PRIORITY'>('LEAST_LOAD');

  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [loadingAuto, setLoadingAuto] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedItem[]>([]);
  const [selectedCourierMap, setSelectedCourierMap] = useState<Record<string, string>>({});
  const [hasApplied, setHasApplied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const token = localStorage.getItem('token');

  // Load couriers on mount
  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    setLoadingCouriers(true);
    try {
      const res = await fetch('/api/v1/shipping-assign/couriers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCouriers(data.data);
      }
    } catch (err) {
      console.error('Failed to load couriers:', err);
    } finally {
      setLoadingCouriers(false);
    }
  };

  const handleSuggest = async () => {
    setLoadingSuggest(true);
    setStatusMessage(null);
    setHasApplied(false);
    try {
      const res = await fetch('/api/v1/shipping-assign/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filters: {
            governorate: governorate || undefined,
            date: date || undefined,
          },
          strategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب مقترحات التوزيع');

      const items: AssignmentItem[] = data.assignments || [];
      setAssignments(items);
      setUnassigned(data.unassigned || []);

      // Pre-fill selection map with suggested courierIds
      const initialMap: Record<string, string> = {};
      items.forEach((item) => {
        if (item.courierId) {
          initialMap[item.shipmentId] = item.courierId;
        }
      });
      setSelectedCourierMap(initialMap);

      if (items.length === 0 && (data.unassigned || []).length === 0) {
        setStatusMessage({ text: 'لا توجد شحنات معلقة مطابقة للفلاتر المحددة', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'حدث خطأ أثناء اقتراح التوزيع', type: 'error' });
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleRetryAfterCourier = async () => {
    await fetchCouriers();
    await handleSuggest();
  };

  const handleApply = async () => {
    const payloadAssignments = assignments
      .map((item) => ({
        shipmentId: item.shipmentId,
        courierId: selectedCourierMap[item.shipmentId] || item.courierId,
      }))
      .filter((a): a is { shipmentId: string; courierId: string } => Boolean(a.courierId));

    if (payloadAssignments.length === 0) {
      setStatusMessage({ text: 'لا توجد شحنات صالحة للإسناد', type: 'error' });
      return;
    }

    setLoadingApply(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/shipping-assign/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignments: payloadAssignments,
          unassigned,
          failed: unassigned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'فشل تطبيق التوزيع');

      setHasApplied(true);
      if (Array.isArray(data.failed)) {
        setUnassigned(data.failed);
      } else if (Array.isArray(data.unassigned)) {
        setUnassigned(data.unassigned);
      }
      const totalCount = (data.assignedCount || 0) + (data.failedCount || 0);
      setStatusMessage({
        text: data.failedCount > 0
          ? `تم الإسناد: ${data.assignedCount} مُسندة، و${data.failedCount} لم يتم إسنادها (من إجمالي ${totalCount})`
          : `تم إسناد ${data.assignedCount} شحنة بنجاح إلى رحلات DRAFT للمناديب!`,
        type: 'success',
      });
      fetchCouriers();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'حدث خطأ أثناء تطبيق التوزيع', type: 'error' });
    } finally {
      setLoadingApply(false);
    }
  };

  const handleAutoAssign = async () => {
    setLoadingAuto(true);
    setStatusMessage(null);
    setHasApplied(false);
    try {
      const res = await fetch('/api/v1/shipping-assign/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          governorate: governorate || undefined,
          date: date || undefined,
          strategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التوزيع التلقائي الفوري');

      const items: AssignmentItem[] = data.assignments || [];
      setAssignments(items);
      setUnassigned(data.unassigned || []);
      setHasApplied(true);

      const initialMap: Record<string, string> = {};
      items.forEach((item) => {
        if (item.courierId) initialMap[item.shipmentId] = item.courierId;
      });
      setSelectedCourierMap(initialMap);

      setStatusMessage({
        text: `تم التوزيع والتطبيق الفوري بنجاح: ${data.assignedCount} مُسندة، ${data.failedCount} غير مسندة`,
        type: 'success',
      });
      fetchCouriers();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'حدث خطأ أثناء التوزيع التلقائي', type: 'error' });
    } finally {
      setLoadingAuto(false);
    }
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'NO_COURIER_COVERAGE':
      case 'NO_COURIER_IN_ZONE':
        return 'لا يوجد مندوب يغطي المحافظة';
      case 'CAPACITY_EXCEEDED':
      case 'ALL_AT_CAPACITY':
        return 'المناديب وصلوا للحد الأقصى اليومي';
      case 'ZONE_NOT_SERVED':
        return 'المنطقة غير مخدومة / تعذر تحديد المحافظة';
      case 'INVALID_STATUS':
        return 'شحنة منتهية/مسلّمة/ملغاة';
      case 'MATCH_ZONE':
      default:
        return reason || 'تطابق النطاق الجغرافي';
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-4 p-3 sm:p-6" dir="rtl">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            التوزيع التلقائي للشحنات على المناديب
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            توزيع واقتراح ذكي حسب المحافظات والحمل وساعات العمل مع إمكانية المراجعة والتعديل اليدوي قبل التطبيق
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoAssign}
            disabled={loadingAuto || loadingSuggest || loadingApply}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loadingAuto ? 'جاري التوزيع والتطبيق...' : 'توزيع تلقائي مباشر'}
          </button>
        </div>
      </div>

      {/* Filter Control Chassis */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> المحافظة
            </label>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full text-xs sm:text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">جميع المحافظات</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> تاريخ الإنشاء
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs sm:text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> استراتيجية التوزيع
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full text-xs sm:text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="LEAST_LOAD">أقل حمل حالي (LEAST_LOAD - افتراضي)</option>
              <option value="ROUND_ROBIN">توزيع دائري منتظم (ROUND_ROBIN)</option>
              <option value="ZONE_PRIORITY">أولوية المنطقة الأساسية (ZONE_PRIORITY)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {couriers.length > 0 ? `${couriers.length} مندوب نشط متاح للتوزيع` : 'جاري تحميل المناديب...'}
          </div>
          <button
            onClick={handleSuggest}
            disabled={loadingSuggest || loadingAuto}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Play className="h-3.5 w-3.5 text-primary" />
            {loadingSuggest ? 'جاري الفحص والاقتراح...' : 'اقترح التوزيع'}
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Suggested Assignments Table */}
      {assignments.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-foreground">
                المقترحات ({assignments.length} شحنة)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                مقترح
              </span>
              {hasApplied && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  مُسند
                </span>
              )}
            </div>

            <button
              onClick={handleApply}
              disabled={loadingApply || hasApplied}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {loadingApply ? 'جاري التطبيق...' : hasApplied ? 'تم التطبيق بنجاح' : `تطبيق التوزيع (${assignments.length})`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-3 font-medium">الشحنة</th>
                  <th className="py-2.5 px-3 font-medium">الوجهة</th>
                  <th className="py-2.5 px-3 font-medium">العميل والمبلغ</th>
                  <th className="py-2.5 px-3 font-medium">المندوب المختار</th>
                  <th className="py-2.5 px-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assignments.map((item) => {
                  const currentCourierId = selectedCourierMap[item.shipmentId] || item.courierId || '';
                  return (
                    <tr key={item.shipmentId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{item.trackingNumber || item.shipmentId.slice(-8)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-foreground">{item.destinationGovernorate || '—'}</span>
                        {item.destinationCity && (
                          <span className="text-muted-foreground text-[11px] block">{item.destinationCity}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-foreground block">{item.recipientName || 'عميل'}</span>
                        <span className="text-muted-foreground text-[11px] font-mono">
                          {formatCurrency(item.codAmount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          disabled={hasApplied}
                          value={currentCourierId}
                          onChange={(e) =>
                            setSelectedCourierMap((prev) => ({
                              ...prev,
                              [item.shipmentId]: e.target.value,
                            }))
                          }
                          className="text-xs bg-background border border-input rounded-md px-2 py-1 focus:ring-1 focus:ring-primary outline-none max-w-[200px]"
                        >
                          <option value="">اختر مندوب...</option>
                          {couriers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.currentLoad} شحنة)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        {hasApplied ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> مُسند
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                            مقترح
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned / Failed Shipments */}
      {unassigned.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:px-4 py-2.5 bg-rose-50/40 dark:bg-rose-950/20 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              لم يتم الإسناد ({unassigned.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetryAfterCourier}
                disabled={loadingSuggest || loadingApply || loadingAuto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                إعادة المحاولة بعد إضافة مندوب
              </button>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                فشل
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-3 font-medium">الشحنة</th>
                  <th className="py-2.5 px-3 font-medium">المحافظة</th>
                  <th className="py-2.5 px-3 font-medium">سبب عدم الإسناد</th>
                  <th className="py-2.5 px-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {unassigned.map((item) => (
                  <tr key={item.shipmentId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                      {item.trackingNumber || item.orderNumber || item.shipmentId.slice(-8)}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {item.destinationGovernorate || 'غير محددة'}
                    </td>
                    <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400 font-medium">
                      {getReasonLabel(item.reason)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                        فشل
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoAssignPage;
