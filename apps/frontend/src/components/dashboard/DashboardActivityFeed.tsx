import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChatBubbleLeftRightIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import type { DashboardData } from "../../pages/dashboard/types";

type Props = {
  dashboard: DashboardData | undefined;
  liveActivities: Array<{ id: string; text: string; href?: string }>;
};

export function DashboardActivityFeed({ dashboard, liveActivities }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recent = dashboard?.recentActivity;

  if (!recent && liveActivities.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {t("companyDashboard.activity.title")}
      </h3>
      <div className="space-y-3">
        {recent?.newCustomers != null && recent.newCustomers > 0 && (
          <ActivityRow
            icon={UserGroupIcon}
            color="var(--color-success)"
            text={t("companyDashboard.activity.newCustomers", { count: recent.newCustomers })}
            onClick={() => navigate("/customers")}
          />
        )}
        {recent?.newConversations != null && recent.newConversations > 0 && (
          <ActivityRow
            icon={ChatBubbleLeftRightIcon}
            color="#25D366"
            text={t("companyDashboard.activity.newConversations", { count: recent.newConversations })}
            onClick={() => navigate("/whatsapp")}
          />
        )}
        {liveActivities.slice(0, 3).map((a) => (
          <ActivityRow
            key={a.id}
            icon={ChatBubbleLeftRightIcon}
            color="var(--color-primary)"
            text={a.text}
            onClick={() => a.href && navigate(a.href)}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  color,
  text,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  text: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/30 transition-colors text-right"
    >
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-foreground truncate">{text}</span>
    </button>
  );
}
