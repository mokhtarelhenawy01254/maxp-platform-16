import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { MultiSelect, MultiSelectOption } from "../../components/ui/MultiSelect";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import { Brain, Plus, Trash2, Send, CheckCircle, Copy, Save } from "lucide-react";

const CHANNEL_OPTIONS: MultiSelectOption[] = [
  { value: "dashboard", label: "لوحة التحكم" },
  { value: "whatsapp", label: "واتساب" },
  { value: "voice", label: "مكالمات صوتية" },
  { value: "messenger", label: "ماسنجر" },
  { value: "facebook", label: "فيسبوك" },
  { value: "chat", label: "محادثة" },
  { value: "telegram", label: "تيليجرام" },
  { value: "instagram", label: "انستجرام" },
  { value: "merchant", label: "التاجر" },
];

export const ROLE_ICONS: Record<string, string> = {
  CEO: "👔", SUPPORT: "🎧", SALES: "🤝", SMART_SELLER: "🛒",
  MARKETING: "📢", ORDER: "📦", INVENTORY: "📊", COMPETITOR: "🔍",
  FACEBOOK_SALES_SUPPORT: "💬", SAS_SALES: "🛍️", SALES_REP: "🛒",
  ORDER_CONFIRMATION: "✅", VOICE_ORDER_CONFIRMATION: "📞",
  SHIPPING: "🚚", STOCK_TARGET_MONITOR: "📈",
  BROWSER_COPILOT: "🌐",
};

export const ROLE_COLORS: Record<string, string> = {
  CEO: "bg-blue-100 text-blue-700", SUPPORT: "bg-emerald-100 text-emerald-700",
  SALES: "bg-amber-100 text-amber-700", SMART_SELLER: "bg-violet-100 text-violet-700",
  MARKETING: "bg-pink-100 text-pink-700", ORDER: "bg-cyan-100 text-cyan-700",
  ORDER_CONFIRMATION: "bg-emerald-100 text-emerald-700",
  VOICE_ORDER_CONFIRMATION: "bg-purple-100 text-purple-700",
  INVENTORY: "bg-slate-100 text-slate-700", COMPETITOR: "bg-red-100 text-red-700",
  FACEBOOK_SALES_SUPPORT: "bg-indigo-100 text-indigo-700", SAS_SALES: "bg-green-100 text-green-700",
  SALES_REP: "bg-amber-100 text-amber-700", SHIPPING: "bg-teal-100 text-teal-700",
  STOCK_TARGET_MONITOR: "bg-emerald-100 text-emerald-800",
  BROWSER_COPILOT: "bg-indigo-100 text-indigo-700",
};

export const ROLES = [
  "CEO", "SUPPORT", "SALES", "SMART_SELLER", "MARKETING", "ORDER",
  "ORDER_CONFIRMATION", "VOICE_ORDER_CONFIRMATION", "INVENTORY",
  "COMPETITOR", "FACEBOOK_SALES_SUPPORT", "SAS_SALES", "SALES_REP",
  "SHIPPING", "STOCK_TARGET_MONITOR", "BROWSER_COPILOT",
];

export const toneColors: Record<string, string> = {
  empathetic: "text-pink-600 bg-pink-50", persuasive: "text-amber-600 bg-amber-50",
  professional: "text-blue-600 bg-blue-50", analytical: "text-slate-600 bg-slate-50",
  creative: "text-violet-600 bg-violet-50", strategic: "text-indigo-600 bg-indigo-50",
  friendly: "text-green-600 bg-green-50", helpful: "text-teal-600 bg-teal-50",
};

export interface TemplateItem {
  slug: string; name: string; role: string; version: string; icon: string;
  description: string;
  personaMeta: { language?: string; dialect?: string; tone?: string; formality?: string; };
  soulPreview: string; toolsCount: number; skillsCount: number; channels: string[];
  budget: { dailyUsd?: number; }; industries: string[]; isActive?: boolean;
  companiesCount?: number;
}

