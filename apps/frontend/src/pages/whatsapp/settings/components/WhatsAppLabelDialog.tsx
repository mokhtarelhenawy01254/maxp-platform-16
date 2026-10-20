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
import { cn } from "@/lib/utils";
import type { LabelFormData } from "../types/whatsAppSettingsTypes";
import { labelPalette } from "../types/whatsAppSettingsTypes";

interface WhatsAppLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelForm: LabelFormData;
  setLabelForm: React.Dispatch<React.SetStateAction<LabelFormData>>;
  saving: boolean;
  onCreateLabel: () => void;
  onClose: () => void;
}

export const WhatsAppLabelDialog: React.FC<WhatsAppLabelDialogProps> = ({
  open,
  onOpenChange,
  labelForm,
  setLabelForm,
  saving,
  onCreateLabel,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-sm">
        <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
          <DialogTitle>{t("whatsappSettings.dialogs.addLabelTitle")}</DialogTitle>
          <DialogDescription>{t("whatsappSettings.manageLabels")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="label-name">
              {t("whatsappSettings.dialogs.labelName")}
            </Label>
            <Input
              id="label-name"
              value={labelForm.name}
              onChange={(event) =>
                setLabelForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className="h-11 bg-[color:var(--color-card)]"
            />
          </div>

          <div className="space-y-3">
            <Label>{t("whatsappSettings.dialogs.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {labelPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform hover:scale-105",
                    labelForm.color === color
                      ? "border-[color:var(--color-foreground)]"
                      : "border-white/70",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    setLabelForm((previous) => ({ ...previous, color }))
                  }
                />
              ))}
            </div>
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
            onClick={onCreateLabel}
            disabled={saving || !labelForm.name.trim()}
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
