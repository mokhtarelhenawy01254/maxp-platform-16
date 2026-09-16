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
} from 'lucide-react';
import api from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [stats, setStats] = useState({
    totalTracked: 0,
    activeNow: 0,
    avgProductivity: 0,
    totalHoursTracked: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/employee-monitor/team/overview?date=${selectedDate}`);
      const data = response.data?.data || [];

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
    } catch (err) {
      console.error('Failed to fetch monitor data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

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
