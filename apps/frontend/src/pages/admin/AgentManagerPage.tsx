import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Grid from "../../components/ui/CompatGrid";
import LinkifiedText from "../../components/common/LinkifiedText";
import {
  AccountTree as DelegateIcon,
  AdminPanelSettings as ManagerIcon,
  Build as ToolIcon,
  CheckCircle as CompleteIcon,
  Forum as ChatIcon,
  Group as TeamIcon,
  Inbox as InboxIcon,
  PersonAdd as HireIcon,
  PlayArrow as CheckoutIcon,
  Refresh as RefreshIcon,
  ReportProblem as ConflictIcon,
  Send as SendIcon,
  Shield as ShieldIcon,
  Terminal as JsonIcon,
  WarningAmber as FailIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

type AgentStatus = "ACTIVE" | "IDLE" | "THINKING" | "PAUSED" | "INACTIVE";

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model?: string | null;
  templateSlug?: string | null;
  version?: string | null;
  allowedTools?: string[];
  allowedSkills?: string[];
}

interface AgentProfile {
  slug: string;
  name: string;
  role: string;
  version?: string;
  allowedTools: string[];
  allowedSkills: string[];
}

interface ToolDefinition {
  name: string;
  description: string;
  sideEffects: "read" | "write";
  requiresApproval: boolean;
  handler: string;
}

interface SkillDefinition {
  id: string;
  displayName: string;
  version?: string;
  allowedTools: string[];
}

interface InboxSummary {
  total: number;
  active: number;
  pending: number;
  checkedOut: number;
  completed: number;
  failed: number;
}

interface ManagerContext {
  manager: AgentSummary;
  agents: AgentSummary[];
  inbox: InboxSummary;
  profiles: AgentProfile[];
  tools: ToolDefinition[];
  skills: SkillDefinition[];
}

interface AgentTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  assignTo?: string | null;
  agentId?: string | null;
  status: string;
  checkedOutBy?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "manager";
  content: string;
}

interface ApiResult {
  success: boolean;
  [key: string]: any;
}

const ROLE_OPTIONS = ["CEO", "SALES", "SUPPORT", "INVENTORY", "PRICING", "MARKETING", "SHIPPING"];

const TOOL_INPUT_EXAMPLES: Record<string, Record<string, unknown>> = {
  "agent.assign_task": {
    agentId: "",
    title: "راجع هدف اختبار من مدير الوكلاء",
    description: "مهمة تشغيلية قصيرة للتأكد من بروتوكول التفويض.",
    priority: "medium",
    conflictKey: "test:agent-manager:task",
    conflictAction: "review",
    conflictResource: "agent-manager",
    conflictScope: "ui-smoke-test",
  },
  "product.search": { query: "test", limit: 3 },
  "discount.create_draft": { code: "AI-SMOKE-10", discountPercent: 10, reason: "اختبار مسودة آمنة" },
  "product.updatePrice": { productId: "demo-product", originalPrice: 100, newPrice: 105 },
  "inventory.adjust": { productId: "demo-product", quantityDelta: 1, reason: "اختبار مسودة مخزون" },
  "agent.list_agents": {},
  "agent.read_state": { include: ["agents", "inbox", "tools", "skills"] },
};

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const parseJson = (value: string) => {
  if (!value.trim()) return {};
  return JSON.parse(value);
};

const statusColor = (status: string) => {
  if (status === "ACTIVE" || status === "COMPLETED") return "success";
  if (status === "PENDING" || status === "CHECKED_OUT" || status === "THINKING") return "warning";
  if (status === "FAILED" || status === "INACTIVE") return "error";
  return "default";
};

