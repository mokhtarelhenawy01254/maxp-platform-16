import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon,
  SparklesIcon, CheckCircleIcon, XCircleIcon,
  Cog6ToothIcon, ArrowPathIcon,
  RocketLaunchIcon, WalletIcon, ShoppingCartIcon,
  UserGroupIcon, HeartIcon, ClockIcon,
} from "@heroicons/react/24/outline";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type Preset = "basic" | "subscription" | "luxury" | "saas" | "quick";

interface Inputs {
  aov: number;
  frequency: number;
  lifespan: number;
  margin: number;
  cac: number;
}

interface Results {
  annualValue: number;
  grossClv: number;
  netClv: number;
  clvCacRatio: number;
  netProfit: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfAction = "raiseAov" | "raiseFreq" | "reduceCac" | "improveRetention";

const PRESETS: Record<Preset, Inputs> = {
  basic: { aov: 500, frequency: 2, lifespan: 3, margin: 30, cac: 300 },
  subscription: { aov: 200, frequency: 12, lifespan: 4, margin: 70, cac: 500 },
  luxury: { aov: 3000, frequency: 1.5, lifespan: 5, margin: 45, cac: 2000 },
  saas: { aov: 100, frequency: 12, lifespan: 5, margin: 80, cac: 800 },
  quick: { aov: 200, frequency: 6, lifespan: 2, margin: 25, cac: 150 },
};

const DEFAULTS: Inputs = { aov: 500, frequency: 2, lifespan: 3, margin: 30, cac: 300 };

const STORAGE_KEY = "maxp_clv_saved";

const INDUSTRY_BENCHMARKS: { key: string; value: number }[] = [
  { key: "benchmarkHealth", value: 550 },
  { key: "benchmarkElectronics", value: 350 },
  { key: "benchmarkFashion", value: 175 },
  { key: "benchmarkFood", value: 140 },
  { key: "benchmarkPet", value: 250 },
  { key: "benchmarkGeneral", value: 200 },
];

const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

const fmt1 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

const compute = (i: Inputs): Results => {
  const annualValue = i.aov * i.frequency;
  const grossClv = annualValue * i.lifespan;
  const netClv = grossClv * (i.margin / 100);
  const clvCacRatio = i.cac > 0 ? netClv / i.cac : 0;
  const netProfit = netClv - i.cac;
  return { annualValue, grossClv, netClv, clvCacRatio, netProfit };
};

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
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? colorMap[accent] : colorMap.red}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

const Slider: React.FC<{
  label: string; value: number; min: number; max: number;
  step?: number; onChange: React.ChangeEventHandler; suffix?: string; isPercent?: boolean;
}> = ({ label, value, min, max, step = 1, onChange, suffix, isPercent }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span>
        <input type="number" value={value} onChange={onChange}
          className="w-20 sm:w-24 text-right font-semibold bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <span className="text-gray-500 dark:text-gray-400 mr-1">{isPercent ? "%" : suffix || ""}</span>
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
    <div className="flex justify-between text-xs text-gray-400">
      <span>{fmt(min)}{isPercent ? "%" : ""}</span>
      <span>{fmt(max)}{isPercent ? "%" : ""}</span>
    </div>
  </div>
);

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

