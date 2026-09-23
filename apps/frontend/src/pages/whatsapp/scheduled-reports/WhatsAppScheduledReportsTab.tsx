import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Send,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Eye,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "../../../services/apiClient";
import { WhatsAppSurfaceCard } from "../components/WhatsAppPageShell";

interface ScheduledReportConfig {
  id?: string;
  companyId?: string;
  name: string;
  isEnabled: boolean;
  reportType: string;
  frequency: "DAILY" | "WEEKLY";
  sendTime: string;
  daysOfWeek: string;
  recipients: string;
  includeSales: boolean;
  includeOps: boolean;
  includeStock: boolean;
  includeTopItems: boolean;
  sessionId: string | null;
  lastSentAt?: string | null;
  lastSentStatus?: string | null;
}

interface WhatsAppSession {
  id: string;
  name: string;
  phoneNumber?: string | null;
  status: string;
  provider: string;
}

interface WhatsAppScheduledReportsTabProps {
  companyId?: string;
}

const DEFAULT_CONFIG: ScheduledReportConfig = {
  name: "تقرير نهاية اليوم للمبيعات والعمليات",
  isEnabled: false,
  reportType: "DAILY_EOD",
  frequency: "DAILY",
  sendTime: "21:00",
  daysOfWeek: "ALL",
  recipients: "",
  includeSales: true,
  includeOps: true,
  includeStock: true,
  includeTopItems: true,
  sessionId: null,
};

