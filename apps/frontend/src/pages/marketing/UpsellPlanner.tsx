import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon,
  SparklesIcon, CheckCircleIcon, XCircleIcon,
  Cog6ToothIcon, ArrowPathIcon,
  WalletIcon, GiftIcon,
  ArrowUpIcon, ArrowDownIcon,
} from "@heroicons/react/24/outline";
import SliderInput from "@/components/common/SliderInput";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type Preset = "small" | "mid" | "growth";

interface Inputs {
  aov: number;
  orders: number;
  upsellRate: number;
  upsellValue: number;
  crossRate: number;
  crossValue: number;
  discount: number;
  margin: number;
}

interface Results {
  currentRevenue: number;
  upsellRevenue: number;
  crossRevenue: number;
  discountCost: number;
  newRevenue: number;
  revenueIncrease: number;
  revenueIncreasePct: number;
  newAov: number;
  aovIncrease: number;
  aovIncreasePct: number;
  additionalProfit: number;
  upsellOrders: number;
  crossOrders: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfAction = "raiseUpsellRate" | "raiseCrossRate" | "reduceDiscount" | "boostOrders";

const PRESETS: Record<Preset, Inputs> = {
  small: { aov: 500, orders: 200, upsellRate: 10, upsellValue: 250, crossRate: 8, crossValue: 150, discount: 10, margin: 30 },
  mid: { aov: 1200, orders: 800, upsellRate: 15, upsellValue: 400, crossRate: 12, crossValue: 250, discount: 12, margin: 35 },
  growth: { aov: 3000, orders: 3000, upsellRate: 20, upsellValue: 800, crossRate: 15, crossValue: 500, discount: 15, margin: 40 },
};

const DEFAULTS: Inputs = { aov: 500, orders: 200, upsellRate: 10, upsellValue: 250, crossRate: 8, crossValue: 150, discount: 10, margin: 30 };

const STORAGE_KEY = "maxp_upsell_saved";

const INDUSTRY_BENCHMARKS: { key: string; upsellRate: number; crossRate: number }[] = [
  { key: "benchmarkFashion", upsellRate: 18, crossRate: 14 },
  { key: "benchmarkElectronics", upsellRate: 22, crossRate: 16 },
  { key: "benchmarkHealth", upsellRate: 15, crossRate: 20 },
  { key: "benchmarkFood", upsellRate: 12, crossRate: 10 },
  { key: "benchmarkHome", upsellRate: 20, crossRate: 18 },
  { key: "benchmarkGeneral", upsellRate: 16, crossRate: 13 },
];

const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

const fmt1 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

const compute = (i: Inputs): Results => {
  const currentRevenue = i.aov * i.orders;
  const upsellOrders = i.orders * (i.upsellRate / 100);
  const crossOrders = i.orders * (i.crossRate / 100);
  const upsellRevenue = upsellOrders * i.upsellValue;
  const crossRevenue = crossOrders * i.crossValue;
  const discountCost = (upsellRevenue + crossRevenue) * (i.discount / 100);
  const newRevenue = currentRevenue + upsellRevenue + crossRevenue - discountCost;
  const revenueIncrease = newRevenue - currentRevenue;
  const revenueIncreasePct = currentRevenue > 0 ? (revenueIncrease / currentRevenue) * 100 : 0;
  const newAov = i.orders > 0 ? newRevenue / i.orders : 0;
  const aovIncrease = newAov - i.aov;
  const aovIncreasePct = i.aov > 0 ? (aovIncrease / i.aov) * 100 : 0;
  const additionalProfit = (upsellRevenue + crossRevenue - discountCost) * (i.margin / 100);
  return {
    currentRevenue, upsellRevenue, crossRevenue, discountCost,
    newRevenue, revenueIncrease, revenueIncreasePct,
    newAov, aovIncrease, aovIncreasePct, additionalProfit,
    upsellOrders: Math.round(upsellOrders), crossOrders: Math.round(crossOrders),
  };
};

function MetricCard({ label, value, sub, positive, accent = "emerald" }: {
  label: string; value: string; sub: string; positive?: boolean; accent?: string;
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
      <div className={`text-base sm:text-lg font-bold font-mono ${positive === undefined ? colorMap.gray : positive ? colorMap[accent] : colorMap.red}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function WhatIfButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center w-full ${active ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400 text-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300"}`}>
      {label}
    </button>
  );
}

function WhatIfRow({ label, current, whatIf, diff, isPositive }: {
  label: string; current: string; whatIf: string; diff: string; isPositive: boolean;
}) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  return (
    <div className="grid grid-cols-4 gap-2 py-2 px-2 sm:px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs sm:text-sm border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={`text-gray-600 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{label}</div>
      <div className={`text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{current}</div>
      <div className={`text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{whatIf}</div>
      <div className={`font-semibold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} ${isRtl ? "text-left" : "text-right"}`}>{diff}</div>
    </div>
  );
}

function BarSegment({ label, value, color, pct }: { label: string; value: string; color: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-24 sm:w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}>
          <span className="text-xs font-semibold text-white drop-shadow-sm">{value}</span>
        </div>
      </div>
    </div>
  );
}

