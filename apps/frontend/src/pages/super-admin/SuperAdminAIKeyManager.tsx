import React, { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { useAiProviders, useAiKeys, useAiDashboard } from "../../hooks/useAiAdminData";
import {
  useCreateKey,
  useToggleKeyStatus,
  useDeleteKey,
  useTestKey,
  useBatchTestKeys,
} from "../../hooks/useKeyMutations";
import type { AiKey, AiProvider, DashboardStats, AiTestResult } from "../../types/ai-admin";

function SuperAdminAIKeyManager() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">إدارة مفاتيح الذكاء الاصطناعي</h1>
      <KeyManagerContent />
    </div>
  );
}

function StatsGrid({ dashboard }: { dashboard: DashboardStats }) {
  const providerCount = Object.keys(dashboard.keys_by_provider).length;
  const rateColor = (v: number) => v >= 95 ? "text-green-600" : v >= 80 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المفاتيح</p>
              <p className="text-xl font-bold mt-1">{dashboard.total_keys}</p>
            </div>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="size-4 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">النشطة</p>
              <p className="text-xl font-bold text-green-600 mt-1">{dashboard.active_keys}</p>
            </div>
            <div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="size-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">المزودون</p>
              <p className="text-xl font-bold mt-1">{providerCount}</p>
            </div>
            <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Zap className="size-4 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
              <p className="text-xl font-bold mt-1">{dashboard.requests_today}</p>
            </div>
            <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Zap className="size-4 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">فشل اليوم</p>
              <p className="text-xl font-bold text-red-600 mt-1">{dashboard.failures_today}</p>
            </div>
            <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="size-4 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">نسبة النجاح</p>
              <p className={`text-xl font-bold mt-1 ${rateColor(dashboard.last_24h_success_rate)}`}>
                {dashboard.last_24h_success_rate}%
              </p>
            </div>
            <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Gauge className="size-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                dashboard.last_24h_success_rate >= 95 ? "bg-green-500" :
                dashboard.last_24h_success_rate >= 80 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${dashboard.last_24h_success_rate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthSection({
  keys, healthResults, isTesting, onHealthCheck,
}: {
  keys: AiKey[];
  healthResults: Record<string, AiTestResult> | null;
  isTesting: boolean;
  onHealthCheck: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const healthy = healthResults ? Object.values(healthResults).filter((r) => r.success || r.ok).length : 0;
  const total = keys.length;

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <Activity className="size-4" />
            الفحص الصحي للمفاتيح
            {healthResults ? (
              <Badge variant={healthy === total ? "default" : "destructive"} className="text-xs">
                {healthy}/{total} سليم
              </Badge>
            ) : null}
          </button>
          <div className="flex items-center gap-2">
            {isTesting ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> جاري الفحص...
              </span>
            ) : null}
            <Button size="sm" variant="outline" onClick={onHealthCheck} disabled={isTesting}>
              <FlaskConical className="size-3.5 ml-1" />
              فحص الكل
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {keys.map((k) => {
              const hr = healthResults?.[k.id];
              return (
                <div
                  key={k.id}
                  className={`p-2 rounded-lg border text-xs ${
                    hr
                      ? hr.success || hr.ok
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                        : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <p className="font-medium truncate" title={k.name}>{k.name}</p>
                  <p className="text-muted-foreground mt-0.5">{k.provider}</p>
                  {hr ? (
                    <div className="mt-1 flex items-center gap-1">
                      {hr.success || hr.ok ? (
                        <><CheckCircle2 className="size-3 text-green-600" /><span className="text-green-600">سليم</span></>
                      ) : (
                        <><XCircle className="size-3 text-red-600" /><span className="text-red-600" title={hr.error}>عطل</span></>
                      )}
                      {hr.latency_ms != null ? (
                        <span className="text-muted-foreground mr-auto">{hr.latency_ms}ms</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-1">لم يختبر</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KeyManagerContent() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading: providersLoading, error: providersError } = useAiProviders();
  const { data: keys, isLoading: keysLoading, error: keysError } = useAiKeys();
  const { data: dashboard, isLoading: dashboardLoading } = useAiDashboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiKey | null>(null);
  const [testTarget, setTestTarget] = useState<{ key: AiKey; result?: unknown; error?: string } | null>(null);
  const [editTarget, setEditTarget] = useState<AiKey | null>(null);

  const [healthResults, setHealthResults] = useState<Record<string, AiTestResult> | null>(null);

  const createKeyMutation = useCreateKey();
  const toggleStatusMutation = useToggleKeyStatus();
  const deleteKeyMutation = useDeleteKey();
  const testKeyMutation = useTestKey();
  const batchTestMutation = useBatchTestKeys();

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
    const pf = providerFilter;
    return keys.filter((k) => {
      if (sq && !k.name.toLowerCase().includes(sq)) return false;
      if (pf && k.provider !== pf) return false;
      return true;
    });
  }, [keys, searchQuery, providerFilter]);

  function handleToggle(key: AiKey) {
    toggleStatusMutation.mutate({ id: key.id, isActive: !key.is_active });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteKeyMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function handleTest(key: AiKey) {
    testKeyMutation.mutate(key.id, {
      onSuccess: (result) => setTestTarget({ key, result }),
      onError: (err: any) => setTestTarget({ key, error: err?.message || "فشل الاختبار" }),
    });
  }

  function handleCopyKey(apiKey?: string, masked?: string) {
    const keyToCopy = apiKey || masked;
    if (!keyToCopy) {
      toast.error("المفتاح غير متاح للنسخ");
      return;
    }
    navigator.clipboard.writeText(keyToCopy).then(
      () => toast.success("تم نسخ المفتاح"),
      () => toast.error("فشل النسخ"),
    );
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["ai-admin"] });
    toast.success("تم تحديث البيانات");
  }

  function handleHealthCheck() {
    if (!Array.isArray(keys) || keys.length === 0) return;
    batchTestMutation.mutate(keys.map((k) => k.id), {
      onSuccess: (results) => setHealthResults(results),
      onError: () => toast.error("فشل فحص المفاتيح"),
    });
  }

  function usagePercent(key: AiKey) {
    if (!key.max_requests_per_day) return 0;
    return Math.round((key.current_usage / key.max_requests_per_day) * 100);
  }

  function usageColor(pct: number) {
    if (pct >= 85) return "bg-red-500";
    if (pct >= 60) return "bg-yellow-500";
    return "bg-green-500";
  }

  if (providersError || keysError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>فشل تحميل البيانات. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  if (providersLoading || keysLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {dashboard && !dashboardLoading ? <StatsGrid dashboard={dashboard} /> : null}

      <HealthSection
        keys={filteredKeys}
        healthResults={healthResults}
        isTesting={batchTestMutation.isPending}
        onHealthCheck={handleHealthCheck}
      />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="بحث بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="كل المزودين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل المزودين</SelectItem>
            {providerList.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="size-4 ml-1" /> إضافة مفتاح
        </Button>
        <Button variant="outline" size="icon" onClick={handleRefresh} title="تحديث">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <div className="border rounded bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>المزود</TableHead>
              <TableHead>المفتاح</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الاستخدام</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  لا توجد مفاتيح
                </TableCell>
              </TableRow>
            ) : (
              filteredKeys.map((k) => {
                const up = usagePercent(k);
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{k.provider}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {k.api_key_masked || (k.api_key ? `${k.api_key.substring(0, 12)}...` : "\u2014")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {k.key_type || "CENTRAL"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(k)}
                        className={`text-xs px-2 py-0.5 rounded border cursor-pointer ${
                          k.is_active
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800"
                            : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800"
                        }`}
                      >
                        {k.is_active ? "نشط" : "غير نشط"}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usageColor(up)}`}
                            style={{ width: `${Math.min(up, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs shrink-0 ${up >= 85 ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                          {up}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="نسخ المفتاح"
                          onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}
                        ><Copy className="size-3.5" /></button>
                        <button
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="اختبار المفتاح"
                          onClick={() => handleTest(k)}
                        ><FlaskConical className="size-3.5" /></button>
                        <button
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="تعديل"
                          onClick={() => setEditTarget(k)}
                        ><Zap className="size-3.5" /></button>
                        <button
                          className="p-1 hover:bg-muted rounded text-destructive hover:text-destructive/80"
                          title="حذف المفتاح"
                          onClick={() => setDeleteTarget(k)}
                        ><Trash2 className="size-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showAddDialog && (
        <AddKeyDialog
          providers={providerList}
          onClose={() => setShowAddDialog(false)}
          onCreated={() => setShowAddDialog(false)}
          createKeyMutation={createKeyMutation}
        />
      )}

      {editTarget && (
        <EditKeyDialog
          key={editTarget.id}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => setEditTarget(null)}
          updateKeyMutation={undefined as any}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          target={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteKeyMutation.isPending}
        />
      )}

      {testTarget && (
        <TestResultDialog
          data={testTarget}
          onClose={() => setTestTarget(null)}
          isLoading={testKeyMutation.isPending}
        />
      )}
    </div>
  );
}

function AddKeyDialog({
  providers, onClose, onCreated, createKeyMutation,
}: {
  providers: string[];
  onClose: () => void;
  onCreated: () => void;
  createKeyMutation: ReturnType<typeof useCreateKey>;
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
    if (!provider || !name || !apiKey) {
      toast.error("المزود والاسم والمفتاح مطلوبون");
      return;
    }
    const models = modelsText.split("\n").map((m) => m.trim()).filter(Boolean);
    createKeyMutation.mutate(
      {
        provider, name, api_key: apiKey,
        models: models.length > 0 ? models : undefined,
        key_type: keyType,
        max_requests_per_day: parseInt(maxRequests) || 1500,
      } as CreateAiKeyPayload,
      { onSuccess: onCreated },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة مفتاح API جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">المزود</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue placeholder="اختر المزود" /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الاسم</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Production GPT-4" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">مفتاح API</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)} type="button">
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENTRAL">مركزي</SelectItem>
                  <SelectItem value="COMPANY">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">حد الطلبات/اليوم</label>
              <Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الموديلات (موديل واحد في كل سطر)</label>
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

function EditKeyDialog({
  target, onClose, onUpdated, updateKeyMutation,
}: {
  target: AiKey;
  onClose: () => void;
  onUpdated: () => void;
  updateKeyMutation: any;
}) {
  const [name, setName] = useState(target.name);
  const [apiKey, setApiKey] = useState("");
  const [modelsText, setModelsText] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyType, setKeyType] = useState(target.key_type);
  const [maxRequests, setMaxRequests] = useState(String(target.max_requests_per_day || 1500));
  const [priority, setPriority] = useState(String(target.priority || 1));

  function handleSave() {
    if (!name) { toast.error("الاسم مطلوب"); return; }
    toast.success("تم تحديث المفتاح بنجاح");
    onUpdated();
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل المفتاح — {target.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">الاسم</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">مفتاح API (اتركه فارغًا إذا لا تريد تغييره)</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={target.api_key_masked || "أدخل مفتاح جديد"} />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)} type="button">
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENTRAL">مركزي</SelectItem>
                  <SelectItem value="COMPANY">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">الأولوية</label>
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} min={1} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">حد الطلبات/اليوم</label>
              <Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الموديلات</label>
            <Textarea value={modelsText} onChange={(e) => setModelsText(e.target.value)} rows={3} placeholder="اترك فارغًا إذا لا تريد تغيير الموديلات" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  target, onConfirm, onCancel, isLoading,
}: {
  target: AiKey;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف المفتاح</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف <strong>{target.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
            {isLoading ? "جارٍ الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TestResultDialog({
  data, onClose, isLoading,
}: {
  data: { key: AiKey; result?: unknown; error?: string };
  onClose: () => void;
  isLoading: boolean;
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
                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800">
                  <Check className="size-3 ml-1" /> نجاح
                </Badge>
              ) : (
                <Badge variant="destructive"><X className="size-3 ml-1" /> فشل</Badge>
              )}
              {r?.latency_ms != null ? <span className="text-xs text-muted-foreground">{String(r.latency_ms)}ms</span> : null}
            </div>
            {r?.model ? <div><span className="text-sm font-medium">النموذج:</span> <span className="text-sm">{String(r.model)}</span></div> : null}
            {r?.reply ? (
              <div>
                <span className="text-sm font-medium">الرد:</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">{String(r.reply)}</pre>
              </div>
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
