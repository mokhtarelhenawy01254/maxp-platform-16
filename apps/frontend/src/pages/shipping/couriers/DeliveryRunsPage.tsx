import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  TruckIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import courierService, { DeliveryRun, DeliveryRunItem, Courier } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';
import api from '../../../services/api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DISPATCHED: { label: 'في الميدان', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  COMPLETED: { label: 'اكتمل التوصيل', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  SETTLED: { label: 'تمت التسوية والتوريد', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  DRAFT: { label: 'مسودة', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  CANCELLED: { label: 'ملغاة', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' }
};

const DeliveryRunsPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Waybill and Share Link States
  const [viewingWaybill, setViewingWaybill] = useState<{ run: DeliveryRun; shipment?: DeliveryRunItem } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCouriers, setActiveCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [orderNumbersInput, setOrderNumbersInput] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courierService.getDeliveryRuns({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      if (res.success) {
        setRuns(res.data || []);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل مأموريات التوصيل');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const loadCouriersForDispatch = async () => {
    try {
      const res = await courierService.getCouriers({ isActive: true });
      if (res.success && res.data) {
        setActiveCouriers(res.data);
        if (res.data.length > 0 && !selectedCourierId) {
          const available = res.data.find((c) => c.status === 'AVAILABLE');
          setSelectedCourierId(available ? available.id : res.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل قائمة المناديب');
    }
  };

  const handleOpenDetail = async (runId: string) => {
    setLoadingDetail(true);
    try {
      const res = await courierService.getDeliveryRun(runId);
      if (res.success) {
        setSelectedRun(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تفاصيل المأمورية');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyMobileLink = async (run: DeliveryRun) => {
    try {
      let token = run.mobileToken;
      if (!token) {
        const linkRes = await courierService.getRunShareLink(run.id);
        token = linkRes?.data?.mobileToken;
      }
      const origin = window.location.origin;
      const url = `${origin}/courier/run/${run.id}${token ? `?token=${token}` : ''}`;
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط مأمورية المندوب الذكي بنجاح');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleShareWhatsApp = async (run: DeliveryRun) => {
    try {
      let token = run.mobileToken;
      if (!token) {
        const linkRes = await courierService.getRunShareLink(run.id);
        token = linkRes?.data?.mobileToken;
      }
      const origin = window.location.origin;
      const url = `${origin}/courier/run/${run.id}${token ? `?token=${token}` : ''}`;
      const phone = run.courier?.phone ? run.courier.phone.replace(/[^0-9]/g, '') : '';
      const text = encodeURIComponent(
        `مرحباً يا كابتن ${run.courier?.name || ''}، تفضل رابط مأمورية التوصيل الخاصة بك:\n${url}`
      );
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } catch {
      toast.error('تعذر فتح واتساب');
    }
  };

  const handleOpenCreateRun = () => {
    loadCouriersForDispatch();
    setOrderNumbersInput('');
    setDispatchNotes('');
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateRun = async () => {
    if (!selectedCourierId) {
      toast.error('يرجى اختيار مندوب التوصيل');
      return;
    }
    const cleanNumbers = orderNumbersInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (cleanNumbers.length === 0) {
      toast.error('يرجى إدخال أرقام الطلبات أو معرفات الشحنات المراد إسنادها');
      return;
    }

    setSubmittingDispatch(true);
    try {
      // Look up orders matching order numbers
      const ordersRes = await api.get('/orders', {
        params: { search: cleanNumbers.join(' ') }
      });
      const foundOrders = Array.isArray(ordersRes?.data?.orders)
        ? ordersRes.data.orders
        : Array.isArray(ordersRes?.data?.data)
        ? ordersRes.data.data
        : [];

      const matchedIds = foundOrders
        .filter((o: any) => cleanNumbers.includes(o.orderNumber) || cleanNumbers.includes(o.id))
        .map((o: any) => o.id);

      const finalOrderIds = matchedIds.length > 0 ? matchedIds : cleanNumbers;

      const res = await courierService.createDeliveryRun({
        courierId: selectedCourierId,
        orderIds: finalOrderIds,
        notes: dispatchNotes || undefined
      });

      if (res.success && res.data) {
        toast.success(`تم إنشاء مأمورية التوزيع رقم ${res.data.runNumber} بنجاح`);
        setIsCreateModalOpen(false);
        fetchRuns();
        handleOpenDetail(res.data.id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء مأمورية التوصيل');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/shipping/couriers" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              المناديب ←
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">رحلات التوزيع والمانيفست الميداني</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إصدار أذون خروج الطرود، تتبع مأموريات المناديب، طباعة البوالص، ومطابقة تسليمات الميدان
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleOpenCreateRun}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            إنشاء مأمورية توزيع جديدة
          </button>
          <Link
            to="/orders/preparation"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            صالة تجهيز الطلبات
          </Link>
          <Link
            to="/shipping/courier-settlements"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
          >
            شاشة التوريد وتسوية الخزينة
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم المأمورية أو اسم المندوب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="ALL">كل الحالات</option>
            <option value="DISPATCHED">في الميدان</option>
            <option value="COMPLETED">اكتمل التوصيل</option>
            <option value="SETTLED">تمت التسوية والتوريد</option>
          </select>
          <button
            onClick={fetchRuns}
            title="تحديث"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">رقم المأمورية</th>
                <th className="py-3 px-4 font-medium">المندوب</th>
                <th className="py-3 px-4 font-medium">تاريخ الخروج</th>
                <th className="py-3 px-4 font-medium">عدد الطرود</th>
                <th className="py-3 px-4 font-medium">المبلغ المطلوب (COD)</th>
                <th className="py-3 px-4 font-medium">المبلغ المورد</th>
                <th className="py-3 px-4 font-medium">الحالة</th>
                <th className="py-3 px-4 font-medium text-left">إجراءات المأمورية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    لا توجد رحلات توصيل مسجلة حالياً
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.DISPATCHED;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {r.runNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{r.courier?.name}</div>
                        <div className="text-xs text-slate-400" dir="ltr">{r.courier?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(r.dispatchDate)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-semibold">{r.totalShipments}</span> طرد
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatPrice(r.totalCODExpected)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium">
                        {r.status === 'SETTLED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(r.totalCODCollected)}</span>
                        ) : (
                          <span className="text-slate-400">بانتظار التوريد</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyMobileLink(r)}
                            title="نسخ رابط المندوب للموبايل"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(r)}
                            title="إرسال الرابط عبر واتساب للمندوب"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDetail(r.id)}
                            title="عرض تفاصيل المانيفست وطباعة البوالص"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manifest Detail Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base sm:text-lg">
                  مانيفست مأمورية التوصيل: {selectedRun.runNumber}
                </h3>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => handleCopyMobileLink(selectedRun)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ClipboardDocumentIcon className="w-4 h-4 text-slate-500" />
                  رابط المندوب
                </button>
                <button
                  onClick={() => handleShareWhatsApp(selectedRun)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  واتساب
                </button>
                <button
                  onClick={() => setViewingWaybill({ run: selectedRun })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition"
                >
                  <PrinterIcon className="w-4 h-4" />
                  طباعة كل البوالص
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <PrinterIcon className="w-4 h-4" />
                  طباعة المانيفست
                </button>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Manifest Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">المندوب المستلم</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{selectedRun.courier?.name}</div>
                  <div className="text-[11px] text-slate-500" dir="ltr">{selectedRun.courier?.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">تاريخ الخروج</div>
                  <div className="font-semibold mt-0.5">{formatDate(selectedRun.dispatchDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">إجمالي الطرود</div>
                  <div className="font-semibold mt-0.5 tabular-nums">{selectedRun.totalShipments} طرد</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">إجمالي المبلغ المطلوب (COD)</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                    {formatPrice(selectedRun.totalCODExpected)}
                  </div>
                </div>
              </div>

              {/* Shipments List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">رقم الطلب</th>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">العنوان</th>
                      <th className="py-2.5 px-3">المحتويات</th>
                      <th className="py-2.5 px-3">المبلغ المطلوب</th>
                      <th className="py-2.5 px-3">الحالة الميدانية</th>
                      <th className="py-2.5 px-3 print:hidden">بوليصة الشحن</th>
                      <th className="py-2.5 px-3 print:table-cell hidden">توقيع المستلم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedRun.shipments?.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 tabular-nums text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-medium">{s.order?.orderNumber}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium">{s.order?.customerName}</div>
                          <div className="text-[11px] text-slate-500" dir="ltr">{s.order?.customerPhone}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate">
                          {s.order?.governorate ? `${s.order.governorate} - ` : ''}
                          {s.order?.customerAddress || s.destinationAddress || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {s.order?.items?.map((it) => `${it.quantity}x ${it.name}`).join('، ') || 'طرد مغلق'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold tabular-nums">
                          {formatPrice(s.order?.total || 0)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {s.status === 'DELIVERED' ? 'تم التسليم' : s.status === 'RETURNED' ? 'مرتجع' : s.status === 'DELAYED' ? 'مؤجل' : 'في الطريق'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 print:hidden">
                          <button
                            onClick={() => setViewingWaybill({ run: selectedRun, shipment: s })}
                            title="طباعة بوليصة هذا الطرد"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <PrinterIcon className="w-3.5 h-3.5 text-blue-600" />
                            بوليصة
                          </button>
                        </td>
                        <td className="py-2.5 px-3 print:table-cell hidden border-b border-dashed border-slate-300 w-24"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures for print */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs print:grid hidden">
                <div className="border-t border-slate-400 pt-2">
                  توقيع أمين المخزن المسلم: ..............................
                </div>
                <div className="border-t border-slate-400 pt-2">
                  توقيع المندوب المستلم للعهدة: ..............................
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waybill Modal (Print View) */}
      {viewingWaybill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl my-auto shadow-2xl p-6 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Header / Actions for Print */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <PrinterIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  معاينة وطباعة بوليصة الشحن (Airway Bill)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
                >
                  <PrinterIcon className="w-4 h-4" />
                  طباعة الآن
                </button>
                <button
                  onClick={() => setViewingWaybill(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Waybill Content (Single or Multi) */}
            <div className="space-y-8">
              {(viewingWaybill.shipment ? [viewingWaybill.shipment] : viewingWaybill.run.shipments || []).map((s, idx) => (
                <div
                  key={s.id}
                  className="border-2 border-slate-900 dark:border-slate-100 rounded-xl p-5 text-slate-900 dark:text-slate-100 font-sans space-y-4 print:page-break-after-always print:m-0"
                >
                  {/* Top Header of Waybill */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        أسطول التوصيل الداخلي السريع
                      </span>
                      <h2 className="text-lg font-black tracking-tight">بوليصة شحن وتوصيل</h2>
                      <div className="text-xs font-mono font-bold mt-0.5">
                        رقم المأمورية: {viewingWaybill.run.runNumber}
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-[11px] text-slate-400">BARCODE / REF</div>
                      <div className="text-sm font-black border border-slate-900 dark:border-slate-100 px-2.5 py-1 rounded mt-0.5">
                        *{s.order?.orderNumber}*
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">طرد رقم {idx + 1}</div>
                    </div>
                  </div>

                  {/* Consignee and Sender Grid */}
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 text-xs">
                    <div>
                      <div className="font-bold text-[11px] text-slate-400 mb-1">بيانات العميل والمستلم:</div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {s.order?.customerName}
                      </div>
                      <div className="font-mono font-semibold mt-0.5" dir="ltr">
                        {s.order?.customerPhone}
                      </div>
                      <div className="mt-1 text-slate-600 dark:text-slate-300">
                        {s.order?.governorate ? `${s.order.governorate} - ` : ''}
                        {s.order?.customerAddress || s.destinationAddress || 'العنوان غير مدون'}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[11px] text-slate-400 mb-1">المندوب وتاريخ الإسناد:</div>
                      <div className="font-bold text-sm">{viewingWaybill.run.courier?.name}</div>
                      <div className="font-mono text-xs text-slate-500" dir="ltr">
                        {viewingWaybill.run.courier?.phone}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDate(viewingWaybill.run.dispatchDate)}
                      </div>
                    </div>
                  </div>

                  {/* Parcel Items */}
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-[11px] text-slate-400">محتويات الشحنة:</div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      {s.order?.items && s.order.items.length > 0 ? (
                        s.order.items.map((it) => (
                          <div key={it.id} className="flex justify-between py-0.5">
                            <span>{it.quantity}x {it.name} {it.variantTitle ? `(${it.variantTitle})` : ''}</span>
                            <span className="font-mono font-medium">{formatPrice(it.price * it.quantity)}</span>
                          </div>
                        ))
                      ) : (
                        <span>طرد مغلق - تسليم مباشر</span>
                      )}
                    </div>
                  </div>

                  {/* Cash Collection Block (The Most Important Field for Couriers) */}
                  <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium opacity-80">المبلغ المطلوب تحصيله نقداً (COD)</div>
                      <div className="text-2xl font-black tabular-nums tracking-tight">
                        {formatPrice(s.order?.total || 0)}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="inline-block border border-current px-2.5 py-1 rounded text-xs font-bold uppercase">
                        دفع عند الاستلام
                      </span>
                    </div>
                  </div>

                  {/* Instructions and Signature */}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span>تعليمات: مسموح بالمعاينة قبل الاستلام وفق سياسة المتجر.</span>
                    </div>
                    <div>
                      <span>توقيع العميل: ....................</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Dispatch Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">إنشاء مأمورية توزيع وإسناد شحنات</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">اختر المندوب المستلم للمأمورية *</label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm focus:outline-none"
                >
                  {activeCouriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.status === 'AVAILABLE' ? 'متاح' : 'في الميدان'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  أرقام الطلبات أو معرفات الشحنات (مفصولة بفاصلة أو سطر جديد) *
                </label>
                <textarea
                  rows={4}
                  placeholder="مثال:&#10;ORD-1001&#10;ORD-1002&#10;ORD-1003"
                  value={orderNumbersInput}
                  onChange={(e) => setOrderNumbersInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  يمكنك أيضاً إسناد الطلبات مباشرة من صالة تجهيز الطلبات (Preparation Queue).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">ملاحظات المأمورية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: خط سير شرق القاهرة، أولوية تسليم صباحي"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreateRun}
                  disabled={submittingDispatch}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
                >
                  {submittingDispatch ? 'جارٍ إصدار المأمورية...' : 'إصدار المأمورية وخروج الطرود'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryRunsPage;
