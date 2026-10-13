import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Sliders, RefreshCw, Activity, Shield, KeyRound, Cpu, Power, PowerOff, CheckCircle2, Search, Filter } from "lucide-react";
import { cn } from "../lib/utils";

const SuperAdminSystemManagement = () => {
  const [systems, setSystems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(new Set());
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => { fetchSystems(); }, []);

  const fetchSystems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(buildApiUrl("admin/systems"), {
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" })
      });
      const data = await response.json();
      if (data.success) {
        setSystems(data.data.systems || []);
        setStats(data.data.stats || null);
      } else {
        setError(data.message || "فشل في جلب الأنظمة");
      }
    } catch {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const toggleSystem = async (systemName, currentStatus) => {
    try {
      setUpdating(p => new Set(p).add(systemName));
      setError(null);
      setSuccess(null);
      const response = await fetch(buildApiUrl(`admin/systems/${systemName}/toggle`), {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ isEnabled: !currentStatus })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`تم ${!currentStatus ? "تفعيل" : "تعطيل"} النظام بنجاح`);
        await fetchSystems();
      } else {
        setError(data.message || "فشل في تغيير حالة النظام");
      }
    } catch {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setUpdating(p => {
        const n = new Set(p);
        n.delete(systemName);
        return n;
      });
    }
  };

  const filteredSystems = useMemo(() => {
    return systems.filter(sys => {
      const matchesSearch = !searchTerm ||
        sys.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sys.systemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sys.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === "all" || (sys.category || "general") === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [systems, searchTerm, categoryFilter]);

  const groupedSystems = useMemo(() => {
    return filteredSystems.reduce((acc, system) => {
      const cat = system.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(system);
      return acc;
    }, {});
  }, [filteredSystems]);

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
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Sliders className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                إدارة أنظمة وخدمات المنصة
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                تحكم لحظي
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تبديل ومراقبة حالة البوابات والخدمات السحابية والأنظمة الفرعية بدون إعادة تشغيل
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSystems}
          disabled={loading}
          className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span>تحديث</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 ml-1.5 inline" />
          <AlertDescription className="inline text-xs">{success}</AlertDescription>
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
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">خدمات مسجلة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أنظمة مفعلة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.enabled ?? systems.filter(s => s.isEnabled).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تعمل بكفاءة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أنظمة معطلة</span>
              <span className="size-1.5 rounded-full bg-rose-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {stats.disabled ?? systems.filter(s => !s.isEnabled).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">موقوفة يدوياً</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">فئات الأنظمة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {Object.keys(stats.byCategory || groupedSystems).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">نطاقات تشغيلية</p>
          </div>
        </div>
      )}

      {/* Search and Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pr-8 text-xs font-mono bg-background/50"
            placeholder="بحث بالاسم أو المعرف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "الكل" },
            { id: "monitoring", label: "المراقبة" },
            { id: "security", label: "الأمان" },
            { id: "api_keys", label: "المفاتيح" },
            { id: "general", label: "عامة" },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={categoryFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCategoryFilter(tab.id)}
              className="h-7 px-2.5 text-xs font-mono"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Systems Categories Chassis */}
      <div className="space-y-3.5">
        {Object.entries(groupedSystems).length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-card/40 p-10 text-center text-xs font-mono text-muted-foreground">
            لا توجد أنظمة مطابقة لخيارات البحث
          </div>
        ) : (
          Object.entries(groupedSystems).map(([category, categorySystems]) => {
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

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-b border-border/60">
                        <TableHead className="text-[11px] font-mono text-right">النظام</TableHead>
                        <TableHead className="text-[11px] font-mono text-right">الوصف التشغيلي</TableHead>
                        <TableHead className="text-[11px] font-mono text-center">استهلاك الموارد</TableHead>
                        <TableHead className="text-[11px] font-mono text-center">الحالة</TableHead>
                        <TableHead className="text-[11px] font-mono text-center w-28">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySystems.map(system => {
                        const isUpdating = updating.has(system.systemName);
                        return (
                          <TableRow key={system.systemName} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                            <TableCell>
                              <div>
                                <p className="text-xs font-semibold text-foreground">{system.displayName}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{system.systemName}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs text-muted-foreground max-w-md">{system.description}</p>
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
                                className="h-7 text-[11px] font-mono px-3 active:scale-[0.98] transition-transform gap-1"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="size-3 animate-spin" />
                                ) : system.isEnabled ? (
                                  <>
                                    <PowerOff className="size-3 text-rose-500" />
                                    <span>تعطيل</span>
                                  </>
                                ) : (
                                  <>
                                    <Power className="size-3 text-emerald-500" />
                                    <span>تفعيل</span>
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SuperAdminSystemManagement;