import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Sliders, RefreshCw, Activity, Shield, KeyRound, Cpu, Power, PowerOff, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

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
      if (data.success) { setSystems(data.data.systems || []); setStats(data.data.stats || null); }
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
    const cat = system.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(system);
    return acc;
  }, {});

  const getCategoryMeta = (category) => {
    switch (category) {
      case "monitoring":
        return { label: "أنظمة المراقبة والرصد", icon: Activity };
      case "security":
        return { label: "أنظمة الأمان والامتثال", icon: Shield };
      case "api_keys":
        return { label: "أنظمة مفاتيح الذكاء الاصطناعي (API)", icon: KeyRound };
      default:
        return { label: "أنظمة وخدمات عامة", icon: Cpu };
    }
  };

  if (loading && systems.length === 0) {
    return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Sliders className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">إدارة أنظمة وخدمات المنصة</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                تحكم حي
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">تبديل ومراقبة حالة البوابات والخدمات السحابية والأنظمة الفرعية</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSystems}
          disabled={loading}
          className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform"
        >
          <RefreshCw className={cn("ml-1.5 size-3.5", loading && "animate-spin")} />
          تحديث
        </Button>
      </div>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && (
        <Alert className="mb-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 ml-1.5 inline" />
          <AlertDescription className="inline">{success}</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الأنظمة</span>
              <span className="size-1.5 rounded-full bg-indigo-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.total ?? systems.length}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أنظمة مفعلة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.enabled ?? systems.filter(s => s.isEnabled).length}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أنظمة معطلة</span>
              <span className="size-1.5 rounded-full bg-rose-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {stats.disabled ?? systems.filter(s => !s.isEnabled).length}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">فئات الأنظمة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.keys(stats.byCategory || groupedSystems).length}
            </div>
          </div>
        </div>
      )}

      {/* Systems Categories Chassis */}
      <div className="space-y-3.5">
        {Object.entries(groupedSystems).map(([category, categorySystems]) => {
          const meta = getCategoryMeta(category);
          const Icon = meta.icon;

          return (
            <div key={category} className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md border border-border/70 bg-muted/40 flex items-center justify-center text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <h2 className="text-xs font-semibold text-foreground">{meta.label}</h2>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {categorySystems.length} نظام
                </Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] font-mono">النظام</TableHead>
                    <TableHead className="text-[11px] font-mono">الوصف</TableHead>
                    <TableHead className="text-[11px] font-mono text-center">استهلاك الموارد</TableHead>
                    <TableHead className="text-[11px] font-mono text-center">الحالة</TableHead>
                    <TableHead className="text-[11px] font-mono text-center w-28">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySystems.map(system => {
                    const isUpdating = updating.has(system.systemName);
                    return (
                      <TableRow key={system.systemName} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{system.displayName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{system.systemName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">{system.description}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border/70 bg-muted/30">
                            {system.config?.resourceUsage || "خفيف"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium",
                            system.isEnabled
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border/80"
                          )}>
                            <span className={cn("size-1.5 rounded-full", system.isEnabled ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                            {system.isEnabled ? "مفعل" : "معطل"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={system.isEnabled ? "outline" : "default"}
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => toggleSystem(system.systemName, system.isEnabled)}
                            className="h-7 text-[11px] font-mono px-3 active:scale-[0.98] transition-transform"
                          >
                            {isUpdating ? (
                              <RefreshCw className="size-3 animate-spin" />
                            ) : system.isEnabled ? (
                              <>
                                <PowerOff className="ml-1 size-3 text-rose-500" />
                                تعطيل
                              </>
                            ) : (
                              <>
                                <Power className="ml-1 size-3 text-emerald-500" />
                                تفعيل
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminSystemManagement;