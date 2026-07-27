import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ShieldExclamationIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockReasonCode,
  CustomerBlockRule,
  CustomerBlockSettings as CustomerBlockSettingsShape,
} from "../../services/customerBlocklistService";
import LoadingSpinner from "../../components/LoadingSpinner";

const CustomerBlockSettings: React.FC = () => {
  const { t } = useTranslation();

  const reasonOptions: Array<{
    value: CustomerBlockReasonCode;
    label: string;
  }> = useMemo(() => [
    { value: "FAKE_ORDERS", label: t('customerBlocks.k_1', 'طلب وهمي') },
    { value: "REPEATED_REFUSAL", label: t('customerBlocks.k_2', 'رفض الاستلام مكرر') },
    { value: "ABUSE", label: t('customerBlocks.k_3', 'إساءة التعامل') },
    { value: "FRAUD", label: t('customerBlocks.k_4', 'احتيال') },
    { value: "WRONG_DATA", label: t('customerBlocks.k_5', 'بيانات خاطئة') },
    { value: "OTHER", label: t('customerBlocks.k_6', 'سبب آخر') },
  ], [t]);

  const actionOptions: Array<{
    value: CustomerBlockAction;
    label: string;
  }> = useMemo(() => [
    { value: "BLOCK_ORDERS", label: t('customerBlocks.k_7', 'حظر إتاحة الطلبات') },
    { value: "REQUIRE_MANAGER_APPROVAL", label: t('customerBlocks.k_8', 'يتطلب موافقة المدير') },
    { value: "BLOCK_COD_ONLY", label: t('customerBlocks.k_9', 'حظر الدفع عند الاستلام فقط') },
  ], [t]);

  const defaultSettings: CustomerBlockSettingsShape = useMemo(() => ({
    enabled: true,
    blockCheckout: true,
    blockManualOrders: true,
    blockAffiliateManualOrders: true,
    blockAiOrderCreation: true,
    matchPhone: true,
    matchEmail: true,
    matchFacebook: true,
    matchWhatsapp: true,
    allowManagerOverride: true,
    defaultAction: "BLOCK_ORDERS",
    checkoutMessage:
      t('customerBlocks.k_10', 'عذراً، لا يمكن إتمام الطلب بناءً على سياسات المتجر.'),
    internalWarningMessage:
      t('customerBlocks.k_11', 'تحذير: هذا العميل موجود في قائمة الحظر.'),
  }), [t]);

  const getActionLabel = (action?: string | null) =>
    actionOptions.find((item) => item.value === action)?.label || t('customerBlocks.k_7', 'حظر الطلبات');

  const getReasonLabel = (reason?: string | null) =>
    reasonOptions.find((item) => item.value === reason)?.label || t('customerBlocks.k_6', 'آخر');

  const formatDate = (value?: string | null) => {
    if (!value) return t('customerBlocks.k_12', 'غير محدد');
    try {
      return new Date(value).toLocaleDateString("ar-EG");
    } catch {
      return value;
    }
  };
  const [settings, setSettings] =
    useState<CustomerBlockSettingsShape>(defaultSettings);
  const [rules, setRules] = useState<CustomerBlockRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [newRule, setNewRule] = useState({
    phone: "",
    email: "",
    reasonCode: "REPEATED_REFUSAL" as CustomerBlockReasonCode,
    reasonNote: "",
    action: "BLOCK_ORDERS" as CustomerBlockAction,
    expiresAt: "",
  });

  const activeRulesCount = useMemo(
    () => rules.filter((rule) => rule.status === "ACTIVE").length,
    [rules],
  );

  const loadData = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [settingsResponse, rulesResponse] = await Promise.all([
        customerBlocklistService.getSettings(),
        customerBlocklistService.listRules({
          status: "ACTIVE",
          limit: 50,
          search,
        }),
      ]);
      setSettings({ ...defaultSettings, ...settingsResponse });
      setRules(rulesResponse.data);
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          t('customerBlocks.k_13'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateBoolean =
    (field: keyof CustomerBlockSettingsShape) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((current) => ({
        ...current,
        [field]: event.target.checked,
      }));
    };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const saved = await customerBlocklistService.updateSettings(settings);
      setSettings({ ...defaultSettings, ...saved });
      setFeedback({ type: "success", message: t('customerBlocks.k_14') });
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          t('customerBlocks.k_15'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (!newRule.phone.trim() && !newRule.email.trim()) {
      setFeedback({
        type: "error",
        message: t('customerBlocks.k_16'),
      });
      return;
    }

    setIsCreating(true);
    try {
      await customerBlocklistService.createRule({
        phone: newRule.phone.trim() || undefined,
        email: newRule.email.trim() || undefined,
        reasonCode: newRule.reasonCode,
        reasonNote: newRule.reasonNote.trim() || undefined,
        action: newRule.action,
        expiresAt: newRule.expiresAt || undefined,
      });
      setNewRule({
        phone: "",
        email: "",
        reasonCode: "REPEATED_REFUSAL",
        reasonNote: "",
        action: settings.defaultAction || "BLOCK_ORDERS",
        expiresAt: "",
      });
      setFeedback({ type: "success", message: t('customerBlocks.k_17') });
      const rulesResponse = await customerBlocklistService.listRules({
        status: "ACTIVE",
        limit: 50,
        search,
      });
      setRules(rulesResponse.data);
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          t('customerBlocks.k_18'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLiftRule = async (rule: CustomerBlockRule) => {
    setFeedback(null);
    try {
      await customerBlocklistService.liftRule(rule.id, t('customerBlocks.k_19'));
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setFeedback({ type: "success", message: t('customerBlocks.k_20') });
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          error.message ||
          t('customerBlocks.k_21'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              <NoSymbolIcon className="h-6 w-6 text-red-500" />
              {t('customerBlocks.k_35')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('customerBlocks.k_36')}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {activeRulesCount} {t('customerBlocks.k_37')}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {t('customerBlocks.k_38')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('customerBlocks.k_39')}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={updateBoolean("enabled")}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                {t('customerBlocks.k_40')}
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["blockCheckout", t('customerBlocks.k_22')],
                ["blockManualOrders", t('customerBlocks.k_23')],
                ["blockAffiliateManualOrders", t('customerBlocks.k_24')],
                ["blockAiOrderCreation", t('customerBlocks.k_25')],
                ["allowManagerOverride", t('customerBlocks.k_26')],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[key as keyof CustomerBlockSettingsShape])}
                    onChange={updateBoolean(key as keyof CustomerBlockSettingsShape)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('customerBlocks.k_41')}
                </span>
                <select
                  value={settings.defaultAction}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      defaultAction: event.target.value as CustomerBlockAction,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('customerBlocks.k_42')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["matchPhone", t('customerBlocks.k_27')],
                    ["matchEmail", t('customerBlocks.k_28')],
                    ["matchFacebook", "Facebook"],
                    ["matchWhatsapp", "WhatsApp"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(settings[key as keyof CustomerBlockSettingsShape])}
                        onChange={updateBoolean(key as keyof CustomerBlockSettingsShape)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('customerBlocks.k_43')}
                </span>
                <textarea
                  value={settings.checkoutMessage || ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      checkoutMessage: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('customerBlocks.k_44')}
                </span>
                <textarea
                  value={settings.internalWarningMessage || ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      internalWarningMessage: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSaving ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                {t('customerBlocks.k_45')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('customerBlocks.k_46')}
              </h3>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('customerBlocks.k_29')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 md:w-64"
                />
                <button
                  type="button"
                  onClick={loadData}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {t('customerBlocks.k_47')}
                </button>
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('customerBlocks.k_48')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                  <thead>
                    <tr className="text-right text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-3">{t('customerBlocks.k_30')}</th>
                      <th className="px-3 py-3">{t('customerBlocks.k_27')}</th>
                      <th className="px-3 py-3">{t('customerBlocks.k_31')}</th>
                      <th className="px-3 py-3">{t('customerBlocks.k_32')}</th>
                      <th className="px-3 py-3">{t('customerBlocks.k_33')}</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {rule.customer
                            ? `${rule.customer.firstName || ""} ${rule.customer.lastName || ""}`.trim()
                            : rule.email || t('customerBlocks.k_34')}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300" dir="ltr">
                          {rule.phone || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            {getActionLabel(rule.action)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                          {getReasonLabel(rule.reasonCode)}
                          {rule.reasonNote ? ` - ${rule.reasonNote}` : ""}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                          {formatDate(rule.expiresAt)}
                        </td>
                        <td className="px-3 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleLiftRule(rule)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            {t('customerBlocks.k_49')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <ShieldExclamationIcon className="h-5 w-5 text-red-500" />
            {t('customerBlocks.k_50')}
          </h3>

          <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_51')}
              </span>
              <input
                type="tel"
                value={newRule.phone}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="01xxxxxxxxx"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_52')}
              </span>
              <input
                type="email"
                value={newRule.email}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="customer@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_31')}
              </span>
              <select
                value={newRule.action}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    action: event.target.value as CustomerBlockAction,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_32')}
              </span>
              <select
                value={newRule.reasonCode}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    reasonCode: event.target.value as CustomerBlockReasonCode,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_53')}
              </span>
              <input
                type="date"
                value={newRule.expiresAt}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('customerBlocks.k_54')}
              </span>
              <textarea
                value={newRule.reasonNote}
                onChange={(event) =>
                  setNewRule((current) => ({
                    ...current,
                    reasonNote: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            <button
              type="submit"
              disabled={isCreating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {isCreating ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <NoSymbolIcon className="h-4 w-4" />
              )}
              {t('customerBlocks.k_55')}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default CustomerBlockSettings;
