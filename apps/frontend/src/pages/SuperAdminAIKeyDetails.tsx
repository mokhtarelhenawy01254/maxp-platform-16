import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Chat as ChatIcon,
  ErrorOutline as ErrorIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Science as TestIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

type AiKeyDiagnostic = {
  severity: "critical" | "warning" | "info" | string;
  code: string;
  message: string;
};

type AiKeyModel = {
  id: string;
  modelName: string;
  isEnabled: boolean;
  priority: number;
  usage?: Record<string, unknown>;
};

type AiKeyDetails = {
  key: {
    id: string;
    name: string;
    provider: string;
    baseUrl?: string | null;
    isActive: boolean;
    companyId?: string | null;
    company?: {
      id: string;
      name: string;
      email?: string;
      isActive?: boolean;
    } | null;
    keyType: string;
    maskedApiKey?: string | null;
    currentUsage: number;
    maxRequestsPerDay: number;
    priority: number;
    createdAt: string;
    updatedAt: string;
  };
  activeModel?: AiKeyModel | null;
  models: AiKeyModel[];
  routing: {
    lastSelectedAt?: string | null;
    lastSelectedModel?: string | null;
    lastSelectedPool?: string | null;
    lastSucceededAt?: string | null;
    lastSucceededModel?: string | null;
    lastSucceededPool?: string | null;
    lastTestedAt?: string | null;
    lastTestStatus?: string | null;
    lastTestLatencyMs?: number | null;
    lastTestError?: string | null;
    isPreferredForProvider?: boolean;
    isActiveProvider?: boolean;
    defaultProvider?: string | null;
    failoverEnabled?: boolean;
  };
  usage: {
    used: number;
    limit?: number | null;
    currentUsage: number;
    maxRequestsPerDay: number;
    selectionCount: number;
    successCount: number;
    successRate?: number | null;
    testCount: number;
  };
  health: {
    status: "healthy" | "warning" | "critical" | "inactive" | string;
    diagnostics: AiKeyDiagnostic[];
  };
};

type ProviderLog = {
  id: string;
  provider: string;
  keyId?: string | null;
  keyName?: string | null;
  companyId?: string | null;
  action: string;
  status: string;
  latencyMs?: number | null;
  model?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type TestChatResult = {
  ok: boolean;
  status: string;
  reply: string;
  latencyMs: number;
  provider: string;
  model: string;
  company?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
};

const statusColor = (status?: string) => {
  if (status === "healthy" || status === "success") return "success";
  if (status === "warning" || status === "inactive") return "warning";
  if (status === "critical" || status === "failed") return "error";
  return "default";
};

const diagnosticIcon = (severity: string) => {
  if (severity === "critical") return <ErrorIcon fontSize="small" />;
  if (severity === "warning") return <WarningIcon fontSize="small" />;
  return <CheckCircleIcon fontSize="small" />;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const Metric = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, borderRadius: 1, minHeight: 92, bgcolor: "background.paper" }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ mt: 0.5, wordBreak: "break-word" }}>
      {value}
    </Typography>
  </Paper>
);

