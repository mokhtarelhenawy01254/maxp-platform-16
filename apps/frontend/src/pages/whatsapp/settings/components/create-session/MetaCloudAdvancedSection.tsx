import React from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetaCloudAdvancedSectionProps {
  newMetaApiVersion: string;
  setNewMetaApiVersion: (val: string) => void;
  newMetaDisplayPhoneNumber: string;
  setNewMetaDisplayPhoneNumber: (val: string) => void;
  newMetaWebhookSecret: string;
  setNewMetaWebhookSecret: (val: string) => void;
}

export const MetaCloudAdvancedSection: React.FC<
  MetaCloudAdvancedSectionProps
> = ({
  newMetaApiVersion,
  setNewMetaApiVersion,
  newMetaDisplayPhoneNumber,
  setNewMetaDisplayPhoneNumber,
  newMetaWebhookSecret,
  setNewMetaWebhookSecret,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border-t border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[var(--app-panel-bg)] animate-in fade-in-50 duration-200">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5" htmlFor="meta-api-version">
            {t("whatsappSettings.dialogs.metaApiVersion")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  {t("whatsappSettings.dialogs.metaApiVersionHelper")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="meta-api-version"
            value={newMetaApiVersion}
            onChange={(event) => setNewMetaApiVersion(event.target.value)}
            placeholder="v25.0"
            className="h-11 bg-[color:var(--color-card)] font-mono"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5" htmlFor="meta-display-phone">
            {t("whatsappSettings.dialogs.metaDisplayPhone")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  {t("whatsappSettings.dialogs.metaDisplayPhoneHelper")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="meta-display-phone"
            value={newMetaDisplayPhoneNumber}
            onChange={(event) =>
              setNewMetaDisplayPhoneNumber(event.target.value)
            }
            placeholder="e.g. +15556390660"
            className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5" htmlFor="meta-secret">
          {t("whatsappSettings.dialogs.metaWebhookSecret")}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                {t("whatsappSettings.dialogs.metaWebhookSecretHelper")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="meta-secret"
          value={newMetaWebhookSecret}
          onChange={(event) => setNewMetaWebhookSecret(event.target.value)}
          placeholder="Webhook Secret (App Secret)"
          className="h-11 bg-[color:var(--color-card)] font-mono"
          dir="ltr"
        />
      </div>
    </div>
  );
};
