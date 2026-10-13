import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Users,
  Clock,
  Sparkles,
  List,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertTriangle,
  FileText,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "../../components/ui/button";

interface UnifiedData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    averageCompletionTime: number;
    activeProjects: number;
    teamMembers: number;
  };
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionTrend: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  teamPerformance: Array<{
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    tasksInProgress: number;
    pendingTasks: number;
    overdueTasks: number;
    totalTasks: number;
    averageTime: number;
    completionRate: number;
  }>;
}

const DevDashboardUnified: React.FC = () => {
  const [data, setData] = useState<UnifiedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("0");

  const fetchData = useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const token = tokenManager.getAccessToken();
      if (!token) {
        setError("يجب تسجيل الدخول أولاً");
        setLoading(false);
        return;
      }

      const response = await fetch(
        buildApiUrl(`super-admin/dev/unified?period=${period}`),
        {
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        setError(`خطأ: ${response.status}`);
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "فشل في جلب البيانات");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("فشل في الاتصال بالخادم");
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedTeamPerformance = useMemo(() => {
    if (!data?.teamPerformance) return [];
    return [...data.teamPerformance].sort((a, b) => {
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      if (b.tasksInProgress !== a.tasksInProgress) {
        return b.tasksInProgress - a.tasksInProgress;
      }
      return a.memberName.localeCompare(b.memberName);
    });
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.overview)
      return {
        totalTasks: 0,
        activeProjects: 0,
        averageCompletionTime: 0,
        teamMembers: 0,
      };
    return data.overview;
  }, [data]);

  const statusData = useMemo(() => {
    if (!data?.tasksByStatus) return [];
    return Object.entries(data.tasksByStatus).map(([name, value]) => ({
      name,
      value,
    }));
  }, [data]);

  const trendData = useMemo(() => {
    return data?.completionTrend || [];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تجميع بيانات إنتاجية فريق التطوير...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 text-center my-12 shadow-2xs">
        <AlertTriangle className="size-10 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          تعذر تحميل لوحة أداء الفريق
        </h3>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Unified Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Users className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                أداء فريق التطوير
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats.teamMembers} أعضاء
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تحليل شامل لإنتاجية المهام، معدلات الإنجاز، وسرعة إغلاق التذاكر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-foreground text-xs outline-none cursor-pointer font-medium"
            >
              <option value="0">اليوم</option>
              <option value="7">آخر أسبوع</option>
              <option value="30">آخر شهر</option>
              <option value="90">آخر 3 أشهر</option>
              <option value="all">كل الفترة</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`}
            />
            <span>تحديث</span>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <Link to="/super-admin/dev-tasks">
              <List className="size-3.5" />
              <span>كل المهام</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Linear Telemetry Ribbon */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي المهام</span>
              <FileText className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.totalTasks}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">خلال الفترة المحددة</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">المشاريع النشطة</span>
              <Briefcase className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.activeProjects}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">مشاريع قيد التطوير</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متوسط زمن الإغلاق</span>
              <Clock className="size-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Math.round(stats.averageCompletionTime || 0)}{" "}
              <span className="text-xs font-sans font-normal text-muted-foreground">يوم</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">من الإنشاء للإنجاز</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أعضاء الفريق</span>
              <Users className="size-3.5 text-sky-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.teamMembers}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">مطورين ومصممين</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div className="bg-card rounded-xl p-4 border border-border/80 dark:border-border/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                توزيع المهام حسب الحالة
              </h3>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Trend */}
        <div className="lg:col-span-2 bg-card rounded-xl p-4 border border-border/80 dark:border-border/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <h3 className="text-xs font-semibold text-foreground">
                اتجاه الإنجاز (آخر 30 يوم)
              </h3>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient
                    id="colorCompleted"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="var(--color-success, #10b981)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-success, #10b981)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={"var(--color-border)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke={"var(--color-muted-foreground)"}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={"var(--color-muted-foreground)"}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="مكتملة"
                  stroke="var(--color-success, #10b981)"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="جديدة"
                  stroke="var(--color-primary, #6366f1)"
                  fillOpacity={0}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="bg-card rounded-xl p-4 border border-border/80 dark:border-border/60 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">
              مقارنة أداء أعضاء الفريق
            </h3>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={sortedTeamPerformance}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={"var(--color-border)"}
                vertical={false}
              />
              <XAxis
                dataKey="memberName"
                stroke={"var(--color-muted-foreground)"}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={"var(--color-muted-foreground)"}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
              />
              <Bar
                dataKey="tasksCompleted"
                name="مهام مكتملة"
                fill="var(--color-success, #10b981)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="tasksInProgress"
                name="قيد العمل"
                fill="var(--color-primary, #6366f1)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="overdueTasks"
                name="متأخرة"
                fill="var(--color-destructive, #ef4444)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table & Podium Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Team Performance Table */}
        <div className="xl:col-span-2 bg-card rounded-xl border border-border/80 dark:border-border/60 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
            <h3 className="text-xs font-semibold text-foreground">
              تفاصيل أداء الفريق
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="px-4 py-2.5 font-medium">العضو</th>
                  <th className="px-3 py-2.5 text-center font-medium">مكتملة</th>
                  <th className="px-3 py-2.5 text-center font-medium">قيد العمل</th>
                  <th className="px-3 py-2.5 text-center font-medium">متأخرة</th>
                  <th className="px-4 py-2.5 text-center font-medium">معدل الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {sortedTeamPerformance.map((member) => (
                  <tr
                    key={member.memberId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-sans font-medium text-foreground">
                      {member.memberName}
                    </td>
                    <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      {member.tasksCompleted}
                    </td>
                    <td className="px-3 py-3 text-center text-primary tabular-nums">
                      {member.tasksInProgress}
                    </td>
                    <td className="px-3 py-3 text-center text-destructive tabular-nums">
                      {member.overdueTasks}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              member.completionRate >= 80
                                ? "bg-emerald-500"
                                : member.completionRate >= 50
                                ? "bg-primary"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${member.completionRate}%` }}
                          />
                        </div>
                        <span className="font-bold w-9 text-right tabular-nums">
                          {member.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Podium / Best Performers */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border/80 dark:border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Award className="size-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-foreground">
                الأفضل أداءً
              </h3>
            </div>
            <div className="space-y-2">
              {sortedTeamPerformance.slice(0, 3).map((member, index) => (
                <div
                  key={member.memberId}
                  className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/40 rounded-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-xs text-foreground">
                        {member.memberName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {member.tasksCompleted} مهمة مكتملة
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {member.completionRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/80 dark:border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                الأسرع إنجازاً
              </h3>
            </div>
            <div className="space-y-2">
              {sortedTeamPerformance
                .filter((m) => m.averageTime > 0)
                .sort((a, b) => a.averageTime - b.averageTime)
                .slice(0, 3)
                .map((member) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/40 rounded-lg"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="size-3 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-xs text-foreground">
                          {member.memberName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          بمعدل إنجاز {member.completionRate}%
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary tabular-nums">
                      {Math.round(member.averageTime)} يوم
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevDashboardUnified;
