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
    <div className="p-6 space-y-6 bg-slate-50/50" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            مراقبة النظام
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            إحصائيات الأداء في الوقت الفعلي والعمليات التاريخية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border rounded-lg p-1 shadow-sm">
            <Button
              variant={autoRefresh ? "default" : "ghost"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs h-8"
            >
              <Activity
                className={`w-3.5 h-3.5 ml-1.5 ${autoRefresh ? "animate-pulse" : ""}`}
              />
              {autoRefresh ? "تحديث تلقائي" : "تحديث يدوي"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-xs h-8"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
            <div className="w-px h-4 bg-slate-200 self-center mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={recentJobs.length === 0}
              className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="w-3.5 h-3.5 ml-1.5" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-red-200 bg-red-50/50 backdrop-blur-sm">
            <CardContent className="pt-6 flex items-center gap-3 text-red-600">
              <XCircle className="w-5 h-5" />
              <p className="font-medium text-sm">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "قيد المعالجة",
              value: stats.active,
              icon: Activity,
              color: "text-blue-500",
              bg: "bg-blue-50",
            },
            {
              label: "في الانتظار",
              value: stats.waiting,
              icon: Clock,
              color: "text-yellow-500",
              bg: "bg-yellow-50",
            },
            {
              label: "مكتملة",
              value: stats.completed,
              icon: CheckCircle2,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              label: "فاشلة",
              value: stats.failed,
              icon: XCircle,
              color: "text-rose-500",
              bg: "bg-rose-50",
            },
            {
              label: "مؤجلة",
              value: stats.delayed,
              icon: Clock,
              color: "text-orange-500",
              bg: "bg-orange-50",
            },
            {
              label: "متوقفة",
              value: stats.paused,
              icon: Pause,
              color: "text-slate-500",
              bg: "bg-slate-50",
            },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 space-y-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-500">
                      {item.label}
                    </CardTitle>
                    <div className={`p-1.5 rounded-lg ${item.bg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {item.value.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Historical Analytics Chart */}
        <Card className="lg:col-span-8 border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold">
                تحليلات الأداء
              </CardTitle>
            </div>
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              <Button
                variant={timeRange === "1" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTimeRange("1")}
                className={`text-xs h-7 px-3 ${timeRange === "1" ? "bg-white shadow-sm" : ""}`}
              >
                ٢٤ ساعة
              </Button>
              <Button
                variant={timeRange === "7" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTimeRange("7")}
                className={`text-xs h-7 px-3 ${timeRange === "7" ? "bg-white shadow-sm" : ""}`}
              >
                ٧ أيام
              </Button>
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
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
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
                          stopColor="#ef4444"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey={timeRange === "1" ? "time" : "date"}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      minTickGap={40}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        padding: "12px",
                      }}
                      labelStyle={{
                        fontWeight: "bold",
                        marginBottom: "8px",
                        color: "#1e293b",
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
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      name="الفاشلة"
                      dataKey="failed"
                      stroke="#ef4444"
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
        <Card className="lg:col-span-4 border-none shadow-sm overflow-hidden flex flex-col bg-white">
          <CardHeader className="border-b bg-slate-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">
                العمليات الأخيرة
              </CardTitle>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 no-scrollbar">
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === item.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white border text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-auto max-h-[450px]">
            <AnimatePresence mode="popLayout">
              {recentJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 text-slate-400"
                >
                  <Info className="w-8 h-8 mb-2 opacity-10" />
                  <p className="text-sm">لا توجد عمليات حالياً</p>
                </motion.div>
              ) : (
                <div className="space-y-1.5">
                  {recentJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedJob(job)}
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="shrink-0 p-2.5 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-white transition-colors">
                          {job.name === "facebook-message" && (
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                          )}
                          {job.name === "facebook-read-receipt" && (
                            <CheckCheck className="w-4 h-4 text-emerald-500" />
                          )}
                          {job.name === "facebook-comment" && (
                            <MessageCircle className="w-4 h-4 text-purple-500" />
                          )}
                          {![
                            "facebook-message",
                            "facebook-read-receipt",
                            "facebook-comment",
                          ].includes(job.name) && (
                            <Activity className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-700 leading-tight">
                            {job.name.replace("facebook-", "")}
                          </span>
                          <span
                            className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]"
                            title={job.data}
                          >
                            {job.data}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col items-end">
                          {job.finishedOn && (
                            <span className="text-[10px] text-slate-400 font-medium">
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
                                    : "bg-rose-500"
                            }`}
                          />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {data?.timestamp && (
        <div className="flex items-center justify-center gap-2 py-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            آخر تحديث للبيانات:{" "}
            {new Date(data.timestamp).toLocaleString("ar-EG")}
          </p>
        </div>
      )}

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedJob(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b bg-slate-50/50 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border shadow-sm">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      تفاصيل المهمة
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      المعرف (Job ID)
                    </p>
                    <p className="text-sm font-mono text-slate-700 bg-white p-2 rounded border">
                      {selectedJob.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      النوع
                    </p>
                    <p className="text-sm font-bold text-slate-700 bg-white p-2 rounded border">
                      {selectedJob.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      الحالة
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 ${
                        selectedJob.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedJob.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : selectedJob.status === "waiting"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                      }`}
                    >
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      الوقت
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {selectedJob.finishedOn
                        ? new Date(selectedJob.finishedOn).toLocaleString(
                            "ar-EG",
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-800">
                    حزمة البيانات (Payload):
                  </p>
                  <div
                    className="bg-slate-900 text-blue-100 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[200px]"
                    dir="ltr"
                  >
                    <pre>
                      {JSON.stringify(selectedJob.rawPayload || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {selectedJob.failedReason && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-rose-600">
                      سبب الفشل:
                    </p>
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs font-medium border border-rose-100">
                      {selectedJob.failedReason}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 pt-0">
                <Button
                  className="w-full h-11 rounded-xl font-bold"
                  onClick={() => setSelectedJob(null)}
                >
                  إغلاق النافذة
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
