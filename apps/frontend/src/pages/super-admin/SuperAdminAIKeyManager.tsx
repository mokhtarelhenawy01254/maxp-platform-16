import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { tToast } from "../../utils/i18n-toast";
import {
  Plus, Trash2, Search, RefreshCw, ToggleLeft, ToggleRight,
  KeyRound, Shield, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { useAiProviders, useAiKeys, useAiDashboard } from "../../hooks/useAiAdminData";
import {
  useCreateKey,
  useToggleKeyStatus,
  useDeleteKey,
  useTestKey,
  useUpdateKey,
} from "../../hooks/useKeyMutations";
import type {
  AiKey, AiProvider, DashboardStats,
} from "../../types/ai-admin";
import {
  KeyDetailDrawer,
  AddKeyDialog,
  EditKeyDialog,
  DeleteConfirmDialog,
  TestResultDialog,
} from "./SuperAdminAIKeyDialogs";
import {
  KeyManagerTable,
  sortKeys,
  type SortKey,
  type SortConfig,
} from "./SuperAdminAIKeyTable";

export default function SuperAdminAIKeyManager() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <KeyRound className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              إدارة مفاتيح الذكاء الاصطناعي
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              v2.5 Security
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            تأمين وتوزيع مفاتيح الـ API المركزية ومفاتيح الشركات وفق معايير الأمان الموحدة
          </p>
        </div>
      </div>
      <KeyManagerContent />
    </div>
  );
}

function StatsRibbon({ dashboard }: { dashboard: DashboardStats }) {
  const providerCount = Object.keys(dashboard.keys_by_provider || {}).length;

  const items = [
    { label: "إجمالي المفاتيح", value: dashboard.total_keys, sub: `${dashboard.active_keys} نشط`, icon: KeyRound },
    { label: "المزودون المعتمدون", value: providerCount, sub: "مزود سحابي", icon: Shield },
    { label: "المفاتيح النشطة", value: dashboard.active_keys, sub: "جاهزة للاستعلام", icon: CheckCircle2 },
    { label: "حالات التنبيه", value: dashboard.total_keys - dashboard.active_keys, sub: "مفاتيح متوقفة", icon: AlertCircle },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">{it.label}</p>
              <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">{it.value}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{it.sub}</p>
            </div>
            <div className="size-7 rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
          </div>
        );
      })}
    </div>
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
    navigator.clipboard.writeText(keyToCopy).then(
      () => tToast.success("SuperAdminAIKeyManager.msg_6d70"),
      () => tToast.error("super-admin_SuperAdminAIKeyManager.msg_332e")
    );
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
    if (pct >= 85) return "bg-destructive";
    if (pct >= 60) return "bg-amber-500";
    return "bg-emerald-500";
  }

  if (providersError || keysError) {
    return (
      <Alert variant="destructive" className="border-destructive/30">
        <AlertDescription className="text-xs">فشل تحميل البيانات. يرجى إعادة المحاولة.</AlertDescription>
      </Alert>
    );
  }

  if (providersLoading || keysLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dashboard && !dashboardLoading ? <StatsRibbon dashboard={dashboard} /> : null}

      {/* Control bar */}
      <div className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pr-8 h-8 text-xs bg-muted/20 border-border/60"
              placeholder="بحث باسم المفتاح..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-border/60 bg-muted/20">
              <SelectValue placeholder="كل المزودين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_PROVIDERS" className="text-xs">كل المزودين</SelectItem>
              {providerList.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="h-8 px-2.5 text-xs gap-1 border-border/70">
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="h-8 px-3 text-xs gap-1">
            <Plus className="size-3.5" />
            <span>إضافة مفتاح</span>
          </Button>
        </div>
      </div>

      <KeyManagerTable
        sortedKeys={sortedKeys}
        allSelected={allSelected}
        selectedIds={selectedIds}
        sort={sort}
        onSort={handleSort}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onToggleStatus={handleToggle}
        onCopyKey={handleCopyKey}
        onTest={handleTest}
        onEdit={setEditTarget}
        onDetail={setDetailTarget}
        onDelete={setDeleteTarget}
        usagePercent={usagePercent}
        usageBarColor={usageBarColor}
      />

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-foreground text-background shadow-lg ring-1 ring-border/20 text-xs">
          <span className="font-mono tabular-nums">{selectedIds.size} محدد</span>
          <div className="w-px h-4 bg-background/20" />
          <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(true)} className="h-7 text-background hover:bg-background/15 px-2 text-xs gap-1">
            <ToggleRight className="size-3.5" /> تفعيل
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(false)} className="h-7 text-background hover:bg-background/15 px-2 text-xs gap-1">
            <ToggleLeft className="size-3.5" /> إيقاف
          </Button>
          <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-7 text-red-400 hover:bg-red-500/20 px-2 text-xs gap-1">
            <Trash2 className="size-3.5" /> حذف
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-background/15 mr-1">
            <X className="size-3.5" />
          </button>
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