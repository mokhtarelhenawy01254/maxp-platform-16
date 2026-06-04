import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Switch,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Snackbar,
} from "@mui/material";
import {
  Psychology as SoulIcon,
  Gavel as RulesIcon,
  Extension as SkillsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  LockOutlined as ReadOnlyIcon,
  EditOutlined as WriteIcon,
  CheckCircle as EnabledIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  description: string;
  params: Record<string, string>;
  readOnly: boolean;
  enabled: boolean;
}

interface AgentConfig {
  soul: string;
  rules: string[];
  skills: Skill[];
}

// ─── Default soul text ────────────────────────────────────────────────────────

const DEFAULT_SOUL = `أنت CEO Agent — مساعد ذكي متخصص في إدارة الأعمال التجارية.
دورك هو مساعدة صاحب الشركة والمدير في اتخاذ قرارات مبنية على البيانات الفعلية.

شخصيتك:
- تتكلم العربية دائماً بأسلوب مهني وودود ومختصر
- تستخدم الأرقام والإحصائيات عند توفر البيانات
- تقدم توصيات عملية وقابلة للتنفيذ
- تكون صادقاً إذا كانت البيانات غير متاحة`;

// ─── Skill group labels ───────────────────────────────────────────────────────

const SKILL_GROUPS: Record<string, string> = {
  "order": "الطلبات",
  "product": "المنتجات",
  "customer": "العملاء",
  "inventory": "المخزون",
  "sales": "المبيعات",
  "company": "الشركة",
};

function getGroup(name: string) {
  return SKILL_GROUPS[name.split(".")[0]] || "أخرى";
}

// ─── Skill Card ───────────────────────────────────────────────────────────────

