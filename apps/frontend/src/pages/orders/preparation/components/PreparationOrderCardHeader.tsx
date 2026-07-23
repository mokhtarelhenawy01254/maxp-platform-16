import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SOURCE_LABELS } from "../constants";
import { getAgeLabel } from "../helpers";
import { summarizeOrderDocumentItems } from "../../../../utils/orderDocumentQuantityOffers";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
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
  const { t } = useTranslation();
  const itemSummary = summarizeOrderDocumentItems(order.items);
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const canViewFullDetails = merchantFulfillment?.canViewFullDetails !== false;
  const isMerchantScopedOrder = Boolean(merchantFulfillment);

  return (
    <div className="border-b border-gray-100 px-4 py-3">
      {/* Top row: checkbox + order number + badges + meta stats */}
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelection(order.orderNumber)}
          disabled={!canPrepare}
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />

        <div className="min-w-0 flex-1">
          {/* Order number + stage badge + source */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isMerchantScopedOrder ? (
              <span className="text-sm font-bold text-gray-900">
                #{order.orderNumber}
              </span>
            ) : (
              <Link
                to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                className="text-sm font-bold text-gray-900 hover:text-amber-700"
              >
                #{order.orderNumber}
              </Link>
            )}

            {(() => {
              const statusInfo = getStatusDisplay(order.normalizedStatus);
              return (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.colorClass}`}
                  aria-label={statusInfo.labelKey}
                >
                  {t(statusInfo.labelKey) || statusInfo.label}
                </span>
              );
            })()}

            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
              {SOURCE_LABELS[(order.sourceType || "unknown").toLowerCase()] ||
                order.sourceType}
            </span>

            {merchantFulfillment ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  canPrepare
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-100 text-gray-600"
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

          {/* Customer + location */}
          <p className="mt-1 text-xs font-medium text-gray-700">
            {order.customerName}
            {order.customerPhone ? ` — ${order.customerPhone}` : ""}
            <span className="mx-1.5 text-gray-300">•</span>
            <span className="text-gray-400">
              {getAgeLabel(order.createdAt)}
              {canViewFullDetails && (order.governorate || order.city)
                ? ` • ${order.governorate || order.city}`
                : ""}
            </span>
          </p>
        </div>

        {/* Right-side compact stats */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">القطع</p>
            <p className="text-sm font-bold text-gray-800">{order.totalUnits}</p>
          </div>

          {canViewFullDetails && (
            <>
              <div className="h-8 w-px bg-gray-100" />
              <div className="text-center">
                <p className="text-[10px] text-gray-400">القيمة</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatPrice(order.totalValue)}
                </p>
              </div>
            </>
          )}

          <div className="h-8 w-px bg-gray-100" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400">المخزن</p>
            <p className="max-w-[80px] truncate text-xs font-semibold text-gray-700">
              {order.recommendedWarehouseName || "غير محدد"}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400">آخر تحديث</p>
            <p className="text-xs font-semibold text-gray-700">
              {formatDate(order.updatedAt || order.createdAt)}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400">كود الشحن</p>
            <p className="max-w-[100px] truncate text-xs font-medium text-gray-700" dir="ltr">
              {order.turboTrackingNumber ||
                (order.shipments?.length
                  ? order.shipments
                      .map((s) => s.trackingNumber)
                      .filter(Boolean)
                      .join(", ")
                  : null) || "—"}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100" />

          <div
            className={`rounded-lg px-2 py-1 text-center text-[11px] font-semibold ${
              order.isReady
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {order.isReady
              ? "جاهز ✓"
              : `${order.missingItemsCount} نقص`}
          </div>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="mt-2.5 flex flex-wrap gap-2 lg:hidden">
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
          {order.totalUnits} قطعة
        </span>
        {canViewFullDetails && (
          <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            {formatPrice(order.totalValue)}
          </span>
        )}
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
          {order.recommendedWarehouseName || "لم يتم التخصيص"}
        </span>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            order.isReady ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {order.isReady ? "جاهز للتجهيز" : `${order.missingItemsCount} منتج يحتاج مراجعة`}
        </span>
      </div>

      {/* Quantity offer notice */}
      {itemSummary.hasQuantityOffers ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            عرض كميات
          </span>
          <span className="text-xs font-semibold text-amber-900">
            {itemSummary.primaryLabel}
          </span>
          {itemSummary.secondaryLabel && (
            <span className="text-xs text-amber-700">{itemSummary.secondaryLabel}</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PreparationOrderCardHeader;
