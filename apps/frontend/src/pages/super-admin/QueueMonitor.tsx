import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "../../components/ui/card";
import {
  RefreshCw,
  Activity,
  XCircle,
  Download,
} from "lucide-react";
import { exportToExcel } from "../../utils/exportHelpers";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  QueueJobDetailModal,
  type RecentJob,
} from "./QueueJobDetailModal";
import {
  QueueAnalyticsChart,
  type QueueMetric,
} from "./QueueAnalyticsChart";
import {
  QueueRecentJobsStream,
  type QueueJobFilter,
} from "./QueueRecentJobsStream";

interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface MonitorData {
  success: boolean;
  stats: {
    webhookProcessing: QueueStats;
  };
  recentJobs: RecentJob[];
  timestamp: string;
}

export default function QueueMonitor() {
  const [filter, setFilter] = useState<QueueJobFilter>("all");
  const [data, setData] = useState<MonitorData | null>(null);
  const [history, setHistory] = useState<QueueMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedJob, setSelectedJob] = useState<RecentJob | null>(null);
  const [timeRange, setTimeRange] = useState<"1" | "7">("1");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, historyRes] = await Promise.all([
        apiClient.get("/monitor-admin/queues", { params: { type: filter } }),
        apiClient.get("/monitor-admin/history", {
          params: { days: timeRange },
        }),
      ]);

      setData(statsRes.data);
      setHistory(historyRes.data.history || []);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.error || "فشل تحميل البيانات من الخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [filter, timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, filter, timeRange]);

  const stats = data?.stats.webhookProcessing;
  const recentJobs = data?.recentJobs || [];

  const handleExport = () => {
    if (!recentJobs.length) return;
    exportToExcel(
      recentJobs,
      [
        { key: "id", label: "المعرف (ID)" },
        { key: "name", label: "النوع" },
        { key: "status", label: "الحالة" },
        { key: "finishedOn", label: "الوقت" },
        { key: "data", label: "البيانات" },
      ],
      `queue-jobs-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Activity className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              مراقبة طوابير العمليات والمهام
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              BullMQ Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة لحظية لمعالجة الـ Webhooks، بوالص الشحن، وإرسال الرسائل غير المتزامنة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap font-mono text-xs">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-8 px-2.5 text-xs font-mono gap-1.5 active:scale-[0.98]"
          >
            <Activity className={`size-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
            <span>{autoRefresh ? "تحديث تلقائي: نشط" : "تحديث يدوي"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            disabled={loading}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={recentJobs.length === 0}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.98]"
          >
            <Download className="size-3.5" />
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-2 text-destructive text-xs font-mono">
            <XCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Telemetry Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "قيد المعالجة", value: stats.active, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500 animate-pulse" },
            { label: "في الانتظار", value: stats.waiting, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
            { label: "مكتملة بنجاح", value: stats.completed, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
            { label: "فاشلة", value: stats.failed, color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
            { label: "مؤجلة", value: stats.delayed, color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
            { label: "متوقفة مؤقتاً", value: stats.paused, color: "text-muted-foreground", dot: "bg-muted-foreground" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="text-[11px] font-mono">{item.label}</span>
                <span className={`size-1.5 rounded-full ${item.dot}`} />
              </div>
              <div className={`text-xl font-bold tracking-tight font-mono tabular-nums ${item.color}`}>
                {item.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bento Grid: Analytics Chart + Recent Jobs Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <QueueAnalyticsChart
          history={history}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
        />

        <QueueRecentJobsStream
          recentJobs={recentJobs}
          filter={filter}
          setFilter={setFilter}
          onSelectJob={(job) => setSelectedJob(job)}
        />
      </div>

      {data?.timestamp && (
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] font-mono text-muted-foreground">
            آخر مزامنة للطابور: {new Date(data.timestamp).toLocaleString("ar-EG")}
          </p>
        </div>
      )}

      {/* Job Details Modal */}
      <QueueJobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
