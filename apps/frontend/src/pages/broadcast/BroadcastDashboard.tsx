import React, { useState, useEffect } from "react";
import CreateCampaign from "./CreateCampaign";
import ScheduledCampaigns from "./ScheduledCampaigns";
import CampaignAnalytics from "./CampaignAnalytics";
import CustomerListsManager from "./CustomerListsManager";
import BroadcastSettings from "./BroadcastSettings";
import {
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { broadcastService, Campaign } from "../../services/broadcastService";
import { socketService } from "../../services/socketService";
import { useDateFormat } from "../../hooks/useDateFormat";
import { cn } from "../../lib/utils";

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  campaignsThisMonth: number;
}

const BroadcastDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "create" | "scheduled" | "analytics" | "lists" | "settings"
  >("overview");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatDate } = useDateFormat();

  useEffect(() => {
    // 🚀 Initialize Socket.IO connection
    console.log("🔌 [BROADCAST] Initializing Socket.IO connection");
    if (!socketService.isConnected()) {
      socketService.connect();
      console.log("✅ [BROADCAST] Socket.IO connected");
    } else {
      console.log("✅ [BROADCAST] Socket.IO already connected");
    }

    loadData();

    // Cleanup on unmount
    return () => {
      console.log("🔌 [BROADCAST] Component unmounting");
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load campaigns and stats from API
      const [campaignsData, statsData] = await Promise.all([
        broadcastService.getCampaigns(),
        broadcastService.getAnalytics(),
      ]);

      // Extract campaigns array from response
      const campaignsArray = Array.isArray(campaignsData)
        ? campaignsData
        : Array.isArray(campaignsData?.campaigns)
          ? campaignsData.campaigns
          : [];
      setCampaigns(campaignsArray);

      // Map analytics data to match CampaignStats interface
      const mappedStats: CampaignStats = {
        totalCampaigns: statsData.totalCampaigns || 0,
        activeCampaigns: statsData.activeCampaigns || 0,
        totalRecipients: statsData.totalRecipients || 0,
        averageOpenRate: statsData.averageOpenRate || 0,
        averageClickRate: statsData.averageClickRate || 0,
        campaignsThisMonth: statsData.campaignsThisMonth || 0,
      };
      setStats(mappedStats);
    } catch (error) {
      console.error("Error loading broadcast data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "draft":
        return "text-muted-foreground border-border/70 bg-muted/40";
      case "scheduled":
        return "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10";
      case "sent":
        return "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
      case "cancelled":
        return "text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10";
      default:
        return "text-muted-foreground border-border/70 bg-muted/40";
    }
  };

  const getStatusDot = (status: Campaign["status"]) => {
    switch (status) {
      case "draft":
        return "bg-slate-400";
      case "scheduled":
        return "bg-blue-500";
      case "sent":
        return "bg-emerald-500";
      case "cancelled":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusText = (status: Campaign["status"]) => {
    switch (status) {
      case "draft":
        return "مسودة";
      case "scheduled":
        return "مجدولة";
      case "sent":
        return "تم الإرسال";
      case "cancelled":
        return "ملغية";
      default:
        return status;
    }
  };

  const tabs = [
    { id: "overview", name: "نظرة عامة", icon: ChartBarIcon },
    { id: "create", name: "إنشاء حملة", icon: PlusIcon },
    { id: "scheduled", name: "الحملات المجدولة", icon: CalendarIcon },
    { id: "analytics", name: "الإحصائيات", icon: ChartBarIcon },
    { id: "lists", name: "قوائم العملاء", icon: UserGroupIcon },
    { id: "settings", name: "الإعدادات", icon: Cog6ToothIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <MegaphoneIcon className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                لوحة البرودكاست
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {stats?.activeCampaigns ?? 0} حملة نشطة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة حملات الرسائل الجماعية ومتابعة معدلات الفتح والتفاعل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <PlusIcon className="size-3.5" />
            <span>حملة جديدة</span>
          </button>
        </div>
      </div>

      {/* Segmented Pill Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer active:scale-[0.98]",
                isActive
                  ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Unified Telemetry Strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">إجمالي الحملات</span>
                    <span className="size-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {stats.totalCampaigns}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">حملات نشطة</span>
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                      {stats.activeCampaigns}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">إجمالي المستلمين</span>
                    <span className="size-1.5 rounded-full bg-purple-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {stats.totalRecipients.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">معدل الفتح</span>
                    <span className="size-1.5 rounded-full bg-indigo-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                      {stats.averageOpenRate}%
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">معدل النقر</span>
                    <span className="size-1.5 rounded-full bg-teal-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-teal-600 dark:text-teal-400">
                      {stats.averageClickRate}%
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">حملات هذا الشهر</span>
                    <span className="size-1.5 rounded-full bg-amber-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                      {stats.campaignsThisMonth}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Campaigns Single Chassis */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <MegaphoneIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">الحملات الأخيرة</h3>
                </div>
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {campaigns.length} حملة مسجلة
                </span>
              </div>

              {campaigns.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  لا توجد حملات مسجلة بعد
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <li key={campaign.id} className="hover:bg-muted/30 transition-colors">
                      <div className="px-4 py-3 sm:px-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-8 rounded-lg border border-border/70 bg-muted/40 flex items-center justify-center shrink-0">
                            <MegaphoneIcon className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {campaign.name}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                              {campaign.recipientCount} مستلم • {formatDate(campaign.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border",
                              getStatusColor(campaign.status)
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", getStatusDot(campaign.status))} />
                            {getStatusText(campaign.status)}
                          </span>
                          {campaign.openRate ? (
                            <span className="text-xs font-mono tabular-nums text-muted-foreground">
                              {campaign.openRate}% فتح
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === "create" && <CreateCampaign />}

        {activeTab === "scheduled" && <ScheduledCampaigns />}

        {activeTab === "analytics" && <CampaignAnalytics />}

        {activeTab === "lists" && <CustomerListsManager />}

        {activeTab === "settings" && <BroadcastSettings />}
      </div>
    </div>
  );
};

export default BroadcastDashboard;
