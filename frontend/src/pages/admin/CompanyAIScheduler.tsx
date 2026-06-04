import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Switch,
} from "@mui/material";
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Translate as TranslateIcon,
  CheckCircle as SuccessIcon,
  Error as FailedIcon,
  Refresh as RefreshIcon,
  Pause as PauseIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

interface ScheduledJob {
  id: string;
  naturalInput: string;
  cronExpression: string;
  taskType: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: "SUCCESS" | "FAILED" | null;
  nextRun: string;
  runCount: number;
}

const DEFAULT_JOBS: ScheduledJob[] = [
  {
    id: "job_1",
    naturalInput: "كل يوم ثلاثاء الساعة 6 مساءً، أرسل رسالة واتساب للعملاء الذين تركوا سلاتهم فارغة اليوم",
    cronExpression: "0 18 * * 2",
    taskType: "ABANDONED_CART_REMINDER",
    enabled: true,
    lastRun: "2026-05-20T18:00:00",
    lastStatus: "SUCCESS",
    nextRun: "2026-05-27T18:00:00",
    runCount: 8,
  },
  {
    id: "job_2",
    naturalInput: "كل يوم أحد الساعة 9 صباحاً، أرسل تقرير أداء مبيعات الأسبوع عبر تلغرام",
    cronExpression: "0 9 * * 0",
    taskType: "WEEKLY_SALES_REPORT",
    enabled: true,
    lastRun: "2026-05-18T09:00:00",
    lastStatus: "SUCCESS",
    nextRun: "2026-05-25T09:00:00",
    runCount: 12,
  },
  {
    id: "job_3",
    naturalInput: "كل يوم الساعة 11 مساءً، راجع المنتجات التي مخزونها أقل من 5 قطع وأرسل تنبيه",
    cronExpression: "0 23 * * *",
    taskType: "LOW_STOCK_ALERT",
    enabled: false,
    lastRun: "2026-05-19T23:00:00",
    lastStatus: "FAILED",
    nextRun: "—",
    runCount: 5,
  },
];

const EXAMPLE_COMMANDS = [
  "كل يوم جمعة الساعة 10 صباحاً، أرسل عرض الأسبوع للعملاء المميزين",
  "كل ساعة، تحقق من حالة المخزون وأرسل تنبيه إذا انخفض عن 10 قطع",
  "كل يوم الساعة 8 صباحاً، أرسل ملخص الطلبات الجديدة لقناة تلغرام",
];

