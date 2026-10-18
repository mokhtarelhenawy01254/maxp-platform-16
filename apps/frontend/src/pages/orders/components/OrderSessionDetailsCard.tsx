import React, { useMemo } from "react";
import { Globe } from "lucide-react";
import type { OrderSessionDetailsData, CustomerFirstOrderInfo } from "../types";
import { formatLocationPart } from "../utils/locationNames";
import { SessionIpLocationSection } from "./session-card/SessionIpLocationSection";
import { SessionTelemetrySection } from "./session-card/SessionTelemetrySection";
import { SessionFirstOrderSection } from "./session-card/SessionFirstOrderSection";
import { SessionPagesVisitedTimeline } from "./session-card/SessionPagesVisitedTimeline";

export interface OrderSessionDetailsCardProps {
  sessionDetails?: OrderSessionDetailsData | null;
  firstOrderInfo?: CustomerFirstOrderInfo | null;
  orderSource?: string;
  sourceType?: string;
  customerPhone?: string;
  createdAt?: string;
  orderGovernorate?: string | null;
  orderCity?: string | null;
}

export const OrderSessionDetailsCard: React.FC<OrderSessionDetailsCardProps> = ({
  sessionDetails,
  firstOrderInfo,
  orderSource,
  sourceType,
  createdAt,
  orderGovernorate,
  orderCity,
}) => {
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

  const { finalLocationDisplay, hasValidIpLocation, isLocationFromShipping } = useMemo(() => {
    const normalizedGov = formatLocationPart(governorate);
    const normalizedCity = formatLocationPart(city);
    const ipLocation = [normalizedGov, normalizedCity]
      .filter(Boolean)
      .filter((v) => v !== "محلي" && v !== "محلي (تطوير)")
      .filter((item, idx, arr) => arr.indexOf(item) === idx)
      .join(" - ");

    const validIp = Boolean(
      ipLocation &&
      !ipLocation.includes("محلي") &&
      !isLocalIp
    );

    const fallbackGov = formatLocationPart(orderGovernorate);
    const fallbackCity = formatLocationPart(orderCity);
    const shippingLoc = [fallbackGov, fallbackCity]
      .filter(Boolean)
      .filter((v) => v !== "محلي" && v !== "محلي (تطوير)")
      .filter((item, idx, arr) => arr.indexOf(item) === idx)
      .join(" - ");

    return {
      finalLocationDisplay: validIp ? ipLocation : shippingLoc,
      hasValidIpLocation: validIp,
      isLocationFromShipping: !validIp && Boolean(shippingLoc),
    };
  }, [governorate, city, isLocalIp, orderGovernorate, orderCity]);

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
        <SessionIpLocationSection
          ip={ip}
          rawIp={rawIp}
          isLocalIp={isLocalIp}
          isManualOrder={isManualOrder}
          finalLocationDisplay={finalLocationDisplay}
          hasValidIpLocation={hasValidIpLocation}
          country={country}
          isLocationFromShipping={isLocationFromShipping}
        />

        {/* Telemetry Metrics: Duration, Session Count, First Seen */}
        <SessionTelemetrySection
          durationSeconds={durationSeconds}
          sessionCount={sessionCount}
          firstSeenAt={firstSeenAt}
          createdAt={createdAt}
        />

        {/* Customer First Order Info */}
        <SessionFirstOrderSection firstOrderInfo={firstOrderInfo} />

        {/* Visited Pages Timeline */}
        <SessionPagesVisitedTimeline pagesVisited={pagesVisited} />
      </div>
    </div>
  );
};

export default OrderSessionDetailsCard;
