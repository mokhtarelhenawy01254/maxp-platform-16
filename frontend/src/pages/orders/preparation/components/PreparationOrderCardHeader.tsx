import { Link } from "react-router-dom";
import { SOURCE_LABELS, STAGE_DEFINITIONS } from "../constants";
import { getAgeLabel } from "../helpers";
import { summarizeOrderDocumentItems } from "../../../../utils/orderDocumentQuantityOffers";
import type {
  PreparationOrder,
  ShortageFollowUpVisual,
} from "../types";

interface PreparationOrderCardHeaderProps {
  order: PreparationOrder;
  selected: boolean;
  statusLabelMap: Map<string, string>;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
  formatPrice: (value: number) => string;
  formatDate: (value: string) => string;
  onToggleSelection: (orderNumber: string) => void;
}

const PreparationOrderCardHeader = ({
  order,
  selected,
  statusLabelMap,
  shortageFollowUpVisual,
  formatPrice,
  formatDate,
  onToggleSelection,
}: PreparationOrderCardHeaderProps) => {
  const stageMeta = STAGE_DEFINITIONS.find((stage) => stage.key === order.stage);
  const itemSummary = summarizeOrderDocumentItems(order.items);
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const canViewFullDetails = merchantFulfillment?.canViewFullDetails !== false;
  const isMerchantScopedOrder = Boolean(merchantFulfillment);

  return (
    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-amber-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelection(order.orderNumber)}
            disabled={!canPrepare}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isMerchantScopedOrder ? (
                <span className="text-lg font-semibold text-gray-900">
                  #{order.orderNumber}
                </span>
              ) : (
                <Link
                  to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="text-lg font-semibold text-gray-900 hover:text-amber-700"
                >
                  #{order.orderNumber}
                </Link>
              )}
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  stageMeta?.colorClass ||
                  "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {stageMeta?.label ||
                  statusLabelMap.get(order.normalizedStatus) ||
                  order.normalizedStatus}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                {SOURCE_LABELS[(order.sourceType || "unknown").toLowerCase()] ||
                  order.sourceType}
              </span>
              {merchantFulfillment ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    canPrepare
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-gray-100 text-gray-700"
                  }`}
                >
                  {canPrepare ? "تجهيز التاجر" : "تجهيز الشركة"}
                </span>
              ) : null}
              {shortageFollowUpVisual ? (
                <span className={shortageFollowUpVisual.badgeClass}>
                  {shortageFollowUpVisual.label}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm font-medium text-gray-700">
              {order.customerName}
              {order.customerPhone ? ` - ${order.customerPhone}` : ""}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              منذ {getAgeLabel(order.createdAt)} •{" "}
              {canViewFullDetails
                ? order.governorate || order.city || "بدون عنوان واضح"
                : "بيانات الشحن لدى الشركة"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[260px]">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">عدد القطع</p>
            <p className="mt-1 font-semibold text-gray-900">{order.totalUnits}</p>
          </div>
          {canViewFullDetails ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">قيمة الطلب</p>
              <p className="mt-1 font-semibold text-gray-900">
                {formatPrice(order.totalValue)}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">الصلاحية</p>
              <p className="mt-1 font-semibold text-gray-900">عرض فقط</p>
            </div>
          )}
        </div>
      </div>

      {itemSummary.hasQuantityOffers ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
              عرض كميات
            </span>
            <span className="text-sm font-bold text-amber-900">
              {itemSummary.primaryLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            {itemSummary.secondaryLabel}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">المخزن الأنسب</p>
          <p className="mt-1 font-medium text-gray-900">
            {order.recommendedWarehouseName || "غير محدد"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">آخر تحديث</p>
          <p className="mt-1 font-medium text-gray-900">
            {formatDate(order.updatedAt || order.createdAt)}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-3 ${
            order.isReady
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
          }`}
        >
          <p
            className={`text-xs ${
              order.isReady ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            جاهزية المخزون
          </p>
          <p
            className={`mt-1 font-medium ${
              order.isReady ? "text-emerald-900" : "text-rose-900"
            }`}
          >
            {order.isReady
              ? "جاهز للتجهيز"
              : `${order.missingItemsCount} منتج يحتاج مراجعة`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreparationOrderCardHeader;
