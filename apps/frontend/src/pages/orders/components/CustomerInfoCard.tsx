import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { WhatsAppIcon } from "../../../components/icons/brands";
import { OrderCallButton } from "../../../components/telephony/OrderCallButton";
import { OrderDetailsType, Government, Area } from "../types";
import { GovernorateAreaSearch } from "../../../components/ui/GovernorateAreaSearch";
import { validateEgyptianPhone, toStandardDigits } from "../../../utils/validation";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  CustomerRatingBadge,
  CUSTOMER_RATING_OPTIONS,
  normalizeRatingLevel,
} from "../../../components/orders/CustomerRatingBadge";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockEvaluation,
  CustomerBlockReasonCode,
} from "../../../services/customerBlocklistService";
import { InvoicePrintSettings } from "../../../types/invoiceSettings";
import { useOrderCustomFieldsConfig } from "../../../hooks/useOrderCustomFieldsConfig";
import { resolveCustomFieldsForDisplay } from "../../../utils/orderCustomFields";

export interface CustomerInfoCardCustomFieldConfig {
  isEnabled?: boolean;
  label?: string;
  placeholder?: string;
}

interface CustomerInfoCardProps {
  order: OrderDetailsType;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  governments: Government[];
  areas: Area[];
  loadingGovernments: boolean;
  loadingAreas: boolean;
  selectedGovernmentId: number | null;
  setSelectedGovernmentId: (id: number | null) => void;
  handleGovernmentChange: (id: number, name: string) => void;
  invoiceSettings?: InvoicePrintSettings;
  customFieldConfig?: CustomerInfoCardCustomFieldConfig;
  onOrderUpdated?: () => void;
  onCustomerRatingChange?: (newRating: string) => void;
}

const blockReasonOptions: Array<{
  value: CustomerBlockReasonCode;
  label: string;
}> = [
  { value: "FAKE_ORDERS", label: "طلبات وهمية" },
  { value: "REPEATED_REFUSAL", label: "رفض استلام متكرر" },
  { value: "ABUSE", label: "إساءة للدعم" },
  { value: "FRAUD", label: "احتيال" },
  { value: "WRONG_DATA", label: "بيانات غير صحيحة" },
  { value: "OTHER", label: "سبب آخر" },
];

const blockActionOptions: Array<{
  value: CustomerBlockAction;
  label: string;
}> = [
  { value: "BLOCK_ORDERS", label: "منع الطلبات" },
  { value: "REQUIRE_MANAGER_APPROVAL", label: "موافقة مدير قبل الطلب" },
  { value: "BLOCK_COD_ONLY", label: "منع الدفع عند الاستلام فقط" },
];

