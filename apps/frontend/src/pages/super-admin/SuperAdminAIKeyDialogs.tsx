import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "../../components/ui/alert-dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Eye, EyeOff, Check, X, Zap, Loader2, Info, History } from "lucide-react";
import { tToast } from "../../utils/i18n-toast";
import { aiAdminService } from "../../services/aiAdminService";
import type { AiKey, AiKeyUpdatePayload, AiKeyLog, CreateAiKeyPayload } from "../../types/ai-admin";
import type { useCreateKey, useUpdateKey } from "../../hooks/useKeyMutations";

type DrawerTab = "info" | "logs" | "models";

export function KeyDetailDrawer({ keyData, open, onClose }: { keyData: AiKey; open: boolean; onClose: () => void }) {
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
    aiAdminService.getKeyLogs({ key_id: keyData.id, limit: 30 })
      .then((res) => setLogs(Array.isArray(res) ? res : res.items ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
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
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 font-mono text-xs">
        <div className="px-5 pt-6 pb-4 bg-muted/20 border-b border-border/60">
          <SheetHeader className="px-0">
            <SheetTitle className="flex items-center gap-2.5 text-base">
              <span className={`inline-flex size-2 rounded-full ${keyData.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
              {keyData.name}
            </SheetTitle>
            <div className="flex items-center gap-2 mt-1.5 font-mono text-xs">
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusBadge}`}>{keyData.is_active ? "نشط" : "غير نشط"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 font-medium">{keyData.provider}</span>
              <span className="text-[10px] text-muted-foreground">{keyData.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
            </div>
          </SheetHeader>
        </div>

        <div className="flex items-center gap-1 px-5 pt-2 border-b border-border/50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors relative ${
                tab === t.id ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {tab === "info" && (
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "المزود", value: keyData.provider },
                  { label: "النوع", value: keyData.key_type === "CENTRAL" ? "مركزي" : "شركة" },
                  { label: "الأولوية", value: String(keyData.priority ?? 1) },
                  { label: "المفتاح", value: keyData.api_key_masked || "-", mono: true },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">{item.label}</span>
                    <p className={`text-xs font-semibold mt-0.5 ${item.mono ? "font-mono" : ""}`} dir={item.mono ? "ltr" : undefined}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">الاستخدام اليومي</span>
                  <span className={`text-xs font-bold tabular-nums ${usageColor}`}>{usagePct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden" dir="ltr">
                  <div className={`h-full rounded-full transition-all duration-500 ${usageBarColor}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{keyData.current_usage} / {keyData.max_requests_per_day} طلب</p>
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div>
              {logsLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
              ) : logs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">لا توجد سجلات سابقة</div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border/40 text-xs">
                      <span className={`size-1.5 rounded-full shrink-0 ${log.status === "ok" || log.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="flex-1 truncate font-medium">{log.action}</span>
                      {log.latency_ms != null && <span className="text-muted-foreground shrink-0 tabular-nums">{log.latency_ms}ms</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "models" && (
            <div>
              {keyData.models && keyData.models.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {keyData.models.map((m) => (
                    <span key={m.id} className="text-xs px-2 py-1 rounded bg-muted/30 border border-border/50 text-foreground">
                      {m.model_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد موديلات مخصصة</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AddKeyDialog({ providers, onClose, onCreated, createKeyMutation }: {
  providers: string[]; onClose: () => void; onCreated: () => void; createKeyMutation: ReturnType<typeof useCreateKey>;
}) {
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelsText, setModelsText] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyType, setKeyType] = useState("CENTRAL");
  const [maxRequests, setMaxRequests] = useState("1500");

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
      <DialogContent className="sm:max-w-md font-mono text-xs">
        <DialogHeader><DialogTitle className="text-sm font-semibold">إضافة مفتاح API جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">المزود</label>
            <Select value={provider} onValueChange={(v) => { setProvider(v); if (v === "OPENROUTER" && !modelsText) setModelsText("openrouter/auto"); }}>
              <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="اختر المزود" /></SelectTrigger>
              <SelectContent>{providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الاسم</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Production Gemini" className="h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">مفتاح API</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" className="h-8 text-xs font-mono pl-8" />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowKey(!showKey)} type="button">
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد الطلبات/اليوم</label>
              <Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الموديلات (سطر لكل موديل)</label>
            <Textarea value={modelsText} onChange={(e) => setModelsText(e.target.value)} placeholder="gemini-2.5-flash" rows={2} className="text-xs font-mono" />
          </div>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-mono">إلغاء</Button>
          <Button size="sm" onClick={handleSave} disabled={createKeyMutation.isPending} className="h-8 text-xs font-mono bg-primary text-primary-foreground">
            {createKeyMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء المفتاح"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditKeyDialog({ target, onClose, onUpdated, updateKeyMutation }: {
  target: AiKey; onClose: () => void; onUpdated: () => void; updateKeyMutation: ReturnType<typeof useUpdateKey>;
}) {
  const [name, setName] = useState(target.name);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyType, setKeyType] = useState(target.key_type);
  const [maxRequests, setMaxRequests] = useState(String(target.max_requests_per_day || 1500));

  function handleSave() {
    if (!name) { tToast.error("SuperAdminAIKeyManager.msg_b4d5"); return; }
    const payload: AiKeyUpdatePayload = { name, key_type: keyType, max_requests_per_day: parseInt(maxRequests) || 1500 };
    if (apiKey) payload.api_key = apiKey;
    updateKeyMutation.mutate({ id: target.id, payload }, { onSuccess: onUpdated });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md font-mono text-xs">
        <DialogHeader><DialogTitle className="text-sm font-semibold">تعديل المفتاح — {target.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs font-mono" /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">مفتاح API جديد (اختياري)</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={target.api_key_masked || "أدخل مفتاح جديد"} className="h-8 text-xs font-mono pl-8" />
              <button className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowKey(!showKey)} type="button">
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
              <Select value={keyType} onValueChange={setKeyType}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CENTRAL">مركزي</SelectItem><SelectItem value="COMPANY">شركة</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد الطلبات/اليوم</label>
              <Input type="number" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} min={1} className="h-8 text-xs font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-mono">إلغاء</Button>
          <Button size="sm" onClick={handleSave} disabled={updateKeyMutation.isPending} className="h-8 text-xs font-mono bg-primary text-primary-foreground">
            {updateKeyMutation.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteConfirmDialog({ target, onConfirm, onCancel, isLoading }: {
  target: AiKey; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="font-mono text-xs">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold">حذف المفتاح</AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">هل أنت متأكد من حذف {target.name}؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={onCancel} className="h-8 text-xs font-mono">إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="h-8 text-xs font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isLoading}>
            {isLoading ? "جارٍ الحذف..." : "تأكيد الحذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TestResultDialog({ data, onClose, isLoading }: {
  data: { key: AiKey; result?: unknown; error?: string }; onClose: () => void; isLoading: boolean;
}) {
  const { key, result, error } = data;
  const r = result as Record<string, unknown> | undefined;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="font-mono text-xs max-w-sm">
        <DialogHeader><DialogTitle className="text-sm font-semibold">نتيجة الاختبار — {key.name}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-6"><LoadingSpinner size="sm" /></div>
        ) : error ? (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {r?.ok || r?.success || r?.status === "ok" ? (
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><Check className="size-3 ml-1" /> نجاح</Badge>
              ) : <Badge variant="destructive"><X className="size-3 ml-1" /> فشل</Badge>}
              {r?.latency_ms != null ? <span className="text-xs text-muted-foreground tabular-nums">{String(r.latency_ms)}ms</span> : null}
            </div>
            {r?.model && <div className="text-xs"><span className="text-muted-foreground">النموذج: </span>{String(r.model)}</div>}
            {r?.reply && (
              <pre className="text-[11px] bg-muted/40 p-2.5 rounded border border-border/50 whitespace-pre-wrap max-h-32 overflow-auto" dir="auto">{String(r.reply)}</pre>
            )}
          </div>
        )}
        <DialogFooter><Button size="sm" onClick={onClose} className="h-8 text-xs font-mono">إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
