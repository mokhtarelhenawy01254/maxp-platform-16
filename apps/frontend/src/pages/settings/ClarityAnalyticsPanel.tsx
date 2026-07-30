import { RefreshCw as ArrowPathIcon, Activity as ChartBarIcon, Circle as CursorArrowRaysIcon, AlertTriangle as ExclamationTriangleIcon, Zap as FireIcon, Globe as GlobeAltIcon, Circle as PlayCircleIcon, Signal as SignalIcon, Users as UsersIcon, Phone as DevicePhoneMobileIcon, Search as MagnifyingGlassIcon, ChevronUp as ChevronUpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState, useCallback } from 'react';
;
import { apiClient } from '../../services/apiClient';

type ClarityMetric = {
  metricName: string;
  information: Record<string, any>[];
};

type ClarityData = ClarityMetric[];

const COLOR_CLASSES: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  violet: 'text-violet-500',
  indigo: 'text-indigo-500',
  orange: 'text-orange-500',
};

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
};

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub, color = 'blue' }) => (
  <div className="flex flex-col gap-1 rounded-xl border p-4 dark:border-slate-700">
    <div className="flex items-center gap-2">
      <div className={COLOR_CLASSES[color] || COLOR_CLASSES.blue}>{icon}</div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
    {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
  </div>
);

const findMetric = (data: ClarityData | null, name: string) =>
  data?.find((m) => m.metricName === name)?.information || [];

const getTotal = (info: Record<string, any>[], key: string) =>
  info.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

type Props = {
  projectId: string;
  apiToken: string;
};

const ClarityAnalyticsPanel: React.FC<Props> = ({ projectId, apiToken }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<ClarityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const abortRef = useRef<AbortController>();

  const fetchAnalytics = useCallback(async () => {
    if (!projectId || !apiToken) return;

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/storefront-settings/clarity-analytics', {
        signal: abortController.signal,
      });
      if (abortController.signal.aborted) return;
      const result = res.data;
      if (result.success && Array.isArray(result.data)) {
        setData(result.data);
        setCached(result.cached || false);
      } else {
        setData(null);
        setError(result.message || t('clarity.analytics.noData', 'لا توجد بيانات'));
      }
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      setError(err?.response?.data?.message || err.message || t('clarity.analytics.fetchError', 'فشل جلب البيانات'));
    } finally {
      if (!abortController.signal.aborted) setLoading(false);
    }
  }, [projectId, apiToken, t]);

  useEffect(() => {
    if (projectId && apiToken) fetchAnalytics();
    return () => abortRef.current?.abort();
  }, [projectId, apiToken, fetchAnalytics]);

  if (!projectId || !apiToken) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-slate-600 dark:bg-slate-800/50">
        <ChartBarIcon className="mb-3 h-12 w-12 text-gray-300 dark:text-slate-600" aria-hidden="true" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('clarity.analytics.empty', 'أضف Clarity Project ID و API Token أعلاه لتفعيل التحليلات')}
        </p>
      </div>
    );
  }

  const isMissingData = !data && !loading && !error;

  const traffic = data ? findMetric(data, 'Traffic') : [];
  const totalSessions = getTotal(traffic, 'totalSessionCount');
  const totalUsers = getTotal(traffic, 'distinctUserCount');
  const avgPagesPerSession = traffic.length > 0
    ? (traffic.reduce((s, r) => s + Number(r.pagesPerSessionPercentage || 0), 0) / traffic.length).toFixed(2)
    : '0';

  const scroll = data ? findMetric(data, 'ScrollDepth') : [];
  const avgScroll = scroll.length > 0
    ? (scroll.reduce((s, r) => s + Number(r.averageScrollDepth || 0), 0) / scroll.length).toFixed(1)
    : '0';

  const engagement = data ? findMetric(data, 'EngagementTime') : [];
  const totalTime = getTotal(engagement, 'totalTime');
  const activeTime = getTotal(engagement, 'activeTime');

  const deadClicks = data ? findMetric(data, 'DeadClickCount') : [];
  const deadClickTotal = getTotal(deadClicks, 'subTotal');
  const deadClickPct = deadClicks[0]?.sessionsWithMetricPercentage || 0;

  const rageClicks = data ? findMetric(data, 'RageClickCount') : [];
  const rageClickTotal = getTotal(rageClicks, 'subTotal');
  const rageClickPct = rageClicks[0]?.sessionsWithMetricPercentage || 0;

  const quickbacks = data ? findMetric(data, 'QuickbackClick') : [];
  const quickbackTotal = getTotal(quickbacks, 'subTotal');
  const quickbackPct = quickbacks[0]?.sessionsWithMetricPercentage || 0;

  const scriptErrors = data ? findMetric(data, 'ScriptErrorCount') : [];
  const scriptErrorTotal = getTotal(scriptErrors, 'subTotal');

  const devices = data ? findMetric(data, 'Device') : [];
  const browsers = data ? findMetric(data, 'Browser') : [];
  const popularPages = data ? findMetric(data, 'PopularPages') : [];
  const referrers = data ? findMetric(data, 'ReferrerUrl') : [];

  return (
    <div className="space-y-6" role="region" aria-label={t('clarity.analytics.region', 'تحليلات Clarity')}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-200">
          <ChartBarIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          {t('clarity.analytics.title', 'تحليلات Clarity – آخر 3 أيام')}
        </h3>
        <div className="flex items-center gap-2">
          {cached && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] text-gray-500 dark:bg-slate-700 dark:text-gray-400">
              {t('clarity.analytics.cached', 'مخبأ')}
            </span>
          )}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
            {t('clarity.analytics.refresh', 'تحديث')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400" role="alert">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-4" role="status" aria-label={t('clarity.analytics.loading', 'جاري تحميل التحليلات')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="motion-safe:animate-pulse rounded-xl border border-gray-100 p-4 dark:border-slate-700">
                <div className="mb-2 h-3 w-16 rounded bg-gray-200 dark:bg-slate-700" />
                <div className="h-6 w-12 rounded bg-gray-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      )}

      {isMissingData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-slate-700" aria-live="polite">
          <ChartBarIcon className="mb-2 h-10 w-10 text-gray-300 dark:text-slate-600" aria-hidden="true" />
          <p className="text-sm text-gray-400">{t('clarity.analytics.noDataYet', 'لا توجد بيانات بعد. تأكد من صحة الـ Token.')}</p>
        </div>
      )}

      {data && (
        <div aria-live="polite">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={<UsersIcon className="h-5 w-5" />} label={t('clarity.analytics.totalSessions', 'إجمالي الجلسات')} value={totalSessions.toString()} sub={t('clarity.analytics.uniqueVisitors', '{{count}} زائر فريد', { count: totalUsers })} color="indigo" />
            <KpiCard icon={<SignalIcon className="h-5 w-5" />} label={t('clarity.analytics.pagesPerSession', 'صفحات/جلسة')} value={avgPagesPerSession} color="indigo" />
            <KpiCard icon={<PlayCircleIcon className="h-5 w-5" />} label={t('clarity.analytics.interactionTime', 'وقت التفاعل')} value={`${activeTime}ث`} sub={t('clarity.analytics.totalTime', 'إجمالي {{time}}ث', { time: totalTime })} color="indigo" />
            <KpiCard icon={<ChevronUpIcon className="h-5 w-5" />} label={t('clarity.analytics.scrollDepth', 'عمق التمرير')} value={`${avgScroll}%`} color="indigo" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-3 ${deadClickPct > 10 ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/20' : 'border-gray-100 dark:border-slate-700'}`}>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CursorArrowRaysIcon className={`h-4 w-4 ${deadClickPct > 10 ? 'text-red-500' : ''}`} aria-hidden="true" />
                {t('clarity.analytics.deadClicks', 'نقرات ميتة')}
              </div>
              <p className={`mt-1 text-lg font-bold ${deadClickPct > 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{deadClickTotal}</p>
              <p className="text-[10px] text-gray-400">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: deadClickPct })}</p>
            </div>
            <div className={`rounded-xl border p-3 ${rageClickPct > 10 ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/20' : 'border-gray-100 dark:border-slate-700'}`}>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FireIcon className={`h-4 w-4 ${rageClickPct > 10 ? 'text-red-500' : 'text-orange-500'}`} aria-hidden="true" />
                {t('clarity.analytics.rageClicks', 'نقرات غضب')}
              </div>
              <p className={`mt-1 text-lg font-bold ${rageClickPct > 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{rageClickTotal}</p>
              <p className="text-[10px] text-gray-400">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: rageClickPct })}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <ArrowPathIcon className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                {t('clarity.analytics.quickbacks', 'عودة سريعة')}
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{quickbackTotal}</p>
              <p className="text-[10px] text-gray-400">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: quickbackPct })}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                {t('clarity.analytics.scriptErrors', 'أخطاء السكريبت')}
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{scriptErrorTotal}</p>
              <p className="text-[10px] text-gray-400">{t('clarity.analytics.scriptErrorsLabel', 'خطأ في السكريبت')}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <FireIcon className="h-4 w-4 text-orange-500" aria-hidden="true" />
                {t('clarity.analytics.popularPages', 'أشهر الصفحات')}
              </h4>
              <div className="space-y-1.5">
                {popularPages.slice(0, 8).map((page: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-slate-700/50">
                    <span className="truncate text-gray-700 dark:text-gray-300" dir="ltr">
                      {page.url?.split('/').pop() || page.url}
                    </span>
                    <span className="ms-2 flex-shrink-0 font-medium text-gray-900 dark:text-white">{page.visitsCount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <DevicePhoneMobileIcon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                  {t('clarity.analytics.devices', 'الأجهزة')}
                </h4>
                <div className="space-y-2">
                  {devices.map((d: any) => {
                    const total = devices.reduce((s: number, x: any) => s + Number(x.sessionsCount || 0), 0);
                    const pct = total > 0 ? ((Number(d.sessionsCount) / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={d.name} className="flex items-center gap-3">
                        <span className="w-16 text-xs text-gray-600 dark:text-gray-400">{d.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-gray-900 dark:text-white rtl:text-left">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <GlobeAltIcon className="h-4 w-4 text-green-500" aria-hidden="true" />
                  {t('clarity.analytics.browsers', 'المتصفحات')}
                </h4>
                <div className="space-y-2">
                  {browsers.slice(0, 5).map((b: any) => {
                    const total = browsers.reduce((s: number, x: any) => s + Number(x.sessionsCount || 0), 0);
                    const pct = total > 0 ? ((Number(b.sessionsCount) / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={b.name} className="flex items-center gap-3">
                        <span className="w-24 truncate text-xs text-gray-600 dark:text-gray-400">{b.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-gray-900 dark:text-white rtl:text-left">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <MagnifyingGlassIcon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
              {t('clarity.analytics.referrers', 'مصادر الزيارات (Top 10)')}
            </h4>
            <div className="space-y-1.5">
              {referrers.slice(0, 10).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-slate-700/50">
                  <span className="truncate text-gray-700 dark:text-gray-300" dir="ltr">
                    {r.name || t('clarity.analytics.direct', '(مباشر)')}
                  </span>
                  <span className="ms-2 flex-shrink-0 font-medium text-gray-900 dark:text-white">{r.sessionsCount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarityAnalyticsPanel;
