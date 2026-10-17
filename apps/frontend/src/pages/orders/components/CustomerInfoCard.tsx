import React from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { CustomerRatingBadge } from "../../../components/orders/CustomerRatingBadge";
import { useOrderCustomFieldsConfig } from "../../../hooks/useOrderCustomFieldsConfig";
import { resolveCustomFieldsForDisplay } from "../../../utils/orderCustomFields";
import {
  CustomerInfoCardCustomFieldConfig,
  CustomerInfoCardProps,
  getBlockActionLabel,
} from "./customer-card/customerCardTypes";
import { useCustomerBlock } from "./customer-card/useCustomerBlock";
import { CustomerBlockModal } from "./customer-card/CustomerBlockModal";
import { CustomerContactSection } from "./customer-card/CustomerContactSection";
import { CustomerAddressSection } from "./customer-card/CustomerAddressSection";
import { CustomerNotesSection } from "./customer-card/CustomerNotesSection";

export type { CustomerInfoCardCustomFieldConfig, CustomerInfoCardProps };

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  order,
  isEditing,
  editForm,
  setEditForm,
  governments,
  invoiceSettings,
  customFieldConfig: passedCustomFieldConfig,
}) => {
  const { t } = useTranslation();
  const { config: customFieldConfig } = useOrderCustomFieldsConfig({
    invoiceSettings,
    overrideConfig: passedCustomFieldConfig,
  });

  const isCustomFieldEnabled = customFieldConfig.isEnabled;
  const { customFields, displayNotes } = resolveCustomFieldsForDisplay(order, {
    showCustomFields: isCustomFieldEnabled,
    defaultLabel: customFieldConfig.label,
  });

  const {
    customerBlock,
    checkingBlock,
    showBlockModal,
    setShowBlockModal,
    savingBlock,
    blockForm,
    setBlockForm,
    isBlockAdmin,
    hasBlockIdentifier,
    handleBlockCustomer,
    handleUnblockCustomer,
  } = useCustomerBlock(order);

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
              healthScore={(order as any).healthScore ?? (order as any).customer?.healthScore}
              healthDiagnosis={(order as any).healthDiagnosis}
              orderNumber={order.orderNumber}
              customerId={order.customerId || (order as any).customer?.id}
              deliveryRate={
                (order as any).deliveryRate ??
                order.customerHistory?.stats?.deliverySuccessRate ??
                (order as any).customer?.deliveryRate
              }
              totalDelivered={
                (order as any).totalDelivered ??
                order.customerHistory?.stats?.deliveredCount ??
                (order as any).customer?.totalDelivered
              }
              totalFailed={
                (order as any).totalFailed ??
                order.customerHistory?.stats?.returnedCount
              }
              totalAttempts={
                (order as any).totalAttempts ??
                (order.customerHistory?.stats
                  ? (order.customerHistory.stats.deliveredCount || 0) +
                    (order.customerHistory.stats.returnedCount || 0)
                  : undefined)
              }
              totalOrdersCount={
                (order as any).totalOrdersCount ??
                order.customerHistory?.stats?.totalOrders ??
                (order as any).customer?.totalOrdersCount
              }
              interactive={false}
              variant="badge"
              size="sm"
            />
          </h3>

          {isBlockAdmin && hasBlockIdentifier && !isEditing && (
            customerBlock?.blocked ? (
              <button
                type="button"
                onClick={handleUnblockCustomer}
                disabled={savingBlock || checkingBlock || !customerBlock.rule?.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20 active:scale-97"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {savingBlock ? "جاري..." : "فك الحظر"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                disabled={savingBlock || checkingBlock}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 active:scale-97"
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
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-bold tabular-nums font-mono bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
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
          <CustomerContactSection
            order={order}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
          />
          <CustomerAddressSection
            order={order}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            governments={governments}
          />
          <CustomerNotesSection
            order={order}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            isCustomFieldEnabled={isCustomFieldEnabled}
            customFieldConfig={customFieldConfig}
            customFields={customFields}
            displayNotes={displayNotes}
          />
        </div>
      </div>

      <CustomerBlockModal
        show={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        savingBlock={savingBlock}
        blockForm={blockForm}
        setBlockForm={setBlockForm}
        onConfirm={handleBlockCustomer}
      />
    </>
  );
};

export default CustomerInfoCard;
