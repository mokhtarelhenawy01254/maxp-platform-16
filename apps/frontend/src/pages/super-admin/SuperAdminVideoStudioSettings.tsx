// Super-admin: AI Video Studio settings — pricing with live preview, limits, engine, key status, usage.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clapperboard, KeyRound, Loader2, RefreshCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import apiClient from "../../services/apiClient";
import { getApiErrorMessage } from "../advertising/video-studio/videoStudioApi";
import type { AdminSettings, KeyTestResult, UsageSnapshot } from "../advertising/video-studio/videoStudioApi";
import { cn } from "@/lib/utils";

// preview basis: 5 seconds on the flagship video model (kling-4.0 = $0.11/s)
const PREVIEW_MODEL_USD = 0.11 * 5;

const num = (v: string | number, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function previewEgp(s: AdminSettings): number {
  const egp = PREVIEW_MODEL_USD * num(s.usdToEgp) * (1 + num(s.markupPercent) / 100);
  return Math.max(num(s.minChargeEgp), round2(egp));
}

const SIMULATION_LABELS: Record<AdminSettings["simulationMode"], string> = {
  auto: "تلقائي — محاكاة فقط لما مفيش مفتاح",
  always: "دايمًا — إجباري (بيئة تجربة)",
  never: "أبدًا — الرفض لو مفيش مفتاح",
};

const KEY_STATE: Record<KeyTestResult["state"], { label: string; cls: string }> = {
  accepted: { label: "المفتاح مقبول", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "مرفوض من المزود", cls: "bg-destructive/10 text-destructive" },
  invalid_format: { label: "صيغة المفتاح غلط (لازم KeyID:Secret)", cls: "bg-destructive/10 text-destructive" },
  reachable: { label: "السيرفر واصل لكن الحالة غير متوقعة", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  unreachable: { label: "تعذر الوصول للمزود", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  no_key: { label: "لا يوجد مفتاح — المحاكاة شغالة", cls: "bg-muted text-muted-foreground" },
};

export default function SuperAdminVideoStudioSettings() {
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [baseline, setBaseline] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyState, setKeyState] = useState<KeyTestResult | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminSettings }>("/video-studio/admin/settings");
      const s = res.data.data;
      setDraft(s);
      setBaseline(JSON.stringify(s));
      const u = await apiClient.get<{ success: boolean; data: UsageSnapshot }>("/video-studio/admin/usage");
      setUsage(u.data.data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل تحميل إعدادات الاستوديو"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = draft ? JSON.stringify(draft) !== baseline : false;

  const patch = (p: Partial<AdminSettings>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean; data: AdminSettings }>("/video-studio/admin/settings", {
        usdToEgp: num(draft.usdToEgp),
        markupPercent: num(draft.markupPercent),
        minChargeEgp: num(draft.minChargeEgp),
        maxJobsPerDayPerCompany: Math.max(1, Math.round(num(draft.maxJobsPerDayPerCompany, 50))),
        simulationMode: draft.simulationMode,
        baseUrl: draft.baseUrl?.trim() || null,
      });
      setDraft(res.data.data);
      setBaseline(JSON.stringify(res.data.data));
      toast.success("تم حفظ إعدادات الاستوديو");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل حفظ الإعدادات"));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: KeyTestResult }>("/video-studio/admin/connection-test");
      setKeyState(res.data.data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "فشل اختبار الاتصال"));
    } finally {
      setTesting(false);
    }
  };

  const preview = useMemo(() => (draft ? previewEgp(draft) : 0), [draft]);
  const keyChip = keyState ? KEY_STATE[keyState.state] : null;

  if (!draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Clapperboard className="size-5 text-primary" />
        <h1 className="text-base font-semibold">إعدادات استوديو الفيديو</h1>
        <Button size="sm" variant="outline" className="ms-auto" onClick={load} aria-label="تحديث">
          <RefreshCcw className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pricing + limits + engine */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">التسعير والحدود والمحرك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="vs-fx">سعر الصرف (ج.م لكل $)</Label>
                <Input id="vs-fx" type="number" min={0} step="0.5" className="tabular-nums"
                  value={draft.usdToEgp} onChange={(e) => patch({ usdToEgp: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vs-markup">هامش الربح %</Label>
                <Input id="vs-markup" type="number" min={0} step="5" className="tabular-nums"
                  value={draft.markupPercent} onChange={(e) => patch({ markupPercent: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vs-min">أقل خصم (ج.م)</Label>
                <Input id="vs-min" type="number" min={0} step="0.5" className="tabular-nums"
                  value={draft.minChargeEgp} onChange={(e) => patch({ minChargeEgp: num(e.target.value) })} />
              </div>
            </div>
            <p className="rounded-md bg-muted px-3 py-2 text-xs tabular-nums text-muted-foreground">
              معاينة: مشهد 5 ثواني على Kling 4.0 = <span className="font-semibold text-foreground">{preview.toLocaleString("en-US")} ج.م</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vs-cap">سقف التوليد / شركة / يوم</Label>
                <Input id="vs-cap" type="number" min={1} className="tabular-nums"
                  value={draft.maxJobsPerDayPerCompany}
                  onChange={(e) => patch({ maxJobsPerDayPerCompany: num(e.target.value, 50) })} />
              </div>
              <div className="space-y-1.5">
                <Label>وضع المحاكاة</Label>
                <Select value={draft.simulationMode} onValueChange={(v) => { if (v) patch({ simulationMode: v as AdminSettings["simulationMode"] }); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SIMULATION_LABELS) as AdminSettings["simulationMode"][]).map((m) => (
                      <SelectItem key={m} value={m}>{SIMULATION_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vs-base">Base URL بديل (اختياري)</Label>
              <Input id="vs-base" dir="ltr" placeholder="https://api.higgsfield.ai"
                value={draft.baseUrl ?? ""} onChange={(e) => patch({ baseUrl: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={!dirty || saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {dirty ? "حفظ التعديلات" : "محفوظ"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Central key + usage */}
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">المفتاح المركزي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {keyChip && (
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", keyChip.cls)}>
                  {keyChip.label}{keyState?.status ? ` (${keyState.status})` : ""}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={testConnection} disabled={testing}>
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                  اختبار الاتصال
                </Button>
                <Link
                  to="/super-admin/ai-key-manager"
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  <KeyRound className="size-3.5" />
                  إدارة المفاتيح
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">الاستخدام (آخر 30 يوم)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي التوليدات (كلي)</span><span className="font-semibold">{usage?.totalJobs ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">توليدات آخر 30 يوم</span><span className="font-semibold">{usage?.jobs30 ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">مكتملة / على المنصة / على مفتاح التاجر</span><span className="font-semibold">{usage ? `${usage.completed30} / ${usage.platform30} / ${usage.byok30}` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">إيراد المنصة</span><span className="font-semibold">{usage ? `${usage.revenueEgp.toLocaleString("en-US")} ج.م` : "—"}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
