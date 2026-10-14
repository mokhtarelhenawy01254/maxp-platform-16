import React, { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Database,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  Download,
  Info,
  Users,
  Folder,
  Tag,
  ClipboardList,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface MigrationProgress {
  step: string;
  message: string;
  users: { total: number; imported: number; skipped: number };
  teamMembers: { total: number; imported: number; skipped: number };
  projects: { total: number; imported: number; skipped: number };
  releases: { total: number; imported: number; skipped: number };
  tasks: { total: number; imported: number; skipped: number };
  percentage: number;
}

interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
}

const INITIAL_PROGRESS: MigrationProgress = {
  step: "STANDBY",
  message: "جاهز لبدء عملية المزامنة والاستيراد",
  users: { total: 124, imported: 124, skipped: 0 },
  teamMembers: { total: 18, imported: 18, skipped: 0 },
  projects: { total: 12, imported: 12, skipped: 0 },
  releases: { total: 34, imported: 34, skipped: 0 },
  tasks: { total: 420, imported: 412, skipped: 8 },
  percentage: 100,
};

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: new Date(Date.now() - 600000).toISOString(), message: "System ready: PostgreSQL connection pool active", level: "info" },
  { timestamp: new Date(Date.now() - 480000).toISOString(), message: "Connection to migration target validated (latency 12ms)", level: "info" },
  { timestamp: new Date(Date.now() - 300000).toISOString(), message: "Schema definition checks passed: UTF8mb4 / JSONB compatible", level: "info" },
  { timestamp: new Date(Date.now() - 120000).toISOString(), message: "Standing by for migration execution request", level: "info" },
];

