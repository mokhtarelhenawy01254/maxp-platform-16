import React from "react";
import { Link } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { ShippingAutoError } from "./shippingCardTypes";

interface ShippingErrorBannerProps {
  shippingAutoError: ShippingAutoError | null;
  companiesCount: number;
  loadingCompanies: boolean;
}

export const ShippingErrorBanner: React.FC<ShippingErrorBannerProps> = ({
  shippingAutoError,
  companiesCount,
  loadingCompanies,
}) => {
  return (
    <>
      {shippingAutoError && (
        <div
          className={`p-4 rounded-xl border shadow-xs transition-all ${
            shippingAutoError.category === "DATA_ERROR"
              ? "border-amber-300 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
              : "border-rose-300 bg-rose-50/90 dark:border-rose-700/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                shippingAutoError.category === "DATA_ERROR"
                  ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                  : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
              }`}
            >
              {shippingAutoError.category === "DATA_ERROR" ? (
                <ExclamationTriangleIcon className="h-5 w-5" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                    shippingAutoError.category === "DATA_ERROR"
                      ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                      : "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100"
                  }`}
                >
                  {shippingAutoError.category === "DATA_ERROR"
                    ? "تنبيه بيانات العميل (Customer Data Issue)"
                    : "تنبيه نظام وربط الشحن (Carrier / Integration Issue)"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    shippingAutoError.category === "DATA_ERROR"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}
                >
                  تعذر توليد كود الشحن التلقائي
                </span>
              </div>

              <p
                className={`text-sm font-semibold ${
                  shippingAutoError.category === "DATA_ERROR"
                    ? "text-amber-950 dark:text-amber-50"
                    : "text-rose-950 dark:text-rose-50"
                }`}
              >
                {shippingAutoError.message}
              </p>

              {shippingAutoError.actionHint && (
                <p
                  className={`text-xs ${
                    shippingAutoError.category === "DATA_ERROR"
                      ? "text-amber-800 dark:text-amber-200/90"
                      : "text-rose-800 dark:text-rose-200/90"
                  }`}
                >
                  {shippingAutoError.actionHint}
                </p>
              )}
            </div>

            {shippingAutoError.category === "SYSTEM_ERROR" && (
              <Link
                to="/shipping-companies"
                className="px-2.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shrink-0 self-center shadow-xs active:scale-97"
              >
                إعدادات الشحن
              </Link>
            )}
          </div>
        </div>
      )}

      {companiesCount === 0 && !loadingCompanies && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                لا توجد شركات شحن مفعلة حالياً
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                يمكنك تفعيل شركات الشحن (تربو، كيو بي إكسبريس، بوستا) وإدخال بيانات الربط للبدء في الشحن الآلي.
              </p>
            </div>
          </div>
          <Link
            to="/shipping-companies"
            className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0 active:scale-97"
          >
            تفعيل شركات الشحن
          </Link>
        </div>
      )}
    </>
  );
};

export default ShippingErrorBanner;
