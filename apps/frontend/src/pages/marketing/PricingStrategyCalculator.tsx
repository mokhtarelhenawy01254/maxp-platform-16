/**
 * 📊 Pricing Strategy & Margin Calculator
 *
 * استراتيجية التسعير وهامش الربح وتحليل المنافسين
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Tag,
  TrendingUp,
  Sliders,
  Sparkles,
  ShieldCheck,
  Scale,
  DollarSign,
  Package,
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
  MKT_CURRENCIES,
  MKT_CURRENCY_RATES,
  mktSym,
} from "./marketingMath";

export interface Inputs {
  cogs: number;
  shipping: number;
  packing: number;
  adCost: number;
  commissionPct: number;
  desiredMarginPct: number;
  competitorPrice: number;
}

export interface Results {
  totalDirectCost: number;
  breakEvenPrice: number;
  recommendedPrice: number;
  profitPerUnit: number;
  markupPct: number;
  totalCostPerUnit: number;
  vsCompetitorPct: number;
  isCompetitive: boolean;
}

export type TicketTier = "low" | "mid" | "high";
type WhatIfAction = "marginUp" | "cogsDown10" | "adEfficiency";

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  currency: string;
}

export const TIER_PRESETS: Record<TicketTier, Inputs> = {
  low: { cogs: 50, shipping: 25, packing: 10, adCost: 40, commissionPct: 10, desiredMarginPct: 30, competitorPrice: 150 },
  mid: { cogs: 350, shipping: 70, packing: 25, adCost: 150, commissionPct: 5, desiredMarginPct: 30, competitorPrice: 900 },
  high: { cogs: 2000, shipping: 150, packing: 50, adCost: 500, commissionPct: 3, desiredMarginPct: 40, competitorPrice: 5000 },
};

const DEFAULTS: Inputs = { ...TIER_PRESETS.mid };
const STORAGE_KEY = "maxp_pricing_strategy_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function compute(inputs: Inputs): Results {
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
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [tier, setTier] = useState<TicketTier>("mid");
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

  const applyTier = (tTier: TicketTier) => {
    setTier(tTier);
    setInputs({ ...TIER_PRESETS[tTier] });
  };

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) =>
      `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const T = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const key = `pricingStrategy.${k}`;
      return vars ? t(key, vars) : t(key);
    },
    [t],
  );

  const r = useMemo(() => compute(inputs), [inputs]);

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

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (r.profitPerUnit <= 0) {
      M.push({ type: "error", title: "تحذير خسارة", msg: T("alertLoss") });
    }
    if (r.vsCompetitorPct > 30) {
      M.push({ type: "warn", title: "سعر مرتفع", msg: T("alertAboveCompetitor", { pct: Math.round(r.vsCompetitorPct) }) });
    }
    if (r.markupPct < 25) {
      M.push({ type: "warn", title: "هامش منخفض", msg: T("alertLowMarkup", { pct: r.markupPct.toFixed(1) }) });
    }
    if (r.profitPerUnit > 0 && r.isCompetitive) {
      M.push({ type: "success", title: "تسعير متوازن", msg: "السعر المقترح يحقق هامش الربح المستهدف ويحافظ على التنافسية السوقية." });
    }
    return M;
  }, [r, inputs, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Tag className="w-5 h-5" />
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

      {/* Control bar: Ticket Tiers & Scenarios */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-xl">
        <MarketingPresetBar
          presets={["low", "mid", "high"] as TicketTier[]}
          current={tier}
          onSelect={applyTier}
          labels={{ low: T("tierLow"), mid: T("tierMid"), high: T("tierHigh") }}
        />
        <MarketingScenarioBar
          saved={saved}
          scenarioName={scenarioName}
          setScenarioName={setScenarioName}
          onSave={saveScenario}
          onLoad={(s) => { setInputs({ ...s.inputs }); setCurrency(s.currency); }}
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
            { label: T("recommendedPrice"), value: fmtCurr(r.recommendedPrice), sub: `هامش: ${inputs.desiredMarginPct}%`, color: "primary" },
            { label: T("breakEvenPrice"), value: fmtCurr(r.breakEvenPrice), sub: "سعر التعادل الأدنى", color: "amber" },
            { label: T("profitPerUnit"), value: fmtCurr(r.profitPerUnit), sub: `مضاعف: ${fmt1(r.markupPct)}%`, color: r.profitPerUnit > 0 ? "emerald" : "rose" },
            { label: "مقارنة بالمنافس", value: `${r.vsCompetitorPct >= 0 ? "+" : ""}${fmt(r.vsCompetitorPct)}%`, sub: fmtCurr(inputs.competitorPrice), color: r.isCompetitive ? "emerald" : "purple" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/70">
              <Sliders className="w-4 h-4 text-primary" />
              مدخلات التكاليف والهامش المستهدف
            </span>

            <SliderInput currencySymbol={mktSym(currency)} label={T("cogs")} value={inputs.cogs} min={10} max={10000} step={10} onChange={set("cogs")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("shipping")} value={inputs.shipping} min={0} max={1000} step={5} onChange={set("shipping")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("packing")} value={inputs.packing} min={0} max={500} step={5} onChange={set("packing")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("adCost")} value={inputs.adCost} min={0} max={3000} step={10} onChange={set("adCost")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("commissionPct")} value={inputs.commissionPct} min={0} max={30} step={0.5} isPercent onChange={set("commissionPct")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("desiredMarginPct")} value={inputs.desiredMarginPct} min={5} max={80} step={1} isPercent onChange={set("desiredMarginPct")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("competitorPrice")} value={inputs.competitorPrice} min={10} max={20000} step={10} onChange={set("competitorPrice")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("recommendedPrice")} value={fmtCurr(r.recommendedPrice)} sub="سعر البيع المقترح" accent="blue" />
              <MarketingMetricTile label={T("breakEvenPrice")} value={fmtCurr(r.breakEvenPrice)} sub="سعر تغطية التكاليف" accent="purple" />
              <MarketingMetricTile label={T("profitPerUnit")} value={fmtCurr(r.profitPerUnit)} sub={`هامش: ${inputs.desiredMarginPct}%`} positive={r.profitPerUnit > 0} accent={r.profitPerUnit > 0 ? "emerald" : "red"} />
              <MarketingMetricTile label="التكلفة المباشرة" value={fmtCurr(r.totalDirectCost)} sub="المنتج + الشحن + الإعلان" accent="gray" />
            </div>

            {/* Competitor Benchmarking Tile */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  موقعك مقابل سعر المنافس
                </span>
                <span className={`text-xs font-mono font-bold ${r.vsCompetitorPct <= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                  {r.vsCompetitorPct >= 0 ? "+" : ""}{fmt(r.vsCompetitorPct)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>سعرك: {fmtCurr(r.recommendedPrice)}</span>
                <span>المنافس: {fmtCurr(inputs.competitorPrice)}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    r.isCompetitive ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.max(10, Math.min(100, (inputs.competitorPrice / Math.max(1, r.recommendedPrice)) * 100))}%`,
                  }}
                />
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
                  label={T("whatIfMarginUp", { target: Math.min(80, inputs.desiredMarginPct + 10) })}
                  icon={TrendingUp}
                  desc={T("whatIfMarginUpDesc")}
                  active={activeAction === "marginUp"}
                  impact={whatIfAll.marginUp.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "marginUp" ? null : "marginUp")}
                  suffix={T("whatIfMarginUpImpact")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfCogsDown10")}
                  icon={Package}
                  desc={T("whatIfCogsDown10Desc")}
                  active={activeAction === "cogsDown10"}
                  impact={whatIfAll.cogsDown10.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "cogsDown10" ? null : "cogsDown10")}
                  suffix={T("whatIfCogsDown10Impact")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfAdEfficiency")}
                  icon={DollarSign}
                  desc={T("whatIfAdEfficiencyDesc")}
                  active={activeAction === "adEfficiency"}
                  impact={whatIfAll.adEfficiency.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "adEfficiency" ? null : "adEfficiency")}
                  suffix={T("whatIfAdEfficiencyImpact")}
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
                    label={T("recommendedPrice")}
                    base={fmtCurr(r.recommendedPrice)}
                    projected={fmtCurr(whatIfAll[activeAction].result.recommendedPrice)}
                    positive={whatIfAll[activeAction].result.profitPerUnit >= r.profitPerUnit}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("profitPerUnit")}
                    base={fmtCurr(r.profitPerUnit)}
                    projected={fmtCurr(whatIfAll[activeAction].result.profitPerUnit)}
                    positive={whatIfAll[activeAction].result.profitPerUnit >= r.profitPerUnit}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("breakEvenPrice")}
                    base={fmtCurr(r.breakEvenPrice)}
                    projected={fmtCurr(whatIfAll[activeAction].result.breakEvenPrice)}
                    positive={whatIfAll[activeAction].result.profitPerUnit >= r.profitPerUnit}
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
