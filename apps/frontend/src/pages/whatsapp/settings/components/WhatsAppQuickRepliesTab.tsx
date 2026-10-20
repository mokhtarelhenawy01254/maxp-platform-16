import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Edit, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type { QuickReply } from "../types/whatsAppSettingsTypes";

interface WhatsAppQuickRepliesTabProps {
  quickReplies: QuickReply[];
  onOpenCreate: () => void;
  onEdit: (reply: QuickReply) => void;
  onDelete: (reply: QuickReply) => void;
}

export const WhatsAppQuickRepliesTab: React.FC<WhatsAppQuickRepliesTabProps> = ({
  quickReplies,
  onOpenCreate,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <WhatsAppSurfaceCard
      title={ts("whatsappSettings.quickReplies")}
      description={ts("whatsappSettings.quickReplies")}
      action={
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={onOpenCreate}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addQuickReply")}
        </Button>
      }
    >
      {quickReplies.length === 0 ? (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappSettings.quickReplies")}</AlertTitle>
          <AlertDescription>{t("whatsappSettings.noQuickReplies")}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {quickReplies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[color:var(--color-foreground)]">
                      {reply.title}
                    </p>
                    {reply.shortcut ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono"
                      >
                        {reply.shortcut}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className="rounded-full border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200"
                    >
                      {String(t(`whatsappSettings.categories.${reply.category}`))}
                    </Badge>
                    {!reply.isActive ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200"
                      >
                        Inactive
                      </Badge>
                    ) : null}
                  </div>

                  <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                    {reply.content}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono tabular-nums"
                  >
                    {t("whatsappSettings.usedTimes", { count: reply.usageCount })}
                  </Badge>
                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                    onClick={() => onEdit(reply)}
                  >
                    <Edit className="size-4" />
                    {t("whatsappSettings.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                    onClick={() => onDelete(reply)}
                  >
                    <Trash2 className="size-4" />
                    {t("whatsappSettings.delete")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WhatsAppSurfaceCard>
  );
};
