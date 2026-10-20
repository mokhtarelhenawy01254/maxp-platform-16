import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type { LabelItem, Session } from "../types/whatsAppSettingsTypes";
import {
  EmptyScopedSessionAlert,
  SessionScopeSelector,
} from "../utils/whatsAppSettingsUtils";

interface WhatsAppLabelsTabProps {
  connectedSessions: Session[];
  scopedSessionId: string;
  onScopedSessionChange: (id: string) => void;
  labels: LabelItem[];
  loadingLabels: boolean;
  restoringLabels: boolean;
  onOpenCreateLabel: () => void;
  onRestoreDefaultLabels: () => void;
  onOpenLabelContacts: (label: LabelItem) => void;
  onDeleteLabel: (label: LabelItem) => void;
}

export const WhatsAppLabelsTab: React.FC<WhatsAppLabelsTabProps> = ({
  connectedSessions,
  scopedSessionId,
  onScopedSessionChange,
  labels,
  loadingLabels,
  restoringLabels,
  onOpenCreateLabel,
  onRestoreDefaultLabels,
  onOpenLabelContacts,
  onDeleteLabel,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <WhatsAppSurfaceCard
      title={ts("whatsappSettings.manageLabels")}
      description={ts("whatsappSettings.manageLabels")}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={onScopedSessionChange}
          />
          <Button
            className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
            onClick={onOpenCreateLabel}
            disabled={!scopedSessionId}
          >
            <Plus className="size-4" />
            {t("whatsappSettings.addLabel")}
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)]"
            onClick={onRestoreDefaultLabels}
            disabled={!scopedSessionId || restoringLabels}
          >
            <RefreshCw
              className={`size-4 ${restoringLabels ? "animate-spin" : ""}`}
            />
            {restoringLabels ? "جاري الاستعادة..." : "استعادة التصنيفات"}
          </Button>
        </div>
      }
    >
      {connectedSessions.length === 0 ? (
        <EmptyScopedSessionAlert
          title={t("whatsappSettings.selectSession")}
          message={t("whatsappSettings.noLabels")}
        />
      ) : loadingLabels ? (
        <Skeleton className="h-72 rounded-3xl" />
      ) : labels.length === 0 ? (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappSettings.labels")}</AlertTitle>
          <AlertDescription>{t("whatsappSettings.noLabels")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="group flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-primary)_6%,white)]"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                onClick={() => onOpenLabelContacts(label)}
              >
                <span
                  className="inline-flex size-5 shrink-0 rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                  style={{ backgroundColor: label.color || "#25D366" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--color-foreground)] group-hover:text-[color:var(--color-primary)]">
                    {label.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-[color:var(--color-muted-foreground)]">
                    <Users className="size-3" />
                    <span className="font-mono tabular-nums">{label.chatCount ?? 0}</span> عميل
                    <span className="mx-1">•</span>
                    اضغط للعرض
                  </p>
                </div>
              </button>

              <Button
                variant="outline"
                className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                onClick={() => onDeleteLabel(label)}
              >
                <Trash2 className="size-4" />
                {t("whatsappSettings.delete")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </WhatsAppSurfaceCard>
  );
};
