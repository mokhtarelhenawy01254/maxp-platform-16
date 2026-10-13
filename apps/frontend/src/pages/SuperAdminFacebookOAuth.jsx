import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Save, Eye, EyeOff, Info, Facebook, Copy, Check, ExternalLink, ShieldCheck, Key } from "lucide-react";

const DEFAULT_VERIFY_TOKEN = "61d94df61ed00ab77e2a7e2c15458d7ce9ec8abc4520a6a83f0b483829617314";

const SuperAdminFacebookOAuth = () => {
  const [config, setConfig] = useState({
    appId: "",
    appSecret: "",
    redirectUri: "",
    facebookWebhookVerifyToken: "",
    whatsappAppId: "",
    whatsappAppSecret: "",
    whatsappConfigId: "",
    whatsappWebhookVerifyToken: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true); setError(null);
      const response = await fetch(buildApiUrl("admin/facebook-oauth/config"), { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) setConfig({
        appId: data.data.appId || "",
        appSecret: data.data.appSecret || "",
        redirectUri: data.data.redirectUri || `${window.location.origin}/api/v1/facebook-oauth/callback`,
        facebookWebhookVerifyToken: data.data.facebookWebhookVerifyToken || DEFAULT_VERIFY_TOKEN,
        whatsappAppId: data.data.whatsappAppId || "",
        whatsappAppSecret: data.data.whatsappAppSecret || "",
        whatsappConfigId: data.data.whatsappConfigId || "",
        whatsappWebhookVerifyToken: data.data.whatsappWebhookVerifyToken || "",
      });
      else setError(data.message || "فشل في جلب الإعدادات");
    } catch (err) { setError("فشل في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true); setError(null); setSuccess(null);
      const response = await fetch(buildApiUrl("admin/facebook-oauth/config"), {
        method: "POST", headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) { setSuccess(data.message || "تم حفظ الإعدادات بنجاح"); await fetchConfig(); }
      else setError(data.message || "فشل في حفظ الإعدادات");
    } catch (err) { setError("فشل في الاتصال بالخادم"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  const isConfigured = Boolean(config.appId && config.appSecret && config.redirectUri);
  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/v1/webhook`;
  const pageCallbackUrl = `${origin}/api/v1/facebook-oauth/callback`;
  const pixelCallbackUrl = `${origin}/api/v1/facebook-oauth/pixel-callback`;
  const effectiveVerifyToken = config.facebookWebhookVerifyToken || DEFAULT_VERIFY_TOKEN;

  return (
    <div className="w-full space-y-4 max-w-5xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-blue-500/10 flex items-center justify-center shrink-0 text-[#1877F2]">
            <Facebook className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                إعدادات Facebook OAuth & Webhooks
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                <span className={`size-1.5 rounded-full ${isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                {isConfigured ? "مُكوَّن ونشط" : "بحاجة إعداد"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تكوين الربط المركزي لتطبيقات Meta for Developers واستقبال ويب هوك الصفحات ومحادثات واتساب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform shadow-xs"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="size-3.5" />}
            <span>حفظ الإعدادات</span>
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="rounded-xl"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
      {success && <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"><AlertDescription className="text-xs">{success}</AlertDescription></Alert>}

      {/* Meta Developer Integration Endpoints Strip */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden shadow-xs">
        <div className="p-3 border-b border-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Info className="size-4" />
            <span>بيانات الإعداد في لوحة تحكم Meta for Developers</span>
          </div>
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
          >
            <span>Meta Developers</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Webhook Callback */}
          <div className="rounded-lg border border-border/80 bg-background/90 p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">
              رابط الويب هوك (Callback URL) في Webhooks:
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-semibold text-foreground break-all select-all">{webhookUrl}</code>
              <Button size="sm" variant="ghost" className="h-6 px-2 shrink-0 text-xs font-mono gap-1" onClick={() => copyToClipboard(webhookUrl, "webhook")}>
                {copiedKey === "webhook" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedKey === "webhook" ? "تم" : "نسخ"}</span>
              </Button>
            </div>
          </div>

          {/* Webhook Verify Token */}
          <div className="rounded-lg border border-border/80 bg-background/90 p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">
              رمز التحقق (Verify Token) للويب هوك:
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 break-all select-all">{effectiveVerifyToken}</code>
              <Button size="sm" variant="ghost" className="h-6 px-2 shrink-0 text-xs font-mono gap-1" onClick={() => copyToClipboard(effectiveVerifyToken, "verifyToken")}>
                {copiedKey === "verifyToken" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedKey === "verifyToken" ? "تم" : "نسخ"}</span>
              </Button>
            </div>
          </div>

          {/* Page OAuth Redirect */}
          <div className="rounded-lg border border-border/80 bg-background/90 p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">
              رابط OAuth Redirect URI (في Facebook Login):
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-muted-foreground break-all select-all">{pageCallbackUrl}</code>
              <Button size="sm" variant="ghost" className="h-6 px-2 shrink-0 text-xs font-mono gap-1" onClick={() => copyToClipboard(pageCallbackUrl, "pageOauth")}>
                {copiedKey === "pageOauth" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedKey === "pageOauth" ? "تم" : "نسخ"}</span>
              </Button>
            </div>
          </div>

          {/* Pixel OAuth Redirect */}
          <div className="rounded-lg border border-border/80 bg-background/90 p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">
              رابط Pixel Redirect URI (في Facebook Login Settings):
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-muted-foreground break-all select-all">{pixelCallbackUrl}</code>
              <Button size="sm" variant="ghost" className="h-6 px-2 shrink-0 text-xs font-mono gap-1" onClick={() => copyToClipboard(pixelCallbackUrl, "pixelOauth")}>
                {copiedKey === "pixelOauth" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copiedKey === "pixelOauth" ? "تم" : "نسخ"}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg bg-muted/40 p-2 text-[11px] space-y-0.5 border border-border/50">
            <span className="font-medium text-foreground block">حقول الاشتراك المطلوبة في صفحة الويب هوك (Page Webhook Fields):</span>
            <code className="font-mono text-muted-foreground block break-all text-[10px]">
              messages, messaging_postbacks, message_deliveries, message_reads, message_echoes, feed
            </code>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden divide-y divide-border/60">
        {/* Section 1: Facebook App Core Config */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Facebook className="size-4 text-[#1877F2]" />
            <h2 className="text-sm font-semibold text-foreground">بيانات تطبيق فيسبوك الأساسي</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Facebook App ID</Label>
              <Input
                value={config.appId}
                onChange={e => setConfig(p => ({ ...p, appId: e.target.value }))}
                placeholder="أدخل App ID للتطبيق الأساسي"
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">Facebook App Secret</Label>
              <div className="relative mt-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={config.appSecret}
                  onChange={e => setConfig(p => ({ ...p, appSecret: e.target.value }))}
                  placeholder="أدخل App Secret للتطبيق الأساسي"
                  className="h-8 text-xs font-mono pl-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 absolute left-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">رابط إعادة التوجيه (Redirect URI)</Label>
              <Input
                value={config.redirectUri}
                onChange={e => setConfig(p => ({ ...p, redirectUri: e.target.value }))}
                placeholder={pageCallbackUrl}
                className="mt-1 h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                الرابط الافتراضي: {pageCallbackUrl}
              </p>
            </div>

            <div>
              <Label className="text-xs">رمز التحقق للويب هوك (Verify Token)</Label>
              <Input
                value={config.facebookWebhookVerifyToken}
                onChange={e => setConfig(p => ({ ...p, facebookWebhookVerifyToken: e.target.value }))}
                placeholder={DEFAULT_VERIFY_TOKEN}
                className="mt-1 h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                يجب إدخال نفس الرمز بدقة في لوحة تحكم Meta عند تفعيل الويب هوك
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: WhatsApp Cloud Connect (Optional) */}
        <div className="p-4 space-y-4 bg-muted/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">إعدادات WhatsApp Cloud Connect المنفصلة (اختياري)</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              اترك الحقول فارغة لاستخدام تطبيق فيسبوك الأساسي تلقائياً للواتساب
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">WhatsApp App ID</Label>
              <Input
                value={config.whatsappAppId}
                onChange={e => setConfig(p => ({ ...p, whatsappAppId: e.target.value }))}
                placeholder="أدخل App ID الخاص بالواتساب"
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">WhatsApp App Secret</Label>
              <div className="relative mt-1">
                <Input
                  type={showWaSecret ? "text" : "password"}
                  value={config.whatsappAppSecret}
                  onChange={e => setConfig(p => ({ ...p, whatsappAppSecret: e.target.value }))}
                  placeholder="أدخل App Secret الخاص بالواتساب"
                  className="h-8 text-xs font-mono pl-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 absolute left-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowWaSecret(!showWaSecret)}
                >
                  {showWaSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">WhatsApp Configuration ID</Label>
              <Input
                value={config.whatsappConfigId}
                onChange={e => setConfig(p => ({ ...p, whatsappConfigId: e.target.value }))}
                placeholder="Configuration ID الخاص بـ Facebook Login for Business"
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">WhatsApp Webhook Verify Token</Label>
              <Input
                value={config.whatsappWebhookVerifyToken}
                onChange={e => setConfig(p => ({ ...p, whatsappWebhookVerifyToken: e.target.value }))}
                placeholder="أدخل رمز التحقق الخاص بالويب هوك للواتساب"
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-3 bg-muted/20 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform shadow-xs"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="size-3.5" />}
            <span>حفظ الإعدادات</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminFacebookOAuth;