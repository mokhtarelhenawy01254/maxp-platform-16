import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon, ScaleIcon,
  SparklesIcon, ShieldCheckIcon, RocketLaunchIcon,
  CheckCircleIcon, ExclamationCircleIcon, XCircleIcon,
  Cog6ToothIcon, CubeIcon, ArrowPathIcon, TagIcon,
} from "@heroicons/react/24/outline";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type TicketTier = "low" | "mid" | "high";

interface Inputs {
  cogs: number;
  shipping: number;
  packing: number;
  adCost: number;
  commissionPct: number;
  desiredMarginPct: number;
  competitorPrice: number;
}

interface Results {
  totalDirectCost: number;
  breakEvenPrice: number;
  recommendedPrice: number;
  profitPerUnit: number;
  markupPct: number;
  totalCostPerUnit: number;
  vsCompetitorPct: number;
  isCompetitive: boolean;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfAction = "marginUp" | "cogsDown10" | "adEfficiency";

const TIER_PRESETS: Record<TicketTier, Inputs> = {
  low: { cogs: 50, shipping: 25, packing: 10, adCost: 40, commissionPct: 10, desiredMarginPct: 30, competitorPrice: 150 },
  mid: { cogs: 350, shipping: 70, packing: 25, adCost: 150, commissionPct: 5, desiredMarginPct: 30, competitorPrice: 900 },
  high: { cogs: 2000, shipping: 150, packing: 50, adCost: 500, commissionPct: 3, desiredMarginPct: 40, competitorPrice: 5000 },
};

const DEFAULTS: Inputs = { ...TIER_PRESETS.mid };

const STORAGE_KEY = "maxp_pricing_strategy_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function compute(inputs: Inputs): Results {
  const { cogs, shipping, packing, adCost, commissionPct, desiredMarginPct, competitorPrice } = inputs;
  const com = commissionPct / 100;
  const margin = desiredMarginPct / 100;
  const directCost = cogs + shipping + packing + adCost;
  const breakEven = directCost / (1 - com);
  const recommended = directCost / ((1 - com) * (1 - margin));
  const actualProfit = recommended * (1 - com) - directCost;
  const totalCostPerUnit = directCost + competitorPrice * com;
  const markup = directCost > 0 ? (actualProfit / directCost) * 100 : 0;
  const vsComp = competitorPrice > 0 ? ((recommended - competitorPrice) / competitorPrice) * 100 : 0;
  return {
    totalDirectCost: directCost,
    breakEvenPrice: breakEven,
    recommendedPrice: recommended,
    profitPerUnit: actualProfit,
    markupPct: markup,
    totalCostPerUnit,
    vsCompetitorPct: vsComp,
    isCompetitive: Math.abs(vsComp) <= 15,
  };
}

