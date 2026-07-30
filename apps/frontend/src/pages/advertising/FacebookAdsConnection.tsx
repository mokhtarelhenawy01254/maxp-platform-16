import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole, MessageCircle, PlugZap, RefreshCw, ShieldCheck, Unplug, Users, WalletCards } from 'lucide-react';
import { toast } from "sonner";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  facebookAdsService,
  type FacebookAdsConnectionStatus,
} from "../../services/facebookAdsService";

const getOAuthErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case "facebook_oauth_access_denied":
      return "تم رفض طلب الوصول من Meta.";
    case "missing_code_or_state":
    case "invalid_state":
      return "بيانات الربط غير مكتملة. حاول مرة أخرى.";
    case "state_expired":
      return "انتهت صلاحية طلب الربط. ابدأ الربط من جديد.";
    case "callback_failed":
      return "فشل استكمال ربط الإعلانات.";
    default:
      return "فشل ربط إعلانات Meta.";
  }
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
      "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-black",
      ok
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
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
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const formatDateTime = (value?: string | null) => {
  if (!value) return "لم تتم المزامنة";

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "تاريخ غير واضح";
  }
};

const FacebookAdsConnection: React.FC = () => {
  const { user } = useAuth();
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

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextStatus = await facebookAdsService.getAdsConnectionStatus();
      setStatus(nextStatus);
    } catch (loadError: unknown) {
      console.error("Failed to load Facebook Ads connection status:", loadError);
      setError("فشل تحميل حالة ربط الإعلانات");
    } finally {
      setLoading(false);
    }
  }, []);

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
          ? `تم ربط الإعلانات وتحديث ${syncedAdAccounts} حساب.`
          : "تم ربط إعلانات Meta بنجاح.",
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
  }, [loadStatus, searchParams, setSearchParams]);

  const handleConnectAds = async () => {
    if (!user?.companyId) {
      toast.error("معرف الشركة غير متوفر");
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
      setError("فشل بدء ربط الإعلانات");
      toast.error("فشل بدء ربط الإعلانات");
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
      "هذا الحساب";

    const confirmed = window.confirm(
      `هل تريد فصل مصدر الإعلانات: ${sourceName}؟ لن يتم تغيير توكنات الصفحات أو الرسائل.`,
    );
    if (!confirmed) return;

    try {
      setDisconnectingSourceId(sourceId);
      await facebookAdsService.disconnectAdsConnectionSource(sourceId);
      toast.success("تم فصل مصدر الإعلانات.");
      await loadStatus();
    } catch (disconnectError: unknown) {
      console.error("Failed to disconnect Facebook Ads source:", disconnectError);
      toast.error("فشل فصل مصدر الإعلانات");
    } finally {
      setDisconnectingSourceId(null);
    }
  };

  const connectionLabel = useMemo(() => {
    if (!status) return "جار التحميل";
    return status.connected ? "متصل" : "غير متصل";
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-blue-600 dark:text-blue-300">
                Meta Ads
              </p>
              <h1 className="text-2xl font-black">ربط إعلانات Meta</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                اربط أكتر من حساب فيس بوك للإعلانات بدون التأثير على توكنات الصفحات والرسائل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                ok={Boolean(status?.connected)}
                label={connectionLabel}
              />
              <button
                type="button"
                onClick={loadStatus}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                تحديث
              </button>
            </div>
          </div>
          <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={Users}
            label="حسابات فيس بوك"
            value={status?.connectedFacebookAccountsCount ?? 0}
          />
          <MetricTile
            icon={WalletCards}
            label="حسابات إعلانية"
            value={savedAdAccounts.length}
          />
          <MetricTile
            icon={LockKeyhole}
            label="توكنات معزولة"
            value={status?.isolatedAdAccountsCount ?? 0}
          />
          <MetricTile
            icon={MessageCircle}
            label="صفحات الرسائل"
            value={status?.pageConnection.connectedPagesCount ?? 0}
          />
        </section>

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">توكن الإعلانات المعزول</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  كل حساب فيس بوك يتم حفظه كمصدر مستقل لحسابات الإعلانات.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectAds}
                disabled={connecting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlugZap className="h-4 w-4" />
                )}
                ربط حساب فيس بوك آخر
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2 dark:bg-slate-900">
                <h3 className="text-sm font-black">حسابات فيس بوك المربوطة</h3>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                  {connectionSources.length} مصدر
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل مصادر الربط...
                </div>
              ) : connectionSources.length ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
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
                        className="grid gap-2 px-3 py-2 text-sm md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                            <Users className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-black">{sourceName}</p>
                            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {source.facebookUserEmail || source.facebookUserId}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span>{source.syncedAdAccountsCount} حساب إعلاني</span>
                          <span>{formatDateTime(source.lastSyncedAt || source.connectedAt)}</span>
                          <span>
                            {remoteSource?.checked
                              ? remoteSource.ok
                                ? `${remoteSource.accountsCount ?? 0} من Meta`
                                : remoteSource.error || "فشل الاختبار"
                              : "لم يتم الاختبار"}
                          </span>
                          <span>{source.lastError || "بدون أخطاء"}</span>
                        </div>
                        <div className="flex items-center gap-2 md:justify-end">
                          <StatusPill
                            ok={isConnected}
                            label={isConnected ? "متصل" : "غير متصل"}
                          />
                          <button
                            type="button"
                            onClick={() => handleDisconnectSource(source.id)}
                            disabled={!isConnected || disconnecting}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-xs font-black text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-200 dark:hover:bg-red-950/30"
                          >
                            {disconnecting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unplug className="h-3.5 w-3.5" />
                            )}
                            فصل
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                  لا توجد مصادر حسابات فيس بوك للإعلانات بعد.
                </div>
              )}
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="grid min-w-[760px] grid-cols-[1.15fr_0.9fr_0.6fr_0.6fr_0.6fr] bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <span>الحساب</span>
                <span>المصدر</span>
                <span>العملة</span>
                <span>الحالة</span>
                <span>التوكن</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm font-bold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل الحسابات...
                </div>
              ) : savedAdAccounts.length ? (
                savedAdAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="grid min-w-[760px] grid-cols-[1.15fr_0.9fr_0.6fr_0.6fr_0.6fr] items-center border-t border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black">{account.name}</p>
                      <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {account.accountId}
                      </p>
                    </div>
                    <span className="truncate text-xs font-bold">
                      {account.connectionSource?.facebookUserName ||
                        account.connectionSource?.facebookUserEmail ||
                        (account.connectionSourceId ? "حساب فيس بوك" : "مصدر قديم")}
                    </span>
                    <span className="text-xs font-bold">{account.currency}</span>
                    <span className="text-xs font-bold">
                      {account.isActive ? "نشط" : "محفوظ"}
                    </span>
                    <span className="text-xs font-black">
                      {account.tokenSource === "facebook_account"
                        ? "من المصدر"
                        : account.hasIsolatedToken
                          ? "معزول"
                          : "ناقص"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                  لا توجد حسابات إعلانية محفوظة بعد.
                </div>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                حماية الرسائل
              </h2>
              <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <p>لا يتم تعديل توكنات الصفحات من هذا الربط.</p>
                <p>رسائل الصفحة والردود تظل على صلاحية الربط الحالي.</p>
              </div>
              <div className="mt-3">
                <StatusPill
                  ok={Boolean(status?.pageConnection.messengerTokensProtected)}
                  label="توكنات الرسائل محمية"
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-sm font-black">اختبار Meta</h2>
              <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <p>
                  {status?.remote.checked
                    ? status.remote.ok
                      ? `Meta رجّعت ${status.remote.accountsCount ?? 0} حساب.`
                      : status.remote.error || "تعذر اختبار توكن الإعلانات."
                    : "سيتم اختبار التوكن بعد الربط."}
                </p>
              </div>
              <div className="mt-3">
                <StatusPill
                  ok={Boolean(status?.remote.ok)}
                  label={status?.remote.ok ? "Meta API صالح" : "يحتاج اختبار"}
                />
              </div>
              {status?.remoteSources?.length ? (
                <div className="mt-2 space-y-1">
                  {status.remoteSources.map((sourceRemote) => {
                    const source = connectionSources.find(
                      (item) => item.id === sourceRemote.sourceId,
                    );
                    return (
                      <div
                        key={sourceRemote.sourceId}
                        className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <span className="truncate">
                          {source?.facebookUserName ||
                            source?.facebookUserEmail ||
                            sourceRemote.sourceId}
                        </span>
                        <span
                          className={
                            sourceRemote.ok
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }
                        >
                          {sourceRemote.ok
                            ? `${sourceRemote.accountsCount ?? 0} حساب`
                            : "فشل"}
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
