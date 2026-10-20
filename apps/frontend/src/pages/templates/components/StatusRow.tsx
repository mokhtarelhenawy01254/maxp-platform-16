import React from "react";
import { useTranslation } from "react-i18next";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import type { EventRow, DeliveryPreviewItem, TemplateSlot, Template } from "../types";
import { StatusTemplateSlot } from "./StatusTemplateSlot";

export interface StatusRowProps {
  status: EventRow;
  deliveryPreview: Record<string, DeliveryPreviewItem>;
  isRegularPreviewExpanded: boolean;
  isMetaPreviewExpanded: boolean;
  isMobile: boolean;
  togglingId: string | null;
  onTogglePreview: (slot: TemplateSlot) => void;
  onToggleNotify: (status: EventRow) => void;
  onOpenEdit: (status: EventRow, slot?: TemplateSlot) => void;
  onOpenCreate: (status: EventRow, slot: TemplateSlot) => void;
  onOpenSwitch: (status: EventRow) => void;
  onUnbindMeta: (status: EventRow) => void;
  sampleVariables?: Record<string, string>;
  enableMetaSwitch?: boolean;
}

export function readableTextColor(hex: string): string {
  let c = (hex || "#6B7280").replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (c.length === 4) c = c.slice(0, 3).split("").map((ch) => ch + ch).join("");
  if (c.length === 8) c = c.slice(0, 6);
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff";
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? "#0f172a" : "#ffffff";
}

export function getMetaSlotTemplate(status: EventRow): Template | null {
  if (status.metaTemplate) return status.metaTemplate;
  if (status.template?.metaTemplateName && String(status.template.channel || "").toUpperCase() !== "META_CLOUD") {
    return status.template;
  }
  return null;
}

export function metaSlotIsLegacy(status: EventRow): boolean {
  return !status.metaTemplate && !!status.template?.metaTemplateName;
}

export const StatusRow: React.FC<StatusRowProps> = ({
  status,
  deliveryPreview,
  isRegularPreviewExpanded,
  isMetaPreviewExpanded,
  isMobile,
  togglingId,
  onTogglePreview,
  onToggleNotify,
  onOpenEdit,
  onOpenCreate,
  onOpenSwitch,
  onUnbindMeta,
  sampleVariables,
  enableMetaSwitch = true,
}) => {
  const { t } = useTranslation();
  const regular = status.template;
  const meta = getMetaSlotTemplate(status);
  const previewEventType = status.template?.eventType || status.metaTemplate?.eventType;
  const p = previewEventType ? deliveryPreview[previewEventType] : undefined;

  const deliveryColors = {
    none: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const deliveryStatusText = { none: "سليم", warning: "تنبيه", danger: "حرج" };

  return (
    <div
      data-testid={`status-row-${status.id}`}
      className="group rounded-lg border border-slate-200/70 bg-white p-3.5 transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
            style={{ backgroundColor: status.color || "#6B7280", color: readableTextColor(status.color || "#6B7280") }}
            title={status.name}
          >
            {status.name.trim().slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {status.name}
              </span>
              {status.isSystemStatus && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t("orders.system", "نظامي")}
                </span>
              )}
              {status.statusType && status.statusType !== "order" && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  {status.statusType === "preparation" ? "تجهيز" : status.statusType === "shipping" ? "شحن" : status.statusType === "payment" ? "دفع" : status.statusType === "incomplete" ? "غير مكتمل" : status.statusType}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono">{status.code}</span>
              <button
                onClick={() => onToggleNotify(status)}
                disabled={togglingId === status.id}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                  status.notifyCustomer
                    ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {togglingId === status.id ? (
                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : status.notifyCustomer ? (
                  <BellIcon className="h-3 w-3" />
                ) : (
                  <BellSlashIcon className="h-3 w-3" />
                )}
                {status.notifyCustomer ? "مفعل" : "متوقف"}
              </button>
            </div>
          </div>
        </div>

        {p && (p.riskLevel === "warning" || p.riskLevel === "danger") ? (
          <button
            onClick={() => onOpenEdit(status, "meta")}
            title={p.message}
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition hover:opacity-80 ${deliveryColors[p.riskLevel]}`}
          >
            <span>[{deliveryStatusText[p.riskLevel]}]</span>
            <span>اربط بقالب ميتا</span>
          </button>
        ) : p ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${deliveryColors[p.riskLevel]}`}
            title={p.message}
          >
            <span>[{deliveryStatusText[p.riskLevel]}]</span>
            {!isMobile && (p.message.length > 40 ? `${p.message.substring(0, 40)}…` : p.message)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <StatusTemplateSlot
          slot="regular"
          template={regular}
          status={status}
          isPreviewExpanded={isRegularPreviewExpanded}
          onTogglePreview={() => onTogglePreview("regular")}
          onEdit={() => onOpenEdit(status, "regular")}
          onCreate={() => onOpenCreate(status, "regular")}
          sampleVariables={sampleVariables}
        />
        {enableMetaSwitch && (
          <StatusTemplateSlot
            slot="meta"
            template={meta}
            status={status}
            isLegacy={metaSlotIsLegacy(status)}
            isPreviewExpanded={isMetaPreviewExpanded}
            onTogglePreview={() => onTogglePreview("meta")}
            onEdit={() => onOpenEdit(status, "meta")}
            onCreate={() => onOpenCreate(status, "meta")}
            onSwitch={() => onOpenSwitch(status)}
            onUnbind={meta ? () => onUnbindMeta(status) : undefined}
            sampleVariables={sampleVariables}
          />
        )}
      </div>
    </div>
  );
};

export default StatusRow;
