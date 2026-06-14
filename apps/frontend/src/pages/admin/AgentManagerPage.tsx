import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Flag,
  Inbox,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Shield,
  Terminal,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import LinkifiedText from "../../components/common/LinkifiedText";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

type AgentStatus = "ACTIVE" | "IDLE" | "THINKING" | "PAUSED" | "INACTIVE";

interface AgentSummary { id: string; name: string; role: string; status: AgentStatus; model?: string | null; templateSlug?: string | null; version?: string | null; allowedTools?: string[]; allowedSkills?: string[]; }
interface AgentProfile { slug: string; name: string; role: string; version?: string; allowedTools: string[]; allowedSkills: string[]; }
interface ToolDefinition { name: string; description: string; sideEffects: "read" | "write"; requiresApproval: boolean; handler: string; }
interface SkillDefinition { id: string; displayName: string; version?: string; allowedTools: string[]; }
interface InboxSummary { total: number; active: number; pending: number; checkedOut: number; completed: number; failed: number; }
interface ManagerContext { manager: AgentSummary; agents: AgentSummary[]; inbox: InboxSummary; profiles: AgentProfile[]; tools: ToolDefinition[]; skills: SkillDefinition[]; }
interface AgentTask { id: string; title: string; description: string; priority: string; assignTo?: string | null; agentId?: string | null; status: string; checkedOutBy?: string | null; createdAt: string; updatedAt: string; metadata?: Record<string, unknown>; }
interface ChatMessage { role: "user" | "manager"; content: string; }
interface ApiResult { success: boolean; [key: string]: any; }



const TOOL_INPUT_EXAMPLES: Record<string, Record<string, unknown>> = {
  "agent.assign_task": { agentId: "", title: "راجع هدف اختبار من مدير الوكلاء", description: "مهمة تشغيلية قصيرة للتأكد من بروتوكول التفويض.", priority: "medium", conflictKey: "test:agent-manager:task", conflictAction: "review", conflictResource: "agent-manager", conflictScope: "ui-smoke-test" },
  "product.search": { query: "test", limit: 3 },
  "discount.create_draft": { code: "AI-SMOKE-10", discountPercent: 10, reason: "اختبار مسودة آمنة" },
  "product.updatePrice": { productId: "demo-product", originalPrice: 100, newPrice: 105 },
  "inventory.adjust": { productId: "demo-product", quantityDelta: 1, reason: "اختبار مسودة مخزون" },
  "agent.list_agents": {},
  "agent.read_state": { include: ["agents", "inbox", "tools", "skills"] },
};

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);
const parseJson = (value: string) => { if (!value.trim()) return {}; return JSON.parse(value); };

const statusBadgeVariant = (status: string) => {
  if (status === "ACTIVE" || status === "COMPLETED") return "outline";
  if (status === "PENDING" || status === "CHECKED_OUT" || status === "THINKING") return "outline";
  if (status === "FAILED" || status === "INACTIVE") return "destructive";
  return "outline";
};

const apiRequest = async <T extends ApiResult>(path: string, init: RequestInit = {}): Promise<T> => {
  const extraHeaders = (init.headers || {}) as Record<string, string>;
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: { ...tokenManager.createAuthHeaders(), ...extraHeaders },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-2xl font-black">{value}</span>
          <span className="text-xs text-muted-foreground">{note}</span>
        </div>
        <div className="text-primary">{icon}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <h3 className="text-base font-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ value }: { value: unknown }) {
  return (
    <div className="max-h-[520px] overflow-auto rounded-xl bg-[#101828] p-4 text-[#e6edf7]" dir="ltr">
      <pre className="m-0 font-mono text-xs whitespace-pre-wrap" style={{ fontFamily: "Consolas, monospace" }}>{prettyJson(value)}</pre>
    </div>
  );
}

