import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Users,
  Activity,
  PlayCircle,
  ChevronUp,
  MousePointerClick,
  Flame,
  RotateCcw,
  AlertTriangle,
  Globe,
  Smartphone,
  Search,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type ClarityMetric = {
  metricName: string;
  information: Record<string, any>[];
};

type ClarityData = ClarityMetric[];

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
};

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub }) => (
  <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs">
    <div className="flex items-center gap-2">
      <div className="text-primary">{icon}</div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-xl font-bold font-mono text-foreground tabular-nums">{value}</span>
    {sub && <span className="text-[11px] font-mono text-muted-foreground">{sub}</span>}
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-12 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">
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

  return (
    <div className="space-y-4" role="region" aria-label={t('clarity.analytics.region', 'تحليلات Clarity')}>
      {/* Header bar */}
      <div className="flex items-center justify-between p-3.5 bg-card border border-border/70 rounded-xl shadow-xs">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{t('clarity.analytics.title', 'تحليلات Clarity – آخر 3 أيام')}</span>
        </h3>
        <div className="flex items-center gap-2">
          {cached && (
            <span className="rounded font-mono px-2 py-0.5 text-[10px] bg-muted text-muted-foreground border border-border/60">
              {t('clarity.analytics.cached', 'مخبأ')}
            </span>
          )}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{t('clarity.analytics.refresh', 'تحديث')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="status" aria-label={t('clarity.analytics.loading', 'جاري تحميل التحليلات')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-2 h-3 w-16 rounded bg-muted" />
              <div className="h-6 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {isMissingData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 py-10" aria-live="polite">
          <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{t('clarity.analytics.noDataYet', 'لا توجد بيانات بعد. تأكد من صحة الـ Token.')}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4" aria-live="polite">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={<Users className="h-4 w-4" />} label={t('clarity.analytics.totalSessions', 'إجمالي الجلسات')} value={totalSessions.toString()} sub={t('clarity.analytics.uniqueVisitors', '{{count}} زائر فريد', { count: totalUsers })} />
            <KpiCard icon={<Activity className="h-4 w-4" />} label={t('clarity.analytics.pagesPerSession', 'صفحات/جلسة')} value={avgPagesPerSession} />
            <KpiCard icon={<PlayCircle className="h-4 w-4" />} label={t('clarity.analytics.interactionTime', 'وقت التفاعل')} value={`${activeTime}ث`} sub={t('clarity.analytics.totalTime', 'إجمالي {{time}}ث', { time: totalTime })} />
            <KpiCard icon={<ChevronUp className="h-4 w-4" />} label={t('clarity.analytics.scrollDepth', 'عمق التمرير')} value={`${avgScroll}%`} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-3 bg-card shadow-2xs ${deadClickPct > 10 ? 'border-rose-500/30 bg-rose-500/5' : 'border-border/70'}`}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MousePointerClick className={`h-4 w-4 ${deadClickPct > 10 ? 'text-rose-500' : 'text-primary'}`} aria-hidden="true" />
                <span>{t('clarity.analytics.deadClicks', 'نقرات ميتة')}</span>
              </div>
              <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${deadClickPct > 10 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{deadClickTotal}</p>
              <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: deadClickPct })}</p>
            </div>

            <div className={`rounded-xl border p-3 bg-card shadow-2xs ${rageClickPct > 10 ? 'border-rose-500/30 bg-rose-500/5' : 'border-border/70'}`}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flame className={`h-4 w-4 ${rageClickPct > 10 ? 'text-rose-500' : 'text-amber-500'}`} aria-hidden="true" />
                <span>{t('clarity.analytics.rageClicks', 'نقرات غضب')}</span>
              </div>
              <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${rageClickPct > 10 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{rageClickTotal}</p>
              <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: rageClickPct })}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>{t('clarity.analytics.quickbacks', 'عودة سريعة')}</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono tabular-nums text-foreground">{quickbackTotal}</p>
              <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{t('clarity.analytics.percentOfSessions', '{{pct}}% من الجلسات', { pct: quickbackPct })}</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>{t('clarity.analytics.scriptErrors', 'أخطاء السكريبت')}</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono tabular-nums text-foreground">{scriptErrorTotal}</p>
              <p className="text-[10px] text-muted-foreground">{t('clarity.analytics.scriptErrorsLabel', 'خطأ في السكريبت')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarityAnalyticsPanel;
