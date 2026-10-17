import React from "react";
import { useTranslation } from "react-i18next";
import { Truck, FileDown, X, Plus, RefreshCw, ExternalLink } from "lucide-react";

interface BostaShippingPanelProps {
  order: any;
  bostaShipment: any;
  bostaLoading: boolean;
  onCreateShipment: () => void;
  onPrintAWB: () => void;
  onCancelShipment: () => void;
  canManageShipments?: boolean;
}

const BostaShippingPanel: React.FC<BostaShippingPanelProps> = ({
  order,
  bostaShipment,
  bostaLoading,
  onCreateShipment,
  onPrintAWB,
  onCancelShipment,
  canManageShipments = true,
}) => {
  const { t } = useTranslation();
  const hasShipment = Boolean(bostaShipment);
  const trackingNumber = bostaShipment?.trackingNumber || order?.bostaTrackingNumber;
  const status = bostaShipment?.status || order?.bostaShipmentStatus;

  const getStatusText = (s?: string) => {
    if (!s) return t("bosta.notAvailable");
    const m: Record<string, string> = {
      PENDING: t("bosta.statuses.PENDING"),
      CREATED: t("bosta.statuses.CREATED"),
      CONFIRMED: t("bosta.statuses.CONFIRMED"),
      PROCESSING: t("bosta.statuses.PROCESSING"),
      IN_TRANSIT: t("bosta.statuses.IN_TRANSIT"),
      OUT_FOR_DELIVERY: t("bosta.statuses.OUT_FOR_DELIVERY"),
      DELIVERED: t("bosta.statuses.DELIVERED"),
      CANCELLED: t("bosta.statuses.CANCELLED"),
      RETURNED: t("bosta.statuses.RETURNED"),
      FAILED_DELIVERY: t("bosta.statuses.FAILED_DELIVERY"),
      ON_HOLD: t("bosta.statuses.ON_HOLD"),
    };
    return m[s] || s;
  };

  const getStatusBadge = (s?: string) => {
    if (!s) return "border-border/60 bg-muted/30 text-muted-foreground";
    if (s === "DELIVERED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (s === "CANCELLED" || s === "RETURNED") return "border-destructive/20 bg-destructive/10 text-destructive";
    if (s === "PROCESSING" || s === "IN_TRANSIT" || s === "OUT_FOR_DELIVERY" || s === "CONFIRMED") {
      return "border-primary/20 bg-primary/10 text-primary";
    }
    return "border-border/60 bg-muted/30 text-muted-foreground";
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Truck className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("bosta.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            ربط وتتبع شحنة بوسطة
          </p>
        </div>
      </div>

      {hasShipment ? (
        <div className="space-y-3.5">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t("bosta.trackingNumber")}</span>
                <span className="text-xs font-bold font-mono tabular-nums text-foreground">{trackingNumber || t("bosta.notAvailable")}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t("bosta.status")}</span>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadge(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageShipments && (
              <button
                type="button"
                onClick={onPrintAWB}
                disabled={bostaLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>{t("bosta.printWaybill")}</span>
              </button>
            )}
            {canManageShipments && status !== "CANCELLED" && status !== "DELIVERED" && (
              <button
                type="button"
                onClick={onCancelShipment}
                disabled={bostaLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/15 active:scale-[0.97] disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                <span>{t("bosta.cancelShipment")}</span>
              </button>
            )}
            {trackingNumber && (
              <a
                href={"https://track.bosta.co/" + trackingNumber}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/15 active:scale-[0.97]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{t("bosta.trackOnBosta")}</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-5">
          <p className="text-xs text-muted-foreground mb-3">{t("bosta.noShipment")}</p>
          {canManageShipments ? (
            <>
              <button
                type="button"
                onClick={onCreateShipment}
                disabled={bostaLoading || order?.status !== "CONFIRMED"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bostaLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("bosta.creating")}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t("bosta.createShipment")}</span>
                  </>
                )}
              </button>
              {order?.status !== "CONFIRMED" && (
                <p className="text-[11px] text-muted-foreground mt-2">{t("bosta.orderMustBeConfirmed")}</p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">{t("bosta.shippingAccessRestricted")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BostaShippingPanel;