export default function CLVCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `clvCalculator.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("basic");
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
      raiseAov: {
        labelKey: "raiseAov",
        results: compute({ ...inputs, aov: inputs.aov * 1.1 }),
      },
      raiseFreq: {
        labelKey: "raiseFreq",
        results: compute({ ...inputs, frequency: 3 }),
      },
      reduceCac: {
        labelKey: "reduceCac",
        results: compute({ ...inputs, cac: inputs.cac * 0.8 }),
      },
      improveRetention: {
        labelKey: "improveRetention",
        results: compute({ ...inputs, lifespan: 5 }),
      },
    };
    return all;
  }, [inputs]);

  const alerts = useMemo(() => {
    const a: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (r.clvCacRatio >= 3) {
      a.push({ type: "success", title: T("healthyRatio"), msg: T("healthyRatioMsg", { ratio: fmt1(r.clvCacRatio) }) });
    } else if (r.clvCacRatio > 0) {
      a.push({ type: "warn", title: T("riskyRatio"), msg: T("riskyRatioMsg", { ratio: fmt1(r.clvCacRatio) }) });
    }
    if (inputs.cac > 0) {
      const pct = Math.round((inputs.cac / r.grossClv) * 100);
      if (pct > 30) {
        a.push({ type: "warn", title: T("highCac"), msg: T("highCacMsg", { pct }) });
      }
    }
    if (r.grossClv > 0) {
      a.push({ type: "success", title: T("strongClv"), msg: T("strongClvMsg", { value: fmtCurr(r.grossClv) }) });
    }
    return a;
  }, [r, inputs, T, fmtCurr]);

  const yearData = useMemo(() => {
    if (!inputs.aov || !inputs.frequency) return [];
    const annualRev = inputs.aov * inputs.frequency;
    const years = Math.min(Math.ceil(inputs.lifespan), 10);
    let cum = 0;
    return Array.from({ length: years }, (_, i) => {
      const yr = i + 1;
      const rev = i < inputs.lifespan ? annualRev : annualRev * (inputs.lifespan - Math.floor(inputs.lifespan));
      cum += rev;
      return { year: yr, revenue: Math.round(rev * conversionRate), cumulative: Math.round(cum * conversionRate) };
    });
  }, [inputs.aov, inputs.frequency, inputs.lifespan, conversionRate]);

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

  const maxBarValue = Math.max(...yearData.map((d) => d.revenue), 1);
  const maxBenchmark = Math.max(...INDUSTRY_BENCHMARKS.map((b) => b.value * conversionRate), 1);
  const userClv = r.grossClv * conversionRate;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <UserGroupIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400" />
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
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${preset === p ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
              {T(`preset${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)}
            placeholder={T("scenarioName")}
            className="flex-1 min-w-[140px] max-w-[220px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400" />
          <button onClick={saveScenario} disabled={saved.length >= 3}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <SaveIcon className="w-3.5 h-3.5" /> {T("saveScenario")}
          </button>
          {saved.length > 0 && <span className="text-xs text-gray-400">{T("savedScenarios")}:</span>}
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
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
              <Slider label={T("inputAov")} value={inputs.aov} min={10} max={10000} step={10} onChange={set("aov")} suffix={` ${sym(currency)}`} />
              <Slider label={T("inputFrequency")} value={inputs.frequency} min={0.5} max={24} step={0.5} onChange={set("frequency")} suffix=" /year" />
              <Slider label={T("inputLifespan")} value={inputs.lifespan} min={0.5} max={10} step={0.5} onChange={set("lifespan")} suffix=" years" />
              <Slider label={T("inputMargin")} value={inputs.margin} min={1} max={90} step={1} onChange={set("margin")} isPercent />
              <Slider label={T("inputCac")} value={inputs.cac} min={0} max={10000} step={10} onChange={set("cac")} suffix={` ${sym(currency)}`} />
              <button onClick={() => { setInputs({ ...DEFAULTS }); setActiveAction(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-full justify-center">
                <ArrowPathIcon className="w-4 h-4" /> {T("reset")}
              </button>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-4 sm:space-y-5">
            {!inputs.aov || !inputs.frequency ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 text-center">
                <CalculatorIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{T("noData")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <MetricCard label={T("grossClv")} value={fmtCurr(r.grossClv)} sub={T("grossClvSub")} positive accent="blue" />
                  <MetricCard label={T("netClv")} value={fmtCurr(r.netClv)} sub={T("netClvSub")} positive accent="purple" />
                  <MetricCard label={T("clvCacRatio")} value={`${fmt1(r.clvCacRatio)}:1`} sub={T("clvCacRatioSub")} positive={r.clvCacRatio >= 3} accent={r.clvCacRatio >= 3 ? "emerald" : "yellow"} />
                  <MetricCard label={T("netProfit")} value={fmtCurr(r.netProfit)} sub={T("netProfitSub")} positive={r.netProfit > 0} accent={r.netProfit > 0 ? "emerald" : "red"} />
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

                {yearData.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("lifetimeRevenue")}</h3>
                    {yearData.map((d) => (
                      <div key={d.year} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{T("year")} {d.year}</span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{fmt(d.revenue)} {sym(currency)}</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${(d.revenue / maxBarValue) * 100}%`, backgroundColor: "hsl(217 91% 60%)" }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{T("cumulative")}: {fmt(d.cumulative)} {sym(currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{T("benchmarks")}</h3>
                  {INDUSTRY_BENCHMARKS.map((b) => {
                    const bVal = b.value * conversionRate;
                    const pct = Math.min(100, (userClv / bVal) * 100);
                    const isAbove = userClv >= bVal;
                    return (
                      <div key={b.key} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{T(b.key)}</span>
                          <span className={`font-medium ${isAbove ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {fmt(bVal)} {sym(currency)}
                            {userClv > 0 && <span className="mr-1.5">{isAbove ? "↑" : "↓"}</span>}
                          </span>
                        </div>
                        {userClv > 0 && (
                          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (bVal / maxBenchmark) * 100)}%`, backgroundColor: "hsl(220 14% 70%)" }} />
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, (userClv / maxBenchmark) * 100))}%`, backgroundColor: "hsl(142 76% 36%)", marginLeft: userClv > bVal ? undefined : -4 }} />
                          </div>
                        )}
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
                        <WhatIfRow label={T("grossClv")} current={fmtCurr(r.grossClv)} whatIf={fmtCurr(wa.results.grossClv)}
                          diff={`${((wa.results.grossClv / r.grossClv - 1) * 100).toFixed(0)}%`} isPositive={wa.results.grossClv >= r.grossClv} />
                        <WhatIfRow label={T("netClv")} current={fmtCurr(r.netClv)} whatIf={fmtCurr(wa.results.netClv)}
                          diff={`${((wa.results.netClv / r.netClv - 1) * 100).toFixed(0)}%`} isPositive={wa.results.netClv >= r.netClv} />
                        <WhatIfRow label={T("clvCacRatio")} current={`${fmt1(r.clvCacRatio)}:1`} whatIf={`${fmt1(wa.results.clvCacRatio)}:1`}
                          diff={`${((wa.results.clvCacRatio / (r.clvCacRatio || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.clvCacRatio >= r.clvCacRatio} />
                        <WhatIfRow label={T("netProfit")} current={fmtCurr(r.netProfit)} whatIf={fmtCurr(wa.results.netProfit)}
                          diff={`${((wa.results.netProfit / (r.netProfit || 1) - 1) * 100).toFixed(0)}%`} isPositive={wa.results.netProfit >= r.netProfit} />
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
                      { icon: <HeartIcon className="w-4 h-4 text-pink-500" />, title: T("recommendation1"), desc: T("recommendation1Desc", { current: fmt1(inputs.lifespan) }) },
                      { icon: <ShoppingCartIcon className="w-4 h-4 text-blue-500" />, title: T("recommendation2"), desc: T("recommendation2Desc") },
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
                          { step: 1, label: T("formulaStep1"), formula: T("formulaStep1Eq"), result: fmtCurr(r.annualValue) },
                          { step: 2, label: T("formulaStep2"), formula: T("formulaStep2Eq"), result: fmtCurr(r.grossClv) },
                          { step: 3, label: T("formulaStep3"), formula: T("formulaStep3Eq"), result: fmtCurr(r.netClv) },
                          { step: 4, label: T("formulaStep4"), formula: T("formulaStep4Eq"), result: fmtCurr(r.netProfit) },
                        ].map((row) => (
                          <tr key={row.step} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-2 sm:px-3 text-gray-400">{row.step}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-700 dark:text-gray-300 font-medium ${isRtl ? "text-right" : "text-left"}`}>{row.label}</td>
                            <td className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 font-mono ${isRtl ? "text-right" : "text-left"}`}>{row.formula}</td>
                            <td className={`py-2 px-2 sm:px-3 font-semibold font-mono text-blue-600 dark:text-blue-400 ${isRtl ? "text-left" : "text-right"}`}>{row.result}</td>
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

        <div className="text-center text-xs text-gray-400 dark:text-gray-600 pb-4">
          {T("title")} &mdash; {T("subtitle")}
        </div>
      </div>
    </div>
  );
}
