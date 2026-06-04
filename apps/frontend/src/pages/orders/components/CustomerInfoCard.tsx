import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { OrderDetailsType, Government, Area } from "../types";
import { validateEgyptianPhone } from "../../../utils/validation";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockEvaluation,
  CustomerBlockReasonCode,
} from "../../../services/customerBlocklistService";

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
  areas,
  loadingGovernments,
  loadingAreas,
  selectedGovernmentId,
  setSelectedGovernmentId,
  handleGovernmentChange,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center text-lg font-medium text-gray-900 dark:text-gray-100">
            <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2" />{" "}
            {t("orderDetails.customerInfo")}
            {order.customerRating && (
              <span
                className={`mr-2 px-2 py-0.5 rounded-full text-xs ${
                  order.customerRating === "EXCELLENT"
                    ? "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400"
                    : order.customerRating === "GOOD"
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                      : order.customerRating === "BAD"
                        ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                }`}
              >
                {order.customerRating}
              </span>
            )}
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

        <div className="space-y-3">
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
            <div
              className="flex items-center text-gray-900 dark:text-gray-100"
              dir="ltr"
            >
              <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />{" "}
              {order.customerPhone || t("orders.notSpecified")}
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
                className={`w-full rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
                  phoneErrors.alternative
                    ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
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
            <div
              className="flex items-center text-gray-900 dark:text-gray-100"
              dir="ltr"
            >
              <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />{" "}
              {order.alternativePhone}
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
            <select
              value={editForm.governorate}
              onChange={(e) => {
                const selectedGov = governments.find(
                  (g) => g.name === e.target.value,
                );
                if (selectedGov) {
                  handleGovernmentChange(selectedGov.id, selectedGov.name);
                } else {
                  setEditForm({ ...editForm, governorate: e.target.value });
                  setSelectedGovernmentId(null);
                }
              }}
              className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
              disabled={loadingGovernments}
            >
              <option value="">{t("orderDetails.selectGovernorate")}</option>
              {governments.map((gov) => (
                <option key={gov.id} value={gov.name}>
                  {gov.name}
                </option>
              ))}
            </select>
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
            <select
              value={editForm.city}
              onChange={(e) =>
                setEditForm({ ...editForm, city: e.target.value })
              }
              className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
              disabled={
                loadingAreas || !selectedGovernmentId || areas.length === 0
              }
            >
              <option value="">
                {loadingAreas
                  ? t("orderDetails.loading")
                  : !selectedGovernmentId
                    ? t("orderDetails.selectGovernorateFirst")
                    : areas.length === 0
                      ? t("orderDetails.noAreasAvailable")
                      : t("orderDetails.selectArea")}
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
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
            {t("orderDetails.detailedAddress")}
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
                placeholder={t("orderDetails.addressPlaceholder").toString()}
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
