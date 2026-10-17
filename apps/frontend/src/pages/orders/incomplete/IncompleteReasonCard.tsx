import React from "react";
import type { TFunction } from "i18next";
import { HelpCircle } from "lucide-react";
import { AbandonReason, getAbandonReasonLabel } from "../incompleteUtils";

export const CHECKOUT_FIELD_LABELS: Record<string, string> = {
  governorate: "orders.governorate",
  city: "orders.city",
  address: "orders.address",
  street: "orders.address",
  addressLine1: "orders.address",
  notes: "orders.notes",
  orderNotes: "orders.notes",
  paymentMethod: "orders.paymentMethod",
  shippingAddress: "orders.shippingAddress",
};

export const CHECKOUT_HIDDEN_KEYS = new Set([
  "guestName", "name", "customerName", "customerFullName", "fullName",
  "guestPhone", "phone", "customerPhone", "phoneNumber", "mobileNumber", "mobile",
  "guestEmail", "email", "customerEmail", "emailAddress",
  "attribution", "campaignAttribution", "orderAttribution",
]);

export const humanizeKey = (key: string) => {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const getFieldLabel = (key: string, t: TFunction) => {
  const labelKey = CHECKOUT_FIELD_LABELS[key];
  if (labelKey) {
    const translated = t(labelKey);
    if (translated && translated !== labelKey) return translated;
  }
  return humanizeKey(key);
};

interface IncompleteReasonCardProps {
  reason: AbandonReason;
  t: TFunction;
}

export const IncompleteReasonCard: React.FC<IncompleteReasonCardProps> = ({
  reason,
  t,
}) => {
  const missingFields =
    reason.code === "partial_shipping" ? reason.evidence ?? [] : [];

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs">
      <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
        <HelpCircle className="h-4 w-4 text-amber-500" />
        <span>{t("orders.incompleteReasonTitle") || "سبب ترك السلة المحتمل"}</span>
      </h2>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          {getAbandonReasonLabel(reason, t)}
        </span>
        {missingFields.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">
              {t("orders.incompleteReasonMissingFields") || "حقول غير مكتملة:"}
            </span>
            {missingFields.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-md border border-border/70 bg-card px-2 py-0.5 text-xs text-foreground"
              >
                {getFieldLabel(key, t)}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
};
