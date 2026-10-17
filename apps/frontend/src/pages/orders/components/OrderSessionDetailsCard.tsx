import React, { useState } from "react";
import {
  Globe,
  MapPin,
  Clock,
  ShoppingBag,
  Calendar,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import { OrderSessionDetailsData, CustomerFirstOrderInfo } from "../types";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { formatLocationPart } from "../utils/locationNames";

interface OrderSessionDetailsCardProps {
  sessionDetails?: OrderSessionDetailsData | null;
  firstOrderInfo?: CustomerFirstOrderInfo | null;
  orderSource?: string;
  sourceType?: string;
  customerPhone?: string;
  createdAt?: string;
  orderGovernorate?: string | null;
  orderCity?: string | null;
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

export const OrderSessionDetailsCard: React.FC<OrderSessionDetailsCardProps> = ({
  sessionDetails,
  firstOrderInfo,
  orderSource,
  sourceType,
  createdAt,
  orderGovernorate,
  orderCity,
}) => {
  const { formatDate, formatDateTime } = useDateFormat();
  const [copiedIp, setCopiedIp] = useState(false);

  const rawIp = sessionDetails?.ip;
  const isLocalIp =
    rawIp === "127.0.0.1" ||
    rawIp === "::1" ||
    rawIp === "localhost" ||
    String(rawIp || "").startsWith("192.168.") ||
    String(rawIp || "").startsWith("10.");

  const ip = isLocalIp ? null : rawIp;
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
    (!sessionDetails && !rawIp);

  const handleCopyIp = () => {
    const copyTarget = ip || rawIp;
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const normalizedGov = formatLocationPart(governorate);
  const normalizedCity = formatLocationPart(city);
  const ipLocationDisplay = [normalizedGov, normalizedCity]
    .filter(Boolean)
    .filter((v) => v !== "محلي" && v !== "محلي (تطوير)")
    .filter((item, idx, arr) => arr.indexOf(item) === idx)
    .join(" - ");

  const hasValidIpLocation = Boolean(
    ipLocationDisplay &&
    !ipLocationDisplay.includes("محلي") &&
    !isLocalIp
  );

  const fallbackGov = formatLocationPart(orderGovernorate);
  const fallbackCity = formatLocationPart(orderCity);
  const shippingLocationDisplay = [fallbackGov, fallbackCity]
    .filter(Boolean)
    .filter((v) => v !== "محلي" && v !== "محلي (تطوير)")
    .filter((item, idx, arr) => arr.indexOf(item) === idx)
    .join(" - ");

  const finalLocationDisplay = hasValidIpLocation
    ? ipLocationDisplay
    : shippingLocationDisplay;

  const isLocationFromShipping = !hasValidIpLocation && Boolean(shippingLocationDisplay);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              تفاصيل الجلسة
            </h2>
            <p className="text-[11px] text-muted-foreground">
              الموقع الجغرافي للـ IP ورحلة التصفح
            </p>
          </div>
        </div>

        {firstOrderInfo?.isFirstOrder ? (
          <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            عميل جديد
          </span>
        ) : firstOrderInfo && firstOrderInfo.totalOrdersCount > 1 ? (
          <span className="inline-flex items-center rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-indigo-600 dark:text-indigo-400">
            عميل متكرر ({firstOrderInfo.totalOrdersCount} طلبات)
          </span>
        ) : null}
      </div>

      <div className="mt-3.5 space-y-3 text-xs">
        {/* IP & Location */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>عنوان الـ IP والموقع الجغرافي</span>
            </div>
            {(ip || isLocalIp) && (
              <button
                type="button"
                onClick={handleCopyIp}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                title="نسخ عنوان IP"
              >
                {copiedIp ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>نسخ IP</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-muted-foreground">IP العميل:</span>
              <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-foreground dir-ltr text-right">
                {ip ? (
                  ip
                ) : isLocalIp ? (
                  <span className="text-muted-foreground font-normal">شبكة داخلية / محلي</span>
                ) : isManualOrder ? (
                  "طلب يدوي (بدون IP)"
                ) : (
                  "غير محدد"
                )}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground">
                {isLocationFromShipping ? "الموقع (من عنوان الشحن):" : "الموقع من الـ IP:"}
              </span>
              <div className="mt-0.5 font-semibold text-foreground">
                {finalLocationDisplay ? (
                  <span>
                    {finalLocationDisplay}
                    {hasValidIpLocation && country ? ` (${country})` : ""}
                    {isLocationFromShipping ? (
                      <span className="text-[10px] font-normal text-muted-foreground mr-1.5">(من بيانات الشحن)</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal">
                    {rawIp ? "جارٍ التحديد / غير متاح" : "غير متاح"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics: Duration, Session Count, First Seen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Time spent */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span>وقت الشراء</span>
            </div>
            <div className="mt-1 font-mono font-semibold tabular-nums text-foreground">
              {formatDuration(durationSeconds)}
            </div>
          </div>

          {/* Session count */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              <span>عدد الجلسات</span>
            </div>
            <div className="mt-1 font-mono font-semibold tabular-nums text-foreground">
              {sessionCount && sessionCount > 1
                ? `${sessionCount} جلسات`
                : "الجلسة الأولى"}
            </div>
          </div>

          {/* First visit date */}
          <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-teal-500" />
              <span>أول زيارة للمتجر</span>
            </div>
            <div className="mt-1 font-semibold text-foreground">
              {firstSeenAt ? (
                <div>
                  <span className="font-mono tabular-nums">{formatDate(firstSeenAt)}</span>
                  <span className="text-[10px] font-normal text-muted-foreground mr-1">
                    ({formatRelativeDays(firstSeenAt)})
                  </span>
                </div>
              ) : createdAt ? (
                <div>
                  <span className="font-mono tabular-nums">{formatDate(createdAt)}</span>
                </div>
              ) : (
                "غير محدد"
              )}
            </div>
          </div>
        </div>

        {/* Customer First Order Info */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
            <span>سجل طلبات العميل (أول طلب)</span>
          </div>

          <div className="mt-2 text-xs">
            {firstOrderInfo?.isFirstOrder ? (
              <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>هذا هو أول طلب للعميل على المتجر (عميل جديد).</span>
              </div>
            ) : firstOrderInfo?.firstOrderAt ? (
              <div className="space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">تاريخ أول طلب:</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatDateTime(firstOrderInfo.firstOrderAt)}
                  </span>
                </div>
                {firstOrderInfo.firstOrderNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">رقم أول طلب:</span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                      #{firstOrderInfo.firstOrderNumber}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">إجمالي الطلبات السابقة:</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {firstOrderInfo.totalOrdersCount} طلبات
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                لا توجد بيانات سابقة مسجلة لهذا العميل.
              </div>
            )}
          </div>
        </div>

        {/* Visited Pages Timeline */}
        {pagesVisited.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Link2 className="h-3.5 w-3.5 text-purple-500" />
                <span>رحلة التصفح ({pagesVisited.length} صفحات)</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">مرتبة زمنياً</span>
            </div>

            <ol className="relative mr-2 space-y-2 mt-2 border-r border-border/60">
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
                    <span className="absolute -right-1 mt-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">
                        {page.title || page.path}
                      </span>
                      {timeStr && (
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate dir-ltr text-right">
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
