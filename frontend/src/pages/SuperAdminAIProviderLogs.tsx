import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

type ProviderLog = {
  id: string;
  provider: string;
  keyId?: string | null;
  keyName?: string | null;
  companyId?: string | null;
  conversationId?: string | null;
  customerId?: string | null;
  scope?: string | null;
  action: string;
  status: string;
  latencyMs?: number | null;
  model?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type ProviderLogSummary = {
  total: number;
  success: number;
  failed: number;
  warning: number;
  avgLatencyMs?: number | null;
  byProvider?: Record<string, number>;
  byAction?: Record<string, number>;
  byStatus?: Record<string, number>;
};

type Filters = {
  provider: string;
  keyId: string;
  companyId: string;
  action: string;
  status: string;
  scope: string;
  sinceHours: string;
  limit: string;
};

const PROVIDERS = [
  "",
  "GOOGLE",
  "GROQ",
  "OPENROUTER",
  "NVIDIA",
  "OPENAI",
  "ANTHROPIC",
  "DEEPSEEK",
  "HUGGINGFACE",
  "OLLAMA",
  "CEREBRAS",
  "GITHUB",
  "SAMBANOVA",
  "MISTRAL",
];

const STATUSES = ["", "success", "failed", "warning", "info"];
const SCOPES = ["", "runtime", "admin", "diagnostic"];

const DEFAULT_FILTERS: Filters = {
  provider: "",
  keyId: "",
  companyId: "",
  action: "",
  status: "",
  scope: "",
  sinceHours: "24",
  limit: "200",
};

const statusColor = (status?: string) => {
  if (status === "success") return "success";
  if (status === "failed") return "error";
  if (status === "warning") return "warning";
  return "default";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const formatMetadata = (metadata?: Record<string, unknown> | null) => {
  if (!metadata || Object.keys(metadata).length === 0) return "";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
};

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, minHeight: 86 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
      {value}
    </Typography>
  </Paper>
);

const SuperAdminAIProviderLogs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo<Filters>(() => ({
    provider: searchParams.get("provider") || DEFAULT_FILTERS.provider,
    keyId: searchParams.get("keyId") || DEFAULT_FILTERS.keyId,
    companyId: searchParams.get("companyId") || DEFAULT_FILTERS.companyId,
    action: searchParams.get("action") || DEFAULT_FILTERS.action,
    status: searchParams.get("status") || DEFAULT_FILTERS.status,
    scope: searchParams.get("scope") || DEFAULT_FILTERS.scope,
    sinceHours: searchParams.get("sinceHours") || DEFAULT_FILTERS.sinceHours,
    limit: searchParams.get("limit") || DEFAULT_FILTERS.limit,
  }), [searchParams]);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [logs, setLogs] = useState<ProviderLog[]>([]);
  const [summary, setSummary] = useState<ProviderLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(
    () =>
      tokenManager.createAuthHeaders({
        "Content-Type": "application/json",
      }),
    [],
  );

  const buildQuery = useCallback((source: Filters) => {
    const query = new URLSearchParams();
    Object.entries(source).forEach(([key, value]) => {
      const cleanValue = String(value || "").trim();
      if (cleanValue) {
        query.set(key, cleanValue);
      }
    });
    return query;
  }, []);

  const loadLogs = useCallback(async (source: Filters) => {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery(source);
      const response = await fetch(
        buildApiUrl(`super-admin/ai/provider-logs?${query.toString()}`),
        { headers: getAuthHeaders() },
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load provider logs");
      }

      setLogs(payload.data?.logs || []);
      setSummary(payload.data?.summary || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load provider logs",
      );
    } finally {
      setLoading(false);
    }
  }, [buildQuery, getAuthHeaders]);

  useEffect(() => {
    setFilters(initialFilters);
    loadLogs(initialFilters);
  }, [initialFilters, loadLogs]);

  const applyFilters = () => {
    const query = buildQuery(filters);
    setSearchParams(query);
    loadLogs(filters);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchParams(buildQuery(DEFAULT_FILTERS));
    loadLogs(DEFAULT_FILTERS);
  };

  const summaryByProvider = summary?.byProvider
    ? Object.entries(summary.byProvider).slice(0, 4)
    : [];
  const summaryByAction = summary?.byAction
    ? Object.entries(summary.byAction).slice(0, 5)
    : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Stack spacing={1}>
          <Button
            component={RouterLink}
            to="/super-admin/ai-providers"
            startIcon={<ArrowBackIcon />}
            sx={{ alignSelf: "flex-start" }}
          >
            Back to AI providers
          </Button>
          <Typography variant="h4" fontWeight={800}>
            AI provider runtime logs
          </Typography>
          <Typography color="text.secondary">
            سجل فعلي لاختيار المفاتيح، نجاح التوليد، فشل الـ fallback، واختبارات المفاتيح.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => loadLogs(filters)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            select
            label="Provider"
            value={filters.provider}
            onChange={(event) =>
              setFilters((current) => ({ ...current, provider: event.target.value }))
            }
            sx={{ minWidth: 170 }}
          >
            {PROVIDERS.map((provider) => (
              <MenuItem key={provider || "all"} value={provider}>
                {provider || "All providers"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Key ID"
            value={filters.keyId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyId: event.target.value }))
            }
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Company ID"
            value={filters.companyId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, companyId: event.target.value }))
            }
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Action"
            value={filters.action}
            onChange={(event) =>
              setFilters((current) => ({ ...current, action: event.target.value }))
            }
            placeholder="generation_success"
            sx={{ minWidth: 200 }}
          />
          <TextField
            select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
            sx={{ minWidth: 150 }}
          >
            {STATUSES.map((status) => (
              <MenuItem key={status || "all"} value={status}>
                {status || "All statuses"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Scope"
            value={filters.scope}
            onChange={(event) =>
              setFilters((current) => ({ ...current, scope: event.target.value }))
            }
            sx={{ minWidth: 150 }}
          >
            {SCOPES.map((scope) => (
              <MenuItem key={scope || "all"} value={scope}>
                {scope || "All scopes"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Since hours"
            value={filters.sinceHours}
            onChange={(event) =>
              setFilters((current) => ({ ...current, sinceHours: event.target.value }))
            }
            sx={{ width: 130 }}
          />
          <TextField
            label="Limit"
            value={filters.limit}
            onChange={(event) =>
              setFilters((current) => ({ ...current, limit: event.target.value }))
            }
            sx={{ width: 110 }}
          />
          <Button
            variant="contained"
            startIcon={<FilterListIcon />}
            onClick={applyFilters}
            disabled={loading}
          >
            Apply
          </Button>
          <Button variant="text" onClick={resetFilters} disabled={loading}>
            Reset
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        <SummaryCard label="Total events" value={summary?.total ?? 0} />
        <SummaryCard label="Success" value={summary?.success ?? 0} />
        <SummaryCard label="Failed" value={summary?.failed ?? 0} />
        <SummaryCard label="Warnings" value={summary?.warning ?? 0} />
        <SummaryCard
          label="Avg latency"
          value={
            Number.isFinite(Number(summary?.avgLatencyMs))
              ? `${summary?.avgLatencyMs}ms`
              : "No samples"
          }
        />
      </Box>

      {(summaryByProvider.length > 0 || summaryByAction.length > 0) && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight={800} mb={1}>
                Top providers
              </Typography>
              <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
                {summaryByProvider.map(([provider, count]) => (
                  <Chip key={provider} label={`${provider}: ${count}`} variant="outlined" />
                ))}
              </Stack>
            </Box>
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight={800} mb={1}>
                Top actions
              </Typography>
              <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
                {summaryByAction.map(([action, count]) => (
                  <Chip key={action} label={`${action}: ${count}`} variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 1 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Latency</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Metadata</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Box p={3} display="flex" justifyContent="center">
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Alert severity="info">No provider logs match the current filters.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const metadataText = formatMetadata(log.metadata);
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={log.provider} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        {log.keyId ? (
                          <Button
                            component={RouterLink}
                            to={`/super-admin/ai-providers/keys/${log.keyId}`}
                            size="small"
                            startIcon={<KeyIcon fontSize="small" />}
                            sx={{ justifyContent: "flex-start", px: 0, textTransform: "none" }}
                          >
                            {log.keyName || log.keyId}
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={log.status}
                          color={statusColor(log.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{log.model || "—"}</TableCell>
                      <TableCell>
                        {Number.isFinite(Number(log.latencyMs))
                          ? `${log.latencyMs}ms`
                          : "—"}
                      </TableCell>
                      <TableCell>{log.scope || "runtime"}</TableCell>
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Typography variant="body2" title={log.message || ""} noWrap>
                          {log.message || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography
                          variant="caption"
                          component="pre"
                          sx={{
                            m: 0,
                            maxHeight: 120,
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                          }}
                        >
                          {metadataText || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SuperAdminAIProviderLogs;
