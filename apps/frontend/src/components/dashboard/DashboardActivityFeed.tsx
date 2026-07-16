import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ChatBubbleLeftRightIcon, UserGroupIcon, ShoppingCartIcon,
  MegaphoneIcon, ArrowDownTrayIcon, BellIcon, SparklesIcon,
  PhoneIcon, DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { DashboardData } from "../../pages/dashboard/types";
import type { LiveActivity } from "../../hooks/useDashboardLiveSync";

type Props = {
  dashboard: DashboardData | undefined;
  liveActivities: LiveActivity[];
  liveCount?: number;
};

const KIND_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  order:        { icon: ShoppingCartIcon,        color: "#6366f1" },
  conversation: { icon: ChatBubbleLeftRightIcon, color: "#25D366" },
  whatsapp:     { icon: PhoneIcon,               color: "#25D366" },
  campaign:     { icon: MegaphoneIcon,           color: "#f59e0b" },
  import:       { icon: ArrowDownTrayIcon,       color: "#3b82f6" },
  notification: { icon: BellIcon,                color: "#ef4444" },
  ai:           { icon: SparklesIcon,            color: "#a855f7" },
};

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} س`;
  return `منذ ${Math.floor(diff / 86400000)} ي`;
}

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

      <div className="space-y-1">
        {recent?.newCustomers != null && recent.newCustomers > 0 && (
          <ActivityRow
            icon={UserGroupIcon}
            color="var(--color-success, #22c55e)"
            text={t("companyDashboard.activity.newCustomers", { count: recent.newCustomers })}
            onClick={() => navigate("/customers")}
          />
        )}
        {recent?.newConversations != null && recent.newConversations > 0 && (
          <ActivityRow
            icon={DocumentTextIcon}
            color="#25D366"
            text={t("companyDashboard.activity.newConversations", { count: recent.newConversations })}
            onClick={() => navigate("/unified-inbox")}
          />
        )}
        {liveActivities.slice(0, 5).map((a) => {
          const meta = KIND_META[a.kind] ?? KIND_META.conversation;
          return (
            <ActivityRow
              key={a.id}
              icon={meta.icon}
              color={meta.color}
              text={a.text}
              time={a.ts}
              onClick={() => a.href && navigate(a.href)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ActivityRow({
  icon: Icon, color, text, time, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  text: string;
  time?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted/30 transition-colors text-right group"
    >
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-foreground truncate flex-1 text-right">{text}</span>
      {time != null && (
        <span className="text-[10px] text-muted-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ltr:ml-auto rtl:mr-auto">
          {formatTime(time)}
        </span>
      )}
    </button>
  );
}
