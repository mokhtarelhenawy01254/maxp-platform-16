import { Truck as TruckIcon, Circle as DocumentArrowDownIcon, X as XMarkIcon, RefreshCw as ArrowPathIcon, Plus as PlusIcon, Circle as ArrowUturnLeftIcon } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import React from "react";
;
import { useDateFormat } from "../../../hooks/useDateFormat";
import { getTurboStatusDisplay } from "../../../utils/statusRegistry";
import { useCurrency } from "../../../hooks/useCurrency";
import { OrderDetailsType } from "../types";

interface TurboShippingPanelProps {
  order: OrderDetailsType;
  turboTrackingData: any;
  shippingComparison: any;
  loadingComparison: boolean;
  turboLoading: boolean;
  onCreateShipment: () => void;
  onUpdateShipment?: () => void;
  onSyncStatus?: () => void;
  onPrintWaybill: () => void;
  onCancelShipment: () => void;
  onUnlinkShipment: () => void;
  onRecreateShipment?: () => void;
  onCalculateShipping: () => void;
  canManageShipments?: boolean;
}

const TurboShippingPanel: React.FC<TurboShippingPanelProps> = ({
  order,
  turboTrackingData,
  shippingComparison,
  loadingComparison,
  turboLoading,
  onCreateShipment,
  onUpdateShipment,
  onSyncStatus,
  onPrintWaybill,
  onCancelShipment,
  onUnlinkShipment,
  onRecreateShipment,
  onCalculateShipping,
  canManageShipments = true,
}) => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  if (!order) return null;

  const normalizedTurboStatus = String(
    order.turboShipmentStatus || "",
  ).toLowerCase();
  const isTurboShipmentCancelled =
    normalizedTurboStatus === "cancelled" ||
    normalizedTurboStatus === "deleted" ||
    normalizedTurboStatus === "9";
  const isTurboShipmentDelivered =
    normalizedTurboStatus === "delivered" ||
    normalizedTurboStatus === "completed" ||
    normalizedTurboStatus === "7" ||
    normalizedTurboStatus === "8";
  const hasTurboShipmentLink = Boolean(
    order.turboTrackingNumber ||
      order.turboShipmentId ||
      order.turboShipmentStatus ||
      order.turboLabelUrl,
  );
  const canCancelTurboShipment =
    Boolean(order.turboShipmentId || order.turboTrackingNumber) &&
    !isTurboShipmentCancelled &&
    !isTurboShipmentDelivered;
  const canUnlinkTurboShipment = !isTurboShipmentDelivered;
  const canRecreateTurboShipment =
    Boolean(order.turboShipmentId || order.turboTrackingNumber) &&
    !isTurboShipmentDelivered;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <TruckIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 ml-2" />
          شحن Turbo
        </h3>
      </div>

      {hasTurboShipmentLink ? (
        <div className="space-y-4">
          {/* Tracking Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  رقم التتبع:
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {order.turboTrackingNumber ||
                    order.turboShipmentId ||
                    "غير متاح"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  حالة الشحنة:
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTurboStatusDisplay(order.turboShipmentStatus).colorClass}`}
                >
                  {getTurboStatusDisplay(order.turboShipmentStatus).label}
                </span>
              </div>
              {turboTrackingData?.currentLocation && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الموقع الحالي:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {turboTrackingData.currentLocation}
                  </span>
                </div>
              )}
              {turboTrackingData?.estimatedDelivery && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    التسليم المتوقع:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(turboTrackingData.estimatedDelivery)}
                  </span>
                </div>
              )}
              {turboTrackingData?.deliveredAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    تاريخ التسليم:
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {formatDate(turboTrackingData.deliveredAt)}
                  </span>
                </div>
              )}
              {turboTrackingData?.branch && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الفرع المتوقع:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {turboTrackingData.branch}
                  </span>
                </div>
              )}
              {order.updatedAt && (
                <div className="flex justify-between items-center md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    آخر تحديث:
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(order.updatedAt)}
                  </span>
                </div>
              )}
            </div>
            {order.turboLabelUrl && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <a
                  href={order.turboLabelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 ml-1" />
                  عرض ملصق الشحنة
                </a>
              </div>
            )}
          </div>

          {/* Shipping Cost Comparison */}
          {(shippingComparison || order.shipping > 0) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                مقارنة أسعار الشحن:
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    السعر الفعلي من Turbo:
                  </span>
                  {shippingComparison?.actualCost ? (
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatPrice(
                        shippingComparison.actualCost,
                        order.currency,
                      )}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        غير متوفر
                      </span>
                      {canManageShipments && (
                        <button
                          onClick={onCalculateShipping}
                          disabled={loadingComparison}
                          className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-xs hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                        >
                          {loadingComparison ? "جاري الحساب..." : "حساب السعر"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    السعر المحدد للعميل:
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(order.shipping, order.currency)}
                  </span>
                </div>
                {shippingComparison && (
                  <div
                    className={`flex justify-between items-center pt-2 border-t ${
                      shippingComparison.difference > 0
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : shippingComparison.difference < 0
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      الفرق:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        shippingComparison.difference > 0
                          ? "text-red-600 dark:text-red-400"
                          : shippingComparison.difference < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {shippingComparison.difference > 0 ? "+" : ""}
                      {formatPrice(
                        shippingComparison.difference,
                        order.currency,
                      )}
                      {shippingComparison.difference > 0 && " (خسارة)"}
                      {shippingComparison.difference < 0 && " (ربح)"}
                      {shippingComparison.difference === 0 && " (متساوي)"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canManageShipments && onUpdateShipment && (
              <button
                onClick={onUpdateShipment}
                disabled={turboLoading}
                className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow"
                title="تحديث بيانات الشحنة (الاسم والتليفون والعنوان) في سيستم تربو"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ml-1 ${turboLoading ? "animate-spin" : ""}`}
                />
                تحديث الشحنة في Turbo
              </button>
            )}
            {canManageShipments && onSyncStatus && (
              <button
                onClick={onSyncStatus}
                disabled={turboLoading}
                className="flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow"
                title="سحب ومزامنة حالة الشحنة المباشرة من سيرفر تربو وتحديث الطلب بالنظام"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ml-1 ${turboLoading ? "animate-spin" : ""}`}
                />
                سحب ومزامنة حالة Turbo
              </button>
            )}
            {canManageShipments && (
              <button
                onClick={onPrintWaybill}
                disabled={turboLoading}
                className="flex items-center px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 text-sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4 ml-1" />
                طباعة بوليصة Turbo
              </button>
            )}
            {canManageShipments && canCancelTurboShipment && (
              <button
                onClick={onCancelShipment}
                disabled={turboLoading}
                className="flex items-center px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 text-sm"
              >
                <XMarkIcon className="w-4 h-4 ml-1" />
                إلغاء الشحنة
              </button>
            )}
            {canManageShipments && canUnlinkTurboShipment && (
              <button
                onClick={onUnlinkShipment}
                disabled={turboLoading}
                className="flex items-center px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50 text-sm"
              >
                <ArrowUturnLeftIcon className="w-4 h-4 ml-1" />
                إلغاء ربط Turbo
              </button>
            )}
            {canManageShipments &&
              canRecreateTurboShipment &&
              onRecreateShipment && (
                <button
                  onClick={onRecreateShipment}
                  disabled={turboLoading}
                  className="flex items-center px-4 py-2 bg-sky-600 dark:bg-sky-500 text-white rounded-lg hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50 text-sm"
                >
                  <ArrowPathIcon className="w-4 h-4 ml-1" />
                  إرجاع على Turbo تاني
                </button>
              )}
            {order.turboTrackingNumber && (
              <a
                href={`https://portal.turbo-eg.com/track/${order.turboTrackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm"
              >
                <TruckIcon className="w-4 h-4 ml-1" />
                تتبع على Turbo
              </a>
            )}
          </div>

          {/* Tracking History */}
          {turboTrackingData?.history &&
            turboTrackingData.history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  سجل التتبع:
                </h4>
                <div className="space-y-2">
                  {turboTrackingData.history.map(
                    (event: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-gray-100">
                            {event.status || event.description}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {event.location || ""}
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {event.timestamp || event.date}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            لم يتم إنشاء شحنة Turbo لهذا الطلب
          </p>
          {canManageShipments ? (
            <>
              <button
                onClick={onCreateShipment}
                disabled={turboLoading || order.status !== "CONFIRMED"}
                className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {turboLoading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 ml-1" />
                    إنشاء شحنة Turbo
                  </>
                )}
              </button>
              {order.status !== "CONFIRMED" && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  يجب تأكيد الطلب أولاً
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              إدارة الشحن من صلاحيات الشركة.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TurboShippingPanel;
