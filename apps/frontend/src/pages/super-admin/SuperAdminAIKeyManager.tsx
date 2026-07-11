import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../../components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Plus, Trash2, Copy, FlaskConical, Search, RefreshCw,
  Eye, EyeOff, Check, X,
  Activity, CheckCircle2, XCircle, Zap, Gauge, Loader2,
  ChevronUp,
  Info, ArrowUpDown, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight, History,
} from "lucide-react";
import { useAiProviders, useAiKeys, useAiDashboard } from "../../hooks/useAiAdminData";
import {
  useCreateKey,
  useToggleKeyStatus,
  useDeleteKey,
  useTestKey,
  useUpdateKey,
} from "../../hooks/useKeyMutations";
import { aiAdminService } from "../../services/aiAdminService";
import type {
  AiKey, AiProvider, DashboardStats,
  AiKeyUpdatePayload, AiKeyLog, CreateAiKeyPayload,
} from "../../types/ai-admin";

type SortKey = "name" | "provider" | "key_type" | "is_active" | "current_usage" | "created_at";
type SortDir = "asc" | "desc";
interface SortConfig { key: SortKey; dir: SortDir; }

function SuperAdminAIKeyManager() {
  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">إدارة مفاتيح الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted-foreground mt-1">عرض وإدارة مفاتيح API لمزودي الذكاء الاصطناعي</p>
      </div>
      <KeyManagerContent />
    </div>
  );
}

function sortKeys(keys: AiKey[], sort: SortConfig | null): AiKey[] {
  if (!sort) return keys;
  const k = sort.key;
  const d = sort.dir === "asc" ? 1 : -1;
  return [...keys].sort((a, b) => {
    let av: unknown = a[k], bv: unknown = b[k];
    if (k === "is_active") { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0; }
    if (k === "current_usage") { av = a.current_usage ?? 0; bv = b.current_usage ?? 0; }
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
    return cmp * d;
  });
}

