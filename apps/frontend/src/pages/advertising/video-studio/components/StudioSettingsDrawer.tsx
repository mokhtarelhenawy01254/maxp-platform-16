// Settings drawer: wallet + BYOK (with live key test) + merchant prefs + usage
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ExternalLink, KeyRound, Loader2, PlugZap, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../../../components/ui/sheet";
import { formatEgp, getStudioPrefs, saveStudioPrefs } from "../presets";
import { videoStudioApi, getApiErrorMessage } from "../videoStudioApi";
import type { KeyTestResult, UsageSnapshot } from "../videoStudioApi";
import type { VideoModel } from "../types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudioSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: VideoModel[];
}

const KEY_STATE: Record<KeyTestResult["state"], { label: string; cls: string }> = {
  accepted: { label: "المفتاح صالح", cls: "text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "مرفوض من Higgsfield", cls: "text-destructive" },
  invalid_format: { label: "الصيغة غلط (KeyID:Secret)", cls: "text-destructive" },
  reachable: { label: "واصل لكن استجابة غير متوقعة", cls: "text-amber-600 dark:text-amber-400" },
  unreachable: { label: "تعذر الوصول للمزود", cls: "text-amber-600 dark:text-amber-400" },
  no_key: { label: "لا يوجد مفتاح", cls: "text-muted-foreground" },
};

export const StudioSettingsDrawer: React.FC<StudioSettingsDrawerProps> = ({ open, onOpenChange, models }) => {
  const [config, setConfig] = useState<{ walletBalance: number; byok: { configured: boolean; masked: string | null }; simulation: boolean } | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResult | null>(null);

  const videoModels = models.filter((m) => m.kind === "video");
  const [prefModel, setPrefModel] = useState(() => getStudioPrefs().model ?? "");
  const [prefAspect, setPrefAspect] = useState(() => getStudioPrefs().aspectRatio ?? "");

  const load = React.useCallback(async () => {
    try {
      const res = await videoStudioApi.getConfig();
      setConfig(res);
      setUsage(await videoStudioApi.usage());
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل تحميل إعدادات الاستوديو"));
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setTestResult(null);
    }
  }, [open, load]);

  const save = async () => {
    if (!keyId.trim() || !secret.trim()) return;
    setSaving(true);
    try {
      await videoStudioApi.saveByok({ keyId: keyId.trim(), secret: secret.trim() });
      setKeyId("");
      setSecret("");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل حفظ المفتاح"));
    } finally {
      setSaving(false);
    }
  };

  const testProvided = async () => {
    if (!keyId.trim() || !secret.trim()) return;
    setTesting(true);
    try {
      setTestResult(await videoStudioApi.testKey({ keyId: keyId.trim(), secret: secret.trim() }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل اختبار المفتاح"));
    } finally {
      setTesting(false);
    }
  };

  const testSaved = async () => {
    setTesting(true);
    try {
      setTestResult(await videoStudioApi.testKey());
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل اختبار المفتاح"));
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    try {
      await videoStudioApi.deleteByok();
      setTestResult(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل حذف المفتاح"));
    }
  };

  const applyPrefs = (patch: { model?: string; aspectRatio?: string }) => {
    if (patch.model !== undefined) setPrefModel(patch.model);
    if (patch.aspectRatio !== undefined) setPrefAspect(patch.aspectRatio);
    saveStudioPrefs(patch);
  };

  const keyChip = testResult ? KEY_STATE[testResult.state] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border/70">
          <SheetTitle className="text-sm">إعدادات الاستوديو</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Wallet */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">الرصيد</h3>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
              <div>
                <p className="text-lg font-bold tabular-nums">{formatEgp(config?.walletBalance ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">محفظة الشركة — الخصم تلقائي لكل توليد</p>
              </div>
              <Link to="/payments" target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <ExternalLink className="size-3.5" />
                شحن
              </Link>
            </div>
          </section>

          {/* BYOK */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">مفتاحك الخاص (Higgsfield)</h3>
            {config?.byok.configured ? (
              <div className="space-y-2 rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <KeyRound className="size-3.5 text-emerald-600" />
                      مفعّل
                    </p>
                    <p dir="ltr" className="truncate text-[11px] tabular-nums text-muted-foreground">
                      {config.byok.masked}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testSaved} disabled={testing}>
                    {testing ? <Loader2 className="size-3 animate-spin" /> : <PlugZap className="size-3" />}
                    اختبار المفتاح
                  </Button>
                  {keyChip && <span className={cn("text-[11px] font-medium", keyChip.cls)}>{keyChip.label}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">كل التوليد على حسابك لدى Higgsfield — بدون خصم من المحفظة</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <p className="text-[11px] text-muted-foreground">
                  عندك حساب Higgsfield؟ حط مفتاحك والتوليد كله على حسابك بلا رسوم من المنصة.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="byok-key-id" className="text-xs">Key ID</Label>
                  <Input id="byok-key-id" value={keyId} onChange={(e) => setKeyId(e.target.value)} dir="ltr" placeholder="hf_..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="byok-secret" className="text-xs">Secret</Label>
                  <Input id="byok-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} dir="ltr" />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={save} disabled={!keyId.trim() || !secret.trim() || saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    حفظ المفتاح
                  </Button>
                  <Button size="sm" variant="outline" onClick={testProvided} disabled={!keyId.trim() || !secret.trim() || testing}>
                    {testing ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />}
                    اختبار قبل الحفظ
                  </Button>
                  {keyChip && <span className={cn("text-[11px] font-medium", keyChip.cls)}>{keyChip.label}</span>}
                </div>
              </div>
            )}
          </section>

          {/* Prefs */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">تفضيلاتي</h3>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الموديل الافتراضي</Label>
                <Select value={prefModel || undefined} onValueChange={(v) => { if (v) applyPrefs({ model: v }); }}>
                  <SelectTrigger className="h-8 w-full"><SelectValue placeholder="افتراضي المنصة" /></SelectTrigger>
                  <SelectContent>
                    {videoModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الأبعاد الافتراضية</Label>
                <Select value={prefAspect || undefined} onValueChange={(v) => { if (v) applyPrefs({ aspectRatio: v }); }}>
                  <SelectTrigger className="h-8 w-full"><SelectValue placeholder="9:16" /></SelectTrigger>
                  <SelectContent>
                    {["9:16", "16:9", "1:1"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(prefModel || prefAspect) && (
                <p className="col-span-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Check className="size-3 text-emerald-600" />
                  بتتطبق تلقائيًا على مشهد جديد
                </p>
              )}
            </div>
          </section>

          {/* Usage */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">استخدامي</h3>
            <div className="space-y-1.5 rounded-lg border border-border bg-card px-3 py-2.5 text-xs tabular-nums">
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي توليداتك</span><span className="font-semibold">{usage?.totalJobs ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">آخر 30 يوم (مكتملة)</span><span className="font-semibold">{usage ? `${usage.completed30} من ${usage.jobs30}` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">مصروفك على التوليد</span><span className="font-semibold">{usage ? `${usage.revenueEgp.toLocaleString("en-US")} ج.م` : "—"}</span></div>
            </div>
          </section>

          {config?.simulation && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
              وضع المحاكاة شغال (مفيش مفتاح) — المخرجات تجريبية بلا أي تكلفة.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
