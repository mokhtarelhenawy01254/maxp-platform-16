import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  AlertTriangle,
  Flame,
  Box,
  Layers,
  Table as TableIcon,
  Clock,
  Play,
  Pause,
  Upload,
  Eye,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  MyCase,
  nextStatusOf,
  advanceCase,
  uploadTechAttachment,
  fmtDate,
} from "../shared";
import DentalModelViewer from "../DentalModelViewer";

interface DentalTechBenchTabProps {
  cases: MyCase[];
  onReload: () => Promise<void>;
  initialFilter?: "ALL" | "OVERDUE" | "URGENT" | "SCAN";
}

export const DentalTechBenchTab: React.FC<DentalTechBenchTabProps> = ({
  cases,
  onReload,
  initialFilter = "ALL",
}) => {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "OVERDUE" | "URGENT" | "SCAN">(initialFilter);
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Bench Stage Timers (caseId -> { running: boolean, elapsedSeconds: number })
  const [timers, setTimers] = useState<Record<string, { running: boolean; elapsedSeconds: number }>>({});

  // Modals state
  const [active3DAttachment, setActive3DAttachment] = useState<{ url: string; ext: string; fileName: string } | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Stopwatch ticker
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
      const current = prev[caseId] || { running: false, elapsedSeconds: 0 };
      return {
        ...prev,
        [caseId]: {
          ...current,
          running: !current.running,
        },
      };
    });
  };

  const fmtTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const isCaseOverdue = useCallback((c: MyCase) => {
    if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  }, []);

  const getOverdueDays = useCallback((c: MyCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const safeCases = useMemo(() => (Array.isArray(cases) ? cases : []), [cases]);

  const overdueCasesList = useMemo(() => {
    return safeCases.filter(isCaseOverdue);
  }, [safeCases, isCaseOverdue]);

  const filteredCases = useMemo(() => {
    let list = [...safeCases];
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

    return list.sort((a, b) => {
      const aOver = isCaseOverdue(a) ? 1 : 0;
      const bOver = isCaseOverdue(b) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      const aUrg = a.priority === "URGENT" ? 1 : 0;
      const bUrg = b.priority === "URGENT" ? 1 : 0;
      return bUrg - aUrg;
    });
  }, [safeCases, search, filterPriority, isCaseOverdue]);

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
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل في تحديث حالة الشغل");
    } finally {
      setBusyId(null);
    }
  };

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
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل في رفع الملف");
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
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
            الكل ({safeCases.length})
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

        {/* Search & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الحالة، الطبيب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-gray-50 dark:bg-gray-800 shrink-0">
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
        </div>
      </div>

      {/* Overdue Warning Alert */}
      {overdueCasesList.length > 0 && filterPriority !== "OVERDUE" && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>
              يوجد <b>{overdueCasesList.length} حالة متأخرة</b> عن موعد التسليم المقرر للعيادة. يرجى إعطاؤها الأولوية القصوى على الطاولة.
            </span>
          </div>
          <button
            onClick={() => setFilterPriority("OVERDUE")}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shrink-0 transition"
          >
            تصفية المتأخرات فقط
          </button>
        </div>
      )}

      {/* Main List Display */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {filterPriority === "OVERDUE"
              ? "ممتاز! لا توجد أي حالات متأخرة حالياً"
              : "لا توجد حالات مطابقة لمعايير البحث الحالية"}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {filterPriority === "OVERDUE"
              ? "جميع الحالات المسندة إليك تسير وفق الجدول الزمني المحدد"
              : "جرب تغيير نص البحث أو اختيار تصفية أخرى"}
          </p>
          {filterPriority !== "ALL" && (
            <button
              onClick={() => setFilterPriority("ALL")}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50"
            >
              عرض كافة الحالات
            </button>
          )}
        </div>
      ) : viewMode === "CARDS" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredCases.map((c) => {
            const overdue = isCaseOverdue(c);
            const overdueDays = getOverdueDays(c);
            const timerState = timers[c.id] || { running: false, elapsedSeconds: 0 };
            const nextStatus = nextStatusOf(c.status);

            const scanAttachments = (c.attachments || []).filter(
              (a: any) =>
                a.fileType === "STL" ||
                a.fileType === "PLY" ||
                a.fileType === "OBJ" ||
                (a.fileName && /\.(stl|ply|obj)$/i.test(a.fileName))
            );

            return (
              <div
                key={c.id}
                className={`flex flex-col justify-between rounded-2xl border transition-all shadow-xs ${
                  overdue
                    ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-400"
                    : c.priority === "URGENT"
                    ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                {/* Top Section */}
                <div className="p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">
                          #{c.caseNumber || c.id.slice(0, 6)}
                        </span>
                        {overdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 animate-pulse flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            متأخرة ({overdueDays} يوم)
                          </span>
                        ) : c.priority === "URGENT" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                            طارئ ⚡
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {c.workTypeName || "عمل معمل أسنان"}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {c.activeStageName || c.status}
                      </span>
                    </div>
                  </div>

                  {/* Doctor and Patient Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="text-gray-400 block text-[10px]">الطبيب:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                        {c.doctorName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">المريض:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                        {c.patientName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">اللون (Shade):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                        {c.shade || "غير محدد"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">تاريخ التسليم:</span>
                      <span
                        className={`font-semibold block ${
                          overdue ? "text-rose-600 font-bold" : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {fmtDate(c.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* 3D Files Quick Trigger */}
                  {scanAttachments.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Box className="w-3 h-3 text-indigo-500" />
                        ملفات 3D:
                      </span>
                      {scanAttachments.slice(0, 2).map((att: any, idx: number) => (
                        <button
                          key={att.id || idx}
                          onClick={() =>
                            setActive3DAttachment({
                              url: att.fileUrl || att.url,
                              ext: (att.fileType || "stl").toLowerCase(),
                              fileName: att.fileName || `model-${c.caseNumber}.${att.fileType || "stl"}`,
                            })
                          }
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>معاينة {att.fileType || "3D"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl flex items-center justify-between gap-2">
                  {/* Stopwatch */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleTimer(c.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        timerState.running
                          ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                          : timerState.elapsedSeconds > 0
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                          : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-700"
                      }`}
                      title={timerState.running ? "إيقاف مؤقت للوقت" : "بدء عداد وقت المرحلة"}
                    >
                      {timerState.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {fmtTimer(timerState.elapsedSeconds)}
                    </span>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setUploadCaseId(c.id);
                        setUploadFile(null);
                      }}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="رفع مخرجات المرحلة أو صور"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to={`/dental-lab/cases/${c.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 text-xs font-semibold"
                    >
                      التفاصيل
                    </Link>

                    {nextStatus && (
                      <button
                        onClick={() => handleAdvance(c)}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        {busyId === c.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>إنهاء المرحلة</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3">رقم الحالة</th>
                  <th className="py-3 px-3">نوع الشغل</th>
                  <th className="py-3 px-3">المرحلة الحالية</th>
                  <th className="py-3 px-3">الطبيب / المريض</th>
                  <th className="py-3 px-3">اللون</th>
                  <th className="py-3 px-3">الاستحقاق</th>
                  <th className="py-3 px-3 text-left">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCases.map((c) => {
                  const overdue = isCaseOverdue(c);
                  const nextStatus = nextStatusOf(c.status);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${
                        overdue ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <Link to={`/dental-lab/cases/${c.id}`} className="text-blue-600 hover:underline">
                          #{c.caseNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                        {c.workTypeName || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                          {c.activeStageName || c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                        {c.doctorName || "—"} / {c.patientName || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">{c.shade || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={overdue ? "text-rose-600 font-bold" : "text-gray-500"}>
                          {fmtDate(c.dueDate)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        {nextStatus ? (
                          <button
                            onClick={() => handleAdvance(c)}
                            disabled={busyId === c.id}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                          >
                            إنهاء المرحلة
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[11px]">مكتمل</span>
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

      {/* 3D Model Viewer Modal */}
      {active3DAttachment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  معاينة ثلاثية الأبعاد: {active3DAttachment.fileName}
                </h3>
              </div>
              <button
                onClick={() => setActive3DAttachment(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-[450px] bg-slate-950">
              <DentalModelViewer
                url={active3DAttachment.url}
                fileType={active3DAttachment.ext as any}
                fileName={active3DAttachment.fileName}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadCaseId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>رفع مخرجات المرحلة أو صور توثيق</span>
              </h4>
              <button
                onClick={() => setUploadCaseId(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  اختر الملف (صورة، STL، أو PDF)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadCaseId(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploadingFile}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {uploadingFile && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>رفع وتأكيد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalTechBenchTab;
