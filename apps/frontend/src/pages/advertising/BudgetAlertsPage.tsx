import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BellRing,
  Clock,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
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

const getMetricLabels = (isEn: boolean): Record<FacebookAdsBudgetAlertMetric, string> => ({
  ACCOUNT_BALANCE: isEn ? "Ad Account Balance" : "رصيد الحساب الإعلاني",
  SPEND_CAP_REMAINING: isEn ? "Spend Cap Remaining" : "المتبقي من حد إنفاق الحساب",
  CAMPAIGN_BUDGET_REMAINING: isEn ? "Campaign Budget Remaining" : "المتبقي من ميزانية الحملة",
  CAMPAIGN_FINISHED: isEn ? "When campaign ends or budget depletes" : "عند انتهاء الحملة أو نفاد ميزانيتها",
});

const getScopeOptions = (isEn: boolean): Array<{ value: FacebookAdsBudgetAlertScope; label: string }> => [
  { value: "AD_ACCOUNT", label: isEn ? "Ad Account (Account Level)" : "الحساب الإعلاني (Account Level)" },
  { value: "CAMPAIGN", label: isEn ? "Specific Campaign (Campaign Level)" : "حملة محددة (Campaign Level)" },
];

const getMetricOptionsByScope = (
  isEn: boolean,
): Record<
  FacebookAdsBudgetAlertScope,
  Array<{ value: FacebookAdsBudgetAlertMetric; label: string }>
> => ({
  AD_ACCOUNT: [
    { value: "ACCOUNT_BALANCE", label: isEn ? "Account balance less than..." : "رصيد الحساب أقل من..." },
    { value: "SPEND_CAP_REMAINING", label: isEn ? "Remaining spend cap less than..." : "المتبقي من حد الإنفاق أقل من..." },
  ],
  CAMPAIGN: [
    { value: "CAMPAIGN_BUDGET_REMAINING", label: isEn ? "Campaign budget remaining less than..." : "المتبقي من ميزانية الحملة أقل من..." },
    { value: "CAMPAIGN_FINISHED", label: isEn ? "When campaign finishes or budget depletes" : "عند اكتمال الحملة أو نفاد الميزانية" },
  ],
});

const getCooldownOptions = (isEn: boolean) => [
  { value: "15", label: isEn ? "15 minutes (Fast recurring alert)" : "15 دقيقة (تنبيه متكرر سريع)" },
  { value: "60", label: isEn ? "1 hour" : "ساعة واحدة" },
  { value: "360", label: isEn ? "6 hours" : "6 ساعات" },
  { value: "720", label: isEn ? "12 hours (Half day - recommended)" : "12 ساعة (نصف يوم - موصى به)" },
  { value: "1440", label: isEn ? "24 hours (Once daily)" : "24 ساعة (مرة يومياً)" },
];

const thresholdPresets = ["50", "100", "250", "500", "1000"];

