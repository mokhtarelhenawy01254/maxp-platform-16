import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { CustomerRatingBadge } from "@/components/orders/CustomerRatingBadge";
import { CustomerDetailsData } from "./types";
import { CustomerBlockRule } from "@/services/customerBlocklistService";

interface CustomerDetailsHeaderProps {
  customer: CustomerDetailsData["customer"];
  stats: CustomerDetailsData["stats"];
  isAdmin: boolean;
  isCustomerBlocked: boolean;
  activeBlockRule: CustomerBlockRule | null;
  isUnblocking: boolean;
  onStartWhatsApp: () => void;
  onUnblock: () => void;
  onOpenBlockModal: () => void;
  onExport: () => void;
  onOpenDeleteModal: () => void;
  getStatusBadge: (status: string) => string;
}

export const CustomerDetailsHeader: React.FC<CustomerDetailsHeaderProps> = ({
  customer,
  stats,
  isAdmin,
  isCustomerBlocked,
  activeBlockRule,
  isUnblocking,
  onStartWhatsApp,
  onUnblock,
  onOpenBlockModal,
  onExport,
  onOpenDeleteModal,
  getStatusBadge,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/customers"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {customer.firstName} {customer.lastName}
            </h1>
            <div className="flex gap-2 mt-1 items-center flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                  customer.status,
                )}`}
              >
                {customer.status}
              </span>
              <CustomerRatingBadge
                rating={customer.customerRating}
                deliveryRate={customer.deliveryRate ?? stats.deliveryRate}
                totalDelivered={customer.totalDelivered ?? stats.totalDelivered}
                totalOrdersCount={
                  customer.totalOrdersCount ?? stats.totalOrdersCount
                }
                variant="badge"
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* WhatsApp Button */}
          {customer.phone && (
            <button
              onClick={onStartWhatsApp}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-green-300 dark:border-green-800 rounded-lg text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-green-950/20 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all duration-150 active:scale-[0.97]"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 ml-1.5" />
              WhatsApp
            </button>
          )}

          {isAdmin &&
            (isCustomerBlocked ? (
              <button
                onClick={onUnblock}
                disabled={isUnblocking}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-red-300 dark:border-red-800 rounded-lg text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-all duration-150 active:scale-[0.97]"
              >
                <CheckCircleIcon className="h-4 w-4 ml-1.5" />
                {isUnblocking ? "جاري فك الحظر..." : "فك الحظر"}
              </button>
            ) : (
              <button
                onClick={onOpenBlockModal}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-red-300 dark:border-red-800 rounded-lg text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150 active:scale-[0.97]"
              >
                <NoSymbolIcon className="h-4 w-4 ml-1.5" />
                حظر العميل
              </button>
            ))}

          {/* Export Button */}
          <button
            onClick={onExport}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 active:scale-[0.97]"
          >
            <ArrowDownTrayIcon className="h-4 w-4 ml-1.5" />
            {t("common.export")}
          </button>

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 active:scale-[0.97]"
          >
            <PencilIcon className="h-4 w-4 ml-1.5" />
            {t("common.edit")}
          </button>

          {/* Delete Button */}
          <button
            onClick={onOpenDeleteModal}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-red-300 dark:border-red-800 rounded-lg text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150 active:scale-[0.97]"
          >
            <TrashIcon className="h-4 w-4 ml-1.5" />
            {t("common.delete")}
          </button>
        </div>
      </div>

      {isCustomerBlocked && activeBlockRule && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-start gap-3">
            <NoSymbolIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">العميل محظور من الطلبات</p>
              <p className="mt-1 text-xs">
                الإجراء:{" "}
                {activeBlockRule.action === "REQUIRE_MANAGER_APPROVAL"
                  ? "موافقة مدير قبل الطلب"
                  : activeBlockRule.action === "BLOCK_COD_ONLY"
                    ? "منع الدفع عند الاستلام فقط"
                    : "منع الطلبات"}
                {activeBlockRule.reasonNote
                  ? ` - ${activeBlockRule.reasonNote}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