const SuperAdminAIKeyDetails = () => {
  const { id } = useParams();
  const [details, setDetails] = useState<AiKeyDetails | null>(null);
  const [logs, setLogs] = useState<ProviderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatTesting, setChatTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("العميل بيسأل: المنتج ده مناسب للخروج اليومي؟");
  const [testCompany, setTestCompany] = useState("Wofod");
  const [testChatResult, setTestChatResult] = useState<TestChatResult | null>(
    null,
  );

  const getAuthHeaders = useCallback(
    () =>
      tokenManager.createAuthHeaders({
        "Content-Type": "application/json",
      }),
    [],
  );

  const loadDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/details`),
        { headers: getAuthHeaders() },
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load key details");
      }

      setDetails(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load key details",
      );
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, id]);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/logs?limit=40`),
        { headers: getAuthHeaders() },
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load provider logs");
      }

      setLogs(payload.data?.logs || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load provider logs",
      );
    } finally {
      setLogsLoading(false);
    }
  }, [getAuthHeaders, id]);

  useEffect(() => {
    loadDetails();
    loadLogs();
  }, [loadDetails, loadLogs]);

  const testKey = async () => {
    if (!id) return;
    setTesting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/test`), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Key test failed");
      }

      await loadDetails();
      await loadLogs();
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : "Key test failed",
      );
    } finally {
      setTesting(false);
    }
  };

  const runTestChat = async () => {
    if (!id) return;
    setChatTesting(true);
    setChatError(null);
    setTestChatResult(null);

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/test-chat`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            message: testMessage,
            companyName: testCompany,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "AI key chat failed");
      }

      setTestChatResult(payload.data);
      await loadLogs();
    } catch (testError) {
      setChatError(
        testError instanceof Error ? testError.message : "AI key chat failed",
      );
      await loadLogs();
    } finally {
      setChatTesting(false);
    }
  };

  if (loading && !details) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
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
            Back to providers
          </Button>
          <Typography variant="h4" fontWeight={800}>
            Provider key diagnostics
          </Typography>
          <Typography color="text.secondary">
            تفاصيل صحة المفتاح، آخر اختبار، آخر استخدام فعلي، وهل يدخل مسار
            الإنتاج أم لا.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadDetails();
              loadLogs();
            }}
            disabled={loading || testing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
            onClick={testKey}
            disabled={testing || !details}
          >
            Test key
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {details && (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h5" fontWeight={800}>
                    {details.key.name}
                  </Typography>
                  <Chip label={details.key.provider} variant="outlined" />
                  <Chip
                    label={details.health.status}
                    color={statusColor(details.health.status)}
                  />
                  <Chip
                    label={details.key.isActive ? "Active" : "Inactive"}
                    color={details.key.isActive ? "success" : "warning"}
                    variant="outlined"
                  />
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                  }}
                >
                  {details.key.maskedApiKey || "No key fingerprint"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {details.key.company
                    ? `${details.key.company.name} / ${details.key.company.email || details.key.company.id}`
                    : details.key.keyType}
                </Typography>
              </Stack>

              <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Typography variant="body2" color="text.secondary">
                  Base URL: {details.key.baseUrl || "Provider default"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(details.key.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(details.key.updatedAt)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            <Metric
              label="Active model"
              value={details.activeModel?.modelName || "No enabled model"}
            />
            <Metric
              label="Routing"
              value={
                details.routing.isActiveProvider
                  ? "Active provider"
                  : details.routing.isPreferredForProvider
                    ? "Preferred key"
                    : "Not current route"
              }
            />
            <Metric
              label="Success rate"
              value={
                details.usage.successRate === null ||
                details.usage.successRate === undefined
                  ? "No traffic"
                  : `${details.usage.successRate}%`
              }
            />
            <Metric
              label="Daily usage"
              value={`${details.usage.currentUsage}/${details.usage.maxRequestsPerDay}`}
            />
          </Box>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Typography variant="h6" fontWeight={800} mb={1.5}>
              Diagnostics
            </Typography>
            {details.health.diagnostics.length === 0 ? (
              <Alert severity="success">
                No key-level problems detected by the current telemetry.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {details.health.diagnostics.map((item) => (
                  <Alert
                    key={item.code}
                    icon={diagnosticIcon(item.severity)}
                    severity={
                      item.severity === "critical"
                        ? "error"
                        : item.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    <strong>{item.code}</strong> — {item.message}
                  </Alert>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={2}
              mb={2}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Diagnostic chat
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  اختبار مباشر لنفس المفتاح والموديل بدون إرسال أي رسالة للعميل.
                </Typography>
              </Box>
              <Chip
                label={testChatResult?.status || "not tested"}
                color={statusColor(testChatResult?.status || "")}
                variant="outlined"
                sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
              />
            </Stack>

            <Stack spacing={1.5}>
              <TextField
                label="Company context"
                value={testCompany}
                onChange={(event) => setTestCompany(event.target.value)}
                helperText="للتون فقط في الاختبار. الافتراضي Wofod."
                fullWidth
              />
              <TextField
                label="Test message"
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={
                  chatTesting ? <CircularProgress size={16} /> : <ChatIcon />
                }
                onClick={runTestChat}
                disabled={chatTesting || !testMessage.trim()}
                sx={{ alignSelf: "flex-start" }}
              >
                Send diagnostic chat
              </Button>

              {chatError && <Alert severity="error">{chatError}</Alert>}
              {testChatResult && (
                <Alert
                  severity={testChatResult.ok ? "success" : "warning"}
                  sx={{ alignItems: "flex-start" }}
                >
                  <Stack spacing={0.75}>
                    <Typography fontWeight={800}>
                      {testChatResult.provider} / {testChatResult.model} /{" "}
                      {testChatResult.latencyMs}ms
                    </Typography>
                    <Typography whiteSpace="pre-wrap">
                      {testChatResult.reply || "Empty response"}
                    </Typography>
                    {testChatResult.company && (
                      <Typography variant="caption" color="text.secondary">
                        Company: {testChatResult.company.name}
                      </Typography>
                    )}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1.5}
              mb={1.5}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Provider logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  آخر اختيارات وتشغيل واختبارات لهذا المفتاح.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={
                    logsLoading ? <CircularProgress size={14} /> : <RefreshIcon />
                  }
                  onClick={loadLogs}
                  disabled={logsLoading}
                >
                  Refresh logs
                </Button>
                <Button
                  component={RouterLink}
                  to={`/super-admin/ai-providers/logs?keyId=${details.key.id}`}
                  variant="outlined"
                  endIcon={<LaunchIcon />}
                >
                  Full logs
                </Button>
              </Stack>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Latency</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Alert severity="info">
                        No provider logs recorded for this key yet.
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
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
                      <TableCell sx={{ maxWidth: 420 }}>
                        <Typography variant="body2" noWrap title={log.message || ""}>
                          {log.message || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Typography variant="h6" fontWeight={800} mb={1.5}>
              Runtime evidence
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Last selected:</strong>{" "}
                  {formatDate(details.routing.lastSelectedAt)}
                </Typography>
                <Typography variant="body2">
                  <strong>Selected model:</strong>{" "}
                  {details.routing.lastSelectedModel || "None"}
                </Typography>
                <Typography variant="body2">
                  <strong>Selected pool:</strong>{" "}
                  {details.routing.lastSelectedPool || "None"}
                </Typography>
              </Stack>
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Last success:</strong>{" "}
                  {formatDate(details.routing.lastSucceededAt)}
                </Typography>
                <Typography variant="body2">
                  <strong>Success model:</strong>{" "}
                  {details.routing.lastSucceededModel || "None"}
                </Typography>
                <Typography variant="body2">
                  <strong>Success pool:</strong>{" "}
                  {details.routing.lastSucceededPool || "None"}
                </Typography>
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={0.75}>
              <Typography variant="body2">
                <strong>Last live test:</strong>{" "}
                {formatDate(details.routing.lastTestedAt)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" component="span">
                  <strong>Test status:</strong>
                </Typography>
                <Chip
                  size="small"
                  label={details.routing.lastTestStatus || "Never tested"}
                  color={statusColor(details.routing.lastTestStatus || "")}
                />
              </Box>
              <Typography variant="body2">
                <strong>Latency:</strong>{" "}
                {details.routing.lastTestLatencyMs
                  ? `${details.routing.lastTestLatencyMs}ms`
                  : "No measurement"}
              </Typography>
              {details.routing.lastTestError && (
                <Alert severity="error">{details.routing.lastTestError}</Alert>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
            <Typography variant="h6" fontWeight={800} mb={1.5}>
              Configured models
            </Typography>
            <Stack spacing={1}>
              {details.models.map((model) => (
                <Stack
                  key={model.id}
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Typography fontWeight={700}>{model.modelName}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={model.isEnabled ? "Enabled" : "Disabled"}
                      color={model.isEnabled ? "success" : "default"}
                      variant="outlined"
                    />
                    <Chip size="small" label={`Priority ${model.priority}`} />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default SuperAdminAIKeyDetails;