interface SkillCardProps {
  skill: Skill;
  onToggle: (name: string) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onToggle }) => {
  const paramCount = Object.keys(skill.params || {}).length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1.5px solid",
        borderColor: skill.enabled ? "primary.main" : "divider",
        bgcolor: skill.enabled ? "primary.50" : "background.paper",
        transition: "all 0.2s",
        opacity: skill.enabled ? 1 : 0.65,
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main", opacity: 1 },
      }}
      onClick={() => onToggle(skill.name)}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.72rem",
              color: skill.enabled ? "primary.main" : "text.disabled",
              fontWeight: 600,
              display: "block",
              mb: 0.4,
            }}
          >
            {skill.name}
          </Typography>

          {/* Arabic description */}
          <Typography variant="body2" sx={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
            {skill.description}
          </Typography>

          {/* Badges */}
          <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
            <Chip
              size="small"
              icon={skill.readOnly ? <ReadOnlyIcon sx={{ fontSize: 12 }} /> : <WriteIcon sx={{ fontSize: 12 }} />}
              label={skill.readOnly ? "قراءة فقط" : "يعدّل بيانات"}
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 20 }}
            />
            {paramCount > 0 && (
              <Chip
                size="small"
                label={`${paramCount} معامل`}
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 20 }}
              />
            )}
          </Box>
        </Box>

        {/* Toggle */}
        <Switch
          size="small"
          checked={skill.enabled}
          onChange={() => onToggle(skill.name)}
          onClick={(e) => e.stopPropagation()}
          color="primary"
        />
      </Box>
    </Paper>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AgentConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>({ soul: "", rules: [], skills: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [newRule, setNewRule] = useState("");

  // ── Load config ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl("/ai/agent-config"), {
          headers: tokenManager.createAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setConfig({
            soul: data.soul || "",
            rules: Array.isArray(data.rules) ? data.rules : [],
            skills: Array.isArray(data.skills) ? data.skills : [],
          });
        }
      } catch {
        setError("فشل تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const enabledSkills = config.skills
        .filter((s) => s.enabled)
        .map((s) => s.name);

      const res = await fetch(buildApiUrl("/ai/agent-config"), {
        method: "PUT",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          soul: config.soul,
          rules: config.rules,
          enabledSkills,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "فشل الحفظ");
      setSnackbar(data.message || "تم الحفظ بنجاح ✅");
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }, [config]);

  // ── Skills toggle ──────────────────────────────────────────────────────────
  const toggleSkill = useCallback((name: string) => {
    setConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  }, []);

  const enabledCount = config.skills.filter((s) => s.enabled).length;
  const totalCount = config.skills.length;

  // ── Rules helpers ──────────────────────────────────────────────────────────
  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setConfig((prev) => ({ ...prev, rules: [...prev.rules, trimmed] }));
    setNewRule("");
  };

  const deleteRule = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx),
    }));
  };

  // ── Group skills ───────────────────────────────────────────────────────────
  const groupedSkills = config.skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const g = getGroup(skill.name);
    if (!acc[g]) acc[g] = [];
    acc[g].push(skill);
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            إعدادات CEO Agent
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.3}>
            خصّص شخصية الوكيل، قواعده، والمهارات المسموح له باستخدامها
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 1 — Soul (الشخصية)
        ══════════════════════════════════════════════════════════════════ */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                <SoulIcon sx={{ fontSize: 20 }} />
              </Avatar>
            }
            title={<Typography variant="subtitle1" fontWeight={700}>الشخصية (Soul)</Typography>}
            subheader="حدّد أسلوب الوكيل وشخصيته ودوره — يُدرج في بداية كل محادثة"
            action={
              <Tooltip title="استعادة الشخصية الافتراضية">
                <IconButton
                  size="small"
                  onClick={() => setConfig((p) => ({ ...p, soul: DEFAULT_SOUL }))}
                >
                  <ResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          />
          <Divider />
          <CardContent>
            <TextField
              multiline
              minRows={6}
              maxRows={16}
              fullWidth
              value={config.soul}
              onChange={(e) => setConfig((p) => ({ ...p, soul: e.target.value }))}
              placeholder={DEFAULT_SOUL}
              variant="outlined"
              inputProps={{ dir: "rtl", style: { fontFamily: "inherit", lineHeight: 1.7 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
              {config.soul.length} حرف
            </Typography>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 2 — Rules (القواعد)
        ══════════════════════════════════════════════════════════════════ */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: "warning.main", width: 36, height: 36 }}>
                <RulesIcon sx={{ fontSize: 20 }} />
              </Avatar>
            }
            title={<Typography variant="subtitle1" fontWeight={700}>القواعد (Rules)</Typography>}
            subheader="قواعد لا يخالفها الوكيل — مثل: لا تشارك بيانات العملاء، أجب بالعربية دائماً"
            action={
              <Chip
                size="small"
                label={`${config.rules.length} قاعدة`}
                color={config.rules.length > 0 ? "warning" : "default"}
                variant="outlined"
              />
            }
          />
          <Divider />
          <CardContent>
            {/* Existing rules */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
              {config.rules.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ py: 1, textAlign: "center" }}>
                  لا توجد قواعد مخصصة — سيتم استخدام القواعد الافتراضية
                </Typography>
              ) : (
                config.rules.map((rule, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" color="warning.main" fontWeight={700} sx={{ minWidth: 24 }}>
                      {idx + 1}.
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.5 }}>
                      {rule}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteRule(idx)}
                      sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>

            {/* Add rule */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="اكتب قاعدة جديدة..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                inputProps={{ dir: "rtl" }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addRule}
                disabled={!newRule.trim()}
                sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
              >
                إضافة
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 3 — Skills (المهارات)
        ══════════════════════════════════════════════════════════════════ */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: "success.main", width: 36, height: 36 }}>
                <SkillsIcon sx={{ fontSize: 20 }} />
              </Avatar>
            }
            title={<Typography variant="subtitle1" fontWeight={700}>المهارات (Skills)</Typography>}
            subheader="الأدوات التي يستخدمها الوكيل للوصول إلى بيانات الشركة الحقيقية"
            action={
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip
                  size="small"
                  icon={<EnabledIcon sx={{ fontSize: 14 }} />}
                  label={`${enabledCount} / ${totalCount} مفعّل`}
                  color={enabledCount > 0 ? "success" : "default"}
                  variant="outlined"
                />
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      skills: p.skills.map((s) => ({ ...s, enabled: true })),
                    }))
                  }
                  sx={{ fontSize: "0.72rem" }}
                >
                  تفعيل الكل
                </Button>
              </Box>
            }
          />
          <Divider />
          <CardContent>
            {Object.entries(groupedSkills).map(([group, skills]) => (
              <Box key={group} sx={{ mb: 3 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1.5, mb: 1, display: "block" }}
                >
                  {group}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
                    gap: 1.5,
                  }}
                >
                  {skills.map((skill) => (
                    <SkillCard key={skill.name} skill={skill} onToggle={toggleSkill} />
                  ))}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>

      </Box>

      {/* ── Bottom save bar ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 3,
          pt: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {saving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
        </Button>
      </Box>

      {/* ── Success snackbar ──────────────────────────────────────────────────── */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
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

export default AgentConfigPage;
