import React from "react";
import { useTranslation } from "react-i18next";
import {
  Facebook,
  Loader2,
  Building2,
  AlertCircle,
  Sparkles,
  Calendar,
  DollarSign,
  Target,
  Globe,
  Zap,
} from "lucide-react";
import type { FormData, AttributionWindowOption } from "../types";
import type {
  FacebookAdAccount,
  FacebookPixel,
  FacebookSavedAdAccount,
} from "../../../../services/facebookAdsService";
import {
  getBidStrategies,
  getConversionEvents,
  getConversionLocations,
  getAttributionWindows,
  getPerformanceGoals,
} from "../constants";
import {
  getFullAdMinimumBudgetAmount,
  isCappedBidStrategy,
} from "../../CreateAdWizard.helpers";
import { AdDaypartingScheduler } from "./AdDaypartingScheduler";
import { AdSetSpendLimitsEditor } from "./AdSetSpendLimitsEditor";

interface Step2BudgetScheduleProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleChange: (field: keyof FormData, value: any) => void;
  getError: (field: string) => string;
  selectedAdAccountIsActive: boolean;
  loadingAdAccounts: boolean;
  adAccounts: FacebookAdAccount[];
  selectedAdAccountId: string;
  setSelectedAdAccountId: (id: string) => void;
  setPublishAccountConfirmed: (val: boolean) => void;
  setFacebookPixels: React.Dispatch<React.SetStateAction<FacebookPixel[]>>;
  loadPagesAndPixels: (adAccountId?: string) => Promise<void>;
  adAccountsByBusiness?: [string, FacebookAdAccount[]][];
  selectedAdAccount?: FacebookAdAccount | undefined;
  savedAdAccounts: FacebookSavedAdAccount[];
  syncingAdAccount: boolean;
  handleActivateSelectedAdAccount: () => Promise<void>;
  loadingPixels: boolean;
  facebookPixels: FacebookPixel[];
  selectedAdAccountCurrency: string;
  minimumDailyBudgetAmount?: number;
  minimumLifetimeBudgetAmount?: number;
  compatibleAttributionWindows: AttributionWindowOption[];
}

