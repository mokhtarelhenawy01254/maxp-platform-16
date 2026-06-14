import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Gauge,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import MiniMetric from "../../components/advertising/dashboard/MiniMetric";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookAdsBudgetAlertLog,
  type FacebookAdsBudgetAlertMetric,
  type FacebookAdsBudgetAlertRule,
  type FacebookAdsBudgetAlertScope,
  type FacebookCampaign,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  formatCurrency,
  formatDate,
  getApiErrorMessage,
} from "../../utils/facebookAdsHelpers";

interface BudgetAlertFormState {
  scope: FacebookAdsBudgetAlertScope;
  metric: FacebookAdsBudgetAlertMetric;
  campaignId: string;
  thresholdAmount: string;
  recipientPhones: string;
  cooldownMinutes: string;
}

const defaultBudgetAlertForm: BudgetAlertFormState = {
  scope: "AD_ACCOUNT",
  metric: "ACCOUNT_BALANCE",
  campaignId: "",
  thresholdAmount: "100",
  recipientPhones: "",
  cooldownMinutes: "720",
};

const budgetAlertMetricOptions: Record<
  FacebookAdsBudgetAlertScope,
  Array<{ value: FacebookAdsBudgetAlertMetric; label: string }>
> = {
  AD_ACCOUNT: [
    { value: "ACCOUNT_BALANCE", label: "رصيد الحساب الإعلاني" },
    { value: "SPEND_CAP_REMAINING", label: "المتبقي من حد إنفاق الحساب" },
  ],
  CAMPAIGN: [
    { value: "CAMPAIGN_BUDGET_REMAINING", label: "المتبقي من ميزانية الحملة" },
    { value: "CAMPAIGN_FINISHED", label: "عند انتهاء الحملة/نفاد الميزانية" },
  ],
};

const budgetAlertScopeOptions: Array<{
  value: FacebookAdsBudgetAlertScope;
  label: string;
}> = [
  { value: "AD_ACCOUNT", label: "الحساب الإعلاني" },
  { value: "CAMPAIGN", label: "حملة محددة" },
];