interface FullTemplate {
  slug: string; role: string; name: string; version: string;
  model_policy: Record<string, any>; allowed_tools: string[]; allowed_skills: string[];
  channels: string[]; guardrails: Record<string, any>; persona_meta: Record<string, any>;
  instructions_agents: string | null; instructions_soul: string | null;
  instructions_tools: string | null; instructions_persona: string | null;
  human_approval: Record<string, any>; handoffs: any[]; mcp_servers: any[];
  budget: Record<string, any>; output_schema: Record<string, any> | null;
  is_active: boolean; config: Record<string, any>; created_at: string; updated_at: string;
}

interface ModelOption {
  modelName: string;
  provider: string;
  keyName: string;
}

/* ════════════════════════════════════════════════
   Create Dialog
   ════════════════════════════════════════════════ */
export const CreateDialog: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ slug: "", name: "", role: "SUPPORT", version: "1.0.0" });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const slugValid = !form.slug.trim() || slugPattern.test(form.slug);

  const create = async () => {
    if (!form.name.trim() || !form.slug.trim() || !slugValid) return;
    setCreating(true); setErr(null);
    try { await apiClient.post("/super-admin/agents", form); onCreated(); onClose(); }
    catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); }
    finally { setCreating(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>قالب وكيل جديد</DialogTitle></DialogHeader>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <div className="space-y-3" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); create(); } }}>
          <Input label="اسم القالب *" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} autoFocus />
          <Input label="المعرّف (slug) *" value={form.slug}
            onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} helperText="أحرف إنجليزية وشرطات فقط" />
          {form.slug.trim() && !slugValid && <p className="text-[0.65rem] text-destructive">slug غير صالح: أحرف صغيرة وأرقام وشرطات فقط</p>}
          <div>
            <label className="text-xs font-medium text-muted-foreground">الدور</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Input label="الإصدار" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>إلغاء</Button>
          <Button onClick={create} disabled={!form.name.trim() || !form.slug.trim() || !slugValid || creating}>
            {creating ? <LoadingSpinner size="sm" /> : <Plus className="size-4 ml-1" />} إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Edit Dialog — Full template editor
   ════════════════════════════════════════════════ */
const EDIT_TABS = [
  { id: "basic", label: "أساسي" },
  { id: "soul", label: "الشخصية" },
  { id: "instructions", label: "التعليمات" },
  { id: "config", label: "الإعدادات" },
];