const splitAlertPhones = (value: string) =>
  value
    .split(/[\n,;،؛]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const BudgetAlertsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const metricLabels = useMemo(() => getMetricLabels(isEn), [isEn]);
  const scopeOptions = useMemo(() => getScopeOptions(isEn), [isEn]);
  const metricOptionsByScope = useMemo(() => getMetricOptionsByScope(isEn), [isEn]);
  const cooldownOptions = useMemo(() => getCooldownOptions(isEn), [isEn]);

  const accountContext = useFacebookAdsAccountContext();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [budgetAlertRules, setBudgetAlertRules] = useState<FacebookAdsBudgetAlertRule[]>([]);
  const [budgetAlertLogs, setBudgetAlertLogs] = useState<FacebookAdsBudgetAlertLog[]>([]);
  const [form, setForm] = useState<BudgetAlertFormState>(defaultBudgetAlertForm);
  const [savingAlert, setSavingAlert] = useState(false);
  const [testingAlertId, setTestingAlertId] = useState<string | null>(null);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
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

  const activeRulesCount = useMemo(
    () => selectedAccountAlertRules.filter((r) => r.isEnabled).length,
    [selectedAccountAlertRules],
  );

  const businessGroups = useMemo(() => {
    const groups = new Map<string, { label: string; accounts: typeof adAccounts }>();
    adAccounts.forEach((account) => {
      const key = account.business?.id || "unassigned";
      const label = account.business?.name || (isEn ? "General Accounts" : "حسابات عامة");
      if (!groups.has(key)) groups.set(key, { label, accounts: [] });
      groups.get(key)!.accounts.push(account);
    });
    return Array.from(groups.entries());
  }, [adAccounts, isEn]);

  const loadData = useCallback(async () => {
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
        facebookAdsService.getBudgetAlertLogs(30).catch(() => []),
      ]);
      setCampaigns(campaignData);
      setBudgetAlertRules(rules);
      setBudgetAlertLogs(logs);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to load budget alerts data" : "فشل تحميل بيانات التنبيهات"));
    } finally {
      setLoading(false);
    }
  }, [selectedAdAccountId, isEn]);

  useEffect(() => {
    if (!contextLoading) {
      loadData();
    }
  }, [contextLoading, loadData]);

  const reloadRulesAndLogs = async () => {
    const [rules, logs] = await Promise.all([
      facebookAdsService.getBudgetAlertRules().catch(() => []),
      facebookAdsService.getBudgetAlertLogs(30).catch(() => []),
    ]);
    setBudgetAlertRules(rules);
    setBudgetAlertLogs(logs);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdAccountId) {
      toast.error(isEn ? "Please select an ad account first" : "يرجى اختيار حساب إعلاني أولاً");
      return;
    }

    const phones = splitAlertPhones(form.recipientPhones);
    if (phones.length === 0) {
      toast.error(isEn ? "Please enter at least one phone number to receive WhatsApp messages" : "يرجى إدخال رقم هاتف واحد على الأقل لاستقبال رسائل الواتساب");
      return;
    }

    if (form.scope === "CAMPAIGN" && !form.campaignId) {
      toast.error(isEn ? "Please select the target campaign for this alert" : "يرجى اختيار الحملة المستهدفة للتنبيه");
      return;
    }

    const threshold =
      form.metric === "CAMPAIGN_FINISHED" ? 0 : Number(form.thresholdAmount);

    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error(isEn ? "Please enter a valid threshold amount" : "يرجى إدخال قيمة حد صحيحة");
      return;
    }

    try {
      setSavingAlert(true);
      await facebookAdsService.createBudgetAlertRule({
        adAccountId: selectedAdAccountId,
        campaignId: form.scope === "CAMPAIGN" ? form.campaignId : null,
        scope: form.scope,
        metric: form.metric,
        thresholdAmount: threshold,
        currency: selectedCurrency,
        recipientPhones: phones,
        cooldownMinutes: Number(form.cooldownMinutes) || 720,
        isEnabled: true,
      });

      toast.success(isEn ? "WhatsApp alert created and activated successfully" : "تم إنشاء وتفعيل تنبيه WhatsApp بنجاح");
      setForm((prev) => ({
        ...defaultBudgetAlertForm,
        recipientPhones: prev.recipientPhones,
      }));
      await reloadRulesAndLogs();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to save alert" : "فشل حفظ التنبيه"));
    } finally {
      setSavingAlert(false);
    }
  };

  const handleTestRule = async (ruleId: string) => {
    try {
      setTestingAlertId(ruleId);
      await facebookAdsService.testBudgetAlertRule(ruleId);
      toast.success(isEn ? "Test message sent to selected WhatsApp numbers successfully" : "تم إرسال رسالة تجريبية إلى أرقام WhatsApp المحددة بنجاح");
      await reloadRulesAndLogs();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to send test message" : "فشل إرسال رسالة الاختبار"));
    } finally {
      setTestingAlertId(null);
    }
  };

  const handleToggleRule = async (rule: FacebookAdsBudgetAlertRule) => {
    try {
      await facebookAdsService.updateBudgetAlertRule(rule.id, {
        adAccountId: rule.adAccountId || null,
        campaignId: rule.campaignId || null,
        scope: rule.scope,
        metric: rule.metric,
        thresholdAmount: rule.thresholdAmount,
        currency: rule.currency,
        recipientPhones: rule.recipientPhones,
        isEnabled: !rule.isEnabled,
        cooldownMinutes: rule.cooldownMinutes,
        settings: rule.settings,
      });
      toast.success(rule.isEnabled ? (isEn ? "Alert disabled" : "تم إيقاف التنبيه") : (isEn ? "Alert enabled successfully" : "تم تفعيل التنبيه بنجاح"));
      await reloadRulesAndLogs();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to update alert status" : "فشل تحديث حالة التنبيه"));
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm(isEn ? "Are you sure you want to permanently delete this alert rule?" : "هل أنت متأكد من حذف قاعدة التنبيه هذه نهائياً؟")) return;
    try {
      await facebookAdsService.deleteBudgetAlertRule(ruleId);
      toast.success(isEn ? "Alert deleted successfully" : "تم حذف التنبيه بنجاح");
      await reloadRulesAndLogs();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to delete alert" : "فشل حذف التنبيه"));
    }
  };

  const handleManualCheck = async () => {
    try {
      setCheckingAlerts(true);
      await facebookAdsService.runBudgetAlertRulesNow();
      toast.success(isEn ? "All alerts checked and matched with Meta successfully" : "تم فحص ومطابقة جميع التنبيهات مع Meta بنجاح");
      await reloadRulesAndLogs();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to check alerts" : "فشل فحص التنبيهات"));
    } finally {
      setCheckingAlerts(false);
    }
  };

  if (loading && !selectedAdAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-bold text-slate-500">
            {isEn ? "Loading WhatsApp budget alerts..." : "جاري تحميل تنبيهات WhatsApp..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100" dir={isEn ? "ltr" : "rtl"}>
      <main className="mx-auto flex max-w-[1600px] flex-col gap-3 p-2.5 sm:p-5">
        <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

        {/* Executive Header Banner */}
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/10 via-white to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    WhatsApp Cloud Gateway
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Clock className="h-3 w-3" /> {isEn ? "Automated check every 15 min" : "فحص دوري آلي كل 15 دقيقة"}
                  </span>
                </div>
                <h1 className="mt-1.5 text-lg font-black tracking-tight sm:text-xl">
                  {isEn ? "Ad Budget & Balance Alerts via WhatsApp" : "تنبيهات ميزانية ورصيد الإعلانات عبر WhatsApp"}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Instant phone notifications to prevent sudden ad delivery stops when balance is low or campaigns reach spend limits."
                    : "إشعارات فورية على هاتفك لتفادي توقف الإعلانات المفاجئ عند انخفاض الرصيد أو وصول الحملات لحدود الإنفاق."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <div className="min-w-[220px]">
                <select
                  value={selectedAdAccountId}
                  onChange={(e) => setSelectedAdAccountId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="">{isEn ? "-- Select Ad Account --" : "-- اختار الحساب الإعلاني --"}</option>
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
              </div>

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checkingAlerts}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingAlerts ? "animate-spin" : ""}`} />
                <span>{checkingAlerts ? (isEn ? "Checking..." : "جاري الفحص...") : (isEn ? "Check Meta Now" : "فحص Meta الآن")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4 Sleek KPI Cards */}
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>{isEn ? "Available Account Balance" : "رصيد الحساب المتاح"}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-base font-black text-emerald-600 dark:text-emerald-400 sm:text-xl">
              {selectedAccountBalance === null
                ? (isEn ? "Unspecified" : "غير محدد")
                : formatCurrency(selectedAccountBalance, selectedCurrency)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {isEn ? "Real active balance on Meta" : "الرصيد الفعلي الجاري لدى Meta"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>{isEn ? "Remaining Spend Cap" : "المتبقي من حد الإنفاق"}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-base font-black text-slate-800 dark:text-slate-200 sm:text-xl">
              {selectedSpendCapRemaining === null
                ? (isEn ? "Unspecified" : "غير محدد")
                : formatCurrency(selectedSpendCapRemaining, selectedCurrency)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {isEn ? "Account Spend Cap Remaining" : "المتبقي من سقف إنفاق الحساب"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>{isEn ? "Active Alert Rules" : "قواعد التنبيه النشطة"}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <BellRing className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-base font-black text-slate-800 dark:text-slate-200 sm:text-xl">
              {activeRulesCount} <span className="text-xs font-normal text-slate-400">{isEn ? `of ${selectedAccountAlertRules.length}` : `من ${selectedAccountAlertRules.length}`}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {isEn ? "Currently active monitoring rules" : "قواعد مراقبة فعالة حالياً"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>{isEn ? "Total Messages Sent" : "إجمالي الرسائل المرسلة"}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-base font-black text-slate-800 dark:text-slate-200 sm:text-xl">
              {budgetAlertLogs.length} <span className="text-xs font-normal text-slate-400">{isEn ? "alerts" : "تنبيه"}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {isEn ? "Gateway dispatch logs" : "سجل الإرسال عبر البوابة"}
            </p>
          </div>
        </section>

        {/* Main Grid: Form + Rules & Logs */}
        <div className="grid gap-3.5 lg:grid-cols-12">
          {/* Create Alert Rule Form (Right on RTL, 5 cols) */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateRule}
              className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900 sm:p-4"
            >
              <div className="border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 sm:text-base">
                  {isEn ? "Create New WhatsApp Alert" : "إنشاء تنبيه WhatsApp جديد"}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Set trigger condition and phone number to receive instant notification upon matching"
                    : "حدد شرط الإرسال ورقم الهاتف ليصلك إشعار فوري عند مطابقة الشرط"}
                </p>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? "Monitoring Scope" : "نطاق المراقبة (Scope)"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {scopeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          scope: opt.value,
                          metric: metricOptionsByScope[opt.value][0].value,
                          campaignId: opt.value === "CAMPAIGN" ? prev.campaignId : "",
                        }))
                      }
                      className={`rounded-xl border px-2.5 py-2 text-center text-xs font-black transition ${
                        form.scope === opt.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign selector if scope is campaign */}
              {form.scope === "CAMPAIGN" && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? "Target Ad Campaign" : "الحملة الإعلانية المستهدفة"}
                  </label>
                  <select
                    value={form.campaignId}
                    onChange={(e) => setForm((prev) => ({ ...prev, campaignId: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">{isEn ? "-- Select Campaign --" : "-- اختار الحملة --"}</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatCurrency(c.budgetAmount, selectedCurrency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Metric Trigger */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? "Trigger Condition" : "شرط إطلاق التنبيه (Trigger Condition)"}
                </label>
                <select
                  value={form.metric}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      metric: e.target.value as FacebookAdsBudgetAlertMetric,
                      thresholdAmount: e.target.value === "CAMPAIGN_FINISHED" ? "0" : prev.thresholdAmount,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  {metricOptionsByScope[form.scope].map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold Amount & Presets */}
              {form.metric !== "CAMPAIGN_FINISHED" && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {isEn ? "Minimum Alert Threshold" : "قيمة الحد الأدنى للتنبيه"}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">{selectedCurrency}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.thresholdAmount}
                    onChange={(e) => setForm((prev) => ({ ...prev, thresholdAmount: e.target.value }))}
                    placeholder={isEn ? "e.g. 100" : "مثال: 100"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">
                      {isEn ? "Quick Presets:" : "مقترحات سريعة:"}
                    </span>
                    {thresholdPresets.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, thresholdAmount: val }))}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {val} {selectedCurrency}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cooldown minutes */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? "Anti-Spam Cooldown" : "منع التكرار (Anti-Spam Cooldown)"}
                </label>
                <select
                  value={form.cooldownMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, cooldownMinutes: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  {cooldownOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  {isEn
                    ? "Interval before sending a new alert for the same threshold to avoid spam"
                    : "المدة الفاصلة قبل إرسال تنبيه جديد لنفس الحد لتفادي الإزعاج"}
                </p>
              </div>

              {/* Recipient Phones */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? "Recipient WhatsApp Numbers" : "أرقام WhatsApp المستلمة"}
                </label>
                <textarea
                  rows={2}
                  value={form.recipientPhones}
                  onChange={(e) => setForm((prev) => ({ ...prev, recipientPhones: e.target.value }))}
                  placeholder={isEn ? "01000000000, 01100000000 or +201200000000" : "01000000000، 01100000000 أو +201200000000"}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {isEn
                    ? "You can enter multiple numbers separated by comma or new line"
                    : "يمكن إدخال أكثر من رقم مفصولة بفاصلة أو سطر جديد"}
                </p>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={savingAlert || !selectedAdAccountId}
                className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                <span>
                  {savingAlert
                    ? (isEn ? "Saving and connecting..." : "جاري الحفظ والربط...")
                    : (isEn ? "Save & Activate WhatsApp Alert" : "حفظ وتفعيل تنبيه WhatsApp")}
                </span>
              </button>
            </form>
          </div>

          {/* Active Rules & Log (Left on RTL, 7 cols) */}
          <div className="flex flex-col gap-3.5 lg:col-span-7">
            {/* Active Rules Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 sm:text-base">
                    {isEn ? `Current Alert Rules (${selectedAccountAlertRules.length})` : `قواعد التنبيه الحالية (${selectedAccountAlertRules.length})`}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEn
                      ? "Rules periodically monitoring account balance and campaign budgets"
                      : "القواعد التي تراقب رصيد الحساب وميزانيات الحملات دورياً"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                {selectedAccountAlertRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
                    <BellRing className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {isEn ? "No active alert rules for this account yet" : "لا توجد قواعد تنبيه مفعلة لهذا الحساب بعد"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isEn ? "Use the form to create your first WhatsApp alert" : "استخدم النموذج المقابل لإنشاء أول تنبيه WhatsApp"}
                    </p>
                  </div>
                ) : (
                  selectedAccountAlertRules.map((rule) => {
                    const isCampaign = rule.scope === "CAMPAIGN";
                    const title = isCampaign
                      ? rule.campaign?.name || (isEn ? "Specific Campaign" : "حملة محددة")
                      : rule.adAccount?.name || (isEn ? "Ad Account" : "الحساب الإعلاني");

                    return (
                      <div
                        key={rule.id}
                        className={`rounded-xl border p-3 transition ${
                          rule.isEnabled
                            ? "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40"
                            : "border-dashed border-slate-200 bg-slate-50/20 opacity-70 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  rule.isEnabled
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {rule.isEnabled ? (isEn ? "Active & Enabled" : "نشط ومفعل") : (isEn ? "Disabled" : "معطل")}
                              </span>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                {isCampaign ? (isEn ? "Campaign" : "حملة") : (isEn ? "Ad Account" : "حساب إعلاني")}
                              </span>
                              <h3 className="truncate text-xs font-black text-slate-900 dark:text-slate-100 sm:text-sm">
                                {title}
                              </h3>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {isEn ? "Condition: " : "الشرط: "}<strong className="text-slate-700 dark:text-slate-300">{metricLabels[rule.metric] || rule.metric}</strong>
                              </span>
                              <span>
                                {isEn ? "Threshold: " : "الحد: "}<strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(rule.thresholdAmount, rule.currency)}</strong>
                              </span>
                              <span>
                                {isEn ? "Cooldown: " : "منع التكرار: "}<strong className="text-slate-700 dark:text-slate-300">{rule.cooldownMinutes} {isEn ? "min" : "دقيقة"}</strong>
                              </span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <PhoneCall className="h-3 w-3 text-slate-400" />
                              {rule.recipientPhones.map((ph, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {ph}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleTestRule(rule.id)}
                              disabled={testingAlertId === rule.id}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              title={isEn ? "Send instant test message on WhatsApp" : "إرسال رسالة اختبارية فورية على واتساب"}
                            >
                              <Send className="h-3 w-3" />
                              <span>{testingAlertId === rule.id ? (isEn ? "Sending..." : "جاري الإرسال...") : (isEn ? "Live Test" : "اختبار حي")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleRule(rule)}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {rule.isEnabled ? (isEn ? "Disable" : "إيقاف") : (isEn ? "Enable" : "تفعيل")}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                              title={isEn ? "Delete Rule" : "حذف القاعدة"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Audit & Logs Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 sm:text-base">
                  {isEn ? "Sent WhatsApp Messages Log" : "سجل رسائل WhatsApp المرسلة"}
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  {isEn ? `Latest ${budgetAlertLogs.length} notifications` : `آخر ${budgetAlertLogs.length} إشعار`}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {budgetAlertLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs font-bold text-slate-400">
                    {isEn ? "No sent messages recorded yet" : "لم يتم تسجيل أي رسائل مرسلة حتى الآن"}
                  </div>
                ) : (
                  budgetAlertLogs.slice(0, 8).map((log) => {
                    const isSuccess = log.status === "SENT";
                    return (
                      <div
                        key={log.id}
                        className="flex flex-col gap-1 rounded-xl bg-slate-50 p-2 text-xs font-bold dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                            }`}
                          >
                            {isSuccess ? (isEn ? "Sent" : "تم الإرسال") : log.status}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {log.recipientPhone}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {metricLabels[log.metric] || log.metric}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {log.currentValue != null && (
                            <span>{isEn ? "Value: " : "القيمة: "}{formatCurrency(log.currentValue, log.currency)}</span>
                          )}
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BudgetAlertsPage;
