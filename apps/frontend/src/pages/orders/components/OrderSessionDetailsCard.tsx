import React, { useState } from "react";
import {
  GlobeAltIcon,
  MapPinIcon,
  ClockIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { OrderSessionDetailsData, CustomerFirstOrderInfo } from "../types";
import { useDateFormat } from "../../../hooks/useDateFormat";

interface OrderSessionDetailsCardProps {
  sessionDetails?: OrderSessionDetailsData | null;
  firstOrderInfo?: CustomerFirstOrderInfo | null;
  orderSource?: string;
  sourceType?: string;
  customerPhone?: string;
  createdAt?: string;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return "أقل من دقيقة";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} ثانية`;
  if (s === 0) return `${m} دقيقة`;
  return `${m} دقيقة و ${s} ثانية`;
};

const formatRelativeDays = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  } catch {
    return "";
  }
};

const EGYPTIAN_GOVERNORATES_EN_TO_AR: Record<string, string> = {
  cairo: "القاهرة",
  "al qahirah": "القاهرة",
  giza: "الجيزة",
  "al jizah": "الجيزة",
  alexandria: "الإسكندرية",
  "al iskandariyah": "الإسكندرية",
  dakahlia: "الدقهلية",
  "ad daqahliyah": "الدقهلية",
  mansoura: "الدقهلية",
  gharbia: "الغربية",
  "al gharbiyah": "الغربية",
  tanta: "الغربية",
  sharqia: "الشرقية",
  "ash sharqiyah": "الشرقية",
  zagazig: "الشرقية",
  qalyubia: "القليوبية",
  "al qalyubiyah": "القليوبية",
  banha: "القليوبية",
  beheira: "البحيرة",
  "al buhayrah": "البحيرة",
  damanhur: "البحيرة",
  monufia: "المنوفية",
  "al minufiyah": "المنوفية",
  damietta: "دمياط",
  dumyat: "دمياط",
  "port said": "بورسعيد",
  "bur said": "بورسعيد",
  ismailia: "الإسماعيلية",
  "al ismailiyah": "الإسماعيلية",
  suez: "السويس",
  "as suways": "السويس",
  fayoum: "الفيوم",
  "al fayyum": "الفيوم",
  "beni suef": "بني سويف",
  "bani suwayf": "بني سويف",
  minya: "المنيا",
  "al minya": "المنيا",
  asyut: "أسيوط",
  sohag: "سوهاج",
  suhaj: "سوهاج",
  qena: "قنا",
  qina: "قنا",
  luxor: "الأقصر",
  "al uqsur": "الأقصر",
  aswan: "أسوان",
  "red sea": "البحر الأحمر",
  "al bahr al ahmar": "البحر الأحمر",
  hurghada: "البحر الأحمر",
  "south sinai": "جنوب سيناء",
  "janub sina": "جنوب سيناء",
  "sharm el-sheikh": "جنوب سيناء",
  "north sinai": "شمال سيناء",
  "shamal sina": "شمال سيناء",
  matrouh: "مطروح",
  matruh: "مطروح",
  "new valley": "الوادي الجديد",
  "al wadi al jadid": "الوادي الجديد",
  "kafr el sheikh": "كفر الشيخ",
  "kafr ash shaykh": "كفر الشيخ",
  cai: "القاهرة",
  giz: "الجيزة",
  alx: "الإسكندرية",
  dk: "الدقهلية",
};

const COMMON_CITIES_EN_TO_AR: Record<string, string> = {
  "al mansurah": "المنصورة",
  mansoura: "المنصورة",
  tanta: "طنطا",
  zagazig: "الزقازيق",
  damanhur: "دمنهور",
  banha: "بنها",
  "sharm el-sheikh": "شرم الشيخ",
  hurghada: "الغردقة",
  cairo: "القاهرة",
  giza: "الجيزة",
  alexandria: "الإسكندرية",
};

const formatLocationPart = (val?: string | null): string => {
  if (!val || typeof val !== "string") return "";
  const clean = val.toLowerCase().trim();
  return EGYPTIAN_GOVERNORATES_EN_TO_AR[clean] || COMMON_CITIES_EN_TO_AR[clean] || val;
};

export const OrderSessionDetailsCard: React.FC<OrderSessionDetailsCardProps> = ({
  sessionDetails,
  firstOrderInfo,
  orderSource,
  sourceType,
  createdAt,
}) => {
  const { formatDate, formatDateTime } = useDateFormat();
  const [copiedIp, setCopiedIp] = useState(false);

  const ip = sessionDetails?.ip;
  const governorate = sessionDetails?.ipGovernorate;
  const city = sessionDetails?.ipCity;
  const country = sessionDetails?.ipCountry;
  const pagesVisited = sessionDetails?.pagesVisited || [];
  const durationSeconds = sessionDetails?.durationSeconds;
  const sessionCount = sessionDetails?.sessionCount;
  const firstSeenAt = sessionDetails?.firstSeenAt;

  const isManualOrder =
    sourceType === "manual" ||
    orderSource === "MANUAL" ||
    (!sessionDetails && !ip);

  const handleCopyIp = () => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const normalizedGov = formatLocationPart(governorate);
  const normalizedCity = formatLocationPart(city);
  const locationDisplay = [normalizedGov, normalizedCity]
    .filter(Boolean)
    .filter((item, idx, arr) => arr.indexOf(item) === idx)
    .join(" - ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <GlobeAltIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              تفاصيل الجلسة
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              الموقع الجغرافي للـ IP ورحلة التصفح
            </p>
          </div>
        </div>

        {firstOrderInfo?.isFirstOrder ? (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            عميل جديد
          </span>
        ) : firstOrderInfo && firstOrderInfo.totalOrdersCount > 1 ? (
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            عميل متكرر ({firstOrderInfo.totalOrdersCount} طلبات)
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 text-xs">
        {/* IP & Location */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
              <MapPinIcon className="h-4 w-4 text-blue-500" />
              <span>عنوان الـ IP والموقع الجغرافي</span>
            </div>
            {ip && (
              <button
                type="button"
                onClick={handleCopyIp}
                className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="نسخ عنوان IP"
              >
                {copiedIp ? (
                  <>
                    <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                    <span>نسخ IP</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">IP العميل:</span>
              <div className="mt-0.5 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200 dir-ltr text-right">
                {ip || (isManualOrder ? "طلب يدوي (بدون IP)" : "غير محدد")}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">الموقع من الـ IP:</span>
              <div className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">
                {locationDisplay ? (
                  <span>
                    {locationDisplay} {country ? `(${country})` : ""}
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal">
                    {ip ? "جارٍ التحديد / غير متاح" : "غير متاح"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics: Duration, Session Count, First Seen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Time spent */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-700/60 dark:bg-gray-900/20">
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <ClockIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>وقت الشراء</span>
            </div>
            <div className="mt-1 font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
              {formatDuration(durationSeconds)}
            </div>
          </div>

          {/* Session count */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-700/60 dark:bg-gray-900/20">
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <CalendarDaysIcon className="h-3.5 w-3.5 text-sky-500" />
              <span>عدد الجلسات</span>
            </div>
            <div className="mt-1 font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
              {sessionCount && sessionCount > 1
                ? `${sessionCount} جلسات`
                : "الجلسة الأولى"}
            </div>
          </div>

          {/* First visit date */}
          <div className="col-span-2 sm:col-span-1 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-700/60 dark:bg-gray-900/20">
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <ClockIcon className="h-3.5 w-3.5 text-teal-500" />
              <span>أول زيارة للمتجر</span>
            </div>
            <div className="mt-1 font-semibold text-gray-800 dark:text-gray-200">
              {firstSeenAt ? (
                <div>
                  <span className="tabular-nums">{formatDate(firstSeenAt)}</span>
                  <span className="text-[10px] font-normal text-gray-400 mr-1">
                    ({formatRelativeDays(firstSeenAt)})
                  </span>
                </div>
              ) : createdAt ? (
                <div>
                  <span className="tabular-nums">{formatDate(createdAt)}</span>
                </div>
              ) : (
                "غير محدد"
              )}
            </div>
          </div>
        </div>

        {/* Customer First Order Info */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/20">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
            <ShoppingBagIcon className="h-4 w-4 text-emerald-500" />
            <span>سجل طلبات العميل (أول طلب)</span>
          </div>

          <div className="mt-2 text-xs">
            {firstOrderInfo?.isFirstOrder ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>هذا هو أول طلب للعميل على المتجر (عميل جديد).</span>
              </div>
            ) : firstOrderInfo?.firstOrderAt ? (
              <div className="space-y-1 text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">تاريخ أول طلب:</span>
                  <span className="font-semibold tabular-nums">
                    {formatDateTime(firstOrderInfo.firstOrderAt)}
                  </span>
                </div>
                {firstOrderInfo.firstOrderNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">رقم أول طلب:</span>
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      #{firstOrderInfo.firstOrderNumber}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">إجمالي الطلبات السابقة:</span>
                  <span className="font-bold tabular-nums">
                    {firstOrderInfo.totalOrdersCount} طلبات
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                لا توجد بيانات سابقة مسجلة لهذا العميل.
              </div>
            )}
          </div>
        </div>

        {/* Visited Pages Timeline */}
        {pagesVisited.length > 0 && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700/60 dark:bg-gray-900/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
                <LinkIcon className="h-4 w-4 text-purple-500" />
                <span>رحلة التصفح ({pagesVisited.length} صفحات)</span>
              </div>
              <span className="text-[10px] text-gray-400">مرتبة زمنياً</span>
            </div>

            <ol className="relative border-r border-gray-200 dark:border-gray-700 mr-2 space-y-2 mt-2">
              {pagesVisited.map((page, idx) => {
                const timeStr = page.timestamp
                  ? new Date(page.timestamp).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "";

                return (
                  <li key={idx} className="mr-3">
                    <span className="absolute -right-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-gray-800"></span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {page.title || page.path}
                      </span>
                      {timeStr && (
                        <span className="font-mono text-[10px] text-gray-400 shrink-0 tabular-nums">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-gray-400 truncate dir-ltr text-right">
                      {page.path}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSessionDetailsCard;
