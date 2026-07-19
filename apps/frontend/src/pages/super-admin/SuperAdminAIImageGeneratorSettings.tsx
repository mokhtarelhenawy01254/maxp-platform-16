import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Image, Save, Search, XCircle, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";

interface Tier {
  displayName: string;
  description: string;
  model: string;
}

interface CompanyOverride {
  enabled: boolean;
  tier: string;
  maxRequestsPerDay: number;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  overrides: CompanyOverride | null;
  effectiveTier: string;
  enabled: boolean;
}

interface Config {
  tiers: Record<string, Tier>;
  defaultTier: string;
  defaultMaxRequestsPerDay: number;
  companies: Record<string, CompanyOverride>;
}

const DEFAULT_TIER_KEYS = ["fast", "balanced", "premium"];
const MODEL_OPTIONS = [
  "google/gemini-3.1-flash-image",
  "google/gemini-3.1-flash-lite-image",
  "google/gemini-3-pro-image",
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "openai/gpt-5.4-image-2",
  "x-ai/grok-imagine-image-quality",
];

const getAuthHeaders = () => {
  const token = tokenManager.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function SuperAdminAIImageGeneratorSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchCompanies()]).finally(() => setLoading(false));
  }, []);

  const fetchConfig = async () => {
    const res = await axios.get(buildApiUrl("super-admin/ai-image-generator-settings"), { headers: getAuthHeaders() });
    if (res.data.success) setConfig(res.data.data);
  };

  const fetchCompanies = async () => {
    const res = await axios.get(buildApiUrl("super-admin/ai-image-generator-settings/companies"), { headers: getAuthHeaders() });
    if (res.data.success) setCompanies(res.data.data);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await axios.put(buildApiUrl("super-admin/ai-image-generator-settings"), { config }, { headers: getAuthHeaders() });
      if (res.data.success) { toast.success("تم حفظ الإعدادات"); setConfig(res.data.data); }
    } catch { toast.error("خطأ في حفظ الإعدادات"); }
    finally { setSaving(false); }
  };

  const toggleCompany = async (companyId: string, enabled: boolean) => {
    await axios.put(buildApiUrl(`super-admin/ai-image-generator-settings/companies/${companyId}`), { enabled }, { headers: getAuthHeaders() });
    setCompanies(p => p.map(c => c.id === companyId ? { ...c, enabled } : c));
    toast.success(enabled ? "تم تفعيل الشركة" : "تم تعطيل الشركة");
  };

  const saveCompanyOverride = async (companyId: string, data: { tier?: string; maxRequestsPerDay?: number }) => {
    await axios.put(buildApiUrl(`super-admin/ai-image-generator-settings/companies/${companyId}`), data, { headers: getAuthHeaders() });
    setEditingCompany(null);
    await fetchCompanies();
    toast.success("تم حفظ إعدادات الشركة");
  };

  const updateTierModel = (tierKey: string, model: string) => {
    if (!config) return;
    setConfig({ ...config, tiers: { ...config.tiers, [tierKey]: { ...config.tiers[tierKey], model } } });
  };

  const updateTierDisplay = (tierKey: string, field: "displayName" | "description", value: string) => {
    if (!config) return;
    setConfig({ ...config, tiers: { ...config.tiers, [tierKey]: { ...config.tiers[tierKey], [field]: value } } });
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (!config) return <div className="text-center py-16 text-gray-500">لا توجد إعدادات</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir={i18n.dir()}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="text-blue-600" size={28} />
            إعدادات مولد الصور بالذكاء الاصطناعي
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تحكم في مستويات الجودة، الموديلات، والحدود اليومية للشركات
          </p>
        </div>
      </div>

      {/* Quality Tiers */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">مستويات الجودة (Tiers)</h3>
        <div className="space-y-4">
          {DEFAULT_TIER_KEYS.map(key => {
            const tier = config.tiers[key];
            if (!tier) return null;
            return (
              <div key={key} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${key === 'fast' ? 'bg-green-500' : key === 'balanced' ? 'bg-blue-500' : 'bg-purple-500'}`}>{key}</span>
                  <span className="text-sm text-gray-400">—</span>
                  <input value={tier.displayName} onChange={e => updateTierDisplay(key, "displayName", e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <input value={tier.description} onChange={e => updateTierDisplay(key, "description", e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2" placeholder="وصف المستوى" />
                <select value={tier.model} onChange={e => updateTierModel(key, e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defaults */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الإعدادات الافتراضية</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">المستوى الافتراضي</label>
            <select value={config.defaultTier} onChange={e => setConfig({ ...config, defaultTier: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
              {DEFAULT_TIER_KEYS.map(key => <option key={key} value={key}>{config.tiers[key]?.displayName || key}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">الحد اليومي الافتراضي (صورة)</label>
            <input type="number" value={config.defaultMaxRequestsPerDay} onChange={e => setConfig({ ...config, defaultMaxRequestsPerDay: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" min={1} />
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 disabled:opacity-50">
        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
        حفظ الإعدادات العامة
      </button>

      {/* Companies */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إعدادات الشركات</h3>
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن شركة..." className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div className="space-y-2">
          {filteredCompanies.map(company => (
            <div key={company.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">{company.name}</span>
                  {company.domain && <span className="text-sm text-gray-400 mr-2">({company.domain})</span>}
                  <span className={`mr-2 px-2 py-0.5 rounded text-xs font-bold text-white ${company.effectiveTier === 'fast' ? 'bg-green-500' : company.effectiveTier === 'balanced' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                    {config.tiers[company.effectiveTier]?.displayName || company.effectiveTier}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleCompany(company.id, !company.enabled)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${company.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {company.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {company.enabled ? 'مفعل' : 'معطل'}
                  </button>
                  <button onClick={() => setEditingCompany(editingCompany === company.id ? null : company.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {editingCompany === company.id ? 'إلغاء' : 'تخصيص'}
                  </button>
                </div>
              </div>
              {editingCompany === company.id && (
                <CompanyOverrideForm company={company} config={config} onSave={saveCompanyOverride} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanyOverrideForm({ company, config, onSave }: { company: Company; config: Config; onSave: (id: string, data: { tier?: string; maxRequestsPerDay?: number }) => void }) {
  const [tier, setTier] = useState(company.overrides?.tier || "");
  const [maxReq, setMaxReq] = useState(company.overrides?.maxRequestsPerDay || config.defaultMaxRequestsPerDay);
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">مستوى الجودة</label>
          <select value={tier} onChange={e => setTier(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">استخدام الافتراضي ({config.tiers[config.defaultTier]?.displayName})</option>
            {DEFAULT_TIER_KEYS.filter(k => config.tiers[k]).map(key => <option key={key} value={key}>{config.tiers[key].displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">الحد اليومي</label>
          <input type="number" value={maxReq} onChange={e => setMaxReq(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" min={1} />
        </div>
      </div>
      <button onClick={() => onSave(company.id, { ...(tier ? { tier } : {}), maxRequestsPerDay: maxReq })} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
        حفظ
      </button>
    </div>
  );
}
