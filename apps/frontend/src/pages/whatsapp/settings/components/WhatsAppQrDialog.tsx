import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPairingCode } from "../utils/whatsAppSettingsUtils";

interface WhatsAppQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentQR: string | null;
  currentPairingCode: string | null;
  currentPairingPhone: string | null;
  qrRefreshed: boolean;
  onClose: () => void;
}

export const WhatsAppQrDialog: React.FC<WhatsAppQrDialogProps> = ({
  open,
  onOpenChange,
  currentQR,
  currentPairingCode,
  currentPairingPhone,
  qrRefreshed,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(calc(100%-2rem),30rem)] overflow-visible rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-[30rem]"
      >
        <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6 sm:px-8 sm:pt-7">
          <DialogTitle>{t("whatsappSettings.dialogs.scanQR")}</DialogTitle>
          <DialogDescription>{t("whatsappSettings.dialogs.scanInstructions")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-5 px-6 pb-7 pt-5 text-center sm:px-8">
          {currentPairingCode ? (
            <div className="w-full space-y-4 animate-in fade-in-50 duration-300">
              <div className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-5">
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  افتح واتساب على رقم
                  {currentPairingPhone ? (
                    <span
                      className="mx-1 font-semibold font-mono tabular-nums"
                      dir="ltr"
                    >
                      {currentPairingPhone}
                    </span>
                  ) : null}
                  ثم ادخل كود الربط.
                </p>
                <p
                  className="mt-4 select-all text-3xl font-semibold tracking-normal text-[color:var(--color-foreground)] font-mono tabular-nums"
                  dir="ltr"
                >
                  {formatPairingCode(currentPairingCode)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                onClick={() =>
                  void navigator.clipboard?.writeText(currentPairingCode)
                }
              >
                <Copy className="size-4" />
                نسخ الكود
              </Button>
            </div>
          ) : currentQR ? (
            <div className="mx-auto flex flex-col items-center gap-2">
              {qrRefreshed && (
                <p className="animate-pulse text-xs font-medium text-[color:var(--color-primary)]">
                  {t("whatsappSettings.dialogs.qrRefreshed")}
                </p>
              )}
              <div className="mx-auto rounded-3xl bg-white p-5 shadow-[0_24px_50px_rgba(15,27,45,0.16)] ring-1 ring-black/5 animate-in fade-in-50 duration-300">
                <QRCodeSVG
                  value={currentQR}
                  size={320}
                  marginSize={4}
                  bgColor="#FFFFFF"
                  fgColor="#111827"
                  level="M"
                  className="block h-auto w-[min(72vw,20rem)]"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 animate-pulse">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <QrCode className="size-8 text-[color:var(--color-primary)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                  {t("whatsappSettings.dialogs.waitingQR")}
                </p>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("whatsappSettings.dialogs.pairingTakeTime")}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6">
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
            onClick={onClose}
          >
            {t("whatsappSettings.dialogs.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
