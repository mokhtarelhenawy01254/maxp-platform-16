import React from "react";
import {
  CheckIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ServerStackIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { FacebookPixelSettings } from "../types";

interface TrackingEventDefinition {
  id: string;
  name: string;
  code: string;
  pixelKey: keyof FacebookPixelSettings;
  capiKey?: keyof FacebookPixelSettings;
  description: string;
  isHighValue?: boolean;
}

const TRACKING_EVENTS: TrackingEventDefinition[] = [
  {
    id: "purchase",
    name: "إتمام الشراء",
    code: "Purchase",
    pixelKey: "pixelTrackPurchase",
    capiKey: "capiTrackPurchase",
    description: "أهم حدث في الحملات لتحسين الـ ROAS وتحديد العائد الإعلاني",
    isHighValue: true,
  },
  {
    id: "initiateCheckout",
    name: "بدء إنهاء الطلب",
    code: "InitiateCheckout",
    pixelKey: "pixelTrackInitiateCheckout",
    capiKey: "capiTrackInitiateCheckout",
    description: "عند انتقال العميل إلى صفحة الدفع أو إدخال بيانات التوصيل",
    isHighValue: true,
  },
  {
    id: "addToCart",
    name: "إضافة إلى السلة",
    code: "AddToCart",
    pixelKey: "pixelTrackAddToCart",
    capiKey: "capiTrackAddToCart",
    description: "عند نقر العميل على زر أضف للسلة في المتجر أو صفحات الهبوط",
    isHighValue: true,
  },
  {
    id: "viewContent",
    name: "عرض المنتج",
    code: "ViewContent",
    pixelKey: "pixelTrackViewContent",
    capiKey: "capiTrackViewContent",
    description: "تتبع زيارة صفحات تفاصيل المنتجات للاستهداف الديناميكي (DPA)",
  },
  {
    id: "pageView",
    name: "عرض الصفحات",
    code: "PageView",
    pixelKey: "pixelTrackPageView",
    capiKey: "capiTrackPageView",
    description: "تتبع عام لجميع زيارات الصفحات والمتجر",
  },
  {
    id: "search",
    name: "عمليات البحث",
    code: "Search",
    pixelKey: "pixelTrackSearch",
    capiKey: "capiTrackSearch",
    description: "تتبع الكلمات المفتاحية التي يبحث عنها العملاء داخل المتجر",
  },
  {
    id: "addToWishlist",
    name: "قائمة الرغبات",
    code: "AddToWishlist",
    pixelKey: "pixelTrackAddToWishlist",
    description: "حفظ المنتجات في المفضلة للشراء لاحقاً (Web Browser)",
  },
];

interface TrackingMatrixTableProps {
  settings: Partial<FacebookPixelSettings>;
  onChange: (updated: Partial<FacebookPixelSettings>) => void;
}

export const TrackingMatrixTable: React.FC<TrackingMatrixTableProps> = ({
  settings,
  onChange,
}) => {
  const handleEnableAll = () => {
    onChange({
      pixelTrackPageView: true,
      pixelTrackViewContent: true,
      pixelTrackAddToCart: true,
      pixelTrackInitiateCheckout: true,
      pixelTrackPurchase: true,
      pixelTrackSearch: true,
      pixelTrackAddToWishlist: true,
      capiTrackPageView: true,
      capiTrackViewContent: true,
      capiTrackAddToCart: true,
      capiTrackInitiateCheckout: true,
      capiTrackPurchase: true,
      capiTrackSearch: true,
    });
  };

  return (
    <section className="border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xs">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            مصفوفة تتبع الأحداث الهجينة (Hybrid Tracking Matrix)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            التحكم المتزامن بأحداث المتصفح والسيرفر مع ضمان منع التكرار (Deduplication)
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnableAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-all active:scale-[0.97]"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>تفعيل الإعدادات الموصى بها</span>
        </button>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 font-semibold">
              <th className="px-4 sm:px-6 py-3">الحدث والمعيار</th>
              <th className="px-4 sm:px-6 py-3 text-center">
                <div className="inline-flex items-center gap-1.5">
                  <GlobeAltIcon className="w-4 h-4 text-indigo-500" />
                  <span>متصفح الويب (Browser)</span>
                </div>
              </th>
              <th className="px-4 sm:px-6 py-3 text-center">
                <div className="inline-flex items-center gap-1.5">
                  <ServerStackIcon className="w-4 h-4 text-emerald-500" />
                  <span>السيرفر (CAPI)</span>
                </div>
              </th>
              <th className="px-4 sm:px-6 py-3 text-center hidden md:table-cell">
                فك الازدواجية
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {TRACKING_EVENTS.map((event) => {
              const isPixelOn = Boolean(settings[event.pixelKey]);
              const isCapiOn = event.capiKey ? Boolean(settings[event.capiKey]) : false;
              const isDeduplicated = isPixelOn && isCapiOn && Boolean(settings.eventDeduplicationEnabled);

              return (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Event Name & Spec */}
                  <td className="px-4 sm:px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                        {event.name}
                      </span>
                      <code
                        dir="ltr"
                        className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[11px] border border-gray-200/60 dark:border-gray-700/60"
                      >
                        {event.code}
                      </code>
                      {event.isHighValue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-semibold">
                          أولوية قصوى
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {event.description}
                    </p>
                  </td>

                  {/* Browser Pixel Switch */}
                  <td className="px-4 sm:px-6 py-3.5 text-center">
                    <label className="inline-flex items-center cursor-pointer justify-center">
                      <input
                        type="checkbox"
                        checked={isPixelOn}
                        onChange={(e) =>
                          onChange({ [event.pixelKey]: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 relative" />
                    </label>
                  </td>

                  {/* Server CAPI Switch */}
                  <td className="px-4 sm:px-6 py-3.5 text-center">
                    {event.capiKey ? (
                      <label className="inline-flex items-center cursor-pointer justify-center">
                        <input
                          type="checkbox"
                          checked={isCapiOn}
                          onChange={(e) =>
                            onChange({ [event.capiKey!]: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600 relative" />
                      </label>
                    ) : (
                      <span className="text-gray-400 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Deduplication Status */}
                  <td className="px-4 sm:px-6 py-3.5 text-center hidden md:table-cell">
                    {isDeduplicated ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                        <ShieldCheckIcon className="w-4 h-4" />
                        <span>event_id active</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-mono">
                        {isPixelOn || isCapiOn ? "أحادي القناة" : "معطل"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
