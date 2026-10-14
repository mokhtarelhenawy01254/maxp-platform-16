/**
 * 📊 Ad Budget & ROAS Strategic Planner
 *
 * مخطط الميزانية الإعلانية والعائد المستهدف
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
  TrendingUp,
  Sliders,
  Sparkles,
  Rocket,
  Target,
} from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import {
  MarketingTelemetryRibbon,
  MarketingMetricTile,
  MarketingPresetBar,
  MarketingScenarioBar,
  MarketingAlertBanner,
  MarketingWhatIfButton,
  MarketingWhatIfDeltaRow,
} from "./MarketingCalculatorComponents";
import {
  AdBudgetInputs as Inputs,
  AdBudgetResults as Results,
  computeAdBudget as compute,
  AD_BUDGET_PRESETS,
  MKT_CURRENCIES,
  MKT_CURRENCY_RATES,
  mktSym,
} from "./marketingMath";

export { compute };
export type { Inputs, Results };

type Preset = "starter" | "growth" | "scale";
type InputMode = "cpp" | "budget";

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  mode: InputMode;
  currency: string;
}

type WhatIfAction = "raiseRoas" | "doubleCap" | "improveConv";

const DEFAULTS: Inputs = { ...AD_BUDGET_PRESETS.growth };
const STORAGE_KEY = "maxp_ad_budget_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();

export default function AdBudgetPlanner() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("growth");
  const [inputMode, setInputMode] = useState<InputMode>("cpp");
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

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setInputs({ ...AD_BUDGET_PRESETS[p] });
  };

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) => `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const T = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const key = `adBudgetPlanner.${k}`;
      return vars ? t(key, vars) : t(key);
    },
    [t],
  );

  const r = useMemo(() => compute(inputs, inputMode), [inputs, inputMode]);

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
      M.push({ type: "success", title: T("healthyCpp"), msg: T("healthyCppMsg", { cpp: fmt(inputs.cpp * rate), sym: mktSym(currency), pct: Math.round(Math.abs(cppDiff)), allowable: fmt(allowableCpo * rate) }) });
    } else if (cppDiff > 10) {
      M.push({ type: "error", title: T("criticalCpp"), msg: T("criticalCppMsg", { actual: fmt(r.costPerOrder * rate), sym: mktSym(currency), target: fmt(inputs.cpp * rate) }) });
    }

    return M;
  }, [r, inputs, currency, rate, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, mode: inputMode, currency }]);
    setScenarioName("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calculator className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{T("title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{T("desc")}</p>
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
          presets={["starter", "growth", "scale"] as Preset[]}
          current={preset}
          onSelect={applyPreset}
          labels={{ starter: T("presetStarter"), growth: T("presetGrowth"), scale: T("presetScale") }}
        />
        <MarketingScenarioBar
          saved={saved}
          scenarioName={scenarioName}
          setScenarioName={setScenarioName}
          onSave={saveScenario}
          onLoad={(s) => { setInputs({ ...s.inputs }); setInputMode(s.mode); setCurrency(s.currency); }}
          onDelete={(id) => persist(saved.filter((s) => s.id !== id))}
          savePlaceholder={T("scenarioNamePlaceholder")}
          saveLabel={T("save")}
        />
      </div>

      <MarketingAlertBanner alerts={alerts} />

      {/* Single Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <MarketingTelemetryRibbon
          items={[
            { label: T("monthlyBudget"), value: fmtCurr(r.monthlyBudget), sub: `يومي: ${fmtCurr(r.dailySpend)}`, color: "primary" },
            { label: T("expectedRevenue"), value: fmtCurr(r.expectedRevenue), sub: `صافي: ${fmtCurr(r.profitAfterAds)}`, color: "emerald" },
            { label: T("actualRoas"), value: `${r.actualRoas.toFixed(1)}x`, sub: `هدف: ${inputs.targetRoas}x`, color: r.actualRoas >= 3 ? "emerald" : "amber" },
            { label: T("expectedOrders"), value: `${fmt(r.expectedOrders)} طلب`, sub: `تكلفة: ${fmtCurr(r.costPerOrder)}`, color: "purple" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                {T("campaignInputs")}
              </span>
              <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setInputMode("cpp")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    inputMode === "cpp" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {T("cppMode")}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("budget")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    inputMode === "budget" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {T("budgetMode")}
                </button>
              </div>
            </div>

            <SliderInput currencySymbol={mktSym(currency)} label={T("targetRevenue")} value={inputs.targetRevenue} min={10000} max={10000000} step={5000} onChange={set("targetRevenue")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("aov")} value={inputs.aov} min={100} max={5000} step={10} onChange={set("aov")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("targetRoas")} value={inputs.targetRoas} min={1} max={15} step={0.5} onChange={set("targetRoas")} suffix="x" />

            {inputMode === "cpp" ? (
              <SliderInput currencySymbol={mktSym(currency)} label={T("cpp")} value={inputs.cpp} min={10} max={1000} step={5} onChange={set("cpp")} />
            ) : (
              <SliderInput currencySymbol={mktSym(currency)} label={T("totalBudget")} value={inputs.totalBudget} min={1000} max={1000000} step={1000} onChange={set("totalBudget")} />
            )}

            <SliderInput currencySymbol={mktSym(currency)} label={T("convRate")} value={inputs.convRate} min={0.5} max={15} step={0.5} isPercent onChange={set("convRate")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("dailyCap")} value={inputs.dailyCap} min={500} max={100000} step={500} onChange={set("dailyCap")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("monthlyBudget")} value={fmtCurr(r.monthlyBudget)} sub={T("monthlyBudgetSub")} accent="blue" />
              <MarketingMetricTile label={T("dailySpend")} value={fmtCurr(r.dailySpend)} sub={T("dailySpendSub")} positive={r.dailySpend <= inputs.dailyCap} accent="purple" />
              <MarketingMetricTile label={T("expectedOrders")} value={fmt(r.expectedOrders)} sub={T("expectedOrdersSub")} accent="gray" />
              <MarketingMetricTile label={T("costPerOrder")} value={fmtCurr(r.costPerOrder)} sub={T("costPerOrderSub")} positive={r.costPerOrder <= inputs.cpp} accent={r.costPerOrder <= inputs.cpp ? "emerald" : "red"} />
              <MarketingMetricTile label={T("expectedRevenue")} value={fmtCurr(r.expectedRevenue)} sub={T("expectedRevenueSub")} accent="emerald" />
              <MarketingMetricTile label={T("profitAfterAds")} value={fmtCurr(r.profitAfterAds)} sub={T("profitAfterAdsSub")} positive={r.profitAfterAds > 0} accent={r.profitAfterAds > 0 ? "emerald" : "red"} />
              <MarketingMetricTile label={T("actualRoas")} value={`${r.actualRoas.toFixed(1)}x`} sub={T("actualRoasSub")} positive={r.actualRoas >= 2.5} accent={r.actualRoas >= 4 ? "emerald" : "yellow"} />
              <MarketingMetricTile label={T("daysToTarget")} value={`${r.daysToTarget} يوم`} sub={T("daysToTargetSub")} positive={r.daysToTarget <= 30} accent={r.daysToTarget <= 14 ? "emerald" : "yellow"} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  {T("trafficClicks")}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">تحويل: {inputs.convRate}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MarketingMetricTile label={T("clicksNeeded")} value={fmt(r.clicksNeeded)} sub="إجمالي النقرات" accent="blue" />
                <MarketingMetricTile label={T("dailyClicks")} value={fmt(r.dailyClicks)} sub="نقرة يومياً" accent="purple" />
                <MarketingMetricTile label={T("estimatedCpc")} value={fmtCurr(r.estimatedCpc)} sub="تكلفة النقرة" positive={r.estimatedCpc <= 15} accent={r.estimatedCpc <= 10 ? "emerald" : "yellow"} />
                <MarketingMetricTile label={T("cppCpcGap")} value={`${r.cppCpcGap} نقرة`} sub="مضاعف الطلب" accent="gray" />
              </div>
            </div>

            {/* What-If Simulations */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <MarketingWhatIfButton
                  label={T("whatIfRaiseRoas", { target: Math.min(15, inputs.targetRoas + 1) })}
                  icon={TrendingUp}
                  desc={T("whatIfRaiseRoasDesc")}
                  active={activeAction === "raiseRoas"}
                  impact={whatIfAll.raiseRoas.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "raiseRoas" ? null : "raiseRoas")}
                  suffix={T("whatIfRaiseRoasImpact")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfDoubleCap")}
                  icon={Rocket}
                  desc={T("whatIfDoubleCapDesc")}
                  active={activeAction === "doubleCap"}
                  impact={whatIfAll.doubleCap.impact}
                  curr={(v) => `${Math.abs(Math.round(v))} يوم`}
                  onClick={() => setActiveAction(activeAction === "doubleCap" ? null : "doubleCap")}
                  suffix={T("whatIfDoubleCapImpact")}
                  isNegativeBest
                />
                <MarketingWhatIfButton
                  label={T("whatIfImproveConv", { target: Math.min(15, inputs.convRate + 2) })}
                  icon={Target}
                  desc={T("whatIfImproveConvDesc")}
                  active={activeAction === "improveConv"}
                  impact={whatIfAll.improveConv.impact}
                  curr={(v) => `${fmt(Math.round(v))} نقرة`}
                  onClick={() => setActiveAction(activeAction === "improveConv" ? null : "improveConv")}
                  suffix={T("whatIfImproveConvImpact")}
                />
              </div>

              {activeAction && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1 mt-2">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-primary/10">
                    <span className="text-xs font-bold text-primary">مقارنة تأثير السيناريو</span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                    >
                      إعادة ضبط
                    </button>
                  </div>
                  <MarketingWhatIfDeltaRow
                    label={T("monthlyBudget")}
                    base={fmtCurr(r.monthlyBudget)}
                    projected={fmtCurr(whatIfAll[activeAction].result.monthlyBudget)}
                    positive={whatIfAll[activeAction].result.profitAfterAds >= r.profitAfterAds}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("costPerOrder")}
                    base={fmtCurr(r.costPerOrder)}
                    projected={fmtCurr(whatIfAll[activeAction].result.costPerOrder)}
                    positive={whatIfAll[activeAction].result.costPerOrder <= r.costPerOrder}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("profitAfterAds")}
                    base={fmtCurr(r.profitAfterAds)}
                    projected={fmtCurr(whatIfAll[activeAction].result.profitAfterAds)}
                    positive={whatIfAll[activeAction].result.profitAfterAds >= r.profitAfterAds}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
