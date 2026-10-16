import React from "react";
import {
  Sparkles,
  AlertTriangle,
  Rocket,
  Bell,
  ArrowLeft,
  X,
} from "lucide-react";

export type AnnouncementType = "feature" | "alert" | "promotion" | "update";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  isDismissible?: boolean;
}

interface SaaSAnnouncementsProps {
  announcements?: Announcement[];
  onDismiss?: (id: string) => void;
}

const SaaSAnnouncements: React.FC<SaaSAnnouncementsProps> = ({
  announcements = [],
  onDismiss,
}) => {
  if (announcements.length === 0) return null;

  const getBadgeConfig = (type: AnnouncementType) => {
    switch (type) {
      case "feature":
        return {
          icon: Sparkles,
          label: "جديد",
          badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          iconColor: "text-purple-600 dark:text-purple-400",
          cardBorder: "border-purple-500/20 hover:border-purple-500/40",
        };
      case "alert":
        return {
          icon: AlertTriangle,
          label: "تنبيه",
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          iconColor: "text-amber-600 dark:text-amber-400",
          cardBorder: "border-amber-500/20 hover:border-amber-500/40",
        };
      case "promotion":
        return {
          icon: Rocket,
          label: "عرض خاص",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          cardBorder: "border-emerald-500/20 hover:border-emerald-500/40",
        };
      case "update":
      default:
        return {
          icon: Bell,
          label: "تحديث",
          badgeClass: "bg-primary/10 text-primary border-primary/20",
          iconColor: "text-primary",
          cardBorder: "border-border/70 hover:border-primary/40",
        };
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {announcements.map((item) => {
        const config = getBadgeConfig(item.type);
        const Icon = config.icon;

        return (
          <div
            key={item.id}
            className={`relative rounded-xl border bg-card p-3.5 shadow-2xs transition-all duration-150 ${config.cardBorder}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 rounded-lg bg-muted/60 border border-border/60">
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${config.badgeClass}`}
                  >
                    {config.label}
                  </span>
                  <h3 className="text-xs font-semibold text-foreground truncate">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.message}
                </p>

                {item.actionLabel && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.actionUrl) {
                          window.location.href = item.actionUrl;
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors duration-150 active:scale-95 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowLeft className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                    </button>
                  </div>
                )}
              </div>

              {item.isDismissible && onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors active:scale-95 cursor-pointer"
                  aria-label="إغلاق التنبيه"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SaaSAnnouncements;
