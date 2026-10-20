import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Save } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  QuickReply,
  QuickReplyFormData,
} from "../types/whatsAppSettingsTypes";
import { quickReplyCategoryKeys } from "../types/whatsAppSettingsTypes";

interface WhatsAppQuickReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuickReply: QuickReply | null;
  quickReplyForm: QuickReplyFormData;
  setQuickReplyForm: React.Dispatch<React.SetStateAction<QuickReplyFormData>>;
  saving: boolean;
  onSaveQuickReply: () => void;
  onClose: () => void;
}

export const WhatsAppQuickReplyDialog: React.FC<
  WhatsAppQuickReplyDialogProps
> = ({
  open,
  onOpenChange,
  editingQuickReply,
  quickReplyForm,
  setQuickReplyForm,
  saving,
  onSaveQuickReply,
  onClose,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
          <DialogTitle>
            {editingQuickReply
              ? t("whatsappSettings.dialogs.editQuickReply")
              : t("whatsappSettings.dialogs.addQuickReplyTitle")}
          </DialogTitle>
          <DialogDescription>{t("whatsappSettings.quickReplies")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="quick-reply-title">
              {t("whatsappSettings.dialogs.title")}
            </Label>
            <Input
              id="quick-reply-title"
              value={quickReplyForm.title}
              onChange={(event) =>
                setQuickReplyForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              className="h-11 bg-[color:var(--color-card)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-reply-shortcut">
              {t("whatsappSettings.dialogs.shortcut")}
            </Label>
            <Input
              id="quick-reply-shortcut"
              value={quickReplyForm.shortcut}
              onChange={(event) =>
                setQuickReplyForm((previous) => ({
                  ...previous,
                  shortcut: event.target.value,
                }))
              }
              placeholder={
                ts("whatsappSettings.dialogs.shortcutPlaceholder") as string
              }
              className="h-11 bg-[color:var(--color-card)] font-mono"
            />
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("whatsappSettings.dialogs.shortcutHelper")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("whatsappSettings.dialogs.category")}</Label>
            <Select
              value={quickReplyForm.category}
              onValueChange={(value) =>
                setQuickReplyForm((previous) => ({
                  ...previous,
                  category: value ?? "",
                }))
              }
            >
              <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                <SelectValue
                  placeholder={ts("whatsappSettings.dialogs.category")}
                />
              </SelectTrigger>
              <SelectContent>
                {quickReplyCategoryKeys.map((categoryKey) => (
                  <SelectItem key={categoryKey} value={categoryKey}>
                    {t(`whatsappSettings.categories.${categoryKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-reply-content">
              {t("whatsappSettings.dialogs.content")}
            </Label>
            <Textarea
              id="quick-reply-content"
              value={quickReplyForm.content}
              onChange={(event) =>
                setQuickReplyForm((previous) => ({
                  ...previous,
                  content: event.target.value,
                }))
              }
              className="min-h-[9rem] bg-[color:var(--color-card)]"
            />
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("whatsappSettings.dialogs.variablesHelper")}
            </p>
          </div>
        </div>

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
            onClick={onSaveQuickReply}
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
