import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Session } from "../types/whatsAppSettingsTypes";
import {
  providerLabels,
  statusBadgeClasses,
} from "../types/whatsAppSettingsTypes";
import {
  getStatusText,
  SettingsToggle,
} from "../utils/whatsAppSettingsUtils";
import { EditSessionMetaSection } from "./edit-session/EditSessionMetaSection";

interface WhatsAppEditSessionDialogProps {
  editingSession: Session | null;
  setEditingSession: React.Dispatch<React.SetStateAction<Session | null>>;
  saving: boolean;
  onUpdateSession: () => void;
  onClose: () => void;
  getMetaWebhookUrl: () => string;
}

export const WhatsAppEditSessionDialog: React.FC<
  WhatsAppEditSessionDialogProps
> = ({
  editingSession,
  setEditingSession,
  saving,
  onUpdateSession,
  onClose,
  getMetaWebhookUrl,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={!!editingSession}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
          <DialogTitle>{t("whatsappSettings.dialogs.editSession")}</DialogTitle>
          <DialogDescription>{editingSession?.name}</DialogDescription>
        </DialogHeader>

        {editingSession ? (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="edit-session-name">
                {t("whatsappSettings.dialogs.sessionName")}
              </Label>
              <Input
                id="edit-session-name"
                value={editingSession.name}
                onChange={(event) =>
                  setEditingSession((previous) =>
                    previous
                      ? { ...previous, name: event.target.value }
                      : previous,
                  )
                }
                className="h-11 bg-[color:var(--color-card)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
              >
                {providerLabels[editingSession.provider || "BAILEYS"]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  statusBadgeClasses[
                    (
                      editingSession.liveStatus ||
                      editingSession.status ||
                      "DISCONNECTED"
                    ).toUpperCase() as keyof typeof statusBadgeClasses
                  ] || statusBadgeClasses["DISCONNECTED"],
                )}
              >
                {getStatusText(
                  (
                    editingSession.liveStatus ||
                    editingSession.status ||
                    "DISCONNECTED"
                  ).toUpperCase(),
                  t,
                )}
              </Badge>
            </div>

            {editingSession.provider === "META_CLOUD" ? (
              <EditSessionMetaSection
                editingSession={editingSession}
                setEditingSession={setEditingSession}
                getMetaWebhookUrl={getMetaWebhookUrl}
              />
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <SettingsToggle
                label={t("whatsappSettings.dialogs.autoReply")}
                checked={editingSession.autoReply}
                onCheckedChange={(checked) =>
                  setEditingSession((previous) =>
                    previous ? { ...previous, autoReply: checked } : previous,
                  )
                }
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="welcome-message">
                  {t("whatsappSettings.dialogs.welcomeMessage")}
                </Label>
                <Textarea
                  id="welcome-message"
                  value={editingSession.welcomeMessage || ""}
                  onChange={(event) =>
                    setEditingSession((previous) =>
                      previous
                        ? { ...previous, welcomeMessage: event.target.value }
                        : previous,
                    )
                  }
                  className="min-h-[8rem] bg-[color:var(--color-card)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="away-message">
                  {t("whatsappSettings.dialogs.awayMessage")}
                </Label>
                <Textarea
                  id="away-message"
                  value={editingSession.awayMessage || ""}
                  onChange={(event) =>
                    setEditingSession((previous) =>
                      previous
                        ? { ...previous, awayMessage: event.target.value }
                        : previous,
                    )
                  }
                  className="min-h-[8rem] bg-[color:var(--color-card)]"
                />
              </div>
            </div>

            <SettingsToggle
              label={t("whatsappSettings.dialogs.makeDefault")}
              checked={editingSession.isDefault}
              onCheckedChange={(checked) =>
                setEditingSession((previous) =>
                  previous ? { ...previous, isDefault: checked } : previous,
                )
              }
            />

            {editingSession.provider !== "META_CLOUD" && (
              <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <SettingsToggle
                  label="درع المكالمات (Call Shield) — رفض المكالمات الواردة تلقائياً"
                  checked={editingSession.callShieldEnabled ?? false}
                  onCheckedChange={(checked) =>
                    setEditingSession((previous) =>
                      previous
                        ? { ...previous, callShieldEnabled: checked }
                        : previous,
                    )
                  }
                />
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  عند التفعيل، سيتم رفض أي مكالمة صوتية أو فيديو واردة تلقائياً على رقم واتساب وإرسال رد نصي فوري للمتصل.
                </p>
                <div className="space-y-1.5 pt-1">
                  <Label
                    htmlFor="call-shield-message"
                    className="text-xs font-medium"
                  >
                    رسالة الرد التلقائي عند رفض المكالمة
                  </Label>
                  <Textarea
                    id="call-shield-message"
                    placeholder="عذراً، هذا الرقم مخصص للمراسلات النصية وخدمة العملاء فقط ولا يستقبل مكالمات صوتية. كيف يمكننا مساعدتك؟"
                    value={editingSession.callShieldMessage || ""}
                    onChange={(event) =>
                      setEditingSession((previous) =>
                        previous
                          ? {
                              ...previous,
                              callShieldMessage: event.target.value,
                            }
                          : previous,
                      )
                    }
                    className="min-h-[5rem] text-xs bg-[color:var(--color-card)]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    Load balancing weight
                  </p>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    Higher numbers route more work to this session.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] font-mono tabular-nums"
                >
                  {editingSession.loadBalanceWeight || 1}
                </Badge>
              </div>
              <Slider
                className="mt-4"
                min={1}
                max={10}
                step={1}
                value={[editingSession.loadBalanceWeight || 1]}
                onValueChange={([value]) =>
                  setEditingSession((previous) =>
                    previous
                      ? { ...previous, loadBalanceWeight: value }
                      : previous,
                  )
                }
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="px-6">
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
            onClick={onClose}
          >
            {t("whatsappSettings.dialogs.cancel")}
          </Button>
          <Button
            className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
            onClick={onUpdateSession}
            disabled={saving}
          >
            {saving ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("whatsappSettings.dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