export const WhatsAppScheduledReportsTab: React.FC<WhatsAppScheduledReportsTabProps> = ({
  companyId,
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [config, setConfig] = useState<ScheduledReportConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [previewText, setPreviewText] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [notice, setNotice] = useState<{ tone: "positive" | "negative"; message: string } | null>(null);

  const showNotice = (tone: "positive" | "negative", message: string) => {
    setNotice({ tone, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = companyId ? `?companyId=${companyId}` : "";
      const res: any = await apiClient.get(`/whatsapp/scheduled-reports/configs${queryParams}`);
      if (res.data?.success) {
        if (res.data.configs && res.data.configs.length > 0) {
          setConfig(res.data.configs[0]);
          setTestPhone(res.data.configs[0].recipients?.split(",")[0] || "");
        }
        setSessions(res.data.sessions || []);
      }
    } catch {
      showNotice("negative", isAr ? "فشل جلب إعدادات التقارير المجدولة" : "Failed to load report settings");
    } finally {
      setLoading(false);
    }
  }, [companyId, isAr]);

  const loadPreview = useCallback(async () => {
    setRefreshingPreview(true);
    try {
      const res: any = await apiClient.post("/whatsapp/scheduled-reports/preview", {
        includeSales: config.includeSales,
        includeOps: config.includeOps,
        includeStock: config.includeStock,
        includeTopItems: config.includeTopItems,
        ...(companyId ? { companyId } : {}),
      });
      if (res.data?.success) {
        setPreviewText(res.data.preview?.messageText || "");
      }
    } catch {
      // preview non-fatal
    } finally {
      setRefreshingPreview(false);
    }
  }, [config.includeSales, config.includeOps, config.includeStock, config.includeTopItems, companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      loadPreview();
    }
  }, [loading, loadPreview]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res: any = await apiClient.post("/whatsapp/scheduled-reports/configs", {
        ...config,
        ...(companyId ? { companyId } : {}),
      });
      if (res.data?.success) {
        setConfig(res.data.config);
        showNotice("positive", isAr ? "تم حفظ إعدادات التقرير المجدول بنجاح" : "Report settings saved successfully");
      }
    } catch (err: any) {
      showNotice("negative", err.response?.data?.error || (isAr ? "فشل حفظ الإعدادات" : "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim() && !config.recipients.trim()) {
      showNotice("negative", isAr ? "يرجى إدخال رقم هاتف للاختبار أولاً" : "Please specify a recipient phone number");
      return;
    }
    setTesting(true);
    try {
      const res: any = await apiClient.post("/whatsapp/scheduled-reports/test-send", {
        configId: config.id,
        testPhone: testPhone.trim() || undefined,
        config,
        ...(companyId ? { companyId } : {}),
      });
      if (res.data?.success) {
        showNotice("positive", res.data.message || (isAr ? "تم إرسال التقرير التجريبي بنجاح" : "Test report sent"));
      }
    } catch (err: any) {
      showNotice("negative", err.response?.data?.error || (isAr ? "فشل إرسال التقرير التجريبي" : "Failed test send"));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[color:var(--color-muted-foreground)]">
        <RefreshCw className="size-5 animate-spin ltr:mr-2 rtl:ml-2" />
        {isAr ? "جاري تحميل إعدادات التقارير المجدولة..." : "Loading scheduled reports..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.tone === "positive"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300"
          }`}
        >
          {notice.tone === "positive" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Controls Column */}
        <div className="space-y-4">
          <WhatsAppSurfaceCard
            title={isAr ? "جدولة وإرسال التقارير اليومية" : "Automatic Scheduled Reports"}
            description={
              isAr
                ? "إرسال ملخص تنفيذي للمبيعات والعمليات والمخزون مباشرة إلى هواتف الإدارة عبر الواتساب."
                : "Deliver executive sales and fulfillment summaries directly to managers via WhatsApp."
            }
            action={
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, isEnabled: checked }))}
              />
            }
          >
            <div className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                    {isAr ? "دورية الإرسال" : "Cadence"}
                  </Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(val: "DAILY" | "WEEKLY") => setConfig((prev) => ({ ...prev, frequency: val }))}
                  >
                    <SelectTrigger className="h-10 border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">{isAr ? "يومياً (Daily)" : "Daily"}</SelectItem>
                      <SelectItem value="WEEKLY">{isAr ? "أسبوعياً (Weekly)" : "Weekly"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                    {isAr ? "توقيت الإرسال بتوقيت المتجر" : "Send Time"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={config.sendTime}
                      onChange={(e) => setConfig((prev) => ({ ...prev, sendTime: e.target.value }))}
                      className="h-10 border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono tabular-nums"
                    />
                    <Clock className="pointer-events-none absolute top-3 size-4 text-[color:var(--color-muted-foreground)] ltr:right-3 rtl:left-3" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                  {isAr ? "أرقام هواتف المستلمين (مفصولة بفواصل)" : "Recipient Phone Numbers (comma-separated)"}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="201012345678, 201298765432"
                    value={config.recipients}
                    onChange={(e) => setConfig((prev) => ({ ...prev, recipients: e.target.value }))}
                    className="h-10 border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono text-sm tabular-nums"
                  />
                  <Smartphone className="pointer-events-none absolute top-3 size-4 text-[color:var(--color-muted-foreground)] ltr:right-3 rtl:left-3" />
                </div>
                <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                  {isAr ? "اكتب كود الدولة بدون علامة + (مثال: 2010xxxxxxx)" : "Use full international format without + (e.g. 2010xxxxxxx)"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                  {isAr ? "جلسة الواتساب المستخدمة" : "WhatsApp Session"}
                </Label>
                <Select
                  value={config.sessionId ?? "__default__"}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, sessionId: val === "__default__" ? null : val }))}
                >
                  <SelectTrigger className="h-10 border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                    <SelectValue placeholder={isAr ? "الجلسة المتصلة الافتراضية" : "Default Connected Session"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{isAr ? "الجلسة المتصلة الافتراضية للشركة" : "Default Company Connected Session"}</SelectItem>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.phoneNumber || s.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 border-t border-[color:var(--shell-control-border)]/50 pt-3">
                <Label className="text-xs font-semibold">{isAr ? "أقسام التقرير المضمنة" : "Included Sections"}</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)]/40 p-2.5 text-xs transition-colors hover:bg-[color:var(--color-muted)]/20 cursor-pointer">
                    <Switch
                      checked={config.includeSales}
                      onCheckedChange={(c) => setConfig((prev) => ({ ...prev, includeSales: c }))}
                    />
                    <span>{isAr ? "المبيعات والإيرادات" : "Sales & Revenue"}</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)]/40 p-2.5 text-xs transition-colors hover:bg-[color:var(--color-muted)]/20 cursor-pointer">
                    <Switch
                      checked={config.includeOps}
                      onCheckedChange={(c) => setConfig((prev) => ({ ...prev, includeOps: c }))}
                    />
                    <span>{isAr ? "حالات العمليات والتجهيز" : "Fulfillment & Ops"}</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)]/40 p-2.5 text-xs transition-colors hover:bg-[color:var(--color-muted)]/20 cursor-pointer">
                    <Switch
                      checked={config.includeTopItems}
                      onCheckedChange={(c) => setConfig((prev) => ({ ...prev, includeTopItems: c }))}
                    />
                    <span>{isAr ? "أكثر المنتجات طلباً" : "Top Selling Items"}</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)]/40 p-2.5 text-xs transition-colors hover:bg-[color:var(--color-muted)]/20 cursor-pointer">
                    <Switch
                      checked={config.includeStock}
                      onCheckedChange={(c) => setConfig((prev) => ({ ...prev, includeStock: c }))}
                    />
                    <span>{isAr ? "تنبيهات نواقص المخزون" : "Stock Shortage Alerts"}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[color:var(--shell-control-border)]/50 pt-4">
                <div className="text-xs text-[color:var(--color-muted-foreground)]">
                  {config.lastSentAt ? (
                    <span className="tabular-nums">
                      {isAr ? "آخر إرسال: " : "Last sent: "}
                      {new Date(config.lastSentAt).toLocaleString(isAr ? "ar-EG" : "en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span>{isAr ? "لم يتم الإرسال بعد" : "Never sent yet"}</span>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5 transition-transform active:scale-[0.97]"
                >
                  {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {isAr ? "حفظ الإعدادات" : "Save Settings"}
                </Button>
              </div>
            </div>
          </WhatsAppSurfaceCard>
        </div>

        {/* Live Preview & Instant Test Column */}
        <div className="space-y-4">
          <WhatsAppSurfaceCard
            title={isAr ? "معاينة حية للتقرير اليومي" : "Live WhatsApp Preview"}
            description={isAr ? "شكل الرسالة الحقيقي بناءً على أرقام ومبيعات اليوم" : "Exact rendered message with today's live numbers"}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={loadPreview}
                disabled={refreshingPreview}
                className="h-8 gap-1 text-xs"
              >
                <RefreshCw className={`size-3.5 ${refreshingPreview ? "animate-spin" : ""}`} />
                {isAr ? "تحديث" : "Refresh"}
              </Button>
            }
          >
            <div className="relative rounded-2xl border border-[color:var(--shell-control-border)]/60 bg-[#e5ddd5]/30 p-4 dark:bg-zinc-950/60">
              <div className="rounded-xl border border-white/20 bg-white/95 p-3.5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {previewText || (isAr ? "جاري تجهيز بيانات التقرير..." : "Preparing report data...")}
                </pre>
              </div>
            </div>
          </WhatsAppSurfaceCard>

          <WhatsAppSurfaceCard
            title={isAr ? "إرسال تقرير تجريبي فوري" : "Send Test Report Now"}
            description={isAr ? "تجربة وصول التقرير فوراً إلى هاتفك للتأكد من المحتوى والاتصال" : "Dispatch immediate sample report to verify delivery"}
          >
            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="2010xxxxxxxx"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="h-10 border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono text-sm tabular-nums"
                />
                <Button
                  onClick={handleTestSend}
                  disabled={testing}
                  variant="secondary"
                  className="shrink-0 gap-1.5 transition-transform active:scale-[0.97]"
                >
                  {testing ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {isAr ? "إرسال تجريبي" : "Send Test"}
                </Button>
              </div>
            </div>
          </WhatsAppSurfaceCard>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppScheduledReportsTab;
