import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, ExternalLink, Globe, Info } from "lucide-react";
import { toast } from "sonner";
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
import type { Session } from "../types/whatsAppSettingsTypes";

interface WhatsAppWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookDetailsSession: Session | null;
  newMetaWebhookVerifyToken: string;
  getMetaWebhookUrl: () => string;
  onClose: () => void;
}

export const WhatsAppWebhookDialog: React.FC<WhatsAppWebhookDialogProps> = ({
  open,
  onOpenChange,
  webhookDetailsSession,
  newMetaWebhookVerifyToken,
  getMetaWebhookUrl,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-6 sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Globe className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                بيانات رد الاتصال (Meta Webhook)
              </DialogTitle>
              <DialogDescription className="text-xs text-[color:var(--color-muted-foreground)]">
                بيانات الربط مع بوابة Meta Developers لاستقبال رسائل الواتساب
                الواردة وحالات التسليم
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Callback URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-medium text-[color:var(--color-foreground)]">
                رابط الويب هوك (Callback URL)
              </Label>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                انسخ هذا الرابط إلى Meta
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={getMetaWebhookUrl()}
                className="h-10 bg-[color:var(--color-card)] font-mono text-xs select-all text-[color:var(--color-foreground)]"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-3.5 shrink-0 gap-1.5 rounded-xl border-[color:var(--shell-control-border)]"
                onClick={() => {
                  navigator.clipboard.writeText(getMetaWebhookUrl());
                  toast.success("تم نسخ رابط الويب هوك بنجاح");
                }}
              >
                <Copy className="size-3.5" />
                <span className="text-xs">نسخ</span>
              </Button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-medium text-[color:var(--color-foreground)]">
                رمز التحقق (Verify Token)
              </Label>
              <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                {webhookDetailsSession
                  ? `جلسة: ${webhookDetailsSession.name}`
                  : "رمز التحقق للربط"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  webhookDetailsSession?.metaWebhookVerifyToken ||
                  newMetaWebhookVerifyToken ||
                  "maxp_verify_token"
                }
                className="h-10 bg-[color:var(--color-card)] font-mono text-xs select-all text-[color:var(--color-foreground)]"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-3.5 shrink-0 gap-1.5 rounded-xl border-[color:var(--shell-control-border)]"
                onClick={() => {
                  const token =
                    webhookDetailsSession?.metaWebhookVerifyToken ||
                    newMetaWebhookVerifyToken ||
                    "maxp_verify_token";
                  navigator.clipboard.writeText(token);
                  toast.success("تم نسخ رمز التحقق بنجاح");
                }}
              >
                <Copy className="size-3.5" />
                <span className="text-xs">نسخ</span>
              </Button>
            </div>
          </div>

          {/* Subscribed Fields */}
          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[color:var(--color-foreground)]">
                الحقول المطلوبة (Webhook fields):
              </span>
              <Badge
                variant="outline"
                className="font-mono text-xs bg-emerald-500/10 border-emerald-300 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300"
              >
                messages
              </Badge>
            </div>
            <p className="text-[11px] text-[color:var(--color-muted-foreground)] leading-relaxed">
              في لوحة تحكم Meta، اضغط <strong>Manage</strong> في حقل Webhook fields
              واشترك في <strong>messages</strong> لتصلك الرسائل وتحديثات القراءة
              والتسليم مباشرة إلى لوحة التحكم.
            </p>
          </div>

          {/* Step Guide */}
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-[color:var(--color-muted-foreground)] space-y-2">
            <p className="font-semibold text-[color:var(--color-foreground)] flex items-center gap-1.5">
              <Info className="size-3.5 text-sky-600" />
              خطوات التثبيت في بوابة Meta Developers:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>
                سجّل الدخول إلى{" "}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 underline font-medium inline-flex items-center gap-0.5"
                >
                  Meta for Developers{" "}
                  <ExternalLink className="size-2.5 inline" />
                </a>{" "}
                ثم اختر تطبيقك.
              </li>
              <li>
                انتقل إلى <strong>WhatsApp</strong> &gt;{" "}
                <strong>Configuration</strong> من القائمة الجانبية.
              </li>
              <li>
                في قسم <strong>Webhook</strong> اضغط <strong>Edit</strong>، ثم
                الصق رابط الويب هوك ورمز التحقق أعلاه واضغط{" "}
                <strong>Verify and save</strong>.
              </li>
              <li>
                في جدول <strong>Webhook fields</strong> اضغط{" "}
                <strong>Manage</strong> وفعّل حقل{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary font-bold">
                  messages
                </code>
                .
              </li>
            </ol>
          </div>

          {/* Direct Meta Link */}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-[color:var(--shell-control-border)] h-10 text-xs gap-2 font-medium bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)]"
            onClick={() =>
              window.open("https://developers.facebook.com/apps", "_blank")
            }
          >
            <ExternalLink className="size-3.5" />
            الانتقال إلى بوابة Meta for Developers
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="rounded-full w-full sm:w-auto"
            onClick={onClose}
          >
            {t("whatsappSettings.dialogs.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