const apiRequest = async <T extends ApiResult>(path: string, init: RequestInit = {}): Promise<T> => {
  const extraHeaders = (init.headers || {}) as Record<string, string>;
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...tokenManager.createAuthHeaders(),
      ...extraHeaders,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

export default function AgentManagerPage() {
  const [tab, setTab] = useState(0);
  const [context, setContext] = useState<ManagerContext | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("جاهزية مدير الوكلاء والمهارات والأدوات الحالية");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [hireRole, setHireRole] = useState("SUPPORT");
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
    setLoading(true);
    setError(null);
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
        const supportTemplate = managerData.context.profiles.find((profile) => profile.role === "SUPPORT");
        const defaultTemplate = supportTemplate || managerData.context.profiles[0];
        setHireTemplate(defaultTemplate.slug);
        setHireRole(defaultTemplate.role);
      }
    } catch (err: any) {
      setError(err.message || "تعذر تحميل مركز مدير الوكلاء.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTemplateChange = (slug: string) => {
    setHireTemplate(slug);
    const profile = profiles.find((item) => item.slug === slug);
    if (profile) {
      setHireRole(profile.role);
      if (!hireName) setHireName(profile.name);
    }
  };

  const handleToolChange = (nextTool: string) => {
    setToolName(nextTool);
    const example = TOOL_INPUT_EXAMPLES[nextTool] || {};
    const populatedExample = nextTool === "agent.assign_task" && toolAgentId
      ? { ...example, agentId: toolAgentId }
      : example;
    setToolInput(prettyJson(populatedExample));
  };

  const withWork = async (callback: () => Promise<void>) => {
    setWorking(true);
    setError(null);
    try {
      await callback();
    } catch (err: any) {
      setError(err.message || "فشل تنفيذ العملية.");
    } finally {
      setWorking(false);
    }
  };

  const sendChat = () => withWork(async () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatInput("");
    const data = await apiRequest<{ success: true; reply: string; context: ManagerContext }>("agent-manager/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setChatMessages((prev) => [...prev, { role: "manager", content: data.reply }]);
    setContext(data.context);
  });

  const hireAgent = () => withWork(async () => {
    const data = await apiRequest<{ success: true; agent: AgentSummary }>("agent-manager/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: hireRole,
        name: hireName.trim() || undefined,
        templateSlug: hireTemplate || undefined,
      }),
    });
    setSuccess(`تم تعيين ${data.agent.name}`);
    await loadAll();
  });

  const delegate = () => withWork(async () => {
    const data = await apiRequest<{ success: true; tasks: AgentTask[]; taskCount: number }>("agent-manager/delegate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: delegateGoal.trim(),
        autoHire: delegateAutoHire,
        traceId: `ui_delegate_${Date.now()}`,
      }),
    });
    setDelegateResult(data as unknown as Record<string, unknown>);
    setSuccess(`تم تفويض الهدف إلى ${data.taskCount} مهمة`);
    await loadAll();
  });

  const runTool = () => withWork(async () => {
    const parsedInput = parseJson(toolInput);
    const data = await apiRequest<ApiResult>("agent-manager/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: toolAgentId,
        toolName,
        input: parsedInput,
        reasoning: "UI tool lab smoke test",
        traceId: `ui_tool_${Date.now()}`,
      }),
    });
    setToolResult(data);
    setSuccess(data.status === "PENDING_APPROVAL" ? "تم إنشاء مسودة موافقة آمنة" : "تم تشغيل الأداة");
    await loadAll();
  });

  const taskAction = (task: AgentTask, action: "checkout" | "complete" | "fail") => withWork(async () => {
    const agentId = task.agentId || manager?.id || toolAgentId;
    const body =
      action === "complete"
        ? { agentId, result: { summary: "تم إغلاق مهمة اختبار من مركز المدير" } }
        : action === "fail"
          ? { agentId, error: "تم اختبار مسار الفشل من الواجهة" }
          : { agentId };
    await apiRequest<ApiResult>(`agent-manager/tasks/${task.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSuccess(action === "checkout" ? "تم حجز المهمة" : action === "complete" ? "تم إنهاء المهمة" : "تم تعليم المهمة كفاشلة");
    await loadAll();
  });

  const showBusy = loading && !context;

  return (
    <Box sx={{ direction: "rtl", p: { xs: 2, md: 3 }, bgcolor: "#f7f8fb", minHeight: "100%" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <ManagerIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              مركز مدير الوكلاء
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShieldIcon />} label="SOUL / AGENTS / TOOLS" color="primary" variant="outlined" />
            <Chip icon={<ConflictIcon />} label="قفل تعارضات الكتابة" color="warning" variant="outlined" />
            <Chip label={manager?.templateSlug || "manager-ceo"} variant="outlined" />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="تحديث بيانات المركز">
            <IconButton color="primary" onClick={loadAll} disabled={loading || working}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Chip label={working ? "جارٍ التنفيذ" : "جاهز"} color={working ? "warning" : "success"} />
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showBusy ? (
        <Paper sx={{ p: 6, borderRadius: 2, textAlign: "center" }}>
          <CircularProgress />
        </Paper>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <Metric icon={<ManagerIcon />} label="المدير" value={manager?.name || "CEO Agent"} note={manager?.status || "ACTIVE"} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric icon={<TeamIcon />} label="الوكلاء" value={String(agents.length)} note={`${profiles.length} قالب`} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric icon={<InboxIcon />} label="المهام النشطة" value={String(context?.inbox?.active || 0)} note={`${context?.inbox?.pending || 0} معلقة`} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Metric icon={<ToolIcon />} label="الأدوات" value={String(tools.length)} note={`${writeTools.length} كتابة`} />
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
            >
              <Tab icon={<ManagerIcon />} iconPosition="start" label="نظرة عامة" />
              <Tab icon={<ChatIcon />} iconPosition="start" label="محادثة المدير" />
              <Tab icon={<HireIcon />} iconPosition="start" label="تعيين وكيل" />
              <Tab icon={<DelegateIcon />} iconPosition="start" label="تفويض هدف" />
              <Tab icon={<InboxIcon />} iconPosition="start" label="Inbox" />
              <Tab icon={<JsonIcon />} iconPosition="start" label="Tool Lab" />
            </Tabs>

            <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fbfcff" }}>
              {tab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} lg={7}>
                    <Panel title="فريق الوكلاء" icon={<TeamIcon />}>
                      <Stack spacing={1.25}>
                        {agents.map((agent) => (
                          <Paper key={agent.id} elevation={0} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography fontWeight={700}>{agent.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                                  {agent.id}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={agent.role} color="primary" variant="outlined" />
                                <Chip size="small" label={agent.status} color={statusColor(agent.status) as any} />
                                <Chip size="small" label={agent.templateSlug || "custom"} variant="outlined" />
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                              {(agent.allowedSkills || []).slice(0, 5).map((skill) => (
                                <Chip key={skill} size="small" label={skill} variant="outlined" />
                              ))}
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Panel>
                  </Grid>
                  <Grid item xs={12} lg={5}>
                    <Panel title="الملفات والمهارات" icon={<ShieldIcon />}>
                      <Stack spacing={1.5}>
                        {profiles.map((profile) => (
                          <Box key={profile.slug}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Typography fontWeight={700}>{profile.name}</Typography>
                              <Chip size="small" label={profile.role} variant="outlined" />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {profile.slug} · {(profile.allowedTools || []).length} tools · {(profile.allowedSkills || []).length} skills
                            </Typography>
                          </Box>
                        ))}
                        <Divider />
                        <Typography variant="subtitle2" fontWeight={800}>
                          المهارات الجاهزة
                        </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {skills.map((skill) => (
                            <Chip key={skill.id} size="small" label={skill.displayName || skill.id} />
                          ))}
                        </Stack>
                      </Stack>
                    </Panel>
                  </Grid>
                </Grid>
              )}

              {tab === 1 && (
                <Panel title="محادثة المدير" icon={<ChatIcon />}>
                  <Stack spacing={1.5}>
                    <Box sx={{ minHeight: 260, maxHeight: 420, overflow: "auto", pr: 0.5 }}>
                      {chatMessages.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", textAlign: "center" }}>
                          <Typography color="text.secondary">اسأل المدير عن الفريق، الأدوات، المهارات أو الـ inbox.</Typography>
                        </Paper>
                      ) : (
                        <Stack spacing={1}>
                          {chatMessages.map((message, index) => (
                            <Box key={`${message.role}-${index}`} sx={{ display: "flex", justifyContent: message.role === "user" ? "flex-start" : "flex-end" }}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  maxWidth: "78%",
                                  borderRadius: 1.5,
                                  bgcolor: message.role === "user" ? "primary.main" : "background.paper",
                                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                                  border: message.role === "manager" ? "1px solid" : "none",
                                  borderColor: "divider",
                                }}
                              >
                                <Typography variant="body2" component="div"><LinkifiedText text={message.content} /></Typography>
                              </Paper>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField
                        fullWidth
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            sendChat();
                          }
                        }}
                        placeholder="اكتب للمدير..."
                        size="small"
                        multiline
                        maxRows={3}
                      />
                      <Button variant="contained" startIcon={<SendIcon />} onClick={sendChat} disabled={working || !chatInput.trim()}>
                        إرسال
                      </Button>
                    </Stack>
                  </Stack>
                </Panel>
              )}

              {tab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <Panel title="تعيين وكيل جديد" icon={<HireIcon />}>
                      <Stack spacing={2}>
                        <TextField select label="القالب" value={hireTemplate} onChange={(event) => handleTemplateChange(event.target.value)} fullWidth size="small">
                          {profiles.map((profile) => (
                            <MenuItem key={profile.slug} value={profile.slug}>
                              {profile.name} ({profile.slug})
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField select label="الدور" value={hireRole} onChange={(event) => setHireRole(event.target.value)} fullWidth size="small">
                          {ROLE_OPTIONS.map((role) => (
                            <MenuItem key={role} value={role}>
                              {role}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField label="اسم اختياري" value={hireName} onChange={(event) => setHireName(event.target.value)} fullWidth size="small" />
                        <Button variant="contained" startIcon={<HireIcon />} onClick={hireAgent} disabled={working || !hireRole}>
                          تعيين الوكيل
                        </Button>
                      </Stack>
                    </Panel>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Panel title="القالب المختار" icon={<ShieldIcon />}>
                      {profiles
                        .filter((profile) => profile.slug === hireTemplate)
                        .map((profile) => (
                          <Stack key={profile.slug} spacing={1.5}>
                            <Typography variant="h6" fontWeight={800}>{profile.name}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip label={profile.role} color="primary" />
                              <Chip label={`v${profile.version || "1"}`} variant="outlined" />
                              <Chip label={`${profile.allowedTools.length} tools`} variant="outlined" />
                              <Chip label={`${profile.allowedSkills.length} skills`} variant="outlined" />
                            </Stack>
                            <Divider />
                            <Typography variant="subtitle2" fontWeight={800}>الأدوات</Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {profile.allowedTools.map((tool) => <Chip key={tool} size="small" label={tool} />)}
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={800}>المهارات</Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {profile.allowedSkills.map((skill) => <Chip key={skill} size="small" label={skill} variant="outlined" />)}
                            </Stack>
                          </Stack>
                        ))}
                    </Panel>
                  </Grid>
                </Grid>
              )}

              {tab === 3 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <Panel title="تفويض هدف" icon={<DelegateIcon />}>
                      <Stack spacing={2}>
                        <TextField
                          label="الهدف"
                          value={delegateGoal}
                          onChange={(event) => setDelegateGoal(event.target.value)}
                          fullWidth
                          multiline
                          minRows={5}
                        />
                        <FormControlLabel
                          control={<Switch checked={delegateAutoHire} onChange={(event) => setDelegateAutoHire(event.target.checked)} />}
                          label="تعيين الوكلاء الناقصين تلقائياً"
                        />
                        <Button variant="contained" startIcon={<DelegateIcon />} onClick={delegate} disabled={working || !delegateGoal.trim()}>
                          تفويض
                        </Button>
                      </Stack>
                    </Panel>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Panel title="نتيجة التفويض" icon={<InboxIcon />}>
                      <CodeBlock value={delegateResult || { inbox: context?.inbox, latestTasks: tasks.slice(-5) }} />
                    </Panel>
                  </Grid>
                </Grid>
              )}

              {tab === 4 && (
                <Panel title="Agent Inbox" icon={<InboxIcon />}>
                  <TaskTable tasks={tasks} onAction={taskAction} working={working} />
                </Panel>
              )}

              {tab === 5 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <Panel title="تشغيل أداة" icon={<ToolIcon />}>
                      <Stack spacing={2}>
                        <TextField select label="الوكيل" value={toolAgentId} onChange={(event) => setToolAgentId(event.target.value)} fullWidth size="small">
                          {agents.map((agent) => (
                            <MenuItem key={agent.id} value={agent.id}>
                              {agent.name} · {agent.role}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField select label="الأداة" value={toolName} onChange={(event) => handleToolChange(event.target.value)} fullWidth size="small">
                          {tools.map((tool) => (
                            <MenuItem key={tool.name} value={tool.name}>
                              {tool.name} · {tool.sideEffects}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="JSON Input"
                          value={toolInput}
                          onChange={(event) => setToolInput(event.target.value)}
                          fullWidth
                          multiline
                          minRows={9}
                          InputProps={{ sx: { fontFamily: "monospace", direction: "ltr" } }}
                        />
                        <Button variant="contained" startIcon={<CheckoutIcon />} onClick={runTool} disabled={working || !toolAgentId || !toolName}>
                          تشغيل الأداة
                        </Button>
                      </Stack>
                    </Panel>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Panel title="الأمان والنتيجة" icon={<ShieldIcon />}>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`${readTools.length} أدوات قراءة`} color="success" variant="outlined" />
                          <Chip label={`${writeTools.length} أدوات كتابة بموافقة`} color="warning" variant="outlined" />
                          <Chip label="رفض تلقائي عند عدم السماح" color="error" variant="outlined" />
                        </Stack>
                        <CodeBlock value={toolResult || { selectedTool: toolName, result: "لم يتم التشغيل بعد" }} />
                      </Stack>
                    </Panel>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
        </>
      )}

      <Snackbar open={!!success} autoHideDuration={3500} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={800}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{note}</Typography>
        </Box>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
      </Stack>
    </Paper>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%", bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function CodeBlock({ value }: { value: unknown }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1.5,
        bgcolor: "#101828",
        color: "#e6edf7",
        overflow: "auto",
        maxHeight: 520,
        direction: "ltr",
      }}
    >
      <Typography component="pre" sx={{ m: 0, fontFamily: "Consolas, monospace", fontSize: 13, whiteSpace: "pre-wrap" }}>
        {prettyJson(value)}
      </Typography>
    </Paper>
  );
}

function TaskTable({
  tasks,
  onAction,
  working,
}: {
  tasks: AgentTask[];
  working: boolean;
  onAction: (task: AgentTask, action: "checkout" | "complete" | "fail") => void;
}) {
  if (tasks.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: "1px dashed", borderColor: "divider", textAlign: "center" }}>
        <Typography color="text.secondary">لا توجد مهام في inbox حالياً.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "#f3f5f9" }}>
            <TableCell>المهمة</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>الوكيل</TableCell>
            <TableCell>الأولوية</TableCell>
            <TableCell>قفل التعارض</TableCell>
            <TableCell align="center">إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover>
              <TableCell sx={{ maxWidth: 360 }}>
                <Typography fontWeight={700}>{task.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {task.description}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip size="small" label={task.status} color={statusColor(task.status) as any} />
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                {task.agentId || task.assignTo || "unassigned"}
              </TableCell>
              <TableCell>{task.priority}</TableCell>
              <TableCell>
                {task.metadata?.conflictKey ? (
                  <Tooltip title={String(task.metadata.conflictKey)}>
                    <Chip size="small" icon={<ConflictIcon />} label={String(task.metadata.conflictScope || "locked")} color="warning" variant="outlined" />
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Tooltip title="حجز">
                    <span>
                      <IconButton size="small" color="primary" disabled={working || task.status !== "PENDING"} onClick={() => onAction(task, "checkout")}>
                        <CheckoutIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="إنهاء">
                    <span>
                      <IconButton size="small" color="success" disabled={working || task.status === "COMPLETED"} onClick={() => onAction(task, "complete")}>
                        <CompleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="فشل">
                    <span>
                      <IconButton size="small" color="error" disabled={working || task.status === "FAILED"} onClick={() => onAction(task, "fail")}>
                        <FailIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
