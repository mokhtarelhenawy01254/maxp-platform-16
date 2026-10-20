import React from "react";
import { useTranslation } from "react-i18next";
import {
  Copy,
  ExternalLink,
  Globe,
  Info,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MetaCloudManualSectionProps {
  newMetaPhoneNumberId: string;
  setNewMetaPhoneNumberId: (val: string) => void;
  newMetaAccessToken: string;
  setNewMetaAccessToken: (val: string) => void;
  newMetaWabaId: string;
  setNewMetaWabaId: (val: string) => void;
  newMetaBusinessId: string;
  setNewMetaBusinessId: (val: string) => void;
  newMetaWebhookVerifyToken: string;
  setNewMetaWebhookVerifyToken: (val: string) => void;
  generateRandomVerifyToken: () => string;
  getMetaWebhookUrl: () => string;
}

export const MetaCloudManualSection: React.FC<MetaCloudManualSectionProps> = ({
  newMetaPhoneNumberId,
  setNewMetaPhoneNumberId,
  newMetaAccessToken,
  setNewMetaAccessToken,
  newMetaWabaId,
  setNewMetaWabaId,
  newMetaBusinessId,
  setNewMetaBusinessId,
  newMetaWebhookVerifyToken,
  setNewMetaWebhookVerifyToken,
  generateRandomVerifyToken,
  getMetaWebhookUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border-t border-[color:var(--shell-control-border)] p-4 sm:p-5 space-y-4 bg-[var(--app-panel-bg)] animate-in fade-in-50 duration-200">
      {/* Auth Details */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-[color:var(--color-foreground)] uppercase">
          {t("whatsappSettings.dialogs.authDetails")}
        </h5>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              className="flex items-center gap-1.5 text-xs"
              htmlFor="meta-phone-id"
            >
              {t("whatsappSettings.dialogs.metaPhoneNumberId")}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meta-phone-id"
              value={newMetaPhoneNumberId}
              onChange={(event) =>
                setNewMetaPhoneNumberId(
                  event.target.value.replace(/[^0-9]/g, ""),
                )
              }
              placeholder="e.g. 1151868711348740"
              className={cn(
                "h-10 bg-[color:var(--color-card)] text-sm font-mono tabular-nums",
                newMetaPhoneNumberId.trim()
                  ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                  : "",
              )}
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              className="flex items-center gap-1.5 text-xs"
              htmlFor="meta-access-token"
            >
              {t("whatsappSettings.dialogs.metaAccessToken")}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meta-access-token"
              type="password"
              value={newMetaAccessToken}
              onChange={(event) => setNewMetaAccessToken(event.target.value)}
              placeholder="EAA..."
              className={cn(
                "h-10 bg-[color:var(--color-card)] text-sm font-mono",
                newMetaAccessToken.trim()
                  ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                  : "",
              )}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-3 border-t border-[color:var(--shell-control-border)] pt-3">
        <h5 className="text-xs font-semibold text-[color:var(--color-foreground)] uppercase">
          {t("whatsappSettings.dialogs.accountDetails")}
        </h5>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              className="flex items-center gap-1.5 text-xs"
              htmlFor="meta-waba-id"
            >
              {t("whatsappSettings.dialogs.metaWabaId")}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meta-waba-id"
              value={newMetaWabaId}
              onChange={(event) =>
                setNewMetaWabaId(event.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="e.g. 1482240533647516"
              className={cn(
                "h-10 bg-[color:var(--color-card)] text-sm font-mono tabular-nums",
                newMetaWabaId.trim()
                  ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                  : "",
              )}
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              className="flex items-center gap-1.5 text-xs"
              htmlFor="meta-business-id"
            >
              {t("whatsappSettings.dialogs.metaBusinessId")}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meta-business-id"
              value={newMetaBusinessId}
              onChange={(event) =>
                setNewMetaBusinessId(
                  event.target.value.replace(/[^0-9]/g, ""),
                )
              }
              placeholder="e.g. 2381274910237"
              className={cn(
                "h-10 bg-[color:var(--color-card)] text-sm font-mono tabular-nums",
                newMetaBusinessId.trim()
                  ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                  : "",
              )}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="space-y-3.5 border-t border-[color:var(--shell-control-border)] pt-4">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-[color:var(--color-foreground)] uppercase flex items-center gap-1.5">
            <Globe className="size-3.5 text-sky-600 dark:text-sky-400" />
            إعدادات رد الاتصال (Meta Webhook)
          </h5>
          <Badge
            variant="outline"
            className="text-[10px] bg-sky-500/10 border-sky-300 text-sky-800 dark:border-sky-500/40 dark:text-sky-200"
          >
            مطلوب للرسائل
          </Badge>
        </div>

        {/* Callback URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <Label
              className="flex items-center gap-1 text-xs"
              htmlFor="meta-webhook-url"
            >
              رابط الويب هوك (Callback URL)
              <span className="text-red-500">*</span>
            </Label>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
              انسخ هذا الرابط والصقه في Meta
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="meta-webhook-url"
              readOnly
              value={getMetaWebhookUrl()}
              className="h-10 bg-[color:var(--color-card)] font-mono text-xs select-all text-[color:var(--color-foreground)]"
              dir="ltr"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0 gap-1.5"
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
            <Label
              className="flex items-center gap-1 text-xs"
              htmlFor="meta-verify-token-main"
            >
              {t("whatsappSettings.dialogs.metaWebhookVerifyToken")}
              <span className="text-red-500">*</span>
            </Label>
            <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
              ضعه في خانة Verify Token في Meta
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="meta-verify-token-main"
              value={newMetaWebhookVerifyToken}
              onChange={(event) =>
                setNewMetaWebhookVerifyToken(event.target.value)
              }
              placeholder="verify-token"
              className="h-10 bg-[color:var(--color-card)] font-mono text-xs text-[color:var(--color-foreground)]"
              dir="ltr"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(newMetaWebhookVerifyToken);
                toast.success("تم نسخ رمز التحقق بنجاح");
              }}
              disabled={!newMetaWebhookVerifyToken}
            >
              <Copy className="size-3.5" />
              <span className="text-xs">نسخ</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={generateRandomVerifyToken}
              className="h-10 px-3 border-[color:var(--shell-control-border)] cursor-pointer shrink-0"
              title="توليد رمز جديد"
            >
              <Shuffle className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick 3-Step Guide */}
        <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--app-panel-bg)] p-3 text-[11px] text-[color:var(--color-muted-foreground)] space-y-1.5">
          <p className="font-semibold text-[color:var(--color-foreground)] flex items-center gap-1.5">
            <Info className="size-3.5 text-sky-600" />
            خطوات الربط في بوابة Meta for Developers:
          </p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>
              افتح تطبيقك في{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 underline font-medium inline-flex items-center gap-0.5"
              >
                Meta Developers <ExternalLink className="size-2.5 inline" />
              </a>{" "}
              &gt; WhatsApp &gt; Configuration.
            </li>
            <li>
              في قسم <strong>Webhook</strong> اضغط <strong>Edit</strong>، والصق
              رابط الويب هوك ورمز التحقق واضغط <strong>Verify and save</strong>.
            </li>
            <li>
              في جدول <strong>Webhook fields</strong> اضغط{" "}
              <strong>Manage</strong> واشترك في حقل{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary font-bold">
                messages
              </code>
              .
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
