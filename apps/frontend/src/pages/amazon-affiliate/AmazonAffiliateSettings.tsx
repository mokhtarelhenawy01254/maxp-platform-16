import React, { useEffect, useState } from "react";
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
  "www.amazon.com": "أمريكا (amazon.com)",
  "amazon.co.uk": "بريطانيا (amazon.co.uk)",
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
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">إعدادات أمازون أفليت</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">حساب Amazon Associates</h2>
        <p className="mb-4 text-sm text-gray-500">
          اربط حساب العمولة الخاص بك — كل العمولات من مشتريات زوار متجرك هتتحسب على حسابك أنت.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">جارِ التحميل...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Associate Tag (رمز التتبع)
              </label>
              <input
                type="text"
                dir="ltr"
                value={associateTag}
                onChange={(e) => setAssociateTag(e.target.value)}
                placeholder="مثال: yourstore-21"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-400">
                موجود في Amazon Associates Center بجانب بروفايلك. مطلوب لحساب العمولات على الروابط.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                السوق الرئيسي (Marketplace)
              </label>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                {Object.entries(MARKETPLACE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={enableBuyButton}
                  onChange={(e) => setEnableBuyButton(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                إظهار زر «اشتري من أمازون» على المنتجات المستوردة
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                مزامنة الأسعار والمخزون تلقائيًا
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={disclosureEnabled}
                  onChange={(e) => setDisclosureEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                إظهار إفصاح برنامج الشركاء (مطلوب قانونيًا)
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">بيانات المنتج (اختياري)</h2>
        <p className="mb-4 text-sm text-gray-500">
          بدون هذه البيانات نعتمد على فحص صفحة أمازون للحصول على الاسم والسعر والصورة. عند توفر بيانات
          Amazon Creators API نستخدمها تلقائيًا (مطلوب 10 مبيعات مؤهلة خلال 30 يوم للأهلية).
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Credential ID</label>
            <input
              type="text"
              dir="ltr"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              placeholder="amzn1.application-oa2-client..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Credential Secret</label>
            <input
              type="password"
              dir="ltr"
              value={credentialSecret}
              onChange={(e) => setCredentialSecret(e.target.value)}
              placeholder={settings?.hasCredentials ? "•••••••• (محفوظ)" : "ادخل السر"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Version</label>
            <input
              type="text"
              dir="ltr"
              value={credentialVersion}
              onChange={(e) => setCredentialVersion(e.target.value)}
              placeholder="3.2 (أوروبا/مصر/السعودية)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="mt-4">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${settings?.hasCredentials ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {settings?.hasCredentials ? "✓ بيانات Creators API محفوظة ومفعّلة" : "لا توجد بيانات Creators API — سنستخدم فحص الصفحة والإدخال اليدوي"}
          </span>
        </div>
      </section>
    </div>
  );
};

export default AmazonAffiliateSettingsPage;