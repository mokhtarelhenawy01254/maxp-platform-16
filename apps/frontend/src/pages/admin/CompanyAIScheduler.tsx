import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, Languages, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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
    <div className="p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-primary" style={{ fontFamily: "Cairo, sans-serif" }}>
          📅 الجدولة التلقائية باللغة الطبيعية (NL Cron Scheduler)
        </h1>
        <p className="text-muted-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
          اكتب أمرك باللغة العربية وسيقوم النظام بترجمته لمهمة دورية مجدولة تعمل تلقائياً.
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success" style={{ fontFamily: "Cairo, sans-serif" }}>
          {success}
        </div>
      )}
      {error && (
        <div
          className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          style={{ fontFamily: "Cairo, sans-serif" }}
          role="alert"
        >
          <span>{error}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => setError(null)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      )}

      {/* Smart Input Section */}
      <Card
        className="mb-8 overflow-visible"
        style={{
          borderRadius: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          border: "1px solid rgba(79, 70, 229, 0.15)",
        }}
      >
        <CardContent className="p-6 md:p-8">
          <h2 className="mb-4 text-lg font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>
            ✨ اكتب أمر الجدولة باللغة العربية البسيطة:
          </h2>

          <Textarea
            rows={3}
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder={'مثال: "كل يوم ثلاثاء الساعة 6 مساءً، أرسل رسالة واتساب للعملاء الذين تركوا سلاتهم فارغة اليوم"'}
            className="mb-4 text-base"
            style={{ fontFamily: "Cairo, sans-serif", borderRadius: 8 }}
            dir="rtl"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button
              variant="default"
              onClick={handleParseAndSchedule}
              disabled={isParsing || !naturalInput.trim()}
              className="rounded-lg px-8 py-3 shadow-md"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
              {isParsing ? (
                <LoadingSpinner size="sm" color="white" className="ml-2" />
              ) : (
                <Languages className="ml-2 size-4" />
              )}
              {isParsing ? "جارٍ الترجمة والتحليل..." : "ترجمة وجدولة المهمة"}
            </Button>

            {parsedCron && (
              <Badge variant="outline" className="font-mono text-sm">
                <CalendarClock className="ml-1 size-3.5" />
                {`Cron: ${parsedCron}`}
              </Badge>
            )}
          </div>

          <Separator className="my-6" />

          <span className="mb-2 block text-xs text-muted-foreground" style={{ fontFamily: "Cairo, sans-serif" }}>
            💡 أمثلة سريعة (اضغط للنسخ):
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_COMMANDS.map((cmd, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-primary/5"
                style={{ fontFamily: "Cairo, sans-serif" }}
                onClick={() => setNaturalInput(cmd)}
              >
                {cmd.length > 60 ? cmd.slice(0, 60) + "..." : cmd}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs Table */}
      <h2 className="mb-4 text-lg font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>
        📋 المهام المجدولة النشطة ({jobs.length} مهمة)
      </h2>

      <div className="overflow-hidden rounded-xl border" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>الأمر اللغوي</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>Cron Expression</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>آخر تشغيل</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>النتيجة</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>التشغيل التالي</TableHead>
                <TableHead className="text-center font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>عدد التشغيلات</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>حالة</TableHead>
                <TableHead className="font-bold" style={{ fontFamily: "Cairo, sans-serif" }}>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.id}
                  className={cn(
                    "transition-opacity",
                    !job.enabled && "opacity-50",
                  )}
                >
                  <TableCell
                    className="max-w-[300px] overflow-hidden text-ellipsis"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  >
                    {job.naturalInput}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{job.cronExpression}</Badge>
                  </TableCell>
                  <TableCell className="text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
                    {job.lastRun ? new Date(job.lastRun).toLocaleString("ar-EG") : "—"}
                  </TableCell>
                  <TableCell>
                    {job.lastStatus === "SUCCESS" && (
                      <Badge variant="outline" className="text-success">
                        <CheckCircle2 className="ml-1 size-3" />
                        نجح
                      </Badge>
                    )}
                    {job.lastStatus === "FAILED" && (
                      <Badge variant="outline" className="text-destructive">
                        <AlertCircle className="ml-1 size-3" />
                        فشل
                      </Badge>
                    )}
                    {!job.lastStatus && (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
                    {job.nextRun !== "—" && job.nextRun !== "قريباً"
                      ? new Date(job.nextRun).toLocaleString("ar-EG")
                      : job.nextRun}
                  </TableCell>
                  <TableCell className="text-center font-bold">{job.runCount}</TableCell>
                  <TableCell>
                    <Switch
                      size="sm"
                      checked={job.enabled}
                      onCheckedChange={() => handleToggleJob(job.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRunNow(job.id)}
                        disabled={!job.enabled}
                      >
                        <Play className="size-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
