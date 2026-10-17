import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  PhoneIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { WhatsAppIcon } from "../../../../components/icons/brands";
import { OrderCallButton } from "../../../../components/telephony/OrderCallButton";
import { validateEgyptianPhone, toStandardDigits } from "../../../../utils/validation";
import { OrderDetailsType } from "../types";

interface CustomerContactSectionProps {
  order: OrderDetailsType;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
}

export const CustomerContactSection: React.FC<CustomerContactSectionProps> = ({
  order,
  isEditing,
  editForm,
  setEditForm,
}) => {
  const { t } = useTranslation();
  const [phoneErrors, setPhoneErrors] = useState<{
    main?: string;
    alternative?: string;
  }>({});

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
    </>
  );
};
