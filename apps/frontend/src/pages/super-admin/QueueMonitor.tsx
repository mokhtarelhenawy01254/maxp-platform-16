import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  MessageSquare,
  CheckCheck,
  MessageCircle,
  BarChart3,
  History,
  Info,
  ChevronRight,
  Download,
  XCircle as XCircleIcon,
} from "lucide-react";
import { exportToExcel } from "../../utils/exportHelpers";
import { Button } from "../../components/ui/button";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface RecentJob {
  id: string;
  name: string;
  data: string;
  status: string;
  finishedOn?: number;
  failedReason?: string;
  rawPayload?: any;
}

interface QueueMetric {
  id: string;
  completed: number;
  failed: number;
  timestamp: string;
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
  const [filter, setFilter] = useState<
    "all" | "message" | "read" | "comment" | "failed"
  >("all");
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
    fetchData();
  }, [filter, timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000); // 10 seconds for real-time feel
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

  const formatChartData = (items: QueueMetric[]) => {
    return items.map((item) => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(item.timestamp).toLocaleDateString("ar-EG", {
        day: "2-digit",
        month: "2-digit",
      }),
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Activity className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                مراقبة طوابير العمليات والمهام
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Queue Monitor
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة لحظية لمعالجة الـ Webhooks، بوالص الشحن، وإرسال الرسائل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-8 text-xs font-mono gap-1.5 active:scale-[0.98]"
          >
            <Activity className={`size-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
            <span>{autoRefresh ? "تحديث تلقائي" : "تحديث يدوي"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 text-xs font-mono gap-1.5 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={recentJobs.length === 0}
            className="h-8 text-xs font-mono gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.98]"
          >
            <Download className="size-3.5" />
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="rounded-xl border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-2 text-destructive text-xs font-mono">
            <XCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Single-Surface 6-Metric Telemetry Ribbon */}
      {stats && (
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
            {[
              {
                label: "قيد المعالجة",
                value: stats.active,
                dot: "bg-blue-500 animate-pulse",
              },
              {
                label: "في الانتظار",
                value: stats.waiting,
                dot: "bg-amber-500",
              },
              {
                label: "مكتملة",
                value: stats.completed,
                dot: "bg-emerald-500",
              },
              {
                label: "فاشلة",
                value: stats.failed,
                dot: "bg-rose-500",
              },
              {
                label: "مؤجلة",
                value: stats.delayed,
                dot: "bg-orange-500",
              },
              {
                label: "متوقفة",
                value: stats.paused,
                dot: "bg-muted-foreground",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">{item.label}</span>
                  <span className={`size-1.5 rounded-full ${item.dot}`} />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {item.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bento Grid: Analytics Chart + Recent Jobs Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Historical Analytics Chart */}
        <Card className="lg:col-span-8 rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground">
                تحليلات الأداء التاريخية
              </CardTitle>
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setTimeRange("1")}
                className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${timeRange === "1" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                24 ساعة
              </button>
              <button
                onClick={() => setTimeRange("7")}
                className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${timeRange === "7" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                7 أيام
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={formatChartData(history)}>
                    <defs>
                      <linearGradient
                        id="colorCompleted"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-success)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-success)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorFailed"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-destructive)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-destructive)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-muted)"
                    />
                    <XAxis
                      dataKey={timeRange === "1" ? "time" : "date"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      minTickGap={40}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        padding: "12px",
                      }}
                      labelStyle={{
                        fontWeight: "bold",
                        marginBottom: "8px",
                        color: "var(--color-foreground)",
                      }}
                    />
                    <Legend
                      align="right"
                      verticalAlign="top"
                      height={40}
                      iconType="circle"
                    />
                    <Area
                      type="monotone"
                      name="الناجحة"
                      dataKey="completed"
                      stroke="var(--color-success)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      name="الفاشلة"
                      dataKey="failed"
                      stroke="var(--color-destructive)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorFailed)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-10" />
                  <div className="text-center">
                    <p className="font-semibold text-slate-600">
                      جاري جمع البيانات التاريخية...
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      ستظهر البيانات فور اكتمال أول عملية تسجيل آلي
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs List */}
        <Card className="lg:col-span-4 rounded-xl border border-border/80 bg-card overflow-hidden flex flex-col shadow-xs">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground">
                تدفق العمليات اللحظي
              </CardTitle>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex gap-1 mt-2.5 overflow-x-auto pb-0.5 no-scrollbar">
              {[
                { id: "all", label: "الكل" },
                { id: "message", label: "رسائل" },
                { id: "read", label: "قراءة" },
                { id: "comment", label: "تعليقات" },
                { id: "failed", label: "فاشلة" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id as any)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                    filter === item.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-auto max-h-[420px]">
            <AnimatePresence mode="popLayout">
              {recentJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Info className="w-6 h-6 mb-1.5 opacity-30" />
                  <p className="text-xs font-mono">لا توجد عمليات مسجلة في هذا التصنيف</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all cursor-pointer bg-card/60"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="shrink-0 p-1.5 rounded-md bg-muted/60 border border-border/40 text-muted-foreground group-hover:text-foreground transition-colors">
                          {job.name === "facebook-message" && (
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          {job.name === "facebook-read-receipt" && (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          {job.name === "facebook-comment" && (
                            <MessageCircle className="w-3.5 h-3.5 text-purple-500" />
                          )}
                          {![
                            "facebook-message",
                            "facebook-read-receipt",
                            "facebook-comment",
                          ].includes(job.name) && (
                            <Activity className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground leading-tight truncate">
                            {job.name.replace("facebook-", "")}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]"
                            title={job.data}
                          >
                            {job.data}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end">
                          {job.finishedOn && (
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                              {new Date(job.finishedOn).toLocaleTimeString(
                                "ar-EG",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          )}
                          <div
                            className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                              job.status === "completed"
                                ? "bg-emerald-500"
                                : job.status === "active"
                                  ? "bg-blue-500 animate-pulse"
                                  : job.status === "waiting"
                                    ? "bg-amber-500 animate-bounce"
                                    : "bg-destructive"
                            }`}
                          />
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {data?.timestamp && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] font-mono text-muted-foreground">
            آخر تحديث للحالة: {new Date(data.timestamp).toLocaleString("ar-EG")}
          </p>
        </div>
      )}

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-xs"
              onClick={() => setSelectedJob(null)}
            />
            <div
              className="relative bg-card border border-border rounded-xl max-w-lg w-full overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-border/60 bg-muted/20 p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded-md border border-border/50 text-primary">
                      <Info className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      تفاصيل مهمة الطابور
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">
                      المعرف (Job ID)
                    </p>
                    <p className="text-xs font-mono font-medium text-foreground bg-card p-1.5 rounded border border-border/50 truncate">
                      {selectedJob.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">
                      النوع
                    </p>
                    <p className="text-xs font-mono font-medium text-foreground bg-card p-1.5 rounded border border-border/50 truncate">
                      {selectedJob.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">
                      الحالة
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                        selectedJob.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : selectedJob.status === "active"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : selectedJob.status === "waiting"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {selectedJob.status === "completed"
                        ? "ناجحة"
                        : selectedJob.status === "active"
                          ? "قيد التنفيذ"
                          : selectedJob.status === "waiting"
                            ? "في الانتظار"
                            : "فاشلة"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">
                      الوقت
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {selectedJob.finishedOn
                        ? new Date(selectedJob.finishedOn).toLocaleString(
                            "ar-EG",
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-mono text-foreground font-semibold">
                    حزمة البيانات (Payload):
                  </p>
                  <div
                    className="bg-muted/40 border border-border/60 text-foreground p-3 rounded-lg text-[11px] font-mono overflow-auto max-h-[180px]"
                    dir="ltr"
                  >
                    <pre>
                      {JSON.stringify(selectedJob.rawPayload || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {selectedJob.failedReason && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-mono text-destructive font-semibold">
                      سبب الفشل:
                    </p>
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-xs font-mono border border-destructive/20">
                      {selectedJob.failedReason}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 pt-0">
                <Button
                  className="w-full h-8 text-xs font-mono rounded-lg"
                  onClick={() => setSelectedJob(null)}
                >
                  إغلاق النافذة
                </Button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
