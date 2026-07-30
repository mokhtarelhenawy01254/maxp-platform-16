import { RefreshCw as ArrowPathIcon, DollarSign as BanknotesIcon, Building as BuildingOfficeIcon, CreditCard as CreditCardIcon, AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from "react";
;
import {
  FacebookAdsAccountContext,
} from "../../hooks/useFacebookAdsAccountContext";
import {
  facebookAdsService,
  FacebookPagesMeta,
  FacebookPixel,
} from "../../services/facebookAdsService";
import { formatCurrency } from "../../utils/facebookAdsHelpers";

interface FacebookAdsAccountContextPanelProps {
  context: FacebookAdsAccountContext;
  compact?: boolean;
}


const getAccountId = (account: { account_id?: string; id?: string }) =>
  account.account_id || account.id || "";

const getBusinessGroupKey = (
  account: FacebookAdsAccountContext["adAccounts"][number],
) => account.business?.id || "unassigned";

const getBusinessGroupLabel = (
  account: FacebookAdsAccountContext["adAccounts"][number],
) =>
  account.business?.name
    ? `${account.business.name} (${account.business.id || "بدون ID"})`
    : "حسابات بدون Business ظاهر من Meta";

const FacebookAdsAccountContextPanel: React.FC<
  FacebookAdsAccountContextPanelProps
> = ({ context, compact = false }) => {
  const {
    adAccounts,
    selectedAdAccount,
    selectedAdAccountId,
    loading,
    error,
    refreshAdAccounts,
    setSelectedAdAccountId,
  } = context;
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
  const [pagesMeta, setPagesMeta] = useState<FacebookPagesMeta | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const billingHealth = selectedAdAccount?.billingHealth;
  const currency =
    billingHealth?.currency || selectedAdAccount?.currency || "EGP";
  const selectedBusinessName =
    selectedAdAccount?.business?.name ||
    billingHealth?.business?.name ||
    "Business غير ظاهر";
  const selectedBusinessId =
    selectedAdAccount?.business?.id ||
    billingHealth?.business?.id ||
    null;
  const businessGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        accounts: typeof adAccounts;
      }
    >();

    adAccounts.forEach((account) => {
      const key = getBusinessGroupKey(account);
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.accounts.push(account);
        return;
      }

      groups.set(key, {
        label: getBusinessGroupLabel(account),
        accounts: [account],
      });
    });

    return Array.from(groups.entries()).sort(([, a], [, b]) =>
      a.label.localeCompare(b.label, "ar"),
    );
  }, [adAccounts]);
  const savedAccountsCount = adAccounts.filter((account) => account.isSaved).length;
  const usableAccountsCount = adAccounts.filter(
    (account) => account.billingHealth?.isAccountUsable !== false,
  ).length;

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      if (!selectedAdAccountId) {
        setPixels([]);
        setPagesMeta(null);
        return;
      }

      try {
        setAssetsLoading(true);
        const [pixelList, pageOptions] = await Promise.all([
          facebookAdsService.getFacebookPixels(selectedAdAccountId),
          facebookAdsService.getFacebookPageOptions(),
        ]);

        if (!cancelled) {
          setPixels(pixelList);
          setPagesMeta(pageOptions.meta || null);
        }
      } catch (assetError) {
        if (!cancelled) {
          setPixels([]);
          setPagesMeta(null);
        }
      } finally {
        if (!cancelled) {
          setAssetsLoading(false);
        }
      }
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, [selectedAdAccountId]);

  if (compact) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <BuildingOfficeIcon className="h-4 w-4" />
                Meta Ads
              </span>
              {selectedAdAccount && (
                <>
                  <span className="truncate text-slate-900 dark:text-white">
                    {selectedAdAccount.name}
                  </span>
                  <span>Business: {selectedBusinessName}</span>
                  <span>Pixels: {assetsLoading ? "..." : pixels.length}</span>
                  <span>
                    Pages: {assetsLoading ? "..." : pagesMeta?.counts?.ready || 0}
                  </span>
                  {(billingHealth?.warnings || []).length > 0 && (
                    <span className="text-amber-700 dark:text-amber-200">
                      Warnings: {billingHealth?.warnings?.length || 0}
                    </span>
                  )}
                </>
              )}
            </div>
            {selectedBusinessId && (
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                Business ID: {selectedBusinessId} / Account ID:{" "}
                {selectedAdAccountId}
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="facebook-ad-account-select">
              الحساب الإعلاني
            </label>
            <select
              id="facebook-ad-account-select"
              value={selectedAdAccountId}
              onChange={(event) => setSelectedAdAccountId(event.target.value)}
              disabled={loading || adAccounts.length === 0}
              className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-[360px]"
            >
              <option value="">
                {loading ? "جاري تحميل الحسابات..." : "اختر حساباً إعلانياً"}
              </option>
              {businessGroups.map(([businessKey, group]) => (
                <optgroup key={businessKey} label={group.label}>
                  {group.accounts.map((account) => {
                    const accountId = getAccountId(account);
                    const accountCurrency =
                      account.currency ||
                      account.billingHealth?.currency ||
                      "غير محدد";
                    const statusLabel =
                      account.billingHealth?.accountStatusLabel ||
                      account.account_status ||
                      "حالة غير ظاهرة";

                    return (
                      <option key={account.id || accountId} value={accountId}>
                        {account.name} - {accountId} - {accountCurrency} -{" "}
                        {statusLabel}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshAdAccounts}
              disabled={loading}
              title="تحديث الحسابات الإعلانية من Meta"
              aria-label="تحديث الحسابات الإعلانية من Meta"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && adAccounts.length === 0 && !error && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            لا توجد حسابات إعلانية ظاهرة لهذا التوكن.
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <BuildingOfficeIcon className="h-5 w-5" />
            سياق Meta Ads الحالي
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
            {selectedAdAccount?.name || "اختر الحساب الإعلاني"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            كل المزامنة والتقارير على هذه الصفحة ستتم على الحساب المحدد فقط.
          </p>
          {selectedAdAccount && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Business: {selectedBusinessName}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                Ad Account: {selectedAdAccountId}
              </span>
              {selectedBusinessId && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Business ID: {selectedBusinessId}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="facebook-ad-account-select"
              className="text-xs font-bold text-slate-500 dark:text-slate-400"
            >
              الحساب الإعلاني
            </label>
            <div className="mb-1 flex flex-wrap gap-1 text-[11px] font-bold">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                Businesses: {businessGroups.length}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                محفوظة: {savedAccountsCount}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                قابلة للاستخدام: {usableAccountsCount}
              </span>
            </div>
            <select
              id="facebook-ad-account-select"
              value={selectedAdAccountId}
              onChange={(event) => setSelectedAdAccountId(event.target.value)}
              disabled={loading || adAccounts.length === 0}
              className="min-w-[280px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              aria-describedby="facebook-ad-account-help"
            >
              <option value="">
                {loading ? "جاري تحميل الحسابات..." : "اختر حساباً إعلانياً"}
              </option>
              {businessGroups.map(([businessKey, group]) => (
                <optgroup key={businessKey} label={group.label}>
                  {group.accounts.map((account) => {
                    const accountId = getAccountId(account);
                    const accountCurrency =
                      account.currency ||
                      account.billingHealth?.currency ||
                      "غير محدد";
                    const statusLabel =
                      account.billingHealth?.accountStatusLabel ||
                      account.account_status ||
                      "حالة غير ظاهرة";
                    const savedLabel = account.isSaved ? "محفوظ" : "غير محفوظ";
                    const activeLabel = account.isActive ? "افتراضي" : "اختياري";

                    return (
                      <option key={account.id || accountId} value={accountId}>
                        {account.name} - {accountId} - {accountCurrency} -{" "}
                        {statusLabel} - {savedLabel} - {activeLabel}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <span id="facebook-ad-account-help" className="sr-only">
              اختيار الحساب الإعلاني يحدد الحملات والتقارير والمزامنة في هذه
              الصفحة.
            </span>
          </div>

          <button
            type="button"
            onClick={refreshAdAccounts}
            disabled={loading}
            aria-label="تحديث الحسابات الإعلانية من Meta"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            تحديث الحسابات
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && adAccounts.length === 0 && !error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          لا توجد حسابات إعلانية ظاهرة لهذا التوكن. اربط حساب Facebook بصلاحيات
          `ads_read` و`ads_management` ثم أعد المحاولة.
        </div>
      )}

      {selectedAdAccount && (
        <div
          className={`mt-4 grid gap-3 ${
            compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-4"
          }`}
        >
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Business
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">
              {selectedAdAccount.business?.name ||
                billingHealth?.business?.name ||
                "غير ظاهر من Meta"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedAdAccount.business?.id ||
                billingHealth?.business?.id ||
                "business_management قد يكون مطلوب"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              حالة الحساب
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
              {billingHealth?.accountStatusLabel || "غير متاح"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              العملة: {currency}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-blue-500" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                الدفع
              </p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
              {billingHealth?.hasFundingSource ? "وسيلة دفع ظاهرة" : "غير ظاهر"}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {billingHealth?.fundingSourceDisplay || "لا نعرض بيانات بطاقة حساسة"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <div className="flex items-center gap-2">
              <BanknotesIcon className="h-5 w-5 text-emerald-500" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                الصرف والحدود
              </p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
              {formatCurrency(billingHealth?.amountSpent, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              حد الحساب: {formatCurrency(billingHealth?.spendCap, currency)}
            </p>
          </div>
        </div>
      )}

      {selectedAdAccount && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
            Pixels: {assetsLoading ? "..." : pixels.length}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            Pages جاهزة: {assetsLoading ? "..." : pagesMeta?.counts?.ready || 0}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Account ID: {selectedAdAccountId}
          </span>
        </div>
      )}

      {(billingHealth?.warnings || []).length > 0 && (
        <div className="mt-4 space-y-2">
          {billingHealth?.warnings?.map((warning) => (
            <div
              key={warning.code}
              className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default FacebookAdsAccountContextPanel;
