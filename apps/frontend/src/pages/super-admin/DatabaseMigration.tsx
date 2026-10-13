import React, { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ServerIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CommandLineIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

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
    <div className="space-y-4" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              <ServerIcon className="h-3 w-3" />
              إدارة النظام والبيانات
            </span>
            <span className="text-xs text-muted-foreground font-mono">/ db-migration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            استيراد وترحيل قواعد البيانات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            نقل ومزامنة المهام والمشاريع وبيانات المنظومة من خوادم وقواعد بيانات خارجية
          </p>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <CommandLineIcon className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
            إعدادات مصدر قاعدة البيانات
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card text-foreground hover:bg-muted/50 text-xs font-mono transition-colors disabled:opacity-40"
            >
              {testing ? (
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <span>فحص الاتصال</span>
            </button>
            <button
              onClick={startMigration}
              disabled={testing || migrating || !sourceUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-mono font-medium transition-colors disabled:opacity-40"
            >
              {migrating ? (
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayIcon className="h-3.5 w-3.5" />
              )}
              <span>بدء الاستيراد</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-xs font-mono">
            <XCircleIcon className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {(migrating || progress) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Progress Stats */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-4 w-4 text-primary" />
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
                  icon={<UserGroupIcon className="h-4 w-4" />}
                />
                <StatBox
                  label="فريق العمل"
                  stats={progress?.teamMembers}
                  icon={<UserGroupIcon className="h-4 w-4" />}
                />
                <StatBox
                  label="المشاريع"
                  stats={progress?.projects}
                  icon={<FolderIcon className="h-4 w-4" />}
                />
                <StatBox
                  label="الإصدارات"
                  stats={progress?.releases}
                  icon={<TagIcon className="h-4 w-4" />}
                />
                <div className="col-span-2">
                  <StatBox
                    label="المهام"
                    stats={progress?.tasks}
                    icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col h-[380px]">
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CommandLineIcon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                  Migration Terminal Log
                </span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive/60"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500/60"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500/60"></div>
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
      <div className="rounded-xl border border-border/70 bg-card p-4 flex items-start gap-3 shadow-xs">
        <InformationCircleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
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

// Re-importing missing components from HeroIcons
const UserGroupIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-1.261-3.613m-2.482-4.469A4.5 4.5 0 0115 7.5a4.5 4.5 0 01-3.358 4.358m0 0a4.5 4.5 0 01-3.359-4.358m0 0A4.5 4.5 0 0112 3a4.5 4.5 0 015.753 5.432m-9.43 4.498a4.49 4.49 0 01-1.223 3.18m0 0a4.49 4.49 0 001.223 3.181m0 0a4.493 4.493 0 01-3.18-1.223m0 0a4.491 4.491 0 00-3.181 1.223m0 0A4.49 4.49 0 013 18.72a4.49 4.49 0 003.741-.479a3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-1.261-3.613m-2.482-4.469A4.5 4.5 0 0115 7.5a4.5 4.5 0 01-3.358 4.358m0 0a4.5 4.5 0 01-3.359-4.358"
    />
  </svg>
);

const FolderIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.625-12a2.25 2.25 0 00-2.25 2.25v2.25H3a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003 21.75h18a2.25 2.25 0 002.25-2.25V8.25A2.25 2.25 0 0021 6h-8.25V3.75m0 0A2.25 2.25 0 0115.75 6h-3.75v-2.25A2.25 2.25 0 0114.25 1.5h-.75"
    />
  </svg>
);

const TagIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 009.568 3zm.432 0v4.5M4.5 12l4.5 4.5m10.5-1.5l1.5-1.5"
    />
  </svg>
);

const ClipboardDocumentListIcon = (props: any) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5h-1.35m-10.5 0H4.5A2.25 2.25 0 002.25 6.75v12a2.25 2.25 0 002.25 2.25h1.35m10.5-15V3.75A.75.75 0 0015 3h-6a.75.75 0 00-.75.75V4.5m10.5 0H7.5"
    />
  </svg>
);

export default DatabaseMigration;
