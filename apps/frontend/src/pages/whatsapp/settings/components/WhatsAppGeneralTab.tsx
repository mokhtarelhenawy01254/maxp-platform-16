import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Bell, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type { WorkspaceSettings } from "../types/whatsAppSettingsTypes";
import { SettingsToggle } from "../utils/whatsAppSettingsUtils";

interface WhatsAppGeneralTabProps {
  settings: WorkspaceSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings | null>>;
  saving: boolean;
  onSaveSettings: () => void;
  notificationsHref: string;
}

export const WhatsAppGeneralTab: React.FC<WhatsAppGeneralTabProps> = ({
  settings,
  setSettings,
  saving,
  onSaveSettings,
  notificationsHref,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;
  const navigate = useNavigate();

  if (!settings) {
    return (
      <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
        <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
        <AlertTitle>{t("whatsappSettings.generalSettings")}</AlertTitle>
        <AlertDescription>{t("whatsappSettings.dialogs.errorLoading")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <WhatsAppSurfaceCard
        title={ts("whatsappSettings.notifications")}
        description={ts("whatsappSettings.autoNotificationsDesc")}
      >
        <div className="space-y-4">
          <SettingsToggle
            label={t("whatsappSettings.notificationSound")}
            checked={settings.notificationSound}
            onCheckedChange={(checked) =>
              setSettings((previous) =>
                previous
                  ? { ...previous, notificationSound: checked }
                  : previous,
              )
            }
          />
          <SettingsToggle
            label={t("whatsappSettings.browserNotifications")}
            checked={settings.browserNotifications}
            onCheckedChange={(checked) =>
              setSettings((previous) =>
                previous
                  ? { ...previous, browserNotifications: checked }
                  : previous,
              )
            }
          />

          <div className="rounded-3xl border border-emerald-300/70 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Bell className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-emerald-900">
                  {t("whatsappSettings.autoNotifications")}
                </p>
                <p className="text-sm leading-6 text-emerald-800">
                  {t("whatsappSettings.autoNotificationsDesc")}
                </p>
                <Button
                  variant="outline"
                  className="rounded-full border-emerald-300/70 bg-[color:var(--color-card)] text-emerald-900 hover:bg-[color:var(--color-card)]"
                  onClick={() => navigate(notificationsHref)}
                >
                  {t("whatsappSettings.openNotificationSettings")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </WhatsAppSurfaceCard>

      <Button
        className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
        onClick={onSaveSettings}
        disabled={saving}
      >
        {saving ? (
          <RefreshCw className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {t("whatsappSettings.saveSettings")}
      </Button>
    </div>
  );
};
