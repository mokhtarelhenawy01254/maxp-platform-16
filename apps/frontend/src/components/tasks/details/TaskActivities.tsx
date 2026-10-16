import React from "react";
import { Activity } from "../../../types/tasks";
import { Clock, ArrowRight, User } from "lucide-react";

interface TaskActivitiesProps {
  activities: Activity[];
}

const TaskActivities: React.FC<TaskActivitiesProps> = ({ activities }) => {
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "منذ لحظات";
    if (diffInSeconds < 3600)
      return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400)
      return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 604800)
      return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative border-s border-border/70 ms-3 space-y-4">
        {activities?.map((activity) => (
          <div key={activity.id} className="relative flex items-start ms-4">
            {/* Timeline Avatar/Dot */}
            <div className="absolute -start-[25px] top-1 p-0.5 rounded-full bg-card border border-border/70 shadow-xs">
              {activity.memberAvatar ? (
                <img
                  src={activity.memberAvatar}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground font-mono">
                  {activity.memberName?.charAt(0) || <User className="w-3 h-3" />}
                </div>
              )}
            </div>

            {/* Activity Card */}
            <div className="flex-1 bg-muted/20 hover:bg-muted/30 border border-border/60 rounded-xl p-3 text-xs space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground text-xs">
                  {activity.memberName}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono tabular-nums">
                  <Clock className="w-3 h-3" />
                  {getRelativeTime(activity.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activity.description}
                {activity.field && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono tabular-nums bg-background px-2 py-0.5 rounded border border-border/60 text-foreground w-fit">
                    {activity.oldValue && (
                      <>
                        <span>{activity.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground rtl:rotate-180" />
                      </>
                    )}
                    <span className="font-semibold">{activity.newValue}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {(!activities || activities.length === 0) && (
        <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
          لا يوجد نشاط مسجل لهذه المهمة حتى الآن
        </div>
      )}
    </div>
  );
};

export default TaskActivities;
