import React from "react";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Copy,
  Globe,
  Key,
  Settings,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Session } from "../../types/whatsAppSettingsTypes";

interface EditSessionMetaSectionProps {
  editingSession: Session;
  setEditingSession: React.Dispatch<React.SetStateAction<Session | null>>;
  getMetaWebhookUrl: () => string;
}

export const EditSessionMetaSection: React.FC<EditSessionMetaSectionProps> = ({
  editingSession,
  setEditingSession,
  getMetaWebhookUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Auth Details */}
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
          <Key className="size-4 text-[color:var(--color-primary)]" />
          {t("whatsappSettings.dialogs.authDetails")}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-meta-phone-id">
              {t("whatsappSettings.dialogs.metaPhoneNumberId")}
            </Label>
            <Input
              id="edit-meta-phone-id"
              value={editingSession.metaPhoneNumberId || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaPhoneNumberId: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-meta-access">
              {t("whatsappSettings.dialogs.metaAccessToken")}
            </Label>
            <Input
              id="edit-meta-access"
              type="password"
              value={editingSession.metaAccessToken || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaAccessToken: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
          <Briefcase className="size-4 text-[color:var(--color-primary)]" />
          {t("whatsappSettings.dialogs.accountDetails")}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-meta-waba">
              {t("whatsappSettings.dialogs.metaWabaId")}
            </Label>
            <Input
              id="edit-meta-waba"
              value={editingSession.metaWabaId || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? { ...previous, metaWabaId: event.target.value }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-meta-business">
              {t("whatsappSettings.dialogs.metaBusinessId")}
            </Label>
            <Input
              id="edit-meta-business"
              value={editingSession.metaBusinessId || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaBusinessId: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-meta-display">
              {t("whatsappSettings.dialogs.metaDisplayPhone")}
            </Label>
            <Input
              id="edit-meta-display"
              value={editingSession.metaDisplayPhoneNumber || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaDisplayPhoneNumber: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
            <Globe className="size-4 text-sky-600 dark:text-sky-400" />
            إعدادات رد الاتصال (Meta Webhook)
          </h4>
          <Badge
            variant="outline"
            className="text-[10px] bg-sky-500/10 border-sky-300 text-sky-800 dark:border-sky-500/40 dark:text-sky-200"
          >
            مطلوب للرسائل
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="edit-meta-webhook-url">
                رابط الويب هوك (Callback URL)
              </Label>
              <span className="text-[10px] text-sky-600 dark:text-sky-400">
                انسخ هذا الرابط إلى Meta
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="edit-meta-webhook-url"
                readOnly
                value={getMetaWebhookUrl()}
                className="h-11 bg-[color:var(--color-card)] font-mono text-xs select-all text-[color:var(--color-foreground)]"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0 gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(getMetaWebhookUrl());
                  toast.success("تم نسخ رابط الويب هوك بنجاح");
                }}
              >
                <Copy className="size-4" />
                <span className="text-xs">نسخ</span>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="edit-meta-verify">
                {t("whatsappSettings.dialogs.metaWebhookVerifyToken")}
              </Label>
              <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                ضعه في خانة Verify Token في Meta
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="edit-meta-verify"
                value={editingSession.metaWebhookVerifyToken || ""}
                onChange={(event) =>
                  setEditingSession((previous) =>
                    previous
                      ? {
                          ...previous,
                          metaWebhookVerifyToken: event.target.value,
                        }
                      : previous,
                  )
                }
                className="h-11 bg-[color:var(--color-card)] font-mono text-xs"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0 gap-1.5"
                onClick={() => {
                  if (editingSession.metaWebhookVerifyToken) {
                    navigator.clipboard.writeText(
                      editingSession.metaWebhookVerifyToken,
                    );
                    toast.success("تم نسخ رمز التحقق بنجاح");
                  }
                }}
                disabled={!editingSession.metaWebhookVerifyToken}
              >
                <Copy className="size-4" />
                <span className="text-xs">نسخ</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0"
                onClick={() => {
                  const chars =
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                  let token = "";
                  for (let i = 0; i < 16; i++) {
                    token += chars.charAt(
                      Math.floor(Math.random() * chars.length),
                    );
                  }
                  setEditingSession((previous) =>
                    previous
                      ? {
                          ...previous,
                          metaWebhookVerifyToken: token,
                        }
                      : previous,
                  );
                }}
                title="توليد رمز جديد"
              >
                <Shuffle className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
          <Settings className="size-4 text-[color:var(--color-muted-foreground)]" />
          {t("whatsappSettings.dialogs.advancedSettings")}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-meta-api">
              {t("whatsappSettings.dialogs.metaApiVersion")}
            </Label>
            <Input
              id="edit-meta-api"
              value={editingSession.metaApiVersion || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaApiVersion: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-meta-secret">
              {t("whatsappSettings.dialogs.metaWebhookSecret")}
            </Label>
            <Input
              id="edit-meta-secret"
              value={editingSession.metaWebhookSecret || ""}
              onChange={(event) =>
                setEditingSession((previous) =>
                  previous
                    ? {
                        ...previous,
                        metaWebhookSecret: event.target.value,
                      }
                    : previous,
                )
              }
              className="h-11 bg-[color:var(--color-card)] font-mono"
              dir="ltr"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
