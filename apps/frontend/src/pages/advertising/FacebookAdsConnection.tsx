import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  LockKeyhole,
  MessageCircle,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { changeLanguage } from "../../i18n";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  facebookAdsService,
  type FacebookAdsConnectionStatus,
} from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";

const safeStr = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : String(v);

const i18nTexts = {
  ar: {
    badge: "ربط إعلانات Meta",
    title: "ربط إعلانات Meta",
    subtitle: "اربط أكثر من حساب فيسبوك للإعلانات بدون التأثير على توكنات الصفحات والرسائل.",
    refresh: "تحديث",
    connected: "متصل",
    disconnected: "غير متصل",
    loading: "جار التحميل...",
    switchLang: "English",

    // Metric tiles
    facebookAccounts: "حسابات فيس بوك",
    adAccounts: "حسابات إعلانية",
    isolatedTokens: "توكنات معزولة",
    messengerPages: "صفحات الرسائل",

    // Main section
    isolatedSectionTitle: "توكن الإعلانات المعزول",
    isolatedSectionSubtitle: "كل حساب فيس بوك يتم حفظه كمصدر مستقل لحسابات الإعلانات.",
    connectAnother: "ربط حساب فيس بوك آخر",
    connecting: "جاري بدء الربط...",

    // Connected accounts
    connectedSourcesTitle: "حسابات فيس بوك المربوطة",
    sourcesCount: "مصدر",
    loadingSources: "جاري تحميل مصادر الربط...",
    noSourcesFound: "لا توجد مصادر حسابات فيس بوك للإعلانات بعد.",
    adAccountsCount: "حساب إعلاني",
    lastSynced: "آخر مزامنة",
    notSyncedYet: "لم تتم المزامنة بعد",
    noErrors: "بدون أخطاء",
    disconnect: "فصل",
    disconnecting: "جاري الفصل...",
    confirmDisconnect: "هل تريد فصل مصدر الإعلانات: {name}؟ لن يتم تغيير توكنات الصفحات أو الرسائل.",
    fromMeta: "من Meta",
    testFailed: "فشل الاختبار",
    notTested: "لم يتم الاختبار",

    // Table
    tableAccount: "الحساب",
    tableSource: "المصدر",
    tableCurrency: "العملة",
    tableStatus: "الحالة",
    tableTokenType: "نوع التوكن",
    loadingAccounts: "جاري تحميل الحسابات...",
    noSavedAccounts: "لا توجد حسابات إعلانية محفوظة بعد.",
    statusActive: "نشط",
    statusSaved: "محفوظ",
    tokenFromSource: "من المصدر",
    tokenIsolated: "معزول",
    tokenMissing: "ناقص",
    legacySource: "مصدر قديم",
    facebookAccount: "حساب فيس بوك",

    // Aside
    msgProtectionTitle: "حماية الرسائل",
    msgProtectionDesc1: "لا يتم تعديل توكنات الصفحات من هذا الربط.",
    msgProtectionDesc2: "رسائل الصفحة والردود تظل على صلاحية الربط الحالي.",
    msgProtectedPill: "توكنات الرسائل محمية",

    metaTestTitle: "اختبار وفحص Meta",
    metaApiValid: "Meta API صالح",
    needsTest: "يحتاج اختبار",
    metaReturnedCount: "Meta رجّعت {count} حساب.",
    metaTestPending: "سيتم اختبار التوكن بعد الربط.",
    metaTestFailed: "تعذر اختبار توكن الإعلانات.",

    // Errors & toasts
    oauthAccessDenied: "تم رفض طلب الوصول من Meta.",
    oauthMissingParams: "بيانات الربط غير مكتملة. حاول مرة أخرى.",
    oauthExpired: "انتهت صلاحية طلب الربط. ابدأ الربط من جديد.",
    oauthFailed: "فشل استكمال ربط الإعلانات.",
    oauthGeneralError: "فشل ربط إعلانات Meta.",
    companyNotFound: "معرف الشركة غير متوفر",
    startConnectFailed: "فشل بدء ربط الإعلانات",
    disconnectSuccess: "تم فصل مصدر الإعلانات بنجاح.",
    disconnectFailed: "فشل فصل مصدر الإعلانات.",
    adsConnectedSuccess: "تم ربط إعلانات Meta بنجاح.",
    adsConnectedCount: "تم ربط الإعلانات وتحديث {count} حساب.",
    loadStatusFailed: "فشل تحميل حالة ربط الإعلانات",
  },
  en: {
    badge: "Meta Ads Integration",
    title: "Meta Ads Connection",
    subtitle: "Connect multiple Facebook ad accounts securely without affecting page or messenger tokens.",
    refresh: "Refresh",
    connected: "Connected",
    disconnected: "Disconnected",
    loading: "Loading...",
    switchLang: "العربية",

    // Metric tiles
    facebookAccounts: "Facebook Accounts",
    adAccounts: "Ad Accounts",
    isolatedTokens: "Isolated Tokens",
    messengerPages: "Messenger Pages",

    // Main section
    isolatedSectionTitle: "Isolated Ad Credentials",
    isolatedSectionSubtitle: "Each Facebook profile is preserved as an independent credential source for your ad accounts.",
    connectAnother: "Connect Another Facebook Account",
    connecting: "Connecting...",

    // Connected accounts
    connectedSourcesTitle: "Connected Facebook Accounts",
    sourcesCount: "source(s)",
    loadingSources: "Loading connection sources...",
    noSourcesFound: "No Facebook ad account sources connected yet.",
    adAccountsCount: "ad accounts",
    lastSynced: "Last synced",
    notSyncedYet: "Not synced yet",
    noErrors: "No errors",
    disconnect: "Disconnect",
    disconnecting: "Disconnecting...",
    confirmDisconnect: "Disconnect ad source: {name}? Page and messenger tokens will remain untouched.",
    fromMeta: "from Meta",
    testFailed: "Test failed",
    notTested: "Not tested",

    // Table
    tableAccount: "Ad Account",
    tableSource: "Source Profile",
    tableCurrency: "Currency",
    tableStatus: "Status",
    tableTokenType: "Token Type",
    loadingAccounts: "Loading ad accounts...",
    noSavedAccounts: "No saved ad accounts found yet.",
    statusActive: "Active",
    statusSaved: "Saved",
    tokenFromSource: "From Source",
    tokenIsolated: "Isolated",
    tokenMissing: "Missing",
    legacySource: "Legacy Source",
    facebookAccount: "Facebook Profile",

    // Aside
    msgProtectionTitle: "Messenger Protection",
    msgProtectionDesc1: "Page access tokens are never modified by this connection.",
    msgProtectionDesc2: "Page chats and auto-replies remain securely on their active permissions.",
    msgProtectedPill: "Messenger Tokens Protected",

    metaTestTitle: "Meta API Health",
    metaApiValid: "Meta API Valid",
    needsTest: "Verification Needed",
    metaReturnedCount: "Meta returned {count} account(s).",
    metaTestPending: "Token will be validated automatically upon connection.",
    metaTestFailed: "Failed to verify ad token with Meta API.",

    // Errors & toasts
    oauthAccessDenied: "Access request was denied by Meta.",
    oauthMissingParams: "Incomplete authorization data. Please try again.",
    oauthExpired: "Authorization request expired. Please reconnect.",
    oauthFailed: "Failed to complete ads OAuth callback.",
    oauthGeneralError: "Failed to connect Meta Ads.",
    companyNotFound: "Company ID is not available",
    startConnectFailed: "Failed to initialize Facebook Ads connection",
    disconnectSuccess: "Ad source disconnected successfully.",
    disconnectFailed: "Failed to disconnect ad source.",
    adsConnectedSuccess: "Meta Ads connected successfully.",
    adsConnectedCount: "Connected ads and synced {count} account(s).",
    loadStatusFailed: "Failed to load Facebook Ads connection status",
  },
};

