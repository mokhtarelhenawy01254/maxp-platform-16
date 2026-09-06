import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuthSimple";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Save, Eye, EyeOff, Info, Facebook, Copy, Check, ExternalLink } from "lucide-react";

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

  const isConfigured = config.appId && config.appSecret && config.redirectUri;
  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/v1/webhook`;
  const pageCallbackUrl = `${origin}/api/v1/facebook-oauth/callback`;
  const pixelCallbackUrl = `${origin}/api/v1/facebook-oauth/pixel-callback`;
  const effectiveVerifyToken = config.facebookWebhookVerifyToken || DEFAULT_VERIFY_TOKEN;

  return (
    <div className="p-3 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Facebook className="text-[#1877F2]" /> إعدادات Facebook OAuth & Webhooks
        </h1>
        <p className="text-sm text-muted-foreground">
          قم بتكوين إعدادات تكامل Facebook OAuth والويب هوك للسماح بربط الصفحات والإعلانات واستقبال الرسائل
        </p>
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="mb-3"><AlertDescription>{success}</AlertDescription></Alert>}

      {/* 🚀 قسم بيانات الإعداد السريع لفيسبوك */}
      <Card className="mb-4 border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Info className="size-5" /> البيانات المطلوبة في لوحة تحكم Meta for Developers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">
            انسخ هذه الروابط والصقها مباشرة في إعدادات تطبيقك على منصة{" "}
            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-primary inline-flex items-center gap-1">
              Meta Developers <ExternalLink className="size-3" />
            </a>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* رابط الويب هوك */}
            <div className="bg-background/80 p-2.5 rounded-lg border">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                رابط الويب هوك (Callback URL) في Webhooks:
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs break-all font-mono font-bold text-primary">{webhookUrl}</code>
                <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => copyToClipboard(webhookUrl, "webhook")}>
                  {copiedKey === "webhook" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  <span className="text-xs mr-1">{copiedKey === "webhook" ? "تم النسخ" : "نسخ"}</span>
                </Button>
              </div>
            </div>

            {/* رمز التحقق */}
            <div className="bg-background/80 p-2.5 rounded-lg border">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                رمز التحقق (Verify Token) للويب هوك:
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs break-all font-mono font-bold text-green-600">{effectiveVerifyToken}</code>
                <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => copyToClipboard(effectiveVerifyToken, "verifyToken")}>
                  {copiedKey === "verifyToken" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  <span className="text-xs mr-1">{copiedKey === "verifyToken" ? "تم النسخ" : "نسخ"}</span>
                </Button>
              </div>
            </div>

            {/* رابط إعادة توجيه الصفحات والإعلانات */}
            <div className="bg-background/80 p-2.5 rounded-lg border">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                رابط OAuth Redirect URI (في Facebook Login Settings):
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs break-all font-mono text-foreground">{pageCallbackUrl}</code>
                <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => copyToClipboard(pageCallbackUrl, "pageOauth")}>
                  {copiedKey === "pageOauth" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  <span className="text-xs mr-1">{copiedKey === "pageOauth" ? "تم النسخ" : "نسخ"}</span>
                </Button>
              </div>
            </div>

            {/* رابط إعادة توجيه البكسل */}
            <div className="bg-background/80 p-2.5 rounded-lg border">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                رابط Pixel Redirect URI (في Facebook Login Settings):
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs break-all font-mono text-foreground">{pixelCallbackUrl}</code>
                <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => copyToClipboard(pixelCallbackUrl, "pixelOauth")}>
                  {copiedKey === "pixelOauth" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  <span className="text-xs mr-1">{copiedKey === "pixelOauth" ? "تم النسخ" : "نسخ"}</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-2.5 rounded-lg text-xs space-y-1">
            <span className="font-semibold block text-foreground">حقول الاشتراك المطلوبة في صفحة الويب هوك (Page Webhook Fields):</span>
            <code className="bg-background px-2 py-0.5 rounded border block break-all text-muted-foreground">
              messages, messaging_postbacks, message_deliveries, message_reads, message_echoes, feed
            </code>
          </div>
        </CardContent>
      </Card>

      {/* ⚙️ إعدادات التطبيق الأساسي */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Facebook className="size-5 text-[#1877F2]" />
              <h2 className="text-base font-semibold">إعدادات التطبيق الأساسي</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConfigured ? "default" : "secondary"}>
                {isConfigured ? "مُكوَّن" : "غير مُكوَّن"}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Facebook App ID</Label>
              <Input
                value={config.appId}
                onChange={e => setConfig(p => ({ ...p, appId: e.target.value }))}
                placeholder="أدخل App ID للتطبيق الأساسي"
                className="font-mono"
              />
            </div>

            <div>
              <Label>Facebook App Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={config.appSecret}
                  onChange={e => setConfig(p => ({ ...p, appSecret: e.target.value }))}
                  placeholder="أدخل App Secret للتطبيق الأساسي"
                  className="font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>رابط إعادة التوجيه (Redirect URI)</Label>
              <Input
                value={config.redirectUri}
                onChange={e => setConfig(p => ({ ...p, redirectUri: e.target.value }))}
                placeholder={pageCallbackUrl}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                الرابط القياسي: <code>{pageCallbackUrl}</code>
              </p>
            </div>

            <div>
              <Label>Facebook Webhook Verify Token (رمز التحقق للويب هوك)</Label>
              <Input
                value={config.facebookWebhookVerifyToken}
                onChange={e => setConfig(p => ({ ...p, facebookWebhookVerifyToken: e.target.value }))}
                placeholder={DEFAULT_VERIFY_TOKEN}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                يجب إدخال نفس هذا الرمز بدقة في لوحة تحكم فيسبوك عند تفعيل الويب هوك.
              </p>
            </div>
          </div>

          <hr className="my-6" />

          {/* 📱 إعدادات WhatsApp Cloud Connect المنفصلة */}
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="size-5 text-green-600" />
            <h2 className="text-base font-semibold">إعدادات WhatsApp Cloud Connect المنفصلة (اختياري)</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            اترك هذه الحقول فارغة إذا كنت تريد استخدام نفس التطبيق الأساسي أعلاه للواتساب. استخدمها فقط إذا كنت تريد ربط الواتساب بتطبيق فيسبوك منفصل.
          </p>

          <div className="space-y-4">
            <div>
              <Label>WhatsApp App ID (اختياري)</Label>
              <Input
                value={config.whatsappAppId}
                onChange={e => setConfig(p => ({ ...p, whatsappAppId: e.target.value }))}
                placeholder="أدخل App ID الخاص بالواتساب"
                className="font-mono"
              />
            </div>

            <div>
              <Label>WhatsApp App Secret (اختياري)</Label>
              <div className="relative">
                <Input
                  type={showWaSecret ? "text" : "password"}
                  value={config.whatsappAppSecret}
                  onChange={e => setConfig(p => ({ ...p, whatsappAppSecret: e.target.value }))}
                  placeholder="أدخل App Secret الخاص بالواتساب"
                  className="font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowWaSecret(!showWaSecret)}
                >
                  {showWaSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>WhatsApp Configuration ID (اختياري)</Label>
              <Input
                value={config.whatsappConfigId}
                onChange={e => setConfig(p => ({ ...p, whatsappConfigId: e.target.value }))}
                placeholder="أدخل Configuration ID الخاص بـ Facebook Login for Business"
                className="font-mono"
              />
            </div>

            <div>
              <Label>WhatsApp Webhook Verify Token (اختياري)</Label>
              <Input
                value={config.whatsappWebhookVerifyToken}
                onChange={e => setConfig(p => ({ ...p, whatsappWebhookVerifyToken: e.target.value }))}
                placeholder="أدخل رمز التحقق الخاص بالويب هوك للواتساب"
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <Save className="size-4" />} حفظ الإعدادات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminFacebookOAuth;