import { useEffect, useState, type ReactNode } from "react";
import { api, getAuthHeaders, MODAL_INPUT_CLS, REPORT_STATUS_MAP, PAYMENT_METHOD_LABEL, fetchJson, BookingBranch, BookingDoctor } from "./shared";

interface Props {
  branches?: BookingBranch[];
  doctors?: BookingDoctor[];
  selectedBranchId?: string;
}

type SubTab = "revenue" | "actualVsExpected" | "commissions" | "dues" | "refunds" | "cashierDaily";

const ENDPOINTS: Record<SubTab, string> = {
  revenue: "revenue",
  actualVsExpected: "actual-vs-expected",
  commissions: "physician-commissions",
  dues: "dues",
  refunds: "refunds",
  cashierDaily: "cashier-daily",
};

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "revenue", label: "╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬" },
  { id: "actualVsExpected", label: "╪º┘ä┘ü╪╣┘ä┘è ┘à┘é╪º╪¿┘ä ╪º┘ä┘à╪¬┘ê┘é╪╣" },
  { id: "commissions", label: "╪╣┘à┘ê┘ä╪º╪¬ ╪º┘ä╪ú╪╖╪¿╪º╪í" },
  { id: "dues", label: "╪º┘ä┘à╪│╪¬╪¡┘é╪º╪¬" },
  { id: "refunds", label: "╪º┘ä╪º╪│╪¬╪▒╪»╪º╪»╪º╪¬" },
  { id: "cashierDaily", label: "╪¡╪│╪º╪¿ ╪º┘ä┘â╪º╪┤┘è╪▒ ╪º┘ä┘è┘ê┘à┘è" },
];

interface RevenueTotals { billed: number; discounts: number; collected: number; outstanding: number; invoiceCount: number; }
interface RevenueRow { id: string | null; name: string; billed: number; discounts: number; collected: number; outstanding: number; invoiceCount: number; }
interface RevenueData { dateFrom: string; dateTo: string; totals: RevenueTotals; byDoctor: RevenueRow[]; byService: RevenueRow[]; }

interface ActualVsExpectedData {
  dateFrom: string; dateTo: string;
  totals: { expected: number; actual: number; variance: number };
  rows: { date: string; expected: number; actual: number; variance: number }[];
}

interface CommissionRow {
  doctorId: string; doctorName: string; specialty: string; branchId: string | null; branchName: string;
  gross: number; commissionRate: number; commission: number; net: number; invoiceCount: number;
  byReportStatus: { status: string; count: number }[]; unapprovedCount: number;
}
interface CommissionsData {
  dateFrom: string; dateTo: string;
  totals: { gross: number; commission: number; net: number; unapprovedCount: number };
  rows: CommissionRow[];
}

interface DuesInvoice { invoiceNumber: string; total: number; discount: number; net: number; amountPaid: number; remaining: number; status: string; dueDate: string; createdAt: string; }
interface DuesPatient { patientId: string; patientName: string; patientPhone: string; totalOutstanding: number; paidBackTotal: number; invoiceCount: number; invoices: DuesInvoice[]; }
interface DuesData {
  dateFrom: string; dateTo: string;
  totals: { outstanding: number; paidBackTotal: number; invoiceCount: number; patientCount: number };
  patients: DuesPatient[];
}

interface RefundRow { id: string; invoiceId: string; invoiceNumber: string; patientName: string; patientPhone: string; amount: number; method: string; reason: string; cashierName: string; paidAt: string; }
interface RefundsData {
  dateFrom: string; dateTo: string;
  summary: { totalPayback: number; count: number; methods: { method: string; total: number }[]; cashiers: { cashierName: string; total: number; count: number }[] };
  rows: RefundRow[];
}

