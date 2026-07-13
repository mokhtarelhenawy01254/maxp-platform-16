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
import { Save, Eye, EyeOff, Info, Facebook } from "lucide-react";

const SuperAdminFacebookOAuth = () => {
  const [config, setConfig] = useState({ appId: "", appSecret: "", redirectUri: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true); setError(null);
      const response = await fetch(buildApiUrl("admin/facebook-oauth/config"), { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) setConfig({ appId: data.data.appId || "", appSecret: data.data.appSecret || "", redirectUri: data.data.redirectUri || "" });
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

  return (
    <div className="p-3">
      <div className="mb-3"><h1 className="text-2xl font-bold flex items-center gap-2"><Facebook className="text-[#1877F2]" /> إعدادات Facebook OAuth</h1><p className="text-sm text-muted-foreground">قم بتكوين إعدادات تكامل Facebook OAuth للسماح للشركات بالربط مع صفحات Facebook الخاصة بها</p></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="mb-2"><AlertDescription>{success}</AlertDescription></Alert>}
      <Card><CardContent>
        <div className="flex items-center gap-2 mb-2"><Info className="size-5 text-blue-600" /><h2 className="text-base font-semibold">معلومات الإعداد</h2></div>
        <p className="text-sm mb-3">لتمكين تكامل Facebook OAuth، تحتاج إلى إنشاء تطبيق على منصة Facebook Developers وإدخال المعلومات التالية:</p>
        <ol className="list-decimal pr-4 mb-3 text-sm space-y-1"><li>انتقل إلى <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Facebook Developers</a></li><li>أنشئ تطبيقًا جديدًا أو استخدم تطبيقًا موجودًا</li><li>احصل على App ID و App Secret</li><li>أضف رابط إعادة التوجيه: <code className="bg-muted px-1 rounded">{window.location.origin}/settings/facebook/callback</code></li></ol>
        <hr className="my-3" />
        <div className="flex items-center gap-2 mb-2"><Facebook className="size-5 text-[#1877F2]" /><h2 className="text-base font-semibold">إعدادات التطبيق</h2></div>
        <div className="flex items-center gap-2 mb-3"><Badge variant={isConfigured ? "default" : "secondary"}>{isConfigured ? "مُكوَّن" : "غير مُكوَّن"}</Badge><span className="text-sm text-muted-foreground">{isConfigured ? "تم تكوين إعدادات Facebook OAuth بشكل صحيح" : "لم يتم تكوين إعدادات Facebook OAuth بعد"}</span></div>
        <div className="space-y-3">
          <div><Label>Facebook App ID</Label><Input value={config.appId} onChange={e => setConfig(p => ({ ...p, appId: e.target.value }))} placeholder="أدخل App ID" /></div>
          <div><Label>Facebook App Secret</Label><div className="relative"><Input type={showSecret ? "text" : "password"} value={config.appSecret} onChange={e => setConfig(p => ({ ...p, appSecret: e.target.value }))} placeholder="أدخل App Secret" /><Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div></div>
          <div><Label>رابط إعادة التوجيه (Redirect URI)</Label><Input value={config.redirectUri} onChange={e => setConfig(p => ({ ...p, redirectUri: e.target.value }))} placeholder="https://yourdomain.com/settings/facebook/callback" /></div>
        </div>
        <div className="flex justify-end mt-4"><Button onClick={handleSave} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : <Save className="size-4" />} حفظ الإعدادات</Button></div>
        <Alert className="mt-3"><Info className="size-4" /><AlertDescription>بعد حفظ الإعدادات، سيتم تطبيق التغييرات تلقائيًا.</AlertDescription></Alert>
      </CardContent></Card>
    </div>
  );
};

export default SuperAdminFacebookOAuth;