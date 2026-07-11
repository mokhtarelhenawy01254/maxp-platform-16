import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon, CurrencyDollarIcon, ExclamationTriangleIcon, InformationCircleIcon,
  BookmarkIcon as SaveIcon, TrashIcon, SparklesIcon,
  CheckCircleIcon, ExclamationCircleIcon, XCircleIcon,
  BanknotesIcon, TruckIcon, MegaphoneIcon, GlobeAltIcon, SquaresPlusIcon,
  UserGroupIcon, HomeModernIcon, Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

interface Inputs {
  revenue: number; cogs: number; shipping: number; adSpend: number;
  platformFees: number; otherVariable: number;
  salaries: number; rent: number; otherFixed: number;
}

interface Results {
  grossProfit: number; grossMargin: number;
  totalVariable: number; totalFixed: number; totalExpenses: number;
  netProfit: number; netMargin: number; breakEvenRevenue: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

const PRESETS: Record<string, Partial<Inputs>> = {
  sideHustle: { revenue: 50_000, cogs: 20_000, shipping: 3_000, adSpend: 8_000, platformFees: 2_000, otherVariable: 1_000, salaries: 5_000, rent: 1_000, otherFixed: 500 },
  growingStore: { revenue: 200_000, cogs: 80_000, shipping: 15_000, adSpend: 40_000, platformFees: 8_000, otherVariable: 5_000, salaries: 20_000, rent: 5_000, otherFixed: 2_000 },
  established: { revenue: 500_000, cogs: 175_000, shipping: 25_000, adSpend: 60_000, platformFees: 15_000, otherVariable: 10_000, salaries: 50_000, rent: 15_000, otherFixed: 5_000 },
};

const DEFAULTS: Inputs = { revenue: 200_000, cogs: 80_000, shipping: 15_000, adSpend: 40_000, platformFees: 8_000, otherVariable: 5_000, salaries: 20_000, rent: 5_000, otherFixed: 2_000 };

const STORAGE_KEY = "maxp_monthly_pnl_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();

function compute(inputs: Inputs): Results {
  const { revenue, cogs, shipping, adSpend, platformFees, otherVariable, salaries, rent, otherFixed } = inputs;
  const grossProfit = revenue - cogs - shipping;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const totalVariable = cogs + shipping + adSpend + platformFees + otherVariable;
  const totalFixed = salaries + rent + otherFixed;
  const totalExpenses = totalVariable + totalFixed;
  const netProfit = revenue - totalExpenses;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const contributionMargin = revenue - totalVariable;
  const breakEvenRevenue = contributionMargin > 0 ? (totalFixed / contributionMargin) * revenue : 0;
  return { grossProfit, grossMargin, totalVariable, totalFixed, totalExpenses, netProfit, netMargin, breakEvenRevenue };
}

export default function MonthlyPnLDashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) setInputs((prev) => ({ ...prev, ...p }));
  };

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);

  const r = useMemo(() => compute(inputs), [inputs]);

  const T = useCallback((k: string) => t(`monthlyPnL.${k}`), [t]);

  const alerts = useMemo(() => {
    const M: { type: "error" | "warn" | "info"; msg: string }[] = [];
    if (r.netProfit <= 0) M.push({ type: "error", msg: T("alertLoss") });
    if (r.grossMargin < 30) M.push({ type: "warn", msg: T("alertLowMargin") });
    if (inputs.adSpend / inputs.revenue > 0.4) M.push({ type: "warn", msg: T("alertHighAdSpend") });
    return M;
  }, [r, inputs, T]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    const adPct = inputs.revenue > 0 ? (inputs.adSpend / inputs.revenue) * 100 : 0;
    const fixedPct = inputs.revenue > 0 ? (r.totalFixed / inputs.revenue) * 100 : 0;
    if (adPct > 30) R.push({ icon: <MegaphoneIcon className="w-5 h-5 text-blue-500" />, title: T("recHighAdSpend"), desc: T("recHighAdSpendDesc", { pct: adPct.toFixed(1) }) });
    if (r.grossMargin < 50) R.push({ icon: <BanknotesIcon className="w-5 h-5 text-purple-500" />, title: T("recLowMargin"), desc: T("recLowMarginDesc", { margin: r.grossMargin.toFixed(1) }) });
    if (fixedPct > 30) R.push({ icon: <HomeModernIcon className="w-5 h-5 text-amber-500" />, title: T("recHighFixedCosts"), desc: T("recHighFixedCostsDesc", { fixed: fmtCurr(Math.round(r.totalFixed)), pct: fixedPct.toFixed(1) }) });
    if (r.netMargin < 10 && r.netMargin > 0) R.push({ icon: <Cog6ToothIcon className="w-5 h-5 text-emerald-500" />, title: T("recImproveNetMargin"), desc: T("recImproveNetMarginDesc", { profit: fmtCurr(Math.round(r.netProfit)) }) });
    return R;
  }, [inputs, r, T, fmtCurr]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const names = [T("scenarioDefault") + " 1", T("scenarioDefault") + " 2", T("scenarioDefault") + " 3"];
    const n = scenarioName.trim() || names[saved.length];
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => { setInputs({ ...s.inputs }); setCurrency(s.currency); };
  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  const pnlChartData = useMemo(() => {
    const max = Math.max(r.grossProfit, r.totalExpenses, r.netProfit > 0 ? r.netProfit : 0, 1);
    return [
      { name: T("grossProfit"), value: r.grossProfit, fill: "hsl(142 76% 36%)" },
      { name: T("totalExpenses"), value: r.totalExpenses, fill: "hsl(0 84% 60%)" },
      { name: T("netProfit"), value: r.netProfit > 0 ? r.netProfit : 0, fill: "hsl(217 91% 60%)" },
    ].map((d) => ({ ...d, pct: max > 0 ? Math.min(100, (d.value / max) * 100) : 0 }));
  }, [r, T]);

  const Slider: React.FC<{ label: string; icon: React.ReactNode; value: number; min: number; max: number; step?: number; onChange: React.ChangeEventHandler }> =
    ({ label, icon, value, min, max, step = 1000, onChange }) => (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">{icon}{label}</span>
          <span className="flex items-center gap-1">
            <input type="number" value={value} onChange={onChange} min={min} max={max} step={step}
              className="w-24 sm:w-28 text-right font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{sym(currency)}</span>
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{T("desc")}</p>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {T(`monthlyPnL.${c}`)}</option>)}
          </select>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-gray-500">{T("presets")}:</span>
          <button onClick={() => loadPreset("sideHustle")} className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{T("presetSideHustle")}</button>
          <button onClick={() => loadPreset("growingStore")} className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{T("presetGrowingStore")}</button>
          <button onClick={() => loadPreset("established")} className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{T("presetEstablished")}</button>
        </div>

        {/* Save section */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder={T("scenarioNamePlaceholder")}
              className="w-24 sm:w-32 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
            <button onClick={saveScenario} disabled={saved.length >= 3}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed">
              <SaveIcon className="w-3.5 h-3.5 shrink-0" /> {T("save")} ({saved.length}/3)
            </button>
          </div>
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
              <button onClick={() => deleteScenario(sc.id)} className="text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 sm:p-4 rounded-xl border text-xs sm:text-sm ${
                a.type === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  : a.type === "warn" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              }`}>
                <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                  a.type === "error" ? "text-red-500" : a.type === "warn" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <Card title={T("revenueTitle")} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500" />}>
              <Slider label={T("monthlyRevenue")} icon={<BanknotesIcon className="w-4 h-4 text-green-500" />} value={inputs.revenue} min={10_000} max={2_000_000} step={10_000} onChange={set("revenue")} />
              <Slider label={T("cogs")} icon={<Cog6ToothIcon className="w-4 h-4 text-gray-500" />} value={inputs.cogs} min={1_000} max={1_000_000} step={5_000} onChange={set("cogs")} />
              <Slider label={T("shipping")} icon={<TruckIcon className="w-4 h-4 text-gray-500" />} value={inputs.shipping} min={500} max={200_000} step={1_000} onChange={set("shipping")} />
              <Slider label={T("adSpend")} icon={<MegaphoneIcon className="w-4 h-4 text-blue-500" />} value={inputs.adSpend} min={1_000} max={500_000} step={5_000} onChange={set("adSpend")} />
              <Slider label={T("platformFees")} icon={<GlobeAltIcon className="w-4 h-4 text-gray-500" />} value={inputs.platformFees} min={500} max={100_000} step={1_000} onChange={set("platformFees")} />
              <Slider label={T("otherVariable")} icon={<SquaresPlusIcon className="w-4 h-4 text-gray-500" />} value={inputs.otherVariable} min={0} max={100_000} step={1_000} onChange={set("otherVariable")} />
            </Card>

            <Card title={T("fixedCosts")} icon={<HomeModernIcon className="w-5 h-5 text-purple-500" />}>
              <Slider label={T("salaries")} icon={<UserGroupIcon className="w-4 h-4 text-gray-500" />} value={inputs.salaries} min={1_000} max={500_000} step={5_000} onChange={set("salaries")} />
              <Slider label={T("rent")} icon={<HomeModernIcon className="w-4 h-4 text-gray-500" />} value={inputs.rent} min={500} max={200_000} step={1_000} onChange={set("rent")} />
              <Slider label={T("otherFixed")} icon={<SquaresPlusIcon className="w-4 h-4 text-gray-500" />} value={inputs.otherFixed} min={0} max={200_000} step={1_000} onChange={set("otherFixed")} />
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label={T("netProfit")} value={fmtCurr(Math.round(r.netProfit))} sub={T("netMargin") + ` ${r.netMargin.toFixed(1)}%`} positive={r.netProfit >= 0} />
              <MetricCard label={T("grossProfit")} value={fmtCurr(Math.round(r.grossProfit))} sub={T("grossMargin") + ` ${r.grossMargin.toFixed(1)}%`} positive={r.grossProfit > 0} />
              <MetricCard label={T("totalExpenses")} value={fmtCurr(Math.round(r.totalExpenses))} sub={`${T("totalVariable")}: ${fmtCurr(Math.round(r.totalVariable))}`} positive={false} />
              <MetricCard label={T("breakEvenRevenue")} value={fmtCurr(Math.round(r.breakEvenRevenue))} sub={T("netMargin") + ` ${r.netMargin.toFixed(1)}%`} positive={r.breakEvenRevenue <= inputs.revenue} />
            </div>

            {/* P&L Breakdown Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("pnlChart")}
              </h3>
              <div className="space-y-2">
                {pnlChartData.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(Math.round(d.value))}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.pct}%`, backgroundColor: d.fill }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* P&L Summary Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{T("results")}</h3>
              <div className="overflow-x-auto text-xs sm:text-sm">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      [T("monthlyRevenue"), fmtCurr(Math.round(inputs.revenue)), true],
                      [T("totalVariable"), `- ${fmtCurr(Math.round(r.totalVariable))}`, false],
                      [T("grossProfit"), fmtCurr(Math.round(r.grossProfit)), r.grossProfit >= 0],
                      [T("totalFixed"), `- ${fmtCurr(Math.round(r.totalFixed))}`, false],
                      [T("totalExpenses"), `- ${fmtCurr(Math.round(r.totalExpenses))}`, false],
                      [T("netProfit"), fmtCurr(Math.round(r.netProfit)), r.netProfit >= 0],
                    ].map(([label, val, positive], i) => (
                      <tr key={i} className={i === 5 ? "border-t-2 border-gray-300 dark:border-gray-600" : ""}>
                        <td className={`py-1.5 sm:py-2 ${i === 5 ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>{label}</td>
                        <td className={`py-1.5 sm:py-2 font-mono font-semibold ${isRtl ? "text-left" : "text-right"} ${
                          i === 5 ? (r.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                            : positive ? "text-gray-900 dark:text-gray-100" : "text-red-500"
                        }`}>{val as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Recommendations */}
            <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <SparklesIcon className="w-4 h-4 shrink-0" />{T("recommendations")}{recommendations.length > 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{recommendations.length}</span>}
              </summary>
              {recommendations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0">{rec.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rec.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{rec.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-xs text-gray-400">{T("noRecommendations")}</div>
              )}
            </details>

            {/* Formula Accordion */}
            <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <InformationCircleIcon className="w-4 h-4 shrink-0" />{T("howItWorks")}
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>#</th>
                      <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("step")}</th>
                      <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("formula")}</th>
                      <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-left" : "text-right"}`}>{T("result")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      [T("stepGrossProfit"), `${fmtCurr(inputs.revenue)} − (${fmtCurr(inputs.cogs)} + ${fmtCurr(inputs.shipping)})`, fmtCurr(Math.round(r.grossProfit))],
                      [T("stepTotalVariable"), `${fmtCurr(inputs.cogs)} + ${fmtCurr(inputs.shipping)} + ...`, fmtCurr(Math.round(r.totalVariable))],
                      [T("stepTotalFixed"), `${fmtCurr(inputs.salaries)} + ${fmtCurr(inputs.rent)} + ...`, fmtCurr(Math.round(r.totalFixed))],
                      [T("stepNetProfit"), `${fmtCurr(Math.round(inputs.revenue))} − ${fmtCurr(Math.round(r.totalExpenses))}`, fmtCurr(Math.round(r.netProfit))],
                      [T("stepNetMargin"), `(${fmtCurr(Math.round(r.netProfit))} ÷ ${fmtCurr(Math.round(inputs.revenue))}) × 100`, `${r.netMargin.toFixed(1)}%`],
                      [T("stepBreakEven"), `(${fmtCurr(Math.round(r.totalFixed))} ÷ (${fmtCurr(Math.round(inputs.revenue))} − ${fmtCurr(Math.round(r.totalVariable))})) × ${fmtCurr(Math.round(inputs.revenue))}`, fmtCurr(Math.round(r.breakEvenRevenue))],
                    ].map(([step, formula, result], i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-400">{i + 1}</td>
                        <td className={`py-1.5 sm:py-2 px-2 sm:px-3 text-gray-900 dark:text-gray-100 font-medium ${isRtl ? "text-right" : "text-left"}`}>{step}</td>
                        <td className={`py-1.5 sm:py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{formula}</td>
                        <td className={`py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-900 dark:text-gray-100 ${isRtl ? "text-left" : "text-right"}`}>{result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4 sm:space-y-5">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">{icon}{title}</h2>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
