import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import courierService, { DeliveryRun } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';

const CourierSettlementPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fleetSettings, setFleetSettings] = useState<any>(null);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Pagination + settlement-state filter: the default 20-run window used to freeze
  // the cash of older runs — they were unreachable from any screen.
  const [runStatusFilter, setRunStatusFilter] = useState<'UNSETTLED' | 'SETTLED' | 'ALL'>('UNSETTLED');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);

  // Fetch runs that are eligible for settlement
  const loadEligibleRuns = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, accountsRes, settings] = await Promise.all([
        courierService.getDeliveryRuns({ status: runStatusFilter, page, limit: 20 }),
        courierService.getTreasuryAccounts(),
        courierService.getFleetSettings()
      ]);

      if (settings) {
        setFleetSettings(settings);
      }

      if (runsRes.success) {
        const list = runsRes.data || [];
        setRuns(list);
        setPagination(runsRes.pagination || null);
        if (list.length > 0 && !selectedRunId) {
          const firstUnsettled = list.find((r) => r.status !== 'SETTLED');
          setSelectedRunId(firstUnsettled ? firstUnsettled.id : list[0].id);
        }
      }

      if (accountsRes.success && accountsRes.data) {
        setTreasuryAccounts(accountsRes.data);
        if (accountsRes.data.length > 0) {
          const defaultAccId = settings?.remittance?.defaultTreasuryAccountId;
          const matched = defaultAccId ? accountsRes.data.find((a: any) => a.id === defaultAccId) : null;
          setSelectedAccountId(matched ? matched.id : accountsRes.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل بيانات التسوية');
    } finally {
      setLoading(false);
    }
  }, [selectedRunId, runStatusFilter, page]);

  // Reset to the first page whenever the filter changes
  useEffect(() => {
    setPage(1);
  }, [runStatusFilter]);

  useEffect(() => {
    loadEligibleRuns();
  }, [loadEligibleRuns]);

  // Load detailed run when selection changes
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    const loadRunDetails = async () => {
      setLoadingRun(true);
      try {
        const res = await courierService.getDeliveryRun(selectedRunId);
        if (res.success && res.data) {
          setSelectedRun(res.data);
          // Calculate delivered cash expected
          const deliveredShipments = res.data.shipments?.filter(
            (s) => s.status === 'DELIVERED'
          ) || [];
          const expectedCash = deliveredShipments.reduce(
            (sum, s) => sum + (s.collectedAmount !== null && s.collectedAmount !== undefined ? Number(s.collectedAmount) : Number(s.order?.total || 0)),
            0
          );
          setActualCash(res.data.status === 'SETTLED' ? Number(res.data.totalCODCollected) : expectedCash);
        }
      } catch (err: any) {
        toast.error(err?.message || 'تعذر تحميل تفاصيل المأمورية');
      } finally {
        setLoadingRun(false);
      }
    };

    loadRunDetails();
  }, [selectedRunId]);

  const deliveredShipments = selectedRun?.shipments?.filter((s) => s.status === 'DELIVERED') || [];
  const returnedShipments = selectedRun?.shipments?.filter((s) => ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)) || [];
  const pendingShipments = selectedRun?.shipments?.filter((s) => !['DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)) || [];

  const expectedDeliveredTotal = deliveredShipments.reduce(
    (sum, s) => sum + (s.collectedAmount !== null && s.collectedAmount !== undefined ? Number(s.collectedAmount) : Number(s.order?.total || 0)),
    0
  );

  const cashDiscrepancy = actualCash - expectedDeliveredTotal;

  const handleSettle = async () => {
    if (!selectedRun) return;
    if (actualCash < 0) {
      toast.error('المبلغ المورد لا يمكن أن يكون سالباً');
      return;
    }

    if (pendingShipments.length > 0) {
      const confirmProceed = window.confirm(
        `يوجد ${pendingShipments.length} طرد ما زال قيد التوصيل في الميدان. هل تريد تسوية وتوريد الطرود المسلمة فقط وإغلاق الوردية؟`
      );
      if (!confirmProceed) return;
    }

    // Enforce fleet settings policies
    const requireNote = fleetSettings?.remittance?.requireTreasuryNoteOnVariance ?? true;
    if (cashDiscrepancy !== 0 && requireNote && !notes?.trim()) {
      toast.error('يجب كتابة ملاحظة توضح سبب الفارق المالي (العجز / الزيادة) وفق إعدادات الأسطول');
      return;
    }

    const shortagePolicy = fleetSettings?.remittance?.shortagePolicy || 'DEDUCT_FROM_COURIER';
    if (cashDiscrepancy < 0 && shortagePolicy === 'HOLD_SETTLEMENT') {
      toast.error('سياسة الأسطول المحددة تحظر إغلاق الوردية عند وجود عجز مالي حتى توريد المبلغ كاملاً');
      return;
    }

    const allowPartial = fleetSettings?.remittance?.allowPartialRemittance ?? true;
    if (cashDiscrepancy < 0 && !allowPartial) {
      toast.error('التوريد الجزئي غير مسموح به وفق إعدادات الأسطول. يرجى توريد المبلغ كاملاً');
      return;
    }

    setSubmitting(true);
    try {
      const res = await courierService.settleDeliveryRun(selectedRun.id, {
        treasuryAccountId: selectedAccountId || undefined,
        actualCashReceived: actualCash,
        notes: notes || undefined
      });

      if (res.success) {
        toast.success(res.message || 'تمت تسوية الوردية وتوريد النقدية إلى الخزينة بنجاح');
        loadEligibleRuns();
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشلت عملية التسوية والتوريد');
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">التوريد المالي وتسوية ورديات التوصيل</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            استلام وتوريد النقدية المحصلة (COD) من المناديب، إيداعها بخزينة الشركة، ومطابقة المرتجعات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/treasury"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <BuildingLibraryIcon className="w-4 h-4" />
            حسابات الخزينة
          </Link>
          <Link
            to="/shipping/delivery-runs"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            شيتات المانيفست
          </Link>
        </div>
      </div>

      {/* Main Layout: Run Selector & Settlement Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Runs List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-xs sm:text-sm">ورديات التوصيل الجاهزة للتوريد</h3>
            <button
              onClick={loadEligibleRuns}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <select
            value={runStatusFilter}
            onChange={(e) => setRunStatusFilter(e.target.value as 'UNSETTLED' | 'SETTLED' | 'ALL')}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="UNSETTLED">بانتظار التوريد (غير مسوّاة)</option>
            <option value="SETTLED">تم توريدها</option>
            <option value="ALL">كل الورديات</option>
          </select>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {runs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">لا توجد ورديات مسجلة</div>
            ) : (
              runs.map((r) => {
                const isSelected = r.id === selectedRunId;
                const isSettled = r.status === 'SETTLED';
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRunId(r.id)}
                    className={`w-full text-right p-3 rounded-xl border text-xs transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/80 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{r.runNumber}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSettled
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isSettled ? 'تم التوريد' : 'بانتظار التوريد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>المندوب: {r.courier?.name}</span>
                      <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {formatPrice(r.totalCODExpected)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {pagination.total} وردية — صفحة {pagination.page} من {pagination.pages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage((p) => (pagination && p < pagination.pages ? p + 1 : p))}
                  disabled={!pagination || page >= pagination.pages || loading}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Settlement Form & Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRun ? (
            <div className="space-y-6">
              {/* Telemetry Bar for Selected Run */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <div>
                  <div className="text-xs text-slate-400">المندوب المسند</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{selectedRun.courier?.name}</div>
                  <div className="text-[11px] text-slate-500" dir="ltr">{selectedRun.courier?.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">شحنات سلمت</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    {deliveredShipments.length} طرد
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">مرتجع أو ملغى</div>
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                    {returnedShipments.length} طرد
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">كاش مطلوب توريده</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                    {formatPrice(expectedDeliveredTotal)}
                  </div>
                </div>
              </div>

              {/* Settlement Form & Cash Input */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm sm:text-base">إيداع النقدية بخزينة الشركة</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <label className="block font-medium mb-1">الخزينة المستلمة للتوريد *</label>
                    <select
                      value={selectedAccountId}
                      disabled={selectedRun.status === 'SETTLED'}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    >
                      {treasuryAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'} - رصيد: {formatPrice(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">المبلغ النقدي المستلم فعلياً (ج.م) *</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      disabled={selectedRun.status === 'SETTLED'}
                      value={actualCash}
                      onChange={(e) => setActualCash(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-base focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                {/* Discrepancy Alert */}
                {selectedRun.status !== 'SETTLED' && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                      cashDiscrepancy === 0
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : cashDiscrepancy < 0
                        ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {cashDiscrepancy === 0 ? (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ExclamationCircleIcon className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
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
                  <label className="block text-xs font-medium mb-1">ملاحظات التوريد وإيصال القبض</label>
                  <input
                    type="text"
                    disabled={selectedRun.status === 'SETTLED'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات تخص الفروق النقدية أو حالة الطرود..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                {/* Action CTA */}
                {selectedRun.status === 'SETTLED' ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-center font-medium text-slate-600 dark:text-slate-300">
                    تمت تسوية هذه المأمورية وتوريد النقدية بنجاح بتاريخ {formatDate(selectedRun.settledAt || '')}
                  </div>
                ) : (
                  <button
                    onClick={handleSettle}
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  >
                    {submitting ? 'جاري توريد النقدية وإغلاق الوردية...' : 'تأكيد التوريد وإيداع المبلغ في الخزينة'}
                  </button>
                )}
              </div>

              {/* Parcels Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span>تفاصيل طرود الوردية ({selectedRun.shipments?.length || 0})</span>
                  <span className="text-slate-400">المسلمة والمرتجعة</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto text-xs">
                  {selectedRun.shipments?.map((s) => (
                    <div key={s.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <div>
                        <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{s.order?.orderNumber}</div>
                        <div className="text-slate-500 mt-0.5">{s.order?.customerName} - {s.order?.city || s.destinationCity || ''}</div>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatPrice(s.collectedAmount !== null && s.collectedAmount !== undefined ? s.collectedAmount : (s.order?.total || 0))}
                        </div>
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium mt-0.5 ${
                            s.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : s.status === 'RETURNED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {s.status === 'DELIVERED' ? 'تم التسليم' : s.status === 'RETURNED' ? 'مرتجع' : 'مؤجل / جاري'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
              حدد مأمورية من القائمة الجانبية لبدء التسوية والتوريد
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierSettlementPage;
