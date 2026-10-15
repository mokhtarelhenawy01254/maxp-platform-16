import { useEffect, useState } from "react";
import { RotateCcw, Calendar, Loader2, BarChart3 } from "lucide-react";
import { api, getAuthHeaders, fetchJson, BookingBranch, BookingDoctor } from "./shared";
import {
  RevenueView,
  ActualVsExpectedView,
  CommissionsView,
  DuesView,
  RefundsView,
  CashierDailyView,
} from "./BookingReportViews";

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
  { id: "revenue", label: "الإيرادات" },
  { id: "actualVsExpected", label: "الفعلي مقابل المتوقع" },
  { id: "commissions", label: "عمولات الأطباء" },
  { id: "dues", label: "المستحقات" },
  { id: "refunds", label: "الاستردادات" },
  { id: "cashierDaily", label: "حساب الكاشير اليومي" },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

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
        if (!json.success) throw new Error(json.error || "فشل جلب التقرير");
        if (!cancelled) setData(prev => ({ ...prev, [subTab]: json.data }));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "فشل جلب التقرير");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subTab, from, to, branchId, doctorId]);

  return (
    <div className="space-y-4">
      {/* Header and Filters Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">التقارير المالية والتشغيلية</h2>
          <p className="text-xs text-muted-foreground">تحليل الإيرادات الشهرية، التدفقات النقدية، وعمولات الفريق الطبي</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
            <input
              type="date"
              className="border border-border/70 rounded-xl pr-8 pl-3 py-1.5 text-xs font-mono tabular-nums bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
            <input
              type="date"
              className="border border-border/70 rounded-xl pr-8 pl-3 py-1.5 text-xs font-mono tabular-nums bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>
          <select
            className="border border-border/70 rounded-xl px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            className="border border-border/70 rounded-xl px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
          >
            <option value="">كل الأطباء</option>
            {doctorList.filter(d => !branchId || d.branchId === branchId).map(d => (
              <option key={d.id} value={d.id}>{`${d.title || ""} ${d.name || ""}`.trim() || d.id}</option>
            ))}
          </select>
          <button
            onClick={() => { setFrom(monthStartStr()); setTo(todayStr()); setBranchId(selectedBranchId || ""); setDoctorId(""); }}
            className="p-1.5 border border-border/70 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="إعادة تعيين الفلاتر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented SubTabs */}
      <div className="bg-card border border-border/70 rounded-xl p-1 shadow-sm flex flex-wrap gap-1">
        {SUB_TABS.map(t => {
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-center text-xs">
          {error}
        </div>
      ) : (
        <div>
          {subTab === "revenue" && <RevenueView d={data["revenue"]} />}
          {subTab === "actualVsExpected" && <ActualVsExpectedView d={data["actualVsExpected"]} />}
          {subTab === "commissions" && <CommissionsView d={data["commissions"]} />}
          {subTab === "dues" && <DuesView d={data["dues"]} />}
          {subTab === "refunds" && <RefundsView d={data["refunds"]} />}
          {subTab === "cashierDaily" && <CashierDailyView d={data["cashierDaily"]} />}
        </div>
      )}
    </div>
  );
}