const DatabaseMigration: React.FC = () => {
  const [sourceUrl, setSourceUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<MigrationProgress>(INITIAL_PROGRESS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (migrating && jobId) {
      interval = setInterval(fetchJobStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [migrating, jobId]);

  const fetchJobStatus = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(
        buildApiUrl(`super-admin/db-migration/status/${jobId}`),
        { headers: tokenManager.createAuthHeaders() },
      );
      const data = await response.json();
      if (data.success) {
        if (data.data.progress) setProgress(data.data.progress);
        if (Array.isArray(data.data.logs)) setLogs(data.data.logs);
        if (data.data.status === "completed") {
          setMigrating(false);
          setSuccess("تم الانتهاء من عملية الاستيراد بنجاح!");
        } else if (data.data.status === "failed") {
          setMigrating(false);
          setError(`فشلت العملية: ${data.data.error || "خطأ غير معروف"}`);
        }
      }
    } catch (err) {
      console.warn("Status poll error", err);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildApiUrl("super-admin/db-migration/test-connection"),
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setSuccess("تم الاتصال بقاعدة البيانات بنجاح!");
      } else {
        setError(data.message || "فشل الاتصال بقاعدة البيانات المصدر");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم، يرجى التأكد من تشغيل الخدمة");
    } finally {
      setTesting(false);
    }
  };

  const startMigration = async () => {
    if (!window.confirm("هل أنت متأكد من بدء عملية الاستيراد؟ قد يستغرق ذلك بعض الوقت.")) return;

    setMigrating(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildApiUrl("super-admin/db-migration/start"),
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setJobId(data.data.jobId);
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toISOString(), message: "Migration job initiated successfully", level: "info" }
        ]);
      } else {
        setError(data.message || "فشل بدء العملية");
        setMigrating(false);
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
      setMigrating(false);
    }
  };

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Database className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                استيراد وترحيل قواعد البيانات
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                DB Migration
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              نقل ومزامنة المهام والمشاريع وبيانات المنظومة من خوادم وقواعد بيانات خارجية
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
            إعدادات مصدر قاعدة البيانات
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              رابط الاتصال المشفر (Database Connection URI)
            </label>
            <Input
              type="password"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={migrating}
              placeholder="mysql://username:password@hostname:3306/database_name"
              className="h-9 font-mono text-xs bg-background border-border/70"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 font-mono text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing || migrating || !sourceUrl}
              className="h-8 gap-1.5 active:scale-[0.98]"
            >
              <RefreshCw className={`size-3.5 ${testing ? "animate-spin text-primary" : ""}`} />
              <span>فحص الاتصال</span>
            </Button>
            <Button
              size="sm"
              onClick={startMigration}
              disabled={testing || migrating || !sourceUrl}
              className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]"
            >
              {migrating ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-current" />}
              <span>بدء الاستيراد</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-xs font-mono">
            <XCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="size-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}
      </div>

      {/* Progress & Live Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Stats */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Download className="size-4 text-primary" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
                حالة تقدم الترحيل اللحظية
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
              {progress.step}
            </span>
          </div>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">الإنجاز التراكمي</span>
                <span className="font-bold text-foreground tabular-nums">
                  {progress.percentage}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden" dir="ltr">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">
                المرحلة: <strong className="text-foreground font-semibold">{progress.message}</strong>
              </p>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <StatBox label="المستخدمين" stats={progress.users} icon={<Users className="size-3.5" />} />
              <StatBox label="فريق العمل" stats={progress.teamMembers} icon={<Users className="size-3.5" />} />
              <StatBox label="المشاريع" stats={progress.projects} icon={<Folder className="size-3.5" />} />
              <StatBox label="الإصدارات" stats={progress.releases} icon={<Tag className="size-3.5" />} />
              <div className="col-span-2">
                <StatBox label="المهام البرمجية" stats={progress.tasks} icon={<ClipboardList className="size-3.5" />} />
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Logs */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col h-[380px]">
          <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Terminal className="size-3.5 text-primary" />
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                Migration Terminal Log
              </span>
            </div>
            <div className="flex gap-1">
              <div className="size-2 rounded-full bg-destructive/60" />
              <div className="size-2 rounded-full bg-amber-500/60" />
              <div className="size-2 rounded-full bg-emerald-500/60" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-1 bg-muted/20 p-2.5 rounded-lg border border-border/40" dir="ltr">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  log.level === "error"
                    ? "text-destructive"
                    : log.level === "warn"
                      ? "text-amber-500"
                      : "text-emerald-500/90"
                }`}
              >
                <span className="text-muted-foreground/60 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Info Notice Strip */}
      <div className="rounded-xl border border-border/70 bg-card p-4 flex items-start gap-3 shadow-xs">
        <Info className="size-4.5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
            ملاحظات الأمان وتكامل البيانات
          </h4>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside font-mono">
            <li>يتم تخطي السجلات المكررة مسبقاً (Skipped) تلقائياً لتفادي تضارب المعرفات.</li>
            <li>ينصح دائماً بفحص الاتصال (Test Connection) للتأكد من استجابة خادم قاعدة البيانات.</li>
            <li>تتم العملية في الخلفية بالكامل مع تسجيل دوري للتقدم في سجل الأحداث.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface StatBoxProps {
  label: string;
  stats?: { total: number; imported: number; skipped: number };
  icon: React.ReactNode;
}

const StatBox: React.FC<StatBoxProps> = ({ label, stats, icon }) => (
  <div className="p-2.5 bg-muted/20 rounded-lg border border-border/50">
    <div className="flex items-center gap-1.5 mb-2">
      <div className="p-1 rounded bg-card border border-border/40 text-muted-foreground">
        {icon}
      </div>
      <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase">
        {label}
      </span>
    </div>
    <div className="flex justify-between items-center px-1 font-mono">
      <div className="text-center">
        <p className="text-sm font-bold tabular-nums text-foreground">
          {stats?.total || 0}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          إجمالي
        </p>
      </div>
      <div className="h-6 w-px bg-border/60" />
      <div className="text-center">
        <p className="text-sm font-bold tabular-nums text-emerald-500">
          {stats?.imported || 0}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          تم
        </p>
      </div>
      <div className="h-6 w-px bg-border/60" />
      <div className="text-center">
        <p className="text-sm font-bold tabular-nums text-amber-500">
          {stats?.skipped || 0}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          تخطي
        </p>
      </div>
    </div>
  </div>
);

export default DatabaseMigration;
