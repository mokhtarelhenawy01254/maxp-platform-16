import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChatBubbleLeftRightIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import type { DashboardData } from "../../pages/dashboard/types";

type Props = {
  dashboard: DashboardData | undefined;
  liveActivities: Array<{ id: string; text: string; href?: string }>;
  liveCount?: number;
};

export function DashboardActivityFeed({ dashboard, liveActivities, liveCount = 0 }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recent = dashboard?.recentActivity;

  if (!recent && liveActivities.length === 0 && liveCount === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("companyDashboard.activity.title")}
        </h3>
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {liveCount} {t("companyDashboard.live.label")}
          </span>
        )}
      </div>

      <div className="space-y-2">
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
        {liveActivities.slice(0, 4).map((a) => (
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
      className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted/30 transition-colors text-right"
    >
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-foreground truncate">{text}</span>
    </button>
  );
}
