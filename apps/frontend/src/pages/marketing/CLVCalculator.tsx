/**
 * 📊 Customer Lifetime Value (CLV) Engine
 *
 * حاسبة القيمة الدائمة للعميل ونسبة الكفاءة التسويقية
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  TrendingUp,
  Sliders,
  Sparkles,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import {
  MarketingTelemetryRibbon,
  MarketingMetricTile,
  MarketingPresetBar,
  MarketingScenarioBar,
  MarketingAlertBanner,
} from "./MarketingCalculatorComponents";
import {
  ClvInputs as Inputs,
  ClvResults as Results,
  computeClv as compute,
  CLV_PRESETS,
  MKT_CURRENCIES,
  MKT_CURRENCY_RATES,
  mktSym,
} from "./marketingMath";

export { compute };
export type { Inputs, Results };

type Preset = "basic" | "subscription" | "luxury" | "saas" | "quick";
type WhatIfAction = "raiseAov" | "raiseFreq" | "reduceCac" | "improveRetention";

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  currency: string;
}

const STORAGE_KEY = "maxp_clv_saved";
const DEFAULTS: Inputs = { ...CLV_PRESETS.basic };
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
const fmt1 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

const INDUSTRY_BENCHMARKS = [
  { key: "benchmarkHealth", value: 550 },
  { key: "benchmarkElectronics", value: 350 },
  { key: "benchmarkFashion", value: 175 },
  { key: "benchmarkFood", value: 140 },
  { key: "benchmarkPet", value: 250 },
  { key: "benchmarkGeneral", value: 200 },
];

export default function CLVCalculator() {
  const { t, i18n } = useTranslation();
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("basic");
  const [currency, setCurrency] = useState("EGP");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) setSaved(JSON.parse(d));
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) => `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const T = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const key = `clvCalculator.${k}`;
      return vars ? t(key, vars) : t(key);
    },
    [t],
  );

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const r = useMemo(() => compute(inputs), [inputs]);

  const whatIfResults = useMemo(() => {
    return {
      raiseAov: { label: T("raiseAov"), res: compute({ ...inputs, aov: inputs.aov * 1.1 }) },
      raiseFreq: { label: T("raiseFreq"), res: compute({ ...inputs, frequency: inputs.frequency + 1 }) },
      reduceCac: { label: T("reduceCac"), res: compute({ ...inputs, cac: inputs.cac * 0.8 }) },
      improveRetention: { label: T("improveRetention"), res: compute({ ...inputs, lifespan: inputs.lifespan + 1 }) },
    };
  }, [inputs, T]);

  const alerts = useMemo(() => {
    const a: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (r.clvCacRatio >= 3) {
      a.push({ type: "success", title: T("healthyRatio"), msg: T("healthyRatioMsg", { ratio: fmt1(r.clvCacRatio) }) });
    } else if (r.clvCacRatio > 0) {
      a.push({ type: "warn", title: T("riskyRatio"), msg: T("riskyRatioMsg", { ratio: fmt1(r.clvCacRatio) }) });
    }
    if (inputs.cac > 0 && r.grossClv > 0) {
      const pct = Math.round((inputs.cac / r.grossClv) * 100);
      if (pct > 30) a.push({ type: "warn", title: T("highCac"), msg: T("highCacMsg", { pct }) });
    }
    return a;
  }, [r, inputs, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const userClv = r.grossClv * rate;
  const maxBenchmark = Math.max(...INDUSTRY_BENCHMARKS.map((b) => b.value * rate), 1);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{T("title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{T("subtitle")}</p>
          </div>
        </div>

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="border border-border/70 bg-card rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {MKT_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} ({mktSym(c)})
            </option>
          ))}
        </select>
      </div>

      {/* Control bar: Presets & Scenarios */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-xl">
        <MarketingPresetBar
          presets={["basic", "subscription", "luxury", "saas", "quick"] as Preset[]}
          current={preset}
          onSelect={(p) => { setPreset(p); setInputs({ ...CLV_PRESETS[p] }); setActiveAction(null); }}
          labels={{
            basic: T("presetBasic"),
            subscription: T("presetSubscription"),
            luxury: T("presetLuxury"),
            saas: T("presetSaas"),
            quick: T("presetQuick"),
          }}
        />

        <MarketingScenarioBar
          saved={saved}
          scenarioName={scenarioName}
          setScenarioName={setScenarioName}
          onSave={saveScenario}
          onLoad={(s) => { setInputs({ ...s.inputs }); setCurrency(s.currency); setActiveAction(null); }}
          onDelete={(id) => persist(saved.filter((s) => s.id !== id))}
          savePlaceholder={T("scenarioName")}
          saveLabel={T("saveScenario")}
        />
      </div>

      <MarketingAlertBanner alerts={alerts} />

      {/* Single Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <MarketingTelemetryRibbon
          items={[
            { label: T("grossClv"), value: fmtCurr(r.grossClv), sub: `سنوي: ${fmtCurr(r.annualValue)}`, color: "primary" },
            { label: T("netClv"), value: fmtCurr(r.netClv), sub: `هامش: ${inputs.margin}%`, color: "purple" },
            { label: T("clvCacRatio"), value: `${fmt1(r.clvCacRatio)}:1`, sub: `اكتساب: ${fmtCurr(inputs.cac)}`, color: r.clvCacRatio >= 3 ? "emerald" : "amber" },
            { label: T("netProfit"), value: fmtCurr(r.netProfit), sub: "صافي ربح العميل", color: r.netProfit > 0 ? "emerald" : "rose" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                {T("calculate")}
              </span>
              <button
                type="button"
                onClick={() => { setInputs({ ...DEFAULTS }); setActiveAction(null); }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {T("reset")}
              </button>
            </div>

            <SliderInput label={T("inputAov")} value={inputs.aov} min={10} max={10000} step={10} onChange={set("aov")} suffix={` ${mktSym(currency)}`} />
            <SliderInput label={T("inputFrequency")} value={inputs.frequency} min={0.5} max={24} step={0.5} onChange={set("frequency")} suffix=" /سنة" />
            <SliderInput label={T("inputLifespan")} value={inputs.lifespan} min={0.5} max={10} step={0.5} onChange={set("lifespan")} suffix=" سنوات" />
            <SliderInput label={T("inputMargin")} value={inputs.margin} min={1} max={90} step={1} onChange={set("margin")} isPercent />
            <SliderInput label={T("inputCac")} value={inputs.cac} min={0} max={10000} step={10} onChange={set("cac")} suffix={` ${mktSym(currency)}`} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("grossClv")} value={fmtCurr(r.grossClv)} sub={T("grossClvSub")} accent="blue" />
              <MarketingMetricTile label={T("netClv")} value={fmtCurr(r.netClv)} sub={T("netClvSub")} accent="purple" />
              <MarketingMetricTile label={T("clvCacRatio")} value={`${fmt1(r.clvCacRatio)}:1`} sub={T("clvCacRatioSub")} positive={r.clvCacRatio >= 3} accent={r.clvCacRatio >= 3 ? "emerald" : "yellow"} />
              <MarketingMetricTile label={T("netProfit")} value={fmtCurr(r.netProfit)} sub={T("netProfitSub")} positive={r.netProfit > 0} accent={r.netProfit > 0 ? "emerald" : "red"} />
            </div>

            {/* Benchmarks Matrix */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  {T("benchmarks")}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  قيمتك: {fmt(userClv)} {mktSym(currency)}
                </span>
              </div>
              <div className="space-y-2">
                {INDUSTRY_BENCHMARKS.map((b) => {
                  const bVal = b.value * rate;
                  const isAbove = userClv >= bVal;
                  return (
                    <div key={b.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{T(b.key)}</span>
                        <span className={`font-mono font-medium ${isAbove ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {fmt(bVal)} {mktSym(currency)}
                          {userClv > 0 && <span className="mr-1">{isAbove ? "↑" : "↓"}</span>}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-border rounded-full"
                          style={{ width: `${Math.min(100, (bVal / maxBenchmark) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What-If Action Buttons & Table */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">{T("quickActions")}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(whatIfResults) as WhatIfAction[]).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setActiveAction(activeAction === action ? null : action)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      activeAction === action
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {whatIfResults[action].label}
                  </button>
                ))}
              </div>

              {activeAction && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5 mt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-primary/10">
                    <span className="text-xs font-bold text-primary">تأثير السيناريو</span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                  {(() => {
                    const wa = whatIfResults[activeAction];
                    return (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between py-0.5 border-b border-border/50">
                          <span className="text-muted-foreground">{T("grossClv")}</span>
                          <span className="font-mono font-bold text-foreground">
                            {fmtCurr(r.grossClv)} → {fmtCurr(wa.res.grossClv)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/50">
                          <span className="text-muted-foreground">{T("netClv")}</span>
                          <span className="font-mono font-bold text-foreground">
                            {fmtCurr(r.netClv)} → {fmtCurr(wa.res.netClv)}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-muted-foreground">{T("clvCacRatio")}</span>
                          <span className="font-mono font-bold text-emerald-500">
                            {fmt1(r.clvCacRatio)}:1 → {fmt1(wa.res.clvCacRatio)}:1
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
