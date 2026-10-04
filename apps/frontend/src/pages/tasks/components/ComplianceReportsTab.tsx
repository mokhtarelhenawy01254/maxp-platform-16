import React, { useState, useEffect } from "react";
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  UserCircleIcon,
  FlagIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface MemberCompliance {
  userId: string;
  userName: string;
  email: string;
  avatar?: string | null;
  totalAssigned: number;
  completedCount: number;
  inReviewCount: number;
  totalDeliveries: number;
  deliveriesWithoutEvidence: number;
  deliveriesWithoutEvidenceRate: number;
  totalReturns: number;
  returnRate: number;
  avgApprovalTimeHours: number;
  blockedReviewCount: number;
  blockedReviewTasks: Array<{
    id: string;
    title: string;
    priority: string;
    hoursInReview: number;
    missingEvidence: boolean;
  }>;
  activeTimeWithoutTaskHours: number;
  totalTrackedHours: number;
  oldestOpenTask?: {
    id: string;
    title: string;
    daysOpen: number;
    priority: string;
  } | null;
  complianceScore: number;
}

interface ComplianceData {
  periodDays: number;
  generatedAt: string;
  overall: {
    totalTasks: number;
    totalDeliveries: number;
    deliveriesWithoutEvidence: number;
    deliveriesWithoutEvidenceRate: number;
    totalReturns: number;
    avgApprovalTimeHours: number;
    blockedReviewCount: number;
    blockedReviewTasks: Array<any>;
    activeMembersCount: number;
  };
  members: MemberCompliance[];
}

