import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Users,
  Clock,
  Laptop,
  Globe,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ShieldAlert,
  Sparkles,
  Archive,
} from 'lucide-react';
import api from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../hooks/useAuthSimple';

interface TeamMemberSummary {
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  status: 'active' | 'idle' | 'offline';
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  productivityScore: number;
  lastHeartbeat?: string;
  topApp?: string;
}

export const MonitorDashboard: React.FC = () => {
  const { user } = useAuth();
  const roleStr = String(user?.role || '').toUpperCase();
  const isManagerOrHR = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'OWNER', 'MANAGER'].includes(roleStr);
  const isSuperOrOwner = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(roleStr);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [aiStandup, setAiStandup] = useState<{
    date?: string;
    headline?: string;
    summary?: string;
    telemetry?: any;
    attentionFlags?: string[];
  } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalTracked: 0,
    activeNow: 0,
    avgProductivity: 0,
    totalHoursTracked: 0,
  });

  const fetchData = useCallback(async () => {
    if (!isManagerOrHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [overviewRes, aiRes] = await Promise.allSettled([
        api.get(`/employee-monitor/team/overview?date=${selectedDate}`),
        api.get(`/employee-monitor/ai-standup?date=${selectedDate}`),
      ]);

      if (overviewRes.status === 'fulfilled') {
        const data = overviewRes.value.data?.data || [];
        let totalActiveSec = 0;
        let totalProdScore = 0;
        let activeCount = 0;

        const formatted: TeamMemberSummary[] = data.map((item: any) => {
          totalActiveSec += item.totalActiveSeconds || 0;
          totalProdScore += item.productivityScore || 0;
          if (item.status === 'active') activeCount++;

          return {
            employeeId: item.employeeId,
            employeeName: item.employee?.firstName
              ? `${item.employee.firstName} ${item.employee.lastName || ''}`
              : item.employeeId,
            departmentName: item.employee?.department?.name || 'General',
            status: item.status || 'offline',
            totalActiveSeconds: item.totalActiveSeconds || 0,
            totalIdleSeconds: item.totalIdleSeconds || 0,
            productivityScore: Math.round(item.productivityScore || 0),
            lastHeartbeat: item.lastActivityTime,
            topApp: item.topApps ? Object.keys(JSON.parse(item.topApps || '{}'))[0] : undefined,
          };
        });

        setTeamMembers(formatted);
        setStats({
          totalTracked: formatted.length,
          activeNow: activeCount,
          avgProductivity: formatted.length ? Math.round(totalProdScore / formatted.length) : 0,
          totalHoursTracked: Math.round((totalActiveSec / 3600) * 10) / 10,
        });
      }

      if (aiRes.status === 'fulfilled' && aiRes.value.data?.data) {
        setAiStandup(aiRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch monitor data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isManagerOrHR]);

  const handleArchiveLogs = async () => {
    if (!window.confirm('هل تريد أرشفة وتفريغ السجلات اللحظية الأقدم من 60 يوماً؟ (يتم الاحتفاظ بالملخصات اليومية دائماً)')) {
      return;
    }
    setArchiving(true);
    setArchiveSuccess(null);
    try {
      const res = await api.post('/employee-monitor/admin/retention-archive', { retentionDays: 60 });
      setArchiveSuccess(`تم تفريغ ${res.data?.prunedCounts?.activityLogs ?? 0} سجل لحظي بنجاح.`);
      setTimeout(() => setArchiveSuccess(null), 5000);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشلت أرشفة السجلات');
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = teamMembers.filter((m) =>
    (m.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.departmentName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isManagerOrHR) {
    return (
      <div className="flex items-center justify-center min-h-[65vh] p-4">
        <Card className="max-w-md w-full border-border/40 bg-card/60 backdrop-blur text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">صلاحية إدارية مطلوبة</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              لوحة متابعة نشاط وإنتاجية الفريق مخصصة لمدراء الموارد البشرية ومسؤولي الأقسام فقط.
              يمكنك متابعة مهامك الموكلة وحضورك الشخصي عبر صفحة المهام الخاصة بك.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/tasks'}
            className="w-full text-xs"
          >
            الانتقال إلى قائمة مهامي
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>لوحة مراقبة أداء وإنتاجية الموظفين</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة حية للنشاط، البرامج، والمواقع مع حساب الوقت الفعلي ونسبة الإنتاجية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-38 text-xs font-mono"
          />
          {isSuperOrOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveLogs}
              disabled={archiving}
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
              title="أرشفة السجلات الأقدم من 60 يوماً لحماية سرعة قاعدة البيانات"
            >
              <Archive className={`w-3.5 h-3.5 ${archiving ? 'animate-spin' : ''}`} />
              <span>{archiving ? 'جاري الأرشفة...' : 'أرشفة السجلات (+60 يوم)'}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Archive Feedback Toast */}
      {archiveSuccess && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span>{archiveSuccess}</span>
        </div>
      )}

      {/* AI Daily Standup Digest */}
      {aiStandup && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-l from-primary/5 via-card to-card p-4 sm:p-5 shadow-sm transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
                <Sparkles className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground">الملخص التنفيذي الذكي للفريق (AI Standup)</span>
                <span className="text-[10px] text-muted-foreground mr-2 font-mono">
                  {new Date(aiStandup.date || selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[10px] font-medium">
                {aiStandup.headline}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed sm:text-sm font-normal">
            {aiStandup.summary}
          </p>

          {/* Attention Points / Flags if any */}
          {aiStandup.attentionFlags && aiStandup.attentionFlags.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                تنبيهات المتابعة:
              </span>
              {aiStandup.attentionFlags.map((flag: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/40 bg-card/50 shadow-none">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">الموظفون المتابعون</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tabular-nums text-foreground">{stats.totalTracked}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">مسجلين على نظام الديسكتوب</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 shadow-none">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">نشطون الآن</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tabular-nums text-emerald-500">{stats.activeNow}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">حركة ماوس وكيبورد جارية</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 shadow-none">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">متوسط الإنتاجية</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tabular-nums text-foreground">{stats.avgProductivity}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">معدل البرامج والمواقع المنتجة</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/50 shadow-none">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">إجمالي ساعات العمل</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tabular-nums text-foreground">{stats.totalHoursTracked}h</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">ساعات نشطة فعلية اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Employee List Table */}
      <Card className="border border-border/40 bg-card/50 overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground font-medium">
              <tr>
                <th className="p-3">الموظف</th>
                <th className="p-3">القسم</th>
                <th className="p-3">الحالة الحالية</th>
                <th className="p-3">الوقت الفعلي</th>
                <th className="p-3">الوقت الخامل</th>
                <th className="p-3">معدل الإنتاجية</th>
                <th className="p-3">البرنامج الرئيسي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    لا توجد بيانات تتبع مسجلة لهذا التاريخ حتى الآن.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.employeeId} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">
                      {m.employeeName}
                    </td>
                    <td className="p-3 text-muted-foreground">{m.departmentName}</td>
                    <td className="p-3">
                      {m.status === 'active' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] font-normal">
                          نشط الآن
                        </Badge>
                      )}
                      {m.status === 'idle' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[11px] font-normal">
                          خامل
                        </Badge>
                      )}
                      {m.status === 'offline' && (
                        <Badge variant="outline" className="bg-muted/20 text-muted-foreground border-border text-[11px] font-normal">
                          غير متصل
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 tabular-nums font-mono text-emerald-400">
                      {formatSeconds(m.totalActiveSeconds)}
                    </td>
                    <td className="p-3 tabular-nums font-mono text-amber-400">
                      {formatSeconds(m.totalIdleSeconds)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.productivityScore >= 70
                                ? 'bg-emerald-500'
                                : m.productivityScore >= 40
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, m.productivityScore)}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-mono">{m.productivityScore}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[140px]">
                      {m.topApp || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MonitorDashboard;
