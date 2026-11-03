import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import courierPortalApi, {
  CustodySummary,
  getCourierToken,
} from './services/courierPortalApi';

export const CourierCustodyPage: React.FC = () => {
  const navigate = useNavigate();
  const [custody, setCustody] = useState<CustodySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCustody = useCallback(async () => {
    if (!getCourierToken()) {
      navigate('/courier-portal/login', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const res = await courierPortalApi.getCustodySummary();
      if (res.success && res.data) {
        setCustody(res.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate('/courier-portal/login', { replace: true });
        return;
      }
      toast.error('تعذر تحميل تقرير العهدة المالية');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCustody();
  }, [loadCustody]);

  if (loading && !custody) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const expected = custody?.totalCODExpected ?? 0;
  const collected = custody?.totalCODCollected ?? 0;
  const difference = custody?.difference ?? collected;
  const runs = custody?.runs || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16" dir="rtl">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 py-3 shadow-xs">
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to="/courier-portal"
              aria-label="الرجوع للرئيسية"
              className="p-1.5 -mr-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                العهدة المالية والنقدية
              </h1>
              <p className="text-[11px] text-slate-400">
                متابعة المبالغ المحصلة والتوريد للخزينة
              </p>
            </div>
          </div>

          <button
            onClick={() => loadCustody()}
            aria-label="تحديث"
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1800px] mx-auto p-3.5 sm:p-6 space-y-4">
        {/* Total Cash in Custody Hero Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-100">
              المبلغ الواجب توريده للخزينة الآن
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight">
              {difference.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-blue-200">جنيه مصري</span>
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
            <span>مطلوب تحصيله: <strong className="font-mono text-white">{expected.toLocaleString()}</strong> ج.م</span>
            <span>المحصل: <strong className="font-mono text-white">{collected.toLocaleString()}</strong> ج.م</span>
          </div>
        </div>

        {/* Remittance Instructions Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">تعليمات التوريد اليومي:</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              يجب تسليم النقدية المحصلة إلى مسؤول الخزينة في نهاية اليوم للحصول على سند التوريد وتصفية مأمورياتك.
            </p>
          </div>
        </div>

        {/* Runs Breakdown Section */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              تفاصيل الرحلات والمأموريات ({runs.length})
            </h2>
          </div>

          {runs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
              لا توجد مأموريات مسجلة اليوم
            </div>
          ) : (
            runs.map((r) => {
              const isSettled = r.status === 'SETTLED';
              const runDiff = (r.totalCODCollected ?? 0);

              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {r.runNumber}
                        </span>
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                            <CheckBadgeIcon className="w-3.5 h-3.5" />
                            تم التوريد للخزينة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                            <DocumentCheckIcon className="w-3.5 h-3.5" />
                            بانتظار التوريد
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.totalShipments} طرد
                      </p>
                    </div>

                    <Link
                      to={`/courier-portal/runs/${r.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      عرض المانيفست
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">المبلغ المطلوب (COD):</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {r.totalCODExpected.toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">المبلغ المحصل فعلياً:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {runDiff.toLocaleString()} ج.م
                      </span>
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

export default CourierCustodyPage;