export const ComplianceReportsTab: React.FC = () => {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [selectedMember, setSelectedMember] = useState<MemberCompliance | null>(null);
  const [legacyFlagLoading, setLegacyFlagLoading] = useState(false);
  const [legacyFlagMsg, setLegacyFlagMsg] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/reports/compliance?periodDays=${periodDays}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "فشل في تحميل تقرير الالتزام");
      }
    } catch (err: any) {
      setError(err?.message || "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [periodDays]);

  const handleFlagLegacy = async () => {
    if (!window.confirm("هل تريد وسم جميع المهام المعلقة في IN_REVIEW بدون دليل كـ «بدون دليل»؟")) return;
    setLegacyFlagLoading(true);
    setLegacyFlagMsg(null);
    try {
      const res = await fetch("/api/tasks/admin/flag-legacy-in-review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setLegacyFlagMsg(json.message);
        await fetchReport();
      } else {
        alert(json.error || "فشلت العملية");
      }
    } catch (e: any) {
      alert(e?.message || "خطأ في الشبكة");
    } finally {
      setLegacyFlagLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <ArrowPathIcon className="size-6 mx-auto animate-spin mb-2" />
        <p className="text-xs">جاري تحليل بيانات الالتزام وجودة التسليم...</p>
      </div>
    );
  }

  const overall = data?.overall;

  return (
    <div className="p-3 sm:p-5 space-y-5 text-right max-w-7xl mx-auto" dir="rtl">
      {/* Top Action & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            تقارير الالتزام ومؤشرات جودة التسليم (Compliance & Quality)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            قياس التسليمات بدون دليل، معدلات الإرجاع، والمهام المسدودة عبر الستة مؤشرات المقيسة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleFlagLegacy}
            disabled={legacyFlagLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition flex items-center gap-1.5"
            title="وسم الـ 80 مهمة القديمة في IN_REVIEW كـ «بدون دليل»"
          >
            <FlagIcon className="size-3.5" />
            {legacyFlagLoading ? "جاري المعالجة..." : "وسم المهام القديمة (بدون دليل)"}
          </button>

          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="h-9 px-3 rounded-xl text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-200"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوماً</option>
            <option value={90}>آخر 3 أشهر</option>
            <option value={365}>السنة كاملة</option>
          </select>

          <button
            type="button"
            onClick={fetchReport}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 transition"
            title="تحديث البيانات"
          >
            <ArrowPathIcon className="size-4" />
          </button>
        </div>
      </div>

      {legacyFlagMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
          {legacyFlagMsg}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 6 Key Indicators Bento Grid */}
      {overall && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {/* 1. Deliveries Without Evidence */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">1. تسليمات بدون دليل</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black tabular-nums ${overall.deliveriesWithoutEvidenceRate > 30 ? "text-rose-600" : "text-emerald-600"}`}>
                {overall.deliveriesWithoutEvidenceRate}%
              </span>
              <span className="text-[11px] text-zinc-400">
                ({overall.deliveriesWithoutEvidence} من {overall.totalDeliveries})
              </span>
            </div>
          </div>

          {/* 2. Return Rate & Count */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">2. مرات ومعدل الإرجاع</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 tabular-nums">
                {overall.totalReturns}
              </span>
              <span className="text-[11px] text-zinc-400">إرجاع مسجّل</span>
            </div>
          </div>

          {/* 3. Average Approval Time */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">3. متوسط زمن الاعتماد</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                {overall.avgApprovalTimeHours}h
              </span>
              <span className="text-[11px] text-zinc-400">ساعة</span>
            </div>
          </div>

          {/* 4. Blocked in Review > 48h */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">4. مسدودة &gt; 48 ساعة</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black tabular-nums ${overall.blockedReviewCount > 0 ? "text-rose-600 animate-pulse" : "text-zinc-900 dark:text-zinc-100"}`}>
                {overall.blockedReviewCount}
              </span>
              <span className="text-[11px] text-zinc-400">مهمة عالقة</span>
            </div>
          </div>

          {/* 5. Total Deliveries */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">5. إجمالي التسليمات</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary tabular-nums">
                {overall.totalDeliveries}
              </span>
              <span className="text-[11px] text-zinc-400">من {overall.totalTasks}</span>
            </div>
          </div>

          {/* 6. Active Team Members */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-medium">6. أفراد الفريق المرصودين</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 tabular-nums">
                {overall.activeMembersCount}
              </span>
              <span className="text-[11px] text-zinc-400">فرد</span>
            </div>
          </div>
        </div>
      )}

      {/* Individual Members Ledger Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
            تقرير الالتزام الفردي لكل عضو في الفريق
          </h3>
          <span className="text-xs text-zinc-400">
            مرتب تلقائياً بنسبة التسليم بدون دليل ومعدل الإرجاع
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">الفرد</th>
                <th className="py-3 px-3 text-center">المسندة</th>
                <th className="py-3 px-3 text-center">التسليمات</th>
                <th className="py-3 px-3 text-center">بدون دليل %</th>
                <th className="py-3 px-3 text-center">مرات الإرجاع</th>
                <th className="py-3 px-3 text-center">متوسط الاعتماد</th>
                <th className="py-3 px-3 text-center">مسدودة &gt;48h</th>
                <th className="py-3 px-3 text-center">نشاط بدون مهمة</th>
                <th className="py-3 px-4">أقدم مهمة مفتوحة</th>
                <th className="py-3 px-4 text-center">درجة الالتزام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data?.members.map((m) => {
                const isShorouk = m.userName.includes("شروق") || m.email.includes("shrou");
                return (
                  <tr
                    key={m.userId}
                    onClick={() => setSelectedMember(m)}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition ${
                      isShorouk ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <UserCircleIcon className="size-5 text-zinc-400 shrink-0" />
                      <div>
                        <span>{m.userName}</span>
                        {isShorouk && (
                          <span className="mr-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                            مرصود
                          </span>
                        )}
                        <p className="text-[10px] text-zinc-400 font-normal">{m.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold">{m.totalAssigned}</td>
                    <td className="py-3 px-3 text-center tabular-nums">{m.totalDeliveries}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold tabular-nums text-[11px] ${
                        m.deliveriesWithoutEvidenceRate > 50
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                          : m.deliveriesWithoutEvidenceRate > 20
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}>
                        {m.deliveriesWithoutEvidenceRate}% ({m.deliveriesWithoutEvidence})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-medium text-amber-600">
                      {m.totalReturns}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums">
                      {m.avgApprovalTimeHours > 0 ? `${m.avgApprovalTimeHours}h` : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {m.blockedReviewCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                          {m.blockedReviewCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums text-zinc-500">
                      {m.activeTimeWithoutTaskHours > 0 ? `${m.activeTimeWithoutTaskHours}h` : "0"}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px]">
                      {m.oldestOpenTask ? (
                        <span title={m.oldestOpenTask.title}>
                          {m.oldestOpenTask.title} ({m.oldestOpenTask.daysOpen} يوم)
                        </span>
                      ) : (
                        <span className="text-zinc-400">لا توجد</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-black text-xs tabular-nums ${
                          m.complianceScore < 60 ? "text-rose-600" : m.complianceScore < 85 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {m.complianceScore}
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.complianceScore < 60 ? "bg-rose-500" : m.complianceScore < 85 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${m.complianceScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Drill-down Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <div>
                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  ملف التزام: {selectedMember.userName}
                </h4>
                <p className="text-xs text-zinc-400">{selectedMember.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-zinc-500">التسليمات بدون دليل:</span>
                <p className="text-lg font-bold text-rose-600 mt-1">
                  {selectedMember.deliveriesWithoutEvidenceRate}% ({selectedMember.deliveriesWithoutEvidence} من {selectedMember.totalDeliveries})
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-zinc-500">إجمالي مرات الإرجاع:</span>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {selectedMember.totalReturns} إرجاع
                </p>
              </div>
            </div>

            {selectedMember.blockedReviewTasks.length > 0 && (
              <div>
                <h5 className="font-bold text-xs text-rose-600 mb-2">
                  المهام المسدودة في المراجعة &gt; 48 ساعة ({selectedMember.blockedReviewTasks.length}):
                </h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedMember.blockedReviewTasks.map((t) => (
                    <div key={t.id} className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 text-xs flex justify-between items-center">
                      <span className="truncate max-w-xs">{t.title}</span>
                      <span className="text-rose-600 font-bold shrink-0">{t.hoursInReview} ساعة</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
