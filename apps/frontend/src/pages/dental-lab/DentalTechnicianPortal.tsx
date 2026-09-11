import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  Bell,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  Loader2,
  Pause,
  Play,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Table as TableIcon,
  TrendingUp,
  UploadCloud,
  User,
  Wallet,
  X as XMarkIcon,
  Zap,
} from "lucide-react";
import {
  DentalTechnicianPayout,
  MyCase,
  MyWage,
  MyWageStageLog,
  ROLE_CONFIG,
  advanceCase,
  fetchMyCases,
  fetchMyWage,
  fmtDate,
  fmtMoney,
  nextStatusOf,
  scanKioskBarcode,
  uploadTechAttachment,
} from "./shared";
import DentalModelViewer from "./DentalModelViewer";

interface Props {
  initialSection?: string;
}

export type PortalSection = "bench" | "wage" | "kiosk" | "notifications" | "reports";

export default function DentalTechnicianPortal({ initialSection }: Props) {
  const { t } = useTranslation();

  // Determine section from initialSection or default to bench
  const deriveSection = (sec?: string): PortalSection => {
    if (sec === "kiosk") return "kiosk";
    if (sec === "my-wage" || sec === "wage") return "wage";
    if (sec === "notifications") return "notifications";
    if (sec === "reports") return "reports";
    return "bench";
  };

  const [section, setSection] = useState<PortalSection>(() => deriveSection(initialSection));

  useEffect(() => {
    if (initialSection) {
      setSection(deriveSection(initialSection));
    }
  }, [initialSection]);

  const [cases, setCases] = useState<MyCase[]>([]);
  const [wage, setWage] = useState<MyWage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search and view mode in bench
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "OVERDUE" | "URGENT" | "SCAN">("ALL");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Bench Stage Timers (caseId -> { running: boolean, elapsedSeconds: number })
  const [timers, setTimers] = useState<Record<string, { running: boolean; elapsedSeconds: number }>>({});

  // Modals state
  const [active3DAttachment, setActive3DAttachment] = useState<{ url: string; ext: string; fileName: string } | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Kiosk mode state
  const [kioskInput, setKioskInput] = useState("");
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskResult, setKioskResult] = useState<any | null>(null);
  const kioskInputRef = useRef<HTMLInputElement>(null);

  // Ledger subtab in wage
  const [ledgerSubTab, setLedgerSubTab] = useState<"VOUCHERS" | "STAGES">("STAGES");

  // Reports tab state
  const [reportPeriod, setReportPeriod] = useState<"TODAY" | "7DAYS" | "MONTH" | "ALL">("MONTH");

  // Load Data
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [casesRes, wageRes] = await Promise.all([
        fetchMyCases(),
        fetchMyWage(),
      ]);
      setCases(casesRes || []);
      setWage(wageRes || null);
    } catch (err) {
      console.error("Failed to load technician portal data:", err);
      setError(err instanceof Error ? err.message : "تعذر جلب بيانات المحطة");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stopwatch ticker for active timers
  useEffect(() => {
    const hasRunningTimers = Object.values(timers).some((t) => t.running);
    if (!hasRunningTimers) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [id, state] of Object.entries(next)) {
          if (state.running) {
            next[id] = { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  const toggleTimer = (caseId: string) => {
    setTimers((prev) => {
      const curr = prev[caseId] || { running: false, elapsedSeconds: 0 };
      return {
        ...prev,
        [caseId]: {
          running: !curr.running,
          elapsedSeconds: curr.elapsedSeconds,
        },
      };
    });
  };

  const resetTimer = (caseId: string) => {
    setTimers((prev) => ({
      ...prev,
      [caseId]: { running: false, elapsedSeconds: 0 },
    }));
  };

  const fmtTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Advance case to next stage
  const handleAdvance = async (c: MyCase) => {
    const next = nextStatusOf(c.status);
    if (!next) return;
    setBusyId(c.id);
    try {
      await advanceCase(c.id, next);
      toast.success(`تم إنهاء مرحلة [${c.workTypeName || c.caseNumber}] ونقلها للمرحلة التالية بنجاح`);
      if (timers[c.id]?.running) {
        toggleTimer(c.id);
      }
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل في تحديث حالة الشغل");
    } finally {
      setBusyId(null);
    }
  };

  // Kiosk barcode scanner
  const handleKioskScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = kioskInput.trim();
    if (!barcode) return;
    setKioskLoading(true);
    setKioskResult(null);
    try {
      const res = await scanKioskBarcode(barcode);
      setKioskResult(res);
      toast.success(res.message || "تم تسجيل ونقل الحالة بنجاح");
      setKioskInput("");
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر قراءة الباركود أو تحديث الحالة");
    } finally {
      setKioskLoading(false);
      setTimeout(() => kioskInputRef.current?.focus(), 100);
    }
  };

  // Upload attachment submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCaseId || !uploadFile) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("kind", "STAGE_OUTPUT");
      await uploadTechAttachment(uploadCaseId, formData);
      toast.success("تم رفع الملف بنجاح وإرفاقه بالحالة");
      setUploadCaseId(null);
      setUploadFile(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل في رفع الملف");
    } finally {
      setUploadingFile(false);
    }
  };

  // Overdue helpers
  const isCaseOverdue = useCallback((c: MyCase) => {
    if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  }, []);

  const getOverdueDays = useCallback((c: MyCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const overdueCasesList = useMemo(() => {
    return cases.filter(isCaseOverdue);
  }, [cases, isCaseOverdue]);

  // Filtered cases for bench
  const filteredCases = useMemo(() => {
    let list = [...cases];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.caseNumber || "").toLowerCase().includes(q) ||
          (c.patientName || "").toLowerCase().includes(q) ||
          (c.doctorName || "").toLowerCase().includes(q) ||
          (c.workTypeName || "").toLowerCase().includes(q) ||
          (c.shade || "").toLowerCase().includes(q)
      );
    }
    if (filterPriority === "OVERDUE") {
      list = list.filter(isCaseOverdue);
    } else if (filterPriority === "URGENT") {
      list = list.filter((c) => c.priority === "URGENT" || c.priority === "RUSH" || c.priority === "IMMEDIATE");
    } else if (filterPriority === "SCAN") {
      list = list.filter((c) => c.hasScan || (c.attachments && c.attachments.length > 0));
    }

    // Sort: overdue cases first, then urgent, then by createdAt desc
    return list.sort((a, b) => {
      const aOver = isCaseOverdue(a) ? 1 : 0;
      const bOver = isCaseOverdue(b) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      const aUrg = a.priority === "URGENT" ? 1 : 0;
      const bUrg = b.priority === "URGENT" ? 1 : 0;
      return bUrg - aUrg;
    });
  }, [cases, search, filterPriority, isCaseOverdue]);

  const technicianRoleLabel = useMemo(() => {
    if (!wage?.technician?.role) return "فني معمل أسنان";
    const meta = ROLE_CONFIG[wage.technician.role];
    return meta ? meta.label : wage.technician.role;
  }, [wage]);

  // Reports data filtered by period
  const reportFilteredStages = useMemo(() => {
    const stages = wage?.recentStages || [];
    if (reportPeriod === "ALL") return stages;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return stages.filter((st) => {
      const t = st.completedAt ? new Date(st.completedAt).getTime() : 0;
      if (reportPeriod === "TODAY") return t >= todayStart;
      if (reportPeriod === "7DAYS") return t >= sevenDaysAgo;
      if (reportPeriod === "MONTH") return t >= monthStart;
      return true;
    });
  }, [wage?.recentStages, reportPeriod]);

  const reportStats = useMemo(() => {
    const stages = reportFilteredStages;
    const totalEarned = stages.reduce((sum, s) => sum + (s.wageAmount || 0), 0);
    const uniqueCases = new Set(stages.map((s) => s.caseId)).size;
    return {
      stagesCount: stages.length,
      casesCount: uniqueCases,
      totalEarned,
      overdueRemaining: overdueCasesList.length,
    };
  }, [reportFilteredStages, overdueCasesList]);

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* 🌟 1. Compact Single-Depth Header (رأس محطة العمل الخفيف بدون بنر ضخم) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {wage?.technician?.name ? `محطة عمل: ${wage.technician.name}` : "محطة عمل الفني"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                <Sparkles className="w-3 h-3" />
                {technicianRoleLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              استلام الحالات ومراحل الإنتاج، قياس الوقت، ومتابعة المستحقات وسندات الصرف
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setSection("kiosk")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition shadow-xs"
          >
            <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>ماسح الباركود 📷</span>
          </button>
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 📊 2. Single-Depth Direct KPI Row (كروت المؤشرات المباشرة بدون مربعات داخل مربعات) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Active Cases */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">حالات قيد العمل</span>
            <ListChecks className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{cases.length}</span>
            <span className="text-xs text-gray-500">حالة</span>
          </div>
        </div>

        {/* Card 2: Overdue Cases (Highlighted) */}
        <div
          onClick={() => {
            setSection("bench");
            setFilterPriority("OVERDUE");
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs ${
            overdueCasesList.length > 0
              ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${overdueCasesList.length > 0 ? "text-rose-700 dark:text-rose-400" : "text-gray-500"}`}>
              حالات متأخرة ⚠️
            </span>
            <ShieldAlert className={`w-4 h-4 ${overdueCasesList.length > 0 ? "text-rose-600 animate-pulse" : "text-gray-400"}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${overdueCasesList.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}>
              {overdueCasesList.length}
            </span>
            <span className={`text-xs ${overdueCasesList.length > 0 ? "text-rose-600 font-semibold" : "text-gray-500"}`}>
              {overdueCasesList.length > 0 ? "تحتاج تدخلاً سريعاً" : "لا يوجد تأخير"}
            </span>
          </div>
        </div>

        {/* Card 3: Today's Completed Stages */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">إنجاز اليوم</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{wage?.todayStages ?? 0}</span>
              <span className="text-xs text-gray-500 mr-1">مراحل</span>
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
              +{fmtMoney(wage?.todayWage ?? 0)} ج.م
            </span>
          </div>
        </div>

        {/* Card 4: Net Wage Due */}
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
            <span className="text-xs font-semibold">مستحقاتك الحالية</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmtMoney(wage?.balance ?? 0)}</span>
            <span className="text-xs text-blue-600 dark:text-blue-400">ج.م</span>
          </div>
        </div>
      </div>

      {/* 🧭 3. Clean Responsive Navigation Tabs (تبويبات المحطة الخمس) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-2">
        <div className="inline-flex flex-wrap bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700/80 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setSection("bench")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              section === "bench"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>حالاتي والإنتاج ({cases.length})</span>
          </button>

          <button
            onClick={() => setSection("kiosk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              section === "kiosk"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>ماسح الباركود</span>
          </button>

          <button
            onClick={() => setSection("wage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              section === "wage"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>مستحقاتي وسجل الصرف</span>
          </button>

          <button
            onClick={() => setSection("notifications")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all relative ${
              section === "notifications"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>إشعاراتي وتنبيهات العمل</span>
            {overdueCasesList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setSection("reports")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              section === "reports"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>تقرير الإنتاجية والأداء</span>
          </button>
        </div>

        {/* Bench view switcher */}
        {section === "bench" && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
            <button
              onClick={() => setViewMode("CARDS")}
              className={`p-1.5 rounded ${viewMode === "CARDS" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-400 hover:text-gray-600"}`}
              title="عرض البطاقات التفاعلية"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded ${viewMode === "TABLE" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-400 hover:text-gray-600"}`}
              title="عرض الجدول السريع"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ==================== TAB 1: 📋 BENCH & MY CASES ==================== */}
      {section === "bench" && (
        <div className="space-y-4">
          {/* Quick Filters + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterPriority("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  filterPriority === "ALL"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                الكل ({cases.length})
              </button>

              <button
                onClick={() => setFilterPriority("OVERDUE")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
                  filterPriority === "OVERDUE"
                    ? "bg-rose-600 text-white"
                    : overdueCasesList.length > 0
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>المتأخرة ({overdueCasesList.length})</span>
              </button>

              <button
                onClick={() => setFilterPriority("URGENT")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
                  filterPriority === "URGENT"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>المستعجل والطارئ</span>
              </button>

              <button
                onClick={() => setFilterPriority("SCAN")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
                  filterPriority === "SCAN"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <Box className="w-3.5 h-3.5 text-indigo-500" />
                <span>تحتوي ملفات 3D</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الحالة، اسم الطبيب، المريض..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Overdue Banner if there are late cases and filter is not overdue */}
          {overdueCasesList.length > 0 && filterPriority !== "OVERDUE" && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  يوجد لديك <b>{overdueCasesList.length}</b> حالة متأخرة عن موعد التسليم المقرر للطبيب. يرجى البدء بها فوراً.
                </span>
              </div>
              <button
                onClick={() => setFilterPriority("OVERDUE")}
                className="underline font-bold hover:text-rose-950 shrink-0"
              >
                عرض المتأخرات فقط
              </button>
            </div>
          )}

          {/* Cases Content */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">جاري تحميل حالات محطة العمل...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {filterPriority === "OVERDUE"
                  ? "ممتاز! لا توجد أي حالات متأخرة في مرحلتك حالياً 🎉"
                  : "محطة العمل جاهزة — لا توجد حالات تنتظر العمل في مرحلتك الآن"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {filterPriority === "OVERDUE"
                  ? "جميع الحالات تسير وفق المواعيد المقررة."
                  : "عند إسناد حالات جديدة أو نقل شغل لمرحلتك ستظهر هنا فوراً."}
              </p>
              {filterPriority !== "ALL" && (
                <button
                  onClick={() => setFilterPriority("ALL")}
                  className="mt-3 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold"
                >
                  عرض جميع الحالات
                </button>
              )}
            </div>
          ) : viewMode === "CARDS" ? (
            /* ==================== 🎴 CARDS VIEW ==================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCases.map((c) => {
                const isOverdue = isCaseOverdue(c);
                const overdueDays = getOverdueDays(c);
                const timer = timers[c.id] || { running: false, elapsedSeconds: 0 };
                const nextStatus = nextStatusOf(c.status);
                const scanAttachments = (c.attachments || []).filter(
                  (a) => a.kind === "SCAN" || a.fileName?.toLowerCase().endsWith(".stl") || a.fileName?.toLowerCase().endsWith(".ply")
                );

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-gray-900 shadow-xs flex flex-col justify-between overflow-hidden ${
                      isOverdue
                        ? "border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-400/30"
                        : c.priority === "URGENT"
                        ? "border-amber-300 dark:border-amber-800"
                        : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    {/* Overdue Top Strip if late */}
                    {isOverdue && (
                      <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 px-3 py-1.5 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold">
                        <div className="flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span>متأخرة عن التسليم منذ {overdueDays} يوم</span>
                        </div>
                        <span className="text-[11px] font-normal text-rose-600 dark:text-rose-400">
                          استحقاق: {fmtDate(c.dueDate)}
                        </span>
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      {/* Card Header: Case Number & Priority */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                              {c.caseNumber}
                            </span>
                            {c.priority === "URGENT" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-amber-500" />
                                طارئ
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                            {c.patientName ? `المريض: ${c.patientName}` : "مريض غير محدد"}
                          </p>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                          {c.activeStageName || c.status}
                        </span>
                      </div>

                      {/* Work Details */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">نوع الشغل:</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{c.workTypeName || "—"}</span>
                        </div>
                        {c.doctorName && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">الطبيب:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">د. {c.doctorName}</span>
                          </div>
                        )}
                        {(c.shade || c.teeth) && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">اللون / الأسنان:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {c.shade ? `لون: ${c.shade}` : ""} {c.teeth ? `| سن: ${c.teeth}` : ""}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-gray-500">التسليم المقرر:</span>
                          <span className={`font-semibold ${isOverdue ? "text-rose-600 font-bold" : "text-gray-700 dark:text-gray-300"}`}>
                            {fmtDate(c.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* 3D Attachments Quick Action */}
                      {scanAttachments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {scanAttachments.map((att) => {
                            const ext = (att.fileName || "").split(".").pop()?.toLowerCase() || "stl";
                            return (
                              <button
                                key={att.id}
                                onClick={() =>
                                  setActive3DAttachment({
                                    url: att.url || `/api/v1/dental-lab/files/${att.storedPath}`,
                                    ext,
                                    fileName: att.fileName || "3D Scan",
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
                              >
                                <Box className="w-3.5 h-3.5 text-indigo-500" />
                                <span>معاينة 3D ({ext.toUpperCase()})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bench Stopwatch Timer */}
                      <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 font-mono text-sm font-bold">
                          <Clock className={`w-4 h-4 ${timer.running ? "text-emerald-400 animate-pulse" : "text-gray-400"}`} />
                          <span>{fmtTimer(timer.elapsedSeconds)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleTimer(c.id)}
                            className={`p-1.5 rounded-lg transition ${
                              timer.running
                                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            }`}
                            title={timer.running ? "إيقاف مؤقت" : "بدء قياس وقت المرحلة"}
                          >
                            {timer.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          {timer.elapsedSeconds > 0 && !timer.running && (
                            <button
                              onClick={() => resetTimer(c.id)}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                              title="تصفير المؤقت"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-gray-50/70 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/dental-lab/cases/${c.id}`}
                          className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition"
                          title="تفاصيل الحالة الكاملة"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setUploadCaseId(c.id)}
                          className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition"
                          title="رفع ملف تصميم أو صور المرحلة"
                        >
                          <UploadCloud className="w-4 h-4" />
                        </button>
                      </div>

                      {nextStatus && (
                        <button
                          onClick={() => handleAdvance(c)}
                          disabled={busyId === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                        >
                          {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>إنهاء المرحلة وتسليمها</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==================== 📋 TABLE VIEW ==================== */
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-3 px-3">رقم الحالة</th>
                      <th className="py-3 px-3">المريض</th>
                      <th className="py-3 px-3">الطبيب</th>
                      <th className="py-3 px-3">نوع الشغل</th>
                      <th className="py-3 px-3">المرحلة الحالية</th>
                      <th className="py-3 px-3">تاريخ الاستحقاق</th>
                      <th className="py-3 px-3">الوقت والملفات</th>
                      <th className="py-3 px-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredCases.map((c) => {
                      const isOverdue = isCaseOverdue(c);
                      const overdueDays = getOverdueDays(c);
                      const timer = timers[c.id] || { running: false, elapsedSeconds: 0 };
                      const nextStatus = nextStatusOf(c.status);

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition ${
                            isOverdue ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold">
                            <div className="flex items-center gap-1.5">
                              {isOverdue && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                              <Link to={`/dental-lab/cases/${c.id}`} className="hover:text-blue-600">
                                {c.caseNumber}
                              </Link>
                              {c.priority === "URGENT" && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{c.patientName || "—"}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{c.doctorName ? `د. ${c.doctorName}` : "—"}</td>
                          <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold">{c.workTypeName || "—"}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {c.activeStageName || c.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/60 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                متأخرة ({fmtDate(c.dueDate)})
                              </span>
                            ) : (
                              <span className="text-gray-500">{fmtDate(c.dueDate)}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-700 dark:text-gray-300">{fmtTimer(timer.elapsedSeconds)}</span>
                              <button
                                onClick={() => toggleTimer(c.id)}
                                className={`p-1 rounded ${timer.running ? "text-amber-500" : "text-gray-400 hover:text-emerald-500"}`}
                              >
                                {timer.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {nextStatus ? (
                              <button
                                onClick={() => handleAdvance(c)}
                                disabled={busyId === c.id}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                              >
                                {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "إنهاء المرحلة"}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">مكتملة</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: 📷 KIOSK BARCODE SCANNER ==================== */}
      {section === "kiosk" && (
        <div className="max-w-xl mx-auto space-y-4 py-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
              <ScanLine className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">ماسح الباركود السريع لطاولة العمل</h3>
              <p className="text-xs text-gray-500 mt-1">
                وجّه قارئ الباركود نحو بطاقة البان (Pan Card) لنقل الحالة للمرحلة التالية وتسجيلها باسمك فوراً
              </p>
            </div>

            <form onSubmit={handleKioskScan} className="space-y-3">
              <input
                ref={kioskInputRef}
                type="text"
                value={kioskInput}
                onChange={(e) => setKioskInput(e.target.value)}
                placeholder="امسح الباركود أو اكتب رقم الحالة..."
                autoFocus
                className="w-full text-center font-mono text-base tracking-wider py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={kioskLoading || !kioskInput.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {kioskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                <span>تسجيل وتأكيد المسح</span>
              </button>
            </form>

            {kioskResult && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-right space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم مسح الحالة بنجاح!</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  الحالة: <b>{kioskResult.caseNumber || kioskResult.case?.caseNumber}</b>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  المرحلة السابقة: {kioskResult.previousStatus} ⬅️ المرحلة الحالية: <b>{kioskResult.newStatus}</b>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: 💰 MY WAGE & LEDGER (مستحقاتي وسجل الصرف) ==================== */}
      {section === "wage" && (
        <div className="space-y-4">
          {/* Financial Scorecard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <p className="text-xs text-gray-500 font-medium">إجمالي أجور المراحل المنجزة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {fmtMoney(wage?.totalEarned ?? 0)} <span className="text-xs text-gray-500">ج.م</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">أجر ثابت عن كل مرحلة إنتاج مكتملة</p>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <p className="text-xs text-gray-500 font-medium">إجمالي المقبوض بسندات الصرف</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {fmtMoney(wage?.totalPaid ?? 0)} <span className="text-xs text-gray-500">ج.م</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">سندات صرف المعمل المسجلة رسمياً</p>
            </div>

            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">صافي المستحقات المتبقية</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
                {fmtMoney(wage?.balance ?? 0)} <span className="text-xs">ج.م</span>
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">الرصيد المستحق الصافي في ذمة المعمل</p>
            </div>
          </div>

          {/* Ledger Switcher: Completed Stages vs Payout Vouchers */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            <button
              onClick={() => setLedgerSubTab("STAGES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                ledgerSubTab === "STAGES"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              سجل مراحل العمل المنجزة ({wage?.recentStages?.length ?? 0})
            </button>
            <button
              onClick={() => setLedgerSubTab("VOUCHERS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                ledgerSubTab === "VOUCHERS"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              سندات الصرف والمدفوعات ({wage?.payouts?.length ?? 0})
            </button>
          </div>

          {/* SubTab Content */}
          {ledgerSubTab === "STAGES" ? (
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-3 px-3">تاريخ الإنجاز</th>
                      <th className="py-3 px-3">رقم الحالة</th>
                      <th className="py-3 px-3">المرحلة المنفذة</th>
                      <th className="py-3 px-3">نوع الشغل</th>
                      <th className="py-3 px-3">الطبيب</th>
                      <th className="py-3 px-3 text-left">الأجر المحسوب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(wage?.recentStages || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          لا توجد مراحل مسجلة باسمك بعد
                        </td>
                      </tr>
                    ) : (
                      (wage?.recentStages || []).map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="py-2.5 px-3 text-gray-500">{fmtDate(st.completedAt)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold">{st.caseNumber}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{st.stageName}</td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.workTypeName || "—"}</td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.doctorName || "—"}</td>
                          <td className="py-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">
                            +{fmtMoney(st.wageAmount)} ج.م
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-3 px-3">تاريخ الصرف</th>
                      <th className="py-3 px-3">المبلغ المصروف</th>
                      <th className="py-3 px-3">طريقة الصرف</th>
                      <th className="py-3 px-3">البيان والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(wage?.payouts || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-400">
                          لا توجد سندات صرف مسجلة حتى الآن
                        </td>
                      </tr>
                    ) : (
                      (wage?.payouts || []).map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="py-2.5 px-3 text-gray-500">{fmtDate(p.createdAt)}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                            -{fmtMoney(p.amount)} ج.م
                          </td>
                          <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-medium">
                            {p.method === "CASH" ? "نقدي" : p.method === "BANK" ? "تحويل بنكي" : "محفظة إلكترونية"}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{p.notes || "سند صرف مستحقات"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: 🔔 MY NOTIFICATIONS & OVERDUE ALERTS ==================== */}
      {section === "notifications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                تنبيهات وإشعارات العمل المباشرة
              </h3>
              <p className="text-xs text-gray-500">
                متابعة الحالات المتأخرة، الحالات المسندة حديثاً، وسندات الصرف المقيدة لحسابك
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Overdue Cases Alerts */}
            {overdueCasesList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>حالات متأخرة عن موعد التسليم المقرر ({overdueCasesList.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {overdueCasesList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-900 dark:text-rose-200">{c.caseNumber}</span>
                          <span className="font-semibold text-rose-700">{c.workTypeName}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                          الطبيب: {c.doctorName || "—"} | متأخرة منذ {getOverdueDays(c)} يوم
                        </p>
                      </div>
                      <Link
                        to={`/dental-lab/cases/${c.id}`}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shrink-0 shadow-xs"
                      >
                        عرض الحالة
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. New Assignments */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <span>الحالات قيد التنفيذ بمحطتك ({cases.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {cases.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{c.caseNumber}</span>
                        <span className="text-gray-700 dark:text-gray-300">{c.workTypeName}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5">
                        المرحلة: <b>{c.activeStageName || c.status}</b> | استحقاق: {fmtDate(c.dueDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSection("bench");
                        setSearch(c.caseNumber || "");
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold shrink-0"
                    >
                      انتقال للكرت
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Recent Payout Vouchers */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>آخر سندات الصرف المقيدة ({wage?.payouts?.length || 0})</span>
              </h4>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                {(wage?.payouts || []).length === 0 ? (
                  <p className="p-4 text-xs text-gray-400 text-center">لا توجد سندات صرف بعد</p>
                ) : (
                  (wage?.payouts || []).slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="p-3 border-b last:border-0 border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          سند صرف: <span className="text-amber-600">{fmtMoney(p.amount)} ج.م</span>
                        </p>
                        <p className="text-gray-500 text-[11px]">{p.notes || "صرف مستحقات إنتاج معمل الأسنان"}</p>
                      </div>
                      <span className="text-gray-400 text-[11px]">{fmtDate(p.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: 📊 MY PERFORMANCE & PRODUCTIVITY REPORT ==================== */}
      {section === "reports" && (
        <div className="space-y-4">
          {/* Report Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                تقرير إنتاجية وأداء الفني
              </h3>
              <p className="text-xs text-gray-500">
                كشف إحصائي وتحليلي لحجم الإنتاج، المراحل المنفذة، والأجور المكتسبة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setReportPeriod("TODAY")}
                  className={`px-3 py-1 rounded-lg transition ${
                    reportPeriod === "TODAY" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-500"
                  }`}
                >
                  اليوم
                </button>
                <button
                  onClick={() => setReportPeriod("7DAYS")}
                  className={`px-3 py-1 rounded-lg transition ${
                    reportPeriod === "7DAYS" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-500"
                  }`}
                >
                  آخر 7 أيام
                </button>
                <button
                  onClick={() => setReportPeriod("MONTH")}
                  className={`px-3 py-1 rounded-lg transition ${
                    reportPeriod === "MONTH" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-500"
                  }`}
                >
                  هذا الشهر
                </button>
                <button
                  onClick={() => setReportPeriod("ALL")}
                  className={`px-3 py-1 rounded-lg transition ${
                    reportPeriod === "ALL" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-500"
                  }`}
                >
                  الكل
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Report Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <span className="text-xs text-gray-500 font-medium">المراحل المنفذة</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reportStats.stagesCount}</span>
                <span className="text-xs text-gray-500">مرحلة</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <span className="text-xs text-gray-500 font-medium">عدد الحالات المنجزة</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{reportStats.casesCount}</span>
                <span className="text-xs text-gray-500">حالة</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <span className="text-xs text-gray-500 font-medium">إجمالي أجر الفترة</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(reportStats.totalEarned)}</span>
                <span className="text-xs text-gray-500">ج.م</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
              <span className="text-xs text-gray-500 font-medium">المتأخرات الحالية</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${reportStats.overdueRemaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {reportStats.overdueRemaining}
                </span>
                <span className="text-xs text-gray-500">حالة</span>
              </div>
            </div>
          </div>

          {/* Detailed Itemized Production Table */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                جدول كشف الإنتاج التفصيلي حسب الفترة المختارة
              </h4>
              <span className="text-[11px] text-gray-500 font-medium">
                عدد البنود: {reportFilteredStages.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">رقم الحالة</th>
                    <th className="py-2.5 px-3">نوع الشغل</th>
                    <th className="py-2.5 px-3">الطبيب</th>
                    <th className="py-2.5 px-3">المرحلة المنجزة</th>
                    <th className="py-2.5 px-3 text-left">الأجر المكتسب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reportFilteredStages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        لا توجد مراحل مسجلة خلال هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    reportFilteredStages.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-gray-500">{fmtDate(st.completedAt)}</td>
                        <td className="py-2 px-3 font-mono font-bold">{st.caseNumber}</td>
                        <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">{st.workTypeName || "—"}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{st.doctorName ? `د. ${st.doctorName}` : "—"}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {st.stageName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">
                          +{fmtMoney(st.wageAmount)} ج.م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 👓 3D MODEL VIEWER MODAL ==================== */}
      {active3DAttachment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-6 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden shadow-2xl border dark:border-gray-800">
            <div className="p-3.5 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  فاحص المسح الرقمي ثلاثي الأبعاد: {active3DAttachment.fileName}
                </h3>
              </div>
              <button
                onClick={() => setActive3DAttachment(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
              <DentalModelViewer url={active3DAttachment.url} ext={active3DAttachment.ext} />
            </div>

            <div className="p-3 border-t dark:border-gray-800 flex justify-between items-center text-xs text-gray-500">
              <span>استخدم زر الفأرة الأيسر للتدوير، والعجلة للتقريب والإبعاد (Zoom).</span>
              <button
                onClick={() => setActive3DAttachment(null)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 📤 UPLOAD ATTACHMENT MODAL ==================== */}
      {uploadCaseId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border dark:border-gray-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 dark:border-gray-700">
              <h3 className="font-bold text-base">رفع ملف تصميم أو صورة جودة للحالة</h3>
              <button onClick={() => setUploadCaseId(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  اختر الملف (STL, PLY, OBJ, PNG, JPEG)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setUploadCaseId(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile || !uploadFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>رفع وتأكيد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
