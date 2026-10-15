import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  RotateCw,
  Building2,
  Truck,
  Receipt,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import courierService, { DeliveryRun } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { CourierSettlementForm } from './CourierSettlementForm';

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
  const [runStatusFilter, setRunStatusFilter] = useState<'UNSETTLED' | 'SETTLED' | 'ALL'>('UNSETTLED');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);

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

      if (runsRes?.success) {
        const list = runsRes.data || [];
        setRuns(list);
        setPagination(runsRes.pagination || null);
        if (list.length > 0 && !selectedRunId) {
          const firstUnsettled = list.find((r) => r.status !== 'SETTLED');
          setSelectedRunId(firstUnsettled ? firstUnsettled.id : list[0].id);
        }
      }

      if (accountsRes?.success && accountsRes.data) {
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

  useEffect(() => {
    setPage(1);
  }, [runStatusFilter]);

  useEffect(() => {
    loadEligibleRuns();
  }, [loadEligibleRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    const loadRunDetails = async () => {
      setLoadingRun(true);
      try {
        const res = await courierService.getDeliveryRun(selectedRunId);
        if (res?.success && res.data) {
          setSelectedRun(res.data);
          const deliveredShipments = res.data.shipments?.filter((s) => s.status === 'DELIVERED') || [];
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

    const requireNote = fleetSettings?.remittance?.requireTreasuryNoteOnVariance ?? true;
    if (cashDiscrepancy !== 0 && requireNote && !notes?.trim()) {
      toast.error('يجب كتابة ملاحظة توضح سبب الفارق المالي وفق إعدادات الأسطول');
      return;
    }

    const shortagePolicy = fleetSettings?.remittance?.shortagePolicy || 'DEDUCT_FROM_COURIER';
    if (cashDiscrepancy < 0 && shortagePolicy === 'HOLD_SETTLEMENT') {
      toast.error('سياسة الأسطول تحظر إغلاق الوردية عند وجود عجز مالي حتى توريد المبلغ كاملاً');
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

      if (res?.success) {
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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/shipping/couriers" className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              <span>المناديب</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">التوريد المالي وتسوية ورديات التوصيل</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            استلام وتوريد النقدية المحصلة من المناديب، إيداعها بخزينة الشركة ومطابقة المرتجعات
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/treasury"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
          >
            <Building2 className="w-3.5 h-3.5" />
            حسابات الخزينة
          </Link>
          <Link
            to="/shipping/courier-dues"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
          >
            <Receipt className="w-3.5 h-3.5" />
            مستحقات المناديب
          </Link>
          <Link
            to="/shipping/courier-performance"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            تقرير الأداء
          </Link>
          <Link
            to="/shipping/delivery-runs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/70 rounded-lg hover:bg-muted/50 transition text-foreground"
          >
            <Truck className="w-3.5 h-3.5" />
            شيتات المانيفست
          </Link>
        </div>
      </div>

      {/* Main Layout: Run Selector & Settlement Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Runs List */}
        <div className="lg:col-span-4 bg-card border border-border/70 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <h3 className="font-semibold text-xs sm:text-sm text-foreground">ورديات التوصيل الجاهزة للتوريد</h3>
            <button
              onClick={loadEligibleRuns}
              className="text-muted-foreground hover:text-foreground transition p-1 rounded-md"
              title="تحديث"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <select
            value={runStatusFilter}
            onChange={(e) => setRunStatusFilter(e.target.value as 'UNSETTLED' | 'SETTLED' | 'ALL')}
            className="w-full px-3 py-2 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="UNSETTLED">بانتظار التوريد (غير مسوّاة)</option>
            <option value="SETTLED">تم توريدها</option>
            <option value="ALL">كل الورديات</option>
          </select>

          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {runs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">لا توجد ورديات مسجلة</div>
            ) : (
              runs.map((r) => {
                const isSelected = r.id === selectedRunId;
                const isSettled = r.status === 'SETTLED';
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRunId(r.id)}
                    className={`w-full text-right p-3 rounded-lg border text-xs transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/60 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">{r.runNumber}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSettled
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isSettled ? 'تم التوريد' : 'بانتظار التوريد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>المندوب: {r.courier?.name || 'غير محدد'}</span>
                      <span className="tabular-nums font-mono font-semibold text-foreground">
                        {formatPrice(r.totalCODExpected || 0)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <span className="tabular-nums font-mono">
                {pagination.total} وردية - صفحة {pagination.page} من {pagination.pages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1 rounded-md border border-border/70 hover:bg-muted/50 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => (pagination && p < pagination.pages ? p + 1 : p))}
                  disabled={!pagination || page >= pagination.pages || loading}
                  className="p-1 rounded-md border border-border/70 hover:bg-muted/50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Settlement Form & Breakdown */}
        <div className="lg:col-span-8">
          {selectedRun ? (
            <CourierSettlementForm
              selectedRun={selectedRun}
              deliveredShipments={deliveredShipments}
              returnedShipments={returnedShipments}
              expectedDeliveredTotal={expectedDeliveredTotal}
              actualCash={actualCash}
              setActualCash={setActualCash}
              notes={notes}
              setNotes={setNotes}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              treasuryAccounts={treasuryAccounts}
              cashDiscrepancy={cashDiscrepancy}
              submitting={submitting}
              onSettle={handleSettle}
              formatPrice={formatPrice}
              formatDate={formatDate}
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-card border border-border/70 rounded-xl text-muted-foreground text-xs p-6 text-center">
              <Truck className="w-8 h-8 mb-2 opacity-40" />
              <span>حدد مأمورية من القائمة الجانبية لبدء التسوية والتوريد</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierSettlementPage;
