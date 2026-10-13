import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/utils";
import {
  HardDrive, RefreshCw, PieChart as PieChartIcon, Server, Cpu,
  BarChart3, Image, Video, Music, FileText, MoreHorizontal, AlertTriangle, Activity
} from "lucide-react";

const formatSize = (bytes: number) => {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const SuperAdminServerUsage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await apiClient.get("/super-admin/server-usage");
      if (r.status === 200 && r.data.success) {
        setStats(r.data.data);
      } else {
        setError(r.data?.message || "فشل في جلب إحصائيات السيرفر");
      }
    } catch {
      setError("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const chartData = stats ? [
    { name: "المساحة المستخدمة", value: stats.used || (stats.disk?.used ?? 0), color: "#3b82f6" },
    { name: "المساحة الفارغة", value: stats.free || (stats.disk?.free ?? 0), color: "hsl(var(--muted))" }
  ] : [];

  const breakdown = stats?.breakdown || {
    images: stats?.media?.images?.size || 0,
    videos: stats?.media?.videos?.size || 0,
    audio: stats?.media?.audio?.size || 0,
    documents: stats?.media?.documents?.size || 0,
    other: 0,
  };

  const totalUsed = stats?.used || stats?.disk?.used || 1;
  const usagePercentage = stats?.usagePercent || stats?.disk?.usagePercentage || 0;

  const breakdownData = [
    { name: "الصور", value: breakdown.images, color: "#3b82f6", icon: <Image className="size-3.5" /> },
    { name: "الفيديوهات", value: breakdown.videos, color: "#ef4444", icon: <Video className="size-3.5" /> },
    { name: "الصوتيات", value: breakdown.audio, color: "#8b5cf6", icon: <Music className="size-3.5" /> },
    { name: "المستندات", value: breakdown.documents, color: "#f59e0b", icon: <FileText className="size-3.5" /> },
    { name: "أخرى", value: breakdown.other, color: "#64748b", icon: <MoreHorizontal className="size-3.5" /> },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Server className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">تحليل استهلاك موارد السيرفر</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                مراقبة لحظية
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">مراقبة حية وتفصيلية لمساحة التخزين والذاكرة والعتاد السحابي</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span>تحديث الإحصائيات</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Telemetry Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">إجمالي سعة التخزين</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {formatSize(stats.total || stats.disk?.total)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">سعة القرص الصلب الكلية</p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">المساحة المستخدمة</span>
                <span className="size-1.5 rounded-full bg-sky-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {formatSize(stats.used || stats.disk?.used)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{usagePercentage}% من الإجمالي</p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">المساحة المتاحة</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {formatSize(stats.free || stats.disk?.free)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">جاهزة للرفع والتخزين</p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">نسبة استهلاك القرص</span>
                <span className={cn("size-1.5 rounded-full", usagePercentage > 80 ? "bg-rose-500" : "bg-emerald-500")} />
              </div>
              <div className={cn("text-2xl font-bold tracking-tight font-mono tabular-nums", usagePercentage > 80 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                {usagePercentage}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مؤشر أمان القرص</p>
            </div>
          </div>

          {/* Charts Row Chassis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Donut Chart */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">نظرة عامة على القرص</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">{usagePercentage}% مستهلك</Badge>
              </div>

              <div className="relative min-h-[200px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      stroke="none"
                      paddingAngle={4}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{usagePercentage}%</p>
                  <p className="text-[10px] text-muted-foreground">الاستهلاك</p>
                </div>
              </div>

              <div className="flex items-center justify-around border-t border-border/60 pt-3 mt-1">
                <div className="text-center">
                  <p className="text-xs font-bold font-mono tabular-nums text-foreground">{formatSize(stats.used || stats.disk?.used)}</p>
                  <p className="text-[10px] text-muted-foreground">المستخدم</p>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center">
                  <p className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatSize(stats.free || stats.disk?.free)}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">المتاح</p>
                </div>
              </div>
            </div>

            {/* Distribution Bar Chart */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs lg:col-span-2">
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground">توزيع مساحة الملفات والوسائط</h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">تخزين السيرفر المحلي</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-2.5">
                  {breakdownData.map((item, i) => {
                    const pct = totalUsed > 0 ? ((item.value / totalUsed) * 100).toFixed(1) : "0";
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5" style={{ color: item.color }}>
                            {item.icon}
                            <span className="font-medium text-foreground text-xs">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="font-semibold text-foreground tabular-nums">{formatSize(item.value)}</span>
                            <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="h-[180px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownData} layout="vertical" margin={{ left: -15, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={65} tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => formatSize(value)}
                        contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {breakdownData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Host Specs Chassis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary shrink-0">
                <Cpu className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">نظام التشغيل والمعالج</p>
                <p className="text-xs font-semibold text-foreground truncate font-mono">{stats.platform || stats.cpu?.model || "Linux x86_64"}</p>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary shrink-0">
                <HardDrive className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">القرص ونقطة الربط</p>
                <p className="text-xs font-semibold text-foreground font-mono">القرص المحلي (Root /)</p>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-primary shrink-0">
                <Activity className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">آخر فحص لحظي</p>
                <p className="text-xs font-semibold text-foreground font-mono">
                  {stats.timestamp ? new Date(stats.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "الآن"}
                </p>
              </div>
            </div>
          </div>

          {/* Critical Warning if > 80% */}
          {usagePercentage > 80 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">تنبيه: مساحة التخزين تقترب من الحد الأقصى ({usagePercentage}%)</p>
                <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">يوصى بأرشفة مقاطع الفيديو القديمة أو الصور غير المستخدمة لضمان استقرار الخادم.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SuperAdminServerUsage;