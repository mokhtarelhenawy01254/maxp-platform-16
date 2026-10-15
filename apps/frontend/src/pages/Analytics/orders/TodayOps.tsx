import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RotateCw,
  Sparkles,
  Calendar,
  AlertCircle,
  Activity,
} from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import { Button } from "../../../components/ui/button";
import { PageData } from "./todayOpsTypes";
import { TodayOpsActionsTab } from "./TodayOpsActionsTab";
import { TodayOpsSnapshotTab } from "./TodayOpsSnapshotTab";

export default function TodayOps() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapDate, setSnapDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [tab, setTab] = useState<"actions" | "snapshot">("actions");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (snapDate) params.snapshotDate = snapDate;
        const qs = new URLSearchParams(params).toString();
        const res = await analyticsService.getTodayOps(qs);
        setData(res?.data || null);
      } catch {
        setError("فشل تحميل تقرير عمليات اليوم");
      } finally {
        setLoading(false);
      }
    },
    [snapDate],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const actions = data?.todayActions || {
    confirms: 0,
    cancels: 0,
    total: 0,
    team: [],
    feed: [],
  };
  const snapshot = data?.daySnapshot || {
    date: "",
    totalOrders: 0,
    regular: 0,
    guests: 0,
    pendingList: [],
    pendingListGuests: [],
    statusBreakdown: [],
    hourly: [],
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              عمليات وتشغيل اليوم
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              مباشر (٣٠ ث)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة حركة التأكيدات والإلغاءات اللحظية ونشاط فريق خدمة العملاء
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Linear Segmented Tabs */}
          <div className="inline-flex items-center rounded-lg bg-muted/50 p-1 border border-border/70 text-xs">
            <button
              onClick={() => setTab("actions")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                tab === "actions"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 inline ml-1.5 text-indigo-500" />
              شغل النهارده
            </button>
            <button
              onClick={() => setTab("snapshot")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                tab === "snapshot"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 inline ml-1.5 text-blue-500" />
              تقرير يوم
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            className="h-7 text-xs"
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Tab 1: Actions */}
      {tab === "actions" && <TodayOpsActionsTab actions={actions} />}

      {/* Tab 2: Snapshot */}
      {tab === "snapshot" && (
        <TodayOpsSnapshotTab
          snapshot={snapshot}
          snapDate={snapDate}
          onDateChange={setSnapDate}
        />
      )}
    </div>
  );
}
