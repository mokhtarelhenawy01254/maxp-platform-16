import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Save, 
  Key, 
  Sliders, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import {
  getAmazonAffiliateSettings,
  saveAmazonAffiliateSettings,
  type AmazonAffiliateSettings,
} from "../../services/amazonAffiliateService";

const MARKETPLACE_LABELS: Record<string, string> = {
  "amazon.eg": "مصر (amazon.eg)",
  "amazon.sa": "السعودية (amazon.sa)",
  "amazon.ae": "الإمارات (amazon.ae)",
  "www.amazon.com": "الولايات المتحدة (amazon.com)",
  "amazon.co.uk": "المملكة المتحدة (amazon.co.uk)",
  "amazon.de": "ألمانيا (amazon.de)",
  "amazon.fr": "فرنسا (amazon.fr)",
  "amazon.com.tr": "تركيا (amazon.com.tr)",
  "amazon.in": "الهند (amazon.in)",
};

const AmazonAffiliateSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AmazonAffiliateSettings | null>(null);
  const [associateTag, setAssociateTag] = useState("");
  const [marketplace, setMarketplace] = useState("www.amazon.com");
  const [enableBuyButton, setEnableBuyButton] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [disclosureEnabled, setDisclosureEnabled] = useState(true);
  const [credentialId, setCredentialId] = useState("");
  const [credentialSecret, setCredentialSecret] = useState("");
  const [credentialVersion, setCredentialVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getAmazonAffiliateSettings()
      .then((data) => {
        if (!active || !data) return;
        setSettings(data);
        setAssociateTag(data.associateTag || "");
        setMarketplace(data.marketplace || "www.amazon.com");
        setEnableBuyButton(data.enableBuyButton !== false);
        setAutoSyncEnabled(Boolean(data.autoSyncEnabled));
        setDisclosureEnabled(data.disclosureEnabled !== false);
        setCredentialId(data.credentialId || "");
        setCredentialVersion(data.credentialVersion || "");
      })
      .catch(() => {
        if (active) toast.error("تعذر تحميل إعدادات أمازون أفليت");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<AmazonAffiliateSettings> = {
        associateTag: associateTag.trim() || null,
        marketplace,
        enableBuyButton,
        autoSyncEnabled,
        disclosureEnabled,
        credentialId: credentialId.trim() || undefined,
        credentialVersion: credentialVersion.trim() || undefined,
      };
      if (credentialSecret.trim()) payload.credentialSecret = credentialSecret.trim();
      const saved = await saveAmazonAffiliateSettings(payload);
      setSettings(saved);
      setCredentialSecret("");
      setCredentialId(saved.credentialId || "");
      setCredentialVersion(saved.credentialVersion || "");
      toast.success("تم حفظ إعدادات أمازون أفليت بنجاح");
    } catch {
      toast.error("فشل حفظ الإعدادات — يرجى إعادة المحاولة");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل إعدادات حساب أمازون أفليت...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/amazon-affiliate/products"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">إعدادات أمازون أفليت</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تكوين رمز التتبع (Associate Tag) والأسواق المدعومة وصلاحيات واجهة برمجة التطبيقات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/amazon-affiliate/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span>قائمة المنتجات</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Associate Profile Section */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sliders className="w-4 h-4 text-primary" />
              <span>بيانات حساب Amazon Associates</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              يتم إلحاق المعرف تلقائياً بروابط الشراء
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Associate Tag (معرف التتبع والعمولة)</span>
                <span className="text-[10px] text-muted-foreground font-mono">مثال: yourstore-21</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={associateTag}
                onChange={(e) => setAssociateTag(e.target.value)}
                placeholder="storename-21"
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                يمكن استخراجه من لوحة Amazon Associates بجوار اسم ملفك التجاري.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">السوق الافتراضي (Default Marketplace)</label>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(MARKETPLACE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                السوق المعتمد عند البحث واستيراد المنتجات بالـ ASIN المباشر.
              </p>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="pt-2 border-t border-border/40 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableBuyButton}
                onChange={(e) => setEnableBuyButton(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">إظهار زر «اشتري من أمازون» في صفحات المنتجات</span>
                <span className="text-[11px] text-muted-foreground">توجيه العميل إلى صفحة الشراء في أمازون عبر رابط الإحالة الخاص بك</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">مزامنة الأسعار وحالة المخزون دورياً</span>
                <span className="text-[11px] text-muted-foreground">تحديث أسعار المنتجات تلقائياً لتطابق تغييرات السعر على موقع أمازون</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={disclosureEnabled}
                onChange={(e) => setDisclosureEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">إظهار إفصاح برنامج الشركاء القانوني (Affiliate Disclosure)</span>
                <span className="text-[11px] text-muted-foreground">عرض جملة الإفصاح المعتمدة طبقاً للشروط والسياسات الرسمية لأمازون</span>
              </div>
            </label>
          </div>
        </div>

        {/* Creators API Section */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Key className="w-4 h-4 text-primary" />
              <span>مفاتيح واجهة Amazon Creators API (اختياري)</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              تتيح جلب البيانات والأسعار الرسمية المباشرة
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            في حالة عدم توفر مفاتيح الـ API، يعتمد النظام على الفحص التلقائي للصفحات. توفر بيانات Creators API يمنحك استقراراً وسرعة أعلى للمزامنة الدورية (تتطلب عادةً 10 مبيعات مؤهلة خلال 30 يوماً).
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Credential ID</label>
              <input
                type="text"
                dir="ltr"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="amzn1.application-oa2-client..."
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Credential Secret</label>
              <input
                type="password"
                dir="ltr"
                value={credentialSecret}
                onChange={(e) => setCredentialSecret(e.target.value)}
                placeholder={settings?.hasCredentials ? "•••••••• (محفوظ ومؤمّن)" : "أدخل الرمز السري"}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Version</label>
              <input
                type="text"
                dir="ltr"
                value={credentialVersion}
                onChange={(e) => setCredentialVersion(e.target.value)}
                placeholder="3.2"
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border ${
              settings?.hasCredentials 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-muted/30 text-muted-foreground border-border/70"
            }`}>
              {settings?.hasCredentials ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ShieldCheck className="w-4 h-4 text-muted-foreground" />}
              <span>
                {settings?.hasCredentials 
                  ? "بيانات Creators API محفوظة ونشطة للمزامنة الدقيقة" 
                  : "لم يتم حفظ بيانات Creators API — يتم الاعتماد على الفحص المباشر للروابط"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmazonAffiliateSettingsPage;