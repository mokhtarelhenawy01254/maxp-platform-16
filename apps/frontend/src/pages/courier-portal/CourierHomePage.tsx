import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TruckIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronLeftIcon,
  WifiIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import courierPortalApi, {
  CourierUser,
  CourierKPIs,
  DeliveryRunSummary,
  getCourierToken,
  getCourierUser,
} from './services/courierPortalApi';
import { useOfflineQueue } from './services/offlineQueue';

const DEFAULT_STATUS_LABEL = { label: 'في الميدان', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200' };
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  DISPATCHED: { label: 'في الميدان', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200' },
  COMPLETED: { label: 'مكتملة', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200' },
  SETTLED: { label: 'تم التوريد', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200' },
  CANCELLED: { label: 'ملغاة', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200' },
};

export const CourierHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { queueCount, isSyncing, isOnline, syncNow } = useOfflineQueue();

  const [courier, setCourier] = useState<CourierUser | null>(getCourierUser());
  const [runs, setRuns] = useState<DeliveryRunSummary[]>([]);
  const [kpis, setKpis] = useState<CourierKPIs>({
    deliveredCount: 0,
    pendingCount: 0,
    returnedCount: 0,
    totalCODExpected: 0,
    totalCODCollected: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!getCourierToken()) {
      navigate('/courier-portal/login', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const res = await courierPortalApi.getMe();
      if (res.success) {
        if (res.courier) setCourier(res.courier);
        if (res.todayRuns) setRuns(res.todayRuns);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate('/courier-portal/login', { replace: true });
        return;
      }
      toast.error('تعذر تحديث بيانات المأموريات');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await courierPortalApi.logout();
    navigate('/courier-portal/login', { replace: true });
  };

  const handleManualSync = async () => {
    try {
      const result = await syncNow();
      if (result) {
        if (result.failed === 0) {
          toast.success(`تم مزامنة ${result.synced} عملية بنجاح`);
        } else {
          toast.warning(`تم مزامنة ${result.synced}، وتعذر ${result.failed} عمليات`);
        }
        loadData();
      }
    } catch {
      toast.error('فشلت محاولة المزامنة، تحقق من الاتصال بالشبكة');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16" dir="rtl">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 shadow-xs">
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {courier?.name || 'كابتن التوصيل'}
                </h1>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    متصل
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <WifiIcon className="w-3 h-3" />
                    أوفلاين
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono" dir="ltr">
                {courier?.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadData()}
              aria-label="تحديث"
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              aria-label="تسجيل الخروج"
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[1800px] mx-auto p-3.5 sm:p-6 space-y-4">
        {/* Offline Queue Sync Banner */}
        {queueCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold">
                  يوجد <span className="font-mono">{queueCount}</span> عمليات أوفلاين معلقة
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  تم حفظها محلياً وسيتم رفعها للسيرفر
                </p>
              </div>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 disabled:opacity-40 transition flex items-center gap-1.5 shadow-xs"
            >
              {isSyncing ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <span>مزامنة الآن</span>
              )}
            </button>
          </div>
        )}

        {/* Quick Custody Shortcut */}
        <Link
          to="/courier-portal/custody"
          className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:border-blue-400 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                العهدة المالية والنقدية
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                المحصل اليوم: <span className="font-mono font-bold text-emerald-600">{kpis.totalCODCollected.toLocaleString()}</span> ج.م
              </p>
            </div>
          </div>
          <ChevronLeftIcon className="w-4 h-4 text-slate-400" />
        </Link>

        {/* Today's KPI Counters */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            إحصائيات إنجاز اليوم
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center text-emerald-600 mb-1">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                {kpis.deliveredCount}
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 font-medium">تم التسليم</div>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/30 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center text-blue-600 mb-1">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 tabular-nums">
                {kpis.pendingCount}
              </div>
              <div className="text-[11px] text-blue-700/80 dark:text-blue-400 font-medium">متبقي / قيد التوصيل</div>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center text-rose-600 mb-1">
                <XCircleIcon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 tabular-nums">
                {kpis.returnedCount}
              </div>
              <div className="text-[11px] text-rose-700/80 dark:text-rose-400 font-medium">تعذر / مرتجع</div>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-slate-500 text-[11px]">مطلوب تحصيله:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {kpis.totalCODExpected.toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex justify-between items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-slate-500 text-[11px]">محصل فعلياً:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {kpis.totalCODCollected.toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </section>

        {/* Today's Runs List */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              مأموريات اليوم ({runs.length})
            </h2>
          </div>

          {runs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-xs">
              <TruckIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                لا توجد مأموريات نشطة مسندة لك اليوم
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                سيظهر بيان الشحنات هنا فور قيام الإدارة بإسناد المأمورية وخروجك للتوزيع
              </p>
            </div>
          ) : (
            runs.map((r) => {
              const status = (r.status ? STATUS_LABELS[r.status] : undefined) ?? DEFAULT_STATUS_LABEL;
              const delivered = r.deliveredCount ?? 0;
              const total = r.totalShipments || 1;
              const pct = Math.round((delivered / total) * 100);

              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {r.runNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.totalShipments} طرد — مطلوب تحصيل <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{r.totalCODExpected.toLocaleString()}</span> ج.م
                      </p>
                    </div>

                    <Link
                      to={`/courier-portal/runs/${r.id}`}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 active:scale-[0.98]"
                    >
                      <span>فتح الرحلة</span>
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>إنجاز التسليم</span>
                      <span className="font-mono font-semibold">
                        {delivered} من {r.totalShipments} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};

export default CourierHomePage;
