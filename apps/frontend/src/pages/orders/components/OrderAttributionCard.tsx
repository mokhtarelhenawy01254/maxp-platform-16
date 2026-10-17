import React from "react";
import {
  Globe,
  Hash,
  Link2,
  Megaphone,
  Clock,
} from "lucide-react";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { OrderAttributionData, OrderDetailsType } from "../types";

interface OrderAttributionCardProps {
  order: Pick<OrderDetailsType, "metadata">;
}

const parseAttribution = (value: unknown): OrderAttributionData | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as OrderAttributionData) : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object" ? (value as OrderAttributionData) : null;
};

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
  href?: string;
}> = ({ icon, label, value, mono = false, href }) => {
  if (!value) {
    return null;
  }

  const content = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`break-all text-sm font-medium text-primary hover:underline ${mono ? "font-mono tabular-nums" : ""}`}
    >
      {value}
    </a>
  ) : (
    <span className={`break-all text-sm font-medium text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>
      {value}
    </span>
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:p-3">
      <div className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
        {content}
      </div>
    </div>
  );
};

const OrderAttributionCard: React.FC<OrderAttributionCardProps> = ({ order }) => {
  const { formatDateTime } = useDateFormat();
  const attribution = parseAttribution(order.metadata?.attribution);
  const sourceLabel = (value?: string) => {
    if (!value) return undefined;
    return value === "audience_network" || value === "audience-network"
      ? "Audience Network"
      : value;
  };
  const sourceMedium = [sourceLabel(attribution?.source), attribution?.medium]
    .filter(Boolean)
    .join(" / ");
  const campaignLabel = attribution?.campaignName || attribution?.campaignId;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Megaphone className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            بيانات الحملة
          </h3>
          <p className="text-xs text-muted-foreground">
            المصدر الإعلاني والربط التسويقي للطلب
          </p>
        </div>
      </div>

      {!attribution ? (
        <p className="text-xs leading-5 text-muted-foreground">
          لا توجد بيانات حملة محفوظة لهذا الطلب. ستظهر هنا الطلبات الجديدة القادمة من روابط
          معلّمة أو بعد تفعيل الالتقاط الجديد.
        </p>
      ) : (
        <div className="space-y-2.5">
          {(campaignLabel || attribution.platform || sourceMedium) && (
            <div className="flex flex-wrap gap-1.5">
              {campaignLabel && (
                <span className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {campaignLabel}
                </span>
              )}
              {attribution.platform && (
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {attribution.platform}
                </span>
              )}
              {sourceMedium && (
                <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {sourceMedium}
                </span>
              )}
            </div>
          )}

          <DetailRow
            icon={<Globe className="h-4 w-4" />}
            label="المصدر / الوسيط"
            value={sourceMedium}
          />
          <DetailRow
            icon={<Megaphone className="h-4 w-4" />}
            label="اسم الحملة"
            value={attribution.campaignName}
          />
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label="رقم الحملة"
            value={attribution.campaignId}
            mono
          />
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label="Ad Set ID"
            value={attribution.adSetId}
            mono
          />
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label="Ad ID"
            value={attribution.adId}
            mono
          />
          <DetailRow
            icon={<Link2 className="h-4 w-4" />}
            label="صفحة الهبوط"
            value={attribution.landingPath}
            mono
          />
          <DetailRow
            icon={<Link2 className="h-4 w-4" />}
            label="Referrer"
            value={attribution.referrer}
            href={attribution.referrer}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="وقت الالتقاط"
            value={attribution.capturedAt ? formatDateTime(attribution.capturedAt) : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default OrderAttributionCard;

