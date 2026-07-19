import React from "react";
import {
  GlobeAltIcon,
  HashtagIcon,
  LinkIcon,
  MegaphoneIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { OrderAttributionData, OrderDetailsType } from "../types";

interface OrderAttributionCardProps {
  order: OrderDetailsType;
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
      className={`break-all text-sm text-blue-600 hover:underline dark:text-blue-400 ${mono ? "font-mono" : ""}`}
    >
      {value}
    </a>
  ) : (
    <span className={`break-all text-sm text-gray-900 dark:text-gray-100 ${mono ? "font-mono" : ""}`}>
      {value}
    </span>
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/10">
      <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
        {content}
      </div>
    </div>
  );
};

const OrderAttributionCard: React.FC<OrderAttributionCardProps> = ({ order }) => {
  const { formatDateTime } = useDateFormat();
  const attribution = parseAttribution(order.metadata?.attribution);
  const sourceMedium = [attribution?.source, attribution?.medium].filter(Boolean).join(" / ");
  const campaignLabel = attribution?.campaignName || attribution?.campaignId;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
          <MegaphoneIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            بيانات الحملة
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            المصدر الإعلاني والربط التسويقي للطلب
          </p>
        </div>
      </div>

      {!attribution ? (
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          لا توجد بيانات حملة محفوظة لهذا الطلب. ستظهر هنا الطلبات الجديدة القادمة من روابط
          معلّمة أو بعد تفعيل الالتقاط الجديد.
        </p>
      ) : (
        <div className="space-y-3">
          {(campaignLabel || attribution.platform || sourceMedium) && (
            <div className="flex flex-wrap gap-2">
              {campaignLabel && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {campaignLabel}
                </span>
              )}
              {attribution.platform && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  {attribution.platform}
                </span>
              )}
              {sourceMedium && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {sourceMedium}
                </span>
              )}
            </div>
          )}

          <DetailRow
            icon={<GlobeAltIcon />}
            label="المصدر / الوسيط"
            value={sourceMedium}
          />
          <DetailRow
            icon={<MegaphoneIcon />}
            label="اسم الحملة"
            value={attribution.campaignName}
          />
          <DetailRow
            icon={<HashtagIcon />}
            label="رقم الحملة"
            value={attribution.campaignId}
            mono
          />
          <DetailRow
            icon={<HashtagIcon />}
            label="Ad Set ID"
            value={attribution.adSetId}
            mono
          />
          <DetailRow
            icon={<HashtagIcon />}
            label="Ad ID"
            value={attribution.adId}
            mono
          />
          <DetailRow
            icon={<LinkIcon />}
            label="صفحة الهبوط"
            value={attribution.landingPath}
            mono
          />
          <DetailRow
            icon={<LinkIcon />}
            label="Referrer"
            value={attribution.referrer}
            href={attribution.referrer}
          />
          <DetailRow
            icon={<ClockIcon />}
            label="وقت الالتقاط"
            value={attribution.capturedAt ? formatDateTime(attribution.capturedAt) : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default OrderAttributionCard;
