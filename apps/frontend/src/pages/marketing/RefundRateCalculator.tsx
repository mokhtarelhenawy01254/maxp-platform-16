import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon,
  SparklesIcon, CheckCircleIcon, XCircleIcon,
  Cog6ToothIcon, ArrowPathIcon,
  WalletIcon, GiftIcon,
  ArrowUpIcon, ArrowDownIcon,
  ShieldExclamationIcon, CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import SliderInput from "@/components/common/SliderInput";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type Preset = "low" | "average" | "high";

interface Inputs {
  revenue: number;
  orders: number;
  refundRate: number;
  refundAmount: number;
  shipping: number;
  restocking: number;
  margin: number;
}

interface Results {
  refundedOrders: number;
  totalRefund: number;
  shippingCost: number;
  restockingRecovery: number;
  netRefundLoss: number;
  lostProfit: number;
  effectiveRevenue: number;
  maxAcceptableRate: number;
  lossPct: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfAction = "reduceRefundRate" | "raiseRestocking" | "reduceShipping" | "improveMargin";

const PRESETS: Record<Preset, Inputs> = {
  low: { revenue: 500000, orders: 600, refundRate: 5, refundAmount: 500, shipping: 30, restocking: 5, margin: 30 },
  average: { revenue: 500000, orders: 600, refundRate: 10, refundAmount: 700, shipping: 50, restocking: 10, margin: 35 },
  high: { revenue: 500000, orders: 600, refundRate: 20, refundAmount: 900, shipping: 80, restocking: 15, margin: 40 },
};

const DEFAULTS: Inputs = { revenue: 500000, orders: 600, refundRate: 10, refundAmount: 700, shipping: 50, restocking: 10, margin: 35 };

const STORAGE_KEY = "maxp_refund_saved";

const INDUSTRY_BENCHMARKS: { key: string; refundRate: number }[] = [
  { key: "benchmarkFashion", refundRate: 15 },
  { key: "benchmarkElectronics", refundRate: 8 },
  { key: "benchmarkHealth", refundRate: 5 },
  { key: "benchmarkFood", refundRate: 3 },
  { key: "benchmarkHome", refundRate: 10 },
  { key: "benchmarkGeneral", refundRate: 8 },
];

const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

const fmt1 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

// Industry rule of thumb: keep total refund losses under ~15% of revenue.
const MAX_ACCEPTABLE_REFUND_REVENUE_SHARE = 0.15;

export const compute = (i: Inputs): Results => {
  const refundedOrders = i.orders * (i.refundRate / 100);
  const totalRefund = refundedOrders * i.refundAmount;
  const shippingCost = refundedOrders * i.shipping;
  const restockingRecovery = totalRefund * (i.restocking / 100);
  const netRefundLoss = totalRefund + shippingCost - restockingRecovery;
  // Refund loss is cash out the door — it equals the net refund amount, not a margin-adjusted fraction.
  const lostProfit = netRefundLoss;
  const effectiveRevenue = i.revenue - netRefundLoss;
  const perUnitCost = i.refundAmount + i.shipping - i.refundAmount * (i.restocking / 100);
  const maxAcceptableRate = perUnitCost > 0 && i.orders > 0
    ? ((i.revenue * MAX_ACCEPTABLE_REFUND_REVENUE_SHARE) / (i.orders * perUnitCost)) * 100
    : 0;
  const lossPct = i.revenue > 0 ? (netRefundLoss / i.revenue) * 100 : 0;
  return {
    refundedOrders: Math.round(refundedOrders),
    totalRefund, shippingCost, restockingRecovery,
    netRefundLoss, lostProfit, effectiveRevenue,
    maxAcceptableRate, lossPct,
  };
};

function MetricCard({ label, value, sub, positive, accent = "emerald", badge }: {
  label: string; value: string; sub: string; positive?: boolean; accent?: string; badge?: { text: string; type: "success" | "warn" | "error" };
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    gray: "text-gray-900 dark:text-gray-100",
    cyan: "text-cyan-600 dark:text-cyan-400",
    orange: "text-orange-600 dark:text-orange-400",
  };
  const badgeColors = { success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", warn: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300", error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        {badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColors[badge.type]}`}>{badge.text}</span>}
      </div>
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

export default function RefundRateCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `refundRateCalculator.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("average");
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
      reduceRefundRate: {
        labelKey: "reduceRefundRate",
        results: compute({ ...inputs, refundRate: 5 }),
      },
      raiseRestocking: {
        labelKey: "raiseRestocking",
        results: compute({ ...inputs, restocking: 15 }),
      },
      reduceShipping: {
        labelKey: "reduceShipping",
        results: compute({ ...inputs, shipping: 25 }),
      },
      improveMargin: {
        labelKey: "improveMargin",
        results: compute({ ...inputs, margin: 50 }),
      },
    };
    return all;
  }, [inputs]);

  const getStatusBadge = (value: number, thresholds: { safe: number; warn: number }): { text: string; type: "success" | "warn" | "error" } => {
    if (value <= thresholds.safe) return { text: T("healthy"), type: "success" };
    if (value <= thresholds.warn) return { text: T("warning"), type: "warn" };
    return { text: T("critical"), type: "error" };
  };

  const alerts = useMemo(() => {
    const a: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (inputs.refundRate >= 10) {
      a.push({ type: "error", title: T("highRefundRate"), msg: T("highRefundRateMsg", { rate: inputs.refundRate }) });
    } else if (inputs.refundRate <= 5) {
      a.push({ type: "success", title: T("lowRefundRate"), msg: T("lowRefundRateMsg", { rate: inputs.refundRate }) });
    }
    if (inputs.shipping > 50) {
      const pct = r.netRefundLoss > 0 ? Math.round((inputs.shipping * r.refundedOrders / r.netRefundLoss) * 100) : 0;
      a.push({ type: "warn", title: T("highShippingCost"), msg: T("highShippingCostMsg", { cost: fmtCurr(inputs.shipping), pct }) });
    }
    if (r.lossPct > 15) {
      a.push({ type: "error", title: T("criticalLoss"), msg: T("criticalLossMsg", { loss: fmtCurr(r.netRefundLoss), pct: fmt1(r.lossPct) }) });
    } else if (r.lossPct > 5) {
      a.push({ type: "warn", title: T("healthyBusiness"), msg: T("healthyBusinessMsg", { loss: fmtCurr(r.netRefundLoss) }) });
    } else if (r.netRefundLoss > 0) {
      a.push({ type: "success", title: T("healthyBusiness"), msg: T("healthyBusinessMsg", { loss: fmtCurr(r.netRefundLoss) }) });
    }
    if (inputs.restocking >= 10) {
      a.push({ type: "success", title: T("goodRestocking"), msg: T("goodRestockingMsg", { rate: inputs.restocking, recovered: fmtCurr(r.restockingRecovery) }) });
    }
    return a;
  }, [inputs, r, T, fmtCurr]);

  const chartData = useMemo(() => {
    const items = [
      { label: T("chartRefund"), value: fmtCurr(r.totalRefund), pct: 0, color: "#ef4444" },
      { label: T("chartShipping"), value: fmtCurr(r.shippingCost), pct: 0, color: "#f97316" },
      { label: T("chartRestocking"), value: `-${fmtCurr(r.restockingRecovery)}`, pct: 0, color: "#22c55e" },
      { label: T("chartNetLoss"), value: fmtCurr(r.netRefundLoss), pct: 0, color: "#6366f1" },
    ];
    const maxVal = Math.max(r.totalRefund, r.shippingCost, r.restockingRecovery, r.netRefundLoss, 1);
    return items.map((d) => ({ ...d, pct: (Math.abs(parseFloat(d.value.replace(/[^0-9\-]/g, ""))) / maxVal) * 100 }));
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
            <div className="p-2 sm:p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <ShieldExclamationIcon className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 dark:text-red-400" />
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
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${preset === p ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
              {T(`preset${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)}
            placeholder={T("scenarioName")}
            className="flex-1 min-w-[140px] max-w-[220px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400" />
          <button onClick={saveScenario} disabled={saved.length >= 3}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <SaveIcon className="w-3.5 h-3.5" /> {T("saveScenario")}
          </button>
          {saved.length > 0 && <span className="text-xs text-gray-400">{T("savedScenarios")}:</span>}
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-red-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
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
              <SliderInput label={T("inputRevenue")} value={inputs.revenue} min={10000} max={5000000} step={1000} onChange={set("revenue")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputOrders")} value={inputs.orders} min={10} max={10000} step={10} onChange={set("orders")} suffix="" />
              <SliderInput label={T("inputRefundRate")} value={inputs.refundRate} min={1} max={40} step={1} onChange={set("refundRate")} isPercent />
              <SliderInput label={T("inputRefundAmount")} value={inputs.refundAmount} min={10} max={5000} step={10} onChange={set("refundAmount")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputShipping")} value={inputs.shipping} min={0} max={200} step={5} onChange={set("shipping")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputRestocking")} value={inputs.restocking} min={0} max={30} step={1} onChange={set("restocking")} isPercent />
              <SliderInput label={T("inputMargin")} value={inputs.margin} min={5} max={80} step={1} onChange={set("margin")} isPercent />
              <button onClick={() => { setInputs({ ...DEFAULTS }); setActiveAction(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-full justify-center">
                <ArrowPathIcon className="w-4 h-4" /> {T("reset")}
              </button>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-4 sm:space-y-5">
            {!inputs.revenue || !inputs.orders ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 text-center">
                <CalculatorIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{T("noData")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <MetricCard label={T("refundedOrders")} value={fmt(r.refundedOrders)} sub={T("refundedOrdersSub", { rate: inputs.refundRate, orders: fmt(inputs.orders) })}
                    positive={r.refundedOrders < 30} accent="orange"
                    badge={r.refundedOrders > 60 ? getStatusBadge(100, { safe: 30, warn: 60 }) : undefined} />
                  <MetricCard label={T("totalRefund")} value={fmtCurr(r.totalRefund)} sub={T("totalRefundSub")}
                    positive={false} accent="red"
                    badge={getStatusBadge(r.lossPct, { safe: 5, warn: 15 })} />
                  <MetricCard label={T("shippingCost")} value={fmtCurr(r.shippingCost)} sub={T("shippingCostSub", { count: r.refundedOrders, cost: fmtCurr(inputs.shipping) })}
                    positive={false} accent="orange" />
                  <MetricCard label={T("restockingRecovery")} value={fmtCurr(r.restockingRecovery)} sub={T("restockingRecoverySub", { rate: inputs.restocking })}
                    positive accent="emerald" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <MetricCard label={T("netRefundLoss")} value={fmtCurr(r.netRefundLoss)} sub={`${fmt1(r.lossPct)}% ${T("revenueLabel")}`}
                    positive={false} accent="red"
                    badge={getStatusBadge(r.lossPct, { safe: 5, warn: 15 })} />
                  <MetricCard label={T("lostProfit")} value={fmtCurr(r.lostProfit)} sub={T("netRefundLossSub")}
                    positive={false} accent="yellow" />
                  <MetricCard label={T("effectiveRevenue")} value={fmtCurr(r.effectiveRevenue)} sub={T("effectiveRevenueSub")}
                    positive accent="blue" />
                  <MetricCard label={T("maxAcceptableRate")} value={`${fmt1(r.maxAcceptableRate)}%`} sub={T("maxAcceptableRateSub")}
                    positive={inputs.refundRate <= r.maxAcceptableRate}
                    accent={inputs.refundRate <= r.maxAcceptableRate ? "emerald" : "red"}
                    badge={getStatusBadge(inputs.refundRate / (r.maxAcceptableRate || 1) * 100, { safe: 80, warn: 100 })} />
                </div>

                {chartData.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("lossChart")}</h3>
                    {chartData.map((d, i) => (
                      <BarSegment key={i} label={d.label} value={d.value} color={d.color} pct={d.pct} />
                    ))}
                  </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("benchmarks")}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T("benchmarks")}</th>
                          <th className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-center">{T("rate")}</th>
                          <th className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-center">{T("vsBenchmark")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {INDUSTRY_BENCHMARKS.map((b) => {
                          const ok = inputs.refundRate <= b.refundRate;
                          return (
                            <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className={`py-2 px-2 text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{T(b.key)}</td>
                              <td className="py-2 px-2 text-center font-medium">{b.refundRate}%</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {ok ? T("belowAvg") : T("aboveAvg")} {ok ? <ArrowDownIcon className="w-3 h-3" /> : <ArrowUpIcon className="w-3 h-3" />}
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
                        <WhatIfRow label={T("netRefundLoss")} current={fmtCurr(r.netRefundLoss)} whatIf={fmtCurr(wa.results.netRefundLoss)}
                          diff={`${((wa.results.netRefundLoss / (r.netRefundLoss || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.netRefundLoss <= r.netRefundLoss} />
                        <WhatIfRow label={T("lostProfit")} current={fmtCurr(r.lostProfit)} whatIf={fmtCurr(wa.results.lostProfit)}
                          diff={`${((wa.results.lostProfit / (r.lostProfit || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.lostProfit <= r.lostProfit} />
                        <WhatIfRow label={T("effectiveRevenue")} current={fmtCurr(r.effectiveRevenue)} whatIf={fmtCurr(wa.results.effectiveRevenue)}
                          diff={`${((wa.results.effectiveRevenue / r.effectiveRevenue - 1) * 100).toFixed(0)}%`} isPositive={wa.results.effectiveRevenue >= r.effectiveRevenue} />
                        <WhatIfRow label={T("maxAcceptableRate")} current={`${fmt1(r.maxAcceptableRate)}%`} whatIf={`${fmt1(wa.results.maxAcceptableRate)}%`}
                          diff={`${((wa.results.maxAcceptableRate / (r.maxAcceptableRate || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.maxAcceptableRate >= r.maxAcceptableRate} />
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
                      { icon: <GiftIcon className="w-4 h-4 text-blue-500" />, title: T("recommendation1"), desc: T("recommendation1Desc") },
                      { icon: <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />, title: T("recommendation2"), desc: T("recommendation2Desc") },
                      { icon: <SparklesIcon className="w-4 h-4 text-purple-500" />, title: T("recommendation3"), desc: T("recommendation3Desc") },
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
                          { step: 1, label: T("formulaStep1"), formula: T("formulaStep1Eq"), result: fmt(r.refundedOrders) },
                          { step: 2, label: T("formulaStep2"), formula: T("formulaStep2Eq"), result: fmtCurr(r.totalRefund) },
                          { step: 3, label: T("formulaStep3"), formula: T("formulaStep3Eq"), result: fmtCurr(r.netRefundLoss) },
                          { step: 4, label: T("formulaStep4"), formula: T("formulaStep4Eq"), result: fmtCurr(r.lostProfit) },
                          { step: 5, label: T("formulaStep5"), formula: T("formulaStep5Eq"), result: fmtCurr(r.effectiveRevenue) },
                        ].map((row) => (
                          <tr key={row.step} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-2 sm:px-3 text-gray-400">{row.step}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{row.label}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-mono ${isRtl ? "text-right" : "text-left"}`}>{row.formula}</td>
                            <td className={`py-2 px-2 sm:px-3 font-semibold font-mono text-red-600 dark:text-red-400 ${isRtl ? "text-left" : "text-right"}`}>{row.result}</td>
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
