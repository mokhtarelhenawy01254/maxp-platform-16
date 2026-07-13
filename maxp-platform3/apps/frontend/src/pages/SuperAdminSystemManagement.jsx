import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuthSimple";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

const SuperAdminSystemManagement = () => {
  const [systems, setSystems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(new Set());
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { fetchSystems(); }, []);

  const fetchSystems = async () => {
    try {
      setLoading(true); setError(null);
      const response = await fetch(buildApiUrl("admin/systems"), { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) { setSystems(data.data.systems); setStats(data.data.stats); }
      else setError(data.message || "فشل في جلب الأنظمة");
    } catch (err) { setError("فشل في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  const toggleSystem = async (systemName, currentStatus) => {
    try {
      setUpdating(p => new Set(p).add(systemName)); setError(null); setSuccess(null);
      const response = await fetch(buildApiUrl(`admin/systems/${systemName}/toggle`), {
        method: "POST", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ isEnabled: !currentStatus })
      });
      const data = await response.json();
      if (data.success) { setSuccess(`تم ${!currentStatus ? "تفعيل" : "تعطيل"} النظام بنجاح`); await fetchSystems(); }
      else setError(data.message || "فشل في تغيير حالة النظام");
    } catch (err) { setError("فشل في الاتصال بالخادم"); } finally { setUpdating(p => { const n = new Set(p); n.delete(systemName); return n; }); }
  };

  const groupedSystems = systems.reduce((acc, system) => {
    if (!acc[system.category]) acc[system.category] = [];
    acc[system.category].push(system);
    return acc;
  }, {});

  if (loading && systems.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">🔧 إدارة أنظمة النظام</h1><div className="flex gap-2"><Button variant="outline" onClick={fetchSystems} disabled={loading}>تحديث</Button></div></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="mb-2"><AlertDescription>{success}</AlertDescription></Alert>}
      {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[{ l: "إجمالي الأنظمة", v: stats.total }, { l: "أنظمة مفعلة", v: stats.enabled, c: "text-green-600" }, { l: "أنظمة معطلة", v: stats.disabled, c: "text-red-600" }, { l: "فئات الأنظمة", v: Object.keys(stats.byCategory).length, c: "text-yellow-600" }].map((c, i) =>
          <div key={i} className="rounded-xl border bg-card p-4 text-center"><p className={`text-2xl font-bold ${c.c || ""}`}>{c.v}</p><p className="text-sm text-muted-foreground">{c.l}</p></div>
        )}
      </div>}
      {Object.entries(groupedSystems).map(([category, categorySystems]) => (
        <div key={category} className="rounded-xl border bg-card mb-3">
          <div className="p-4"><h2 className="text-base font-bold mb-2">{category === "monitoring" ? "📊 أنظمة المراقبة" : category === "security" ? "🔒 أنظمة الأمان" : category === "api_keys" ? "🔑 أنظمة مفاتيح API" : "⚙️ أنظمة عامة"} <Badge>{categorySystems.length} نظام</Badge></h2>
          <Table><TableHeader><TableRow><TableHead>النظام</TableHead><TableHead>الوصف</TableHead><TableHead className="text-center">استهلاك الموارد</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{categorySystems.map(system => <TableRow key={system.systemName}>
            <TableCell><p className="font-bold">{system.displayName}</p><p className="text-xs text-muted-foreground">{system.systemName}</p></TableCell>
            <TableCell><p className="text-sm">{system.description}</p></TableCell>
            <TableCell className="text-center"><Badge variant="outline">{system.config?.resourceUsage || "غير محدد"}</Badge></TableCell>
            <TableCell className="text-center"><Badge variant={system.isEnabled ? "default" : "secondary"}>{system.isEnabled ? "مفعل" : "معطل"}</Badge></TableCell>
            <TableCell className="text-center">
              <Button variant="ghost" size="sm" disabled={updating.has(system.systemName)} onClick={() => toggleSystem(system.systemName, system.isEnabled)}>
                {system.isEnabled ? "تعطيل" : "تفعيل"}
              </Button>
            </TableCell>
          </TableRow>)}</TableBody></Table>
        </div></div>
      ))}
    </div>
  );
};

export default SuperAdminSystemManagement;