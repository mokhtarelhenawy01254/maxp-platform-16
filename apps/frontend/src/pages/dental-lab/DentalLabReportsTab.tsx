import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  BarChart as ReBarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarRange, FileText, Coins,
  Inbox, Loader2, RefreshCw, RotateCcw, TrendingUp, Users, Wallet,
} from "lucide-react";
import {
  fetchDashboard, fetchDoctors, fetchDoctorStatement, fetchTechnicianProductivity,
  fetchWorkTypeRevenue, fetchOverdueReport, fetchAgingReport, fetchRemakesAnalysis,
  DentalLabDoctor, DoctorStatement, TechnicianProductivity, WorkTypeRevenue, OverdueReportRow, AgingBucket, RemakesAnalysisReport,
  ROLE_CONFIG, fmtMoney, fmtDate, tKey,
} from "./shared";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const monthStartISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

type ReportView = "statement" | "productivity" | "revenue" | "overdue" | "aging" | "remakes";

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100";
const dateCls = "border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 max-w-[160px]";

const chartText = { fontSize: 11, fill: "#6b7280" };

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <FileText className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

const tableWrap = "overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl";
const thCls = "text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60";
const tdCls = "py-2.5 px-3 text-sm";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø¯ÙƒØªÙˆØ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function StatementView() {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<DoctorStatement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const load = async () => {
    if (!doctorId) { toast.error(t("dentalLab.reports.selectDoctorFirst")); return; }
    setLoading(true);
    try {
      setData(await fetchDoctorStatement({ doctorId, from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  };

  const totals = data?.totals;
  const cases = data?.cases ?? [];
  const invoices = data?.invoices ?? [];

  const kpi = [
    { label: t("dentalLab.reports.cases"), value: String(totals?.cases ?? "—"), tone: "text-gray-900 dark:text-white" },
    { label: t("dentalLab.reports.invoices"), value: String(totals?.invoicesCount ?? "—"), tone: "text-gray-900 dark:text-white" },
    { label: t("dentalLab.common.paid"), value: totals ? fmtMoney(totals.paid) : "—", tone: "text-emerald-600 dark:text-emerald-400" },
    { label: t("dentalLab.common.remaining"), value: totals ? fmtMoney(totals.remaining) : "—", tone: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.doctor")}</label>
          <select className={inputCls} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
            <option value="">{t("dentalLab.reports.allDoctors")}</option>
            {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.from")}</label>
          <input className={dateCls} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.to")}</label>
          <input className={dateCls} type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          {t("dentalLab.reports.run")}
        </button>
        {data?.doctor?.name ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
            <Coins className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{t("dentalLab.reports.doctorName")}:</span>
            <span className="font-semibold">{data.doctor.name}</span>
          </div>
        ) : null}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpi.map(k => (
              <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("dentalLab.reports.cases")}</h4>
            {cases.length === 0 ? (
              <EmptyState message={t("dentalLab.common.noData")} />
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>{t("dentalLab.cases.caseNumber")}</th>
                      <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                      <th className={thCls}>{t("dentalLab.cases.workType")}</th>
                      <th className={thCls}>{t("dentalLab.cases.dueDate")}</th>
                      <th className={thCls}>{t("dentalLab.common.total")}</th>
                      <th className={thCls}>{t("dentalLab.common.paid")}</th>
                      <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((cs, i) => (
                      <tr key={cs.caseNumber ?? i} className="border-b dark:border-gray-700 last:border-b-0">
                        <td className={tdCls} dir="ltr">{cs.caseNumber || "—"}</td>
                        <td className={tdCls}>{cs.patientName || "—"}</td>
                        <td className={tdCls}>{cs.workTypeName || "—"}</td>
                        <td className={tdCls}>{fmtDate(cs.dueDate)}</td>
                        <td className={tdCls}>{fmtMoney(cs.total)}</td>
                        <td className={tdCls}>{fmtMoney(cs.paid)}</td>
                        <td className={`${tdCls} text-rose-600 dark:text-rose-400`}>{fmtMoney(cs.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("dentalLab.reports.invoices")}</h4>
            {invoices.length === 0 ? (
              <EmptyState message={t("dentalLab.common.noData")} />
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>{t("dentalLab.detail.invoiceNumber")}</th>
                      <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                      <th className={thCls}>{t("dentalLab.common.total")}</th>
                      <th className={thCls}>{t("dentalLab.common.paid")}</th>
                      <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-b dark:border-gray-700 last:border-b-0">
                        <td className={tdCls} dir="ltr">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                        <td className={tdCls}>{inv.patientName || "—"}</td>
                        <td className={tdCls}>{fmtMoney(inv.total)}</td>
                        <td className={tdCls}>{fmtMoney(inv.paid)}</td>
                        <td className={`${tdCls} text-rose-600 dark:text-rose-400`}>{fmtMoney(inv.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message={t("dentalLab.reports.runToSee")} />
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ø¥Ù†ØªØ§Ø¬ÙŠØ© Ø§Ù„ÙÙ†ÙŠÙŠÙ† â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function ProductivityView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TechnicianProductivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchTechnicianProductivity({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => { load(); }, [load]);

  const totalStages = useMemo(() => rows.reduce((s, r) => s + (r.completedStages ?? 0), 0), [rows]);
  const totalUnits = useMemo(() => rows.reduce((s, r) => s + (r.completedUnits ?? 0), 0), [rows]);
  const totalWages = useMemo(() => rows.reduce((s, r) => s + (r.earnedWages ?? 0), 0), [rows]);
  const totalRemakes = useMemo(() => rows.reduce((s, r) => s + (r.remakesCount ?? 0), 0), [rows]);

  const chartData = useMemo(
    () => rows.map(r => ({
      name: r.name || "—",
      stages: r.completedStages ?? 0,
      units: r.completedUnits ?? 0,
      wages: r.earnedWages ?? 0,
    })),
    [rows],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.from")}</label>
            <input className={dateCls} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.to")}</label>
            <input className={dateCls} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">إجمالي المراحل المكتملة</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalStages} <span className="text-xs font-normal text-gray-400">مرحلة</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">إجمالي الوحدات المنجزة</p>
          <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{totalUnits} <span className="text-xs font-normal text-gray-400">وحدة</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">إجمالي مستحقات وأجور الفريق</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{fmtMoney(totalWages)} <span className="text-xs font-normal text-gray-400">ج.م</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">إجمالي الإعادات المرتبطة</p>
          <p className={`text-2xl font-bold mt-1 ${totalRemakes > 0 ? "text-amber-600" : "text-gray-600"}`}>{totalRemakes} <span className="text-xs font-normal text-gray-400">حالة</span></p>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.common.noData")} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">مقارنة إنتاجية مراحل ووحدات فريق العمل</h4>
            <ResponsiveContainer width="100%" height={240}>
              <ReBarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="name" tick={chartText} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartText} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [String(v), name === "stages" ? "المراحل" : name === "units" ? "الوحدات" : "الأجر (ج.م)"]} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="stages" name="المراحل" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="units" name="الوحدات" fill="#a855f7" radius={[6, 6, 0, 0]} barSize={20} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          <div className={tableWrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300">
                  <th className={thCls}>عضو الفريق</th>
                  <th className={thCls}>التخصص / المحطة</th>
                  <th className={thCls}>الحالات المسندة</th>
                  <th className={thCls}>المراحل المنجزة</th>
                  <th className={thCls}>الوحدات المنجزة</th>
                  <th className={thCls}>متوسط سرعة الإنجاز</th>
                  <th className={thCls}>أجر المرحلة</th>
                  <th className={thCls}>إجمالي المستحقات</th>
                  <th className={thCls}>الإعادات المرتبطة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const roleMeta = ROLE_CONFIG[r.role || ""];
                  return (
                    <tr key={r.technicianId ?? r.name ?? "—"} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className={`${tdCls} font-semibold text-gray-900 dark:text-gray-100`}>{r.name || "—"}</td>
                      <td className={tdCls}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleMeta?.color || "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                          {roleMeta?.label || r.role || "فني"}
                        </span>
                      </td>
                      <td className={tdCls}>{r.assignedCases ?? 0}</td>
                      <td className={`${tdCls} font-bold text-blue-600 dark:text-blue-400 font-mono`}>{r.completedStages ?? 0}</td>
                      <td className={`${tdCls} font-bold text-purple-600 dark:text-purple-400 font-mono`}>{r.completedUnits ?? 0}</td>
                      <td className={tdCls}>
                        {r.avgHoursPerStage ? (
                          <span className="text-xs text-gray-600 dark:text-gray-300">{r.avgHoursPerStage} ساعة (~{r.avgDaysPerStage} يوم)</span>
                        ) : "—"}
                      </td>
                      <td className={tdCls}>{r.wagePerStage ? `${fmtMoney(r.wagePerStage)} ج.م` : "—"}</td>
                      <td className={`${tdCls} font-bold text-emerald-600 dark:text-emerald-400`}>
                        {fmtMoney(r.earnedWages ?? 0)} ج.م
                      </td>
                      <td className={tdCls}>
                        {(r.remakesCount ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {r.remakesCount} إعادات
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ ممتاز (0)</span>
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
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø´ØºÙ„ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function RevenueView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<WorkTypeRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchWorkTypeRevenue({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => { load(); }, [load]);

  const chartData = useMemo(
    () => rows.map(r => ({ name: r.workType || "—", paid: r.paid ?? 0, remaining: r.remaining ?? 0 })),
    [rows],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.from")}</label>
          <input className={dateCls} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.reports.to")}</label>
          <input className={dateCls} type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.common.noData")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t("dentalLab.reports.revenueByTypeChart")}</h4>
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 44)}>
              <ReBarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.08} />
                <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString("en-US")} tick={chartText} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={chartText} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmtMoney(Number(v))} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="paid" name={String(t("dentalLab.common.paid"))} fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-3">
            <div className={tableWrap}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>{t("dentalLab.reports.workType")}</th>
                    <th className={thCls}>{t("dentalLab.reports.cases")}</th>
                    <th className={thCls}>{t("dentalLab.common.total")}</th>
                    <th className={thCls}>{t("dentalLab.common.paid")}</th>
                    <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.workType ?? "—"} className="border-b dark:border-gray-700 last:border-b-0">
                      <td className={`${tdCls} font-medium`}>{r.workType || "—"}</td>
                      <td className={tdCls}>{r.cases ?? 0}</td>
                      <td className={tdCls}>{fmtMoney(r.total)}</td>
                      <td className={`${tdCls} text-emerald-600 dark:text-emerald-400`}>{fmtMoney(r.paid)}</td>
                      <td className={`${tdCls} text-rose-600 dark:text-rose-400`}>{fmtMoney(r.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù…ØªØ£Ø®Ø±Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function OverdueView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<OverdueReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchOverdueReport());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
        <AlertTriangle className="w-4 h-4" />
        <span>{t("dentalLab.reports.overdueHint")}</span>
      </div>
      <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
        <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
      </button>

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.reports.noOverdue")} />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>{t("dentalLab.cases.caseNumber")}</th>
                <th className={thCls}>{t("dentalLab.reports.doctorName")}</th>
                <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                <th className={thCls}>{t("dentalLab.cases.workType")}</th>
                <th className={thCls}>{t("dentalLab.cases.dueDate")}</th>
                <th className={thCls}>{t("dentalLab.reports.daysOverdue")}</th>
                <th className={thCls}>{t("dentalLab.common.remaining")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.caseNumber ?? i} className="border-b dark:border-gray-700 last:border-b-0">
                  <td className={tdCls} dir="ltr">{r.caseNumber || "—"}</td>
                  <td className={tdCls}>{r.doctorName || "—"}</td>
                  <td className={tdCls}>{r.patientName || "—"}</td>
                  <td className={tdCls}>{r.workTypeName || "—"}</td>
                  <td className={tdCls}>{fmtDate(r.dueDate)}</td>
                  <td className={tdCls}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      {r.daysOverdue ?? 0} {t("dentalLab.reports.dayUnit")}
                    </span>
                  </td>
                  <td className={`${tdCls} text-rose-600 dark:text-rose-400`}>{fmtMoney(r.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AgingView() {
  const { t } = useTranslation();
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAgingReport();
      setBuckets(data.buckets || []);
      setTotal(data.totalOutstanding ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const bucketLabel = (label: string) => tKey(t, `dentalLab.reports.aging.${label}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Wallet className="w-4 h-4" />
          <span>{t("dentalLab.reports.aging.hint")}</span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.reports.aging.totalOutstanding")}</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{fmtMoney(total)} {t("dentalLab.common.egp")}</p>
          </div>
          <div className={tableWrap}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>{t("dentalLab.reports.aging.title")}</th>
                  <th className={thCls}>{t("dentalLab.reports.invoices")}</th>
                  <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                </tr>
              </thead>
              <tbody>
                {(buckets || []).map((b, i) => (
                  <tr key={b.label} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-emerald-400" : i <= 2 ? "bg-amber-400" : "bg-rose-500"}`} />
                        {bucketLabel(b.label)}
                      </div>
                    </td>
                    <td className={tdCls}>{b.invoices ?? 0}</td>
                    <td className={`${tdCls} font-semibold ${i === 0 ? "text-gray-700 dark:text-gray-200" : "text-rose-600 dark:text-rose-400"}`}>
                      {fmtMoney(b.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RemakesAnalysisView() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<RemakesAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRemakesAnalysis({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const categories = data?.categories ?? [];
  const topDoctors = data?.topDoctors ?? [];
  const topWorkTypes = data?.topWorkTypes ?? [];
  const list = data?.list ?? [];

  const categoryLabels: Record<string, string> = {
    DOCTOR_IMPRESSION: "طبعة / مقاس الطبيب",
    DOCTOR_PREPARATION: "تحضير وبرد السن",
    LAB_CAD_DESIGN: "تصميم CAD بالمعمل",
    LAB_FIT_MARGIN: "مطابقة وحواف المعمل",
    LAB_SHADE_COLOR: "اختلاف اللون والجماليات",
    MATERIAL_FAILURE: "عيب أو كسر في الخامة",
    PATIENT_CHANGE: "تغيير رغبة المريض",
    OTHER: "أخرى / غير محدد",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t("dentalLab.reports.from")}</label>
            <input className={dateCls} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t("dentalLab.reports.to")}</label>
            <input className={dateCls} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث التقرير
          </button>
        </div>
      </div>

      {loading && <Skeleton rows={6} />}

      {!loading && !data && <EmptyState message={t("dentalLab.common.noData")} />}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">إجمالي حالات الإعادة (Remakes)</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{summary?.totalRemakes ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">إعادات مجانية على المعمل (Lab Warranty)</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.freeRemakes ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">إعادات مدفوعة على الطبيب (Billable)</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.billableRemakes ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <h3 className="font-bold text-sm mb-4">توزيع الأسباب الجذرية للإعادة (Root Causes)</h3>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">لا توجد إعادات مسجلة في هذه الفترة</p>
              ) : (
                <div className="space-y-3">
                  {categories.map(c => {
                    const pct = summary?.totalRemakes ? Math.round((c.count / summary.totalRemakes) * 100) : 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{categoryLabels[c.category] || c.category}</span>
                          <span className="text-gray-500">{c.count} حالات ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-2">أكثر الأطباء تسجيلاً للإعادات</h3>
                {topDoctors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {topDoctors.map(d => (
                      <div key={d.doctorId || d.doctorName} className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="font-medium">{d.doctorName}</span>
                        <span className="font-bold text-rose-600">{d.count} حالات</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t dark:border-gray-700">
                <h3 className="font-bold text-sm mb-2">أكثر التركيبات والأعمال تعرضاً للإعادة</h3>
                {topWorkTypes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {topWorkTypes.map(w => (
                      <div key={w.workTypeName} className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="font-medium">{w.workTypeName}</span>
                        <span className="font-bold text-rose-600">{w.count} حالات</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
            <h3 className="font-bold text-sm mb-3">سجل طلبات الإعادة التفصيلي ({list.length})</h3>
            {list.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">لا توجد حالات إعادة</p>
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-right">
                  <thead>
                    <tr>
                      <th className={thCls}>رقم الحالة</th>
                      <th className={thCls}>الطبيب</th>
                      <th className={thCls}>المريض</th>
                      <th className={thCls}>نوع الشغل</th>
                      <th className={thCls}>السبب الجذري</th>
                      <th className={thCls}>الملاحظات</th>
                      <th className={thCls}>التكلفة</th>
                      <th className={thCls}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {list.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className={`${tdCls} font-mono font-semibold`}>{r.case?.caseNumber || r.caseId.slice(0, 8)}</td>
                        <td className={tdCls}>{r.case?.doctor?.name || "—"}</td>
                        <td className={tdCls}>{r.case?.patientName || "—"}</td>
                        <td className={tdCls}>{r.case?.workType?.name || r.case?.workTypeName || "—"}</td>
                        <td className={tdCls}>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                            {categoryLabels[r.rootCauseCategory || ""] || r.rootCauseCategory || "غير محدد"}
                          </span>
                        </td>
                        <td className={`${tdCls} max-w-xs truncate`} title={r.reason}>{r.reason}</td>
                        <td className={tdCls}>
                          {r.isBillable ? (
                            <span className="text-blue-600 font-bold">مدفوعة (على الطبيب)</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">مجانية (ضمان المعمل)</span>
                          )}
                        </td>
                        <td className={tdCls}>{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* —————————————————————————————————————————————————————————— الصفحة الرئيسية —————————————————————————————————————————————————————————— */

const VIEWS: { id: ReportView; labelKey?: string; label?: string; icon: ReactNode }[] = [
  { id: "statement", labelKey: "dentalLab.reports.statementTab", icon: <FileText className="w-4 h-4" /> },
  { id: "productivity", labelKey: "dentalLab.reports.productivityTab", icon: <Users className="w-4 h-4" /> },
  { id: "aging", labelKey: "dentalLab.reports.aging.title", icon: <Wallet className="w-4 h-4" /> },
  { id: "overdue", labelKey: "dentalLab.reports.overdueTab", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "revenue", labelKey: "dentalLab.reports.revenueTab", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "remakes", label: "تحليل الإعادات والأسباب (Remakes)", icon: <RotateCcw className="w-4 h-4" /> },
];

export default function DentalLabReportsTab() {
  const { t } = useTranslation();
  const [view, setView] = useState<ReportView>("statement");
  const [kpi, setKpi] = useState<{ todayReceived: number; overdueCount: number; revenue: number; outstanding: number } | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(d => setKpi({ todayReceived: d.todayReceived ?? 0, overdueCount: d.overdueCount ?? 0, revenue: d.revenue ?? 0, outstanding: d.outstanding ?? 0 }))
      .catch(() => setKpi(null));
  }, []);

  const kpiCards = [
    { label: t("dentalLab.dashboard.collected"), value: kpi ? fmtMoney(kpi.revenue) : "—", icon: <ArrowUpRight className="w-4 h-4" />, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: t("dentalLab.dashboard.outstanding"), value: kpi ? fmtMoney(kpi.outstanding) : "—", icon: <ArrowDownLeft className="w-4 h-4" />, tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { label: "حالات اليوم", value: String(kpi?.todayReceived ?? "—"), icon: <Inbox className="w-4 h-4" />, tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: t("dentalLab.dashboard.overdueCount"), value: String(kpi?.overdueCount ?? "—"), icon: <AlertTriangle className="w-4 h-4" />, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("dentalLab.reports.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CalendarRange className="w-4 h-4" />
          {t("dentalLab.reports.periodHint")}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.bg} ${k.tone}`}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{k.label}</p>
              <p className={`text-lg font-bold truncate ${k.tone}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1 flex-wrap">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {v.icon}
            {v.labelKey ? t(v.labelKey) : v.label}
          </button>
        ))}
      </div>

      <div>
        {view === "statement" && <StatementView />}
        {view === "productivity" && <ProductivityView />}
        {view === "revenue" && <RevenueView />}
        {view === "overdue" && <OverdueView />}
        {view === "aging" && <AgingView />}
        {view === "remakes" && <RemakesAnalysisView />}
      </div>
    </div>
  );
}