const splitAlertPhones = (value: string) =>
  value
    .split(/[\n,;،؛]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getBudgetAlertMetricLabel = (metric: string) =>
  Object.values(budgetAlertMetricOptions)
    .flat()
    .find((option) => option.value === metric)?.label || metric;

const getBudgetAlertTargetName = (rule: FacebookAdsBudgetAlertRule) =>
  rule.scope === "CAMPAIGN"
    ? rule.campaign?.name || "حملة غير محددة"
    : rule.adAccount?.name || "حساب إعلاني";

const getRulePayload = (
  rule: FacebookAdsBudgetAlertRule,
  isEnabled = rule.isEnabled,
) => ({
  adAccountId: rule.adAccountId || null,
  campaignId: rule.campaignId || null,
  scope: rule.scope,
  metric: rule.metric,
  thresholdAmount: rule.thresholdAmount,
  currency: rule.currency,
  recipientPhones: rule.recipientPhones,
  isEnabled,
  cooldownMinutes: rule.cooldownMinutes,
  settings: rule.settings,
});

const BudgetAlertsPage: React.FC = () => {
  const accountContext = useFacebookAdsAccountContext();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [budgetAlertRules, setBudgetAlertRules] = useState<
    FacebookAdsBudgetAlertRule[]
  >([]);
  const [budgetAlertLogs, setBudgetAlertLogs] = useState<
    FacebookAdsBudgetAlertLog[]
  >([]);
  const [budgetAlertForm, setBudgetAlertForm] =
    useState<BudgetAlertFormState>(defaultBudgetAlertForm);
  const [savingBudgetAlert, setSavingBudgetAlert] = useState(false);
  const [testingBudgetAlertId, setTestingBudgetAlertId] = useState<string | null>(
    null,
  );
  const [checkingBudgetAlerts, setCheckingBudgetAlerts] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    adAccounts,
    selectedAdAccount,
    selectedAdAccountId,
    loading: contextLoading,
    setSelectedAdAccountId,
  } = accountContext;

  const selectedCurrency =
    selectedAdAccount?.currency ||
    selectedAdAccount?.billingHealth?.currency ||
    "EGP";
  const selectedAccountBalance = selectedAdAccount?.billingHealth?.balance ?? null;
  const selectedSpendCapRemaining =
    selectedAdAccount?.billingHealth?.spendCap != null
      ? selectedAdAccount.billingHealth.spendCap -
        (selectedAdAccount.billingHealth.amountSpent || 0)
      : null;

  const selectedAccountAlertRules = useMemo(
    () =>
      budgetAlertRules.filter((rule) => {
        if (!selectedAdAccountId) return true;
        const normalizedSelected = String(selectedAdAccountId).replace(/^act_/i, "");
        const normalizedRuleAccount = String(
          rule.adAccount?.accountId || rule.adAccountId || "",
        ).replace(/^act_/i, "");
        return !normalizedRuleAccount || normalizedRuleAccount === normalizedSelected;
      }),
    [budgetAlertRules, selectedAdAccountId],
  );

  const businessGroups = useMemo(() => {
    const groups = new Map<string, { label: string; accounts: typeof adAccounts }>();
    adAccounts.forEach((account) => {
      const key = account.business?.id || "unassigned";
      const label = account.business?.name || "حسابات بدون Business ظاهر";
      if (!groups.has(key)) groups.set(key, { label, accounts: [] });
      groups.get(key)!.accounts.push(account);
    });
    return Array.from(groups.entries());
  }, [adAccounts]);

  const loadBudgetAlerts = useCallback(async () => {
    if (!selectedAdAccountId) {
      setCampaigns([]);
      setBudgetAlertRules([]);
      setBudgetAlertLogs([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [campaignData, rules, logs] = await Promise.all([
        facebookAdsService.getCampaigns(selectedAdAccountId),
        facebookAdsService.getBudgetAlertRules().catch(() => []),
        facebookAdsService.getBudgetAlertLogs(20).catch(() => []),
      ]);
      setCampaigns(campaignData);
      setBudgetAlertRules(rules);
      setBudgetAlertLogs(logs);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحميل بيانات التنبيهات"));
    } finally {
      setLoading(false);
    }
  }, [selectedAdAccountId]);

  useEffect(() => {
    if (contextLoading) return;
    loadBudgetAlerts();
  }, [contextLoading, loadBudgetAlerts]);

  const updateBudgetAlertForm = (patch: Partial<BudgetAlertFormState>) => {
    setBudgetAlertForm((current) => {
      const next = { ...current, ...patch };
      if (patch.scope && patch.scope !== current.scope) {
        next.metric =
          budgetAlertMetricOptions[patch.scope]?.[0]?.value || current.metric;
        next.campaignId = patch.scope === "CAMPAIGN" ? current.campaignId : "";
        if (next.metric === "CAMPAIGN_FINISHED") {
          next.thresholdAmount = "0";
        }
      }
      if (patch.metric === "CAMPAIGN_FINISHED") {
        next.thresholdAmount = "0";
      }
      return next;
    });
  };

  const reloadBudgetAlerts = async () => {
    const [rules, logs] = await Promise.all([
      facebookAdsService.getBudgetAlertRules(),
      facebookAdsService.getBudgetAlertLogs(20),
    ]);
    setBudgetAlertRules(rules);
    setBudgetAlertLogs(logs);
  };

  const handleCreateBudgetAlert = async () => {
    if (!selectedAdAccountId) {
      toast.error("اختار حساب إعلاني الأول");
      return;
    }

    const recipientPhones = splitAlertPhones(budgetAlertForm.recipientPhones);
    if (recipientPhones.length === 0) {
      toast.error("اكتب رقم WhatsApp واحد على الأقل");
      return;
    }

    if (budgetAlertForm.scope === "CAMPAIGN" && !budgetAlertForm.campaignId) {
      toast.error("اختار الحملة المراد مراقبتها");
      return;
    }

    const thresholdAmount =
      budgetAlertForm.metric === "CAMPAIGN_FINISHED"
        ? 0
        : Number(budgetAlertForm.thresholdAmount);

    if (!Number.isFinite(thresholdAmount)) {
      toast.error("قيمة التنبيه غير صحيحة");
      return;
    }

    try {
      setSavingBudgetAlert(true);
      await facebookAdsService.createBudgetAlertRule({
        adAccountId: selectedAdAccountId,
        campaignId:
          budgetAlertForm.scope === "CAMPAIGN"
            ? budgetAlertForm.campaignId
            : null,
        scope: budgetAlertForm.scope,
        metric: budgetAlertForm.metric,
        thresholdAmount,
        currency: selectedCurrency,
        recipientPhones,
        cooldownMinutes: Number(budgetAlertForm.cooldownMinutes) || 720,
        isEnabled: true,
      });
      setBudgetAlertForm((current) => ({
        ...defaultBudgetAlertForm,
        recipientPhones: current.recipientPhones,
      }));
      await reloadBudgetAlerts();
      toast.success("تم إنشاء تنبيه WhatsApp للإعلانات");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل إنشاء التنبيه"));
    } finally {
      setSavingBudgetAlert(false);
    }
  };

  const handleTestBudgetAlert = async (ruleId: string) => {
    try {
      setTestingBudgetAlertId(ruleId);
      await facebookAdsService.testBudgetAlertRule(ruleId);
      await reloadBudgetAlerts();
      toast.success("تم إرسال اختبار التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل اختبار التنبيه"));
    } finally {
      setTestingBudgetAlertId(null);
    }
  };

  const handleToggleBudgetAlert = async (rule: FacebookAdsBudgetAlertRule) => {
    if (!window.confirm(`هل أنت متأكد من ${rule.isEnabled ? "إيقاف" : "تفعيل"} هذا التنبيه؟`)) return;
    try {
      await facebookAdsService.updateBudgetAlertRule(
        rule.id,
        getRulePayload(rule, !rule.isEnabled),
      );
      await reloadBudgetAlerts();
      toast.success(rule.isEnabled ? "تم إيقاف التنبيه" : "تم تفعيل التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث التنبيه"));
    }
  };

  const handleDeleteBudgetAlert = async (ruleId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التنبيه؟")) return;
    try {
      await facebookAdsService.deleteBudgetAlertRule(ruleId);
      await reloadBudgetAlerts();
      toast.success("تم حذف التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل حذف التنبيه"));
    }
  };

  const handleRunBudgetAlertsNow = async () => {
    try {
      setCheckingBudgetAlerts(true);
      await facebookAdsService.runBudgetAlertRulesNow();
      await reloadBudgetAlerts();
      toast.success("تم فحص تنبيهات الرصيد الآن");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل فحص التنبيهات"));
    } finally {
      setCheckingBudgetAlerts(false);
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <main className="mx-auto flex max-w-[1680px] flex-col gap-3 p-3 sm:p-4">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(230px,0.65fr)_minmax(680px,1.8fr)] xl:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                <BellRing className="h-4 w-4" />
                WhatsApp Budget Alerts
              </div>
              <h1 className="mt-1 text-xl font-black leading-tight">
                تنبيهات رصيد الإعلانات
              </h1>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                راقب رصيد الحساب وحد إنفاقه، أو المتبقي من ميزانية حملة محددة،
                وابعت رسالة WhatsApp عند الوصول للحد المختار.
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black text-slate-500">
                الحساب
              </span>
              <select
                value={selectedAdAccountId}
                onChange={(event) => setSelectedAdAccountId(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">اختار حساب إعلاني</option>
                {businessGroups.map(([key, group]) => (
                  <optgroup key={key} label={group.label}>
                    {group.accounts.map((account) => (
                      <option key={account.id} value={account.account_id || account.id}>
                        {account.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </section>

        <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

        <section className="grid gap-2 sm:grid-cols-2">
          <MiniMetric
            label="رصيد الحساب الحالي"
            value={
              selectedAccountBalance === null
                ? "غير متاح من Meta"
                : formatCurrency(selectedAccountBalance, selectedCurrency)
            }
          />
          <MiniMetric
            label="المتبقي من حد الإنفاق"
            value={
              selectedSpendCapRemaining === null
                ? "غير متاح من Meta"
                : formatCurrency(selectedSpendCapRemaining, selectedCurrency)
            }
          />
        </section>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <h2 className="text-base font-black">إنشاء تنبيه جديد</h2>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <SelectFilter
                icon={SlidersHorizontal}
                label="نوع الرصيد"
                value={budgetAlertForm.scope}
                onChange={(value) =>
                  updateBudgetAlertForm({
                    scope: value as FacebookAdsBudgetAlertScope,
                  })
                }
                options={budgetAlertScopeOptions}
              />
              <SelectFilter
                icon={Gauge}
                label="متى أرسل؟"
                value={budgetAlertForm.metric}
                onChange={(value) =>
                  updateBudgetAlertForm({
                    metric: value as FacebookAdsBudgetAlertMetric,
                  })
                }
                options={budgetAlertMetricOptions[budgetAlertForm.scope]}
              />
            </div>

            {budgetAlertForm.scope === "CAMPAIGN" ? (
              <label className="mt-2 block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  الحملة
                </span>
                <select
                  value={budgetAlertForm.campaignId}
                  onChange={(event) =>
                    updateBudgetAlertForm({ campaignId: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">اختار حملة</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} - {formatCurrency(campaign.budgetAmount, selectedCurrency)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  قيمة التنبيه
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetAlertForm.thresholdAmount}
                  disabled={budgetAlertForm.metric === "CAMPAIGN_FINISHED"}
                  onChange={(event) =>
                    updateBudgetAlertForm({ thresholdAmount: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  منع التكرار بالدقائق
                </span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={budgetAlertForm.cooldownMinutes}
                  onChange={(event) =>
                    updateBudgetAlertForm({ cooldownMinutes: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>

            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] font-black text-slate-500">
                أرقام WhatsApp المستقبلة
              </span>
              <textarea
                rows={3}
                value={budgetAlertForm.recipientPhones}
                onChange={(event) =>
                  updateBudgetAlertForm({ recipientPhones: event.target.value })
                }
                placeholder="مثال: 01000000000&#10;01200000000"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateBudgetAlert}
              disabled={savingBudgetAlert || !selectedAdAccountId}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" />
              {savingBudgetAlert ? "جاري الحفظ..." : "إنشاء تنبيه WhatsApp"}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">التنبيهات المفعلة</h2>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  يتم الفحص تلقائياً كل 15 دقيقة، مع منع تكرار الرسائل لنفس الحد.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunBudgetAlertsNow}
                disabled={checkingBudgetAlerts}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${checkingBudgetAlerts ? "animate-spin" : ""}`}
                />
                افحص الآن
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {selectedAccountAlertRules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  لا توجد تنبيهات بعد. أضف حد مثل 100 جنيه وسيتم الإرسال عند الوصول له.
                </div>
              ) : (
                selectedAccountAlertRules.map((rule) => (
                  <article
                    key={rule.id}
                    className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black">
                            {getBudgetAlertTargetName(rule)}
                          </h3>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[11px] font-black",
                              rule.isEnabled
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                            ].join(" ")}
                          >
                            {rule.isEnabled ? "مفعل" : "متوقف"}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                            {getBudgetAlertMetricLabel(rule.metric)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>
                            الحد: {formatCurrency(rule.thresholdAmount, rule.currency)}
                          </span>
                          <span>آخر قراءة: {rule.lastObservedLabel || "لم يتم الفحص"}</span>
                          <span>
                            الأرقام: {rule.recipientPhones.join("، ") || "غير محدد"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleTestBudgetAlert(rule.id)}
                          disabled={testingBudgetAlertId === rule.id}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-blue-200 px-2 text-[11px] font-black text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-200 dark:hover:bg-blue-950/30"
                        >
                          <Send className="h-3.5 w-3.5" />
                          اختبار
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBudgetAlert(rule)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 px-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {rule.isEnabled ? "إيقاف" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudgetAlert(rule.id)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-red-200 px-2 text-[11px] font-black text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {budgetAlertLogs.length ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
                <h3 className="mb-2 text-xs font-black text-slate-500 dark:text-slate-300">
                  آخر رسائل WhatsApp
                </h3>
                <div className="grid gap-1.5">
                  {budgetAlertLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="truncate">
                        {getBudgetAlertMetricLabel(log.metric)} → {log.recipientPhone}
                      </span>
                      <span
                        className={
                          log.status === "SENT"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-red-600 dark:text-red-300"
                        }
                      >
                        {log.status} · {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
};

export default BudgetAlertsPage;