function TaskTable({ tasks, onAction, working }: { tasks: AgentTask[]; working: boolean; onAction: (task: AgentTask, action: "checkout" | "complete" | "fail") => void }) {
  if (tasks.length === 0) {
    return <div className="rounded-xl border-2 border-dashed p-8 text-center text-muted-foreground">لا توجد مهام في inbox حالياً.</div>;
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-bold">المهمة</TableHead><TableHead className="font-bold">الحالة</TableHead><TableHead className="font-bold">الوكيل</TableHead>
            <TableHead className="font-bold">الأولوية</TableHead><TableHead className="font-bold">قفل التعارض</TableHead><TableHead className="text-center font-bold">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="hover:bg-muted/30">
              <TableCell className="max-w-[360px]">
                <p className="text-sm font-bold">{task.title}</p>
                <span className="text-xs text-muted-foreground">{task.description}</span>
              </TableCell>
              <TableCell><Badge variant={statusBadgeVariant(task.status)} className="text-[10px]">{task.status}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{task.agentId || task.assignTo || "unassigned"}</TableCell>
              <TableCell className="text-sm">{task.priority}</TableCell>
              <TableCell>
                {task.metadata?.conflictKey ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1"><Flag className="size-3" />{String(task.metadata.conflictScope || "locked")}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>{String(task.metadata.conflictKey)}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-0.5">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><span><Button variant="ghost" size="icon-xs" disabled={working || task.status !== "PENDING"} onClick={() => onAction(task, "checkout")}><Play className="size-4 text-primary" /></Button></span></TooltipTrigger><TooltipContent>حجز</TooltipContent></Tooltip></TooltipProvider>
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><span><Button variant="ghost" size="icon-xs" disabled={working || task.status === "COMPLETED"} onClick={() => onAction(task, "complete")}><CheckCircle2 className="size-4 text-green-600" /></Button></span></TooltipTrigger><TooltipContent>إنهاء</TooltipContent></Tooltip></TooltipProvider>
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><span><Button variant="ghost" size="icon-xs" disabled={working || task.status === "FAILED"} onClick={() => onAction(task, "fail")}><XCircle className="size-4 text-destructive" /></Button></span></TooltipTrigger><TooltipContent>فشل</TooltipContent></Tooltip></TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AgentManagerPage() {
  const [tab, setTab] = useState("overview");
  const [context, setContext] = useState<ManagerContext | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("جاهزية مدير الوكلاء والمهارات والأدوات الحالية");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hireTemplate, setHireTemplate] = useState("");
  const [hireName, setHireName] = useState("");
  const [delegateGoal, setDelegateGoal] = useState("اختبار تفويض هدف قصير: راجع المنتجات التجريبية وارجع بتقرير جاهزية.");
  const [delegateAutoHire, setDelegateAutoHire] = useState(true);
  const [delegateResult, setDelegateResult] = useState<Record<string, unknown> | null>(null);
  const [toolAgentId, setToolAgentId] = useState("");
  const [toolName, setToolName] = useState("agent.read_state");
  const [toolInput, setToolInput] = useState(prettyJson(TOOL_INPUT_EXAMPLES["agent.read_state"]));
  const [toolResult, setToolResult] = useState<Record<string, unknown> | null>(null);

  const agents = context?.agents || [];
  const profiles = context?.profiles || [];
  const tools = context?.tools || [];
  const skills = context?.skills || [];
  const manager = context?.manager || null;
  const writeTools = useMemo(() => tools.filter((tool) => tool.sideEffects === "write"), [tools]);
  const readTools = useMemo(() => tools.filter((tool) => tool.sideEffects === "read"), [tools]);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [managerData, inboxData] = await Promise.all([
        apiRequest<{ success: true; context: ManagerContext }>("agent-manager/me"),
        apiRequest<{ success: true; tasks: AgentTask[] }>("agent-manager/inbox"),
      ]);
      setContext(managerData.context);
      setTasks(Array.isArray(inboxData.tasks) ? inboxData.tasks : []);
      const managerAgentId = managerData.context.manager?.id || "";
      if (!toolAgentId) setToolAgentId(managerAgentId);
      if (!hireTemplate && (managerData.context.profiles || []).length) {
        const supportTemplate = managerData.context.profiles.find((p) => p.role === "SUPPORT");
        const dt = supportTemplate || managerData.context.profiles[0];
        setHireTemplate(dt.slug);
      }
    } catch (err: any) { setError(err.message || "تعذر تحميل مركز مدير الوكلاء."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleTemplateChange = (slug: string) => {
    setHireTemplate(slug);
    const profile = profiles.find((p) => p.slug === slug);
    if (profile) { if (!hireName) setHireName(profile.name); }
  };

  const handleToolChange = (nextTool: string) => {
    setToolName(nextTool);
    const example = TOOL_INPUT_EXAMPLES[nextTool] || {};
    const pe = nextTool === "agent.assign_task" && toolAgentId ? { ...example, agentId: toolAgentId } : example;
    setToolInput(prettyJson(pe));
  };

  const withWork = async (callback: () => Promise<void>) => {
    setWorking(true); setError(null);
    try { await callback(); } catch (err: any) { setError(err.message || "فشل تنفيذ العملية."); }
    finally { setWorking(false); }
  };

  const sendChat = () => withWork(async () => {
    const message = chatInput.trim(); if (!message) return;
    setChatMessages((p) => [...p, { role: "user", content: message }]); setChatInput("");
    const data = await apiRequest<{ success: true; reply: string; context: ManagerContext }>("agent-manager/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    setChatMessages((p) => [...p, { role: "manager", content: data.reply }]); setContext(data.context);
  });

  const hireAgent = () => withWork(async () => {
    const profile = profiles.find((p) => p.slug === hireTemplate);
    const role = profile?.role || "CUSTOM";
    const data = await apiRequest<{ success: true; agent: AgentSummary }>("agent-manager/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, name: hireName.trim() || undefined, templateSlug: hireTemplate || undefined }) });
    toast.success(`تم تعيين ${data.agent.name}`); await loadAll();
  });

  const delegate = () => withWork(async () => {
    const data = await apiRequest<{ success: true; tasks: AgentTask[]; taskCount: number }>("agent-manager/delegate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: delegateGoal.trim(), autoHire: delegateAutoHire, traceId: `ui_delegate_${Date.now()}` }) });
    setDelegateResult(data as unknown as Record<string, unknown>);
    toast.success(`تم تفويض الهدف إلى ${data.taskCount} مهمة`); await loadAll();
  });

  const runTool = () => withWork(async () => {
    const parsedInput = parseJson(toolInput);
    const data = await apiRequest<ApiResult>("agent-manager/tools/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: toolAgentId, toolName, input: parsedInput, reasoning: "UI tool lab smoke test", traceId: `ui_tool_${Date.now()}` }) });
    setToolResult(data);
    toast.success(data.status === "PENDING_APPROVAL" ? "تم إنشاء مسودة موافقة آمنة" : "تم تشغيل الأداة"); await loadAll();
  });

  const taskAction = (task: AgentTask, action: "checkout" | "complete" | "fail") => withWork(async () => {
    const agentId = task.agentId || manager?.id || toolAgentId;
    const body = action === "complete" ? { agentId, result: { summary: "تم إغلاق مهمة اختبار من مركز المدير" } } : action === "fail" ? { agentId, error: "تم اختبار مسار الفشل من الواجهة" } : { agentId };
    await apiRequest<ApiResult>(`agent-manager/tasks/${task.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    toast.success(action === "checkout" ? "تم حجز المهمة" : action === "complete" ? "تم إنهاء المهمة" : "تم تعليم المهمة كفاشلة"); await loadAll();
  });

  const showBusy = loading && !context;

  return (
    <div dir="rtl" className="min-h-full bg-[#f7f8fb] p-4 md:p-6 dark:bg-background">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <h1 className="text-xl font-black">مركز مدير الوكلاء</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><Terminal className="size-3" />SOUL / AGENTS / TOOLS</Badge>
            <Badge variant="outline" className="gap-1"><Flag className="size-3" />قفل تعارضات الكتابة</Badge>
            <Badge variant="outline">{manager?.templateSlug || "manager-ceo"}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={loadAll} disabled={loading || working}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-4" />}</Button></TooltipTrigger><TooltipContent>تحديث بيانات المركز</TooltipContent></Tooltip></TooltipProvider>
          <Badge variant={working ? "outline" : "default"}>{working ? "جارٍ التنفيذ" : "جاهز"}</Badge>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {showBusy ? (
        <div className="flex items-center justify-center rounded-xl bg-card p-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Metric icon={<Shield className="size-6" />} label="المدير" value={manager?.name || "CEO Agent"} note={manager?.status || "ACTIVE"} />
            <Metric icon={<Users className="size-6" />} label="الوكلاء" value={String(agents.length)} note={`${profiles.length} قالب`} />
            <Metric icon={<Inbox className="size-6" />} label="المهام النشطة" value={String(context?.inbox?.active || 0)} note={`${context?.inbox?.pending || 0} معلقة`} />
            <Metric icon={<Wrench className="size-6" />} label="الأدوات" value={String(tools.length)} note={`${writeTools.length} كتابة`} />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="rounded-xl border bg-card">
            <TabsList className="w-full overflow-x-auto rounded-none border-b bg-muted/20 p-0" variant="line">
              <TabsTrigger value="overview" className="gap-1.5 px-4 py-2.5"><Shield className="size-4" />نظرة عامة</TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 px-4 py-2.5"><MessageSquare className="size-4" />محادثة المدير</TabsTrigger>
              <TabsTrigger value="hire" className="gap-1.5 px-4 py-2.5"><UserPlus className="size-4" />تعيين وكيل</TabsTrigger>
              <TabsTrigger value="delegate" className="gap-1.5 px-4 py-2.5"><UserCheck className="size-4" />تفويض هدف</TabsTrigger>
              <TabsTrigger value="inbox" className="gap-1.5 px-4 py-2.5"><Inbox className="size-4" />Inbox</TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 px-4 py-2.5"><Terminal className="size-4" />Tool Lab</TabsTrigger>
            </TabsList>

            <div className="bg-[#fbfcff] p-4 md:p-5 dark:bg-card">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <Panel title="فريق الوكلاء" icon={<Users className="size-5" />}>
                      <div className="flex flex-col gap-3">
                        {agents.map((agent) => (
                          <div key={agent.id} className="rounded-xl border bg-card p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0"><p className="text-sm font-bold">{agent.name}</p><span className="font-mono text-xs text-muted-foreground">{agent.id}</span></div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{agent.role}</Badge>
                                <Badge variant={statusBadgeVariant(agent.status)}>{agent.status}</Badge>
                                <Badge variant="outline">{agent.templateSlug || "custom"}</Badge>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(agent.allowedSkills || []).slice(0, 5).map((skill) => (<Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>
                  <div className="lg:col-span-5">
                    <Panel title="الملفات والمهارات" icon={<Terminal className="size-5" />}>
                      <div className="flex flex-col gap-4">
                        {profiles.map((profile) => (
                          <div key={profile.slug}>
                            <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{profile.name}</p><Badge variant="outline">{profile.role}</Badge></div>
                            <span className="text-xs text-muted-foreground">{profile.slug} · {(profile.allowedTools || []).length} tools · {(profile.allowedSkills || []).length} skills</span>
                          </div>
                        ))}
                        <Separator /><p className="text-sm font-black">المهارات الجاهزة</p>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (<Badge key={skill.id} variant="secondary" className="text-[10px]">{skill.displayName || skill.id}</Badge>))}
                        </div>
                      </div>
                    </Panel>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-0">
                <Panel title="محادثة المدير" icon={<MessageSquare className="size-5" />}>
                  <div className="flex flex-col gap-4">
                    <div className="max-h-[420px] min-h-[260px] overflow-auto">
                      {chatMessages.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed p-6 text-center text-muted-foreground">اسأل المدير عن الفريق، الأدوات، المهارات أو الـ inbox.</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {chatMessages.map((message, i) => (
                            <div key={i} className={cn("flex", message.role === "user" ? "justify-start" : "justify-end")}>
                              <div className={cn("max-w-[78%] rounded-xl p-3 text-sm", message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground")}>
                                <LinkifiedText text={message.content} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="اكتب للمدير..." className="flex-1" />
                      <Button onClick={sendChat} disabled={working || !chatInput.trim()}><Send className="size-4" />إرسال</Button>
                    </div>
                  </div>
                </Panel>
              </TabsContent>

              <TabsContent value="hire" className="mt-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Panel title="تعيين وكيل جديد" icon={<UserPlus className="size-5" />}>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5"><Label>القالب</Label><Select value={hireTemplate} onValueChange={handleTemplateChange}><SelectTrigger><SelectValue placeholder="اختر قالباً" /></SelectTrigger><SelectContent>{profiles.map((p) => (<SelectItem key={p.slug} value={p.slug}>{p.name} ({p.slug})</SelectItem>))}</SelectContent></Select></div>
                        <div className="flex flex-col gap-1.5"><Label>اسم اختياري</Label><Input value={hireName} onChange={(e) => setHireName(e.target.value)} /></div>
                        <Button onClick={hireAgent} disabled={working || !hireTemplate}><UserPlus className="size-4" />تعيين الوكيل</Button>
                      </div>
                    </Panel>
                  </div>
                  <div className="md:col-span-7">
                    <Panel title="القالب المختار" icon={<Terminal className="size-5" />}>
                      {profiles.filter((p) => p.slug === hireTemplate).map((profile) => (
                        <div key={profile.slug} className="flex flex-col gap-3">
                          <h3 className="text-base font-black">{profile.name}</h3>
                          <div className="flex flex-wrap gap-2"><Badge>{profile.role}</Badge><Badge variant="outline">v{profile.version || "1"}</Badge><Badge variant="outline">{profile.allowedTools.length} tools</Badge><Badge variant="outline">{profile.allowedSkills.length} skills</Badge></div>
                          <Separator />
                          <p className="text-sm font-black">الأدوات</p>
                          <div className="flex flex-wrap gap-2">{profile.allowedTools.map((t) => (<Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>))}</div>
                          <p className="text-sm font-black">المهارات</p>
                          <div className="flex flex-wrap gap-2">{profile.allowedSkills.map((s) => (<Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>))}</div>
                        </div>
                      ))}
                    </Panel>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="delegate" className="mt-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Panel title="تفويض هدف" icon={<UserCheck className="size-5" />}>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5"><Label>الهدف</Label><Textarea value={delegateGoal} onChange={(e) => setDelegateGoal(e.target.value)} rows={6} /></div>
                        <div className="flex items-center gap-3"><Switch checked={delegateAutoHire} onCheckedChange={(v) => setDelegateAutoHire(v)} id="auto-hire" /><Label htmlFor="auto-hire">تعيين الوكلاء الناقصين تلقائياً</Label></div>
                        <Button onClick={delegate} disabled={working || !delegateGoal.trim()}><UserCheck className="size-4" />تفويض</Button>
                      </div>
                    </Panel>
                  </div>
                  <div className="md:col-span-7"><Panel title="نتيجة التفويض" icon={<Inbox className="size-5" />}><CodeBlock value={delegateResult || { inbox: context?.inbox, latestTasks: tasks.slice(-5) }} /></Panel></div>
                </div>
              </TabsContent>

              <TabsContent value="inbox" className="mt-0">
                <Panel title="Agent Inbox" icon={<Inbox className="size-5" />}><TaskTable tasks={tasks} onAction={taskAction} working={working} /></Panel>
              </TabsContent>

              <TabsContent value="tools" className="mt-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Panel title="تشغيل أداة" icon={<Wrench className="size-5" />}>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5"><Label>الوكيل</Label><Select value={toolAgentId} onValueChange={setToolAgentId}><SelectTrigger><SelectValue placeholder="اختر وكيلاً" /></SelectTrigger><SelectContent>{agents.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name} · {a.role}</SelectItem>))}</SelectContent></Select></div>
                        <div className="flex flex-col gap-1.5"><Label>الأداة</Label><Select value={toolName} onValueChange={handleToolChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{tools.map((t) => (<SelectItem key={t.name} value={t.name}>{t.name} · {t.sideEffects}</SelectItem>))}</SelectContent></Select></div>
                        <div className="flex flex-col gap-1.5"><Label>JSON Input</Label><textarea value={toolInput} onChange={(e) => setToolInput(e.target.value)} rows={9} className="w-full rounded-xl border bg-transparent p-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" dir="ltr" /></div>
                        <Button onClick={runTool} disabled={working || !toolAgentId || !toolName}><Play className="size-4" />تشغيل الأداة</Button>
                      </div>
                    </Panel>
                  </div>
                  <div className="md:col-span-7">
                    <Panel title="الأمان والنتيجة" icon={<Shield className="size-5" />}>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2"><Badge variant="outline">{readTools.length} أدوات قراءة</Badge><Badge variant="outline">{writeTools.length} أدوات كتابة بموافقة</Badge><Badge variant="destructive" className="gap-1"><AlertCircle className="size-3" />رفض تلقائي عند عدم السماح</Badge></div>
                        <CodeBlock value={toolResult || { selectedTool: toolName, result: "لم يتم التشغيل بعد" }} />
                      </div>
                    </Panel>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </div>
  );
}
