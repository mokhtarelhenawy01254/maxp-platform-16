import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowUpCircle,
  Banknote,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  Loader2,
  Pause,
  Play,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Table as TableIcon,
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
  requestAdvance,
  scanKioskBarcode,
  uploadTechAttachment,
} from "./shared";
import DentalModelViewer from "./DentalModelViewer";

interface Props {
  initialSection?: string;
}

type PortalSection = "bench" | "wage" | "kiosk";

export default function DentalTechnicianPortal({ initialSection }: Props) {
  const { t } = useTranslation();

  // Determine section from initialSection or default to bench
  const deriveSection = (sec?: string): PortalSection => {
    if (sec === "kiosk") return "kiosk";
    if (sec === "my-wage" || sec === "wage") return "wage";
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

  // Search and view mode
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "URGENT" | "SCAN">("ALL");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Bench Stage Timers (caseId -> { running: boolean, elapsedSeconds: number })
  const [timers, setTimers] = useState<Record<string, { running: boolean; elapsedSeconds: number }>>({});

  // Modals state
  const [active3DAttachment, setActive3DAttachment] = useState<{ url: string; ext: string; fileName: string } | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // Kiosk mode state
  const [kioskInput, setKioskInput] = useState("");
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskResult, setKioskResult] = useState<any | null>(null);
  const kioskInputRef = useRef<HTMLInputElement>(null);

  // Ledger subtab
  const [ledgerSubTab, setLedgerSubTab] = useState<"VOUCHERS" | "STAGES">("VOUCHERS");

  // Load Data
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [c, w] = await Promise.all([fetchMyCases(), fetchMyWage()]);
      setCases(c.items || []);
      setWage(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Stage timer interval
  useEffect(() => {
    const hasRunningTimer = Object.values(timers).some((t) => t.running);
    if (!hasRunningTimer) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id]?.running) {
            next[id] = {
              ...next[id],
              elapsedSeconds: next[id].elapsedSeconds + 1,
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  const toggleTimer = (caseId: string) => {
    setTimers((prev) => {
      const current = prev[caseId] || { running: false, elapsedSeconds: 0 };
      const isRunning = !current.running;
      if (isRunning) {
        toast.info(`تم بدء مؤقت العمل للحالة`, { duration: 1500 });
      } else {
        toast.info(`تم إيقاف مؤقت العمل مؤقتاً`, { duration: 1500 });
      }
      return {
        ...prev,
        [caseId]: {
          running: isRunning,
          elapsedSeconds: current.elapsedSeconds,
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

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Complete current stage
  const completeMyStage = async (c: MyCase) => {
    if (busyId) return;
    const next = nextStatusOf(c.status || "");
    if (!next) return;
    setBusyId(c.id);
    try {
      await advanceCase(c.id, { to: next });
      toast.success(`تم إكمال المرحلة وتسليم الحالة بنجاح (${c.caseNumber})`);
      if (timers[c.id]) {
        resetTimer(c.id);
      }
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setBusyId(null);
    }
  };

  // Kiosk scan handler
  const handleKioskScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const barcode = kioskInput.trim();
    if (!barcode) return;
    setKioskLoading(true);
    try {
      const res = await scanKioskBarcode({
        barcode,
        technicianId: wage?.technician?.id,
      });
      setKioskResult(res);
      toast.success(`تم مسح وتحديث الحالة بنجاح!`);
      setKioskInput("");
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "لم يتم العثور على أي حالة مطابقة");
    } finally {
      setKioskLoading(false);
      kioskInputRef.current?.focus();
    }
  };

  // Advance request submit
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }
    setSubmittingAdvance(true);
    try {
      await requestAdvance({
        amount: amt,
        notes: advanceNotes.trim() || undefined,
      });
      toast.success("تم إرسال وتسجيل طلب السلفة بنجاح للإدارة");
      setAdvanceModalOpen(false);
      setAdvanceAmount("");
      setAdvanceNotes("");
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال طلب السلفة");
    } finally {
      setSubmittingAdvance(false);
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

  // Filtered cases
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
    if (filterPriority === "URGENT") {
      list = list.filter((c) => c.priority === "URGENT" || c.priority === "RUSH" || c.priority === "IMMEDIATE");
    } else if (filterPriority === "SCAN") {
      list = list.filter((c) => c.hasScan || (c.attachments && c.attachments.length > 0));
    }
    return list;
  }, [cases, search, filterPriority]);

  const technicianRoleLabel = useMemo(() => {
    if (!wage?.technician?.role) return "فني معمل أسنان";
    const meta = ROLE_CONFIG[wage.technician.role];
    return meta ? meta.label : wage.technician.role;
  }, [wage]);

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      {/* 🌟 1. Top Daily Performance Summary Hero (شريط الإنجاز اليومي ومحطة الفني) */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{technicianRoleLabel}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              أهلاً بك، {wage?.technician?.name || "عضو فريق المعمل"} 👋
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              محطة تشغيل الفني الذكية لعام 2026 — استلام المهام، قياس الوقت، ومتابعة الأجور وسندات الصرف
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSection("kiosk")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all ${
                section === "kiosk"
                  ? "bg-white text-blue-700 shadow-md scale-105"
                  : "bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20"
              }`}
            >
              <ScanLine className="w-4 h-4 text-emerald-300" />
              <span>ماسح الباركود 📷</span>
            </button>

            <button
              onClick={() => setAdvanceModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Banknote className="w-4 h-4" />
              <span>طلب سلفة</span>
            </button>

            <button
              onClick={() => load(true)}
              className="p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/15 text-white">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-blue-100 font-medium">إنجاز اليوم</p>
            <p className="text-lg sm:text-xl font-extrabold mt-0.5 text-emerald-300">
              {wage?.todayStages ?? 0} <span className="text-xs text-blue-200">مراحل</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-blue-100 font-medium">أجر اليوم المكتسب</p>
            <p className="text-lg sm:text-xl font-extrabold mt-0.5 text-yellow-300">
              {fmtMoney(wage?.todayWage ?? 0)} <span className="text-xs text-blue-200">ج.م</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <p className="text-[11px] text-blue-100 font-medium">حالات قيد الانتظار</p>
            <p className="text-lg sm:text-xl font-extrabold mt-0.5">
              {cases.length} <span className="text-xs text-blue-200">حالة</span>
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border-2 border-emerald-300/40">
            <p className="text-[11px] text-emerald-200 font-semibold">مستحقاتك المتبقية</p>
            <p className="text-lg sm:text-xl font-black mt-0.5 text-emerald-300">
              {fmtMoney(wage?.balanceDue ?? 0)} <span className="text-xs text-emerald-200">ج.م</span>
            </p>
          </div>
        </div>
      </div>

      {/* 🧭 2. Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b dark:border-gray-800 pb-3">
        <div className="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border dark:border-gray-700/80">
          <button
            onClick={() => setSection("bench")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              section === "bench"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>محطة العمل والحالات ({cases.length})</span>
          </button>
          <button
            onClick={() => setSection("wage")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              section === "wage"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>كشف الحساب والمستحقات</span>
          </button>
          <button
            onClick={() => setSection("kiosk")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              section === "kiosk"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>ماسح الباركود السريع</span>
          </button>
        </div>

        {section === "bench" && (
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
              <button
                onClick={() => setViewMode("CARDS")}
                className={`p-1.5 rounded ${viewMode === "CARDS" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-400"}`}
                title="عرض بطاقات محطة العمل اللمسية"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded ${viewMode === "TABLE" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs" : "text-gray-400"}`}
                title="عرض جدول تفصيلي"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-gray-500">جاري تحميل بيانات محطة العمل...</p>
        </div>
      ) : section === "bench" ? (
        /* ==================== 🛠️ BENCH STATION (حالاتي ومحطة الإنتاج) ==================== */
        <div className="space-y-4">
          {/* Controls: Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 shadow-xs">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الحالة، اسم الطبيب، المريض، أو اللون..."
                className="w-full pr-9 pl-4 py-1.5 text-xs sm:text-sm rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterPriority("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterPriority === "ALL"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                الكل ({cases.length})
              </button>
              <button
                onClick={() => setFilterPriority("URGENT")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterPriority === "URGENT"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>المستعجل والطارئ</span>
              </button>
              <button
                onClick={() => setFilterPriority("SCAN")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterPriority === "SCAN"
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Box className="w-3 h-3 text-indigo-500" />
                <span>تحتوي ملفات 3D</span>
              </button>
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
              <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">لا توجد حالات مسندة حالياً</h3>
              <p className="text-xs text-gray-400 mt-1">
                جميع مراحل الإنتاج الخاصة بك مكتملة أو لم يتم إسناد حالات جديدة بعد.
              </p>
            </div>
          ) : viewMode === "CARDS" ? (
            /* 🗂️ Touch-friendly Bench Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCases.map((c) => {
                const next = nextStatusOf(c.status || "");
                const timer = timers[c.id] || { running: false, elapsedSeconds: 0 };
                const stlAttachment = c.attachments?.find((a) =>
                  (a.fileName || "").toLowerCase().endsWith(".stl") ||
                  (a.fileName || "").toLowerCase().endsWith(".ply") ||
                  (a.fileName || "").toLowerCase().endsWith(".obj")
                );

                const isUrgent = c.priority === "URGENT" || c.priority === "RUSH" || c.priority === "IMMEDIATE";

                return (
                  <div
                    key={c.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between ${
                      isUrgent
                        ? "border-rose-300 dark:border-rose-900/60 shadow-xs"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b dark:border-gray-700/80">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/dental-lab/cases/${c.id}`}
                              className="font-bold text-base text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              title="فتح تفاصيل الحالة الكاملة"
                            >
                              <span>{c.caseNumber || "بدون رقم"}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                            </Link>
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                <Flame className="w-3 h-3" /> طارئ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            د. {c.doctorName || "—"} • {c.patientName ? `المريض: ${c.patientName}` : "مريض غير محدد"}
                          </p>
                        </div>

                        {/* Shade Box */}
                        {c.shade && (
                          <div className="text-center px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg shrink-0">
                            <span className="text-[10px] block text-amber-700 dark:text-amber-400 font-medium">اللون</span>
                            <span className="text-xs font-black text-amber-900 dark:text-amber-200 tracking-wider">
                              {c.shade}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Work type & teeth */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                          {c.workTypeName || "عمل غير محدد"}
                        </span>
                        {c.teeth && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono" dir="ltr">
                            🦷 {c.teeth}
                          </span>
                        )}
                        {c.material && (
                          <span className="px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-[11px]">
                            {c.material}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage & Timer Section */}
                    <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/40 flex-1">
                      {/* Current Stage */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">مرحلتك الحالية:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                          {c.myStage?.name || "المرحلة التشغيلية"}
                        </span>
                      </div>

                      {/* Stage Stopwatch (مؤقت وقت العمل الحي) */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-gray-700/70 border dark:border-gray-600 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${timer.running ? "text-emerald-500 animate-pulse" : "text-gray-400"}`} />
                          <div>
                            <span className="text-[10px] text-gray-400 block leading-tight">وقت العمل للمرحلة</span>
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                              {formatTimer(timer.elapsedSeconds)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleTimer(c.id)}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                              timer.running
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                            }`}
                            title={timer.running ? "إيقاف مؤقت" : "بدء العمل على الصينية"}
                          >
                            {timer.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{timer.running ? "إيقاف" : "بدء"}</span>
                          </button>
                          {timer.elapsedSeconds > 0 && !timer.running && (
                            <button
                              onClick={() => resetTimer(c.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              title="إعادة تعيين المؤقت"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Due Date & Attachments quick actions */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>التسليم: {fmtDate(c.dueDate)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {stlAttachment && (
                            <button
                              onClick={() =>
                                setActive3DAttachment({
                                  url: `/api/v1/dental-lab/files/${stlAttachment.storedPath}`,
                                  ext: stlAttachment.fileName.split(".").pop() || "stl",
                                  fileName: stlAttachment.fileName,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800"
                              title="عرض ملف الـ 3D التفاعلي"
                            >
                              <Eye className="w-3 h-3" /> 3D
                            </button>
                          )}

                          <button
                            onClick={() => setUploadCaseId(c.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-0.5 rounded border dark:border-gray-600"
                            title="رفع ملف تصميم أو صورة جودة"
                          >
                            <UploadCloud className="w-3 h-3" />
                            <span>رفع</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex items-center justify-between gap-2">
                      <Link
                        to={`/dental-lab/cases/${c.id}`}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        تفاصيل الأوردر ↗
                      </Link>

                      {next ? (
                        <button
                          onClick={() => completeMyStage(c)}
                          disabled={busyId !== null}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                          {busyId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                          <span>إنهاء وتسليم للمحطة التالية ✔</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold">جاهز للتسليم النهائي</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 📋 Compact Table View */
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-x-auto shadow-xs">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-right">
                    <th className="py-3 px-3">رقم الحالة</th>
                    <th className="py-3 px-3">الطبيب / المريض</th>
                    <th className="py-3 px-3">نوع الشغل</th>
                    <th className="py-3 px-3">الأسنان</th>
                    <th className="py-3 px-3">اللون</th>
                    <th className="py-3 px-3">مرحلتك الحالية</th>
                    <th className="py-3 px-3">موعد التسليم</th>
                    <th className="py-3 px-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => {
                    const next = nextStatusOf(c.status || "");
                    return (
                      <tr key={c.id} className="border-b dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-3 font-bold">
                          <Link to={`/dental-lab/cases/${c.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {c.caseNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">د. {c.doctorName || "—"}</p>
                          <p className="text-[11px] text-gray-400">{c.patientName || "—"}</p>
                        </td>
                        <td className="py-3 px-3">{c.workTypeName || "—"}</td>
                        <td className="py-3 px-3 font-mono" dir="ltr">{c.teeth || "—"}</td>
                        <td className="py-3 px-3 font-bold text-amber-700 dark:text-amber-400">{c.shade || "—"}</td>
                        <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                          {c.myStage?.name || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-500">{fmtDate(c.dueDate)}</td>
                        <td className="py-3 px-3">
                          {next && (
                            <button
                              onClick={() => completeMyStage(c)}
                              disabled={busyId !== null}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1"
                            >
                              {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                              <span>إنهاء المرحلة</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : section === "kiosk" ? (
        /* ==================== 📷 KIOSK BARCODE SCANNER (كشك ومسح الباركود) ==================== */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-6 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-2xl flex items-center justify-center shadow-inner">
              <ScanLine className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">ماسح الباركود السريع لمحطة العمل</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              امسح باركود صينية الحالة بقارئ الليزر (Scanner) أو أدخل رقم الحالة وسيتم تحديث وإنهاء مرحلتك فورياً.
            </p>
          </div>

          <form onSubmit={handleKioskScan} className="space-y-4">
            <div className="relative">
              <input
                ref={kioskInputRef}
                type="text"
                value={kioskInput}
                onChange={(e) => setKioskInput(e.target.value)}
                placeholder="امسح الباركود أو اكتب رقم الحالة (مثال: DL-1001)..."
                autoFocus
                className="w-full text-center text-lg sm:text-xl font-mono py-3.5 px-4 rounded-xl border-2 border-blue-500/50 dark:border-blue-500 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={kioskLoading || !kioskInput.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {kioskLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              <span>تنفيذ وترقية المرحلة بنقرة واحدة</span>
            </button>
          </form>

          {kioskResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>تمت معالجة الحالة بنجاح!</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                الحالة: <strong className="font-mono">{kioskResult.case?.caseNumber}</strong> • المريض: {kioskResult.case?.patientName || "—"}
              </p>
              {kioskResult.nextStatus && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  المرحلة القادمة: {kioskResult.nextStatus}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ==================== 💰 FINANCIAL LEDGER & WAGE (كشف الحساب وسجل السندات) ==================== */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">أجر المرحلة المعتمد</p>
              <p className="text-lg sm:text-xl font-bold mt-1">{fmtMoney(wage?.rate)} ج.م</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">أجر الشهر الحالي</p>
              <p className="text-lg sm:text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {fmtMoney(wage?.thisMonthWage)} ج.م
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{wage?.thisMonthStages ?? 0} مراحل منجزة</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الأجر المكتسب</p>
              <p className="text-lg sm:text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                {fmtMoney(wage?.totalWage)} ج.م
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{wage?.completedStages ?? 0} مرحلة كلياً</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المنصرف والسلف</p>
              <p className="text-lg sm:text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                {fmtMoney(wage?.totalPaid ?? 0)} ج.م
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">سلف: {fmtMoney(wage?.totalAdvances ?? 0)} ج.م</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-emerald-500/60 p-4 col-span-2 sm:col-span-1 shadow-xs">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">صافي رصيدك القائم</p>
              <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                {fmtMoney(wage?.balanceDue ?? 0)} ج.م
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">جاهزة للصرف</p>
            </div>
          </div>

          {/* Ledger Sub-tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden shadow-xs">
            <div className="flex flex-wrap items-center justify-between p-4 border-b dark:border-gray-700 gap-3">
              <div className="inline-flex bg-gray-100 dark:bg-gray-700/60 p-1 rounded-lg">
                <button
                  onClick={() => setLedgerSubTab("VOUCHERS")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    ledgerSubTab === "VOUCHERS"
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>سجل السندات والعمليات المالية ({wage?.payouts?.length || 0})</span>
                </button>
                <button
                  onClick={() => setLedgerSubTab("STAGES")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    ledgerSubTab === "STAGES"
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>كشف الحالات والمراحل المكتسبة ({wage?.recentStages?.length || 0})</span>
                </button>
              </div>

              <button
                onClick={() => setAdvanceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب سلفة جديدة</span>
              </button>
            </div>

            {ledgerSubTab === "VOUCHERS" ? (
              /* 📜 Vouchers & Payouts Statement */
              <div className="overflow-x-auto">
                {(!wage?.payouts || wage.payouts.length === 0) ? (
                  <div className="p-10 text-center text-gray-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">لا توجد سندات أو حركات صرف مسجلة حتى الآن.</p>
                  </div>
                ) : (
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-right">
                        <th className="py-3 px-3">التاريخ</th>
                        <th className="py-3 px-3">نوع الحركة</th>
                        <th className="py-3 px-3">رقم السند / الإيصال</th>
                        <th className="py-3 px-3">طريقة الصرف</th>
                        <th className="py-3 px-3">المبلغ</th>
                        <th className="py-3 px-3">البيان والملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wage.payouts.map((p) => {
                        const typeBadge =
                          p.type === "PAYOUT"
                            ? { text: "دفعة نقدية", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" }
                            : p.type === "ADVANCE"
                            ? { text: "سلفة", cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" }
                            : p.type === "BONUS"
                            ? { text: "مكافأة", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }
                            : { text: "خصم", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" };

                        return (
                          <tr key={p.id} className="border-b dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-3 px-3 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${typeBadge.cls}`}>
                                {typeBadge.text}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-500">{p.reference || "—"}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{p.paymentMethod || "CASH"}</td>
                            <td className="py-3 px-3 font-black text-gray-900 dark:text-gray-100">
                              {fmtMoney(p.amount)} ج.م
                            </td>
                            <td className="py-3 px-3 text-gray-500 text-xs">{p.notes || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* 🦷 Completed Stages Log */
              <div className="overflow-x-auto">
                {(!wage?.recentStages || wage.recentStages.length === 0) ? (
                  <div className="p-10 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">لم يتم تسجيل مراحل مكتملة معتمدة بعد.</p>
                  </div>
                ) : (
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-right">
                        <th className="py-3 px-3">رقم الحالة</th>
                        <th className="py-3 px-3">المريض</th>
                        <th className="py-3 px-3">نوع الشغل</th>
                        <th className="py-3 px-3">المرحلة المنجزة</th>
                        <th className="py-3 px-3">تاريخ الإنجاز</th>
                        <th className="py-3 px-3">الأجر المستحق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wage.recentStages.map((s) => (
                        <tr key={s.id} className="border-b dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-3 font-bold">
                            <Link to={`/dental-lab/cases/${s.caseId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                              {s.caseNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-3">{s.patientName || "—"}</td>
                          <td className="py-3 px-3 text-gray-500">{s.workTypeName || "—"}</td>
                          <td className="py-3 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{s.stageName}</td>
                          <td className="py-3 px-3 text-gray-400 text-xs">{fmtDate(s.completedAt)}</td>
                          <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                            {fmtMoney(s.wage)} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 🕶️ 3D MODEL VIEWER MODAL ==================== */}
      {active3DAttachment && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden border dark:border-gray-700 shadow-2xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
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

      {/* ==================== 💸 REQUEST ADVANCE MODAL ==================== */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border dark:border-gray-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">تقديم طلب سلفة مالية</h3>
              </div>
              <button onClick={() => setAdvanceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المبلغ المطلوب (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="مثال: 500"
                  className="w-full px-3 py-2 text-sm rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  السبب أو الملاحظات (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="توضيح سبب السلفة..."
                  className="w-full px-3 py-2 text-xs rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance || !advanceAmount}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {submittingAdvance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال الطلب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
