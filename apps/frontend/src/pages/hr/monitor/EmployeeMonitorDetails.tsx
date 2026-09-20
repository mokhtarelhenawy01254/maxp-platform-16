import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Calendar,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Coffee,
  Activity,
  Laptop,
  Globe,
} from 'lucide-react';
import api from '../../../services/api';
import ActivityTimelineBar from './components/ActivityTimelineBar';
import AppUsageList from './components/AppUsageList';
import WebUsageList from './components/WebUsageList';
import TaskPerformanceCard from './components/TaskPerformanceCard';
import BreakDetailsCard from './components/BreakDetailsCard';

interface EmployeeMonitorDetailsProps {
  employeeIdProp?: string;
  onBackProp?: () => void;
}

export const EmployeeMonitorDetails: React.FC<EmployeeMonitorDetailsProps> = ({
  employeeIdProp,
  onBackProp,
}) => {
  const params = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const employeeId = employeeIdProp || params.employeeId;

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary?: any;
    employee?: any;
    taskPerformance?: any;
    breaksSummary?: any;
    activities: any[];
    apps: any[];
    websites: any[];
  }>({
    activities: [],
    apps: [],
    websites: [],
  });

  const fetchDetails = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res: any = await api.get(
        `/employee-monitor/timeline/${employeeId}?date=${selectedDate}`
      );
      if (res?.data?.data) {
        setData({
          summary: res.data.data.summary,
          employee: res.data.data.employee,
          taskPerformance: res.data.data.taskPerformance,
          breaksSummary: res.data.data.breaksSummary,
          activities: res.data.data.activities || [],
          apps: res.data.data.apps || [],
          websites: res.data.data.websites || [],
        });
      }
    } catch (err) {
      console.warn('[EmployeeMonitorDetails] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedDate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleBack = () => {
    if (onBackProp) {
      onBackProp();
    } else {
      navigate('/hr/monitor');
    }
  };

  const formatSeconds = (sec: number = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h} س ${m} د`;
  };

  const employeeName = data.employee?.firstName
    ? `${data.employee.firstName} ${data.employee.lastName || ''}`.trim()
    : 'الموظف';

  const departmentName = data.employee?.department?.name || 'الإدارة العامة';
  const jobTitle = data.employee?.position?.title || 'موظف';

  const totalActive = data.summary?.totalActiveSeconds || 0;
  const totalIdle = data.summary?.totalIdleSeconds || 0;
  const prodScore = Math.round(data.summary?.productivityScore || 0);

  const clockInStr = data.summary?.clockInTime
    ? new Date(data.summary.clockInTime).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const firstActivityStr = data.summary?.firstActivityTime
    ? new Date(data.summary.firstActivityTime).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-full space-y-4 p-3 sm:p-6" dir="rtl">
      {/* Top Header Chassis */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-zinc-900/60 text-muted-foreground transition hover:bg-zinc-800 hover:text-foreground active:scale-95"
            title="العودة إلى لوحة المراقبة العامة"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                تقرير النشاط الميداني: {employeeName}
              </h1>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-400 ring-1 ring-inset ring-sky-500/20">
                {departmentName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {jobTitle} • توثيق النشاط وسجلات البرامج وتطابق الحضور
            </p>
          </div>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-zinc-900/60 px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none"
            />
          </div>

          <button
            onClick={fetchDetails}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/40 bg-zinc-900/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-zinc-800 hover:text-foreground active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Active Time */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>وقت العمل الفعلي</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {formatSeconds(totalActive)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400">
            تفاعل مستمر وموثق عبر الماوس والكيبورد
          </div>
        </div>

        {/* Idle / Break Time */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>وقت الاستراحة والتوقف</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
              <Coffee className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {formatSeconds(totalIdle)}
          </div>
          <div className="mt-1 text-[11px] text-amber-400">
            فترات راحة مصرحة وخمول معتمد
          </div>
        </div>

        {/* Productivity Score */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>معدل الإنتاجية اليومية</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/20">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {prodScore}%
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            {prodScore >= 75 ? 'مستوى أداء ممتاز' : prodScore >= 50 ? 'مستوى أداء معتدل' : 'يحتاج متابعة وتوجيه'}
          </div>
        </div>

        {/* Attendance Match */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>تسجيل الحضور الصباحي</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground tabular-nums">
            {clockInStr ? `حضور: ${clockInStr}` : 'لم يسجل حضوراً رسمياً'}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            {firstActivityStr ? `أول نشاط للجهاز: ${firstActivityStr}` : 'لا توجد حركة مسجلة'}
          </div>
        </div>
      </div>

      {/* Task Performance Analysis */}
      <TaskPerformanceCard
        taskPerformance={data.taskPerformance}
        totalActiveSeconds={totalActive}
        totalIdleSeconds={totalIdle}
      />

      {/* 24-Hour Visual Activity Heat Timeline */}
      <ActivityTimelineBar activities={data.activities} />

      {/* Detailed Breaks Analysis */}
      <BreakDetailsCard breaksSummary={data.breaksSummary} />

      {/* Apps & Web Usage Split Bento Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppUsageList apps={data.apps} totalWorkSeconds={totalActive} />
        <WebUsageList websites={data.websites} totalWorkSeconds={totalActive} />
      </div>
    </div>
  );
};

export default EmployeeMonitorDetails;
