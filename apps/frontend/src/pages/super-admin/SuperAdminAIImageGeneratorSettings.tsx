import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Image as ImageIcon, Save, Search, ToggleLeft, ToggleRight, RefreshCw,
  Sparkles, Sliders, Building2, Cpu, Layers,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";

interface Tier { displayName: string; description: string; model: string; }
interface CompanyOverride { enabled: boolean; tier: string; maxRequestsPerDay: number; }
interface Company {
  id: string; name: string; domain: string; isActive: boolean;
  overrides: CompanyOverride | null; effectiveTier: string; enabled: boolean;
}
interface Config {
  tiers: Record<string, Tier>; defaultTier: string; defaultMaxRequestsPerDay: number;
  companies: Record<string, CompanyOverride>;
}

const DEFAULT_TIER_KEYS = ["fast", "balanced", "premium"];
const MODEL_OPTIONS = [
  "google/gemini-3.1-flash-image", "google/gemini-3.1-flash-lite-image", "google/gemini-3-pro-image",
  "openai/gpt-image-2", "openai/gpt-image-1-mini", "openai/gpt-5.4-image-2", "x-ai/grok-imagine-image-quality",
];

const getTierBadgeClass = (tier: string) => {
  if (tier === "fast") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (tier === "balanced") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
};

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
    try {
      const res = await axios.get(buildApiUrl("super-admin/ai-image-generator-settings"), { headers: getAuthHeaders() });
      if (res.data?.success) setConfig(res.data.data);
    } catch (e) { console.error(e); }
  };

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(buildApiUrl("super-admin/ai-image-generator-settings/companies"), { headers: getAuthHeaders() });
      if (res.data?.success) setCompanies(res.data.data);
    } catch (e) { console.error(e); }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await axios.put(buildApiUrl("super-admin/ai-image-generator-settings"), { config }, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("تم حفظ وتحديث إعدادات مولد الصور بنجاح");
        setConfig(res.data.data);
      }
    } catch {
      toast.error("فشل في حفظ الإعدادات");
    } finally { setSaving(false); }
  };

  const toggleCompany = async (companyId: string, enabled: boolean) => {
    try {
      await axios.put(buildApiUrl(`super-admin/ai-image-generator-settings/companies/${companyId}`), { enabled }, { headers: getAuthHeaders() });
      setCompanies((p) => p.map((c) => (c.id === companyId ? { ...c, enabled } : c)));
      toast.success(enabled ? "تم تفعيل الشركة" : "تم تعطيل الشركة");
    } catch { toast.error("فشل في تحديث حالة الشركة"); }
  };

  const saveCompanyOverride = async (companyId: string, data: { tier?: string; maxRequestsPerDay?: number }) => {
    try {
      await axios.put(buildApiUrl(`super-admin/ai-image-generator-settings/companies/${companyId}`), data, { headers: getAuthHeaders() });
      setEditingCompany(null);
      await fetchCompanies();
      toast.success("تم حفظ تخصيص الشركة بنجاح");
    } catch { toast.error("فشل في حفظ التخصيص"); }
  };

  const updateTierModel = (tierKey: string, model: string) => {
    if (!config) return;
    setConfig({ ...config, tiers: { ...config.tiers, [tierKey]: { ...config.tiers[tierKey], model } } });
  };

  const updateTierDisplay = (tierKey: string, field: "displayName" | "description", value: string) => {
    if (!config) return;
    setConfig({ ...config, tiers: { ...config.tiers, [tierKey]: { ...config.tiers[tierKey], [field]: value } } });
  };

  const filteredCompanies = companies.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.domain?.toLowerCase().includes(search.toLowerCase()),
  );
  const activeCompaniesCount = companies.filter((c) => c.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir={i18n.dir()}>
        <RefreshCw className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm" dir={i18n.dir()}>
        لا توجد إعدادات متوفرة
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 md:p-6 max-w-6xl mx-auto" dir={i18n.dir()}>
      {/* Top Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ImageIcon className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              إعدادات مولد الصور بالذكاء الاصطناعي
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              AI Vision Pipeline
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            إدارة نماذج الذكاء الاصطناعي، مستويات الجودة والحصص اليومية للشركات
          </p>
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
        >
          {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>حفظ الإعدادات العامة</span>
        </button>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card overflow-hidden divide-y md:divide-y-0 divide-x md:divide-x-reverse divide-border shadow-xs">
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الشركات المسجلة</span>
            <Building2 className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">{companies.length}</p>
        </div>
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>الشركات المفعّلة</span>
            <ToggleRight className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{activeCompaniesCount}</p>
        </div>
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span>المستوى الافتراضي</span>
            <Layers className="size-3.5" />
          </div>
          <p className="text-base md:text-lg font-bold text-foreground">{config.tiers[config.defaultTier]?.displayName || config.defaultTier}</p>
        </div>
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الحد الافتراضي يومياً</span>
            <Cpu className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
            {config.defaultMaxRequestsPerDay} <span className="text-xs font-normal text-muted-foreground">صورة</span>
          </p>
        </div>
      </div>

      {/* Quality Tiers Configuration */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">مستويات الجودة والنماذج (Quality Tiers)</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">3 مستويات مدعومة</span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEFAULT_TIER_KEYS.map((key) => {
            const tier = config.tiers[key];
            if (!tier) return null;
            return (
              <div key={key} className="rounded-lg border border-border bg-background p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border ${getTierBadgeClass(key)}`}>
                      {key}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">{key === config.defaultTier ? "افتراضي" : ""}</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">اسم العرض</label>
                    <input
                      value={tier.displayName}
                      onChange={(e) => updateTierDisplay(key, "displayName", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-card text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">الوصف</label>
                    <input
                      value={tier.description}
                      onChange={(e) => updateTierDisplay(key, "description", e.target.value)}
                      placeholder="وصف المستوى"
                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-card text-foreground text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">نموذج الذكاء الاصطناعي (Model)</label>
                  <select
                    value={tier.model}
                    onChange={(e) => updateTierModel(key, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-card text-foreground text-xs font-mono focus:ring-1 focus:ring-primary"
                  >
                    {MODEL_OPTIONS.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Defaults Single-Surface Card */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">الإعدادات الافتراضية للشركات الجديدة</h2>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">المستوى الافتراضي للمنصة</label>
            <select
              value={config.defaultTier}
              onChange={(e) => setConfig({ ...config, defaultTier: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs md:text-sm focus:ring-1 focus:ring-primary"
            >
              {DEFAULT_TIER_KEYS.map((key) => (
                <option key={key} value={key}>{config.tiers[key]?.displayName || key} ({key})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">الحد اليومي الافتراضي لإنشاء الصور</label>
            <input
              type="number"
              value={config.defaultMaxRequestsPerDay}
              onChange={(e) => setConfig({ ...config, defaultMaxRequestsPerDay: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs md:text-sm font-mono focus:ring-1 focus:ring-primary"
              min={1}
            />
          </div>
        </div>
      </div>

      {/* Company Overrides Chassis */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">تخصيص الشركات وحدود الاستهلاك</h2>
            <span className="text-xs font-mono text-muted-foreground">({filteredCompanies.length})</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن شركة..."
              className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredCompanies.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">لا توجد شركات مطابقة للبحث</div>
          ) : (
            filteredCompanies.map((company) => (
              <div key={company.id} className="p-3 md:p-4 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-semibold text-foreground">{company.name}</span>
                    {company.domain && (<span className="text-xs font-mono text-muted-foreground">({company.domain})</span>)}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getTierBadgeClass(company.effectiveTier)}`}>
                      {config.tiers[company.effectiveTier]?.displayName || company.effectiveTier}
                    </span>
                    {company.overrides && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        مخصص ({company.overrides.maxRequestsPerDay}/يوم)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCompany(company.id, !company.enabled)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        company.enabled ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {company.enabled ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
                      <span>{company.enabled ? "مفعّل" : "معطّل"}</span>
                    </button>
                    <button
                      onClick={() => setEditingCompany(editingCompany === company.id ? null : company.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                      {editingCompany === company.id ? "إغلاق" : "تخصيص"}
                    </button>
                  </div>
                </div>

                {editingCompany === company.id && (
                  <CompanyOverrideForm company={company} config={config} onSave={saveCompanyOverride} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyOverrideForm({
  company, config, onSave,
}: {
  company: Company; config: Config; onSave: (id: string, data: { tier?: string; maxRequestsPerDay?: number }) => void;
}) {
  const [tier, setTier] = useState(company.overrides?.tier || "");
  const [maxReq, setMaxReq] = useState(company.overrides?.maxRequestsPerDay || config.defaultMaxRequestsPerDay);

  return (
    <div className="mt-3 pt-3 border-t border-border/60 bg-muted/20 p-3 rounded-lg space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">مستوى الجودة للشركة</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary">
            <option value="">استخدام الافتراضي ({config.tiers[config.defaultTier]?.displayName})</option>
            {DEFAULT_TIER_KEYS.filter((k) => config.tiers[k]).map((key) => (
              <option key={key} value={key}>{config.tiers[key].displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">الحد اليومي المخصص (صورة)</label>
          <input type="number" value={maxReq} onChange={(e) => setMaxReq(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary" min={1} />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave(company.id, { ...(tier ? { tier } : {}), maxRequestsPerDay: maxReq })}
          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          حفظ التخصيص
        </button>
      </div>
    </div>
  );
}
