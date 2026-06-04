import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  AccountTree as TreeIcon,
  ManageAccounts as AgentIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  model?: string | null;
  templateSlug?: string | null;
  departmentName?: string | null;
  departmentIcon?: string | null;
  managerType?: string | null;
  children?: AgentNode[];
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

const roleTone = (role: string) => {
  if (role === "CEO") return { border: "#2563eb", bg: "#eff6ff" };
  if (role === "MARKETING") return { border: "#db2777", bg: "#fdf2f8" };
  if (role === "SALES") return { border: "#16a34a", bg: "#f0fdf4" };
  if (role === "SUPPORT") return { border: "#f59e0b", bg: "#fffbeb" };
  if (role === "INVENTORY" || role === "PRICING") return { border: "#0891b2", bg: "#ecfeff" };
  return { border: "#64748b", bg: "#f8fafc" };
};

export default function AgentTeamMapPage() {
  const [tree, setTree] = useState<AgentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest("agent-manager/me");
      const data = await apiRequest<{ success: true; tree: AgentNode[] }>("agent/team-map");
      setTree(data.tree || []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل خريطة الوكلاء.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <Box sx={{ direction: "rtl", minHeight: "calc(100vh - 64px)", bgcolor: "#f6f7f9", p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <TreeIcon color="primary" />
            <Typography variant="h4" fontWeight={900}>خريطة الوكلاء</Typography>
          </Stack>
          <Typography color="text.secondary">
            تقسيم شجري يوضح المدير، الفريق المباشر، وأي وكلاء تابعين لوكلاء آخرين.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button component={RouterLink} to="/admin/ai-agents" variant="outlined" startIcon={<OpenIcon />}>
            إدارة الملفات
          </Button>
          <Tooltip title="تحديث الخريطة">
            <IconButton color="primary" onClick={loadTree}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "auto", minHeight: 560, p: { xs: 2, md: 4 } }}>
        {loading ? (
          <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : tree.length === 0 ? (
          <Box sx={{ minHeight: 420, display: "grid", placeItems: "center", textAlign: "center" }}>
            <Typography color="text.secondary">لا يوجد وكلاء بعد.</Typography>
          </Box>
        ) : (
          <Stack direction="row" justifyContent="center" alignItems="flex-start" sx={{ minWidth: 980 }}>
            {tree.map((node) => (
              <TreeBranch key={node.id} node={node} depth={0} />
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

function TreeBranch({ node, depth }: { node: AgentNode; depth: number }) {
  const children = node.children || [];
  return (
    <Box sx={{ textAlign: "center", px: 1.5, position: "relative" }}>
      <AgentCard node={node} depth={depth} />
      {children.length > 0 && (
        <>
          <Box sx={{ width: 2, height: 28, bgcolor: "divider", mx: "auto" }} />
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start", position: "relative", pt: 3 }}>
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: children.length === 1 ? "50%" : 24,
                right: children.length === 1 ? "50%" : 24,
                height: 2,
                bgcolor: "divider",
              }}
            />
            {children.map((child) => (
              <Box key={child.id} sx={{ position: "relative" }}>
                <Box sx={{ position: "absolute", top: -24, left: "50%", width: 2, height: 24, bgcolor: "divider" }} />
                <TreeBranch node={child} depth={depth + 1} />
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

function AgentCard({ node, depth }: { node: AgentNode; depth: number }) {
  const tone = roleTone(node.role);
  return (
    <Paper
      elevation={0}
      sx={{
        width: 240,
        minHeight: 126,
        p: 1.5,
        borderRadius: 2,
        border: "1.5px solid",
        borderColor: tone.border,
        bgcolor: alpha(tone.bg, depth === 0 ? 1 : 0.8),
        boxShadow: depth === 0 ? "0 18px 48px rgba(37, 99, 235, 0.12)" : "none",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          <AgentIcon sx={{ color: tone.border }} />
          <Typography fontWeight={900} noWrap>{node.name}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={node.role} color={node.role === "CEO" ? "primary" : "default"} />
          <Chip size="small" label={node.status} variant="outlined" />
          <Chip size="small" label={node.managerType || (node.role === "CEO" ? "CEO" : "AGENT")} variant="outlined" />
        </Stack>
        {node.departmentName && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {node.departmentIcon || ""} {node.departmentName}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontFamily: "Consolas, monospace" }} noWrap>
          {node.templateSlug || "custom"} · {node.model || "default"}
        </Typography>
        <Button component={RouterLink} to={`/admin/ai-agents?agent=${node.id}`} size="small" variant="text" startIcon={<OpenIcon />}>
          فتح الوكيل
        </Button>
      </Stack>
    </Paper>
  );
}
