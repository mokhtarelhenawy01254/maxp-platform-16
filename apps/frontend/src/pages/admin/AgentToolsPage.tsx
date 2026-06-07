/**
 * AgentToolsPage
 *
 * Tool-centric view: shows ALL tools in the system and which agents use each one.
 * Includes "Assign to Agent" dialog for quick tool assignment.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "../../components/ui/CompatGrid";
import {
  Bolt as ToolIcon,
  ExpandMore as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  PersonAdd as AssignIcon,
  Lock as WriteIcon,
  LockOpen as ReadIcon,
  Shield as GuardIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { useNavigate } from "react-router-dom";
import i18n from "../../i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  sideEffects: "read" | "write";
  requiresApproval: boolean;
  approvalMode?: string;
  source?: "python_builtin" | "mcp" | "legacy_bridge" | string;
  runtimeSource?: string;
  aliases?: string[];
  companyScoped?: boolean;
}

interface AgentToolInfo {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: string;
  autonomy?: string;
}

interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: string;
  allowedTools: string[];
  toolAutonomy?: Record<string, string>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const apiRequest = async <T,>(path: string): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    headers: tokenManager.createAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

const apiPut = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    method: "PUT",
    headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

// ─── Assign Dialog ────────────────────────────────────────────────────────────

interface AssignDialogProps {
  open: boolean;
  toolName: string;
  agents: AgentDefinition[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignToolDialog({ open, toolName, agents, onClose, onSaved }: AssignDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selection: agents that already have this tool
  useEffect(() => {
    if (open) {
      const initial = new Set(
        agents.filter((a) => a.allowedTools?.includes(toolName)).map((a) => a.id)
      );
      setSelected(initial);
      setSearch("");
      setError(null);
    }
  }, [open, toolName, agents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) =>
      [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [agents, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Update each agent: add or remove the tool
      const promises = agents.map(async (agent) => {
        const hasTool = agent.allowedTools?.includes(toolName);
        const shouldBeAdded = selected.has(agent.id);

        if (hasTool === shouldBeAdded) return; // no change needed

        const nextTools = shouldBeAdded
          ? [...(agent.allowedTools || []), toolName]
          : (agent.allowedTools || []).filter((t) => t !== toolName);

        return apiPut(`/agent/agents/${agent.id}/files`, {
          name: agent.name,
          role: agent.role,
          allowedTools: nextTools,
          allowedSkills: [],
          toolAutonomy: {
            ...(agent.toolAutonomy || {}),
            ...(shouldBeAdded ? { [toolName]: "auto" } : {}),
          },
        });
      });

      await Promise.all(promises);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AssignIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={900}>تعيين الأداة لوكيل</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "Consolas, monospace" }}>
              {toolName}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {saving && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          size="small"
          fullWidth
          placeholder="بحث في الوكلاء..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {selected.size} / {filtered.length} محدد
          </Typography>
          <Button size="small" onClick={toggleAll} sx={{ fontSize: "0.75rem", textTransform: "none" }}>
            {selected.size === filtered.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </Stack>

        <Stack spacing={0.5} sx={{ maxHeight: 360, overflow: "auto" }}>
          {filtered.map((agent) => {
            const checked = selected.has(agent.id);
            const alreadyHas = agent.allowedTools?.includes(toolName);
            return (
              <Paper
                key={agent.id}
                elevation={0}
                onClick={() => toggle(agent.id)}
                sx={{
                  p: 1.25,
                  border: "1px solid",
                  borderColor: checked ? "primary.main" : "divider",
                  borderRadius: 1.5,
                  cursor: "pointer",
                  bgcolor: checked ? "primary.50" : "transparent",
                  "&:hover": { bgcolor: checked ? "primary.50" : "action.hover" },
                  transition: "all 0.1s",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Checkbox checked={checked} size="small" sx={{ p: 0 }} />
                  <Typography sx={{ fontSize: "1.1rem" }}>{agent.icon || "🤖"}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{agent.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{agent.role}</Typography>
                  </Box>
                  {alreadyHas && !checked && (
                    <Chip size="small" label="حالي" color="default" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                  )}
                  {checked && (
                    <CheckIcon color="primary" sx={{ fontSize: 18 }} />
                  )}
                </Stack>
              </Paper>
            );
          })}
          {filtered.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={3}>
              لا توجد نتائج
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <CheckIcon />}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentToolsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [assignTool, setAssignTool] = useState<string | null>(null);

  const toolToAgents = useMemo(() => {
    const canonicalByAlias = new Map<string, string>();
    for (const tool of tools) {
      canonicalByAlias.set(tool.name, tool.name);
      for (const alias of tool.aliases || []) {
        canonicalByAlias.set(alias, tool.name);
      }
    }

    const map = new Map<string, AgentToolInfo[]>();
    for (const agent of agents) {
      for (const toolName of agent.allowedTools || []) {
        const canonicalToolName = canonicalByAlias.get(toolName) || toolName;
        if (!map.has(canonicalToolName)) map.set(canonicalToolName, []);
        map.get(canonicalToolName)!.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          icon: agent.icon,
          status: agent.status,
          autonomy: agent.toolAutonomy?.[toolName] || "auto",
        });
      }
    }
    return map;
  }, [agents, tools]);

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tools;
    return tools.filter((tool) => {
      const agentNames = (toolToAgents.get(tool.name) || []).map((a) => a.name).join(" ");
      return [tool.name, tool.description, tool.sideEffects, agentNames]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalized));
    });
  }, [tools, query, toolToAgents]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [toolData, agentData] = await Promise.all([
        apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools"),
        apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents"),
      ]);
      setTools(toolData.tools || []);
      setAgents(agentData.agents || []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل الأدوات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const readTools = filteredTools.filter((t) => !t.sideEffects || t.sideEffects === "read");
  const writeTools = filteredTools.filter((t) => t.sideEffects === "write");

  const ToolCard = ({ tool }: { tool: ToolDefinition }) => {
    const isExpanded = expandedTool === tool.name;
    const agentList = toolToAgents.get(tool.name) || [];
    const isWrite = tool.sideEffects === "write";
    const sourceLabel = tool.source === "mcp"
      ? i18n.t("agentTools.sources.mcp")
      : i18n.t("agentTools.sources.python");

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: isWrite ? "warning.main" : "divider",
          bgcolor: isWrite ? alpha(theme.palette.warning.main, 0.03) : "background.paper",
          transition: "all 0.15s",
          "&:hover": { borderColor: isWrite ? "warning.main" : "primary.main" },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar
            sx={{ width: 36, height: 36, bgcolor: isWrite ? "warning.main" : "primary.main", fontSize: 18 }}
          >
            <ToolIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap">
              <Typography variant="subtitle2" fontWeight={900} sx={{ fontFamily: "Consolas, monospace" }}>
                {tool.name}
              </Typography>
              <Chip
                size="small"
                icon={isWrite ? <WriteIcon sx={{ fontSize: 12 }} /> : <ReadIcon sx={{ fontSize: 12 }} />}
                label={isWrite ? "كتابة" : "قراءة"}
                color={isWrite ? "warning" : "primary"}
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 20 }}
              />
              {tool.requiresApproval && (
                <Chip size="small" icon={<GuardIcon sx={{ fontSize: 12 }} />} label="تحتاج موافقة" color="warning" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
              )}
              <Chip size="small" label={sourceLabel} color={tool.source === "mcp" ? "secondary" : "default"} variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
              {agentList.length > 0 && (
                <Chip size="small" label={`${agentList.length} وكيل`} color="success" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {tool.description || "لا يوجد وصف لهذه الأداة."}
            </Typography>

            {/* Actions */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AssignIcon sx={{ fontSize: 14 }} />}
                onClick={() => setAssignTool(tool.name)}
                sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 2 }}
              >
                تعيين لوكيل
              </Button>
            </Stack>

            {/* Agent list (expandable) */}
            {agentList.length > 0 && (
              <>
                <Button
                  size="small"
                  startIcon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                  sx={{ fontSize: "0.75rem", textTransform: "none", color: "text.secondary" }}
                >
                  الوكلاء يستخدمون هذه الأداة ({agentList.length})
                </Button>
                <Collapse in={isExpanded}>
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {agentList.map((agent) => (
                      <Paper
                        key={agent.id}
                        elevation={0}
                        sx={{
                          p: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => navigate(`/admin/ai-agents?agent=${agent.id}`)}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontSize: "1rem" }}>{agent.icon || "🤖"}</Typography>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>{agent.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{agent.role}</Typography>
                            </Box>
                          </Stack>
                          <Chip
                            size="small"
                            label={agent.autonomy === "blocked" ? "محظور" : agent.autonomy === "approval" ? "يحتاج تأكيد" : "تلقائي"}
                            color={agent.autonomy === "blocked" ? "error" : agent.autonomy === "approval" ? "warning" : "success"}
                            variant="outlined"
                            sx={{ fontSize: "0.6rem", height: 18 }}
                          />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Collapse>
              </>
            )}
            {agentList.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                لا يوجد وكلاء يستخدمون هذه الأداة حالياً
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ direction: "rtl", minHeight: "calc(100vh - 64px)", bgcolor: "background.default", p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <ToolIcon color="primary" />
            <Typography variant="h4" fontWeight={900}>أدوات الوكلاء</Typography>
          </Stack>
          <Typography color="text.secondary">
            كل أداة عبارة عن وحدة عمل يستطيع الوكيل استدعاؤها. هنا تعرف مين بيستخدم أنهي أداة وتقدر تعيّنها.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="بحث في الأدوات أو الوكلاء..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
            }}
            sx={{ minWidth: 280 }}
          />
          <Tooltip title="تحديث">
            <IconButton color="primary" onClick={loadAll}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Stats */}
      {!loading && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">إجمالي الأدوات</Typography>
            <Typography variant="h6" fontWeight={900}>{tools.length}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">قراءة</Typography>
            <Typography variant="h6" fontWeight={900} color="primary.main">{tools.filter((t) => !t.sideEffects || t.sideEffects === "read").length}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">كتابة</Typography>
            <Typography variant="h6" fontWeight={900} color="warning.main">{tools.filter((t) => t.sideEffects === "write").length}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">الوكلاء</Typography>
            <Typography variant="h6" fontWeight={900}>{agents.length}</Typography>
          </Paper>
        </Stack>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Paper elevation={0} sx={{ minHeight: 420, display: "grid", placeItems: "center", borderRadius: 2 }}>
          <CircularProgress />
        </Paper>
      ) : filteredTools.length === 0 ? (
        <Paper elevation={0} sx={{ minHeight: 200, display: "grid", placeItems: "center", borderRadius: 2 }}>
          <Typography color="text.secondary">لا توجد نتائج لـ &quot;{query}&quot;</Typography>
        </Paper>
      ) : (
        <Stack spacing={4}>
          {readTools.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <ReadIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="h6" fontWeight={900}>قراءة (آمنة)</Typography>
                <Chip size="small" label={readTools.length} variant="outlined" />
              </Stack>
              <Grid container spacing={2}>
                {readTools.map((tool) => (
                  <Grid item xs={12} md={6} key={tool.name}>
                    <ToolCard tool={tool} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {writeTools.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <WriteIcon color="warning" sx={{ fontSize: 20 }} />
                <Typography variant="h6" fontWeight={900}>كتابة (تحتاج موافقة)</Typography>
                <Chip size="small" label={writeTools.length} variant="outlined" color="warning" />
              </Stack>
              <Grid container spacing={2}>
                {writeTools.map((tool) => (
                  <Grid item xs={12} md={6} key={tool.name}>
                    <ToolCard tool={tool} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Stack>
      )}

      {/* Assign Dialog */}
      <AssignToolDialog
        open={!!assignTool}
        toolName={assignTool || ""}
        agents={agents}
        onClose={() => setAssignTool(null)}
        onSaved={loadAll}
      />
    </Box>
  );
}

function alpha(color: string, value: number) {
  return `${color}${Math.round(value * 255).toString(16).padStart(2, "0")}`;
}