export default function PricingStrategyCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [tier, setTier] = useState<TicketTier>("mid");
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

  const applyTier = (t: TicketTier) => {
    setTier(t);
    setInputs({ ...TIER_PRESETS[t] });
  };

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `pricingStrategy.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const r = useMemo(() => compute(inputs), [inputs]);

  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  const whatIfAll = useMemo(() => {
    const make = (action: WhatIfAction) => {
      const mod = { ...inputs };
      if (action === "marginUp") mod.desiredMarginPct = Math.min(80, inputs.desiredMarginPct + 10);
      else if (action === "cogsDown10") mod.cogs = Math.round(inputs.cogs * 0.9);
      else if (action === "adEfficiency") mod.adCost = Math.round(inputs.adCost * 0.75);
      return compute(mod);
    };
    return {
      marginUp: { result: make("marginUp"), impact: make("marginUp").profitPerUnit - r.profitPerUnit },
      cogsDown10: { result: make("cogsDown10"), impact: make("cogsDown10").profitPerUnit - r.profitPerUnit },
      adEfficiency: { result: make("adEfficiency"), impact: make("adEfficiency").profitPerUnit - r.profitPerUnit },
    };
  }, [inputs, r.profitPerUnit]);

  const applyWhatIf = (action: WhatIfAction) => {
    setActiveAction(activeAction === action ? null : action);
  };

  const revertWhatIf = () => setActiveAction(null);

  const costBreakdownData = useMemo(() => [
    { name: T("cogs"), value: inputs.cogs, fill: "hsl(217 91% 60%)" },
    { name: T("shipping"), value: inputs.shipping, fill: "hsl(189 96% 52%)" },
    { name: T("packing"), value: inputs.packing, fill: "hsl(142 76% 36%)" },
    { name: T("adCost"), value: inputs.adCost, fill: "hsl(271 91% 65%)" },
  ], [inputs, T]);

  const maxCost = Math.max(...costBreakdownData.map(d => d.value), 1);

  const competitorGauge = Math.max(0, Math.min(100, ((r.recommendedPrice - inputs.competitorPrice) / inputs.competitorPrice) * 200 + 50));

  const alerts = useMemo(() => {
    const M: { type: "error" | "warn" | "info"; msg: string }[] = [];
    if (r.profitPerUnit <= 0) M.push({ type: "error", msg: T("alertLoss") });
    if (r.vsCompetitorPct > 30) M.push({ type: "warn", msg: T("alertAboveCompetitor", { pct: Math.round(r.vsCompetitorPct) }) });
    if (r.markupPct < 25) M.push({ type: "warn", msg: T("alertLowMarkup", { pct: r.markupPct.toFixed(1) }) });
    if (r.vsCompetitorPct < -25) M.push({ type: "info", msg: T("alertBelowCompetitor", { pct: Math.round(Math.abs(r.vsCompetitorPct)) }) });
    if (inputs.commissionPct > 10) M.push({ type: "info", msg: T("alertHighCommission") });
    return M;
  }, [r, inputs, T]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    const profitRatio = r.profitPerUnit / (r.recommendedPrice * (1 - inputs.commissionPct / 100)) * 100;
    if (profitRatio < 20 && inputs.desiredMarginPct >= 25) {
      R.push({ icon: <Cog6ToothIcon className="w-5 h-5 text-purple-500" />, title: T("recNegotiateCosts"), desc: T("recNegotiateCostsDesc", { cost: fmtCurr(Math.round(inputs.cogs * 0.15)) }) });
    }
    if (r.vsCompetitorPct > 20) {
      R.push({ icon: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />, title: T("recHighPrice"), desc: T("recHighPriceDesc", { pct: Math.round(r.vsCompetitorPct) }) });
    }
    if (r.vsCompetitorPct < -20) {
      R.push({ icon: <RocketLaunchIcon className="w-5 h-5 text-emerald-500" />, title: T("recLowPrice"), desc: T("recLowPriceDesc", { pct: Math.round(Math.abs(r.vsCompetitorPct)) }) });
    }
    if (inputs.commissionPct > 8) {
      R.push({ icon: <ScaleIcon className="w-5 h-5 text-amber-500" />, title: T("recLowerCommission"), desc: T("recLowerCommissionDesc") });
    }
    if (inputs.adCost > (inputs.cogs + inputs.shipping + inputs.packing) * 0.4) {
      R.push({ icon: <ChartBarIcon className="w-5 h-5 text-blue-500" />, title: T("recAdEfficiency"), desc: T("recAdEfficiencyDesc", { target: fmtCurr(Math.round(inputs.adCost * 0.75)) }) });
    }
    if (r.markupPct < 30) {
      R.push({ icon: <ArrowTrendingUpIcon className="w-5 h-5 text-orange-500" />, title: T("recIncreaseMargin"), desc: T("recIncreaseMarginDesc", { current: r.markupPct.toFixed(1), target: (r.markupPct + 10).toFixed(1) }) });
    }
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

  const Slider: React.FC<{
    label: string; value: number; min: number; max: number;
    step?: number; onChange: React.ChangeEventHandler;
    isPercent?: boolean; suffix?: string;
  }> = ({ label, value, min, max, step = 1, onChange, isPercent, suffix }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="flex items-center gap-1">
          <input type="number" value={value} onChange={onChange} min={min} max={max} step={step}
            className="w-20 sm:w-24 text-right font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{isPercent ? "%" : suffix || sym(currency)}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(min)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
        <span>{fmt(max)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
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
              <TagIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
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

        {/* Ticket Tier Selector */}
        <div className="flex gap-2">
          {(["low", "mid", "high"] as TicketTier[]).map((t) => (
            <button key={t} onClick={() => applyTier(t)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                tier === t
                  ? t === "low"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                    : t === "mid"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                t === "low" ? "bg-red-500" : t === "mid" ? "bg-yellow-500" : "bg-emerald-500"
              }`} />
              {T(`tier${t.charAt(0).toUpperCase() + t.slice(1)}`)}
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
            <Card title={T("costInputs")} icon={<CurrencyDollarIcon className="w-5 h-5 text-purple-500" />}>
              <Slider label={T("cogs")} value={inputs.cogs} min={1} max={5000} step={10} onChange={set("cogs")} />
              <Slider label={T("shipping")} value={inputs.shipping} min={0} max={500} step={10} onChange={set("shipping")} />
              <Slider label={T("packing")} value={inputs.packing} min={0} max={200} step={5} onChange={set("packing")} />
              <Slider label={T("adCost")} value={inputs.adCost} min={0} max={1000} step={10} onChange={set("adCost")} />
            </Card>

            <Card title={T("marketInputs")} icon={<ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />}>
              <Slider label={T("commissionPct")} value={inputs.commissionPct} min={0} max={30} step={1} isPercent onChange={set("commissionPct")} />
              <Slider label={T("desiredMarginPct")} value={inputs.desiredMarginPct} min={5} max={80} step={5} isPercent onChange={set("desiredMarginPct")} />
              <Slider label={T("competitorPrice")} value={inputs.competitorPrice} min={10} max={10000} step={50} onChange={set("competitorPrice")} />
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard label={T("breakEvenPrice")} value={fmtCurr(Math.round(r.breakEvenPrice))} sub={T("breakEvenPriceSub")} positive={r.breakEvenPrice > 0} accent="blue" />
              <MetricCard label={T("recommendedPrice")} value={fmtCurr(Math.round(r.recommendedPrice))} sub={T("recommendedPriceSub")} positive={r.profitPerUnit > 0} accent="emerald" />
              <MetricCard label={T("profitPerUnit")} value={fmtCurr(Math.round(r.profitPerUnit))} sub={T("profitPerUnitSub")} positive={r.profitPerUnit > 0} accent={r.profitPerUnit > 0 ? "emerald" : "red"} />
              <MetricCard label={T("markupPct")} value={`${r.markupPct.toFixed(1)}%`} sub={T("markupPctSub")} positive={r.markupPct >= 30} accent="purple" />
              <MetricCard label={T("totalCostPerUnit")} value={fmtCurr(Math.round(r.totalCostPerUnit))} sub={T("totalCostPerUnitSub")} positive={true} accent="gray" />
              <MetricCard label={T("vsCompetitor")} value={`${r.vsCompetitorPct >= 0 ? "+" : ""}${r.vsCompetitorPct.toFixed(1)}%`} sub={r.isCompetitive ? T("competitive") : T("notCompetitive")} positive={r.isCompetitive} accent={r.isCompetitive ? "emerald" : "red"} />
            </div>

            {/* Competitor Gauge */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <ScaleIcon className="w-4 h-4 shrink-0" /> {T("competitorPosition")}
              </h3>
              <div className="space-y-2">
                <div className="relative h-6 rounded-full overflow-hidden bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-gray-300 shadow-lg transition-all duration-500 z-10"
                    style={{ left: `${competitorGauge}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span className="text-emerald-500">{T("belowCompetitor")}</span>
                  <span className="text-gray-400">{T("atCompetitor")}</span>
                  <span className="text-red-500">{T("aboveCompetitor")}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-gray-500">{T("yourPrice")}:</span>
                  <span className={`font-bold font-mono ${
                    r.vsCompetitorPct <= -15 ? "text-emerald-500"
                      : r.vsCompetitorPct >= 15 ? "text-red-500"
                      : "text-yellow-500"
                  }`}>{fmtCurr(Math.round(r.recommendedPrice))}</span>
                  <span className="text-gray-300">vs</span>
                  <span className="text-gray-500">{T("competitor")}:</span>
                  <span className="font-bold font-mono text-gray-900 dark:text-gray-100">{fmtCurr(inputs.competitorPrice)}</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("costBreakdown")}
              </h3>
              <div className="space-y-2">
                {costBreakdownData.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(Math.round(d.value))} {sym(currency)}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (d.value / maxCost) * 100)}%`, backgroundColor: d.fill }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 flex justify-between text-xs border-t border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 font-medium">{T("totalDirectCost")}</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">{fmtCurr(Math.round(r.totalDirectCost))}</span>
                </div>
              </div>
            </div>

            {/* What-If Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <WhatIfButton
                  label={T("whatIfMargin")}
                  emoji="🎯"
                  desc={T("whatIfMarginDesc")}
                  active={activeAction === "marginUp"}
                  impact={whatIfAll.marginUp.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("marginUp")}
                  suffix={T("profitImpact")}
                />
                <WhatIfButton
                  label={T("whatIfCOGS")}
                  emoji="📦"
                  desc={T("whatIfCOGSDesc")}
                  active={activeAction === "cogsDown10"}
                  impact={whatIfAll.cogsDown10.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("cogsDown10")}
                  suffix={T("profitImpact")}
                />
                <WhatIfButton
                  label={T("whatIfAd")}
                  emoji="📢"
                  desc={T("whatIfAdDesc")}
                  active={activeAction === "adEfficiency"}
                  impact={whatIfAll.adEfficiency.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("adEfficiency")}
                  suffix={T("profitImpact")}
                />
              </div>
              {activeAction && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{T("whatIfComparison")}</span>
                    <button onClick={revertWhatIf} className="text-[10px] text-red-400 hover:text-red-600 underline">{T("whatIfReset")}</button>
                  </div>
                  <WhatIfRow label={T("breakEvenPrice")} base={fmtCurr(Math.round(r.breakEvenPrice))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.breakEvenPrice))} positive={whatIfAll[activeAction].result.breakEvenPrice <= r.breakEvenPrice} />
                  <WhatIfRow label={T("recommendedPrice")} base={fmtCurr(Math.round(r.recommendedPrice))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.recommendedPrice))} positive={whatIfAll[activeAction].result.profitPerUnit >= r.profitPerUnit} />
                  <WhatIfRow label={T("profitPerUnit")} base={fmtCurr(Math.round(r.profitPerUnit))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.profitPerUnit))} positive={whatIfAll[activeAction].result.profitPerUnit >= r.profitPerUnit} />
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
                      [T("stepDirectCost"), `${fmtCurr(inputs.cogs)} + ${fmtCurr(inputs.shipping)} + ${fmtCurr(inputs.packing)} + ${fmtCurr(inputs.adCost)}`, fmtCurr(Math.round(r.totalDirectCost))],
                      [T("stepBreakEven"), `${fmtCurr(Math.round(r.totalDirectCost))} ÷ (1 − ${inputs.commissionPct}%)`, fmtCurr(Math.round(r.breakEvenPrice))],
                      [T("stepRecommended"), `${fmtCurr(Math.round(r.totalDirectCost))} ÷ ((1 − ${inputs.commissionPct}%) × (1 − ${inputs.desiredMarginPct}%))`, fmtCurr(Math.round(r.recommendedPrice))],
                      [T("stepProfit"), `${fmtCurr(Math.round(r.recommendedPrice))} × (1 − ${inputs.commissionPct}%) − ${fmtCurr(Math.round(r.totalDirectCost))}`, fmtCurr(Math.round(r.profitPerUnit))],
                      [T("stepMarkup"), `${fmtCurr(Math.round(r.profitPerUnit))} ÷ ${fmtCurr(Math.round(r.totalDirectCost))} × 100`, `${r.markupPct.toFixed(1)}%`],
                      [T("stepTotalCost"), `${fmtCurr(Math.round(r.totalDirectCost))} + ${fmtCurr(inputs.competitorPrice)} × ${inputs.commissionPct}%`, fmtCurr(Math.round(r.totalCostPerUnit))],
                      [T("stepVsCompetitor"), `(${fmtCurr(Math.round(r.recommendedPrice))} − ${fmtCurr(inputs.competitorPrice)}) ÷ ${fmtCurr(inputs.competitorPrice)} × 100`, `${r.vsCompetitorPct >= 0 ? "+" : ""}${r.vsCompetitorPct.toFixed(1)}%`],
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

function WhatIfButton({ label, emoji, desc, active, impact, curr, onClick, suffix }: {
  label: string; emoji: string; desc: string; active: boolean;
  impact: number | null; curr: (v: number) => string; onClick: () => void; suffix?: string;
}) {
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
          <span className={impact >= 0 ? "text-emerald-500" : "text-red-500"}>{impact >= 0 ? "+" : ""}{curr(Math.round(impact))}</span>
          <span className="text-gray-400">{suffix || "impact"}</span>
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
