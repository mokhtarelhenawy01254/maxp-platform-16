import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Star, Zap, File, Shield, ArrowRight, Users, Clipboard, Check, Info, Package, Book, Terminal, AlertTriangle, Grid } from 'lucide-react';
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

// Custom lightweight inline markdown parsing helper
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-mono text-[0.75rem] text-rose-600" dir="ltr">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

// Custom lightweight block markdown parser
const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLang = "";
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        renderedElements.push(
          <div key={`code-${i}`} className="my-4 rounded-xl bg-zinc-950 p-4 border border-zinc-800 text-zinc-100 font-mono text-xs overflow-auto shadow-md" dir="ltr">
            {codeLang && (
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-sans font-bold border-b border-zinc-800/80 pb-1.5">
                {codeLang}
              </div>
            )}
            <pre className="whitespace-pre-wrap">{codeContent.join("\n")}</pre>
          </div>
        );
        codeContent = [];
        codeLang = "";
      } else {
        inCodeBlock = true;
        codeLang = line.trim().substring(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-2 mt-6 mb-4">
          {parseInlineMarkdown(line.substring(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-800 mt-5 mb-3 flex items-center gap-2">
          {parseInlineMarkdown(line.substring(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-800 mt-4 mb-2">
          {parseInlineMarkdown(line.substring(4))}
        </h3>
      );
      continue;
    }

    // Blockquotes/Alerts
    if (line.startsWith("> ")) {
      renderedElements.push(
        <blockquote key={`bq-${i}`} className="border-r-4 border-indigo-500 bg-indigo-50/50 px-4 py-3 rounded-l-lg my-4 text-sm text-slate-700 italic">
          {parseInlineMarkdown(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().substring(2);
      renderedElements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside mr-4 my-2 text-sm text-slate-600 leading-relaxed">
          <li>{parseInlineMarkdown(cleanLine)}</li>
        </ul>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      continue;
    }

    // Paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-sm text-slate-600 leading-relaxed mb-3">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  return <div className="space-y-1">{renderedElements}</div>;
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
  const [docTab, setDocTab] = useState<"preview" | "raw">("preview");

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
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-4">
      <Alert variant="destructive" className="max-w-md shadow-sm"><AlertDescription className="font-semibold text-center">{error}</AlertDescription></Alert>
      <Button variant="outline" onClick={() => navigate("/admin/ai-hub?tab=skills")}>العودة للمهارات</Button>
    </div>
  );

  if (!skill) return null;

  const s = skill;
  const agentCount = skillAgentCount.get(s.id) || 0;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] bg-[#f8fafc]" dir="rtl">
      {/* Sticky top nav with high-end glass effect */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/ai-hub?tab=skills")} className="h-8 border-slate-200 hover:bg-slate-50 transition-colors">
              <ArrowRight className="ml-1.5 size-4 text-slate-500" /> العودة
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-600" />
              <h2 className="text-base font-extrabold text-slate-800">{s.displayName || s.id}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {s.group && <Badge variant="secondary" className="text-[0.65rem] bg-slate-100 text-slate-600 hover:bg-slate-100 font-bold px-2 py-0.5 rounded-md">{GROUP_LABELS[s.group] || s.group}</Badge>}
              <Badge variant="outline" className="text-[0.65rem] border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-md">v{s.version || "1"}</Badge>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 self-start sm:self-auto" dir="ltr">{s.id}</span>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-slate-200/50 bg-slate-50/30 px-6 py-5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="size-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-800 leading-tight">{s.allowedTools?.length || 0}</p>
              <p className="text-[0.65rem] text-slate-400 font-bold">أدوات مصرحة</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserPlus className="size-5" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-800 leading-tight">{agentCount}</p>
              <p className="text-[0.65rem] text-slate-400 font-bold">وكلاء نشطين</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800 truncate leading-tight">
                {s.requiresHumanApproval ? "موافقة بشرية" : "تلقائي بالكامل"}
              </p>
              <p className="text-[0.65rem] text-slate-400 font-bold">نمط الرقابة</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-tight">{s.skillMd ? "متوفر" : "غير متوفر"}</p>
              <p className="text-[0.65rem] text-slate-400 font-bold">دليل المهارة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Responsive 3 Columns split */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Content Pane (Left on LTR, Right/Left based on RTL): SKILL.md Reader (Takes 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-800">دليل المهارة (SKILL.md)</h3>
                </div>
                
                {s.skillMd && (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5 border border-slate-200/40">
                    <button
                      onClick={() => setDocTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        docTab === "preview"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <BookOpen className="size-3.5" />
                      المستند (Preview)
                    </button>
                    <button
                      onClick={() => setDocTab("raw")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        docTab === "raw"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Terminal className="size-3.5" />
                      الكود الخام
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {s.skillMd ? (
                  docTab === "preview" ? (
                    <div className="prose prose-slate max-w-none text-right font-sans" dir="ltr">
                      {renderMarkdown(s.skillMd)}
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => copyText(s.skillMd!, "skillmd")}
                        className="absolute right-3 top-3 z-10 flex items-center justify-center p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/60 shadow-sm"
                        title="نسخ المحتوى"
                      >
                        {copiedId === "skillmd" ? <Check className="size-4 text-emerald-400 animate-scale" /> : <Copy className="size-4" />}
                      </button>
                      <div className="rounded-xl bg-zinc-950 p-5 text-zinc-100 border border-zinc-900 shadow-inner overflow-hidden" dir="ltr">
                        <pre
                          className="m-0 max-h-[500px] overflow-auto whitespace-pre-wrap font-mono text-[0.8rem] leading-relaxed scrollbar-thin"
                          style={{ fontFamily: "Consolas, Monaco, 'Courier New', monospace" }}
                        >
                          {s.skillMd}
                        </pre>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4 shadow-inner">
                      <FileText className="size-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 mb-1">لا يوجد دليل مهارة (SKILL.md)</h4>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5">
                      يساعد دليل المهارة في توجيه نموذج الذكاء الاصطناعي وتوضيح كيفية عمل الأدوات المرتبطة بهذه المهارة وسلوكياتها.
                    </p>
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 text-right max-w-md" dir="rtl">
                      <div className="flex gap-2">
                        <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800 mb-0.5">كيفية إضافة الدليل:</p>
                          <p className="text-[0.7rem] text-amber-700 leading-relaxed">
                            قم بإنشاء ملف باسم <code className="px-1 py-0.5 bg-amber-100/60 rounded font-mono text-[0.65rem] text-amber-900 font-semibold">SKILL.md</code> في مجلد المهارة داخل الخادم، وسيتم مزامنته وعرضه هنا تلقائياً.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area: Metadata, Tools, Agents (Takes 1 Column) */}
          <div className="space-y-6">
            
            {/* Metadata Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Info className="size-4.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">بيانات المهارة الأساسية</h3>
              </div>
              
              <div className="space-y-4">
                <InfoRow label="المعرف الفريد (ID)" value={s.id} isCode />
                <InfoRow label="الاسم المعروض" value={s.displayName || s.id} />
                <InfoRow label="الإصدار الحالي" value={`v${s.version || "1.0"}`} />
                <InfoRow label="المجموعة" value={s.group ? (GROUP_LABELS[s.group] || s.group) : "بدون مجموعة"} />
                <InfoRow 
                  label="آلية التنفيذ والرقابة" 
                  value={s.requiresHumanApproval ? "يتطلب موافقة بشرية مسبقة" : "تنفيذ مباشر (بدون رقابة بشرية)"} 
                  badgeVariant={s.requiresHumanApproval ? "destructive" : "success"}
                />
                {s.maxToolCount !== undefined && (
                  <InfoRow label="الحد الأقصى للأدوات بالتجربة" value={`${s.maxToolCount} أدوات`} />
                )}
              </div>
              
              {s.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[0.65rem] text-slate-400 mb-1 font-medium">الوصف التفصيلي</p>
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">{s.description}</p>
                </div>
              )}
            </div>

            {/* Allowed Tools list */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Layers className="size-4.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">الأدوات المصرحة ({s.allowedTools?.length || 0})</h3>
              </div>

              {(s.allowedTools || []).length > 0 ? (
                <div className="space-y-3">
                  {(s.allowedTools || []).map((tn) => {
                    const toolDef = toolMap.get(tn);
                    return (
                      <div key={tn} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200/80">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                            <Zap className="size-4.5 animate-pulse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800">{tn}</span>
                              <div className="flex gap-1">
                                {toolDef?.sideEffects === "write" ? (
                                  <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-100 text-[0.6rem] px-1.5 py-0 font-bold rounded-md">كتابة</Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 text-[0.6rem] px-1.5 py-0 font-bold rounded-md">قراءة فقط</Badge>
                                )}
                                {toolDef?.requiresApproval && (
                                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-100 text-[0.6rem] px-1.5 py-0 font-bold rounded-md">تحتاج موافقة</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-[0.7rem] text-slate-500 leading-normal">{toolDef?.description || "لا يوجد وصف تفصيلي متوفر لهذه الأداة حالياً."}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <AlertTriangle className="size-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">لم يتم تحديد أدوات لهذه المهارة</p>
                </div>
              )}
            </div>

            {/* Active Agents list */}
            {agents.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <UserPlus className="size-4.5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">الوكلاء المشتركين ({agentCount})</h3>
                </div>

                {agentCount > 0 ? (
                  <div className="space-y-2.5">
                    {agents.filter((a) => a.allowedSkills?.includes(s.id)).map((agent) => (
                      <div key={agent.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-lg border border-slate-100 shadow-inner shrink-0">
                          {agent.icon || "🤖"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{agent.name}</p>
                          <p className="truncate text-[0.65rem] text-slate-500">{agent.role}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                          <span className={`size-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                          <span className="text-[0.65rem] font-bold text-slate-600">
                            {agent.status === "active" ? "نشط" : agent.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">لا توجد وكلاء مستخدمين لهذه المهارة حالياً</p>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  isCode = false, 
  badgeVariant 
}: { 
  label: string; 
  value: string; 
  isCode?: boolean; 
  badgeVariant?: "success" | "destructive" 
}) {
  return (
    <div>
      <p className="text-[0.65rem] text-slate-400 mb-1 font-semibold">{label}</p>
      {badgeVariant ? (
        <Badge className={`text-[0.7rem] px-2 py-0.5 ${
          badgeVariant === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50" 
            : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50"
        } border font-bold rounded-md`}>
          {value}
        </Badge>
      ) : isCode ? (
        <span className="font-mono text-xs text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50 select-all inline-block" dir="ltr">{value}</span>
      ) : (
        <p className="text-xs font-bold text-slate-700 leading-relaxed">{value}</p>
      )}
    </div>
  );
}
