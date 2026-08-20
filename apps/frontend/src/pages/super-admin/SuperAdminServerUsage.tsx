import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { apiClient } from "../../services/apiClient";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { HardDrive, RefreshCw, PieChart as PieChartIcon, Info, Server, Cloud, Cpu, Gauge, Settings, BarChart3, Image, Video, Music, FileText, MoreHorizontal } from "lucide-react";

const formatSize = (bytes: number) => {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const SuperAdminServerUsage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try { setLoading(true); setError(null); const r = await apiClient.get("/super-admin/server-usage"); if (r.status === 200 && r.data.success) setStats(r.data.data); else setError(r.data.message || "فشل في جلب إحصائيات السيرفر"); } catch { setError("حدث خطأ أثناء الاتصال بالخادم"); } finally { setLoading(false); }
  };

  if (loading && !stats) return <div className="flex justify-center items-center min-h-[60vh]"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><LoadingSpinner size="xl" /></motion.div></div>;

  const chartData = stats ? [{ name: "المساحة المستخدمة", value: stats.used, color: "var(--color-primary)" }, { name: "المساحة الفارغة", value: stats.free, color: "var(--color-muted)" }] : [];
  const breakdownData = stats?.breakdown ? [{ name: "الصور", value: stats.breakdown.images, color: "var(--color-primary)", icon: <Image className="size-4" /> }, { name: "الفيديوهات", value: stats.breakdown.videos, color: "var(--color-destructive)", icon: <Video className="size-4" /> }, { name: "الصوتيات", value: stats.breakdown.audio, color: "var(--color-secondary)", icon: <Music className="size-4" /> }, { name: "المستندات", value: stats.breakdown.documents, color: "var(--color-warning)", icon: <FileText className="size-4" /> }, { name: "أخرى", value: stats.breakdown.other, color: "var(--color-muted-foreground)", icon: <MoreHorizontal className="size-4" /> }] : [];

  return (
    <div className="p-4 rtl min-h-full bg-gradient-to-br from-transparent via-transparent to-blue-50/50 dark:to-slate-900/50">
      <div className="flex justify-between items-center mb-4">
        <div><h1 className="text-3xl font-black bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">تحليل استهلاك القرص</h1><p className="text-sm font-medium text-muted-foreground">مراقبة حية وتفصيلية لموارد التخزين</p></div>
        <div className="p-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all cursor-pointer" onClick={fetchStats}><RefreshCw className="size-5" /></div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-destructive shadow-lg">{error}</div>}

      {stats && <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 * 0.1 }} className="lg:col-span-1">
          <Card className="h-full backdrop-blur-xl border overflow-hidden"><CardContent className="p-4">
            <h2 className="font-bold flex items-center gap-1 mb-3"><PieChartIcon className="size-4 text-blue-500" /> نظرة عامة</h2>
            <div className="relative min-h-[280px] w-full"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={100} stroke="none" paddingAngle={8} dataKey="value" startAngle={90} endAngle={-270}>{chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                <p className="text-3xl font-black text-primary">{stats.usagePercent}%</p>
                <p className="text-xs font-semibold text-muted-foreground">نسبة الاستهلاك</p>
              </motion.div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-3"><div className="text-center"><p className="text-lg font-bold">{formatSize(stats.used)}</p><p className="text-xs text-muted-foreground">المستخدم</p></div><Separator orientation="vertical" className="h-10" /><div className="text-center"><p className="text-lg font-bold text-green-600">{formatSize(stats.free)}</p><p className="text-xs text-green-600">المتاح</p></div></div>
          </CardContent></Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 * 0.1 }} className="lg:col-span-2">
          <Card className="h-full backdrop-blur-xl border"><CardContent className="p-4">
            <h2 className="font-bold flex items-center gap-1 mb-4"><BarChart3 className="size-4 text-blue-500" /> توزيع مساحة الملفات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">{breakdownData.map((item, i) => <div key={i}><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-1" style={{ color: item.color }}>{item.icon}<span className="text-sm font-bold">{item.name}</span></div><span className="text-sm font-bold">{formatSize(item.value)}</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(item.value / stats.used) * 100}%`, backgroundColor: item.color }} /></div></div>)}</div>
              <div><ResponsiveContainer width="100%" height={200}><BarChart data={breakdownData} layout="vertical" margin={{ left: -20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fontWeight: 700 }} /><RechartsTooltip formatter={(value: number) => formatSize(value)} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{breakdownData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
          </CardContent></Card>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 col-span-1 lg:col-span-3">
          {[{ icon: <HardDrive className="size-6" />, label: "نظام التشغيل", value: stats.platform, iconClass: "bg-blue-500/10 text-blue-500" }, { icon: <Settings className="size-6" />, label: "اسم القرص", value: "القرص المحلي (Root)", iconClass: "bg-green-500/10 text-green-500" }, { icon: <RefreshCw className="size-6" />, label: "آخر تحديث", value: new Date(stats.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }), iconClass: "bg-amber-500/10 text-amber-500" }].map((item, i) => <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 2) * 0.1 }}><Card className="h-full border"><CardContent><div className="flex items-center gap-2"><div className={cn("p-3 rounded-xl", item.iconClass)}>{item.icon}</div><div><p className="text-xs font-semibold text-muted-foreground">{item.label}</p><p className="text-base font-bold">{item.value}</p></div></div></CardContent></Card></motion.div>)}
        </div>
      </div>}

      <AnimatePresence>{stats && stats.usagePercent > 80 && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 32 }} exit={{ opacity: 0, height: 0 }}>
        <div className="p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
          <div className="flex items-center gap-2"><div className="p-3 rounded-full bg-red-500 text-white animate-pulse"><Info className="size-5" /></div><div><p className="font-bold text-red-500">تنبيه: مساحة التخزين حرجة ({stats.usagePercent}%)</p><p className="text-sm text-muted-foreground">نوصي بحذف الفيديوهات القديمة أو الصور المؤرشفة لتوفير مساحة إضافية.</p></div></div>
        </div>
      </motion.div>}</AnimatePresence>
    </div>
  );
};

export default SuperAdminServerUsage;