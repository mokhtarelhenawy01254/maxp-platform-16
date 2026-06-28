import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Sparkles, Zap, FileText, Shield, ArrowRight, UserPlus, Copy, Check,
  Info, Package, RefreshCw,
} from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

interface ToolDefinition { name: string; description: string; sideEffects: "read" | "write"; requiresApproval: boolean; }
interface SkillDefinition { id: string; displayName: string; version?: string; description?: string; allowedTools: string[]; requiresHumanApproval?: boolean; maxToolCount?: number; skillMd?: string; group?: string; }
interface AgentDefinition { id: string; name: string; role: string; icon: string; status: string; allowedSkills?: string[]; allowedTools?: string[]; }

const cq = (path: string, companyId?: string) =>
  companyId ? `${path}${path.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}` : path;
const apiRequest = async <T,>(path: string, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), { headers: tokenManager.createAuthHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};

const GROUP_LABELS: Record<string, string> = {
  sales: "المبيعات", marketing: "التسويق", support: "الدعم",
  product: "المنتجات", customer: "العملاء", management: "الإدارة",
  inventory: "المخزون", order: "الطلبات", pricing: "التسعير",
  store: "المتجر", other: "أخرى",
};

export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [skill, setSkill] = useState<SkillDefinition | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = useCallback(async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch {}
  }, []);

  const toolMap = useMemo(() => new Map(tools.map((t) => [t.name, t])), [tools]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.skill) {
      setSkill(state.skill);
      setTools(state.tools || []);
      setAgents(state.agents || []);
      setCompanyId(state.companyId);
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    if (skill) return;
    if (!skillId) return;

    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sd, td] = await Promise.all([
          apiRequest<{ success: true; skills: SkillDefinition[] }>("agent/skills"),
          apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools"),
        ]);
        const found = (sd.skills || []).find((s) => s.id === skillId);
        if (!found) throw new Error("المهارة غير موجودة");
        setSkill(found);
        setTools(td.tools || []);
      } catch (err: any) {
        setError(err.message || "فشل تحميل بيانات المهارة");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [skillId, skill]);

  const skillAgentCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of agents) for (const sid of a.allowedSkills || []) m.set(sid, (m.get(sid) || 0) + 1);
    return m;
  }, [agents]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <Alert variant="destructive" className="max-w-md"><AlertDescription>{error}</AlertDescription></Alert>
      <Button variant="outline" onClick={() => navigate("/super-admin/ai-hub?tab=skills")}>العودة للمهارات</Button>
    </div>
  );

  if (!skill) return null;

  const s = skill;
  const agentCount = skillAgentCount.get(s.id) || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="shrink-0 border-b bg-white/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/ai-hub?tab=skills")}>
            <ArrowRight className="ml-1 size-4" /> العودة
          </Button>
          <Sparkles className="size-5 text-primary" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">{s.displayName || s.id}</p>
              {s.group && <Badge variant="secondary" className="text-[0.65rem]">{GROUP_LABELS[s.group] || s.group}</Badge>}
              <Badge variant="outline" className="text-[0.65rem]">v{s.version || "1"}</Badge>
              <span className="font-mono text-[0.65rem] text-muted-foreground">{s.id}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b bg-white/50 px-4 py-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-2 text-center">
          <p className="text-lg font-bold text-primary">{s.allowedTools?.length || 0}</p>
          <p className="text-[0.65rem] text-muted-foreground">أدوات</p>
        </div>
        <div className="rounded-lg border bg-white p-2 text-center">
          <p className="text-lg font-bold text-primary">{agentCount}</p>
          <p className="text-[0.65rem] text-muted-foreground">وكلاء</p>
        </div>
        <div className="rounded-lg border bg-white p-2 text-center">
          <Badge variant={s.requiresHumanApproval ? "destructive" : "default"} className="text-[0.65rem]">
            {s.requiresHumanApproval ? "يتطلب موافقة" : "تنفيذ مباشر"}
          </Badge>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">نوع التنفيذ</p>
        </div>
        <div className="rounded-lg border bg-white p-2 text-center">
          <p className="text-lg font-bold text-primary">{s.skillMd ? "متاح" : "بدون"}</p>
          <p className="text-[0.65rem] text-muted-foreground">SKILL.md</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <Section title="المعلومات الأساسية" icon={Info}>
            <div className="grid grid-cols-2 gap-3">
              <MetaCard label="المعرف" value={s.id} />
              <MetaCard label="الاسم" value={s.displayName || s.id} />
              <MetaCard label="الإصدار" value={s.version || "1"} />
              <MetaCard label="المجموعة" value={s.group ? (GROUP_LABELS[s.group] || s.group) : "بدون مجموعة"} />
              <MetaCard label="يتطلب موافقة بشرية" value={s.requiresHumanApproval ? "نعم" : "لا"} />
              {s.maxToolCount !== undefined && <MetaCard label="الحد الأقصى للأدوات" value={String(s.maxToolCount)} />}
            </div>
            {s.description && (
              <div className="mt-3">
                <p className="mb-1 text-[0.65rem] text-muted-foreground">الوصف</p>
                <p className="rounded-lg bg-muted/30 p-3 text-sm">{s.description}</p>
              </div>
            )}
          </Section>

          <Section title={`الأدوات المسموحة (${s.allowedTools?.length || 0})`} icon={Package}>
            {(s.allowedTools || []).length > 0 ? (
              <div className="flex flex-col gap-2">
                {(s.allowedTools || []).map((tn) => {
                  const toolDef = toolMap.get(tn);
                  return (
                    <div key={tn} className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Zap className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{tn}</p>
                        <span className="text-xs text-muted-foreground">{toolDef?.description || "لا يوجد وصف"}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {toolDef?.sideEffects === "write" ? (
                          <Badge variant="outline" className="h-5 text-[0.6rem]">كتابة</Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 border-green-200 bg-green-50 text-[0.6rem] text-green-700">قراءة فقط</Badge>
                        )}
                        {toolDef?.requiresApproval && (
                          <Badge variant="outline" className="h-5 border-amber-600 bg-amber-50 text-[0.6rem] text-amber-600">موافقة</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد أدوات محددة</p>
            )}
          </Section>

          <Section title="ملف المهارة (SKILL.md)" icon={FileText}>
            <div className="relative">
              {s.skillMd && (
                <button
                  onClick={() => copyText(s.skillMd!, "skillmd")}
                  className="absolute left-2 top-2 z-10 opacity-50 transition-opacity hover:opacity-100"
                >
                  {copiedId === "skillmd" ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>
              )}
              <div className="rounded-xl bg-[#101828] p-4 text-[#e6edf7]" dir="ltr">
                <pre
                  className="m-0 max-h-[400px] overflow-auto whitespace-pre-wrap font-mono text-xs"
                  style={{ fontFamily: "Consolas, monospace" }}
                >
                  {s.skillMd || "لا يوجد محتوى SKILL.md"}
                </pre>
              </div>
            </div>
          </Section>

          {agents.length > 0 && (
            <Section title={`الوكلاء الذين يستخدمون هذه المهارة (${agentCount})`} icon={UserPlus}>
              {agentCount > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {agents.filter((a) => a.allowedSkills?.includes(s.id)).map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 rounded-xl border bg-white p-3">
                      <span className="text-lg">{agent.icon || "🤖"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{agent.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{agent.role}</p>
                      </div>
                      <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-[0.6rem]">
                        {agent.status === "active" ? "نشط" : agent.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">لا يوجد وكلاء يستخدمون هذه المهارة</p>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.FC<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Icon className="size-4 text-primary" />
        <h3 className="text-xs font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
