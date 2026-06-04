/**
 * AgentSkillsPage
 *
 * Skill catalog with "Assign to Agent" capability.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  AutoAwesome as SkillIcon,
  Bolt as ToolIcon,
  Description as FileIcon,
  OpenInNew as OpenIcon,
  PersonAdd as AssignIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Shield as GuardIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

interface ToolDefinition {
  name: string;
  description: string;
  sideEffects: "read" | "write";
  requiresApproval: boolean;
}

interface SkillDefinition {
  id: string;
  displayName: string;
  version?: string;
  description?: string;
  allowedTools: string[];
  requiresHumanApproval?: boolean;
  maxToolCount?: number;
  skillMd?: string;
}

interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: string;
  allowedSkills?: string[];
  allowedTools?: string[];
}

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

// ─── Assign Skill Dialog ──────────────────────────────────────────────────────

interface AssignDialogProps {
  open: boolean;
  skillId: string;
  agents: AgentDefinition[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignSkillDialog({ open, skillId, agents, onClose, onSaved }: AssignDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const initial = new Set(
        agents.filter((a) => a.allowedSkills?.includes(skillId)).map((a) => a.id)
      );
      setSelected(initial);
      setSearch("");
      setError(null);
    }
  }, [open, skillId, agents]);

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
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const promises = agents.map(async (agent) => {
        const hasSkill = agent.allowedSkills?.includes(skillId);
        const shouldBeAdded = selected.has(agent.id);
        if (hasSkill === shouldBeAdded) return;

        const nextSkills = shouldBeAdded
          ? [...(agent.allowedSkills || []), skillId]
          : (agent.allowedSkills || []).filter((s) => s !== skillId);

        return apiPut(`/agent/agents/${agent.id}/files`, {
          name: agent.name,
          role: agent.role,
          allowedTools: agent.allowedTools || [],
          allowedSkills: nextSkills,
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
            <Typography variant="subtitle1" fontWeight={900}>تعيين المهارة لوكيل</Typography>
            <Typography variant="caption" color="text.secondary">{skillId}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {saving && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          size="small" fullWidth placeholder="بحث في الوكلاء..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">{selected.size} / {filtered.length} محدد</Typography>
          <Button size="small" onClick={toggleAll} sx={{ fontSize: "0.75rem", textTransform: "none" }}>
            {selected.size === filtered.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </Stack>
        <Stack spacing={0.5} sx={{ maxHeight: 360, overflow: "auto" }}>
          {filtered.map((agent) => {
            const checked = selected.has(agent.id);
            const alreadyHas = agent.allowedSkills?.includes(skillId);
            return (
              <Paper
                key={agent.id} elevation={0} onClick={() => toggle(agent.id)}
                sx={{
                  p: 1.25, border: "1px solid",
                  borderColor: checked ? "primary.main" : "divider",
                  borderRadius: 1.5, cursor: "pointer",
                  bgcolor: checked ? "primary.50" : "transparent",
                  "&:hover": { bgcolor: checked ? "primary.50" : "action.hover" },
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
                    <Chip size="small" label="حالي" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                  )}
                  {checked && <CheckIcon color="primary" sx={{ fontSize: 18 }} />}
                </Stack>
              </Paper>
            );
          })}
          {filtered.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={3}>لا توجد نتائج</Typography>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentSkillsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selected, setSelected] = useState<SkillDefinition | null>(null);
  const [assignSkill, setAssignSkill] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toolMap = useMemo(() => new Map(tools.map((tool) => [tool.name, tool])), [tools]);
  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) =>
      [skill.id, skill.displayName, skill.description, ...(skill.allowedTools || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [skills, query]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skillData, toolData, agentData] = await Promise.all([
        apiRequest<{ success: true; skills: SkillDefinition[] }>("agent/skills"),
        apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools"),
        apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents"),
      ]);
      setSkills(skillData.skills || []);
      setTools(toolData.tools || []);
      setAgents(agentData.agents || []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل المهارات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Count agents per skill
  const skillAgentCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const agent of agents) {
      for (const sid of agent.allowedSkills || []) {
        map.set(sid, (map.get(sid) || 0) + 1);
      }
    }
    return map;
  }, [agents]);

  return (
    <Box sx={{ direction: "rtl", minHeight: "calc(100vh - 64px)", bgcolor: "background.default", p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <SkillIcon color="primary" />
            <Typography variant="h4" fontWeight={900}>مهارات الوكلاء</Typography>
          </Stack>
          <Typography color="text.secondary">
            كل مهارة عبارة عن حزمة تعليمات قصيرة مع أدوات محدودة يستخدمها الوكيل داخل دوره.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small" placeholder="بحث في المهارات" value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          />
          <Tooltip title="تحديث">
            <IconButton color="primary" onClick={loadAll}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Paper elevation={0} sx={{ minHeight: 420, display: "grid", placeItems: "center", borderRadius: 2 }}>
          <CircularProgress />
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredSkills.map((skill) => {
            const agentCount = skillAgentCount.get(skill.id) || 0;
            return (
              <Grid item xs={12} md={6} xl={4} key={skill.id}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", height: "100%" }}>
                  <Stack spacing={1.25} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <SkillIcon color="primary" />
                        <Typography variant="h6" fontWeight={900} noWrap>{skill.displayName || skill.id}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <Chip size="small" label={`v${skill.version || "1"}`} variant="outlined" />
                        {agentCount > 0 && (
                          <Chip size="small" label={`${agentCount} وكيل`} color="success" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
                      {skill.description || "لا يوجد وصف مختصر لهذه المهارة."}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {(skill.allowedTools || []).map((tool) => (
                        <Chip key={tool} size="small" label={tool} icon={<ToolIcon />} variant="outlined" />
                      ))}
                    </Stack>
                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" startIcon={<OpenIcon />} onClick={() => setSelected(skill)} sx={{ flex: 1 }}>
                        تفاصيل
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AssignIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setAssignSkill(skill.id)}
                        sx={{ flex: 1 }}
                      >
                        تعيين لوكيل
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={900}>{selected?.displayName || selected?.id}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<SkillIcon />} label={selected.id} color="primary" variant="outlined" />
                <Chip label={`v${selected.version || "1"}`} variant="outlined" />
                <Chip icon={<GuardIcon />} label={selected.requiresHumanApproval ? "تحتاج موافقة" : "تشغيل مباشر"} variant="outlined" />
              </Stack>
              <Typography color="text.secondary">{selected.description || "لا يوجد وصف."}</Typography>
              <Box>
                <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>الأدوات داخل المهارة</Typography>
                <Stack spacing={1}>
                  {(selected.allowedTools || []).map((toolName) => {
                    const tool = toolMap.get(toolName);
                    return (
                      <Paper key={toolName} elevation={0} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                        <Stack direction="row" spacing={1} justifyContent="space-between">
                          <Box>
                            <Typography fontWeight={800} sx={{ fontFamily: "Consolas, monospace" }}>{toolName}</Typography>
                            <Typography variant="body2" color="text.secondary">{tool?.description || "أداة غير موثقة."}</Typography>
                          </Box>
                          <Stack direction="row" spacing={0.75}>
                            <Chip size="small" label={tool?.sideEffects === "write" ? "كتابة" : "قراءة"} />
                            {tool?.requiresApproval && <Chip size="small" label="موافقة" color="warning" variant="outlined" />}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <FileIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={900}>SKILL.md</Typography>
                </Stack>
                <Paper elevation={0} sx={{ p: 2, bgcolor: isDark ? "#101828" : "#f8fafc", color: isDark ? "#e6edf7" : "#1e293b", borderRadius: 1.5, direction: "ltr", maxHeight: 360, overflow: "auto" }}>
                  <Typography component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "Consolas, monospace", fontSize: 13 }}>
                    {selected.skillMd || "No SKILL.md content available."}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelected(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <AssignSkillDialog
        open={!!assignSkill}
        skillId={assignSkill || ""}
        agents={agents}
        onClose={() => setAssignSkill(null)}
        onSaved={loadAll}
      />
    </Box>
  );
}
