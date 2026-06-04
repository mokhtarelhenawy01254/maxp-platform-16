/**
 * SuperAdminAgentConfig
 *
 * Dynamic file-explorer UI for managing multiple AI agents.
 * Each agent (CEO, Sales, Support, …) is a "folder" with three child files:
 *   soul.md  → personality/identity prompt
 *   rules.md → hard rules injected every call
 *   skills.json → toggle which tools the agent can use
 *
 * Storage: AgentDefinition model  (via /api/v1/super-admin/agents)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Switch,
  Chip,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Psychology as SoulIcon,
  Gavel as RulesIcon,
  Extension as SkillsIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  LockOutlined as ReadOnlyIcon,
  EditOutlined as WriteIcon,
  ExpandMore as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  SmartToy as AgentIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  description: string;
  params: Record<string, string>;
  readOnly: boolean;
  enabled: boolean;
}

interface AgentListItem {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  isBuiltIn: boolean;
}

interface AgentConfig {
  soul: string;
  rules: string[];
  skills: Skill[];
}

interface AgentState {
  loaded: boolean;
  loading: boolean;
  config: AgentConfig;
  original: AgentConfig;
}

type FileId = "soul" | "rules" | "skills";

interface SelectedKey {
  agentId: string;
  fileId: FileId;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_FILES: { id: FileId; label: string; ext: string; icon: React.ReactNode }[] = [
  { id: "soul",   label: "soul",   ext: ".md",   icon: <SoulIcon   sx={{ fontSize: 14 }} /> },
  { id: "rules",  label: "rules",  ext: ".md",   icon: <RulesIcon  sx={{ fontSize: 14 }} /> },
  { id: "skills", label: "skills", ext: ".json", icon: <SkillsIcon sx={{ fontSize: 14 }} /> },
];

const SKILL_GROUPS: Record<string, string> = {
  order: "الطلبات", product: "المنتجات", customer: "العملاء",
  inventory: "المخزون", sales: "المبيعات", company: "الشركة",
};

const EMPTY_CONFIG: AgentConfig = { soul: "", rules: [], skills: [] };

const BOILERPLATE_SOUL = `أنت {agentName} — مساعد ذكي متخصص.
شخصيتك:
- تتحدث بأسلوب مهني وودود
- تستند دائماً إلى البيانات الفعلية
- تقدم توصيات عملية وقابلة للتنفيذ
- تكون صادقاً إذا كانت البيانات غير متاحة`;

// ─── Dirty helpers ────────────────────────────────────────────────────────────

function isFileDirty(state: AgentState, fileId: FileId): boolean {
  if (!state.loaded) return false;
  if (fileId === "soul") return state.config.soul !== state.original.soul;
  if (fileId === "rules") return JSON.stringify(state.config.rules) !== JSON.stringify(state.original.rules);
  return (
    JSON.stringify(state.config.skills.map((s) => `${s.name}:${s.enabled}`)) !==
    JSON.stringify(state.original.skills.map((s) => `${s.name}:${s.enabled}`))
  );
}

function isAgentDirty(state: AgentState): boolean {
  return AGENT_FILES.some((f) => isFileDirty(state, f.id));
}

// ─── File Tree Panel ──────────────────────────────────────────────────────────

interface FileTreeProps {
  agents: AgentListItem[];
  agentStates: Record<string, AgentState>;
  openFolders: Set<string>;
  selectedKey: SelectedKey | null;
  onToggleFolder: (id: string) => void;
  onSelectFile: (agentId: string, fileId: FileId) => void;
  onNewAgent: () => void;
  onDeleteAgent: (agentId: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({
  agents, agentStates, openFolders, selectedKey,
  onToggleFolder, onSelectFile, onNewAgent, onDeleteAgent,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 240, flexShrink: 0,
        borderRight: "1px solid", borderColor: "divider",
        height: "100%", display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2, py: 1.5,
          borderBottom: "1px solid", borderColor: "divider",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Typography
          variant="overline"
          sx={{ fontSize: "0.63rem", letterSpacing: 1.5, color: "text.secondary", fontWeight: 700 }}
        >
          AGENTS EXPLORER
        </Typography>
        <Tooltip title="وكيل جديد">
          <IconButton size="small" onClick={onNewAgent} sx={{ color: "primary.main" }}>
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Agent list */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
        {agents.map((agent) => {
          const isOpen = openFolders.has(agent.id);
          const state = agentStates[agent.id];
          const dirty = state ? isAgentDirty(state) : false;

          return (
            <Box key={agent.id} sx={{ px: 1, py: 0.2 }}>
              {/* Folder row */}
              <Box
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5,
                  px: 1, py: 0.6, borderRadius: 1, cursor: "pointer",
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                  "&:hover .agent-delete": { opacity: 1 },
                }}
                onClick={() => onToggleFolder(agent.id)}
              >
                {isOpen
                  ? <ChevronDownIcon  sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
                  : <ChevronRightIcon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
                }
                <Typography sx={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>
                  {agent.icon || "🤖"}
                </Typography>
                <Typography
                  variant="body2" fontWeight={600}
                  sx={{ fontSize: "0.82rem", flex: 1, minWidth: 0 }}
                  noWrap
                >
                  {agent.name}
                </Typography>
                {dirty && (
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} />
                )}
                {state?.loading && <CircularProgress size={10} sx={{ flexShrink: 0 }} />}
                {agent.isBuiltIn && (
                  <Chip
                    label="built-in" size="small"
                    sx={{
                      fontSize: "0.58rem", height: 15, px: 0.25,
                      bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main", flexShrink: 0,
                    }}
                  />
                )}
                {!agent.isBuiltIn && (
                  <IconButton
                    size="small"
                    className="agent-delete"
                    sx={{ opacity: 0, p: 0.25, transition: "opacity 0.15s", color: "error.main" }}
                    onClick={(e) => { e.stopPropagation(); onDeleteAgent(agent.id); }}
                  >
                    <DeleteIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                )}
              </Box>

              {/* Children files */}
              {isOpen && (
                <Box sx={{ ml: 2 }}>
                  {AGENT_FILES.map((file) => {
                    const isSelected =
                      selectedKey?.agentId === agent.id && selectedKey?.fileId === file.id;
                    const fileDirty = state ? isFileDirty(state, file.id) : false;
                    return (
                      <Box
                        key={file.id}
                        sx={{
                          display: "flex", alignItems: "center", gap: 0.8,
                          px: 1, py: 0.6, borderRadius: 1, cursor: "pointer",
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.12)
                            : "transparent",
                          "&:hover": {
                            bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.action.hover, 0.5),
                          },
                          transition: "background 0.15s",
                        }}
                        onClick={() => onSelectFile(agent.id, file.id)}
                      >
                        <Box sx={{ color: isSelected ? "primary.main" : "text.disabled" }}>
                          {file.icon}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.8rem", flex: 1,
                            color: isSelected ? "primary.main" : "text.primary",
                            fontWeight: isSelected ? 600 : 400,
                          }}
                        >
                          {file.label}
                          <Typography component="span" sx={{ color: "text.disabled", fontSize: "0.72rem" }}>
                            {file.ext}
                          </Typography>
                        </Typography>
                        {fileDirty && (
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}

        {agents.length === 0 && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.disabled">لا يوجد وكلاء</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── New Agent Dialog ─────────────────────────────────────────────────────────

interface NewAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { name: string; type: string; description: string; icon: string }) => Promise<void>;
}

const NewAgentDialog: React.FC<NewAgentDialogProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🤖");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slugify = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const handleNameChange = (v: string) => {
    setName(v);
    setType(slugify(v));
  };

  const handleCreate = async () => {
    if (!name.trim() || !type.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      await onCreate({ name: name.trim(), type: type.trim(), description: description.trim(), icon: icon || "🤖" });
      setName(""); setType(""); setDescription(""); setIcon("🤖");
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || "حدث خطأ");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إنشاء وكيل جديد</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {err && <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <TextField
            label="أيقونة"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            sx={{ width: 80 }}
            inputProps={{ style: { fontSize: "1.4rem", textAlign: "center", padding: "10px 8px" } }}
          />
          <TextField
            label="اسم الوكيل *"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            fullWidth
            inputProps={{ dir: "rtl" }}
            autoFocus
          />
        </Box>
        <TextField
          label="المعرّف (type) *"
          value={type}
          onChange={(e) => setType(slugify(e.target.value))}
          helperText="حروف إنجليزية وأرقام وشرطة سفلية فقط — لا يمكن تغييره لاحقاً"
        />
        <TextField
          label="الوصف (اختياري)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          inputProps={{ dir: "rtl" }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={creating}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!name.trim() || !type.trim() || creating}
          startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
          sx={{ borderRadius: 2 }}
        >
          إنشاء
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteConfirmProps {
  agentName: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmProps> = ({ agentName, onConfirm, onClose }) => (
  <Dialog open={!!agentName} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>حذف الوكيل</DialogTitle>
    <DialogContent>
      <Typography>
        هل أنت متأكد من حذف الوكيل <strong>{agentName}</strong>؟ لا يمكن التراجع عن هذا.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>إلغاء</Button>
      <Button variant="contained" color="error" onClick={onConfirm} sx={{ borderRadius: 2 }}>
        حذف
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Soul Editor ──────────────────────────────────────────────────────────────

interface SoulEditorProps {
  value: string;
  agentName: string;
  onChange: (v: string) => void;
}

const SoulEditor: React.FC<SoulEditorProps> = ({ value, agentName, onChange }) => (
  <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5, gap: 1.5, overflow: "hidden" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <SoulIcon sx={{ fontSize: 18, color: "primary.main" }} />
      <Typography variant="subtitle2" fontWeight={700}>soul.md</Typography>
      <Chip label="شخصية الوكيل" size="small" color="primary" variant="outlined" sx={{ fontSize: "0.68rem" }} />
      <Tooltip title="استخدام قالب افتراضي">
        <Button
          size="small" variant="text"
          sx={{ fontSize: "0.7rem", ml: "auto" }}
          onClick={() => onChange(BOILERPLATE_SOUL.replace("{agentName}", agentName))}
        >
          قالب
        </Button>
      </Tooltip>
    </Box>
    <Typography variant="caption" color="text.secondary">
      هذا النص يُدرج في بداية كل محادثة ويحدد شخصية الوكيل.
      الشركات ذات الإعدادات الخاصة ستتجاهله.
    </Typography>
    <TextField
      multiline
      minRows={12}
      maxRows={24}
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={BOILERPLATE_SOUL.replace("{agentName}", agentName)}
      variant="outlined"
      inputProps={{ dir: "rtl", style: { fontFamily: "monospace", lineHeight: 1.8, fontSize: "0.88rem" } }}
      sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.default" } }}
    />
    <Typography variant="caption" color="text.disabled">{value.length} حرف</Typography>
  </Box>
);

// ─── Rules Editor ─────────────────────────────────────────────────────────────

interface RulesEditorProps {
  rules: string[];
  onChange: (rules: string[]) => void;
}

const RulesEditor: React.FC<RulesEditorProps> = ({ rules, onChange }) => {
  const [newRule, setNewRule] = useState("");

  const add = () => {
    const t = newRule.trim();
    if (!t) return;
    onChange([...rules, t]);
    setNewRule("");
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5, gap: 1.5, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <RulesIcon sx={{ fontSize: 18, color: "warning.main" }} />
        <Typography variant="subtitle2" fontWeight={700}>rules.md</Typography>
        <Chip label={`${rules.length} قاعدة`} size="small" color="warning" variant="outlined" sx={{ fontSize: "0.68rem" }} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        قواعد ملزمة تُحقن في كل محادثة. الشركات ذات القواعد الخاصة ستتجاهلها.
      </Typography>

      <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.8 }}>
        {rules.length === 0 ? (
          <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: "background.default", borderRadius: 2 }}>
            <Typography variant="body2" color="text.disabled">
              لا توجد قواعد — ستُستخدم القواعد الافتراضية المضمنة في الكود
            </Typography>
          </Paper>
        ) : (
          rules.map((rule, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex", alignItems: "flex-start", gap: 1,
                p: 1.2, borderRadius: 2, bgcolor: "background.default",
                border: "1px solid", borderColor: "divider",
              }}
            >
              <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 700, minWidth: 22, mt: 0.2 }}>
                {idx + 1}.
              </Typography>
              <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6, fontSize: "0.85rem" }}>
                {rule}
              </Typography>
              <IconButton
                size="small" color="error"
                onClick={() => onChange(rules.filter((_, i) => i !== idx))}
                sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
              >
                <DeleteIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth size="small"
          placeholder="اكتب قاعدة جديدة..."
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          inputProps={{ dir: "rtl" }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Button
          variant="outlined" startIcon={<AddIcon />} onClick={add}
          disabled={!newRule.trim()} sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
        >
          إضافة
        </Button>
      </Box>
    </Box>
  );
};

// ─── Skills Editor ────────────────────────────────────────────────────────────

interface SkillsEditorProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}

const SkillsEditor: React.FC<SkillsEditorProps> = ({ skills, onChange }) => {
  const theme = useTheme();

  const toggle = (name: string) =>
    onChange(skills.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s)));

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const g = SKILL_GROUPS[s.name.split(".")[0]] || "أخرى";
    (acc[g] ||= []).push(s);
    return acc;
  }, {});

  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5, gap: 1.5, overflowY: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <SkillsIcon sx={{ fontSize: 18, color: "success.main" }} />
        <Typography variant="subtitle2" fontWeight={700}>skills.json</Typography>
        <Chip
          icon={<CheckIcon sx={{ fontSize: 13 }} />}
          label={`${enabledCount} / ${skills.length} مفعّل`}
          size="small" color="success" variant="outlined"
          sx={{ fontSize: "0.68rem" }}
        />
        <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
          <Button size="small" variant="text" onClick={() => onChange(skills.map((s) => ({ ...s, enabled: true })))} sx={{ fontSize: "0.72rem" }}>تفعيل الكل</Button>
          <Button size="small" variant="text" color="error" onClick={() => onChange(skills.map((s) => ({ ...s, enabled: false })))} sx={{ fontSize: "0.72rem" }}>تعطيل الكل</Button>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary">
        الأدوات المتاحة لهذا الوكيل. الشركات ذات المهارات المخصصة ستتجاهل هذه الإعدادات.
      </Typography>

      {Object.entries(grouped).map(([group, groupSkills]) => (
        <Box key={group}>
          <Typography variant="overline" sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>
            {group}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 0.5 }}>
            {groupSkills.map((skill) => (
              <Box
                key={skill.name}
                onClick={() => toggle(skill.name)}
                sx={{
                  p: 1.2, borderRadius: 2, border: "1.5px solid",
                  borderColor: skill.enabled ? "success.main" : "divider",
                  bgcolor: skill.enabled ? alpha(theme.palette.success.main, 0.06) : "background.paper",
                  cursor: "pointer", transition: "all 0.15s",
                  "&:hover": { borderColor: "success.main" },
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem", color: skill.enabled ? "success.main" : "text.disabled", fontWeight: 600, display: "block" }}>
                    {skill.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.74rem", color: "text.secondary", lineHeight: 1.4, display: "block", mt: 0.2 }}>
                    {skill.description}
                  </Typography>
                  <Chip
                    size="small"
                    icon={skill.readOnly ? <ReadOnlyIcon sx={{ fontSize: 11 }} /> : <WriteIcon sx={{ fontSize: 11 }} />}
                    label={skill.readOnly ? "قراءة" : "كتابة"}
                    variant="outlined"
                    sx={{ fontSize: "0.6rem", height: 17, mt: 0.5 }}
                  />
                </Box>
                <Switch
                  size="small" checked={skill.enabled}
                  onChange={() => toggle(skill.name)}
                  onClick={(e) => e.stopPropagation()}
                  color="success" sx={{ flexShrink: 0 }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SuperAdminAgentConfig: React.FC = () => {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<SelectedKey | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentListItem | null>(null);

  // ── Load agents list ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get("/super-admin/agents");
        if (data.success) setAgents(data.agents);
      } catch {
        setListError("فشل تحميل قائمة الوكلاء");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // ── Load single agent config ────────────────────────────────────────────────
  const loadAgentConfig = useCallback(
    async (agentId: string) => {
      if (agentStates[agentId]?.loaded || agentStates[agentId]?.loading) return;

      setAgentStates((prev) => ({
        ...prev,
        [agentId]: { loaded: false, loading: true, config: EMPTY_CONFIG, original: EMPTY_CONFIG },
      }));

      try {
        const { data } = await apiClient.get(`/super-admin/agents/${agentId}`);
        if (data.success) {
          const config: AgentConfig = {
            soul: data.agent.soul ?? "",
            rules: data.agent.rules ?? [],
            skills: data.agent.skills ?? [],
          };
          setAgentStates((prev) => ({
            ...prev,
            [agentId]: {
              loaded: true, loading: false, config,
              original: { soul: config.soul, rules: [...config.rules], skills: [...config.skills] },
            },
          }));
        }
      } catch {
        setAgentStates((prev) => ({
          ...prev,
          [agentId]: { loaded: false, loading: false, config: EMPTY_CONFIG, original: EMPTY_CONFIG },
        }));
        setListError("فشل تحميل إعدادات الوكيل");
      }
    },
    [agentStates],
  );

  // ── Toggle folder ────────────────────────────────────────────────────────────
  const handleToggleFolder = useCallback(
    (agentId: string) => {
      setOpenFolders((prev) => {
        const next = new Set(prev);
        if (next.has(agentId)) {
          next.delete(agentId);
        } else {
          next.add(agentId);
          loadAgentConfig(agentId);
        }
        return next;
      });
    },
    [loadAgentConfig],
  );

  // ── Select file ─────────────────────────────────────────────────────────────
  const handleSelectFile = useCallback(
    (agentId: string, fileId: FileId) => {
      setSelectedKey({ agentId, fileId });
      setOpenFolders((prev) => { const n = new Set(prev); n.add(agentId); return n; });
      loadAgentConfig(agentId);
    },
    [loadAgentConfig],
  );

  // ── Update a field in the current agent's config ────────────────────────────
  const updateField = useCallback((agentId: string, field: keyof AgentConfig, value: any) => {
    setAgentStates((prev) => {
      const s = prev[agentId];
      if (!s) return prev;
      return { ...prev, [agentId]: { ...s, config: { ...s.config, [field]: value } } };
    });
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (agentId: string) => {
      const s = agentStates[agentId];
      if (!s?.loaded) return;
      setSaving(agentId);
      try {
        const { data } = await apiClient.put(`/super-admin/agents/${agentId}`, {
          soul: s.config.soul,
          rules: s.config.rules,
          enabledSkills: s.config.skills.filter((sk) => sk.enabled).map((sk) => sk.name),
        });
        if (!data.success) throw new Error(data.error);
        setAgentStates((prev) => ({
          ...prev,
          [agentId]: {
            ...prev[agentId],
            original: {
              soul: prev[agentId].config.soul,
              rules: [...prev[agentId].config.rules],
              skills: [...prev[agentId].config.skills],
            },
          },
        }));
        setSnackbar(data.message || "تم الحفظ ✅");
      } catch (e: any) {
        setListError(e?.response?.data?.error || e.message || "فشل الحفظ");
      } finally {
        setSaving(null);
      }
    },
    [agentStates],
  );

  // ── Create new agent ────────────────────────────────────────────────────────
  const handleCreateAgent = useCallback(
    async (form: { name: string; type: string; description: string; icon: string }) => {
      const { data } = await apiClient.post("/super-admin/agents", form);
      if (!data.success) throw new Error(data.error);
      setAgents((prev) => [...prev, data.agent]);
      setSnackbar(`تم إنشاء ${data.agent.name} ✅`);
    },
    [],
  );

  // ── Delete agent ─────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const agentId = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const { data } = await apiClient.delete(`/super-admin/agents/${agentId}`);
      if (!data.success) throw new Error(data.error);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      setAgentStates((prev) => { const n = { ...prev }; delete n[agentId]; return n; });
      setOpenFolders((prev) => { const n = new Set(prev); n.delete(agentId); return n; });
      if (selectedKey?.agentId === agentId) setSelectedKey(null);
      setSnackbar("تم حذف الوكيل");
    } catch (e: any) {
      setListError(e?.response?.data?.error || e.message || "فشل الحذف");
    }
  }, [deleteTarget, selectedKey]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const currentAgentId = selectedKey?.agentId ?? null;
  const currentAgent   = currentAgentId ? agents.find((a) => a.id === currentAgentId) ?? null : null;
  const currentState   = currentAgentId ? agentStates[currentAgentId] ?? null : null;
  const dirty          = currentState ? isAgentDirty(currentState) : false;

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loadingList) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3, py: 1.5, flexShrink: 0,
          borderBottom: "1px solid", borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex", alignItems: "center", gap: 2,
        }}
      >
        <AgentIcon sx={{ color: "primary.main", fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            {currentAgent
              ? `${currentAgent.icon}  ${currentAgent.name}`
              : "إدارة وكلاء الذكاء الاصطناعي"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentAgent
              ? currentAgent.description || `النوع: ${currentAgent.type}`
              : "اختر وكيلاً من القائمة لعرض ملفاته وتعديلها"}
          </Typography>
        </Box>

        {dirty && currentAgentId && (
          <>
            <Chip
              label="تغييرات غير محفوظة" size="small"
              color="warning" variant="outlined" sx={{ fontSize: "0.7rem" }}
            />
            <Button
              variant="contained" size="small" sx={{ borderRadius: 2 }}
              startIcon={
                saving === currentAgentId
                  ? <CircularProgress size={14} color="inherit" />
                  : <SaveIcon />
              }
              onClick={() => handleSave(currentAgentId)}
              disabled={saving === currentAgentId}
            >
              {saving === currentAgentId ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </>
        )}
      </Box>

      {listError && (
        <Alert severity="error" onClose={() => setListError(null)} sx={{ mx: 2, mt: 1, flexShrink: 0 }}>
          {listError}
        </Alert>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>

        {/* Left: file tree */}
        <FileTree
          agents={agents}
          agentStates={agentStates}
          openFolders={openFolders}
          selectedKey={selectedKey}
          onToggleFolder={handleToggleFolder}
          onSelectFile={handleSelectFile}
          onNewAgent={() => setNewAgentOpen(true)}
          onDeleteAgent={(id) => {
            const a = agents.find((x) => x.id === id);
            if (a) setDeleteTarget(a);
          }}
        />

        {/* Right: editor */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.paper" }}>
          {!selectedKey ? (
            <Box
              sx={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 2,
              }}
            >
              <AgentIcon sx={{ fontSize: 72, opacity: 0.15 }} />
              <Typography variant="body2" color="text.disabled">
                اختر ملفاً من القائمة لبدء التعديل
              </Typography>
            </Box>
          ) : currentState?.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
            </Box>
          ) : currentState?.loaded ? (
            <>
              {selectedKey.fileId === "soul" && (
                <SoulEditor
                  value={currentState.config.soul}
                  agentName={currentAgent?.name ?? ""}
                  onChange={(v) => updateField(selectedKey.agentId, "soul", v)}
                />
              )}
              {selectedKey.fileId === "rules" && (
                <RulesEditor
                  rules={currentState.config.rules}
                  onChange={(r) => updateField(selectedKey.agentId, "rules", r)}
                />
              )}
              {selectedKey.fileId === "skills" && (
                <SkillsEditor
                  skills={currentState.config.skills}
                  onChange={(s) => updateField(selectedKey.agentId, "skills", s)}
                />
              )}
            </>
          ) : null}
        </Box>
      </Box>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <NewAgentDialog
        open={newAgentOpen}
        onClose={() => setNewAgentOpen(false)}
        onCreate={handleCreateAgent}
      />
      <DeleteConfirmDialog
        agentName={deleteTarget?.name ?? null}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={!!snackbar} autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)} sx={{ borderRadius: 2 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SuperAdminAgentConfig;