function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: SortConfig | null; onSort: (k: SortKey) => void }) {
  const active = sort?.key === sortKey;
  return (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => onSort(sortKey)}>
      <span className="flex items-center gap-1">
        {label}
        {active && sort ? (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-muted-foreground/50" />}
      </span>
    </TableHead>
  );
}

function StatCard({ label, value, icon, color, large }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; large?: boolean;
}) {
  const [bg, iconBg] = color.split("|");
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className={`${large ? "p-4" : "p-3"} relative overflow-hidden`}>
        <div className={`absolute inset-y-0 right-0 w-1 ${bg} rounded-r`} />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${large ? "text-2xl" : ""}`}>{value}</p>
          </div>
          <div className={`size-9 rounded-xl ${iconBg} flex items-center justify-center ring-1 ring-black/5`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsGrid({ dashboard }: { dashboard: DashboardStats }) {
  const providerCount = Object.keys(dashboard.keys_by_provider).length;
  const rate = dashboard.last_24h_success_rate;
  const rateColor = rate >= 95 ? "bg-green-500" : rate >= 80 ? "bg-yellow-500" : "bg-red-500";
  const rateTextColor = rate >= 95 ? "text-green-600" : rate >= 80 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="mb-6">
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="col-span-4 md:col-span-2 lg:col-span-1">
          <StatCard label="إجمالي المفاتيح" value={dashboard.total_keys} icon={<Activity className="size-4.5 text-blue-600" />} color="bg-blue-500/10|bg-blue-50 dark:bg-blue-950" large />
        </div>
        <StatCard label="النشطة" value={dashboard.active_keys} icon={<CheckCircle2 className="size-4.5 text-green-600" />} color="bg-green-500/10|bg-green-50 dark:bg-green-950" />
        <StatCard label="المزودون" value={providerCount} icon={<Zap className="size-4.5 text-purple-600" />} color="bg-purple-500/10|bg-purple-50 dark:bg-purple-950" />
        <StatCard label="طلبات اليوم" value={dashboard.requests_today} icon={<Activity className="size-4.5 text-amber-600" />} color="bg-amber-500/10|bg-amber-50 dark:bg-amber-950" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center ring-1 ring-black/5 shrink-0">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium tracking-wide">فشل اليوم</p>
              <p className="text-lg font-bold text-red-600">{dashboard.failures_today}</p>
            </div>
            <div className="mr-auto text-left">
              <p className="text-xs text-muted-foreground font-medium tracking-wide">نسبة النجاح</p>
              <p className={`text-lg font-bold ${rateTextColor}`}>{rate}%</p>
              <div className="mt-1 h-1 w-24 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${rateColor}`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/40 to-transparent dark:from-blue-950/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center ring-1 ring-black/5 shrink-0">
              <Gauge className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium tracking-wide">حالة النظام</p>
              <p className="text-lg font-bold">{dashboard.active_keys}/{dashboard.total_keys} نشط</p>
              <p className="text-xs text-muted-foreground mt-0.5">{providerCount} مزودون · {dashboard.requests_today + dashboard.failures_today} طلب اليوم</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollapsibleSection({ icon, title, badge, children, action }: {
  icon: React.ReactNode; title: string; badge?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 bg-card rounded-xl border-0 shadow-sm overflow-hidden transition-all duration-200">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground transition-transform duration-200" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
            <ChevronUp className="size-4" />
          </span>
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function KeyDetailDrawer({ key: k, open, onClose }: { key: AiKey; open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<AiKeyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const usagePct = k.max_requests_per_day ? Math.round((k.current_usage / k.max_requests_per_day) * 100) : 0;
  const usageColor = usagePct >= 85 ? "text-red-600" : usagePct >= 60 ? "text-yellow-600" : "text-green-600";

  React.useEffect(() => {
    if (!open) return;
    setLogsLoading(true);
    aiAdminService.getKeyLogs({ key_id: k.id, limit: 20 }).then((res) => {
      setLogs(Array.isArray(res) ? res : res.items ?? []);
    }).catch(() => {
      setLogs([]);
    }).finally(() => setLogsLoading(false));
  }, [open, k.id]);

  const statusBadge = k.is_active
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <div className="bg-gradient-to-b from-muted/30 to-transparent px-4 pt-6 pb-4">
          <SheetHeader className="px-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              {k.name}
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${statusBadge}`}>{k.is_active ? "نشط" : "غير نشط"}</span>
            </SheetTitle>
          </SheetHeader>
        </div>
        <div className="p-4 space-y-6">
          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-muted/20 ring-1 ring-border">
              <span className="text-xs text-muted-foreground">المزود</span>
              <p className="font-medium text-sm mt-0.5">{k.provider}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 ring-1 ring-border">
              <span className="text-xs text-muted-foreground">النوع</span>
              <p className="font-medium text-sm mt-0.5">{k.key_type === "CENTRAL" ? "مركزي" : "شركة"}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 ring-1 ring-border">
              <span className="text-xs text-muted-foreground">الأولوية</span>
              <p className="font-medium text-sm mt-0.5">{k.priority ?? 1}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 ring-1 ring-border">
              <span className="text-xs text-muted-foreground">المفتاح</span>
              <p className="font-mono text-xs mt-0.5 truncate" dir="ltr">{k.api_key_masked || "-"}</p>
            </div>
          </div>

          {/* Usage */}
          <div className="p-3 rounded-xl bg-muted/20 ring-1 ring-border">
            <span className="text-xs text-muted-foreground">الاستخدام اليومي</span>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2.5 bg-muted/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${usagePct >= 85 ? "bg-red-500" : usagePct >= 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
              </div>
              <span className={`text-xs font-medium shrink-0 ${usageColor}`}>{k.current_usage}/{k.max_requests_per_day}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            {k.created_at && (
              <div className="flex-1 p-3 rounded-xl bg-muted/20 ring-1 ring-border">
                <span className="text-xs text-muted-foreground">تاريخ الإنشاء</span>
                <p className="font-medium text-sm mt-0.5">{new Date(k.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {k.last_used_at && (
              <div className="flex-1 p-3 rounded-xl bg-muted/20 ring-1 ring-border">
                <span className="text-xs text-muted-foreground">آخر استخدام</span>
                <p className="font-medium text-sm mt-0.5">{new Date(k.last_used_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Models */}
          {k.models && k.models.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">الموديلات</h4>
              <div className="flex flex-wrap gap-1.5">
                {k.models.map((m) => (
                  <span key={m.id} className={`text-xs px-2 py-1 rounded-lg font-medium ${m.is_enabled ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted/40 text-muted-foreground ring-1 ring-border"}`}>{m.model_name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><History className="size-3.5" />سجل الاستخدام</h4>
            {logsLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد سجلات</p>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/20 ring-1 ring-border text-xs">
                    <span className={`inline-block size-1.5 rounded-full shrink-0 ${log.status === "ok" || log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="flex-1 truncate font-medium">{log.action}{log.model ? <span className="text-muted-foreground font-normal"> — {log.model}</span> : ""}</span>
                    {log.latency_ms != null && <span className="text-muted-foreground shrink-0">{log.latency_ms}ms</span>}
                    <span className="text-muted-foreground shrink-0 text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KeyManagerContent() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading: providersLoading, error: providersError } = useAiProviders();
  const { data: keys, isLoading: keysLoading, error: keysError } = useAiKeys();
  const { data: dashboard, isLoading: dashboardLoading } = useAiDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [sort, setSort] = useState<SortConfig | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiKey | null>(null);
  const [testTarget, setTestTarget] = useState<{ key: AiKey; result?: unknown; error?: string } | null>(null);
  const [editTarget, setEditTarget] = useState<AiKey | null>(null);
  const [detailTarget, setDetailTarget] = useState<AiKey | null>(null);

  const createKeyMutation = useCreateKey();
  const toggleStatusMutation = useToggleKeyStatus();
  const deleteKeyMutation = useDeleteKey();
  const testKeyMutation = useTestKey();
  const updateKeyMutation = useUpdateKey();

  const providerList = useMemo(() => {
    if (!Array.isArray(providers)) return [];
    return providers
      .filter((p): p is AiProvider => p != null && typeof p.name === "string")
      .map((p) => p.name)
      .filter((name, i, arr) => arr.indexOf(name) === i);
  }, [providers]);

  const filteredKeys = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    const sq = searchQuery.toLowerCase().trim();
    return keys.filter((k) => {
      if (sq && !k.name.toLowerCase().includes(sq)) return false;
      if (providerFilter && k.provider !== providerFilter) return false;
      return true;
    });
  }, [keys, searchQuery, providerFilter]);

  const sortedKeys = useMemo(() => sortKeys(filteredKeys, sort), [filteredKeys, sort]);

  const allSelected = filteredKeys.length > 0 && selectedIds.size === filteredKeys.length;

  function handleSort(key: SortKey) {
    setSort((prev) => prev?.key === key ? (prev.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredKeys.map((k) => k.id)));
  }

  function handleToggle(key: AiKey) {
    toggleStatusMutation.mutate({ id: key.id, isActive: !key.is_active });
  }
  function handleBulkToggle(activate: boolean) {
    selectedIds.forEach((id) => toggleStatusMutation.mutate({ id, isActive: activate }));
    setSelectedIds(new Set());
  }
  function handleBulkDelete() {
    selectedIds.forEach((id) => deleteKeyMutation.mutate(id));
    setSelectedIds(new Set());
  }
  function handleDelete() {
    if (!deleteTarget) return;
    deleteKeyMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  }
  function handleTest(key: AiKey) {
    testKeyMutation.mutate(key.id, {
      onSuccess: (result) => setTestTarget({ key, result }),
      onError: (err: any) => setTestTarget({ key, error: err?.message || "فشل الاختبار" }),
    });
  }
  function handleCopyKey(apiKey?: string, masked?: string) {
    const keyToCopy = apiKey || masked;
    if (!keyToCopy) { toast.error("المفتاح غير متاح للنسخ"); return; }
    navigator.clipboard.writeText(keyToCopy).then(() => toast.success("تم نسخ المفتاح"), () => toast.error("فشل النسخ"));
  }
  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["ai-admin"] });
    toast.success("تم تحديث البيانات");
  }
  function usagePercent(key: AiKey) {
    if (!key.max_requests_per_day) return 0;
    return Math.round((key.current_usage / key.max_requests_per_day) * 100);
  }
  function usageBarColor(pct: number) {
    if (pct >= 85) return "bg-red-500";
    if (pct >= 60) return "bg-yellow-500";
    return "bg-green-500";
  }

  if (providersError || keysError) {
    return <Alert variant="destructive"><AlertDescription>فشل تحميل البيانات. يرجى المحاولة مرة أخرى.</AlertDescription></Alert>;
  }
  if (providersLoading || keysLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div>
      {dashboard && !dashboardLoading ? <StatsGrid dashboard={dashboard} /> : null}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pr-9 bg-card border-0 shadow-sm" placeholder="بحث بالاسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px] border-0 shadow-sm bg-card"><SelectValue placeholder="كل المزودين" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل المزودين</SelectItem>
            {providerList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)} className="shadow-sm"><Plus className="size-4 ml-1" /> إضافة مفتاح</Button>
        <Button variant="outline" size="icon" onClick={handleRefresh} title="تحديث" className="border-0 shadow-sm bg-card"><RefreshCw className="size-4" /></Button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 ring-1 ring-primary/10 text-sm">
          <span className="text-muted-foreground font-medium ml-2">{selectedIds.size} محدد</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)} className="h-8 border-0 bg-card shadow-sm"><ToggleRight className="size-3.5 ml-1" />تفعيل</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)} className="h-8 border-0 bg-card shadow-sm"><ToggleLeft className="size-3.5 ml-1" />إلغاء تفعيل</Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-8"><Trash2 className="size-3.5 ml-1" />حذف</Button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border-0 shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="size-4" />
              </TableHead>
              <SortHeader label="الاسم" sortKey="name" sort={sort} onSort={handleSort} />
              <SortHeader label="المزود" sortKey="provider" sort={sort} onSort={handleSort} />
              <TableHead>المفتاح</TableHead>
              <SortHeader label="النوع" sortKey="key_type" sort={sort} onSort={handleSort} />
              <SortHeader label="الحالة" sortKey="is_active" sort={sort} onSort={handleSort} />
              <SortHeader label="الاستخدام" sortKey="current_usage" sort={sort} onSort={handleSort} />
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">لا توجد مفاتيح مطابقة</TableCell></TableRow>
            ) : (
              sortedKeys.map((k, idx) => {
                const up = usagePercent(k);
                return (
                  <TableRow key={k.id} className={`cursor-pointer transition-all duration-150 hover:bg-muted/20 hover:shadow-sm ${idx % 2 === 0 ? "bg-background" : "bg-muted/[0.02]"}`} onClick={() => setDetailTarget(k)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => toggleSelect(k.id)} className="size-4" />
                    </TableCell>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded-lg bg-muted/40 font-medium">{k.provider}</span></TableCell>
                    <TableCell><span className="font-mono text-xs text-muted-foreground">{k.api_key_masked || "-"}</span></TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded-lg bg-purple-100/80 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">{k.key_type || "CENTRAL"}</span></TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); handleToggle(k); }} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${k.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"}`}>
                        {k.is_active ? "نشط" : "غير نشط"}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                        </div>
                        <span className={`text-xs shrink-0 font-medium ${up >= 85 ? "text-red-600" : "text-muted-foreground"}`}>{up}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="نسخ" onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}><Copy className="size-3.5" /></button>
                        <button className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="اختبار" onClick={() => handleTest(k)}><FlaskConical className="size-3.5" /></button>
                        <button className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="تعديل" onClick={() => setEditTarget(k)}><Zap className="size-3.5" /></button>
                        <button className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="تفاصيل" onClick={() => setDetailTarget(k)}><Info className="size-3.5" /></button>
                        <button className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive/70 hover:text-destructive transition-colors" title="حذف" onClick={() => setDeleteTarget(k)}><Trash2 className="size-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {sortedKeys.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">لا توجد مفاتيح مطابقة</div>
        ) : (
          sortedKeys.map((k) => {
            const up = usagePercent(k);
            return (
              <Card key={k.id} className="cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200" onClick={() => setDetailTarget(k)}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <p className="font-medium text-sm">{k.name}</p>
                      <span className="text-xs text-muted-foreground">{k.provider} · {k.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(k); }} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${k.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                      {k.is_active ? "نشط" : "غير نشط"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-medium ${up >= 85 ? "text-red-600" : "text-muted-foreground"}`}>{k.current_usage}/{k.max_requests_per_day}</span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => toggleSelect(k.id)} className="size-4 ml-1" />
                    <button className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors" title="نسخ" onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}><Copy className="size-3.5" /></button>
                    <button className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors" title="اختبار" onClick={() => handleTest(k)}><FlaskConical className="size-3.5" /></button>
                    <button className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors" title="تعديل" onClick={() => setEditTarget(k)}><Zap className="size-3.5" /></button>
                    <button className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive/70 hover:text-destructive transition-colors" title="حذف" onClick={() => setDeleteTarget(k)}><Trash2 className="size-3.5" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showAddDialog && (
        <AddKeyDialog providers={providerList} onClose={() => setShowAddDialog(false)} onCreated={() => setShowAddDialog(false)} createKeyMutation={createKeyMutation} />
      )}
      {editTarget && (
        <EditKeyDialog key={editTarget.id} target={editTarget} onClose={() => setEditTarget(null)} onUpdated={() => setEditTarget(null)} updateKeyMutation={updateKeyMutation} />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog target={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isLoading={deleteKeyMutation.isPending} />
      )}
      {testTarget && (
        <TestResultDialog data={testTarget} onClose={() => setTestTarget(null)} isLoading={testKeyMutation.isPending} />
      )}
      {detailTarget && (
        <KeyDetailDrawer key={detailTarget.id} key={detailTarget.id} open={!!detailTarget} onClose={() => setDetailTarget(null)} />
      )}
    </div>
  );
}

function AddKeyDialog({ providers, onClose, onCreated, createKeyMutation }: {
  providers: string[]; onClose: () => void; onCreated: () => void; createKeyMutation: ReturnType<typeof useCreateKey>;
}) {
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelsText, setModelsText] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyType, setKeyType] = useState("CENTRAL");
  const [maxRequests, setMaxRequests] = useState("1500");

  function handleProviderChange(value: string) {
    setProvider(value);
    if (value === "OPENROUTER" && !modelsText) setModelsText("openrouter/auto");
  }
  function handleSave() {
    if (!provider || !name || !apiKey) { toast.error("المزود والاسم والمفتاح مطلوبون"); return; }
    const models = modelsText.split("\n").map((m) => m.trim()).filter(Boolean);
    createKeyMutation.mutate({
      provider, name, api_key: apiKey,
      models: models.length > 0 ? models : undefined,
      key_type: keyType,
      max_requests_per_day: parseInt(maxRequests) || 1500,
    } as CreateAiKeyPayload, { onSuccess: onCreated });
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة مفتاح API جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium mb-1 block">المزود</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue placeholder="اختر المزود" /></SelectTrigger>
              <SelectContent>{providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium mb-1 block">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Production GPT-4" /></div>
          <div><label className="text-sm font-medium mb-1 block">مفتاح API</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)} type="button">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex-1"><label className="text-sm font-medium mb-1 block">حد الطلبات/اليوم</label><Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">الموديلات (موديل واحد في كل سطر)</label>
            <Textarea value={modelsText} onChange={(e) => setModelsText(e.target.value)} placeholder={provider === "OPENROUTER" ? "openrouter/auto" : "deepseek-chat\ngpt-4o-mini"} rows={3} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={createKeyMutation.isPending}>
            {createKeyMutation.isPending ? <LoadingSpinner size="sm" /> : null}
            {createKeyMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء المفتاح"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditKeyDialog({ target, onClose, onUpdated, updateKeyMutation }: {
  target: AiKey; onClose: () => void; onUpdated: () => void; updateKeyMutation: ReturnType<typeof useUpdateKey>;
}) {
  const [name, setName] = useState(target.name);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyType, setKeyType] = useState(target.key_type);
  const [maxRequests, setMaxRequests] = useState(String(target.max_requests_per_day || 1500));

  function handleSave() {
    if (!name) { toast.error("الاسم مطلوب"); return; }
    const payload: AiKeyUpdatePayload = { name };
    if (apiKey) payload.api_key = apiKey;
    payload.key_type = keyType;
    payload.max_requests_per_day = parseInt(maxRequests) || 1500;
    updateKeyMutation.mutate({ id: target.id, payload }, { onSuccess: onUpdated });
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل المفتاح — {target.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium mb-1 block">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium mb-1 block">مفتاح API (اتركه فارغًا إذا لا تريد تغييره)</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={target.api_key_masked || "أدخل مفتاح جديد"} />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)} type="button">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-sm font-medium mb-1 block">حد الطلبات/اليوم</label><Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} /></div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={updateKeyMutation.isPending}>
            {updateKeyMutation.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({ target, onConfirm, onCancel, isLoading }: {
  target: AiKey; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف المفتاح</AlertDialogTitle>
          <AlertDialogDescription>هل أنت متأكد من حذف <strong>{target.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>{isLoading ? "جارٍ الحذف..." : "حذف"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TestResultDialog({ data, onClose, isLoading }: {
  data: { key: AiKey; result?: unknown; error?: string }; onClose: () => void; isLoading: boolean;
}) {
  const { key, result, error } = data;
  const r = result as Record<string, unknown> | undefined;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>نتيجة الاختبار — {key.name}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {r?.ok || r?.success ? (
                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800"><Check className="size-3 ml-1" /> نجاح</Badge>
              ) : <Badge variant="destructive"><X className="size-3 ml-1" /> فشل</Badge>}
              {r?.latency_ms != null ? <span className="text-xs text-muted-foreground">{String(r.latency_ms)}ms</span> : null}
            </div>
            {r?.model ? <div><span className="text-sm font-medium">النموذج:</span> <span className="text-sm">{String(r.model)}</span></div> : null}
            {r?.reply ? (
              <div><span className="text-sm font-medium">الرد:</span><pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">{String(r.reply)}</pre></div>
            ) : null}
            {typeof result === "object" && result !== null && !r?.reply && !r?.model ? (
              <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            ) : null}
          </div>
        )}
        <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SuperAdminAIKeyManager;
