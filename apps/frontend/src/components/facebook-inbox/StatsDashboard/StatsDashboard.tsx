import React, { useState, useEffect } from "react";

import { InboxConversation } from "../../../types/inbox.types";
import { XMarkIcon } from "@heroicons/react/24/outline";
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

  // Fetch statistics when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="business-modal-surface w-full max-w-5xl h-[80vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div
          className="p-4 border-b flex justify-between items-center sticky top-0 z-10"
          style={{
            background: "var(--business-surface-panel)",
            borderColor: "var(--business-muted-line)",
          }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--color-foreground)" }}
          >
            📊 إحصائيات المحادثات
          </h2>
          <button onClick={onClose} className="business-chip-button dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* New Conversations Count */}
          <div
            className="business-metric-card"
            data-tone="primary"
            style={{ padding: "1.5rem" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-sm font-medium mb-1"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  المحادثات الجديدة
                </h3>
                <p
                  className="text-4xl font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {loadingStats ? (
                    <span className="text-lg">جاري التحميل...</span>
                  ) : (
                    (stats?.newConversationsCount ??
                    conversations.filter(
                      (c) =>
                        c.lastMessageIsFromCustomer === true &&
                        c.status !== "done",
                    ).length)
                  )}
                </p>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  المحادثات التي لم يتم الرد عليها
                </p>
              </div>
              <div
                className="text-6xl opacity-20"
                style={{ color: "var(--color-primary)" }}
              >
                💬
              </div>
            </div>
          </div>

          {/* Employee Replies Today */}
          <div className="business-page-panel rounded-[24px] p-6">
            <h3
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: "var(--color-foreground)" }}
            >
              <span>📈</span>
              <span>ردود الموظفين اليوم</span>
            </h3>
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: "var(--color-primary)" }}
                ></div>
              </div>
            ) : stats?.employeeRepliesToday &&
              stats.employeeRepliesToday.length > 0 ? (
              <div className="space-y-3">
                {stats.employeeRepliesToday.map((employee, index) => (
                  <div
                    key={employee.employeeId || index}
                    className="flex items-center justify-between p-4 rounded-lg transition-colors"
                    style={{
                      background:
                        "var(--business-surface-subtle, rgba(255, 255, 255, 0.05))",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)",
                        }}
                      >
                        {employee.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {employee.employeeName}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          موظف
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: "var(--color-secondary)" }}
                      >
                        {employee.conversationsRepliedTo}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        محادثة
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-center py-8"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <p>لا توجد ردود اليوم</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
