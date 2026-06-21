import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  ArrowRight, Pencil, Copy, Check, Send, Trash2, Edit3,
  Brain, BookOpen, Wrench, Layers, Globe, CreditCard,
  Shield, Share2, Server, Split, Calendar,
} from "lucide-react";
import {
  EditDialog, ApplyDialog, DeleteDialog, DuplicateDialog,
  ROLE_ICONS, ROLE_COLORS, toneColors,
} from "./SuperAdminAITemplatesDialogs";

interface FullTemplate {
  slug: string; role: string; name: string; version: string;
  model_policy: Record<string, any>; allowed_tools: string[]; allowed_skills: string[];
  channels: string[]; guardrails: Record<string, any>; persona_meta: Record<string, any>;
  instructions_agents: string | null; instructions_soul: string | null;
  instructions_tools: string | null; instructions_persona: string | null;
  human_approval: Record<string, any>; handoffs: any[]; mcp_servers: any[];
  budget: Record<string, any>; output_schema: Record<string, any> | null;
  config: Record<string, any>; created_at: string; updated_at: string;
}

const SuperAdminAITemplateDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<FullTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("soul");
  const [editOpen, setEditOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/super-admin/agents/${slug}`);
        if (data.agent) setTemplate(data.agent);
        else setError("القالب غير موجود");
      } catch { setError("فشل تحميل بيانات القالب"); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  const color = (role?: string) => ROLE_COLORS[role || ""] || "bg-gray-100 text-gray-700";
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyText = useCallback(async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch { }
  }, []);

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <Alert variant="destructive" className="max-w-md"><AlertDescription>{error}</AlertDescription></Alert>
      <div className="flex gap-2">
        <Button variant="outline" onClick={fetchTemplate}>إعادة المحاولة</Button>
        <Button variant="outline" onClick={() => navigate("/super-admin/ai-templates")}>العودة للقوائم</Button>
      </div>
    </div>
  );
  if (!template) return null;

  const t = template;
  const icon = ROLE_ICONS[t.role] || "🤖";

  const TABS = [
    { id: "soul", label: "الشخصية", icon: Brain },
    { id: "instructions", label: "التعليمات", icon: BookOpen },
    { id: "tools", label: "الأدوات والمهارات", icon: Wrench },
    { id: "config", label: "الإعدادات", icon: Edit3 },
    { id: "advanced", label: "متقدم", icon: Split },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-white/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/ai-templates")}>
            <ArrowRight className="size-4 ml-1" /> العودة
          </Button>
          <span className="text-3xl">{icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">{t.name}</p>
              <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${color(t.role)}`}>{t.role}</span>
              <Badge variant="outline" className="text-[0.65rem]">v{t.version}</Badge>
              <span className="text-[0.65rem] font-mono text-muted-foreground">{t.slug}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="size-3.5 ml-1" /> تعديل</Button>
          <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}><Copy className="size-3.5 ml-1" /> نسخ</Button>
          <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}><Send className="size-3.5 ml-1" /> تطبيق</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="size-3.5 ml-1" /> حذف</Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-2 bg-white/50 border-b shrink-0">
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{t.allowed_tools?.length || 0}</p><p className="text-[0.65rem] text-muted-foreground">أدوات</p></div>
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{t.allowed_skills?.length || 0}</p><p className="text-[0.65rem] text-muted-foreground">مهارات</p></div>
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{t.channels?.length || 0}</p><p className="text-[0.65rem] text-muted-foreground">قنوات</p></div>
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{t.budget?.dailyUsd ? `$${t.budget.dailyUsd}` : "-"}</p><p className="text-[0.65rem] text-muted-foreground">الميزانية/يوم</p></div>
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{t.model_policy?.default || "-"}</p><p className="text-[0.65rem] text-muted-foreground">النموذج</p></div>
        <div className="rounded-lg bg-white border p-2 text-center"><p className="text-lg font-bold text-primary">{(t.handoffs?.length || 0) + (t.mcp_servers?.length || 0)}</p><p className="text-[0.65rem] text-muted-foreground">تكاملات</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-2 bg-white/50 border-b shrink-0" role="tablist">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={e => {
                if (e.key === "ArrowRight") { e.preventDefault(); setActiveTab(TABS[(i + 1) % TABS.length].id); }
                if (e.key === "ArrowLeft") { e.preventDefault(); setActiveTab(TABS[(i - 1 + TABS.length) % TABS.length].id); }
              }}
              className={`flex items-center gap-1 px-3 py-2 rounded-t-lg text-xs font-medium transition-all ${isActive ? "bg-white border border-b-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "soul" && (
          <div className="max-w-3xl space-y-4">
            <Section title="الشخصية (Soul)" icon={Brain}>
              <div className="relative">
                {t.instructions_soul && <button onClick={() => copyText(t.instructions_soul, "soul")} className="absolute top-2 left-2 opacity-50 hover:opacity-100 transition-opacity z-10">
                  {copiedId === "soul" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>}
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono dir-rtl" dir={i18n.dir()}>
                  {t.instructions_soul || "لا توجد شخصية محددة"}
                </div>
              </div>
            </Section>
            {t.persona_meta && Object.keys(t.persona_meta).length > 0 && (
              <Section title="بيانات الشخصية" icon={Globe}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {t.persona_meta.language && <MetaCard label="اللغة" value={t.persona_meta.language === "arabic" ? "العربية" : t.persona_meta.language} />}
                  {t.persona_meta.dialect && <MetaCard label="اللهجة" value={t.persona_meta.dialect} />}
                  {t.persona_meta.tone && <MetaCard label="النبرة" value={t.persona_meta.tone} className={toneColors[t.persona_meta.tone] || ""} />}
                  {t.persona_meta.formality && <MetaCard label="الرسمية" value={t.persona_meta.formality} />}
                </div>
              </Section>
            )}
          </div>
        )}

        {activeTab === "instructions" && (
          <div className="max-w-3xl space-y-4">
            <Section title="قواعد الوكيل (AGENTS.md)" icon={BookOpen}>
              <div className="relative">
                {t.instructions_agents && <button onClick={() => copyText(t.instructions_agents, "agents")} className="absolute top-2 left-2 opacity-50 hover:opacity-100 transition-opacity z-10">
                  {copiedId === "agents" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>}
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono dir-rtl max-h-[300px] overflow-auto" dir={i18n.dir()}>
                  {t.instructions_agents || "لا توجد قواعد محددة"}
                </div>
              </div>
            </Section>
            <Section title="تعليمات الأدوات (TOOLS.md)" icon={Wrench}>
              <div className="relative">
                {t.instructions_tools && <button onClick={() => copyText(t.instructions_tools, "tools")} className="absolute top-2 left-2 opacity-50 hover:opacity-100 transition-opacity z-10">
                  {copiedId === "tools" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>}
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono dir-rtl max-h-[300px] overflow-auto" dir={i18n.dir()}>
                  {t.instructions_tools || "لا توجد تعليمات أدوات"}
                </div>
              </div>
            </Section>
            <Section title="تعليمات الشخصية (PERSONA.md)" icon={Globe}>
              <div className="relative">
                {t.instructions_persona && <button onClick={() => copyText(t.instructions_persona, "persona")} className="absolute top-2 left-2 opacity-50 hover:opacity-100 transition-opacity z-10">
                  {copiedId === "persona" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>}
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono dir-rtl max-h-[300px] overflow-auto" dir={i18n.dir()}>
                  {t.instructions_persona || "لا توجد تعليمات شخصية"}
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "tools" && (
          <div className="max-w-3xl space-y-4">
            <Section title={`الأدوات المسموحة (${t.allowed_tools?.length || 0})`} icon={Wrench}>
              <div className="flex flex-wrap gap-2">
                {t.allowed_tools?.length ? t.allowed_tools.map((tool: string) => <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>)
                  : <p className="text-xs text-muted-foreground">لا توجد أدوات محددة</p>}
              </div>
            </Section>
            <Section title={`المهارات المسموحة (${t.allowed_skills?.length || 0})`} icon={Layers}>
              <div className="flex flex-wrap gap-2">
                {t.allowed_skills?.length ? t.allowed_skills.map((skill: string) => <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>)
                  : <p className="text-xs text-muted-foreground">لا توجد مهارات محددة</p>}
              </div>
            </Section>
            <Section title={`القنوات (${t.channels?.length || 0})`} icon={Globe}>
              <div className="flex flex-wrap gap-2">
                {t.channels?.length ? t.channels.map((ch: string) => <Badge key={ch} className="text-xs bg-primary/10 text-primary">{ch}</Badge>)
                  : <p className="text-xs text-muted-foreground">لا توجد قنوات محددة</p>}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "config" && (
          <div className="max-w-3xl space-y-4">
            <Section title="نموذج الذكاء الاصطناعي" icon={Brain}>
              <div className="grid grid-cols-2 gap-3">
                <MetaCard label="النموذج الافتراضي" value={t.model_policy?.default || "-"} />
                <MetaCard label="النموذج البديل" value={t.model_policy?.fallback || "-"} />
              </div>
            </Section>
            <Section title="الميزانية" icon={CreditCard}>
              <div className="grid grid-cols-2 gap-3">
                <MetaCard label="الميزانية اليومية" value={t.budget?.dailyUsd ? `$${t.budget.dailyUsd}` : "غير محدد"} />
                <MetaCard label="أقصى استدعاءات أدوات" value={t.budget?.maxToolCallsPerRun?.toString() || "غير محدد"} />
              </div>
            </Section>
            <Section title="الضوابط (Guardrails)" icon={Shield}>
              <div className="grid grid-cols-2 gap-3">
                <MetaCard label="يتطلب أوامر مسودة" value={t.guardrails?.requireDraftOrders ? "نعم" : "لا"} />
                <MetaCard label="سؤال واحد لكل دورة" value={t.guardrails?.singleQuestionPerTurn ? "نعم" : "لا"} />
              </div>
            </Section>
            <Section title="الموافقة البشرية" icon={Shield}>
              <div className="space-y-2">
                <MetaCard label="نمط الموافقة" value={t.human_approval?.mode || "غير محدد"} />
                <MetaCard label="رمز الموافقة" value={t.human_approval?.approvalCode ? "مفعل" : "غير مفعل"} />
                {t.human_approval?.requiredTools?.length > 0 && (
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">الأدوات التي تتطلب موافقة:</p>
                    <div className="flex flex-wrap gap-1">{t.human_approval.requiredTools.map((tool: string) => <Badge key={tool} variant="outline" className="text-[0.65rem]">{tool}</Badge>)}</div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="max-w-3xl space-y-4">
            {t.handoffs?.length > 0 && (
              <Section title={`التسليم (Handoffs) — ${t.handoffs.length}`} icon={Share2}>
                <div className="relative">
                  <button onClick={() => copyText(JSON.stringify(t.handoffs, null, 2), "handoffs")} className="absolute top-1 left-1 opacity-50 hover:opacity-100 transition-opacity z-10">
                    {copiedId === "handoffs" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </button>
                  <div className="space-y-2">
                    {t.handoffs.map((h: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 text-xs">
                        <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(h, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}
            {t.mcp_servers?.length > 0 && (
              <Section title={`خوادم MCP — ${t.mcp_servers.length}`} icon={Server}>
                <div className="relative">
                  <button onClick={() => copyText(JSON.stringify(t.mcp_servers, null, 2), "mcp")} className="absolute top-1 left-1 opacity-50 hover:opacity-100 transition-opacity z-10">
                    {copiedId === "mcp" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </button>
                  <div className="space-y-2">
                    {t.mcp_servers.map((m: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 text-xs">
                        <p className="font-bold mb-1">{m.name}</p>
                        <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(m, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}
            {t.output_schema && (
              <Section title="مخطط الإخراج (Output Schema)" icon={Split}>
                <div className="relative">
                  <button onClick={() => copyText(JSON.stringify(t.output_schema, null, 2), "schema")} className="absolute top-1 left-1 opacity-50 hover:opacity-100 transition-opacity z-10">
                    {copiedId === "schema" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </button>
                  <div className="bg-muted/30 rounded-lg p-3 text-xs">
                    <pre className="whitespace-pre-wrap font-mono max-h-[300px] overflow-auto">{JSON.stringify(t.output_schema, null, 2)}</pre>
                  </div>
                </div>
              </Section>
            )}
            {t.config && Object.keys(t.config).length > 0 && (
              <Section title="إعدادات إضافية (Config)" icon={Edit3}>
                <div className="relative">
                  <button onClick={() => copyText(JSON.stringify(t.config, null, 2), "config")} className="absolute top-1 left-1 opacity-50 hover:opacity-100 transition-opacity z-10">
                    {copiedId === "config" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </button>
                  <div className="bg-muted/30 rounded-lg p-3 text-xs">
                    <pre className="whitespace-pre-wrap font-mono max-h-[300px] overflow-auto">{JSON.stringify(t.config, null, 2)}</pre>
                  </div>
                </div>
              </Section>
            )}
            <Section title="معلومات إضافية" icon={Calendar}>
              <div className="grid grid-cols-2 gap-3">
                <MetaCard label="تاريخ الإنشاء" value={t.created_at ? new Date(t.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"} />
                <MetaCard label="آخر تحديث" value={t.updated_at ? new Date(t.updated_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"} />
              </div>
            </Section>
          </div>
        )}
      </div>

      {/* Dialogs — reuse same TemplateItem shape for dialogs */}
      {editOpen && (
        <EditDialog
          template={{ slug: t.slug, name: t.name, role: t.role, version: t.version, icon, description: t.role, personaMeta: t.persona_meta || {}, soulPreview: (t.instructions_soul || "").substring(0, 200), toolsCount: t.allowed_tools?.length || 0, skillsCount: t.allowed_skills?.length || 0, channels: t.channels || [], budget: t.budget || {}, industries: [] }}
          onClose={() => setEditOpen(false)} onUpdated={fetchTemplate}
        />
      )}
      {duplicateOpen && (
        <DuplicateDialog
          template={{ slug: t.slug, name: t.name, role: t.role, version: t.version, icon, description: t.role, personaMeta: t.persona_meta || {}, soulPreview: "", toolsCount: 0, skillsCount: 0, channels: [], budget: {}, industries: [] }}
          onClose={() => setDuplicateOpen(false)} onCreated={() => navigate("/super-admin/ai-templates")}
        />
      )}
      {applyOpen && (
        <ApplyDialog
          template={{ slug: t.slug, name: t.name, role: t.role, version: t.version, icon, description: t.role, personaMeta: {}, soulPreview: "", toolsCount: 0, skillsCount: 0, channels: [], budget: {}, industries: [] }}
          onClose={() => setApplyOpen(false)}
        />
      )}
      {deleteOpen && (
        <DeleteDialog
          template={{ slug: t.slug, name: t.name, role: t.role, version: t.version, icon, description: t.role, personaMeta: {}, soulPreview: "", toolsCount: 0, skillsCount: 0, channels: [], budget: {}, industries: [] }}
          onClose={() => setDeleteOpen(false)} onDeleted={() => navigate("/super-admin/ai-templates")}
        />
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; icon: React.FC<{ className?: string }>; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border p-4">
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="size-4 text-primary" />
      <h3 className="text-xs font-bold">{title}</h3>
    </div>
    {children}
  </div>
);

const MetaCard: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
  <div className={`bg-muted/30 rounded-lg px-3 py-2 ${className || ""}`}>
    <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

export default SuperAdminAITemplateDetail;
