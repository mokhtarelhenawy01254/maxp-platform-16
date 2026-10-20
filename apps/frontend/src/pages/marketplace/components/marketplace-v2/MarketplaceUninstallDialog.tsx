import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MarketplaceApp } from "@/types/marketplace";

interface MarketplaceUninstallDialogProps {
  confirmUninstallApp: MarketplaceApp | null;
  onClose: () => void;
  onConfirm: (app: MarketplaceApp) => void;
  uninstallingApp: string | null;
}

export function MarketplaceUninstallDialog({
  confirmUninstallApp,
  onClose,
  onConfirm,
  uninstallingApp,
}: MarketplaceUninstallDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={Boolean(confirmUninstallApp)} onOpenChange={(open) => !open && onClose()}>
      {confirmUninstallApp && (
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <svg className="size-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <AlertDialogTitle className="text-center">
              {t("marketplace.deactivateTitle", { name: confirmUninstallApp.name })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t("marketplace.deactivateConfirm")}
              <br />
              {t("marketplace.deactivateWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              className="rounded-xl"
              disabled={uninstallingApp === confirmUninstallApp.slug}
            >
              {t("marketplace.goBack")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConfirm(confirmUninstallApp)}
              disabled={uninstallingApp === confirmUninstallApp.slug}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {uninstallingApp === confirmUninstallApp.slug ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {t("marketplace.activating")}
                </span>
              ) : (
                t("marketplace.confirmDeactivation")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
