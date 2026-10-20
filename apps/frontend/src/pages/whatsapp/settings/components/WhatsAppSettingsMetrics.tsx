import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, MessageSquareText, Smartphone, Users } from "lucide-react";
import { WhatsAppMetricCard } from "../../components/WhatsAppPageShell";

interface WhatsAppSettingsMetricsProps {
  connectedCount: number;
  contactsCount: number;
  messagesCount: number;
  quickRepliesCount: number;
}

export const WhatsAppSettingsMetrics: React.FC<WhatsAppSettingsMetricsProps> = ({
  connectedCount,
  contactsCount,
  messagesCount,
  quickRepliesCount,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
      <WhatsAppMetricCard
        label={t("whatsappSettings.connected")}
        value={connectedCount}
        icon={Smartphone}
        tone="success"
      />
      <WhatsAppMetricCard
        label="المحادثات الظاهرة"
        value={contactsCount}
        icon={Users}
        tone="primary"
      />
      <WhatsAppMetricCard
        label={t("whatsappSettings.messages")}
        value={messagesCount}
        icon={MessageSquareText}
        tone="info"
      />
      <WhatsAppMetricCard
        label={t("whatsappSettings.quickReplies")}
        value={quickRepliesCount}
        icon={Copy}
        tone="primary"
      />
    </div>
  );
};