const StatusPill = ({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) => (
  <span
    className={[
      "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold tracking-wide",
      ok
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60",
    ].join(" ")}
  >
    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
    {label}
  </span>
);

const MetricTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 dark:hover:border-slate-700">
    <div className="flex items-center gap-3.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const FacebookAdsConnection: React.FC = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const t = isEn ? i18nTexts.en : i18nTexts.ar;

  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<FacebookAdsConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnectingSourceId, setDisconnectingSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAdAccountId = status?.activeAdAccount?.accountId || undefined;
  const savedAdAccounts = status?.savedAdAccounts ?? [];
  const connectionSources = status?.connectionSources ?? [];
  const remoteSourcesById = useMemo(
    () =>
      new Map(
        (status?.remoteSources ?? []).map((sourceStatus) => [
          sourceStatus.sourceId,
          sourceStatus,
        ]),
      ),
    [status?.remoteSources],
  );

  const toggleLanguage = () => {
    const nextLang = isEn ? "ar" : "en";
    changeLanguage(nextLang);
  };

  const getOAuthErrorMessage = useCallback(
    (errorCode: string) => {
      switch (errorCode) {
        case "facebook_oauth_access_denied":
          return t.oauthAccessDenied;
        case "missing_code_or_state":
        case "invalid_state":
          return t.oauthMissingParams;
        case "state_expired":
          return t.oauthExpired;
        case "callback_failed":
          return t.oauthFailed;
        default:
          return t.oauthGeneralError;
      }
    },
    [t],
  );

  const formatDateTime = useCallback(
    (value?: string | null) => {
      if (!value) return t.notSyncedYet;
      try {
        return new Intl.DateTimeFormat(isEn ? "en-US" : "ar-EG", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value));
      } catch {
        return safeStr(value);
      }
    },
    [isEn, t],
  );

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextStatus = await facebookAdsService.getAdsConnectionStatus();
      setStatus(nextStatus);
    } catch (loadError: unknown) {
      console.error("Failed to load Facebook Ads connection status:", loadError);
      setError(t.loadStatusFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadStatusFailed]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const success = searchParams.get("success");
    const errorCode = searchParams.get("error");
    const syncedAdAccounts = searchParams.get("syncedAdAccounts");

    if (success === "ads_connected") {
      toast.success(
        syncedAdAccounts
          ? t.adsConnectedCount.replace("{count}", syncedAdAccounts)
          : t.adsConnectedSuccess,
      );
      loadStatus();
    } else if (errorCode) {
      toast.error(getOAuthErrorMessage(errorCode));
    } else {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    [
      "success",
      "error",
      "syncedAdAccounts",
      "activeAdAccountId",
      "sourceId",
    ].forEach((key) => nextParams.delete(key));
    setSearchParams(nextParams, { replace: true });
  }, [getOAuthErrorMessage, loadStatus, searchParams, setSearchParams, t]);

  const handleConnectAds = async () => {
    if (!user?.companyId) {
      toast.error(t.companyNotFound);
      return;
    }

    try {
      setConnecting(true);
      setError(null);
      const response = await facebookAdsService.getAdsAuthorizationUrl({
        companyId: user.companyId,
        returnOrigin: window.location.origin,
      });

      if (!response.success || !response.authUrl) {
        throw new Error(response.message || "Failed to create ads auth URL");
      }

      window.location.assign(response.authUrl);
    } catch (connectError: unknown) {
      console.error("Failed to start Facebook Ads OAuth:", connectError);
      setError(t.startConnectFailed);
      toast.error(t.startConnectFailed);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectSource = async (sourceId: string) => {
    const source = connectionSources.find((item) => item.id === sourceId);
    const sourceName =
      source?.facebookUserName ||
      source?.facebookUserEmail ||
      source?.facebookUserId ||
      "";

    const confirmed = window.confirm(
      t.confirmDisconnect.replace("{name}", sourceName),
    );
    if (!confirmed) return;

    try {
      setDisconnectingSourceId(sourceId);
      await facebookAdsService.disconnectAdsConnectionSource(sourceId);
      toast.success(t.disconnectSuccess);
      await loadStatus();
    } catch (disconnectError: unknown) {
      console.error("Failed to disconnect Facebook Ads source:", disconnectError);
      toast.error(t.disconnectFailed);
    } finally {
      setDisconnectingSourceId(null);
    }
  };

  const connectionLabel = useMemo(() => {
    if (!status) return t.loading;
    return status.connected ? t.connected : t.disconnected;
  }, [status, t]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col gap-4">
        <FacebookAdsModuleNav />
        {/* Header Container */}
        <header className="flex flex-col gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                <PlugZap className="h-3.5 w-3.5" />
                {t.badge}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                {t.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                ok={Boolean(status?.connected)}
                label={connectionLabel}
              />
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title={isEn ? "تبديل إلى العربية" : "Switch to English"}
              >
                <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.switchLang}</span>
              </button>
              <button
                type="button"
                onClick={loadStatus}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(" ")} />
                {t.refresh}
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {safeStr(error)}
          </div>
        ) : null}

        {/* 4 Metric Tiles */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={Users}
            label={t.facebookAccounts}
            value={status?.connectedFacebookAccountsCount ?? 0}
          />
          <MetricTile
            icon={WalletCards}
            label={t.adAccounts}
            value={savedAdAccounts.length}
          />
          <MetricTile
            icon={LockKeyhole}
            label={t.isolatedTokens}
            value={status?.isolatedAdAccountsCount ?? 0}
          />
          <MetricTile
            icon={MessageCircle}
            label={t.messengerPages}
            value={status?.pageConnection.connectedPagesCount ?? 0}
          />
        </section>

        {/* Main Grid: Accounts List + Aside */}
        <main className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            {/* Primary Action Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.isolatedSectionTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t.isolatedSectionSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectAds}
                  disabled={connecting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  {connecting ? t.connecting : t.connectAnother}
                </button>
              </div>

              {/* Connected Facebook Profiles List */}
              <div className="mt-4 rounded-xl border border-slate-200/70 overflow-hidden dark:border-slate-800/70">
                <div className="flex items-center justify-between gap-2 bg-slate-50/90 px-4 py-2.5 dark:bg-slate-800/50">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t.connectedSourcesTitle}
                  </h3>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {connectionSources.length} {t.sourcesCount}
                  </span>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-xs font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    {t.loadingSources}
                  </div>
                ) : connectionSources.length ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {connectionSources.map((source) => {
                      const remoteSource = remoteSourcesById.get(source.id);
                      const sourceName =
                        source.facebookUserName ||
                        source.facebookUserEmail ||
                        source.facebookUserId;
                      const isConnected =
                        source.status === "connected" && source.hasToken;
                      const disconnecting = disconnectingSourceId === source.id;

                      return (
                        <div
                          key={source.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                              <Users className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {sourceName}
                              </p>
                              <p className="truncate text-xs font-mono text-slate-400 dark:text-slate-500">
                                {source.facebookUserId}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {source.syncedAdAccountsCount} {t.adAccountsCount}
                            </span>
                            <span className="text-slate-400">
                              {formatDateTime(source.lastSyncedAt || source.connectedAt)}
                            </span>
                            {remoteSource?.checked ? (
                              remoteSource.ok ? (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  {remoteSource.accountsCount ?? 0} {t.fromMeta}
                                </span>
                              ) : (
                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                  {safeStr(remoteSource.error) || t.testFailed}
                                </span>
                              )
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <StatusPill
                              ok={isConnected}
                              label={isConnected ? t.connected : t.disconnected}
                            />
                            <button
                              type="button"
                              onClick={() => handleDisconnectSource(source.id)}
                              disabled={!isConnected || disconnecting}
                              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            >
                              {disconnecting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unplug className="h-3 w-3" />
                              )}
                              {disconnecting ? t.disconnecting : t.disconnect}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t.noSourcesFound}
                  </div>
                )}
              </div>

              {/* Saved Ad Accounts Table */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800/70">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50/90 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 text-start font-semibold">{t.tableAccount}</th>
                      <th className="px-4 py-2.5 text-start font-semibold">{t.tableSource}</th>
                      <th className="px-4 py-2.5 text-start font-semibold">{t.tableCurrency}</th>
                      <th className="px-4 py-2.5 text-start font-semibold">{t.tableStatus}</th>
                      <th className="px-4 py-2.5 text-start font-semibold">{t.tableTokenType}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          <Loader2 className="inline-block h-4 w-4 animate-spin me-2 text-blue-600" />
                          {t.loadingAccounts}
                        </td>
                      </tr>
                    ) : savedAdAccounts.length ? (
                      savedAdAccounts.map((account) => (
                        <tr
                          key={account.id}
                          className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {account.name}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {account.accountId}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            {account.connectionSource?.facebookUserName ||
                              account.connectionSource?.facebookUserEmail ||
                              (account.connectionSourceId ? t.facebookAccount : t.legacySource)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {account.currency}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                account.isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "h-1.5 w-1.5 rounded-full",
                                  account.isActive ? "bg-emerald-500" : "bg-slate-400",
                                ].join(" ")}
                              />
                              {account.isActive ? t.statusActive : t.statusSaved}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            {account.tokenSource === "facebook_account"
                              ? t.tokenFromSource
                              : account.hasIsolatedToken
                                ? t.tokenIsolated
                                : t.tokenMissing}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          {t.noSavedAccounts}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Aside: Messenger Protection & Meta Health */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.msgProtectionTitle}
                </h2>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p>{t.msgProtectionDesc1}</p>
                <p>{t.msgProtectionDesc2}</p>
              </div>
              <div className="mt-3.5">
                <StatusPill
                  ok={Boolean(status?.pageConnection.messengerTokensProtected)}
                  label={t.msgProtectedPill}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <PlugZap className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.metaTestTitle}
                </h2>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  {status?.remote.checked
                    ? status.remote.ok
                      ? t.metaReturnedCount.replace("{count}", String(status.remote.accountsCount ?? 0))
                      : safeStr(status.remote.error) || t.metaTestFailed
                    : t.metaTestPending}
                </p>
              </div>
              <div className="mt-3.5">
                <StatusPill
                  ok={Boolean(status?.remote.ok)}
                  label={status?.remote.ok ? t.metaApiValid : t.needsTest}
                />
              </div>
              {status?.remoteSources?.length ? (
                <div className="mt-3 space-y-1.5">
                  {status.remoteSources.map((sourceRemote) => {
                    const source = connectionSources.find(
                      (item) => item.id === sourceRemote.sourceId,
                    );
                    return (
                      <div
                        key={sourceRemote.sourceId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-800/60"
                      >
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {source?.facebookUserName ||
                            source?.facebookUserEmail ||
                            sourceRemote.sourceId}
                        </span>
                        <span
                          className={[
                            "font-semibold",
                            sourceRemote.ok
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300",
                          ].join(" ")}
                        >
                          {sourceRemote.ok
                            ? `${sourceRemote.accountsCount ?? 0} ${t.fromMeta}`
                            : t.testFailed}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default FacebookAdsConnection;