export const EditDialog: React.FC<{ template: TemplateItem; onClose: () => void; onUpdated: () => void }> = ({ template: t, onClose, onUpdated }) => {
  const [tab, setTab] = useState("basic");
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [full, setFull] = useState<FullTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [allTools, setAllTools] = useState<MultiSelectOption[]>([]);
  const [allSkills, setAllSkills] = useState<MultiSelectOption[]>([]);
  const [allModels, setAllModels] = useState<ModelOption[]>([]);

  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [templateRes, toolsRes, skillsRes, modelsRes] = await Promise.all([
          apiClient.get(`/super-admin/agents/${t.slug}`),
          apiClient.get("/super-admin/agents/tools"),
          apiClient.get("/super-admin/agents/skills"),
          apiClient.get("/super-admin/agents/available-models"),
        ]);
        if (toolsRes.data.success) setAllTools(toolsRes.data.tools.map(t => ({ value: t.name, label: t.name, group: t.group })));
        if (skillsRes.data.success) setAllSkills(skillsRes.data.skills.map(s => ({ value: s.id, label: s.displayName })));
        if (modelsRes.data.success) setAllModels(modelsRes.data.models);
        const d = templateRes.data;
        if (d.agent) {
          const a = d.agent as FullTemplate; setFull(a);
          setIsActive(a.is_active !== false);
          setForm({
            name: a.name, role: a.role, version: a.version,
            persona_meta: a.persona_meta || {},
            instructions_soul: a.instructions_soul || "",
            instructions_agents: a.instructions_agents || "",
            instructions_tools: a.instructions_tools || "",
            instructions_persona: a.instructions_persona || "",
            channels: a.channels || [], allowed_tools: a.allowed_tools || [],
            allowed_skills: a.allowed_skills || [], model_policy: a.model_policy || {},
            budget: a.budget || {}, guardrails: a.guardrails || {},
          });
        }
      } catch { setErr("فشل تحميل بيانات القالب"); }
      finally { setLoadingDetail(false); }
    })();
  }, [t.slug]);

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));
  const save = async () => {
    setSaving(true); setErr(null);
    try {
      await apiClient.put(`/super-admin/agents/${t.slug}`, { ...form, is_active: isActive });
      onUpdated(); onClose();
    }
    catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); }
    finally { setSaving(false); }
  };

  const modelOptions = allModels.map(m => ({
    value: m.modelName,
    label: `${m.modelName} (${m.provider} — ${m.keyName})`,
  }));

  const isRtl = i18n.dir() === "rtl";

  if (loadingDetail) return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl"><div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div></DialogContent>
    </Dialog>
  );

  if (err && !full) return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl"><Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert><DialogFooter><Button onClick={onClose}>إلغاء</Button></DialogFooter></DialogContent>
    </Dialog>
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{t.icon || ROLE_ICONS[t.role] || "🤖"}</span>
            <DialogTitle>{t.name}</DialogTitle>
            <Badge variant="outline" className="text-xs">{t.slug}</Badge>
          </div>
        </DialogHeader>
        {err && <Alert variant="destructive" className="mx-1"><AlertDescription>{err}</AlertDescription></Alert>}
        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg mx-1 mt-1 shrink-0" role="tablist">
          {EDIT_TABS.map((tabItem, i) => (
            <button key={tabItem.id} role="tab" aria-selected={tab === tabItem.id} tabIndex={tab === tabItem.id ? 0 : -1}
              onClick={() => setTab(tabItem.id)}
              onKeyDown={e => {
                if (e.key === "ArrowRight") { e.preventDefault(); setTab(EDIT_TABS[(i + 1) % EDIT_TABS.length].id); }
                if (e.key === "ArrowLeft") { e.preventDefault(); setTab(EDIT_TABS[(i - 1 + EDIT_TABS.length) % EDIT_TABS.length].id); }
              }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === tabItem.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{tabItem.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto px-1 py-2 space-y-3">
          {tab === "basic" && (
            <>
              <Input label="الاسم" value={form.name || ""} onChange={e => update("name", e.target.value)} />
              <div>
                <label className="text-xs font-medium text-muted-foreground">الدور</label>
                <select value={form.role || ""} onChange={e => update("role", e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Input label="الإصدار" value={form.version || ""} onChange={e => update("version", e.target.value)} />
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-xs font-medium">{isActive ? "نشط (يظهر في إنشاء الوكيل)" : "مخفي (لا يظهر في إنشاء الوكيل)"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="اللغة" value={form.persona_meta?.language || ""} onChange={e => update("persona_meta", { ...form.persona_meta, language: e.target.value })} />
                <Input label="اللهجة" value={form.persona_meta?.dialect || ""} onChange={e => update("persona_meta", { ...form.persona_meta, dialect: e.target.value })} />
                <Input label="النبرة" value={form.persona_meta?.tone || ""} onChange={e => update("persona_meta", { ...form.persona_meta, tone: e.target.value })} />
                <Input label="الرسمية" value={form.persona_meta?.formality || ""} onChange={e => update("persona_meta", { ...form.persona_meta, formality: e.target.value })} />
              </div>
            </>
          )}
          {tab === "soul" && (
            <div className="flex flex-col gap-2 h-full min-h-[300px]">
              <div className="flex items-center gap-1"><Brain className="size-4 text-primary" /><span className="text-xs font-bold">شخصية الوكيل (Soul)</span></div>
              <Textarea className="flex-1 min-h-[250px] font-mono text-sm leading-relaxed" dir={i18n.dir()}
                value={form.instructions_soul || ""} onChange={e => update("instructions_soul", e.target.value)} placeholder="اكتب شخصية الوكيل هنا..." />
              <p className="text-xs text-muted-foreground">{(form.instructions_soul || "").length} حرف</p>
            </div>
          )}
          {tab === "instructions" && (
            <>
              <div><label className="text-xs font-bold text-muted-foreground">قواعد الوكيل (AGENTS.md)</label><Textarea className="mt-1 font-mono text-sm min-h-[120px]" dir={i18n.dir()} value={form.instructions_agents || ""} onChange={e => update("instructions_agents", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-muted-foreground">تعليمات الأدوات (TOOLS.md)</label><Textarea className="mt-1 font-mono text-sm min-h-[120px]" dir={i18n.dir()} value={form.instructions_tools || ""} onChange={e => update("instructions_tools", e.target.value)} /></div>
              <div><label className="text-xs font-bold text-muted-foreground">تعليمات الشخصية (PERSONA.md)</label><Textarea className="mt-1 font-mono text-sm min-h-[120px]" dir={i18n.dir()} value={form.instructions_persona || ""} onChange={e => update("instructions_persona", e.target.value)} /></div>
            </>
          )}
          {tab === "config" && (
            <>
              <div><label className="text-xs font-medium text-muted-foreground">القنوات</label><MultiSelect options={CHANNEL_OPTIONS} selected={form.channels || []} onChange={v => update("channels", v)} placeholder="اختر القنوات..." /></div>
              <div><label className="text-xs font-medium text-muted-foreground">الأدوات المسموحة</label><MultiSelect options={allTools} selected={form.allowed_tools || []} onChange={v => update("allowed_tools", v)} placeholder="اختر الأدوات..." searchPlaceholder="ابحث عن أداة..." emptyText="لا توجد أدوات" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">المهارات المسموحة</label><MultiSelect options={allSkills} selected={form.allowed_skills || []} onChange={v => update("allowed_skills", v)} placeholder="اختر المهارات..." searchPlaceholder="ابحث عن مهارة..." emptyText="لا توجد مهارات" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">النموذج الافتراضي</label>
                  <Select value={form.model_policy?.default || ""} onValueChange={v => update("model_policy", { ...form.model_policy, default: v || undefined })}>
                    <SelectTrigger className="mt-1" dir={isRtl ? "rtl" : "ltr"}>
                      <SelectValue placeholder="اختر النموذج..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون نموذج</SelectItem>
                      {allModels.map(m => (
                        <SelectItem key={m.modelName} value={m.modelName}>
                          <span className="flex items-center gap-2">
                            <span>{m.modelName}</span>
                            <span className="text-[0.6rem] text-muted-foreground">({m.provider})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">النموذج البديل</label>
                  <Select value={form.model_policy?.fallback || ""} onValueChange={v => update("model_policy", { ...form.model_policy, fallback: v || undefined })}>
                    <SelectTrigger className="mt-1" dir={isRtl ? "rtl" : "ltr"}>
                      <SelectValue placeholder="اختر النموذج..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون نموذج</SelectItem>
                      {allModels.map(m => (
                        <SelectItem key={m.modelName} value={m.modelName}>
                          <span className="flex items-center gap-2">
                            <span>{m.modelName}</span>
                            <span className="text-[0.6rem] text-muted-foreground">({m.provider})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input label="الميزانية اليومية ($)" type="number" value={form.budget?.dailyUsd || ""} onChange={e => update("budget", { ...form.budget, dailyUsd: e.target.value ? parseFloat(e.target.value) : undefined })} />
              <div className="flex items-center gap-2">
                <Switch checked={form.guardrails?.requireDraftOrders || false} onCheckedChange={v => update("guardrails", { ...form.guardrails, requireDraftOrders: v })} />
                <span className="text-xs">يتطلب أوامر مسودة</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.guardrails?.singleQuestionPerTurn || false} onCheckedChange={v => update("guardrails", { ...form.guardrails, singleQuestionPerTurn: v })} />
                <span className="text-xs">سؤال واحد لكل دورة</span>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : <CheckCircle className="size-4 ml-1" />} حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Preview Dialog
   ════════════════════════════════════════════════ */
export const PreviewDialog: React.FC<{ template: TemplateItem; onClose: () => void }> = ({ template: t, onClose }) => {
  const [fullSoul, setFullSoul] = useState<string | null>(null);
  const [loadingSoul, setLoadingSoul] = useState(false);

  useEffect(() => {
    setFullSoul(null);
    setLoadingSoul(true);
    apiClient.get(`/super-admin/agents/${t.slug}`)
      .then(({ data }) => setFullSoul(data.agent?.instructions_soul || null))
      .catch(() => setFullSoul(null))
      .finally(() => setLoadingSoul(false));
  }, [t.slug]);

  const toneColor = (tone?: string) => toneColors[tone || ""] || "text-gray-600 bg-gray-50";

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{t.icon || ROLE_ICONS[t.role] || "🤖"}</span>
            <div><DialogTitle className="text-lg">{t.name}</DialogTitle><p className="text-xs text-muted-foreground">{t.role} · v{t.version}</p></div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{t.industries.map(ind => <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>)}</div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {t.personaMeta?.language && <span>اللغة: <strong>{t.personaMeta.language === "arabic" ? "العربية" : t.personaMeta.language}</strong></span>}
            {t.personaMeta?.tone && <span className={`text-[0.7rem] px-1.5 py-0.5 rounded-full font-medium ${toneColor(t.personaMeta.tone)}`}>{t.personaMeta.tone}</span>}
            {t.personaMeta?.formality && <span>الرسمية: <strong>{t.personaMeta.formality}</strong></span>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.toolsCount}</p><p className="text-[0.7rem] text-muted-foreground">أدوات</p></div>
            <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.skillsCount}</p><p className="text-[0.7rem] text-muted-foreground">مهارات</p></div>
            <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.budget?.dailyUsd ? `$${t.budget.dailyUsd}` : "-"}</p><p className="text-[0.7rem] text-muted-foreground">الميزانية/يوم</p></div>
          </div>
          <div><p className="text-xs font-bold mb-1">القنوات المتاحة</p><div className="flex gap-2">{t.channels.map(ch => <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>)}</div></div>
          <div><p className="text-xs font-bold mb-1">الشخصية (Soul)</p>
            <div className="bg-muted/30 rounded-lg p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-auto dir-rtl">
              {loadingSoul ? "جاري التحميل..." : (fullSoul || t.soulPreview || "لا توجد شخصية محددة")}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Apply Dialog
   ════════════════════════════════════════════════ */
export const ApplyDialog: React.FC<{ template: TemplateItem; onClose: () => void }> = ({ template: t, onClose }) => {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [models, setModels] = useState<{ modelName: string; provider: string; keyName: string }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { (async () => {
    try { const { data } = await apiClient.get("/super-admin/companies/quick-list"); if (data.success) setCompanies(data.companies); }
    catch { } finally { setLoadingCompanies(false); }
    try { const { data } = await apiClient.get("/super-admin/agents/available-models"); if (data.success) setModels(data.models); }
    catch { } finally { setModelsLoading(false); }
  })(); }, []);

  const apply = async () => {
    if (!selectedId) return;
    setApplying(true); setErr(null);
    try { await apiClient.post("/super-admin/agents/apply-template", { templateSlug: t.slug, companyId: selectedId, model: selectedModel || undefined }); setDone(true); }
    catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); } finally { setApplying(false); }
  };

  const isRtl = i18n.dir() === "rtl";

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>تطبيق القالب على شركة</DialogTitle></DialogHeader>
        {done ? <>
          <div className="flex flex-col items-center gap-2 py-4"><CheckCircle className="size-12 text-green-500" /><p className="font-bold">تم تطبيق قالب {t.name} بنجاح!</p><p className="text-xs text-muted-foreground">الوكيل جاهز للعمل على الشركة المحددة.</p></div>
          <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
        </> : <>
          {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
          <p className="text-sm">تطبيق قالب <strong>{t.icon} {t.name}</strong> على شركة:</p>
          {modelsLoading ? <div className="flex justify-center py-2"><LoadingSpinner /></div>
          : <div>
              <label className="text-xs font-medium text-muted-foreground">النموذج</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="mt-1" dir={isRtl ? "rtl" : "ltr"}>
                  <SelectValue placeholder="النموذج الافتراضي (من القالب)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">النموذج الافتراضي (من القالب)</SelectItem>
                  {models.map(m => (
                    <SelectItem key={m.modelName} value={m.modelName}>
                      <span className="flex items-center gap-2">
                        <span>{m.modelName}</span>
                        <span className="text-[0.6rem] text-muted-foreground">({m.provider} — {m.keyName})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>}
          {loadingCompanies ? <div className="flex justify-center py-4"><LoadingSpinner /></div>
          : <div>
              <label className="text-xs font-medium text-muted-foreground">الشركة</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1">
                <option value="">اختر شركة...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={applying}>إلغاء</Button>
            <Button onClick={apply} disabled={!selectedId || applying}>
              {applying ? <LoadingSpinner size="sm" /> : <Send className="size-4 ml-1" />}{applying ? "جاري التطبيق..." : "تطبيق القالب"}
            </Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Delete Dialog
   ════════════════════════════════════════════════ */
export const DeleteDialog: React.FC<{ template: TemplateItem; onClose: () => void; onDeleted: () => void }> = ({ template: t, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const doDelete = async () => {
    setDeleting(true); setErr(null);
    try { await apiClient.delete(`/super-admin/agents/${t.slug}`); onDeleted(); onClose(); }
    catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); }
    finally { setDeleting(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>حذف القالب</DialogTitle></DialogHeader>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <p>هل أنت متأكد من حذف قالب <strong>{t.icon} {t.name}</strong>؟</p>
        <p className="text-xs text-muted-foreground">لا يمكن التراجع عن هذا. القوالب المرتبطة بوكلاء نشطين لا يمكن حذفها.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>إلغاء</Button>
          <Button variant="destructive" onClick={doDelete} disabled={deleting}>{deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="size-4 ml-1" />} حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Edit Company Agent Dialog
   ════════════════════════════════════════════════ */
interface CompanyAgentInfo {
  agent_id: string;
  company_id: string;
  company_name: string;
  agent_name: string;
  agent_role: string;
  agent_status: string;
  agent_version: string;
  agent_model: string | null;
  template_slug: string;
}

export const EditCompanyAgentDialog: React.FC<{
  agent: CompanyAgentInfo;
  templateSlug: string;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ agent, templateSlug, onClose, onUpdated }) => {
  const [form, setForm] = useState<Record<string, any>>({
    soul: "", rules: "", model: "",
    allowed_tools: [] as string[], allowed_skills: [] as string[],
    allowed_channels: [] as string[],
    soulInstructions: "", agentInstructions: "", toolsInstructions: "", personaInstructions: "",
    custom_soul: "", custom_agents: "", custom_tools: "", custom_persona: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [allTools, setAllTools] = useState<MultiSelectOption[]>([]);
  const [allSkills, setAllSkills] = useState<MultiSelectOption[]>([]);
  const [allModels, setAllModels] = useState<{ modelName: string; provider: string }[]>([]);

  const field = (key: string) => form[key] ?? "";
  const update = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    (async () => {
      try {
        const [agentRes, toolsRes, skillsRes, modelsRes] = await Promise.all([
          apiClient.get(`/ai-admin/agents/${agent.agent_id}?company_id=${agent.company_id}`),
          apiClient.get("/super-admin/agents/tools"),
          apiClient.get("/super-admin/agents/skills"),
          apiClient.get("/super-admin/agents/available-models"),
        ]);
        if (toolsRes.data.success) setAllTools(toolsRes.data.tools.map(t => ({ value: t.name, label: t.name, group: t.group })));
        if (skillsRes.data.success) setAllSkills(skillsRes.data.skills.map(s => ({ value: s.id, label: s.displayName })));
        if (modelsRes.data.success) setAllModels(modelsRes.data.models);
        const a = agentRes.data;
        if (a) {
          setForm({
            soul: a.soul || "",
            rules: a.rules || "",
            model: a.model || "",
            allowed_tools: a.allowed_tools || [],
            allowed_skills: a.allowed_skills || [],
            allowed_channels: a.allowed_channels || [],
            soulInstructions: a.persona?.soulInstructions || "",
            agentInstructions: a.persona?.agentInstructions || "",
            toolsInstructions: a.persona?.toolsInstructions || "",
            personaInstructions: a.persona?.personaInstructions || "",
            custom_soul: a.custom_instructions?.soul || "",
            custom_agents: a.custom_instructions?.agents || "",
            custom_tools: a.custom_instructions?.tools || "",
            custom_persona: a.custom_instructions?.persona || "",
          });
        }
      } catch { setErr("فشل تحميل بيانات الوكيل"); }
      finally { setLoading(false); }
    })();
  }, [agent.agent_id, agent.company_id]);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      await apiClient.put(`/super-admin/agents/${templateSlug}/company/${agent.agent_id}`, {
        companyId: agent.company_id,
        soul: form.soul || null,
        rules: form.rules || null,
        model: form.model || null,
        allowed_tools: form.allowed_tools,
        allowed_skills: form.allowed_skills,
        allowed_channels: form.allowed_channels,
        persona: {
          soulInstructions: form.soulInstructions || "",
          agentInstructions: form.agentInstructions || "",
          toolsInstructions: form.toolsInstructions || "",
          personaInstructions: form.personaInstructions || "",
        },
        custom_instructions: {
          soul: form.custom_soul || "",
          agents: form.custom_agents || "",
          tools: form.custom_tools || "",
          persona: form.custom_persona || "",
        },
      });
      onUpdated(); onClose();
    } catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl"><div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div></DialogContent>
    </Dialog>
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✏️</span>
            <DialogTitle>تعديل نسخة {agent.company_name}</DialogTitle>
            <Badge variant="outline" className="text-xs">{agent.agent_name}</Badge>
          </div>
        </DialogHeader>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <div className="flex-1 overflow-auto px-1 py-2 space-y-3">
          <p className="text-xs text-muted-foreground">هذه التعديلات تؤثر فقط على نسخة هذه الشركة، وليس على القالب الأساسي.</p>
          <div>
            <label className="text-xs font-medium text-muted-foreground">النموذج</label>
            <select value={field("model")} onChange={e => update("model", e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1">
              <option value="">النموذج الافتراضي (من القالب)</option>
              {allModels.map(m => <option key={m.modelName} value={m.modelName}>{m.modelName} ({m.provider})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">الشخصية (Soul)</label>
            <Textarea className="mt-1 font-mono text-sm min-h-[150px]" dir={i18n.dir()}
              value={field("soul")} onChange={e => update("soul", e.target.value)}
              placeholder="شخصية الوكيل الخاصة بهذه الشركة..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">القواعد والسياسات (Rules)</label>
            <Textarea className="mt-1 font-mono text-sm min-h-[100px]" dir={i18n.dir()}
              value={field("rules")} onChange={e => update("rules", e.target.value)}
              placeholder="قواعد وسياسات إضافية..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">قواعد الوكيل (AGENTS.md)</label>
            <Textarea className="mt-1 font-mono text-sm min-h-[100px]" dir={i18n.dir()}
              value={field("agentInstructions")} onChange={e => update("agentInstructions", e.target.value)}
              placeholder="قواعد الوكيل الخاصة بهذه الشركة..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">تعليمات الأدوات (TOOLS.md)</label>
            <Textarea className="mt-1 font-mono text-sm min-h-[100px]" dir={i18n.dir()}
              value={field("toolsInstructions")} onChange={e => update("toolsInstructions", e.target.value)}
              placeholder="تعليمات الأدوات..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">تعليمات الشخصية (PERSONA.md)</label>
            <Textarea className="mt-1 font-mono text-sm min-h-[100px]" dir={i18n.dir()}
              value={field("personaInstructions")} onChange={e => update("personaInstructions", e.target.value)}
              placeholder="تعليمات الشخصية..." />
          </div>
          <div className="border-t pt-3 mt-2">
            <p className="text-xs font-bold text-muted-foreground mb-2">📋 إضافات مخصصة (تضاف إلى تعليمات القالب دون حذفها)</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">إضافة للشخصية (Soul)</label>
                <Textarea className="mt-1 font-mono text-sm min-h-[80px]" dir={i18n.dir()}
                  value={field("custom_soul")} onChange={e => update("custom_soul", e.target.value)}
                  placeholder="إضافات مخصصة للشخصية..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">إضافة لقواعد الوكيل (AGENTS.md)</label>
                <Textarea className="mt-1 font-mono text-sm min-h-[80px]" dir={i18n.dir()}
                  value={field("custom_agents")} onChange={e => update("custom_agents", e.target.value)}
                  placeholder="إضافات مخصصة لقواعد الوكيل..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">إضافة لتعليمات الأدوات (TOOLS.md)</label>
                <Textarea className="mt-1 font-mono text-sm min-h-[80px]" dir={i18n.dir()}
                  value={field("custom_tools")} onChange={e => update("custom_tools", e.target.value)}
                  placeholder="إضافات مخصصة لتعليمات الأدوات..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">إضافة لتعليمات الشخصية (PERSONA.md)</label>
                <Textarea className="mt-1 font-mono text-sm min-h-[80px]" dir={i18n.dir()}
                  value={field("custom_persona")} onChange={e => update("custom_persona", e.target.value)}
                  placeholder="إضافات مخصصة لتعليمات الشخصية..." />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">الأدوات المسموحة</label>
            <MultiSelect options={allTools} selected={form.allowed_tools || []}
              onChange={v => update("allowed_tools", v)} placeholder="اختر الأدوات..."
              searchPlaceholder="ابحث عن أداة..." emptyText="لا توجد أدوات" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">المهارات المسموحة</label>
            <MultiSelect options={allSkills} selected={form.allowed_skills || []}
              onChange={v => update("allowed_skills", v)} placeholder="اختر المهارات..."
              searchPlaceholder="ابحث عن مهارة..." emptyText="لا توجد مهارات" />
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <Save className="size-4 ml-1" />} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ════════════════════════════════════════════════
   Duplicate Dialog
   ════════════════════════════════════════════════ */
export const DuplicateDialog: React.FC<{ template: TemplateItem; onClose: () => void; onCreated: () => void }> = ({ template: t, onClose, onCreated }) => {
  const [newName, setNewName] = useState(t.name + " (نسخة)");
  const [newSlug, setNewSlug] = useState(t.slug + "-copy");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doDuplicate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true); setErr(null);
    try {
      const { data } = await apiClient.get(`/super-admin/agents/${t.slug}`);
      if (!data.agent) throw new Error("فشل تحميل بيانات القالب");
      const { created_at, updated_at, is_active, agent_templates, ...rest } = data.agent;
      await apiClient.post("/super-admin/agents", {
        ...rest,
        slug: newSlug.trim(), name: newName.trim(), role: rest.role || t.role,
      });
      onCreated(); onClose();
    } catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); }
    finally { setCreating(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>نسخ القالب</DialogTitle></DialogHeader>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <p className="text-sm">سيتم إنشاء نسخة من قالب <strong>{t.icon} {t.name}</strong></p>
        <div className="space-y-3 mt-2" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); doDuplicate(); } }}>
          <Input label="الاسم الجديد *" value={newName}
            onChange={e => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} autoFocus />
          <Input label="المعرّف الجديد (slug) *" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>إلغاء</Button>
          <Button onClick={doDuplicate} disabled={!newName.trim() || !newSlug.trim() || creating}>
            {creating ? <LoadingSpinner size="sm" /> : <Copy className="size-4 ml-1" />} نسخ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
