import { ExternalLink as ArrowTopRightOnSquareIcon, Activity as ChartBarIcon, Check as CheckCircleIcon, Clipboard as ClipboardDocumentIcon, Circle as CursorArrowRaysIcon, Zap as FireIcon, Filter as FunnelIcon, Info as InformationCircleIcon, Key as KeyIcon, Circle as PlayCircleIcon, X as XCircleIcon, Circle as CheckCircleIconSolid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
;
;
import { toast } from 'sonner';
import {
  storefrontSettingsService,
  type StorefrontSettings,
} from '../../services/storefrontSettingsService';
import ClarityAnalyticsPanel from './ClarityAnalyticsPanel';

const ClarityLogo = () => (
  <svg
    viewBox="0 0 64 64"
    className="h-8 w-8"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="12" fill="#0078D4" />
    <path d="M20 44 C20 32 32 20 44 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <path
      d="M20 44 C20 44 28 36 36 28"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <circle cx="44" cy="20" r="4" fill="white" />
  </svg>
);

const FEATURES = [
  {
    icon: <FireIcon className="h-6 w-6 text-orange-500" />,
    titleKey: 'clarity.feature.heatmaps',
    title: 'خرائط الحرارة',
    subtitle: 'Heatmaps',
    descKey: 'clarity.feature.heatmaps.desc',
    desc: 'شوف إيه الأجزاء اللي الزبائن بيضغطوا عليها أكتر في متجرك وإيه اللي ملقوش فيه.',
    color: 'border-orange-100 bg-orange-50 dark:border-orange-800/30 dark:bg-orange-900/20',
  },
  {
    icon: <PlayCircleIcon className="h-6 w-6 text-violet-500" />,
    titleKey: 'clarity.feature.recordings',
    title: 'تسجيل الجلسات',
    subtitle: 'Session Recordings',
    descKey: 'clarity.feature.recordings.desc',
    desc: 'شاهد فيديو كامل لرحلة الزبون من دخول المتجر لحد ما اشترى أو خرج.',
    color: 'border-violet-100 bg-violet-50 dark:border-violet-800/30 dark:bg-violet-900/20',
  },
  {
    icon: <CursorArrowRaysIcon className="h-6 w-6 text-red-500" />,
    titleKey: 'clarity.feature.rageClicks',
    title: 'نقرات الإحباط',
    subtitle: 'Rage & Dead Clicks',
    descKey: 'clarity.feature.rageClicks.desc',
    desc: 'اعرف امتى الزبون اتضايق أو ضغط على حاجة مش شغالة وصلحها بسرعة.',
    color: 'border-red-100 bg-red-50 dark:border-red-800/30 dark:bg-red-900/20',
  },
  {
    icon: <FunnelIcon className="h-6 w-6 text-blue-500" />,
    titleKey: 'clarity.feature.funnels',
    title: 'تحليل قمع المبيعات',
    subtitle: 'Funnel Analysis',
    descKey: 'clarity.feature.funnels.desc',
    desc: 'اكتشف فين الناس بتوقف قبل الشراء وحسن معدل التحويل.',
    color: 'border-blue-100 bg-blue-50 dark:border-blue-800/30 dark:bg-blue-900/20',
  },
];

const SETUP_STEPS = [
  {
    step: '1',
    titleKey: 'clarity.setup.step1.title',
    title: 'أنشئ حساب مجاني على Clarity',
    descKey: 'clarity.setup.step1.desc',
    desc: 'سجل بحسابك على Microsoft أو GitHub أو البريد الإلكتروني.',
    link: 'https://clarity.microsoft.com',
    linkTextKey: 'clarity.setup.step1.linkText',
    linkText: 'افتح Microsoft Clarity',
    color: 'bg-blue-600',
  },
  {
    step: '2',
    titleKey: 'clarity.setup.step2.title',
    title: 'أنشئ مشروع جديد وانسخ الـ ID',
    descKey: 'clarity.setup.step2.desc',
    desc: 'من Settings ثم Overview انسخ رقم المشروع القصير مثل k3a9mz1b.',
    link: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-overview',
    linkTextKey: 'clarity.setup.step2.linkText',
    linkText: 'شرح خطوات الإنشاء',
    color: 'bg-indigo-600',
  },
  {
    step: '3',
    titleKey: 'clarity.setup.step3.title',
    title: 'الصق الـ ID هنا واحفظ',
    descKey: 'clarity.setup.step3.desc',
    desc: 'بعد الحفظ سيبدأ Clarity في تتبع زوار متجرك تلقائيًا.',
    link: null,
    linkTextKey: null,
    linkText: null,
    color: 'bg-green-600',
  },
];

const ExternalLinkIcon = () => (
  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 rtl:scale-x-[-1]" aria-hidden="true" />
);

const StorefrontClaritySettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ projectId?: string; apiToken?: string }>({});

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const clarityProjectId = settings?.clarityProjectId || '';
  const isConnected = Boolean(clarityProjectId.trim());
  const clarityDashboardUrl = clarityProjectId
    ? `https://clarity.microsoft.com/projects/view/${clarityProjectId}/dashboard`
    : 'https://clarity.microsoft.com';

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSettings = async () => {
      try {
        const response = await storefrontSettingsService.getSettings();
        const settingsData = response.data as StorefrontSettings;
        setSettings(settingsData);
        if (settingsData?.clarityProjectId) setHasSaved(true);
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('Failed to fetch storefront settings:', error);
        toast.error(t('settings.fetchError', 'فشل تحميل الإعدادات'));
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    void fetchSettings();

    return () => abortController.abort();
  }, [t]);

  useEffect(() => {
    if (!copied) return;
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(copiedTimerRef.current);
  }, [copied]);

  const validate = (): boolean => {
    const errors: { projectId?: string; apiToken?: string } = {};
    const pid = settings?.clarityProjectId?.trim() || '';
    if (!pid) {
      errors.projectId = t('clarity.validate.projectIdRequired', 'Project ID مطلوب');
    } else if (!/^[a-z0-9]{7,10}$/.test(pid)) {
      errors.projectId = t('clarity.validate.projectIdFormat', 'الصيغة غير صحيحة. يجب أن يتكون من 7-10 أحرف وأرقام إنجليزية صغيرة');
    }
    const token = settings?.clarityApiToken?.trim() || '';
    if (token && token.length < 10) {
      errors.apiToken = t('clarity.validate.apiTokenIncomplete', 'API Token غير مكتمل');
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!settings) return;
    if (!validate()) return;

    setSaving(true);
    try {
      await storefrontSettingsService.updateSettings({
        clarityProjectId: settings.clarityProjectId,
        clarityApiToken: settings.clarityApiToken,
      });
      setHasSaved(true);
      toast.success(t('clarity.saveSuccess', 'تم حفظ إعدادات Clarity'));
    } catch (error) {
      console.error('Failed to update clarity settings:', error);
      toast.error(t('settings.saveError', 'فشل الحفظ، حاول مرة أخرى'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!settings) return;
    if (!window.confirm(t('clarity.disconnectConfirm', 'هل أنت متأكد من قطع اتصال Clarity؟ سيتم حذف الإعدادات.'))) return;
    setSaving(true);
    try {
      await storefrontSettingsService.updateSettings({
        clarityProjectId: '',
        clarityApiToken: '',
      });
      setSettings({ ...settings, clarityProjectId: '', clarityApiToken: '' });
      setHasSaved(false);
      setValidationErrors({});
      toast.success(t('clarity.disconnectSuccess', 'تم قطع اتصال Clarity'));
    } catch (error) {
      console.error('Failed to disconnect clarity:', error);
      toast.error(t('settings.saveError', 'فشل قطع الاتصال، حاول مرة أخرى'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = async () => {
    if (!clarityProjectId) return;
    try {
      await navigator.clipboard.writeText(clarityProjectId);
      setCopied(true);
      toast.success(t('clarity.copySuccess', 'تم نسخ الـ ID'));
    } catch {
      toast.error(t('clarity.copyError', 'تعذر نسخ الـ ID'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label={t('clarity.loading', 'جاري التحميل')}>
        <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" aria-hidden="true" />
      </div>
    );
  }

  const helperId = 'clarityProjectIdHelp';
  const helperTokenId = 'clarityApiTokenHelp';
  const errorId = 'clarityProjectIdError';
  const errorTokenId = 'clarityApiTokenError';

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ClarityLogo />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Microsoft Clarity
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('clarity.subtitle', 'افهم زبائنك من خلال خرائط الحرارة وتسجيلات الجلسات مجانًا.')}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            isConnected
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400'
              : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400'
          }`}
        >
          {isConnected ? (
            <>
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              {t('clarity.connected', 'متصل والتتبع نشط')}
            </>
          ) : (
            <>
              <XCircleIcon className="h-4 w-4" aria-hidden="true" />
              {t('clarity.disconnected', 'غير متصل')}
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="clarityProjectId"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Clarity Project ID
            </label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-600 divide-x rtl:divide-x-reverse">
              <span className="inline-flex items-center bg-gray-50 px-3 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
                ID
              </span>
              <input
                type="text"
                id="clarityProjectId"
                value={clarityProjectId}
                onChange={(event) => {
                  setSettings((current) =>
                    current
                      ? { ...current, clarityProjectId: event.target.value }
                      : null,
                  );
                  setValidationErrors((v) => v.projectId ? { ...v, projectId: undefined } : v);
                }}
                className="min-w-0 flex-1 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder-gray-400 dark:bg-slate-900 dark:text-white"
                placeholder={t('clarity.projectIdPlaceholder', 'مثال: k3a9mz1b')}
                dir="ltr"
                aria-describedby={validationErrors.projectId ? errorId : helperId}
                aria-invalid={!!validationErrors.projectId}
                maxLength={10}
              />
              <button
                type="button"
                onClick={handleCopyId}
                aria-label={t('clarity.copyId', 'نسخ الـ ID')}
                tabIndex={clarityProjectId ? 0 : -1}
                className={`inline-flex items-center bg-gray-50 px-3 text-gray-400 transition-all hover:text-gray-600 dark:bg-slate-700 dark:hover:text-gray-300 ${
                  clarityProjectId ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                {copied ? (
                  <CheckCircleIconSolid className="h-4 w-4 text-green-500" aria-hidden="true" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {validationErrors.projectId && (
              <p className="mt-1.5 text-xs text-red-600" id={errorId} role="alert">{validationErrors.projectId}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" id={helperId}>
              {t('clarity.projectIdHelp', 'ستجد هذا الـ ID في لوحة Clarity ثم Settings ثم Overview.')}
            </p>
          </div>

          <div>
            <label
              htmlFor="clarityApiToken"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Clarity API Token
            </label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-600 divide-x rtl:divide-x-reverse">
              <span className="inline-flex items-center bg-gray-50 px-3 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
                <KeyIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                type="text"
                id="clarityApiToken"
                value={settings?.clarityApiToken || ''}
                onChange={(event) => {
                  setSettings((current) =>
                    current
                      ? { ...current, clarityApiToken: event.target.value }
                      : null,
                  );
                  setValidationErrors((v) => v.apiToken ? { ...v, apiToken: undefined } : v);
                }}
                className="min-w-0 flex-1 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder-gray-400 dark:bg-slate-900 dark:text-white"
                placeholder={t('clarity.apiTokenPlaceholder', 'JWT API Token')}
                dir="ltr"
                aria-describedby={validationErrors.apiToken ? errorTokenId : helperTokenId}
                aria-invalid={!!validationErrors.apiToken}
                maxLength={500}
              />
            </div>
            {validationErrors.apiToken && (
              <p className="mt-1.5 text-xs text-red-600" id={errorTokenId} role="alert">{validationErrors.apiToken}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" id={helperTokenId}>
              {t('clarity.apiTokenHelp', 'من Clarity → Settings → Data Export → Generate new API token. مطلوب لعرض التحليلات في لوحة التحكم.')}
            </p>
          </div>

          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              isConnected
                ? 'border-green-100 bg-green-50 dark:border-green-800/30 dark:bg-green-900/20'
                : 'border-yellow-100 bg-yellow-50 dark:border-yellow-800/30 dark:bg-yellow-900/20'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t('clarity.active', 'Clarity نشط على متجرك')}
                  </p>
                  <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                    {t('clarity.activeDesc', 'يتم الآن تسجيل جلسات الزوار وخرائط الحرارة. قد تظهر البيانات خلال 24 إلى 48 ساعة.')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {t('clarity.inactive', 'Clarity غير مفعّل بعد')}
                  </p>
                  <p className="mt-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                    {t('clarity.inactiveDesc', 'أدخل Project ID أعلاه واحفظ للتفعيل.')}
                  </p>
                </div>
              </>
            )}
          </div>

          {isConnected && hasSaved ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={clarityDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              >
                <ChartBarIcon className="h-4 w-4" aria-hidden="true" />
                {t('clarity.openDashboard', 'فتح لوحة Clarity')}
                <ExternalLinkIcon />
              </a>
              <a
                href={`https://clarity.microsoft.com/projects/view/${clarityProjectId}/heatmaps`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
              >
                <FireIcon className="h-4 w-4" aria-hidden="true" />
                {t('clarity.heatmaps', 'خرائط الحرارة')}
                <ExternalLinkIcon />
              </a>
              <a
                href={`https://clarity.microsoft.com/projects/view/${clarityProjectId}/recordings`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
              >
                <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
                {t('clarity.recordings', 'تسجيلات الزوار')}
                <ExternalLinkIcon />
              </a>
              <a
                href={`https://clarity.microsoft.com/projects/view/${clarityProjectId}/funnels`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
              >
                <FunnelIcon className="h-4 w-4" aria-hidden="true" />
                {t('clarity.funnels', 'تحليل المبيعات')}
                <ExternalLinkIcon />
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
          <a
            href="https://clarity.microsoft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('clarity.freeService', 'الخدمة مجانية تمامًا من Microsoft')}
            <ExternalLinkIcon />
          </a>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircleIcon className="h-4 w-4" aria-hidden="true" />
                {t('clarity.disconnect', 'قطع الاتصال')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                  {t('clarity.saving', 'جاري الحفظ...')}
                </>
              ) : (
                <>
                  <CheckCircleIconSolid className="h-4 w-4" aria-hidden="true" />
                  {t('clarity.save', 'حفظ الإعدادات')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {!isConnected ? (
        <details className="group rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800" open={!hasSaved}>
          <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <InformationCircleIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
            {t('clarity.setupSteps', 'خطوات الربط')}
          </summary>
          <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-3 dark:border-slate-700">
            {SETUP_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div
                  className={`${step.color} flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white`}
                >
                  {step.step}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t(step.titleKey, step.title)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(step.descKey, step.desc)}
                  </p>
                  {step.link ? (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {t(step.linkTextKey!, step.linkText!)}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 rtl:scale-x-[-1]" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('clarity.usefulLinks', 'روابط مفيدة')}
              </p>
              <div className="space-y-2">
                {[
                  { labelKey: 'clarity.link.signup', label: 'التسجيل المجاني على Clarity', url: 'https://clarity.microsoft.com' },
                  { labelKey: 'clarity.link.heatmaps', label: 'شرح Heatmaps بالتفصيل', url: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-heatmap' },
                  { labelKey: 'clarity.link.recordings', label: 'شرح Session Recordings', url: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/session-recordings' },
                  { labelKey: 'clarity.link.projectId', label: 'كيفية إيجاد الـ Project ID', url: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-overview' },
                ].map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 flex-shrink-0 rtl:scale-x-[-1]" aria-hidden="true" />
                    {t(link.labelKey, link.label)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </details>
      ) : null}

      {isConnected && hasSaved && settings?.clarityApiToken ? (
        <section aria-label={t('clarity.analyticsSection', 'تحليلات Clarity')}>
          <ClarityAnalyticsPanel
            projectId={clarityProjectId}
            apiToken={settings.clarityApiToken}
          />
        </section>
      ) : null}

      <details className="group rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('clarity.whatIsClarity', 'ماذا تقدم Clarity؟')}
        </summary>
        <div className="border-t border-gray-100 p-4 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${feature.color}`}
              >
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {t(feature.titleKey, feature.title)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {feature.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {t(feature.descKey, feature.desc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </details>

      <section aria-label={t('clarity.tipsSection', 'نصائح')}>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-800/30 dark:bg-indigo-900/20">
          <h2 className="mb-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300">{t('clarity.tips', 'نصائح للاستفادة القصوى')}</h2>
          <ul className="space-y-1.5 text-xs leading-relaxed text-indigo-600 dark:text-indigo-400">
            <li>{t('clarity.tip1', 'انتظر 24 إلى 48 ساعة بعد التفعيل لتظهر أول بيانات في اللوحة.')}</li>
            <li>{t('clarity.tip2', 'ركز على صفحة المنتج والـ checkout لأنهما الأهم في رحلة الشراء.')}</li>
            <li>{t('clarity.tip3', 'راجع تقارير Rage Clicks أسبوعيًا لاكتشاف المشاكل المؤثرة على التحويل.')}</li>
            <li>{t('clarity.tip4', 'يمكنك ربط Clarity مع Google Analytics للحصول على رؤية أكمل.')}</li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default StorefrontClaritySettings;