interface CashierDailyData {
  dateFrom: string; dateTo: string;
  totals: { totalCollected: number; totalCount: number; discounts: number; paybacks: number; netCollected: number; dayCount: number; cashierCount: number };
  rows: {
    date: string; cashierName: string; byMethod: { method: string; amount: number; count: number }[];
    totalCollected: number; totalCount: number; discounts: number; paybacks: number; netCollected: number;
    openingBalance: number; closingBalance: number | null; shiftStatus: string;
  }[];
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const fmt = (n: number) => Number(n || 0).toFixed(2);

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{headers.map(h => <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const Empty = () => (
  <p className="text-center py-12 text-gray-400 dark:text-gray-500">┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬</p>
);

const tdCls = "py-3 px-4 border-b dark:border-gray-700";

export default function BookingReportsTab({ branches = [], doctors = [], selectedBranchId }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("revenue");
  const [from, setFrom] = useState(monthStartStr);
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState(selectedBranchId || "");
  const [doctorId, setDoctorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [fetchedBranches, setFetchedBranches] = useState<BookingBranch[]>([]);
  const [fetchedDoctors, setFetchedDoctors] = useState<BookingDoctor[]>([]);

  useEffect(() => {
    if (branches.length === 0) {
      fetchJson<BookingBranch[]>(api("branches")).then(setFetchedBranches).catch(() => {});
    }
    if (doctors.length === 0) {
      fetchJson<BookingDoctor[]>(api("doctors")).then(setFetchedDoctors).catch(() => {});
    }
  }, []);

  const branchList = branches.length > 0 ? branches : fetchedBranches;
  const doctorList = doctors.length > 0 ? doctors : fetchedDoctors;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("from", from);
        params.set("to", to);
        if (branchId) params.set("branchId", branchId);
        if (doctorId) params.set("doctorId", doctorId);
        const res = await fetch(api(`reports/${ENDPOINTS[subTab]}?${params.toString()}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "┘ü╪┤┘ä ╪¼┘ä╪¿ ╪º┘ä╪¬┘é╪▒┘è╪▒");
        if (!cancelled) setData(prev => ({ ...prev, [subTab]: json.data }));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¼┘ä╪¿ ╪º┘ä╪¬┘é╪▒┘è╪▒");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subTab, from, to, branchId, doctorId]);

  const branchOptions = branchList;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä┘à╪º┘ä┘è╪⌐ ┘ê╪º┘ä╪¬╪┤╪║┘è┘ä┘è╪⌐</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" className={MODAL_INPUT_CLS} value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" className={MODAL_INPUT_CLS} value={to} onChange={e => setTo(e.target.value)} />
          <select className={MODAL_INPUT_CLS} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">┘â┘ä ╪º┘ä┘ü╪▒┘ê╪╣</option>
            {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={MODAL_INPUT_CLS} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
            <option value="">┘â┘ä ╪º┘ä╪ú╪╖╪¿╪º╪í</option>
            {doctorList.filter(d => !branchId || d.branchId === branchId).map(d => <option key={d.id} value={d.id}>{`${d.title || ""} ${d.name || ""}`.trim() || d.id}</option>)}
          </select>
          <button
            onClick={() => { setFrom(monthStartStr()); setTo(todayStr()); setBranchId(selectedBranchId || ""); setDoctorId(""); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >╪Ñ╪╣╪º╪»╪⌐ ╪¬╪╣┘è┘è┘å</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-sm rounded-lg border ${subTab === t.id ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
          >{t.label}</button>
        ))}
      </div>

      {loading && <p className="text-center py-8 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¬┘é╪▒┘è╪▒...</p>}
      {!loading && error && <p className="text-center py-8 text-red-500">{error}</p>}

      {!loading && !error && subTab === "revenue" && (() => {
        const d = data["revenue"] as RevenueData | undefined;
        if (!d) return <Empty />;
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒" value={fmt(d.totals.billed)} color="text-blue-600 dark:text-blue-400" />
              <KpiCard label="╪º┘ä╪«╪╡┘ê┘à╪º╪¬" value={fmt(d.totals.discounts)} color="text-orange-600 dark:text-orange-400" />
              <KpiCard label="╪º┘ä┘à╪¡╪╡┘æ┘ä" value={fmt(d.totals.collected)} color="text-green-600 dark:text-green-400" />
              <KpiCard label="╪º┘ä┘à╪¬╪¿┘é┘è" value={fmt(d.totals.outstanding)} color="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-bold mb-3">╪¡╪│╪¿ ╪º┘ä╪╖╪¿┘è╪¿</h3>
            {d.byDoctor.length === 0 ? <Empty /> : (
              <div className="mb-6">
                <DataTable headers={["╪º┘ä╪╖╪¿┘è╪¿", "╪º┘ä┘ü┘ê╪¬╪▒╪⌐", "╪º┘ä╪«╪╡┘à", "╪º┘ä┘à╪¡╪╡┘æ┘ä", "╪º┘ä┘à╪¬╪¿┘é┘è", "┘ü┘ê╪º╪¬┘è╪▒"]}>
                  {d.byDoctor.map(r => (
                    <tr key={r.id || "none"} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className={tdCls}>{r.name}</td>
                      <td className={tdCls}>{fmt(r.billed)}</td>
                      <td className={tdCls}>{fmt(r.discounts)}</td>
                      <td className={tdCls}>{fmt(r.collected)}</td>
                      <td className={tdCls}>{fmt(r.outstanding)}</td>
                      <td className={tdCls}>{r.invoiceCount}</td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}
            <h3 className="font-bold mb-3">╪¡╪│╪¿ ╪º┘ä╪«╪»┘à╪⌐</h3>
            {d.byService.length === 0 ? <Empty /> : (
              <DataTable headers={["╪º┘ä╪«╪»┘à╪⌐", "╪º┘ä┘ü┘ê╪¬╪▒╪⌐", "╪º┘ä╪«╪╡┘à", "╪º┘ä┘à╪¡╪╡┘æ┘ä", "╪º┘ä┘à╪¬╪¿┘é┘è", "┘ü┘ê╪º╪¬┘è╪▒"]}>
                {d.byService.map(r => (
                  <tr key={r.id || "none"} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={tdCls}>{r.name}</td>
                    <td className={tdCls}>{fmt(r.billed)}</td>
                    <td className={tdCls}>{fmt(r.discounts)}</td>
                    <td className={tdCls}>{fmt(r.collected)}</td>
                    <td className={tdCls}>{fmt(r.outstanding)}</td>
                    <td className={tdCls}>{r.invoiceCount}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        );
      })()}

      {!loading && !error && subTab === "actualVsExpected" && (() => {
        const d = data["actualVsExpected"] as ActualVsExpectedData | undefined;
        if (!d) return <Empty />;
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <KpiCard label="╪º┘ä┘à╪¬┘ê┘é╪╣" value={fmt(d.totals.expected)} color="text-blue-600 dark:text-blue-400" />
              <KpiCard label="╪º┘ä┘ü╪╣┘ä┘è" value={fmt(d.totals.actual)} color="text-green-600 dark:text-green-400" />
              <KpiCard label="╪º┘ä┘ü╪▒┘é (┘â╪┤┘ü ╪¬╪│╪▒┘è╪¿)" value={fmt(d.totals.variance)} color={d.totals.variance < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} />
            </div>
            {d.rows.length === 0 ? <Empty /> : (
              <DataTable headers={["╪º┘ä╪¬╪º╪▒┘è╪«", "╪º┘ä┘à╪¬┘ê┘é╪╣", "╪º┘ä┘ü╪╣┘ä┘è", "╪º┘ä┘ü╪▒┘é"]}>
                {d.rows.map(r => (
                  <tr key={r.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={tdCls}>{r.date}</td>
                    <td className={tdCls}>{fmt(r.expected)}</td>
                    <td className={tdCls}>{fmt(r.actual)}</td>
                    <td className={`${tdCls} ${r.variance < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{fmt(r.variance)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        );
      })()}

      {!loading && !error && subTab === "commissions" && (() => {
        const d = data["commissions"] as CommissionsData | undefined;
        if (!d) return <Empty />;
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è" value={fmt(d.totals.gross)} color="text-blue-600 dark:text-blue-400" />
              <KpiCard label="╪º┘ä╪╣┘à┘ê┘ä╪º╪¬" value={fmt(d.totals.commission)} color="text-orange-600 dark:text-orange-400" />
              <KpiCard label="╪º┘ä╪╡╪º┘ü┘è" value={fmt(d.totals.net)} color="text-green-600 dark:text-green-400" />
              <KpiCard label="╪║┘è╪▒ ┘à╪╣╪¬┘à╪»╪⌐" value={String(d.totals.unapprovedCount)} color="text-red-600 dark:text-red-400" />
            </div>
            {d.rows.length === 0 ? <Empty /> : (
              <DataTable headers={["╪º┘ä╪╖╪¿┘è╪¿", "╪º┘ä╪¬╪«╪╡╪╡", "╪º┘ä┘ü╪▒╪╣", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è", "╪º┘ä┘å╪│╪¿╪⌐ %", "╪º┘ä╪╣┘à┘ê┘ä╪⌐", "╪º┘ä╪╡╪º┘ü┘è", "┘ü┘ê╪º╪¬┘è╪▒", "╪¡╪º┘ä╪⌐ ╪º┘ä╪¬┘é╪º╪▒┘è╪▒", "╪║┘è╪▒ ┘à╪╣╪¬┘à╪»╪⌐"]}>
                {d.rows.map(r => (
                  <tr key={r.doctorId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={tdCls}>{r.doctorName}</td>
                    <td className={tdCls}>{r.specialty || "ΓÇö"}</td>
                    <td className={tdCls}>{r.branchName}</td>
                    <td className={tdCls}>{fmt(r.gross)}</td>
                    <td className={tdCls}>{r.commissionRate}%</td>
                    <td className={tdCls}>{fmt(r.commission)}</td>
                    <td className={tdCls}>{fmt(r.net)}</td>
                    <td className={tdCls}>{r.invoiceCount}</td>
                    <td className={tdCls}>
                      {r.byReportStatus.map((s, i) => (
                        <span key={i} className="inline-block mx-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                          {REPORT_STATUS_MAP[s.status]?.label || (s.status === "NONE" ? "╪¿╪»┘ê┘å ╪¬┘é╪▒┘è╪▒" : s.status)}: {s.count}
                        </span>
                      ))}
                    </td>
                    <td className={tdCls}>{r.unapprovedCount}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        );
      })()}

      {!loading && !error && subTab === "dues" && (() => {
        const d = data["dues"] as DuesData | undefined;
        if (!d) return <Empty />;
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪│╪¬╪¡┘é" value={fmt(d.totals.outstanding)} color="text-red-600 dark:text-red-400" />
              <KpiCard label="╪º┘ä┘à╪│╪»╪»" value={fmt(d.totals.paidBackTotal)} color="text-green-600 dark:text-green-400" />
              <KpiCard label="┘ü┘ê╪º╪¬┘è╪▒ ┘à┘ü╪¬┘ê╪¡╪⌐" value={String(d.totals.invoiceCount)} color="text-blue-600 dark:text-blue-400" />
              <KpiCard label="┘à╪▒╪╢┘ë" value={String(d.totals.patientCount)} color="text-purple-600 dark:text-purple-400" />
            </div>
            {d.patients.length === 0 ? <Empty /> : (
              <div className="space-y-4">
                {d.patients.map(p => (
                  <details key={p.patientId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                    <summary className="cursor-pointer flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <p className="font-bold">{p.patientName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500" dir="ltr">{p.patientPhone || "ΓÇö"}</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>╪º┘ä┘à╪│╪¬╪¡┘é: <b className="text-red-600 dark:text-red-400">{fmt(p.totalOutstanding)}</b></span>
                        <span>╪º┘ä┘à╪│╪»╪»: <b className="text-green-600 dark:text-green-400">{fmt(p.paidBackTotal)}</b></span>
                        <span>┘ü┘ê╪º╪¬┘è╪▒: {p.invoiceCount}</span>
                      </div>
                    </summary>
                    <div className="mt-3">
                      <DataTable headers={["╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è", "╪º┘ä╪«╪╡┘à", "╪º┘ä╪╡╪º┘ü┘è", "╪º┘ä┘à╪│╪»╪»", "╪º┘ä┘à╪¬╪¿┘é┘è", "╪º┘ä╪¡╪º┘ä╪⌐", "╪º┘ä╪º╪│╪¬╪¡┘é╪º┘é"]}>
                        {p.invoices.map(inv => (
                          <tr key={inv.invoiceNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className={tdCls} dir="ltr">{inv.invoiceNumber}</td>
                            <td className={tdCls}>{fmt(inv.total)}</td>
                            <td className={tdCls}>{fmt(inv.discount)}</td>
                            <td className={tdCls}>{fmt(inv.net)}</td>
                            <td className={tdCls}>{fmt(inv.amountPaid)}</td>
                            <td className={tdCls}>{fmt(inv.remaining)}</td>
                            <td className={tdCls}>{inv.status === "UNPAID" ? "╪║┘è╪▒ ┘à╪│╪»╪»╪⌐" : "┘à╪│╪»╪» ╪¼╪▓╪ª┘è╪º┘ï"}</td>
                            <td className={tdCls}>{inv.dueDate || "ΓÇö"}</td>
                          </tr>
                        ))}
                      </DataTable>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {!loading && !error && subTab === "refunds" && (() => {
        const d = data["refunds"] as RefundsData | undefined;
        if (!d) return <Empty />;
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <KpiCard label="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪º╪│╪¬╪▒╪»╪º╪»╪º╪¬" value={fmt(d.summary.totalPayback)} color="text-red-600 dark:text-red-400" />
              <KpiCard label="╪╣╪»╪» ╪º┘ä╪╣┘à┘ä┘è╪º╪¬" value={String(d.summary.count)} color="text-blue-600 dark:text-blue-400" />
            </div>
            {d.summary.cashiers.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">╪¡╪│╪¿ ╪º┘ä┘â╪º╪┤┘è╪▒</h3>
                <DataTable headers={["╪º┘ä┘â╪º╪┤┘è╪▒", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è", "╪º┘ä╪╣┘à┘ä┘è╪º╪¬"]}>
                  {d.summary.cashiers.map(c => (
                    <tr key={c.cashierName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className={tdCls}>{c.cashierName}</td>
                      <td className={tdCls}>{fmt(c.total)}</td>
                      <td className={tdCls}>{c.count}</td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}
            {d.rows.length === 0 ? <Empty /> : (
              <DataTable headers={["╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐", "╪º┘ä┘à╪▒┘è╪╢", "╪º┘ä┘ç╪º╪¬┘ü", "╪º┘ä┘à╪¿┘ä╪║", "╪º┘ä╪╖╪▒┘è┘é╪⌐", "╪º┘ä╪│╪¿╪¿", "╪º┘ä┘â╪º╪┤┘è╪▒", "╪º┘ä╪¬╪º╪▒┘è╪«"]}>
                {d.rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={tdCls} dir="ltr">{r.invoiceNumber || "ΓÇö"}</td>
                    <td className={tdCls}>{r.patientName || "ΓÇö"}</td>
                    <td className={tdCls} dir="ltr">{r.patientPhone || "ΓÇö"}</td>
                    <td className={tdCls}>{fmt(r.amount)}</td>
                    <td className={tdCls}>{PAYMENT_METHOD_LABEL[r.method] || r.method}</td>
                    <td className={tdCls}>{r.reason || "ΓÇö"}</td>
                    <td className={tdCls}>{r.cashierName}</td>
                    <td className={tdCls}>{r.paidAt}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        );
      })()}

      {!loading && !error && subTab === "cashierDaily" && (() => {
        const d = data["cashierDaily"] as CashierDailyData | undefined;
        if (!d) return <Empty />;
        const shiftLabel = (s: string) => s === "CLOSED" ? "┘à╪║┘ä┘é" : s === "OPEN" ? "┘à┘ü╪¬┘ê╪¡" : "┘ä╪º ┘è┘ê╪¼╪»";
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="╪º┘ä┘à╪¡╪╡┘æ┘ä" value={fmt(d.totals.totalCollected)} color="text-green-600 dark:text-green-400" />
              <KpiCard label="╪º┘ä╪«╪╡┘ê┘à╪º╪¬" value={fmt(d.totals.discounts)} color="text-orange-600 dark:text-orange-400" />
              <KpiCard label="╪º┘ä╪º╪│╪¬╪▒╪»╪º╪»╪º╪¬" value={fmt(d.totals.paybacks)} color="text-red-600 dark:text-red-400" />
              <KpiCard label="╪º┘ä╪╡╪º┘ü┘è" value={fmt(d.totals.netCollected)} color="text-blue-600 dark:text-blue-400" />
            </div>
            {d.rows.length === 0 ? <Empty /> : (
              <DataTable headers={["╪º┘ä╪¬╪º╪▒┘è╪«", "╪º┘ä┘â╪º╪┤┘è╪▒", "╪º┘ä╪╖╪▒┘é", "╪º┘ä┘à╪¡╪╡┘æ┘ä", "╪º┘ä╪╣┘à┘ä┘è╪º╪¬", "╪«╪╡┘à", "╪º╪│╪¬╪▒╪»╪º╪»", "╪º┘ä╪╡╪º┘ü┘è", "╪º┘ä╪▒╪╡┘è╪» ╪º┘ä╪º┘ü╪¬╪¬╪º╪¡┘è", "╪º┘ä╪▒╪╡┘è╪» ╪º┘ä╪«╪¬╪º┘à┘è", "╪º┘ä┘ê╪▒╪»┘è╪⌐"]}>
                {d.rows.map(r => (
                  <tr key={`${r.date}-${r.cashierName}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={tdCls}>{r.date}</td>
                    <td className={tdCls}>{r.cashierName}</td>
                    <td className={tdCls}>
                      {r.byMethod.length === 0 ? "ΓÇö" : r.byMethod.map((m, i) => (
                        <span key={i} className="inline-block mx-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                          {PAYMENT_METHOD_LABEL[m.method] || m.method}: {fmt(m.amount)} ({m.count})
                        </span>
                      ))}
                    </td>
                    <td className={tdCls}>{fmt(r.totalCollected)}</td>
                    <td className={tdCls}>{r.totalCount}</td>
                    <td className={tdCls}>{fmt(r.discounts)}</td>
                    <td className={tdCls}>{fmt(r.paybacks)}</td>
                    <td className={tdCls}>{fmt(r.netCollected)}</td>
                    <td className={tdCls}>{fmt(r.openingBalance)}</td>
                    <td className={tdCls}>{r.closingBalance != null ? fmt(r.closingBalance) : "ΓÇö"}</td>
                    <td className={tdCls}>{shiftLabel(r.shiftStatus)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        );
      })()}
    </div>
  );
}
