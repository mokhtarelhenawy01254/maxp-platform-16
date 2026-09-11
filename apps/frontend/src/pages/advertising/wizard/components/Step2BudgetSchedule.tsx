import React from "react";
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
  BID_STRATEGIES,
  CONVERSION_EVENTS,
  CONVERSION_LOCATIONS,
  ATTRIBUTION_WINDOWS,
  PERFORMANCE_GOALS,
} from "../constants";
import {
  getFullAdMinimumBudgetAmount,
  isCappedBidStrategy,
} from "../../CreateAdWizard.helpers";

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
    "حسابات بدون Business واضح";

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
    : "غير محدد";

  const selectedAdAccountName =
    selectedSavedAdAccount?.name ||
    selectedRemoteAdAccount?.name ||
    selectedAdAccountId ||
    "غير محدد";

  const selectedAccountHealthLabel =
    selectedRemoteAdAccount?.billingHealth?.accountStatusLabel ||
    (selectedAdAccountIsActive ? "مفعل داخل MaxP" : "يحتاج تفعيل");

  const minimumWizardBudget = getFullAdMinimumBudgetAmount(
    selectedAdAccountCurrency,
  );

  const formatSelectedAdAccountCurrency = (value?: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: selectedAdAccountCurrency || "EGP",
      maximumFractionDigits: 2,
    }).format(value || 0);
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              حساب Facebook Ads <span className="text-red-500">*</span>
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              اختر الحساب الإعلاني الذي سنستخدمه لإنشاء الإعلان وتحميل
              البكسلات.
            </p>
          </div>
          {selectedAdAccountIsActive && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              الحساب مفعل
            </span>
          )}
        </div>

        {loadingAdAccounts ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري تحميل الحسابات الإعلانية...</span>
          </div>
        ) : adAccounts.length > 0 ? (
          <div className="space-y-3">
            <select
              name="facebookAdAccountId"
              aria-label="اختيار الحساب الإعلاني حسب Business"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="">اختر الحساب الإعلاني</option>
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
                        : "Status غير معروف");

                    return (
                      <option key={account.id} value={normalizedAccountId}>
                        {account.name} - act_{normalizedAccountId} -{" "}
                        {account.currency} - {healthLabel}
                        {isActive ? " - مفعل" : isSaved ? " - محفوظ" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            {selectedAdAccountId ? (
              <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Business
                  </div>
                  <div className="mt-1 font-semibold">{selectedBusinessName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Ad Account
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountName}
                  </div>
                  <div className="text-xs text-blue-700" translate="no">
                    act_{selectedAdAccountId}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Readiness
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountIsActive
                      ? "مفعل وجاهز"
                      : "يحتاج تفعيل قبل الإرسال"}
                  </div>
                  <div className="text-xs text-blue-700">
                    {selectedAccountHealthLabel}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                اختر Business ثم الحساب الإعلاني المقصود. لن نختار أول حساب
                تلقائيا عند وجود أكثر من حساب، حتى لا تختلط حملات المتجر مع أي
                حساب آخر.
              </div>
            )}

            {selectedRemoteAdAccount?.billingHealth?.isAccountUsable === false && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                هذا الحساب ظاهر من Meta لكنه غير جاهز للإعلانات حاليا:{" "}
                {selectedRemoteAdAccount.billingHealth.disableReason ||
                  "راجع حالة الحساب أو وسيلة الدفع داخل Business Manager."}
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
                    جاري التفعيل...
                  </>
                ) : (
                  "تفعيل الحساب وتحميل البيانات"
                )}
              </button>

              {!selectedAdAccountIsActive && (
                <p className="text-sm text-amber-700">
                  فعّل الحساب المختار أولًا حتى تظهر البكسلات الخاصة به.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            لا توجد حسابات إعلانية متاحة حاليًا. اربط Facebook أولًا ثم أعد
            المحاولة.
          </div>
        )}
        {getError("adAccountId") && (
          <p className="mt-3 text-sm text-red-500">{getError("adAccountId")}</p>
        )}
      </div>

      {/* Performance Goal - للمبيعات فقط */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            هدف الأداء (Performance Goal)
          </h4>
          <div className="space-y-3">
            {PERFORMANCE_GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.performanceGoal === goal.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
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
                <div className="mr-3">
                  <div className="font-medium text-gray-900">{goal.label}</div>
                  <div className="text-sm text-gray-500">
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
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Facebook Pixel <span className="text-red-500">*</span>
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر البكسل لتتبع التحويلات على موقعك
          </p>
          {loadingPixels ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري تحميل البكسلات...</span>
            </div>
          ) : facebookPixels.length > 0 ? (
            <select
              value={formData.pixelId}
              onChange={(e) => handleChange("pixelId", e.target.value)}
              className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">اختر البكسل</option>
              {facebookPixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name} (ID: {pixel.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                {!selectedAdAccountId || !selectedAdAccountIsActive
                  ? "⚠️ اختر وفعّل الحساب الإعلاني أولًا حتى نحمل البكسلات المرتبطة به."
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              حدث التحويل
            </h4>
            <select
              value={formData.conversionEvent}
              onChange={(e) => handleChange("conversionEvent", e.target.value)}
              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CONVERSION_EVENTS.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.icon} {event.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              {
                CONVERSION_EVENTS.find(
                  (e) => e.value === formData.conversionEvent,
                )?.description
              }
            </p>
          </div>

          {/* Conversion Location */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              موقع التحويل
            </h4>
            <select
              value={formData.conversionLocation}
              onChange={(e) =>
                handleChange("conversionLocation", e.target.value)
              }
              className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {CONVERSION_LOCATIONS.map((location) => (
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
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            نافذة الإحالة (Attribution Window)
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            المدة الزمنية التي يُنسب فيها التحويل إلى إعلانك
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibleAttributionWindows.map((window) => (
              <label
                key={window.value}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.attributionWindow === window.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
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
                <div className="mr-3">
                  <div className="font-medium text-sm text-gray-900">
                    {window.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {window.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Creative */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              المحتوى الديناميكي (Dynamic Creative)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              اختبار تلقائي لتركيبات مختلفة من الصور والنصوص والعناوين
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Optimization (CBO) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              تحسين ميزانية الحملة (CBO)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              دع Facebook يوزع الميزانية تلقائياً على المجموعات الإعلانية الأفضل
              أداءً
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Type & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع الميزانية
          </label>
          <select
            value={formData.budgetType}
            onChange={(e) => handleChange("budgetType", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="DAILY">يومية</option>
            <option value="LIFETIME">إجمالية</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المبلغ ({selectedAdAccountCurrency}){" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={minimumWizardBudget}
            value={formData.budgetAmount}
            onChange={(e) =>
              handleChange("budgetAmount", parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              getError("budgetAmount") ? "border-red-500" : "border-gray-300"
            }`}
          />
          {getError("budgetAmount") && (
            <p className="mt-1 text-sm text-red-500">{getError("budgetAmount")}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            سيتم إرسال الميزانية بعملة الحساب الإعلاني المختار:{" "}
            {selectedAdAccountCurrency}. الحد الأدنى الحالي{" "}
            {formatSelectedAdAccountCurrency(minimumWizardBudget)}.
          </p>
        </div>
      </div>

      {/* Bid Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          استراتيجية المزايدة
        </label>
        <div className="space-y-3">
          {BID_STRATEGIES.map((strategy) => (
            <label
              key={strategy.value}
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.bidStrategy === strategy.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
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
              <div className="mr-3">
                <div className="font-medium">{strategy.label}</div>
                <div className="text-sm text-gray-500">
                  {strategy.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {isCappedBidStrategy(formData.bidStrategy) && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قيمة المزايدة / التكلفة ({selectedAdAccountCurrency})
            </label>
            <input
              type="number"
              min="1"
              value={formData.bidValue || ""}
              onChange={(e) =>
                handleChange("bidValue", parseFloat(e.target.value) || undefined)
              }
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getError("bidValue") ? "border-red-500" : "border-gray-300"
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
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          الجدولة (اختياري)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              تاريخ البدء
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleChange("startTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              تاريخ الانتهاء
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleChange("endTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
