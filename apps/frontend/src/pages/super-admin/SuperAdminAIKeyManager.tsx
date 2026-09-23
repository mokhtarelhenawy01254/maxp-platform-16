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
import { tToast } from "../../utils/i18n-toast";
import {
  Plus, Trash2, Copy, FlaskConical, Search, RefreshCw,
  Eye, EyeOff, Check, X,
  Activity, Zap, Gauge, Loader2,
  ChevronUp,
  Info, ArrowUpDown, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight, History, KeyRound,
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
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <KeyRound className="size-5 text-primary" />
            </span>
            إدارة مفاتيح الذكاء الاصطناعي
          </h1>
          <p className="text-sm text-muted-foreground mt-2 mr-12">عرض وإدارة مفاتيح API لمزودي الذكاء الاصطناعي</p>
        </div>
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
        {active && sort ? (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-muted-foreground/40" />}
      </span>
    </TableHead>
  );
}

function StatsGrid({ dashboard }: { dashboard: DashboardStats }) {
  const providerCount = Object.keys(dashboard.keys_by_provider).length;

  const stats = [
    { label: "إجمالي المفاتيح", value: dashboard.total_keys, sub: `${dashboard.active_keys} نشط` },
    { label: "المزودون", value: providerCount, sub: "مزود متصل" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-stretch gap-3">
      {stats.map((s) => (
        <div key={s.label} className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-card shadow-sm flex items-baseline gap-3">
          <span className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</span>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-[10px] text-muted-foreground/70">{s.sub}</span>
          </div>
        </div>
      ))}
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

type DrawerTab = "info" | "logs" | "models";

function KeyDetailDrawer({ keyData, open, onClose }: { keyData: AiKey; open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<AiKeyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("info");

  const usagePct = keyData.max_requests_per_day ? Math.round((keyData.current_usage / keyData.max_requests_per_day) * 100) : 0;
  const usageColor = usagePct >= 85 ? "text-red-600 dark:text-red-400" : usagePct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  const usageBarColor = usagePct >= 85 ? "bg-red-500" : usagePct >= 60 ? "bg-amber-500" : "bg-emerald-500";

  React.useEffect(() => {
    if (!open) return;
    setTab("info");
    setLogsLoading(true);
    aiAdminService.getKeyLogs({ key_id: keyData.id, limit: 30 }).then((res) => {
      setLogs(Array.isArray(res) ? res : res.items ?? []);
    }).catch(() => {
      setLogs([]);
    }).finally(() => setLogsLoading(false));
  }, [open, keyData.id]);

  const statusBadge = keyData.is_active
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";

  const tabs: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
    { id: "info", label: "معلومات", icon: <Info className="size-3.5" /> },
    { id: "logs", label: "السجلات", icon: <History className="size-3.5" /> },
    { id: "models", label: "الموديلات", icon: <Zap className="size-3.5" /> },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 bg-gradient-to-b from-muted/40 to-transparent border-b border-border/50">
          <SheetHeader className="px-0">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <span className={`inline-flex size-2.5 rounded-full ${keyData.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
              {keyData.name}
            </SheetTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusBadge}`}>{keyData.is_active ? "نشط" : "غير نشط"}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 font-medium">{keyData.provider}</span>
              <span className="text-xs text-muted-foreground">{keyData.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
            </div>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border/50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {t.icon}
              {t.label}
              {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "المزود", value: keyData.provider },
                  { label: "النوع", value: keyData.key_type === "CENTRAL" ? "مركزي" : "شركة" },
                  { label: "الأولوية", value: String(keyData.priority ?? 1) },
                  { label: "المفتاح", value: keyData.api_key_masked || "-", mono: true },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-muted/30 ring-1 ring-border/50">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <p className={`text-sm font-medium mt-1 ${item.mono ? "font-mono text-xs" : ""}`} dir={item.mono ? "ltr" : undefined}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Usage bar */}
              <div className="p-3 rounded-xl bg-muted/30 ring-1 ring-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">الاستخدام اليومي</span>
                  <span className={`text-xs font-bold ${usageColor}`}>{usagePct}%</span>
                </div>
                <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${usageBarColor}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{keyData.current_usage} / {keyData.max_requests_per_day} طلب</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                {keyData.created_at && (
                  <div className="p-3 rounded-xl bg-muted/30 ring-1 ring-border/50">
                    <span className="text-xs text-muted-foreground">تاريخ الإنشاء</span>
                    <p className="text-sm font-medium mt-1">{new Date(keyData.created_at).toLocaleDateString()}</p>
                  </div>
                )}
                {keyData.last_used_at && (
                  <div className="p-3 rounded-xl bg-muted/30 ring-1 ring-border/50">
                    <span className="text-xs text-muted-foreground">آخر استخدام</span>
                    <p className="text-sm font-medium mt-1">{new Date(keyData.last_used_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div>
              {logsLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : logs.length === 0 ? (
                <div className="text-center py-6">
                  <History className="size-7 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">لا توجد سجلات</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/25 ring-1 ring-border/40 text-xs">
                      <span className={`inline-block size-2 rounded-full shrink-0 ${log.status === "ok" || log.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="flex-1 truncate font-medium">{log.action}{log.model ? <span className="text-muted-foreground font-normal"> — {log.model}</span> : ""}</span>
                      {log.latency_ms != null && <span className="text-muted-foreground shrink-0 tabular-nums">{log.latency_ms}ms</span>}
                      <span className="text-muted-foreground/70 shrink-0 text-[10px] tabular-nums">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "models" && (
            <div>
              {keyData.models && keyData.models.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keyData.models.map((m) => (
                    <span key={m.id} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      m.is_enabled
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "bg-muted/40 text-muted-foreground ring-1 ring-border/50"
                    }`}>
                      {m.model_name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Zap className="size-7 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">لا توجد موديلات مكونة</p>
                </div>
              )}
            </div>
          )}
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
    if (!keyToCopy) { tToast.error("SuperAdminAIKeyManager.msg_d605"); return; }
    navigator.clipboard.writeText(keyToCopy).then(() => tToast.success("SuperAdminAIKeyManager.msg_6d70"), () => tToast.error("super-admin_SuperAdminAIKeyManager.msg_332e"));
  }
  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["ai-admin"] });
    tToast.success("SuperAdminAIKeyManager.success_update_1f20");
  }
  function usagePercent(key: AiKey) {
    if (!key.max_requests_per_day) return 0;
    return Math.round((key.current_usage / key.max_requests_per_day) * 100);
  }
  function usageBarColor(pct: number) {
    if (pct >= 85) return "bg-red-500";
    if (pct >= 60) return "bg-amber-500";
    return "bg-emerald-500";
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
          <Input className="pr-9 bg-card border-0 shadow-sm focus-visible:ring-1" placeholder="بحث بالاسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border-0 shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="size-4 rounded" />
              </TableHead>
              <SortHeader label="الاسم" sortKey="name" sort={sort} onSort={handleSort} />
              <SortHeader label="المزود" sortKey="provider" sort={sort} onSort={handleSort} />
              <TableHead>المفتاح</TableHead>
              <SortHeader label="النوع" sortKey="key_type" sort={sort} onSort={handleSort} />
              <SortHeader label="الحالة" sortKey="is_active" sort={sort} onSort={handleSort} />
              <SortHeader label="الاستخدام" sortKey="current_usage" sort={sort} onSort={handleSort} />
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-center py-8">
                  <KeyRound className="size-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد مفاتيح مطابقة</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedKeys.map((k, idx) => {
                const up = usagePercent(k);
                return (
                  <TableRow
                    key={k.id}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-muted/25 ${idx % 2 === 0 ? "bg-background" : "bg-muted/[0.015]"}`}
                    onClick={() => setDetailTarget(k)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => toggleSelect(k.id)} className="size-4 rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-md bg-muted/50 font-medium">{k.provider}</span>
                    </TableCell>
                    <TableCell><span className="font-mono text-xs text-muted-foreground" dir="ltr">{k.api_key_masked || "—"}</span></TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        k.key_type === "CENTRAL"
                          ? "bg-purple-100/70 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-cyan-100/70 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                      }`}>{k.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(k); }}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          k.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200/80"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200/80"
                        }`}
                      >
                        {k.is_active ? "نشط" : "غير نشط"}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                        </div>
                        <span className={`text-xs shrink-0 font-medium tabular-nums ${up >= 85 ? "text-red-600 dark:text-red-400" : up >= 60 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{up}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors" title="نسخ" onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}><Copy className="size-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors" title="اختبار" onClick={() => handleTest(k)}><FlaskConical className="size-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors" title="تعديل" onClick={() => setEditTarget(k)}><Zap className="size-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors" title="تفاصيل" onClick={() => setDetailTarget(k)}><Info className="size-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-destructive/60 hover:bg-red-50 hover:text-destructive dark:hover:bg-red-900/20 transition-colors" title="حذف" onClick={() => setDeleteTarget(k)}><Trash2 className="size-3.5" /></button>
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
          <div className="text-center py-8">
            <KeyRound className="size-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد مفاتيح مطابقة</p>
          </div>
        ) : (
          sortedKeys.map((k) => {
            const up = usagePercent(k);
            return (
              <Card key={k.id} className="cursor-pointer border-0 shadow-sm hover:shadow-md transition-shadow duration-200" onClick={() => setDetailTarget(k)}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between mb-2.5">
                    <div>
                      <p className="font-medium text-sm">{k.name}</p>
                      <span className="text-xs text-muted-foreground">{k.provider} · {k.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(k); }} className={`text-xs px-2.5 py-1 rounded-md font-medium ${k.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                      {k.is_active ? "نشط" : "غير نشط"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${up >= 85 ? "text-red-600" : "text-muted-foreground"}`}>{k.current_usage}/{k.max_requests_per_day}</span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => toggleSelect(k.id)} className="size-4 rounded ml-1" />
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors" title="نسخ" onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}><Copy className="size-3.5" /></button>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors" title="اختبار" onClick={() => handleTest(k)}><FlaskConical className="size-3.5" /></button>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors" title="تعديل" onClick={() => setEditTarget(k)}><Zap className="size-3.5" /></button>
                    <button className="p-1.5 rounded-lg text-destructive/60 hover:bg-red-50 hover:text-destructive transition-colors" title="حذف" onClick={() => setDeleteTarget(k)}><Trash2 className="size-3.5" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background shadow-lg ring-1 ring-border/20 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="font-medium ml-1">{selectedIds.size} محدد</span>
          <div className="w-px h-5 bg-background/20" />
          <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(true)} className="h-8 text-background hover:bg-background/15 px-2.5"><ToggleRight className="size-3.5 ml-1" />تفعيل</Button>
          <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(false)} className="h-8 text-background hover:bg-background/15 px-2.5"><ToggleLeft className="size-3.5 ml-1" />إيقاف</Button>
          <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-8 text-red-400 hover:bg-red-500/20 px-2.5"><Trash2 className="size-3.5 ml-1" />حذف</Button>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded-lg hover:bg-background/15 transition-colors mr-1"><X className="size-4" /></button>
        </div>
      )}

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
        <KeyDetailDrawer keyData={detailTarget} open={!!detailTarget} onClose={() => setDetailTarget(null)} />
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
    if (!provider || !name || !apiKey) { tToast.error("SuperAdminAIKeyManager.msg_a104"); return; }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>إضافة مفتاح API جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">المزود</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue placeholder="اختر المزود" /></SelectTrigger>
              <SelectContent>{providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Production GPT-4" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">مفتاح API</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="pl-9" />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowKey(!showKey)} type="button">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">حد الطلبات/اليوم</label><Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">الموديلات (موديل واحد في كل سطر)</label>
            <Textarea value={modelsText} onChange={(e) => setModelsText(e.target.value)} placeholder={provider === "OPENROUTER" ? "openrouter/auto" : "deepseek-flash\ngpt-4o-mini"} rows={3} />
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
    if (!name) { tToast.error("SuperAdminAIKeyManager.msg_b4d5"); return; }
    const payload: AiKeyUpdatePayload = { name };
    if (apiKey) payload.api_key = apiKey;
    payload.key_type = keyType;
    payload.max_requests_per_day = parseInt(maxRequests) || 1500;
    updateKeyMutation.mutate({ id: target.id, payload }, { onSuccess: onUpdated });
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>تعديل المفتاح — {target.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium mb-1.5 block">مفتاح API (اتركه فارغًا إذا لا تريد تغييره)</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={target.api_key_masked || "أدخل مفتاح جديد"} className="pl-9" />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowKey(!showKey)} type="button">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">حد الطلبات/اليوم</label><Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} /></div>
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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {r?.ok || r?.success || r?.status === "ok" ? (
                <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800"><Check className="size-3 ml-1" /> نجاح</Badge>
              ) : <Badge variant="destructive"><X className="size-3 ml-1" /> فشل</Badge>}
              {r?.latency_ms != null ? <span className="text-xs text-muted-foreground tabular-nums">{String(r.latency_ms)}ms</span> : null}
            </div>
            {r?.model ? <div className="text-sm"><span className="font-medium">النموذج: </span><span className="text-muted-foreground">{String(r.model)}</span></div> : null}
            {r?.reply ? (
              <div>
                <span className="text-sm font-medium">الرد:</span>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg mt-1.5 whitespace-pre-wrap max-h-[200px] overflow-auto ring-1 ring-border/30">{String(r.reply)}</pre>
              </div>
            ) : null}
            {typeof result === "object" && result !== null && !r?.reply && !r?.model ? (
              <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-[200px] overflow-auto ring-1 ring-border/30">{JSON.stringify(result, null, 2)}</pre>
            ) : null}
          </div>
        )}
        <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SuperAdminAIKeyManager;