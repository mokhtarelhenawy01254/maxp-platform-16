import React from "react";
import { useTranslation } from "react-i18next";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { GovernorateAreaSearch } from "../../../../components/ui/GovernorateAreaSearch";
import { OrderDetailsType, Government } from "../types";

interface CustomerAddressSectionProps {
  order: OrderDetailsType;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  governments: Government[];
}

export const CustomerAddressSection: React.FC<CustomerAddressSectionProps> = ({
  order,
  isEditing,
  editForm,
  setEditForm,
  governments,
}) => {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
};
