import React, { useState, useEffect } from "react";
import {
  Key,
  Webhook,
  Code2,
  Copy,
  Check,
  Plus,
  Trash2,
  ShieldCheck,
  Cpu,
  Download,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import api from "../../services/api";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  name: string;
  targetUrl: string;
  subscribedEvents: string;
  isActive: boolean;
  lastTriggeredAt?: string;
}

export default function HRApiIntegrations() {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "docs">("keys");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New key form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["*"]);
  const [newlyCreatedRawKey, setNewlyCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // New webhook form state
  const [newHookName, setNewHookName] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [isSubmittingHook, setIsSubmittingHook] = useState(false);
  const [isDownloadingSpec, setIsDownloadingSpec] = useState(false);

  const handleDownloadOpenApi = async () => {
    setIsDownloadingSpec(true);
    try {
      const response = await fetch("https://api.maxp.online/api/v1/external/hr/openapi.json");
      if (!response.ok) throw new Error("Failed to fetch spec");
      const json = await response.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "openapi-hr.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم تحميل مواصفات OpenAPI بنجاح");
    } catch {
      window.open("/docs/api/openapi-hr.json", "_blank");
    } finally {
      setIsDownloadingSpec(false);
    }
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr/external-api/keys");
      if (res.data?.success) {
        setKeys(res.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "فشل تحميل مفاتيح الـ API");
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await api.get("/hr/external-api/webhooks");
      if (res.data?.success) {
        setWebhooks(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load webhooks:", err);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("يرجى كتابة اسم تعريفي للمفتاح");
      return;
    }

    try {
      const res = await api.post("/hr/external-api/keys", {
        name: newKeyName.trim(),
        scopes: selectedScopes
      });

      if (res.data?.success) {
        setNewlyCreatedRawKey(res.data.data.rawKey);
        toast.success("تم إنشاء مفتاح API بنجاح");
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "فشل إنشاء المفتاح");
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من إلغاء وتجميد هذا المفتاح؟ لن تتمكن أي أداة من استخدامه مجدداً.")) {
      return;
    }

    try {
      const res = await api.delete(`/hr/external-api/keys/${id}`);
      if (res.data?.success) {
        toast.success("تم إلغاء المفتاح بنجاح");
        fetchKeys();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "فشل إلغاء المفتاح");
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHookName.trim() || !newHookUrl.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setIsSubmittingHook(true);
      const res = await api.post("/hr/external-api/webhooks", {
        name: newHookName.trim(),
        targetUrl: newHookUrl.trim(),
        subscribedEvents: ["*"]
      });

      if (res.data?.success) {
        toast.success("تم إضافة اشتراك الـ Webhook بنجاح");
        setNewHookName("");
        setNewHookUrl("");
        fetchWebhooks();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "فشل تسجيل الـ Webhook");
    } finally {
      setIsSubmittingHook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("تم نسخ المفتاح إلى الحافظة");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              الربط الخارجي وأدوات الذكاء الاصطناعي (HR API & Integrations)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            إدارة مفاتيح API الآمنة، واستقبال بصمات الأجهزة، والتكامل مع نماذج الذكاء الاصطناعي وأنظمة الـ ERP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setNewlyCreatedRawKey(null);
              setNewKeyName("");
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء مفتاح جديد</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/40 space-x-reverse space-x-4">
        <button
          onClick={() => setActiveTab("keys")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "keys"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>مفاتيح الـ API ({keys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "webhooks"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Webhook className="h-4 w-4" />
          <span>الـ Webhooks والأحداث اللحظية</span>
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "docs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>توثيق الذكاء الاصطناعي (OpenAPI)</span>
        </button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل المفاتيح…</div>
          ) : keys.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-xl p-8 text-center space-y-3">
              <Key className="h-10 w-10 text-muted-foreground/60 mx-auto" />
              <div className="text-sm font-medium">لا توجد مفاتيح API حتى الآن</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                قم بإنشاء مفتاح للربط مع أجهزة البصمة، أو التكامل مع أنظمة ERP، أو تفويض وكلاء الذكاء الاصطناعي.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="bg-card border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{k.name}</span>
                      <Badge variant={k.isActive ? "default" : "secondary"} className="text-xs">
                        {k.isActive ? "نشط" : "ملغي"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span>البادئة:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-foreground font-semibold">{k.keyPrefix}****</code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      تاريخ الإنشاء: {new Date(k.createdAt).toLocaleDateString("ar-EG")}
                      {k.lastUsedAt && ` — آخر استخدام: ${new Date(k.lastUsedAt).toLocaleDateString("ar-EG")}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {k.isActive && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-xs flex items-center gap-1 active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>إلغاء المفتاح</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <span>إضافة رابط استقبال أحداث فوري (Webhook)</span>
            </h3>
            <form onSubmit={handleCreateWebhook} className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="اسم النظام (مثال: n8n HR Automation)"
                value={newHookName}
                onChange={(e) => setNewHookName(e.target.value)}
                className="bg-background border border-input rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
              <input
                type="url"
                placeholder="رابط الـ Webhook (https://...)"
                value={newHookUrl}
                onChange={(e) => setNewHookUrl(e.target.value)}
                className="bg-background border border-input rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
              <Button type="submit" disabled={isSubmittingHook} size="sm" className="text-xs">
                {isSubmittingHook ? "جاري الإضافة…" : "حفظ الرابط"}
              </Button>
            </form>
          </div>

          <div className="grid gap-3">
            {webhooks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد اشتراكات Webhook مسجلة.</p>
            ) : (
              webhooks.map((w) => (
                <div key={w.id} className="bg-card border border-border/50 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <code className="text-muted-foreground font-mono">{w.targetUrl}</code>
                  </div>
                  <Badge variant="outline">نشط</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOCS & AI TOOLS */}
      {activeTab === "docs" && (
        <div className="space-y-4 bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div>
              <h3 className="font-semibold text-sm">مواصفات الـ API الموحدة للذكاء الاصطناعي (OpenAPI 3.1)</h3>
              <p className="text-xs text-muted-foreground">
                يمكنك تحميل هذا الملف واستيراده مباشرة في Custom GPT أو Claude أو n8n ليتعرف النموذج تلقائياً على دوال الموارد البشرية.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://api.maxp.online/api/v1/external/hr/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-background hover:bg-muted text-foreground rounded-lg active:scale-95 transition-transform"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <span>Swagger التفاعلي</span>
              </a>

              <Button
                size="sm"
                onClick={handleDownloadOpenApi}
                disabled={isDownloadingSpec}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isDownloadingSpec ? "جاري التحميل…" : "تحميل openapi-hr.json"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold">مسار الأساس للربط (Base URL):</span>
            <pre className="bg-muted p-2 rounded-lg text-xs font-mono text-foreground select-all">
              https://api.maxp.online/api/v1/external/hr
            </pre>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold">طريقة تمرير المفتاح:</span>
            <pre className="bg-muted p-2 rounded-lg text-xs font-mono text-foreground select-all">
              Header: x-api-key: hrk_xxxxxxxx_yyyyyyyy
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: CREATE API KEY */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base">إنشاء مفتاح API جديد</h3>

            {!newlyCreatedRawKey ? (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">اسم المفتاح (مثال: بصمة الفرع الرئيسي أو AI Assistant)</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="اسم تعريفي واضح"
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">الصلاحيات الممنوحة</label>
                  <select
                    value={selectedScopes[0] || "*"}
                    onChange={(e) => setSelectedScopes([e.target.value])}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  >
                    <option value="*">* — كافة الصلاحيات (Full HR Access)</option>
                    <option value="hr:read">hr:read — قراءة شاملة (All HR Read Endpoints)</option>
                    <option value="hr:write">hr:write — كتابة شاملة (All HR Write Endpoints)</option>
                    <option value="hr:departments:read">hr:departments:read — استعلام الأقسام فقط</option>
                    <option value="hr:positions:read">hr:positions:read — استعلام المسميات الوظيفية فقط</option>
                    <option value="hr:employees:read">hr:employees:read — استعلام الموظفين والإحصائيات والهيكل</option>
                    <option value="hr:employees:write">hr:employees:write — إضافة وتحديث الموظفين</option>
                    <option value="hr:attendance:ingest">hr:attendance:ingest — تسجيل وبث حركات البصمة</option>
                    <option value="hr:attendance:read">hr:attendance:read — استعلام الحضور والملخص اليومي</option>
                    <option value="hr:leaves:read">hr:leaves:read — استعلام طلبات وأرصدة الإجازات</option>
                    <option value="hr:leaves:write">hr:leaves:write — تقديم طلبات إجازة جديدة</option>
                    <option value="hr:leaves:approve">hr:leaves:approve — اتخاذ قرار قبول/رفض الإجازات</option>
                    <option value="hr:payroll:read">hr:payroll:read — استعلام مسيرات ورواتب الموظفين</option>
                    <option value="hr:advances:read">hr:advances:read — استعلام طلبات السلف المالية</option>
                    <option value="hr:deductions:read">hr:deductions:read — استعلام سجلات الخصومات والجزاءات</option>
                    <option value="hr:deductions:write">hr:deductions:write — إنشاء وتعديل الخصومات والجزاءات</option>
                    <option value="hr:rewards:read">hr:rewards:read — استعلام سجلات المكافآت والحوافز وقواعد الالتزام بالدوام</option>
                    <option value="hr:rewards:write">hr:rewards:write — إنشاء ومنح المكافآت وتقييم قواعد الالتزام بالدوام</option>
                    <option value="hr:shifts:read">hr:shifts:read — استعلام الورديات والمناوبات</option>
                    <option value="hr:shifts:write">hr:shifts:write — إنشاء وتعديل وتعيين الورديات للموظفين</option>
                    <option value="hr:settings:read">hr:settings:read — استعلام إعدادات الموارد البشرية المقسمة</option>
                    <option value="hr:settings:write">hr:settings:write — تعديل إعدادات الموارد البشرية مع دمج الأقسام</option>
                    <option value="hr:attendance:write">hr:attendance:write — تصحيح وإعادة حساب سجلات الحضور والانصراف</option>
                    <option value="hr:warnings:read">hr:warnings:read — استعلام الإنذارات واللفتات الإدارية</option>
                    <option value="hr:resignations:read">hr:resignations:read — استعلام طلبات وإنهاء الاستقالات</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" size="sm">
                    توليد المفتاح
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>يرجى نسخ هذا المفتاح وحفظه الآن، فلن تتمكن من رؤيته مرة أخرى لأسباب أمنية.</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">مفتاح الـ API:</span>
                    <button
                      onClick={() => copyToClipboard(newlyCreatedRawKey)}
                      className="text-xs text-primary flex items-center gap-1"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey ? "تم النسخ" : "نسخ المفتاح"}</span>
                    </button>
                  </div>
                  <pre className="bg-muted p-2.5 rounded-lg text-xs font-mono break-all text-foreground select-all">
                    {newlyCreatedRawKey}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewlyCreatedRawKey(null);
                    }}
                  >
                    تم الحفظ وإغلاق
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
