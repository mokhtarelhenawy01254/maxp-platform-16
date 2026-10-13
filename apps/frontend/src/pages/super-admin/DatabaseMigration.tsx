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

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const DatabaseMigration: React.FC = () => {
  const [sourceUrl, setSourceUrl] = useState(
    "",
  );
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Polling for status if a job is active
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
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data.success) {
        setProgress(data.data.progress);
        setLogs(data.data.logs);
        if (data.data.status === "completed") {
          setMigrating(false);
          setSuccess("تم الانتهاء من عملية الاستيراد بنجاح!");
        } else if (data.data.status === "failed") {
          setMigrating(false);
          setError(`فشلت العملية: ${data.data.error}`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch status", err);
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
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setSuccess("تم الاتصال بقاعدة البيانات بنجاح!");
      } else {
        setError(data.message || "فشل الاتصال");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setTesting(false);
    }
  };

  const startMigration = async () => {
    if (
      !window.confirm(
        "هل أنت متأكد من بدء عملية الاستيراد؟ قد يستغرق ذلك بعض الوقت.",
      )
    )
      return;

    setMigrating(true);
    setError(null);
    setSuccess(null);
    setLogs([]);
    try {
      const response = await fetch(
        buildApiUrl("super-admin/db-migration/start"),
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ url: sourceUrl }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setJobId(data.data.jobId);
      } else {
        setError(data.message || "فشل بدء العملية");
        setMigrating(false);
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
      setMigrating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Database className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                استيراد وترحيل قواعد البيانات
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                DB Migration
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              نقل ومزامنة المهام والمشاريع وبيانات المنظومة من خوادم وقواعد بيانات خارجية
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 space-y-3.5 shadow-2xs">
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
            <input
              type="password"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={migrating}
              placeholder="mysql://username:password@hostname:3306/database_name"
              className="w-full px-3 py-2 bg-muted/30 border border-border/70 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground font-mono text-xs placeholder:text-muted-foreground/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={testConnection}
              disabled={testing || migrating || !sourceUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card text-foreground hover:bg-muted/50 text-xs font-mono transition-colors disabled:opacity-40 active:scale-[0.98]"
            >
              {testing ? (
                <RefreshCw className="size-3.5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              )}
              <span>فحص الاتصال</span>
            </button>
            <button
              onClick={startMigration}
              disabled={testing || migrating || !sourceUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-mono font-medium transition-colors disabled:opacity-40 active:scale-[0.98]"
            >
              {migrating ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              <span>بدء الاستيراد</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-xs font-mono">
            <XCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="size-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {(migrating || progress) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Progress Stats */}
          <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <Download className="size-4 text-primary" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
                حالة تقدم الترحيل اللحظية
              </h3>
            </div>

            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-muted-foreground">الإنجاز التراكمي</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {progress?.percentage || 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden" dir="ltr">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress?.percentage || 0}%` }}
                  ></div>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground animate-pulse">
                  المرحلة: <strong className="text-foreground font-semibold">{progress?.message || "جاري المعالجة..."}</strong>
                </p>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatBox
                  label="المستخدمين"
                  stats={progress?.users}
                  icon={<Users className="size-3.5" />}
                />
                <StatBox
                  label="فريق العمل"
                  stats={progress?.teamMembers}
                  icon={<Users className="size-3.5" />}
                />
                <StatBox
                  label="المشاريع"
                  stats={progress?.projects}
                  icon={<Folder className="size-3.5" />}
                />
                <StatBox
                  label="الإصدارات"
                  stats={progress?.releases}
                  icon={<Tag className="size-3.5" />}
                />
                <div className="col-span-2">
                  <StatBox
                    label="المهام"
                    stats={progress?.tasks}
                    icon={<ClipboardList className="size-3.5" />}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-3 shadow-2xs flex flex-col h-[380px]">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Terminal className="size-3.5 text-primary" />
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                  Migration Terminal Log
                </span>
              </div>
              <div className="flex gap-1">
                <div className="size-2 rounded-full bg-destructive/60"></div>
                <div className="size-2 rounded-full bg-amber-500/60"></div>
                <div className="size-2 rounded-full bg-emerald-500/60"></div>
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
      )}

      {/* Info Notice Strip */}
      <div className="rounded-xl border border-border/70 dark:border-border/60 bg-card p-4 flex items-start gap-3 shadow-2xs">
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
  stats?: { total: number; imported: number; skipped: number } | undefined;
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
      <div className="h-6 w-px bg-border/60"></div>
      <div className="text-center">
        <p className="text-sm font-bold tabular-nums text-emerald-500">
          {stats?.imported || 0}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          تم
        </p>
      </div>
      <div className="h-6 w-px bg-border/60"></div>
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