const getBlockActionLabel = (action?: string | null) =>
  blockActionOptions.find((item) => item.value === action)?.label ||
  "منع الطلبات";

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  order,
  isEditing,
  editForm,
  setEditForm,
  governments,
  invoiceSettings,
  customFieldConfig: passedCustomFieldConfig,
  onOrderUpdated,
  onCustomerRatingChange,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { config: customFieldConfig } = useOrderCustomFieldsConfig({
    invoiceSettings,
    overrideConfig: passedCustomFieldConfig,
  });

  const isCustomFieldEnabled = customFieldConfig.isEnabled;
  const { customFields, displayNotes } = resolveCustomFieldsForDisplay(order, {
    showCustomFields: isCustomFieldEnabled,
    defaultLabel: customFieldConfig.label,
  });
  const [phoneErrors, setPhoneErrors] = useState<{
    main?: string;
    alternative?: string;
  }>({});
  const [customerBlock, setCustomerBlock] =
    useState<CustomerBlockEvaluation | null>(null);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({
    reasonCode: "REPEATED_REFUSAL" as CustomerBlockReasonCode,
    reasonNote: "",
    action: "BLOCK_ORDERS" as CustomerBlockAction,
    expiresAt: "",
  });
  const isBlockAdmin = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "ADMIN",
  ].includes(user?.role || "");
  const hasBlockIdentifier = Boolean(
    order.customerId || order.customerPhone || order.customerEmail,
  );

  useEffect(() => {
    if (!isBlockAdmin || !hasBlockIdentifier) {
      setCustomerBlock(null);
      return;
    }

    let cancelled = false;

    const checkCustomerBlock = async () => {
      try {
        setCheckingBlock(true);
        const result = await customerBlocklistService.check({
          customerId: order.customerId || undefined,
          phone: order.customerPhone || undefined,
          email: order.customerEmail || undefined,
          source: "manual",
          paymentMethod: order.paymentMethod,
        });

        if (!cancelled) {
          setCustomerBlock(result?.rule || result?.blocked ? result : null);
        }
      } catch (_error) {
        if (!cancelled) {
          setCustomerBlock(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingBlock(false);
        }
      }
    };

    void checkCustomerBlock();

    return () => {
      cancelled = true;
    };
  }, [
    hasBlockIdentifier,
    isBlockAdmin,
    order.customerEmail,
    order.customerId,
    order.customerPhone,
    order.paymentMethod,
  ]);

  const handleBlockCustomer = async () => {
    setSavingBlock(true);
    try {
      const rule = await customerBlocklistService.createRule({
        customerId: order.customerId || undefined,
        phone: order.customerPhone || undefined,
        email: order.customerEmail || undefined,
        reasonCode: blockForm.reasonCode,
        reasonNote: blockForm.reasonNote.trim() || undefined,
        action: blockForm.action,
        expiresAt: blockForm.expiresAt || undefined,
        metadata: {
          source: "order_details",
          orderNumber: order.orderNumber,
        },
      });

      setCustomerBlock({
        blocked: true,
        action: rule.action,
        message: "هذا العميل محظور من إنشاء الطلبات",
        rule,
      });
      setShowBlockModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "فشل في حظر العميل");
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUnblockCustomer = async () => {
    const ruleId = customerBlock?.rule?.id;
    if (!ruleId) return;

    setSavingBlock(true);
    try {
      await customerBlocklistService.liftRule(
        ruleId,
        `تم فك الحظر من تفاصيل الطلب ${order.orderNumber}`,
      );
      setCustomerBlock(null);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "فشل في فك الحظر");
    } finally {
      setSavingBlock(false);
    }
  };

  const handlePhoneChange = (
    field: "customerPhone" | "alternativePhone",
    value: string,
  ) => {
    setEditForm({ ...editForm, [field]: value });

    if (value.trim() !== "") {
      const validation = validateEgyptianPhone(value);
      if (!validation.isValid) {
        setPhoneErrors((prev) => ({
          ...prev,
          [field === "customerPhone" ? "main" : "alternative"]:
            validation.error,
        }));
      } else {
        setPhoneErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field === "customerPhone" ? "main" : "alternative"];
          return newErrors;
        });
      }
    } else {
      setPhoneErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field === "customerPhone" ? "main" : "alternative"];
        return newErrors;
      });
    }
  };

  const getWhatsAppChatUrl = (phone?: string | null) => {
    if (!phone) return null;
    let cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
      cleanPhone = "2" + cleanPhone;
    }
    const params = new URLSearchParams();
    params.set("phone", cleanPhone);
    if (order.customerName) {
      params.set("name", order.customerName);
    }
    if (order.orderNumber) {
      params.set("orderNumber", order.orderNumber);
    }
    if (order.conversationId) {
      params.set("conversationId", order.conversationId);
    }
    return `/whatsapp?${params.toString()}`;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center text-lg font-medium text-gray-900 dark:text-gray-100 flex-wrap gap-2">
            <span className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />{" "}
              {t("orderDetails.customerInfo")}
            </span>
            <CustomerRatingBadge
              rating={order.customerRating || (order as any).customer?.customerRating}
              healthScore={(order as any).healthScore || (order as any).customer?.healthScore}
              healthDiagnosis={(order as any).healthDiagnosis}
              orderNumber={order.orderNumber}
              customerId={order.customerId || (order as any).customer?.id}
              deliveryRate={(order as any).deliveryRate ?? (order as any).customer?.deliveryRate}
              totalDelivered={(order as any).totalDelivered ?? (order as any).customer?.totalDelivered}
              totalAttempts={(order as any).totalAttempts ?? (order as any).customer?.totalOrdersCount}
              interactive={true}
              variant="badge"
              size="sm"
              onRatingChange={(newRating) => {
                if (setEditForm) {
                  setEditForm((prev: any) => ({ ...prev, customerRating: newRating }));
                }
                onCustomerRatingChange?.(newRating);
                onOrderUpdated?.();
              }}
            />
          </h3>

          {isBlockAdmin && hasBlockIdentifier && !isEditing && (
            customerBlock?.blocked ? (
              <button
                type="button"
                onClick={handleUnblockCustomer}
                disabled={savingBlock || checkingBlock || !customerBlock.rule?.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {savingBlock ? "جاري..." : "فك الحظر"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                disabled={savingBlock || checkingBlock}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <NoSymbolIcon className="h-4 w-4" />
                {checkingBlock ? "فحص..." : "حظر العميل"}
              </button>
            )
          )}
        </div>

        {customerBlock?.blocked && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <div className="flex items-start gap-2">
              <NoSymbolIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">العميل محظور</p>
                <p className="mt-0.5">
                  الأكشن:{" "}
                  {getBlockActionLabel(
                    customerBlock.action || customerBlock.rule?.action,
                  )}
                  {customerBlock.rule?.reasonNote
                    ? ` - ${customerBlock.rule.reasonNote}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {order.customerHistory?.stats && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("customer-order-history-card");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 transition hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30 text-xs active:scale-97 cursor-pointer"
              title="الانتقال إلى سجل وتاريخ طلبات العميل السابقة"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingBagIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-semibold truncate">
                  {order.customerHistory.stats.totalOrders > 1
                    ? `سجل المشتريات: ${order.customerHistory.stats.totalOrders} طلبات`
                    : "سجل المشتريات: عميل جديد (أول طلب)"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {order.customerHistory.stats.deliverySuccessRate !== null && (
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-bold tabular-nums bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    {order.customerHistory.stats.deliverySuccessRate}% استلام
                  </span>
                )}
                <span className="text-[10px] text-indigo-500 font-medium underline">
                  عرض السجل ↓
                </span>
              </div>
            </button>
          </div>
        )}

        <div className="space-y-3">
        {isEditing ? (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
              تقييم العميل
            </label>
            <select
              value={
                editForm.customerRating ||
                normalizeRatingLevel(
                  order.customerRating || (order as any).customer?.customerRating
                )
              }
              onChange={(e) =>
                setEditForm({ ...editForm, customerRating: e.target.value })
              }
              className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 py-2 px-3 focus:ring-primary focus:border-primary"
            >
              {CUSTOMER_RATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
              تقييم العميل
            </label>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
              <CustomerRatingBadge
                rating={order.customerRating || (order as any).customer?.customerRating}
                orderNumber={order.orderNumber}
                customerId={order.customerId || (order as any).customer?.id}
                deliveryRate={(order as any).customer?.deliveryRate}
                totalDelivered={(order as any).customer?.totalDelivered}
                totalAttempts={(order as any).customer?.totalOrdersCount}
                interactive={true}
                variant="badge"
                size="sm"
                onRatingChange={(newRating) => {
                  if (setEditForm) {
                    setEditForm((prev: any) => ({ ...prev, customerRating: newRating }));
                  }
                  onCustomerRatingChange?.(newRating);
                  onOrderUpdated?.();
                }}
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                انقر لتعديل التقييم
              </span>
            </div>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.nameLabel")}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.customerName}
              onChange={(e) =>
                setEditForm({ ...editForm, customerName: e.target.value })
              }
              className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
            />
          ) : (
            <p className="text-gray-900 dark:text-gray-100">
              {order.customerName || t("orders.notSpecified")}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.phoneLabel")}
          </label>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={editForm.customerPhone}
                onChange={(e) =>
                  handlePhoneChange("customerPhone", e.target.value)
                }
                className={`w-full rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  phoneErrors.main
                    ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                }`}
                dir="ltr"
                placeholder="01xxxxxxxxx"
              />
              {phoneErrors.main && (
                <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  <span>{phoneErrors.main}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-gray-900 dark:text-gray-100">
              <div className="flex items-center min-w-0">
                <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ms-0 me-2 shrink-0" />
                {order.customerPhone ? (
                  <span dir="ltr" className="font-mono tabular-nums font-medium">
                    {toStandardDigits(order.customerPhone)}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">
                    {t("orders.notSpecified")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {order.customerPhone && (
                  <OrderCallButton
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    customerName={order.customerName}
                    customerPhone={order.customerPhone}
                    compact
                  />
                )}
                {order.customerPhone && getWhatsAppChatUrl(order.customerPhone) && (
                  <Link
                    to={getWhatsAppChatUrl(order.customerPhone)!}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition active:scale-97 shrink-0 shadow-xs"
                    title="فتح محادثة العميل على واتساب المنصة"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>محادثة واتساب</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.alternativePhone")}
          </label>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={editForm.alternativePhone}
                onChange={(e) =>
                  handlePhoneChange("alternativePhone", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm ${
                  phoneErrors.alternative
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                dir="ltr"
                placeholder={t("orderDetails.additionalPhone").toString()}
              />
              {phoneErrors.alternative && (
                <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  <span>{phoneErrors.alternative}</span>
                </div>
              )}
            </div>
          ) : order.alternativePhone ? (
            <div className="flex items-center justify-between text-gray-900 dark:text-gray-100">
              <div className="flex items-center min-w-0">
                <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ms-0 me-2 shrink-0" />
                <span dir="ltr" className="font-mono tabular-nums font-medium">
                  {toStandardDigits(order.alternativePhone)}
                </span>
              </div>
              {getWhatsAppChatUrl(order.alternativePhone) && (
                <Link
                  to={getWhatsAppChatUrl(order.alternativePhone)!}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition active:scale-97 shrink-0 shadow-xs"
                  title="فتح محادثة الهاتف البديل على واتساب المنصة"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>محادثة واتساب</span>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {t("orders.notSpecified")}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.governorate")}
          </label>
          {isEditing ? (
            <GovernorateAreaSearch
              value={{
                governorate: editForm.governorate || "",
                area: editForm.city || "",
              }}
              onChange={(next) => {
                setEditForm({
                  ...editForm,
                  governorate: next.governorate,
                  city: next.area,
                });
              }}
              placeholder={t("orderDetails.selectGovernorate") as string}
              searchPlaceholder={t("orderDetails.searchArea") as string}
              emptyText={t("orderDetails.noAreasAvailable") as string}
              loadingText={t("orderDetails.loading") as string}
            />
          ) : (
            <p className="text-gray-900 dark:text-gray-100">
              {(() => {
                const val =
                  order.governorate ||
                  (order.shippingAddress as any)?.governorate;
                if (!val) return t("orders.notSpecified");

                // Check if it's a numeric ID
                const govId = parseInt(String(val));
                if (!isNaN(govId) && governments) {
                  const found = governments.find((g) => g.id === govId);
                  if (found) return found.name;
                }

                // Clean numeric prefix if exists
                return String(val).replace(/^\d+:/, "").trim();
              })()}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.areaCity")}
          </label>
          {isEditing ? (
            <p className="text-gray-900 dark:text-gray-100">
              {editForm.city
                ? String(editForm.city).replace(/^\d+:/, "").trim()
                : t("orders.notSpecified")}
            </p>
          ) : (
            <p className="text-gray-900 dark:text-gray-100">
              {order.city
                ? String(order.city).replace(/^\d+:/, "").trim()
                : t("orders.notSpecified")}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
            {t("orderDetails.detailedAddress", "العنوان التفصيلي")}
          </label>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editForm.customerAddress}
                onChange={(e) =>
                  setEditForm({ ...editForm, customerAddress: e.target.value })
                }
                className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                rows={3}
                placeholder={t("orderDetails.addressPlaceholder", "أدخل العنوان التفصيلي...").toString()}
              />
            </div>
          ) : (
            <div className="flex items-start text-gray-900 dark:text-gray-100">
              <MapPinIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2 mt-1" />
              <span>
                {(() => {
                  if (!order.customerAddress) return t("orders.notSpecified");
                  if (
                    typeof order.customerAddress === "string" &&
                    order.customerAddress.trim().startsWith("{")
                  ) {
                    try {
                      const parsed = JSON.parse(order.customerAddress);
                      const parts = [];
                      if (parsed.street) parts.push(parsed.street);
                      if (parsed.building)
                        parts.push(`${t("orderDetails.building")}: ${parsed.building}`);
                      if (parsed.floor)
                        parts.push(`${t("orderDetails.floor")}: ${parsed.floor}`);
                      if (parsed.apartment)
                        parts.push(`${t("orderDetails.apartment")}: ${parsed.apartment}`);
                      if (parsed.city && parsed.city !== parsed.governorate)
                        parts.push(parsed.city);
                      if (parsed.governorate) parts.push(parsed.governorate);
                      return parts.length > 0
                        ? parts.join(", ")
                        : order.customerAddress;
                    } catch (e) {
                      return order.customerAddress;
                    }
                  }
                  return order.customerAddress;
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Customer / Order Notes & Custom Specifications */}
        {((order.notes && order.notes.trim()) || (isEditing && editForm)) ? (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
              {isCustomFieldEnabled && customFields.length > 0
                ? (customFieldConfig.label
                    ? `${customFieldConfig.label} / ${t("orderDetails.orderNotes", "ملاحظات الطلب")}`
                    : t("orderDetails.customFieldsAndNotes", "المواصفات وملاحظات الطلب"))
                : t("orderDetails.orderNotes", "ملاحظات الطلب")}
            </label>
            {isEditing ? (
              <textarea
                value={editForm.notes || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
                rows={3}
                placeholder={
                  isCustomFieldEnabled
                    ? (customFieldConfig.placeholder ||
                        t(
                          "orderDetails.customFieldEditPlaceholder",
                          "أدخل تفاصيل ومواصفات الطلب...",
                        ))
                    : t(
                        "orderDetails.notesPlaceholder",
                        "أدخل ملاحظات الطلب...",
                      )
                }
              />
            ) : isCustomFieldEnabled && customFields.length > 0 ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-amber-200/70 dark:border-amber-900/40">
                    <DocumentTextIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {customFieldConfig.label ||
                        t(
                          "orderDetails.customFieldsHeader",
                          "المواصفات والحقول المخصصة",
                        )}
                    </span>
                  </div>
                  <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
                    {customFields.map((cf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                      >
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {cf.label}:
                        </span>
                        <span className="text-sm font-black text-gray-900 dark:text-gray-100 text-end">
                          {cf.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {displayNotes ? (
                  <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 p-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200 shadow-xs">
                    <span className="text-xs font-semibold block mb-1 text-gray-500 dark:text-gray-400">
                      {t("orderDetails.additionalNotes", "ملاحظات إضافية:")}
                    </span>
                    <p className="whitespace-pre-wrap font-medium leading-relaxed">
                      {displayNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 p-3.5 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-100 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full min-w-0">
                    <p className="whitespace-pre-wrap font-medium leading-relaxed">
                      {order.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
        </div>
      </div>

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <NoSymbolIcon className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  حظر العميل من الطلب
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  سيتم تطبيق الحظر على بيانات العميل المرتبطة بهذا الطلب.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الأكشن
                </span>
                <select
                  value={blockForm.action}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      action: event.target.value as CustomerBlockAction,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {blockActionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  السبب
                </span>
                <select
                  value={blockForm.reasonCode}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      reasonCode: event.target.value as CustomerBlockReasonCode,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {blockReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ينتهي في
                </span>
                <input
                  type="date"
                  value={blockForm.expiresAt}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ملاحظة السبب
                </span>
                <textarea
                  value={blockForm.reasonNote}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      reasonNote: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                disabled={savingBlock}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBlockCustomer}
                disabled={savingBlock}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {savingBlock ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <NoSymbolIcon className="h-4 w-4" />
                )}
                تأكيد الحظر
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerInfoCard;