export const Step2BudgetSchedule: React.FC<Step2BudgetScheduleProps> = ({
  formData,
  setFormData,
  handleChange,
  getError,
  selectedAdAccountIsActive,
  loadingAdAccounts,
  adAccounts,
  selectedAdAccountId,
  setSelectedAdAccountId,
  setPublishAccountConfirmed,
  setFacebookPixels,
  loadPagesAndPixels,
  savedAdAccounts,
  syncingAdAccount,
  handleActivateSelectedAdAccount,
  loadingPixels,
  facebookPixels,
  selectedAdAccountCurrency,
  compatibleAttributionWindows,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const bidStrategies = React.useMemo(() => getBidStrategies(isEn), [isEn]);
  const conversionEvents = React.useMemo(() => getConversionEvents(isEn), [isEn]);
  const conversionLocations = React.useMemo(
    () => getConversionLocations(isEn),
    [isEn],
  );
  const performanceGoals = React.useMemo(() => getPerformanceGoals(isEn), [isEn]);

  const resolveAdAccountId = (
    account:
      | Pick<FacebookAdAccount, "id" | "account_id">
      | Pick<FacebookSavedAdAccount, "accountId">,
  ) =>
    "accountId" in account
      ? account.accountId
      : account.account_id || account.id.replace(/^act_/, "");

  const activeSavedAdAccount = savedAdAccounts.find((a) => a.isActive);
  const activeSavedAdAccountId = activeSavedAdAccount?.accountId || "";

  const selectedSavedAdAccount =
    savedAdAccounts.find(
      (account) => account.accountId === selectedAdAccountId,
    ) || null;

  const selectedRemoteAdAccount =
    adAccounts.find(
      (account) => resolveAdAccountId(account) === selectedAdAccountId,
    ) || null;

  const getAdAccountBusinessKey = (account: FacebookAdAccount) =>
    account.business?.id ||
    account.billingHealth?.business?.id ||
    "unassigned-business";

  const getAdAccountBusinessName = (account: FacebookAdAccount) =>
    account.business?.name ||
    account.billingHealth?.business?.name ||
    (isEn ? "Accounts without a clear Business" : "حسابات بدون Business واضح");

  const adAccountBusinessGroups = adAccounts.reduce<
    Array<{
      businessKey: string;
      businessName: string;
      accounts: FacebookAdAccount[];
    }>
  >((groups, account) => {
    const businessKey = getAdAccountBusinessKey(account);
    const existingGroup = groups.find(
      (group) => group.businessKey === businessKey,
    );

    if (existingGroup) {
      existingGroup.accounts.push(account);
      return groups;
    }

    groups.push({
      businessKey,
      businessName: getAdAccountBusinessName(account),
      accounts: [account],
    });
    return groups;
  }, []);

  const selectedBusinessName = selectedRemoteAdAccount
    ? getAdAccountBusinessName(selectedRemoteAdAccount)
    : (isEn ? "Unspecified" : "غير محدد");

  const selectedAdAccountName =
    selectedSavedAdAccount?.name ||
    selectedRemoteAdAccount?.name ||
    selectedAdAccountId ||
    (isEn ? "Unspecified" : "غير محدد");

  const selectedAccountHealthLabel =
    selectedRemoteAdAccount?.billingHealth?.accountStatusLabel ||
    (selectedAdAccountIsActive
      ? (isEn ? "Active in MaxP" : "مفعل داخل MaxP")
      : (isEn ? "Needs Activation" : "يحتاج تفعيل"));

  const minimumWizardBudget = getFullAdMinimumBudgetAmount(
    selectedAdAccountCurrency,
  );

  const formatSelectedAdAccountCurrency = (value?: number) =>
    new Intl.NumberFormat(isEn ? "en-US" : "ar-EG", {
      style: "currency",
      currency: selectedAdAccountCurrency || "EGP",
      maximumFractionDigits: 2,
    }).format(value || 0);
  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {isEn ? "Facebook Ads Account" : "حساب Facebook Ads"} <span className="text-red-500">*</span>
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEn
                ? "Choose the ad account to create the ad and load pixels."
                : "اختر الحساب الإعلاني الذي سنستخدمه لإنشاء الإعلان وتحميل البكسلات."}
            </p>
          </div>
          {selectedAdAccountIsActive && (
            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-950/60 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
              {isEn ? "Account Active" : "الحساب مفعل"}
            </span>
          )}
        </div>

        {loadingAdAccounts ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {isEn ? "Loading ad accounts..." : "جاري تحميل الحسابات الإعلانية..."}
            </span>
          </div>
        ) : adAccounts.length > 0 ? (
          <div className="space-y-3">
            <select
              name="facebookAdAccountId"
              aria-label={isEn ? "Select ad account by Business" : "اختيار الحساب الإعلاني حسب Business"}
              value={selectedAdAccountId}
              onChange={(e) => {
                const nextAdAccountId = e.target.value;
                setSelectedAdAccountId(nextAdAccountId);
                setPublishAccountConfirmed(false);
                if (!nextAdAccountId) {
                  setFacebookPixels([]);
                  setFormData((prev) => ({ ...prev, pixelId: "" }));
                  void loadPagesAndPixels();
                  return;
                }
                if (activeSavedAdAccountId === nextAdAccountId) {
                  void loadPagesAndPixels(nextAdAccountId);
                  return;
                }

                setFacebookPixels([]);
                setFormData((prev) => ({ ...prev, pixelId: "" }));
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="">{isEn ? "Select Ad Account" : "اختر الحساب الإعلاني"}</option>
              {adAccountBusinessGroups.map((group) => (
                <optgroup
                  key={group.businessKey}
                  label={`${group.businessName} (${group.accounts.length})`}
                >
                  {group.accounts.map((account) => {
                    const normalizedAccountId = resolveAdAccountId(account);
                    const isSaved = savedAdAccounts.some(
                      (savedAccount) =>
                        savedAccount.accountId === normalizedAccountId,
                    );
                    const isActive = activeSavedAdAccountId === normalizedAccountId;
                    const healthLabel =
                      account.billingHealth?.accountStatusLabel ||
                      (account.account_status
                        ? `Status ${account.account_status}`
                        : (isEn ? "Status Unknown" : "Status غير معروف"));

                    return (
                      <option key={account.id} value={normalizedAccountId}>
                        {account.name} - act_{normalizedAccountId} -{" "}
                        {account.currency} - {healthLabel}
                        {isActive ? (isEn ? " - Active" : " - مفعل") : isSaved ? (isEn ? " - Saved" : " - محفوظ") : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            {selectedAdAccountId ? (
              <div className="grid gap-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 p-4 text-sm text-blue-950 dark:text-blue-200 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Business
                  </div>
                  <div className="mt-1 font-semibold">{selectedBusinessName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Ad Account
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountName}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300" translate="no">
                    act_{selectedAdAccountId}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Readiness
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountIsActive
                      ? (isEn ? "Active & Ready" : "مفعل وجاهز")
                      : (isEn ? "Needs activation before publishing" : "يحتاج تفعيل قبل الإرسال")}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {selectedAccountHealthLabel}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-700 dark:text-slate-300">
                {isEn
                  ? "Select a Business then your target ad account. We do not auto-select the first account to avoid creating campaigns in the wrong account."
                  : "اختر Business ثم الحساب الإعلاني المقصود. لن نختار أول حساب تلقائيا عند وجود أكثر من حساب، حتى لا تختلط حملات المتجر مع أي حساب آخر."}
              </div>
            )}

            {selectedRemoteAdAccount?.billingHealth?.isAccountUsable === false && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                {isEn ? "This account appears on Meta but is not ready for ads: " : "هذا الحساب ظاهر من Meta لكنه غير جاهز للإعلانات حاليا: "}
                {selectedRemoteAdAccount.billingHealth.disableReason ||
                  (isEn ? "Review account status or payment method in Business Manager." : "راجع حالة الحساب أو وسيلة الدفع داخل Business Manager.")}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleActivateSelectedAdAccount()}
                disabled={
                  syncingAdAccount ||
                  loadingAdAccounts ||
                  !selectedAdAccountId ||
                  selectedAdAccountIsActive
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncingAdAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEn ? "Activating..." : "جاري التفعيل..."}
                  </>
                ) : (
                  isEn ? "Activate Account & Load Data" : "تفعيل الحساب وتحميل البيانات"
                )}
              </button>

              {!selectedAdAccountIsActive && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {isEn ? "Activate selected account first to load its pixels." : "فعّل الحساب المختار أولًا حتى تظهر البكسلات الخاصة به."}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/40 p-3 text-sm text-yellow-800 dark:text-yellow-300">
            {isEn
              ? "No ad accounts available currently. Connect Facebook first then try again."
              : "لا توجد حسابات إعلانية متاحة حاليًا. اربط Facebook أولًا ثم أعد المحاولة."}
          </div>
        )}
        {getError("adAccountId") && (
          <p className="mt-3 text-sm text-red-500">{getError("adAccountId")}</p>
        )}
      </div>

      {/* Performance Goal - للمبيعات فقط */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            {isEn ? "Performance Goal" : "هدف الأداء (Performance Goal)"}
          </h4>
          <div className="space-y-3">
            {performanceGoals.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.performanceGoal === goal.value
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="performanceGoal"
                  value={goal.value}
                  checked={formData.performanceGoal === goal.value}
                  onChange={(e) =>
                    handleChange("performanceGoal", e.target.value)
                  }
                  className="mt-1 text-green-600"
                />
                <div className={isEn ? "ml-3" : "mr-3"}>
                  <div className="font-medium text-gray-900 dark:text-white">{goal.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {goal.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Facebook Pixel Selection */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {isEn ? "Facebook Pixel" : "Facebook Pixel"} <span className="text-red-500">*</span>
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {isEn
              ? "Select pixel to track conversions on your website"
              : "اختر البكسل لتتبع التحويلات على موقعك"}
          </p>
          {loadingPixels ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{isEn ? "Loading pixels..." : "جاري تحميل البكسلات..."}</span>
            </div>
          ) : facebookPixels.length > 0 ? (
            <select
              value={formData.pixelId}
              onChange={(e) => handleChange("pixelId", e.target.value)}
              className="w-full px-4 py-3 border border-indigo-300 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{isEn ? "Select Pixel" : "اختر البكسل"}</option>
              {facebookPixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name} (ID: {pixel.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {!selectedAdAccountId || !selectedAdAccountIsActive
                  ? isEn
                    ? "⚠️ Select and activate the ad account first to load associated pixels."
                    : "⚠️ اختر وفعّل الحساب الإعلاني أولًا حتى نحمل البكسلات المرتبطة به."
                  : isEn
                    ? "⚠️ No pixels available for this account. Please create a pixel in Facebook Business Manager settings."
                    : "⚠️ لا توجد بكسلات متاحة لهذا الحساب. يرجى إنشاء بكسل من إعدادات Facebook Business Manager."}
              </p>
            </div>
          )}
          {getError("pixelId") && (
            <p className="mt-3 text-sm text-red-500">{getError("pixelId")}</p>
          )}
        </div>
      )}

      {/* Conversion Event & Location */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conversion Event */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {isEn ? "Conversion Event" : "حدث التحويل"}
            </h4>
            <select
              value={formData.conversionEvent}
              onChange={(e) => handleChange("conversionEvent", e.target.value)}
              className="w-full px-4 py-3 border border-blue-300 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {conversionEvents.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.icon} {event.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {
                conversionEvents.find(
                  (e) => e.value === formData.conversionEvent,
                )?.description
              }
            </p>
          </div>

          {/* Conversion Location */}
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {isEn ? "Conversion Location" : "موقع التحويل"}
            </h4>
            <select
              value={formData.conversionLocation}
              onChange={(e) =>
                handleChange("conversionLocation", e.target.value)
              }
              className="w-full px-4 py-3 border border-purple-300 dark:border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {conversionLocations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.icon} {location.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Attribution Window */}
      {compatibleAttributionWindows.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            {isEn ? "Attribution Window" : "نافذة الإحالة (Attribution Window)"}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {isEn
              ? "The time frame during which a conversion is attributed to your ad"
              : "المدة الزمنية التي يُنسب فيها التحويل إلى إعلانك"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibleAttributionWindows.map((window) => (
              <label
                key={window.value}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.attributionWindow === window.value
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="attributionWindow"
                  value={window.value}
                  checked={formData.attributionWindow === window.value}
                  onChange={(e) =>
                    handleChange("attributionWindow", e.target.value)
                  }
                  className="mt-1 text-orange-600"
                />
                <div className={isEn ? "ml-3" : "mr-3"}>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {window.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {window.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Creative */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 p-4 rounded-xl border border-pink-200 dark:border-pink-900/40">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500 dark:text-pink-400" />
              {isEn ? "Dynamic Creative" : "المحتوى الديناميكي (Dynamic Creative)"}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEn
                ? "Automatically test different combinations of images, texts, and headlines"
                : "اختبار تلقائي لتركيبات مختلفة من الصور والنصوص والعناوين"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.dynamicCreative}
              onChange={(e) =>
                handleChange("dynamicCreative", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 dark:peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Optimization (CBO) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              {isEn ? "Advantage Campaign Budget (CBO)" : "تحسين ميزانية الحملة (CBO)"}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEn
                ? "Let Facebook automatically distribute budget to top-performing ad sets"
                : "دع Facebook يوزع الميزانية تلقائياً على المجموعات الإعلانية الأفضل أداءً"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.budgetOptimization}
              onChange={(e) =>
                handleChange("budgetOptimization", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Type & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isEn ? "Budget Type" : "نوع الميزانية"}
          </label>
          <select
            value={formData.budgetType}
            onChange={(e) => handleChange("budgetType", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="DAILY">{isEn ? "Daily" : "يومية"}</option>
            <option value="LIFETIME">{isEn ? "Lifetime" : "إجمالية"}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isEn ? `Amount (${selectedAdAccountCurrency})` : `المبلغ (${selectedAdAccountCurrency})`}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={minimumWizardBudget}
            value={formData.budgetAmount}
            onChange={(e) =>
              handleChange("budgetAmount", parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              getError("budgetAmount") ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {getError("budgetAmount") && (
            <p className="mt-1 text-sm text-red-500">{getError("budgetAmount")}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {isEn
                ? `Meta Minimum: ${formatSelectedAdAccountCurrency(minimumWizardBudget)}`
                : `الحد الأدنى لميتا: ${formatSelectedAdAccountCurrency(minimumWizardBudget)}`}
            </span>
            <span>
              {isEn
                ? `(Ad account currency: ${selectedAdAccountCurrency} - Daily budget must meet this minimum to be accepted by Meta)`
                : `(عملة الحساب الإعلاني: ${selectedAdAccountCurrency} - يجب ألا تقل الميزانية اليومية عن هذا الحد لضمان قبول الحملة على فيسبوك)`}
            </span>
          </div>
        </div>
      </div>

      {/* Ad Dayparting Scheduler */}
      <AdDaypartingScheduler
        isLifetimeBudget={formData.budgetType === "LIFETIME"}
        enabled={Boolean(formData.adSchedulingEnabled)}
        onToggleEnabled={(enabled) =>
          handleChange("adSchedulingEnabled", enabled)
        }
        startHour={formData.adScheduleStartHour ?? 0}
        endHour={formData.adScheduleEndHour ?? 24}
        onChangeHours={(start, end) => {
          handleChange("adScheduleStartHour", start);
          handleChange("adScheduleEndHour", end);
        }}
        selectedDays={
          formData.adScheduleDays || [1, 2, 3, 4, 5, 6, 7]
        }
        onToggleDay={(day) => {
          const current = formData.adScheduleDays || [1, 2, 3, 4, 5, 6, 7];
          const next = current.includes(day)
            ? current.filter((d) => d !== day)
            : [...current, day];
          handleChange("adScheduleDays", next);
        }}
      />

      {/* Ad Set Spend Limits (When CBO is enabled) */}
      {formData.budgetOptimization && (
        <AdSetSpendLimitsEditor
          enabled={Boolean(formData.adSetSpendLimitsEnabled)}
          onToggle={(enabled) => handleChange("adSetSpendLimitsEnabled", enabled)}
          minDailySpend={formData.adSetMinDailySpend}
          onMinDailySpendChange={(val) => handleChange("adSetMinDailySpend", val)}
          maxDailySpend={formData.adSetMaxDailySpend}
          onMaxDailySpendChange={(val) => handleChange("adSetMaxDailySpend", val)}
          campaignBudget={formData.budgetAmount}
        />
      )}

      {/* Existing Customer Budget Cap (ECBC - v26) */}
      {(formData.objective === "OUTCOME_SALES" || formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/70 dark:from-emerald-950/20 dark:via-gray-800 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {isEn
                  ? "Existing Customer Budget Cap (Meta v26 ECBC)"
                  : "سقف ميزانية العملاء السابقين (Meta v26 ECBC)"}
              </h4>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                {isEn ? "Budget Protection" : "حماية الميزانية"}
              </span>
            </div>
            <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
              {formData.existingCustomerBudgetPercentage || 0}% {isEn ? "max for existing customers" : "كحد أقصى للعملاء الحاليين"}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {isEn
              ? `Prevents Meta algorithms from spending your budget on existing buyers, directing at least ${100 - (formData.existingCustomerBudgetPercentage || 0)}% towards acquiring brand-new customers.`
              : `يمنع خوارزميات Meta من حرق ميزانيتك الإعلانية على عملاء اشتروا منك مسبقاً، ويوجه ما لا يقل عن ${100 - (formData.existingCustomerBudgetPercentage || 0)}% لجلب مشترين جدد بالكامل.`}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={formData.existingCustomerBudgetPercentage || 0}
              onChange={(e) =>
                handleChange("existingCustomerBudgetPercentage", parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-500"
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            <span>0% {isEn ? "(100% Exclusively New Customers)" : "(100% عملاء جدد حصرياً)"}</span>
            <span>{isEn ? "20% Balanced" : "20% متوازن"}</span>
            <span>{isEn ? "50% Max Cap" : "50% كحد أقصى"}</span>
          </div>
        </div>
      )}

      {/* Bid Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {isEn ? "Bid Strategy" : "استراتيجية المزايدة"}
        </label>
        <div className="space-y-3">
          {bidStrategies.map((strategy) => (
            <label
              key={strategy.value}
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.bidStrategy === strategy.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="bidStrategy"
                value={strategy.value}
                checked={formData.bidStrategy === strategy.value}
                onChange={(e) => handleChange("bidStrategy", e.target.value)}
                className="mt-1 text-blue-600"
              />
              <div className={isEn ? "ml-3" : "mr-3"}>
                <div className="font-medium text-gray-900 dark:text-white">{strategy.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {strategy.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {isCappedBidStrategy(formData.bidStrategy) && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn
                ? `Bid Value / Target Cost (${selectedAdAccountCurrency})`
                : `قيمة المزايدة / التكلفة (${selectedAdAccountCurrency})`}
            </label>
            <input
              type="number"
              min="1"
              value={formData.bidValue || ""}
              onChange={(e) =>
                handleChange("bidValue", parseFloat(e.target.value) || undefined)
              }
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                getError("bidValue") ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {getError("bidValue") && (
              <p className="mt-1 text-sm text-red-500">{getError("bidValue")}</p>
            )}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {isEn ? "Schedule (Optional)" : "الجدولة (اختياري)"}
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isEn ? "Start Date" : "تاريخ البدء"}
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleChange("startTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isEn ? "End Date" : "تاريخ الانتهاء"}
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleChange("endTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
