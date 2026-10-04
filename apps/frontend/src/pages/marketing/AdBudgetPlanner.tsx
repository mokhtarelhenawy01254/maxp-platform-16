import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon,
  SparklesIcon, CheckCircleIcon, XCircleIcon,
  Cog6ToothIcon, ArrowPathIcon, ClockIcon,
  RocketLaunchIcon, WalletIcon, ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import SliderInput from "@/components/common/SliderInput";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type Preset = "starter" | "growth" | "scale";
type InputMode = "cpp" | "budget";

interface Inputs {
  targetRevenue: number;
  aov: number;
  targetRoas: number;
  cpp: number;
  totalBudget: number;
  convRate: number;
  dailyCap: number;
}

interface Results {
  monthlyBudget: number;
  dailySpend: number;
  expectedOrders: number;
  costPerOrder: number;
  expectedRevenue: number;
  profitAfterAds: number;
  actualRoas: number;
  daysToTarget: number;
  clicksNeeded: number;
  dailyClicks: number;
  estimatedCpc: number;
  cppCpcGap: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; mode: InputMode; currency: string; }

type WhatIfAction = "raiseRoas" | "doubleCap" | "improveConv";

const PRESETS: Record<Preset, Inputs> = {
  starter: { targetRevenue: 100000, aov: 500, targetRoas: 3, cpp: 120, totalBudget: 33333, convRate: 3, dailyCap: 3000 },
  growth: { targetRevenue: 300000, aov: 800, targetRoas: 4, cpp: 180, totalBudget: 75000, convRate: 4, dailyCap: 8000 },
  scale: { targetRevenue: 700000, aov: 1200, targetRoas: 5, cpp: 250, totalBudget: 140000, convRate: 5, dailyCap: 20000 },
};

const DEFAULTS: Inputs = { ...PRESETS.growth };

const STORAGE_KEY = "maxp_ad_budget_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function compute(inputs: Inputs, mode: InputMode = "cpp"): Results {
  // cpp mode: revenue target fixed, budget derived. budget mode: budget fixed, revenue derived.
  const budget = mode === "budget" ? inputs.totalBudget : inputs.targetRevenue / inputs.targetRoas;
  const expectedRevenue = mode === "budget" ? budget * inputs.targetRoas : inputs.targetRevenue;
  const orders = Math.round(expectedRevenue / inputs.aov);
  const dailySpend = budget / 30;
  const costPerOrder = orders > 0 ? budget / orders : 0;
  const profit = expectedRevenue - budget;
  const roas = budget > 0 ? expectedRevenue / budget : 0;
  const days = inputs.dailyCap > 0 ? Math.ceil(budget / inputs.dailyCap) : 0;
  const clicks = Math.round(orders / (inputs.convRate / 100));
  const dailyClicks = Math.round(clicks / 30);
  const cpc = clicks > 0 ? budget / clicks : 0;
  const gap = cpc > 0 ? Math.round(inputs.cpp / cpc) : 0;

  return {
    monthlyBudget: budget,
    dailySpend,
    expectedOrders: orders,
    costPerOrder,
    expectedRevenue,
    profitAfterAds: profit,
    actualRoas: roas,
    daysToTarget: days,
    clicksNeeded: clicks,
    dailyClicks,
    estimatedCpc: cpc,
    cppCpcGap: gap,
  };
}