export default function UpsellPlanner() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `upsellPlanner.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("small");
  const [currency, setCurrency] = useState("EGP");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = (v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`;

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const r = useMemo(() => compute(inputs), [inputs]);

  const whatIfResults = useMemo(() => {
    const all: Record<WhatIfAction, { labelKey: string; results: Results; }> = {
      raiseUpsellRate: {
        labelKey: "raiseUpsellRate",
        results: compute({ ...inputs, upsellRate: 25 }),
      },
      raiseCrossRate: {
        labelKey: "raiseCrossRate",
        results: compute({ ...inputs, crossRate: 20 }),
      },
      reduceDiscount: {
        labelKey: "reduceDiscount",
        results: compute({ ...inputs, discount: 5 }),
      },
      boostOrders: {
        labelKey: "boostOrders",
        results: compute({ ...inputs, orders: Math.round(inputs.orders * 1.2) }),
      },
    };
    return all;
  }, [inputs]);

  const alerts = useMemo(() => {
    const a: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (inputs.upsellRate >= 20) {
      a.push({ type: "success", title: T("goodUpsell"), msg: T("goodUpsellMsg", { rate: inputs.upsellRate }) });
    } else if (inputs.upsellRate < 10) {
      a.push({ type: "error", title: T("lowUpsell"), msg: T("lowUpsellMsg", { rate: inputs.upsellRate }) });
    }
    if (inputs.crossRate >= 15) {
      a.push({ type: "success", title: T("goodCross"), msg: T("goodCrossMsg", { rate: inputs.crossRate }) });
    } else if (inputs.crossRate < 8) {
      a.push({ type: "warn", title: T("lowCross"), msg: T("lowCrossMsg", { rate: inputs.crossRate }) });
    }
    if (inputs.discount > 12) {
      const addonRev = r.upsellRevenue + r.crossRevenue;
      const pct = addonRev > 0 ? Math.round((r.discountCost / addonRev) * 100) : 0;
      a.push({ type: "warn", title: T("highDiscount"), msg: T("highDiscountMsg", { rate: inputs.discount, pct }) });
    }
    if (r.additionalProfit > 0) {
      a.push({ type: "success", title: T("goodProfit"), msg: T("goodProfitMsg", { value: fmtCurr(r.additionalProfit) }) });
    }
    return a;
  }, [inputs, r, T, fmtCurr]);

  const chartData = useMemo(() => {
    const total = r.currentRevenue + r.upsellRevenue + r.crossRevenue;
    if (total === 0) return [];
    return [
      { label: T("chartCurrent"), value: fmtCurr(r.currentRevenue), pct: (r.currentRevenue / total) * 100, color: "#3b82f6" },
      { label: T("chartUpsell"), value: fmtCurr(r.upsellRevenue), pct: (r.upsellRevenue / total) * 100, color: "#8b5cf6" },
      { label: T("chartCross"), value: fmtCurr(r.crossRevenue), pct: (r.crossRevenue / total) * 100, color: "#06b6d4" },
      { label: T("chartDiscount"), value: `-${fmtCurr(r.discountCost)}`, pct: (r.discountCost / total) * 100, color: "#f59e0b" },
    ];
  }, [r, T, fmtCurr]);

  const loadPreset = (p: Preset) => {
    setPreset(p);
    setInputs({ ...PRESETS[p] });
    setActiveAction(null);
  };

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => {
    setInputs({ ...s.inputs });
    setCurrency(s.currency);
    setActiveAction(null);
  };

  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <ArrowTrendingUpIcon className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{T("title")}</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{T("subtitle")}</p>
            </div>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} - {sym(c)}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {(Object.keys(PRESETS) as Preset[]).map((p) => (
            <button key={p} onClick={() => loadPreset(p)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${preset === p ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
              {T(`preset${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)}
            placeholder={T("scenarioName")}
            className="flex-1 min-w-[140px] max-w-[220px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400" />
          <button onClick={saveScenario} disabled={saved.length >= 3}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <SaveIcon className="w-3.5 h-3.5" /> {T("saveScenario")}
          </button>
          {saved.length > 0 && <span className="text-xs text-gray-400">{T("savedScenarios")}:</span>}
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
              <button onClick={() => deleteScenario(sc.id)} className="text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="w-3 h-3" /></button>
            </div>
          ))}
          {saved.length >= 3 && <span className="text-xs text-amber-500">{T("maxSaved")}</span>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" /> {T("calculate")}
              </h2>
              <SliderInput label={T("inputAov")} value={inputs.aov} min={50} max={10000} step={10} onChange={set("aov")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputOrders")} value={inputs.orders} min={10} max={10000} step={10} onChange={set("orders")} suffix="" />
              <SliderInput label={T("inputUpsellRate")} value={inputs.upsellRate} min={1} max={60} step={1} onChange={set("upsellRate")} isPercent />
              <SliderInput label={T("inputUpsellValue")} value={inputs.upsellValue} min={10} max={5000} step={10} onChange={set("upsellValue")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputCrossRate")} value={inputs.crossRate} min={1} max={50} step={1} onChange={set("crossRate")} isPercent />
              <SliderInput label={T("inputCrossValue")} value={inputs.crossValue} min={10} max={3000} step={10} onChange={set("crossValue")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputDiscount")} value={inputs.discount} min={0} max={40} step={1} onChange={set("discount")} isPercent />
              <SliderInput label={T("inputMargin")} value={inputs.margin} min={5} max={80} step={1} onChange={set("margin")} isPercent />
              <button onClick={() => { setInputs({ ...DEFAULTS }); setActiveAction(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-full justify-center">
                <ArrowPathIcon className="w-4 h-4" /> {T("reset")}
              </button>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-4 sm:space-y-5">
            {!inputs.aov || !inputs.orders ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 text-center">
                <CalculatorIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{T("noData")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <MetricCard label={T("currentRevenue")} value={fmtCurr(r.currentRevenue)} sub={T("currentRevenueSub")} positive accent="blue" />
                  <MetricCard label={T("newRevenue")} value={fmtCurr(r.newRevenue)} sub={T("newRevenueSub")} positive accent="purple" />
                  <MetricCard label={T("revenueIncrease")} value={`+${fmtCurr(r.revenueIncrease)}`} sub={`+${fmt1(r.revenueIncreasePct)}% ${T("revenueIncreaseSub")}`} positive accent="emerald" />
                  <MetricCard label={T("newAov")} value={fmtCurr(r.newAov)} sub={T("newAovSub")} positive accent="blue" />
                  <MetricCard label={T("aovIncrease")} value={`+${fmtCurr(r.aovIncrease)}`} sub={`+${fmt1(r.aovIncreasePct)}% ${T("aovIncreaseSub")}`} positive accent="emerald" />
                  <MetricCard label={T("additionalProfit")} value={fmtCurr(r.additionalProfit)} sub={T("additionalProfitSub")} positive={r.additionalProfit > 0} accent={r.additionalProfit > 0 ? "emerald" : "red"} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <MetricCard label={T("upsellRevenue")} value={fmtCurr(r.upsellRevenue)} sub={`${r.upsellOrders} ${T("ordersAffected")}`} positive accent="purple" />
                  <MetricCard label={T("crossRevenue")} value={fmtCurr(r.crossRevenue)} sub={`${r.crossOrders} ${T("ordersAffected")}`} positive accent="cyan" />
                  <MetricCard label={T("discountCost")} value={`-${fmtCurr(r.discountCost)}`} sub={T("discountCostSub")} positive={false} accent="yellow" />
                  <MetricCard label={T("revenueIncrease")} value={`+${fmt1(r.revenueIncreasePct)}%`} sub={T("revenueIncreaseSub")} positive accent="emerald" />
                </div>

                {chartData.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("revenueBreakdown")}</h3>
                    {chartData.map((d, i) => (
                      <BarSegment key={i} label={d.label} value={d.value} color={d.color} pct={d.pct} />
                    ))}
                  </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("alerts")}</h3>
                  {alerts.map((alert, i) => {
                    const colors = {
                      success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
                      warn: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
                      error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
                    };
                    const icons = {
                      success: <CheckCircleIcon className="w-4 h-4 shrink-0" />,
                      warn: <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />,
                      error: <XCircleIcon className="w-4 h-4 shrink-0" />,
                    };
                    return (
                      <div key={i} className={`flex items-start gap-2 p-2.5 sm:p-3 rounded-lg border ${colors[alert.type]}`}>
                        {icons[alert.type]}
                        <div>
                          <div className="text-xs font-semibold">{alert.title}</div>
                          <div className="text-xs opacity-80">{alert.msg}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("benchmarks")}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T("benchmarks")}</th>
                          <th className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-center">{T("upsellRate")}</th>
                          <th className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-center">{T("crossRate")}</th>
                          <th className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-center">VS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {INDUSTRY_BENCHMARKS.map((b) => {
                          const upsellOk = inputs.upsellRate >= b.upsellRate;
                          const crossOk = inputs.crossRate >= b.crossRate;
                          return (
                            <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className={`py-2 px-2 text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T(b.key)}</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`inline-flex items-center gap-1 ${upsellOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {b.upsellRate}% {upsellOk ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`inline-flex items-center gap-1 ${crossOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {b.crossRate}% {crossOk ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-xs font-semibold ${upsellOk && crossOk ? "text-emerald-500" : "text-amber-500"}`}>
                                  {upsellOk && crossOk ? "✓" : "!"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("quickActions")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {(Object.keys(whatIfResults) as WhatIfAction[]).map((action) => (
                      <WhatIfButton key={action} label={T(whatIfResults[action].labelKey)}
                        active={activeAction === action}
                        onClick={() => setActiveAction(activeAction === action ? null : action)} />
                    ))}
                  </div>
                  {activeAction && (() => {
                    const wa = whatIfResults[activeAction];
                    return (
                      <div className="mt-2 space-y-2">
                        <div className={`grid grid-cols-4 gap-2 py-1.5 px-2 sm:px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 ${isRtl ? "text-right" : "text-left"}`}>
                          <span>{T("scenario")}</span>
                          <span>{T("current")}</span>
                          <span>{T("whatIf")}</span>
                          <span className={isRtl ? "text-left" : "text-right"}>{T("difference")}</span>
                        </div>
                        <WhatIfRow label={T("newRevenue")} current={fmtCurr(r.newRevenue)} whatIf={fmtCurr(wa.results.newRevenue)}
                          diff={`${((wa.results.newRevenue / r.newRevenue - 1) * 100).toFixed(0)}%`} isPositive={wa.results.newRevenue >= r.newRevenue} />
                        <WhatIfRow label={T("revenueIncrease")} current={fmtCurr(r.revenueIncrease)} whatIf={fmtCurr(wa.results.revenueIncrease)}
                          diff={`${((wa.results.revenueIncrease / (r.revenueIncrease || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.revenueIncrease >= r.revenueIncrease} />
                        <WhatIfRow label={T("newAov")} current={fmtCurr(r.newAov)} whatIf={fmtCurr(wa.results.newAov)}
                          diff={`${((wa.results.newAov / r.newAov - 1) * 100).toFixed(0)}%`} isPositive={wa.results.newAov >= r.newAov} />
                        <WhatIfRow label={T("additionalProfit")} current={fmtCurr(r.additionalProfit)} whatIf={fmtCurr(wa.results.additionalProfit)}
                          diff={`${((wa.results.additionalProfit / (r.additionalProfit || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.additionalProfit >= r.additionalProfit} />
                      </div>
                    );
                  })()}
                </div>

                <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    <InformationCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{T("recommendations")}</span>
                    <SparklesIcon className="w-3.5 h-3.5 ml-auto text-yellow-500 opacity-0 group-open:opacity-100 transition-opacity" />
                  </summary>
                  <div className="mt-3 space-y-3">
                    {[
                      { icon: <GiftIcon className="w-4 h-4 text-amber-500" />, title: T("recommendation1"), desc: T("recommendation1Desc") },
                      { icon: <SparklesIcon className="w-4 h-4 text-purple-500" />, title: T("recommendation2"), desc: T("recommendation2Desc") },
                      { icon: <WalletIcon className="w-4 h-4 text-emerald-500" />, title: T("recommendation3"), desc: T("recommendation3Desc") },
                    ].map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        {rec.icon}
                        <div>
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{rec.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{rec.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                    <CalculatorIcon className="w-4 h-4 shrink-0" />
                    <span>{T("formula")}</span>
                  </summary>
                  <div className="mt-3">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-right" : "text-left"}`}>#</th>
                          <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T("scenario")}</th>
                          <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T("formula")}</th>
                          <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-left" : "text-right"}`}>{T("calculate")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[
                          { step: 1, label: T("formulaStep1"), formula: T("formulaStep1Eq"), result: fmtCurr(r.upsellRevenue) },
                          { step: 2, label: T("formulaStep2"), formula: T("formulaStep2Eq"), result: fmtCurr(r.crossRevenue) },
                          { step: 3, label: T("formulaStep3"), formula: T("formulaStep3Eq"), result: `-${fmtCurr(r.discountCost)}` },
                          { step: 4, label: T("formulaStep4"), formula: T("formulaStep4Eq"), result: fmtCurr(r.newRevenue) },
                          { step: 5, label: T("formulaStep5"), formula: T("formulaStep5Eq"), result: fmtCurr(r.additionalProfit) },
                        ].map((row) => (
                          <tr key={row.step} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-2 sm:px-3 text-gray-400">{row.step}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{row.label}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-mono ${isRtl ? "text-right" : "text-left"}`}>{row.formula}</td>
                            <td className={`py-2 px-2 sm:px-3 font-semibold font-mono text-amber-600 dark:text-amber-400 ${isRtl ? "text-left" : "text-right"}`}>{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
