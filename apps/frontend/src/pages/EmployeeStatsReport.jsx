import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import { getApiUrl } from "../config/environment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { User, BarChart3 } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const EmployeeStatsReport = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [dateRange, setDateRange] = useState({ startDate: new Date().toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0] });

  const calculateDateRange = useCallback((period) => {
    const today = new Date();
    if (period === "custom") return dateRange;
    const ranges = { today: [today, today], yesterday: [new Date(today.setDate(today.getDate() - 1)), new Date(today)], last7days: [new Date(today.setDate(today.getDate() - 6)), new Date()], last30days: [new Date(today.setDate(today.getDate() - 29)), new Date()], thisMonth: [new Date(today.getFullYear(), today.getMonth(), 1), new Date()], lastMonth: [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] };
    const r = ranges[period] || [today, today];
    return { startDate: r[0].toISOString().split("T")[0], endDate: r[1].toISOString().split("T")[0] };
  }, [dateRange]);

  useEffect(() => { if (selectedPeriod !== "custom") setDateRange(calculateDateRange(selectedPeriod)); }, [selectedPeriod, calculateDateRange]);
  useEffect(() => { if (user?.companyId) fetchStatistics(); }, [dateRange, user?.companyId]);

  const fetchStatistics = async () => {
    if (!user?.companyId) return; setLoading(true); setError(null);
    try { const r = await fetch(`${getApiUrl()}/companies/${user.companyId}/users/statistics?${new URLSearchParams(dateRange)}`, { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) }); const d = await r.json(); if (d.success) setStatistics(d.data.statistics || []); else setError(d.message || "فشل في جلب الإحصائيات"); } catch (err) { setError("حدث خطأ"); } finally { setLoading(false); }
  };

  const totals = { conversations: statistics.reduce((s, st) => s + st.conversationsCount, 0), orders: statistics.reduce((s, st) => s + (st.ordersCount || 0), 0), conversion: statistics.length > 0 ? (statistics.reduce((s, st) => s + (st.conversionRate || 0), 0) / statistics.length).toFixed(1) : 0 };

  if (loading && statistics.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <h1 className="text-2xl font-bold mb-1">📊 تقارير أداء الموظفين</h1>
      <p className="text-sm text-muted-foreground mb-3">إحصائيات أداء الموظفين في الرد على رسائل الفيسبوك</p>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card className="mb-3"><CardContent><div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}><SelectTrigger><SelectValue placeholder="الفترة الزمنية" /></SelectTrigger><SelectContent><SelectItem value="today">اليوم</SelectItem><SelectItem value="yesterday">أمس</SelectItem><SelectItem value="last7days">آخر 7 أيام</SelectItem><SelectItem value="last30days">آخر 30 يوم</SelectItem><SelectItem value="thisMonth">الشهر الحالي</SelectItem><SelectItem value="lastMonth">الشهر السابق</SelectItem><SelectItem value="custom">فترة مخصصة</SelectItem></SelectContent></Select>
        {selectedPeriod === "custom" && <><Input type="date" value={dateRange.startDate} onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} /><Input type="date" value={dateRange.endDate} onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} /></>}
        <Button onClick={fetchStatistics} disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : <BarChart3 className="size-4" />} تحديث الإحصائيات</Button>
      </div></CardContent></Card>

      {statistics.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[{ l: "إجمالي الموظفين", v: statistics.length }, { l: "إجمالي المحادثات", v: totals.conversations }, { l: "إجمالي الطلبات", v: totals.orders }, { l: "متوسط نسبة التحويل", v: `${totals.conversion}%` }].map((c, i) =>
          <Card key={i}><CardContent><p className="text-sm text-muted-foreground">{c.l}</p><p className="text-2xl font-bold">{c.v}</p></CardContent></Card>
        )}
      </div>}

      <Card className="mb-3"><CardHeader><CardTitle>إحصائيات الموظفين ({statistics.length})</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead className="text-center">عدد المحادثات</TableHead><TableHead className="text-center">عدد الرسائل</TableHead><TableHead className="text-center">عدد الطلبات</TableHead><TableHead className="text-center">نسبة التحويل</TableHead></TableRow></TableHeader>
          <TableBody>{statistics.map(st => <TableRow key={st.userId}>
            <TableCell><div className="flex items-center gap-2"><div className="size-8 rounded-full bg-muted flex items-center justify-center"><User className="size-4" /></div><div><p className="font-medium">{st.firstName} {st.lastName}</p></div></div></TableCell>
            <TableCell className="text-center font-bold text-primary">{st.conversationsCount}</TableCell>
            <TableCell className="text-center font-bold">{st.messagesCount}</TableCell>
            <TableCell className="text-center font-bold text-green-600">{st.ordersCount || 0}</TableCell>
            <TableCell className="text-center"><Badge variant={st.conversionRate >= 50 ? "default" : st.conversionRate >= 30 ? "secondary" : "destructive"}>{st.conversionRate || 0}%</Badge></TableCell>
          </TableRow>)}</TableBody></Table>
      </CardContent></Card>

      {statistics.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card><CardContent><h3 className="text-sm font-semibold mb-2">عدد المحادثات لكل موظف</h3>
          <ResponsiveContainer width="100%" height={300}><BarChart data={statistics.map(st => ({ name: `${st.firstName} ${st.lastName}`, conversations: st.conversationsCount }))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} /><YAxis /><RechartsTooltip /><Legend /><Bar dataKey="conversations" fill="#8884d8" name="المحادثات" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardContent><h3 className="text-sm font-semibold mb-2">توزيع المحادثات</h3>
          <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={statistics.map((st, i) => ({ name: `${st.firstName} ${st.lastName}`, value: st.conversationsCount, fill: COLORS[i % COLORS.length] }))} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{statistics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>
        </CardContent></Card>
      </div>}
    </div>
  );
};

export default EmployeeStatsReport;