export default function AdBudgetPlanner() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("growth");
  const [inputMode, setInputMode] = useState<InputMode>("cpp");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setInputs({ ...PRESETS[p] });
  };

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `adBudgetPlanner.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const r = useMemo(() => compute(inputs, inputMode), [inputs, inputMode]);

  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  const whatIfAll = useMemo(() => {
    const make = (action: WhatIfAction) => {
      const mod = { ...inputs };
      if (action === "raiseRoas") mod.targetRoas = Math.min(15, inputs.targetRoas + 1);
      else if (action === "doubleCap") mod.dailyCap = inputs.dailyCap * 2;
      else if (action === "improveConv") mod.convRate = Math.min(15, inputs.convRate + 2);
      return compute(mod, inputMode);
    };
    return {
      raiseRoas: { result: make("raiseRoas"), impact: make("raiseRoas").monthlyBudget - r.monthlyBudget },
      doubleCap: { result: make("doubleCap"), impact: make("doubleCap").daysToTarget - r.daysToTarget },
      improveConv: { result: make("improveConv"), impact: (make("improveConv").clicksNeeded - r.clicksNeeded) * -1 },
    };
  }, [inputs, inputMode, r.monthlyBudget, r.daysToTarget, r.clicksNeeded]);

  const applyWhatIf = (action: WhatIfAction) => {
    setActiveAction(activeAction === action ? null : action);
  };

  const revertWhatIf = () => setActiveAction(null);

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    const allowableCpo = r.expectedOrders > 0 ? r.monthlyBudget / r.expectedOrders : 0;
    const cppDiff = allowableCpo > 0 ? ((inputs.cpp - allowableCpo) / allowableCpo) * 100 : 0;

    if (r.actualRoas >= 4) {
      M.push({ type: "success", title: T("healthyRoas"), msg: T("healthyRoasMsg", { roas: r.actualRoas.toFixed(1) }) });
    } else if (r.actualRoas >= 2.5) {
      M.push({ type: "warn", title: T("warningRoas"), msg: T("warningRoasMsg", { roas: r.actualRoas.toFixed(1) }) });
    } else {
      M.push({ type: "error", title: T("criticalRoas"), msg: T("criticalRoasMsg", { roas: r.actualRoas.toFixed(1) }) });
    }

    if (cppDiff <= -10) {
      M.push({ type: "success", title: T("healthyCpp"), msg: T("healthyCppMsg", { cpp: fmt(inputs.cpp * conversionRate), sym: sym(currency), pct: Math.round(Math.abs(cppDiff)), allowable: fmt(allowableCpo * conversionRate) }) });
    } else if (cppDiff > 10) {
      M.push({ type: "error", title: T("criticalCpp"), msg: T("criticalCppMsg", { actual: fmt(r.costPerOrder * conversionRate), sym: sym(currency), target: fmt(inputs.cpp * conversionRate) }) });
    } else if (cppDiff > 0) {
      M.push({ type: "warn", title: T("warningCpp"), msg: T("warningCppMsg", { cpp: fmt(inputs.cpp * conversionRate), sym: sym(currency), allowable: fmt(allowableCpo * conversionRate) }) });
    }

    if (r.daysToTarget > 30) {
      M.push({ type: "warn", title: "⏱ Days", msg: T("daysWarning", { days: r.daysToTarget }) });
    }

    return M;
  }, [r, inputs, currency, conversionRate, T]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    const allowableCpo = r.expectedOrders > 0 ? r.monthlyBudget / r.expectedOrders : 0;
    const cppDiff = allowableCpo > 0 ? ((inputs.cpp - allowableCpo) / allowableCpo) * 100 : 0;

    if (cppDiff > 20 && r.daysToTarget > 20) {
      R.push({ icon: <RocketLaunchIcon className="w-5 h-5 text-blue-500" />, title: T("recIncreaseCap"), desc: T("recIncreaseCapDesc", { cap: fmt(inputs.dailyCap * conversionRate), sym: sym(currency), suggested: fmt((inputs.dailyCap * 1.5) * conversionRate), days: r.daysToTarget, newDays: Math.ceil(inputs.targetRevenue / (inputs.dailyCap * 1.5 * inputs.targetRoas)) }) });
    }

    if (inputs.convRate < 4) {
      const targetConv = Math.min(15, inputs.convRate + 2);
      const currentClicks = Math.round(r.expectedOrders / (inputs.convRate / 100));
      const targetClicks = Math.round(r.expectedOrders / (targetConv / 100));
      R.push({ icon: <ChartBarIcon className="w-5 h-5 text-purple-500" />, title: T("recImproveConv"), desc: T("recImproveConvDesc", { current: inputs.convRate, extraClicks: fmt(currentClicks - targetClicks), target: targetConv, savedClicks: fmt(currentClicks - targetClicks) }) });
    }

    if (r.estimatedCpc > 10) {
      const targetCpc = Math.round(r.estimatedCpc * 0.75);
      const savings = Math.round((r.estimatedCpc - targetCpc) * r.clicksNeeded);
      R.push({ icon: <Cog6ToothIcon className="w-5 h-5 text-amber-500" />, title: T("recAdEfficiency"), desc: T("recAdEfficiencyDesc", { cpc: fmt(r.estimatedCpc * conversionRate), sym: sym(currency), targetCpc: fmt(targetCpc * conversionRate), savings: fmt(savings * conversionRate) }) });
    }

    return R;
  }, [r, inputs, currency, conversionRate, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const names = [T("scenarioDefault") + " 1", T("scenarioDefault") + " 2", T("scenarioDefault") + " 3"];
    const n = scenarioName.trim() || names[saved.length];
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, mode: inputMode, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => { setInputs({ ...s.inputs }); setInputMode(s.mode); setCurrency(s.currency); };
  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  const budgetBreakdownData = useMemo(() => [
    { name: T("monthlyBudget"), value: r.dailySpend * 30, fill: "hsl(217 91% 60%)" },
    { name: T("profitAfterAds"), value: Math.max(0, r.profitAfterAds), fill: "hsl(142 76% 36%)" },
    { name: T("expectedRevenue"), value: r.expectedRevenue, fill: "hsl(189 96% 52%)" },
  ], [r, T]);

  const maxBarValue = Math.max(...budgetBreakdownData.map((d) => d.value), 1);



  const cppHintText = inputMode === "cpp"
    ? T("cppHint", { budget: fmt(inputs.cpp * r.expectedOrders * conversionRate), orders: r.expectedOrders })
    : T("budgetHint", { cpp: fmt((inputs.totalBudget / Math.max(1, r.expectedOrders)) * conversionRate), orders: r.expectedOrders });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalculatorIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{T("desc")}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {T(c)}</option>)}
            </select>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {(["starter", "growth", "scale"] as Preset[]).map((p) => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                preset === p
                  ? p === "starter"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    : p === "growth"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                p === "starter" ? "bg-blue-500" : p === "growth" ? "bg-yellow-500" : "bg-emerald-500"
              }`} />
              {T(`preset${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
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
                  : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              }`}>
                {a.type === "success" ? <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-emerald-500" />
                  : <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                    a.type === "error" ? "text-red-500" : "text-yellow-500"
                  }`} />}
                <div>
                  <div className="font-semibold">{a.title}</div>
                  <div>{a.msg}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <Card title={T("campaignInputs")} icon={<Cog6ToothIcon className="w-5 h-5 text-blue-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("targetRevenue")} value={inputs.targetRevenue} min={10000} max={10000000} step={5000} onChange={set("targetRevenue")} />
              <SliderInput currencySymbol={sym(currency)} label={T("aov")} value={inputs.aov} min={100} max={5000} step={10} onChange={set("aov")} />
              <SliderInput currencySymbol={sym(currency)} label={T("targetRoas")} value={inputs.targetRoas} min={1} max={15} step={0.5} onChange={set("targetRoas")} suffix="x" />

              {/* Input Mode Toggle */}
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button onClick={() => setInputMode("cpp")}
                  className={`flex-1 py-1.5 text-xs font-medium transition-all ${
                    inputMode === "cpp"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>{T("cppMode")}</button>
                <button onClick={() => setInputMode("budget")}
                  className={`flex-1 py-1.5 text-xs font-medium transition-all ${
                    inputMode === "budget"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>{T("budgetMode")}</button>
              </div>

              {inputMode === "cpp" ? (
                <SliderInput currencySymbol={sym(currency)} label={T("cpp")} value={inputs.cpp} min={10} max={1000} step={5} onChange={set("cpp")} />
              ) : (
                <SliderInput currencySymbol={sym(currency)} label={T("totalBudget")} value={inputs.totalBudget} min={1000} max={1000000} step={1000} onChange={set("totalBudget")} />
              )}

              <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
                {cppHintText}
              </div>

              <SliderInput currencySymbol={sym(currency)} label={T("convRate")} value={inputs.convRate} min={0.5} max={15} step={0.5} isPercent onChange={set("convRate")} />
              <SliderInput currencySymbol={sym(currency)} label={T("dailyCap")} value={inputs.dailyCap} min={500} max={100000} step={500} onChange={set("dailyCap")} />
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <Card title={T("budgetRevenue")} icon={<WalletIcon className="w-5 h-5 text-emerald-500" />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <MetricCard label={T("monthlyBudget")} value={fmtCurr(Math.round(r.monthlyBudget))} sub={T("monthlyBudgetSub")} positive={r.monthlyBudget > 0} accent="blue" />
                <MetricCard label={T("dailySpend")} value={fmtCurr(Math.round(r.dailySpend))} sub={T("dailySpendSub")} positive={r.dailySpend <= inputs.dailyCap} accent="purple" />
                <MetricCard label={T("expectedOrders")} value={fmt(r.expectedOrders)} sub={T("expectedOrdersSub")} positive={r.expectedOrders > 0} accent="gray" />
                <MetricCard label={T("costPerOrder")} value={fmtCurr(Math.round(r.costPerOrder))} sub={T("costPerOrderSub")} positive={r.costPerOrder <= inputs.cpp} accent={r.costPerOrder <= inputs.cpp ? "emerald" : "red"} />
                <MetricCard label={T("expectedRevenue")} value={fmtCurr(Math.round(r.expectedRevenue))} sub={T("expectedRevenueSub")} positive={true} accent="emerald" />
                <MetricCard label={T("profitAfterAds")} value={fmtCurr(Math.round(r.profitAfterAds))} sub={T("profitAfterAdsSub")} positive={r.profitAfterAds > 0} accent={r.profitAfterAds > 0 ? "emerald" : "red"} />
                <MetricCard label={T("actualRoas")} value={`${r.actualRoas.toFixed(1)}x`} sub={T("actualRoasSub")} positive={r.actualRoas >= 2.5} accent={r.actualRoas >= 4 ? "emerald" : r.actualRoas >= 2.5 ? "yellow" : "red"} />
                <MetricCard label={T("daysToTarget")} value={`${r.daysToTarget} ${r.daysToTarget > 0 ? "" : "-"}`} sub={T("daysToTargetSub")} positive={r.daysToTarget <= 30} accent={r.daysToTarget <= 14 ? "emerald" : r.daysToTarget <= 30 ? "yellow" : "red"} />
              </div>
            </Card>

            {/* Budget Breakdown Bar Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("budgetRevenue")}
              </h3>
              <div className="space-y-2">
                {budgetBreakdownData.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(Math.round(d.value))}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (d.value / maxBarValue) * 100)}%`, backgroundColor: d.fill }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic & Clicks */}
            <Card title={T("trafficClicks")} icon={<ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <MetricCard label={T("clicksNeeded")} value={fmt(r.clicksNeeded)} sub={T("clicksNeededSub", { rate: inputs.convRate })} positive={true} accent="blue" />
                <MetricCard label={T("dailyClicks")} value={fmt(r.dailyClicks)} sub={T("dailyClicksSub")} positive={true} accent="purple" />
                <MetricCard label={T("estimatedCpc")} value={fmtCurr(Math.round(r.estimatedCpc * 100) / 100)} sub={T("estimatedCpcSub")} positive={r.estimatedCpc <= 15} accent={r.estimatedCpc <= 10 ? "emerald" : r.estimatedCpc <= 15 ? "yellow" : "red"} />
                <MetricCard label={T("cppCpcGap")} value={`${r.cppCpcGap} clicks`} sub={T("cppCpcGapSub", { clicks: r.cppCpcGap })} positive={r.cppCpcGap <= 15} accent={r.cppCpcGap <= 10 ? "emerald" : r.cppCpcGap <= 20 ? "yellow" : "red"} />
              </div>
            </Card>

            {/* What-If Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <WhatIfButton
                  label={T("whatIfRaiseRoas", { target: Math.min(15, inputs.targetRoas + 1) })}
                  emoji="📈"
                  desc={T("whatIfRaiseRoasDesc")}
                  active={activeAction === "raiseRoas"}
                  impact={whatIfAll.raiseRoas.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("raiseRoas")}
                  suffix={T("whatIfRaiseRoasImpact")}
                />
                <WhatIfButton
                  label={T("whatIfDoubleCap")}
                  emoji="🚀"
                  desc={T("whatIfDoubleCapDesc")}
                  active={activeAction === "doubleCap"}
                  impact={whatIfAll.doubleCap.impact}
                  curr={(v: number) => `${Math.abs(Math.round(v))} days`}
                  onClick={() => applyWhatIf("doubleCap")}
                  suffix={T("whatIfDoubleCapImpact")}
                  isNegativeBest
                />
                <WhatIfButton
                  label={T("whatIfImproveConv", { target: Math.min(15, inputs.convRate + 2) })}
                  emoji="🎯"
                  desc={T("whatIfImproveConvDesc")}
                  active={activeAction === "improveConv"}
                  impact={whatIfAll.improveConv.impact}
                  curr={(v: number) => `${fmt(Math.round(v))}`}
                  onClick={() => applyWhatIf("improveConv")}
                  suffix={T("whatIfImproveConvImpact")}
                />
              </div>
              {activeAction && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{T("whatIfTitle")}</span>
                    <button onClick={revertWhatIf} className="text-[10px] text-red-400 hover:text-red-600 underline">{T("scenarioDefault")}</button>
                  </div>
                  <WhatIfRow label={T("monthlyBudget")} base={fmtCurr(Math.round(r.monthlyBudget))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.monthlyBudget))} positive={whatIfAll[activeAction].result.profitAfterAds >= r.profitAfterAds} />
                  <WhatIfRow label={T("costPerOrder")} base={fmtCurr(Math.round(r.costPerOrder))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.costPerOrder))} positive={whatIfAll[activeAction].result.costPerOrder <= r.costPerOrder} />
                  <WhatIfRow label={T("profitAfterAds")} base={fmtCurr(Math.round(r.profitAfterAds))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.profitAfterAds))} positive={whatIfAll[activeAction].result.profitAfterAds >= r.profitAfterAds} />
                </div>
              )}
            </div>

            {/* AI Recommendations */}
            <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <SparklesIcon className="w-4 h-4 shrink-0" /> {T("recommendations")} {recommendations.length > 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{recommendations.length}</span>}
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
                <InformationCircleIcon className="w-4 h-4 shrink-0" /> {T("howItWorks")}
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
                      [T("step1"), `${T("step1Formula")} = ${fmtCurr(Math.round(inputs.targetRevenue))} ÷ ${inputs.targetRoas}x`, fmtCurr(Math.round(r.monthlyBudget))],
                      [T("step2"), `${T("step2Formula")} = ${fmtCurr(Math.round(r.monthlyBudget))} ÷ 30`, fmtCurr(Math.round(r.dailySpend))],
                      [T("step3"), `${T("step3Formula")} = ${fmtCurr(Math.round(inputs.targetRevenue))} ÷ ${fmtCurr(inputs.aov)}`, fmt(r.expectedOrders)],
                      [T("step4"), `${T("step4Formula")} = ${fmtCurr(Math.round(r.monthlyBudget))} ÷ ${r.expectedOrders}`, fmtCurr(Math.round(r.costPerOrder))],
                      [T("step5"), `${T("step5Formula")} = ${r.expectedOrders} × ${fmtCurr(inputs.aov)}`, fmtCurr(Math.round(r.expectedRevenue))],
                      [T("step6"), `${T("step6Formula")} = ${fmtCurr(Math.round(r.expectedRevenue))} − ${fmtCurr(Math.round(r.monthlyBudget))}`, fmtCurr(Math.round(r.profitAfterAds))],
                      [T("step7"), `${T("step7Formula")} = ${r.expectedOrders} ÷ ${inputs.convRate}%`, fmt(r.clicksNeeded)],
                      [T("step8"), `${T("step8Formula")} = ${fmtCurr(Math.round(r.monthlyBudget))} ÷ ${r.clicksNeeded}`, fmtCurr(Math.round(r.estimatedCpc * 100) / 100)],
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

/* ── Helpers ── */

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4 sm:space-y-5">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">{icon}{title}</h2>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, positive, accent = "emerald" }: {
  label: string; value: string; sub: string; positive: boolean; accent?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    gray: "text-gray-900 dark:text-gray-100",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? colorMap[accent] || colorMap.emerald : colorMap.red}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function WhatIfButton({ label, emoji, desc, active, impact, curr, onClick, suffix, isNegativeBest }: {
  label: string; emoji: string; desc: string; active: boolean;
  impact: number | null; curr: (v: number) => string; onClick: () => void;
  suffix?: string; isNegativeBest?: boolean;
}) {
  const isPositive = impact !== null && (isNegativeBest ? impact < 0 : impact > 0);
  return (
    <button onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all ${
        active
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400"
          : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
      }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{emoji}</span>
        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
      </div>
      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">{desc}</div>
      {impact !== null && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
            {isNegativeBest ? "" : (isPositive ? "+" : "")}{curr(Math.round(impact))}
          </span>
          <span className="text-gray-400">{suffix || ""}</span>
        </div>
      )}
    </button>
  );
}

function WhatIfRow({ label, base, projected, positive }: { label: string; base: string; projected: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{base}</span>
        <span className="text-gray-300">→</span>
        <span className={`font-semibold font-mono ${positive ? "text-emerald-500" : "text-red-500"}`}>{projected}</span>
      </div>
    </div>
  );
}
