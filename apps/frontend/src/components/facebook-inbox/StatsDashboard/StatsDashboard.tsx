import React, { useState, useEffect } from "react";
import { InboxConversation } from "../../../types/inbox.types";
import { BarChart3, X, MessageSquare, TrendingUp, Users, Loader2 } from "lucide-react";
import { apiClient } from "../../../services/apiClient";

interface StatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: InboxConversation[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({
  isOpen,
  onClose,
  conversations,
}) => {
  const [stats, setStats] = useState<{
    newConversationsCount: number;
    employeeRepliesToday: Array<{
      employeeId: string;
      employeeName: string;
      conversationsRepliedTo: number;
    }>;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await apiClient.get("/conversations/stats/daily");
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!isOpen) return null;

  const unrepliedCount =
    stats?.newConversationsCount ??
    conversations.filter(
      (c) => c.lastMessageIsFromCustomer === true && c.status !== "done",
    ).length;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 text-card-foreground shadow-2xl rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col">
        {/* Header (Zero Emojis) */}
        <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                إحصائيات المحادثات والردود
              </h2>
              <p className="text-xs text-muted-foreground">
                متابعة حركة الرسائل وسرعة استجابة الفريق اليوم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {/* New Conversations Count Metric */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary">
                المحادثات الجديدة المعلقة
              </span>
              <p className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {loadingStats ? (
                  <span className="text-sm font-normal text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    جاري التحميل...
                  </span>
                ) : (
                  unrepliedCount
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                المحادثات الواردة من العملاء التي لم يتم الرد عليها بعد
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="w-7 h-7" />
            </div>
          </div>

          {/* Employee Replies Today */}
          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                ردود الموظفين على الرسائل اليوم
              </h3>
            </div>

            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : stats?.employeeRepliesToday &&
              stats.employeeRepliesToday.length > 0 ? (
              <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden">
                {stats.employeeRepliesToday.map((employee, index) => {
                  const initial =
                    employee.employeeName.charAt(0).toUpperCase() || "U";
                  return (
                    <div
                      key={employee.employeeId || index}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                          {initial}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {employee.employeeName}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            عضو فريق الدعم
                          </span>
                        </div>
                      </div>
                      <div className="text-left font-mono tabular-nums">
                        <span className="text-base font-bold text-foreground">
                          {employee.conversationsRepliedTo}
                        </span>
                        <span className="text-[11px] text-muted-foreground mr-1">
                          محادثة
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 rounded-xl border border-dashed border-border/70 bg-muted/15 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs">لا توجد ردود مسجلة للموظفين اليوم حتى الآن</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