export default function CompanyAIScheduler() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [naturalInput, setNaturalInput] = useState("");
  const [parsedCron, setParsedCron] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const normalizeJob = (job: any): ScheduledJob => ({
    id: String(job.id),
    naturalInput: String(job.description || job.naturalInput || job.parsedDescription || ""),
    cronExpression: String(job.cronExpression || job.cron || "—"),
    taskType: String(job.taskType || "GENERAL"),
    enabled: job.status !== "CANCELLED",
    lastRun: job.lastRun || null,
    lastStatus: job.lastStatus || null,
    nextRun: job.nextRun || "—",
    runCount: Number(job.runCount || 0),
  });

  const fetchJobs = async () => {
    try {
      const response = await fetch(buildApiUrl("agent/scheduler/jobs"), {
        headers: tokenManager.createAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to load scheduled jobs");
      const data = await response.json();
      setJobs(Array.isArray(data?.jobs) ? data.jobs.map(normalizeJob) : []);
    } catch (err) {
      console.warn("Agent scheduler API offline.", err);
      setError("تعذر تحميل المهام المجدولة من الخادم.");
    }
  };

  const handleParseAndSchedule = async () => {
    if (!naturalInput.trim()) {
      setError("يرجى كتابة أمر الجدولة باللغة الطبيعية.");
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("agent/scheduler/jobs"), {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          description: naturalInput.trim(),
          taskType: "CUSTOM_NL_TASK",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to schedule job");

      const scheduledJob = normalizeJob(data.job);
      setParsedCron(scheduledJob.cronExpression);
      setJobs((prev) => [scheduledJob, ...prev]);
      setNaturalInput("");
      setSuccess("تم ترجمة الأمر اللغوي بنجاح وجدولة المهمة.");
    } catch (err) {
      setError("فشل تحليل أو جدولة الأمر اللغوي.");
    } finally {
      setIsParsing(false);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const handleToggleJob = async (id: string) => {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    if (!job.enabled) {
      setError("لإعادة تفعيل مهمة ملغاة، أنشئها مرة أخرى من الأمر اللغوي.");
      return;
    }

    await handleDeleteJob(id, false);
  };

  const handleDeleteJob = async (id: string, removeFromList = true) => {
    try {
      const response = await fetch(buildApiUrl(`agent/scheduler/jobs/${id}`), {
        method: "DELETE",
        headers: tokenManager.createAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to cancel job");
      setJobs((prev) =>
        removeFromList
          ? prev.filter((job) => job.id !== id)
          : prev.map((job) => (job.id === id ? { ...job, enabled: false, nextRun: "—" } : job))
      );
      setSuccess(removeFromList ? "تم حذف المهمة المجدولة بنجاح." : "تم تعطيل المهمة المجدولة.");
    } catch (err) {
      setError("فشل حذف أو تعطيل المهمة المجدولة.");
    } finally {
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`agent/scheduler/jobs/${id}/run`), {
        method: "POST",
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to run job");
      const executionStatus: ScheduledJob["lastStatus"] =
        data.execution?.status === "FAILED" ? "FAILED" : "SUCCESS";
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? { ...job, lastRun: new Date().toISOString(), lastStatus: executionStatus, runCount: job.runCount + 1 }
            : job
        )
      );
      setSuccess("تم إطلاق تنفيذ يدوي فوري للمهمة بنجاح!");
    } catch (err) {
      setError("فشل التشغيل اليدوي للمهمة.");
    } finally {
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <Box sx={{ direction: "rtl", p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold", mb: 1, color: "primary.main" }}>
          📅 الجدولة التلقائية باللغة الطبيعية (NL Cron Scheduler)
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: "Cairo, sans-serif" }}>
          اكتب أمرك باللغة العربية وسيقوم النظام بترجمته لمهمة دورية مجدولة تعمل تلقائياً.
        </Typography>
      </Box>

      {/* Notifications */}
      {success && <Alert severity="success" sx={{ mb: 3, fontFamily: "Cairo, sans-serif", borderRadius: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3, fontFamily: "Cairo, sans-serif", borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Smart Input Section */}
      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: "0 8px 30px rgba(0,0,0,0.06)", border: "1px solid rgba(79, 70, 229, 0.15)", overflow: "visible" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold", mb: 2 }}>
            ✨ اكتب أمر الجدولة باللغة العربية البسيطة:
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder={'مثال: "كل يوم ثلاثاء الساعة 6 مساءً، أرسل رسالة واتساب للعملاء الذين تركوا سلاتهم فارغة اليوم"'}
            variant="outlined"
            dir="rtl"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontFamily: "Cairo, sans-serif",
                fontSize: 16,
              },
            }}
          />

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              startIcon={<TranslateIcon />}
              onClick={handleParseAndSchedule}
              disabled={isParsing || !naturalInput.trim()}
              sx={{ fontFamily: "Cairo, sans-serif", borderRadius: 2, px: 4, py: 1.2, boxShadow: 3 }}
            >
              {isParsing ? "جارٍ الترجمة والتحليل..." : "ترجمة وجدولة المهمة"}
            </Button>

            {parsedCron && (
              <Chip
                icon={<ScheduleIcon />}
                label={`Cron: ${parsedCron}`}
                color="success"
                variant="outlined"
                sx={{ fontFamily: "monospace", fontSize: 14 }}
              />
            )}
          </Stack>

          {/* Quick Examples */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="caption" sx={{ fontFamily: "Cairo, sans-serif", color: "text.secondary", mb: 1, display: "block" }}>
            💡 أمثلة سريعة (اضغط للنسخ):
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {EXAMPLE_COMMANDS.map((cmd, i) => (
              <Chip
                key={i}
                label={cmd.length > 60 ? cmd.slice(0, 60) + "..." : cmd}
                variant="outlined"
                size="small"
                onClick={() => setNaturalInput(cmd)}
                sx={{ fontFamily: "Cairo, sans-serif", cursor: "pointer", "&:hover": { bgcolor: "primary.50" } }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Active Jobs Table */}
      <Typography variant="h6" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold", mb: 2 }}>
        📋 المهام المجدولة النشطة ({jobs.length} مهمة)
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>الأمر اللغوي</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>Cron Expression</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>آخر تشغيل</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>النتيجة</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>التشغيل التالي</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>عدد التشغيلات</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>حالة</TableCell>
              <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "bold" }}>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow
                key={job.id}
                sx={{
                  opacity: job.enabled ? 1 : 0.5,
                  transition: "opacity 0.3s",
                  "&:hover": { bgcolor: "rgba(79, 70, 229, 0.02)" },
                }}
              >
                <TableCell sx={{ fontFamily: "Cairo, sans-serif", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {job.naturalInput}
                </TableCell>
                <TableCell>
                  <Chip label={job.cronExpression} size="small" sx={{ fontFamily: "monospace" }} />
                </TableCell>
                <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontSize: 13 }}>
                  {job.lastRun ? new Date(job.lastRun).toLocaleString("ar-EG") : "—"}
                </TableCell>
                <TableCell>
                  {job.lastStatus === "SUCCESS" && <Chip icon={<SuccessIcon />} label="نجح" color="success" size="small" />}
                  {job.lastStatus === "FAILED" && <Chip icon={<FailedIcon />} label="فشل" color="error" size="small" />}
                  {!job.lastStatus && <Typography variant="caption" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell sx={{ fontFamily: "Cairo, sans-serif", fontSize: 13 }}>
                  {job.nextRun !== "—" && job.nextRun !== "قريباً"
                    ? new Date(job.nextRun).toLocaleString("ar-EG")
                    : job.nextRun}
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>{job.runCount}</TableCell>
                <TableCell>
                  <Switch checked={job.enabled} onChange={() => handleToggleJob(job.id)} color="primary" size="small" />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="تشغيل فوري يدوي">
                      <IconButton size="small" color="primary" onClick={() => handleRunNow(job.id)} disabled={!job.enabled}>
                        <PlayIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف المهمة">
                      <IconButton size="small" color="error" onClick={() => handleDeleteJob(job.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
