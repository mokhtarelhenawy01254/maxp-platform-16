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
  Plus,
  Trash2,
  Copy,
  FlaskConical,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { useAiProviders, useAiKeys } from "../../hooks/useAiAdminData";
import {
  useCreateKey,
  useToggleKeyStatus,
  useDeleteKey,
  useTestKey,
} from "../../hooks/useKeyMutations";
import type { AiKey, AiProvider } from "../../types/ai-admin";

function SuperAdminAIKeyManager() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">إدارة مفاتيح الذكاء الاصطناعي</h1>
      <KeyManagerContent />
    </div>
  );
}

function KeyManagerContent() {
  const queryClient = useQueryClient();
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
  } = useAiProviders();
  const {
    data: keys,
    isLoading: keysLoading,
    error: keysError,
  } = useAiKeys();

  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiKey | null>(null);
  const [testTarget, setTestTarget] = useState<{
    key: AiKey;
    result?: unknown;
    error?: string;
  } | null>(null);

  const createKeyMutation = useCreateKey();
  const toggleStatusMutation = useToggleKeyStatus();
  const deleteKeyMutation = useDeleteKey();
  const testKeyMutation = useTestKey();

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

  const activeCount = useMemo(() => {
    if (!Array.isArray(keys)) return 0;
    return keys.filter((k) => k.is_active).length;
  }, [keys]);

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
    if (!key.api_key) {
      toast.error("المفتاح الحقيقي غير متاح للاختبار (الـ API لا تعيد المفتاح الكامل)");
      return;
    }
    testKeyMutation.mutate(
      { provider: key.provider, apiKey: key.api_key },
      {
        onSuccess: (result) => {
          setTestTarget({ key, result });
        },
        onError: (err: any) => {
          setTestTarget({ key, error: err?.message || "فشل الاختبار" });
        },
      },
    );
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">المزودون</p>
            <p className="text-xl font-bold">{providerList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">المفاتيح</p>
            <p className="text-xl font-bold">{Array.isArray(keys) ? keys.length : 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">النشطة</p>
            <p className="text-xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

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
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="size-4 ml-1" />
          إضافة مفتاح
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
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  لا توجد مفاتيح
                </TableCell>
              </TableRow>
            ) : (
              filteredKeys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {k.provider}
                    </span>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="نسخ المفتاح"
                        onClick={() => handleCopyKey(k.api_key, k.api_key_masked)}
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="اختبار المفتاح"
                        onClick={() => handleTest(k)}
                      >
                        <FlaskConical className="size-3.5" />
                      </button>
                      <button
                        className="p-1 hover:bg-muted rounded text-destructive hover:text-destructive/80"
                        title="حذف المفتاح"
                        onClick={() => setDeleteTarget(k)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
  providers,
  onClose,
  onCreated,
  createKeyMutation,
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

  function handleProviderChange(value: string) {
    setProvider(value);
    if (value === "OPENROUTER" && !modelsText) {
      setModelsText("openrouter/auto");
    }
  }

  function handleSave() {
    if (!provider || !name || !apiKey) {
      toast.error("المزود والاسم والمفتاح مطلوبون");
      return;
    }
    const models = modelsText
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);
    createKeyMutation.mutate(
      { provider, name, api_key: apiKey, models: models.length > 0 ? models : undefined },
      { onSuccess: onCreated },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مفتاح API جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">المزود</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المزود" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الاسم</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Production GPT-4"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">مفتاح API</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              الموديلات (موديل واحد في كل سطر)
            </label>
            <Textarea
              value={modelsText}
              onChange={(e) => setModelsText(e.target.value)}
              placeholder={provider === "OPENROUTER" ? "openrouter/auto" : "deepseek-chat\ngpt-4o-mini"}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {provider === "OPENROUTER"
                ? "افتراضيًا openrouter/auto. أضف موديلات محددة لوضع routing مخصص."
                : "إذا تركت فارغًا، هيستخدم الموديل الافتراضي للمزود."}
            </p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={createKeyMutation.isPending}>
            {createKeyMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : null}
            {createKeyMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء المفتاح"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  target,
  onConfirm,
  onCancel,
  isLoading,
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
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? "جارٍ الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TestResultDialog({
  data,
  onClose,
  isLoading,
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
        <DialogHeader>
          <DialogTitle>نتيجة الاختبار — {key.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {r?.ok || r?.success ? (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800"
                >
                  <Check className="size-3 ml-1" />
                  نجاح
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="size-3 ml-1" />
                  فشل
                </Badge>
              )}
              {r?.latency_ms != null ? (
                <span className="text-xs text-muted-foreground">{String(r.latency_ms)}ms</span>
              ) : null}
            </div>
            {r?.model ? (
              <div>
                <span className="text-sm font-medium">النموذج:</span>{" "}
                <span className="text-sm">{String(r.model)}</span>
              </div>
            ) : null}
            {r?.reply ? (
              <div>
                <span className="text-sm font-medium">الرد:</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">
                  {String(r.reply)}
                </pre>
              </div>
            ) : null}
            {typeof result === "object" && result !== null && !r?.reply && !r?.model ? (
              <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-[200px] overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SuperAdminAIKeyManager;
