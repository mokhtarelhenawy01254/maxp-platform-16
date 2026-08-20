import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  ArrowRight, Pencil, Copy, Check, Send, Trash2, Edit3,
  Brain, BookOpen, Wrench, Layers, Globe, CreditCard,
  Shield, Share2, Server, Split, Calendar, Building2, ChevronDown, ChevronUp,
  RotateCcw, Braces, Hash, List, FileText, User,
} from "lucide-react";
import {
  EditDialog, ApplyDialog, DeleteDialog, DuplicateDialog, EditCompanyAgentDialog,
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
  const [editCompanyTarget, setEditCompanyTarget] = useState<any>(null);
  const [reconcileTarget, setReconcileTarget] = useState<any>(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const doReconcile = async () => {
    if (!reconcileTarget || !slug) return;
    try {
      await apiClient.post(`/super-admin/agents/${slug}/company/${reconcileTarget.agent_id}/reconcile`, { companyId: reconcileTarget.company_id });
      setReconcileTarget(null);
      setReconcileOpen(false);
      setActiveTab("companies");
    } catch { /* error handled in dialog */ }
  };

  const fetchTemplate = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/super-admin/agents/${slug}`);
      if (data.agent) setTemplate(data.agent);
      else setError("القالب غير موجود");
    } catch { setError("فشل تحميل بيانات القالب"); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

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
    { id: "companies", label: "الشركات", icon: Building2 },
    { id: "advanced", label: "متقدم", icon: Split },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] bg-gradient-to-br from-slate-50 to-blue-50/30">
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

        {activeTab === "companies" && (
          <CompaniesTab slug={slug!} onEditAgent={setEditCompanyTarget} onReconcile={(c) => { setReconcileTarget(c); setReconcileOpen(true); }} />
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
      {editCompanyTarget && (
        <EditCompanyAgentDialog
          agent={editCompanyTarget}
          templateSlug={slug!}
          onClose={() => setEditCompanyTarget(null)}
          onUpdated={() => { setEditCompanyTarget(null); setActiveTab("companies"); }}
        />
      )}
      {reconcileOpen && (
        <Dialog open onOpenChange={o => { if (!o) { setReconcileOpen(false); setReconcileTarget(null); } }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="size-5 text-destructive" />
                <DialogTitle>إعادة تعيين الوكيل</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm">سيتم إعادة تعيين وكيل <strong>{reconcileTarget?.agent_name}</strong> لشركة <strong>{reconcileTarget?.company_name}</strong> إلى إعدادات القالب الأساسية. جميع التعديلات الخاصة بهذه الشركة (الشخصية، القواعد، الأدوات، المهارات) ستُلغى.</p>
            <Alert variant="destructive">
              <AlertTitle className="text-xs font-bold">تأكيد</AlertTitle>
              <AlertDescription className="text-xs">هذا الإجراء لا يمكن التراجع عنه. سيفقد الوكيل جميع التخصيصات الحالية.</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReconcileOpen(false); setReconcileTarget(null); }}>إلغاء</Button>
              <Button variant="destructive" onClick={doReconcile}>
                <RotateCcw className="size-4 ml-1" /> إعادة تعيين
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

const DIFF_BADGES: Record<string, { label: string; className: string }> = {
  modified: { label: "معدل", className: "bg-amber-100 text-amber-700" },
  added: { label: "مضاف", className: "bg-green-100 text-green-700" },
  removed: { label: "محذوف", className: "bg-red-100 text-red-700" },
};

const DIFF_FIELD_LABELS: Record<string, string> = {
  model: "النموذج", soul: "الشخصية", rules: "القواعد",
  allowed_tools: "الأدوات", allowed_skills: "المهارات",
  channels: "القنوات", guardrails: "الضوابط",
  budget: "الميزانية", persona: "بيانات الشخصية", version: "الإصدار",
};

const FieldCard: React.FC<{ icon?: any; label: string; value?: string; mono?: boolean; className?: string; children?: React.ReactNode }> = ({ icon: Icon, label, value, mono, className, children }) => (
  <div className={`rounded-lg border bg-card p-3 ${className || ''}`}>
    <div className="flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon className="size-3 text-muted-foreground" />}
      <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    {children || (value ? <div className={`text-xs ${mono ? 'font-mono whitespace-pre-wrap' : ''}`}>{value}</div> : <span className="text-xs text-muted-foreground/50">—</span>)}
  </div>
);

const CompaniesTab: React.FC<{ slug: string; onEditAgent: (a: any) => void; onReconcile: (a: any) => void }> = ({ slug, onEditAgent, onReconcile }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const { data: res } = await apiClient.get(`/super-admin/agents/${slug}/companies`);
      if (res.success) setData(res);
      else setError("فشل تحميل البيانات");
    } catch { setError("فشل تحميل الشركات المستخدمة"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [slug]);

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (error) return <div className="max-w-3xl"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription><div className="mt-2"><Button variant="outline" size="sm" onClick={fetchData}>إعادة المحاولة</Button></div></Alert></div>;
  if (!data || data.total_companies === 0) return (
    <div className="max-w-3xl flex flex-col items-center gap-3 py-12">
      <Building2 className="size-16 opacity-15" />
      <p className="text-sm text-muted-foreground">لا توجد شركات تستخدم هذا القالب حالياً</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">{data.total_companies} شركة تستخدم <strong>{data.template_name}</strong> (v{data.template_version})</p>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="text-right p-3 font-medium">الشركة</th>
              <th className="text-right p-3 font-medium">الوكيل</th>
              <th className="text-right p-3 font-medium">الحالة</th>
              <th className="text-right p-3 font-medium">الإصدار</th>
              <th className="text-center p-3 font-medium">التعديلات</th>
              <th className="text-left p-3 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((c: any) => (
              <React.Fragment key={c.agent_id}>
                <tr className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === c.agent_id ? null : c.agent_id)}>
                  <td className="p-3">
                    <p className="text-sm font-semibold">{c.company_name}</p>
                    <p className="text-[0.65rem] text-muted-foreground font-mono">{c.company_id}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-xs">{c.agent_name}</p>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.agent_role}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium ${c.agent_status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {c.agent_status === "ACTIVE" ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{c.agent_version}</td>
                  <td className="p-3 text-center">
                    {c.diff_count > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{c.diff_count} تعديل</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">بدون تعديلات</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-xs" onClick={() => onEditAgent(c)} title="تعديل نسخة الشركة"><Pencil className="size-3.5" /></Button>
                      {expandedId === c.agent_id ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </div>
                  </td>
                </tr>
                {expandedId === c.agent_id && (
                  <tr className="bg-muted/20">
                    <td colSpan={6} className="p-3">
                      <div className="flex flex-col gap-4">
                        {c.diffs?.length > 0 && (
                          <div>
                            <p className="text-[0.7rem] font-bold text-muted-foreground mb-2">التعديلات على القالب الأساسي:</p>
                            <div className="flex flex-wrap gap-2">
                              {c.diffs.map((d: any, i: number) => (
                                <span key={i} className={`inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${(DIFF_BADGES[d.type] || DIFF_BADGES.modified).className}`}>
                                  {(DIFF_BADGES[d.type] || DIFF_BADGES.modified).label} {DIFF_FIELD_LABELS[d.field] || d.field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(c.agent) && (() => {
                          const a = c.agent;
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {a.model && <FieldCard icon={Brain} label="النموذج" value={a.model} className="md:col-span-2" />}
                              {(a.persona?.soulInstructions || a.soul) && <FieldCard icon={BookOpen} label="الشخصية (Soul)" value={a.persona?.soulInstructions || a.soul} mono className="md:col-span-2" />}
                              {(a.persona?.agentInstructions || a.rules) && <FieldCard icon={FileText} label="قواعد الوكيل (AGENTS.md)" value={a.persona?.agentInstructions || a.rules} mono className="md:col-span-2" />}
                              {a.persona?.toolsInstructions && <FieldCard icon={Wrench} label="تعليمات الأدوات (TOOLS.md)" value={a.persona.toolsInstructions} mono className="md:col-span-2" />}
                              {a.persona?.personaInstructions && <FieldCard icon={User} label="تعليمات الشخصية (PERSONA.md)" value={a.persona.personaInstructions} mono className="md:col-span-2" />}
                              {a.allowed_tools?.length > 0 && (
                                <FieldCard icon={Wrench} label={`الأدوات المسموحة (${a.allowed_tools.length})`}>
                                  <div className="flex flex-wrap gap-1">{a.allowed_tools.map((t: string) => <Badge key={t} variant="outline" className="text-[0.65rem]">{t}</Badge>)}</div>
                                </FieldCard>
                              )}
                              {a.allowed_skills?.length > 0 && (
                                <FieldCard icon={Layers} label={`المهارات المسموحة (${a.allowed_skills.length})`}>
                                  <div className="flex flex-wrap gap-1">{a.allowed_skills.map((s: string) => <Badge key={s} variant="outline" className="text-[0.65rem]">{s}</Badge>)}</div>
                                </FieldCard>
                              )}
                              {a.allowed_channels?.length > 0 && (
                                <FieldCard icon={Globe} label="القنوات" value={a.allowed_channels.join(', ')} />
                              )}
                              {a.guardrails && Object.keys(a.guardrails).length > 0 && (
                                <FieldCard icon={Shield} label="حراس الأمان" value={JSON.stringify(a.guardrails)} mono />
                              )}
                              {a.budget && Object.keys(a.budget).length > 0 && (
                                <FieldCard icon={CreditCard} label="الميزانية" value={JSON.stringify(a.budget)} />
                              )}
                              {a.custom_instructions && (a.custom_instructions.soul || a.custom_instructions.agents || a.custom_instructions.tools || a.custom_instructions.persona) && (
                                <div className="md:col-span-2 border rounded-lg border-dashed border-amber-300 bg-amber-50/40 p-3">
                                  <p className="text-[0.65rem] font-bold text-amber-700 mb-2">📄 ملف إضافات العميل — يضاف إلى إعدادات القالب دون تعديلها</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {a.custom_instructions.soul && <FieldCard icon={BookOpen} label="إضافة للشخصية (Soul)" value={a.custom_instructions.soul} mono />}
                                    {a.custom_instructions.agents && <FieldCard icon={FileText} label="إضافة لقواعد الوكيل" value={a.custom_instructions.agents} mono />}
                                    {a.custom_instructions.tools && <FieldCard icon={Wrench} label="إضافة لتعليمات الأدوات" value={a.custom_instructions.tools} mono />}
                                    {a.custom_instructions.persona && <FieldCard icon={User} label="إضافة لتعليمات الشخصية" value={a.custom_instructions.persona} mono />}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => onEditAgent(c)}>
                            <Pencil className="size-3.5 ml-1" /> تعديل نسخة الشركة
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onReconcile(c)}>
                            <RotateCcw className="size-3.5 ml-1" /> إعادة تعيين
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminAITemplateDetail;
