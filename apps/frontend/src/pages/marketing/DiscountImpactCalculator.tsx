/**
 * 📊 Discount Impact & Elasticity Calculator
 *
 * حاسبة أثر الخصومات ومرونة الطلب ونقطة التعادل
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Tag,
  TrendingUp,
  Sliders,
  Sparkles,
  Package,
  Percent,
  ShoppingCart,
  Gift,
  Truck,
  Layers,
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
  DetailedDiscountInputs as Inputs,
  DetailedDiscountResults as Results,
  DiscountTab,
  computeDetailedDiscount as compute,
  DISCOUNT_DEFAULTS as DEFAULTS,
  MKT_CURRENCIES,
  MKT_CURRENCY_RATES,
  mktSym,
} from "./marketingMath";

export { compute };
export type { Inputs, Results, DiscountTab };

type Preset = "small" | "medium" | "flash";
type WhatIfAction = "halfDiscount" | "doubleLift" | "reduceCosts";

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  tab: DiscountTab;
  currency: string;
}

const STORAGE_KEY = "maxp_discount_impact_saved";
const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : "—");
const fmt1 = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "—";

const TABS: { key: DiscountTab; labelKey: string; icon: any }[] = [
  { key: "product", labelKey: "tabProduct", icon: Tag },
  { key: "order", labelKey: "tabOrder", icon: ShoppingCart },
  { key: "bogo", labelKey: "tabBogo", icon: Gift },
  { key: "freeShipping", labelKey: "tabFreeShipping", icon: Truck },
  { key: "quantity", labelKey: "tabQuantity", icon: Layers },
];

export default function DiscountImpactCalculator() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [tab, setTab] = useState<DiscountTab>("product");
  const [preset, setPreset] = useState<Preset>("medium");
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const pMap: Record<Preset, Partial<Inputs>> = {
      small: { discountPct: 10, expectedLift: 30 },
      medium: { discountPct: 20, expectedLift: 50 },
      flash: { discountPct: 40, expectedLift: 100 },
    };
    setInputs((prev) => ({ ...prev, ...pMap[p] }));
  };

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) =>
      `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const T = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const key = `discountImpact.${k}`;
      return vars ? t(key, vars) : t(key);
    },
    [t],
  );

  const r = useMemo(() => compute(inputs, tab), [inputs, tab]);

  const whatIfAll = useMemo(() => {
    const make = (action: WhatIfAction) => {
      const mod = { ...inputs };
      if (action === "halfDiscount") mod.discountPct = Math.round(inputs.discountPct / 2);
      else if (action === "doubleLift") mod.expectedLift = Math.min(300, inputs.expectedLift * 2);
      else if (action === "reduceCosts") {
        if (tab === "order") mod.cogsPerItem = Math.round(inputs.cogsPerItem * 0.9);
        else mod.cogs = Math.round(inputs.cogs * 0.9);
      }
      return compute(mod, tab);
    };
    const half = make("halfDiscount");
    const dbl = make("doubleLift");
    const cost = make("reduceCosts");
    return {
      halfDiscount: { result: half, impact: half.requiredLiftPct - r.requiredLiftPct },
      doubleLift: { result: dbl, impact: dbl.totalProfitAfter - r.totalProfitAfter },
      reduceCosts: { result: cost, impact: cost.profitPerUnitAfter - r.profitPerUnitAfter },
    };
  }, [inputs, tab, r.requiredLiftPct, r.totalProfitAfter, r.profitPerUnitAfter]);

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (!r.isLiftAchievable) {
      M.push({ type: "warn", title: T("alertLiftNotEnough"), msg: T("alertLiftNotEnoughMsg", { required: fmt(r.requiredLiftPct), expected: inputs.expectedLift }) });
    } else {
      M.push({ type: "success", title: T("alertProfitUp"), msg: T("alertProfitUpMsg", { before: fmt(r.totalProfitBefore * rate), sym: mktSym(currency), after: fmt(r.totalProfitAfter * rate), pct: fmt(r.profitChangePct) }) });
    }
    if (r.profitChange < 0) {
      M.push({ type: "error", title: T("alertProfitDown"), msg: T("alertProfitDownMsg", { before: fmt(r.totalProfitBefore * rate), sym: mktSym(currency), after: fmt(r.totalProfitAfter * rate), pct: fmt(Math.abs(r.profitChangePct)) }) });
    }
    if (r.marginAfterPct < 10 && r.marginAfterPct > 0) {
      M.push({ type: "warn", title: T("alertMarginTooLow"), msg: T("alertMarginTooLowMsg", { margin: fmt1(r.marginAfterPct) }) });
    }
    return M;
  }, [r, inputs, currency, rate, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, tab, currency }]);
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

      {/* Control bar: Presets & Scenarios */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-xl">
        <MarketingPresetBar
          presets={["small", "medium", "flash"] as Preset[]}
          current={preset}
          onSelect={applyPreset}
          labels={{ small: T("presetSmall"), medium: T("presetMedium"), flash: T("presetFlash") }}
        />
        <MarketingScenarioBar
          saved={saved}
          scenarioName={scenarioName}
          setScenarioName={setScenarioName}
          onSave={saveScenario}
          onLoad={(s) => { setInputs({ ...s.inputs }); setTab(s.tab); setCurrency(s.currency); }}
          onDelete={(id) => persist(saved.filter((s) => s.id !== id))}
          savePlaceholder={T("scenarioNamePlaceholder")}
          saveLabel={T("save")}
        />
      </div>

      {/* Discount Type Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const isSelected = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {T(tb.labelKey)}
            </button>
          );
        })}
      </div>

      <MarketingAlertBanner alerts={alerts} />

      {/* Single Surface Chassis */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
        <MarketingTelemetryRibbon
          items={[
            { label: T("profitChange"), value: `${r.profitChange >= 0 ? "+" : ""}${fmtCurr(r.profitChange)}`, sub: `نسبة: ${fmt(r.profitChangePct)}%`, color: r.profitChange >= 0 ? "emerald" : "rose" },
            { label: T("requiredLift"), value: `${fmt(r.requiredLiftPct)}%`, sub: `متوقع: ${inputs.expectedLift}%`, color: r.isLiftAchievable ? "emerald" : "amber" },
            { label: T("profitAfter"), value: fmtCurr(r.profitPerUnitAfter), sub: `هامش: ${fmt1(r.marginAfterPct)}%`, color: "primary" },
            { label: "طلبات التعادل", value: `${fmt(r.breakEvenOrders)} طلب`, sub: `حالي: ${fmt(inputs.currentOrders)}`, color: "purple" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/70">
              <Sliders className="w-4 h-4 text-primary" />
              {T("productInputs")}
            </span>

            {tab !== "order" && (
              <SliderInput currencySymbol={mktSym(currency)} label={T("originalPrice")} value={inputs.originalPrice} min={50} max={10000} step={10} onChange={set("originalPrice")} />
            )}
            {tab === "order" && (
              <>
                <SliderInput currencySymbol={mktSym(currency)} label={T("aov")} value={inputs.aov} min={100} max={20000} step={50} onChange={set("aov")} />
                <SliderInput currencySymbol={mktSym(currency)} label={T("cogsPerItem")} value={inputs.cogsPerItem} min={10} max={5000} step={10} onChange={set("cogsPerItem")} />
                <SliderInput currencySymbol={mktSym(currency)} label={T("itemsPerOrder")} value={inputs.itemsPerOrder} min={1} max={20} step={1} onChange={set("itemsPerOrder")} />
              </>
            )}
            {tab !== "order" && (
              <SliderInput currencySymbol={mktSym(currency)} label={T("cogs")} value={inputs.cogs} min={10} max={5000} step={10} onChange={set("cogs")} />
            )}
            {tab !== "order" && (
              <SliderInput currencySymbol={mktSym(currency)} label={T("shipping")} value={inputs.shipping} min={0} max={500} step={5} onChange={set("shipping")} />
            )}
            {tab !== "order" && (
              <SliderInput currencySymbol={mktSym(currency)} label={T("adCost")} value={inputs.adCost} min={0} max={1000} step={10} onChange={set("adCost")} />
            )}
            {tab !== "bogo" && tab !== "freeShipping" && (
              <SliderInput currencySymbol={mktSym(currency)} label={T("discountPct")} value={inputs.discountPct} min={1} max={70} step={1} isPercent onChange={set("discountPct")} />
            )}

            <SliderInput currencySymbol={mktSym(currency)} label={T("currentOrders")} value={inputs.currentOrders} min={10} max={5000} step={10} onChange={set("currentOrders")} suffix=" طلب" />
            <SliderInput currencySymbol={mktSym(currency)} label={T("expectedLift")} value={inputs.expectedLift} min={0} max={300} step={5} isPercent onChange={set("expectedLift")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("priceBefore")} value={fmtCurr(r.priceBefore)} sub="سعر أصلي" accent="blue" />
              <MarketingMetricTile label={T("priceAfter")} value={fmtCurr(r.priceAfter)} sub="بعد الخصم" accent="purple" />
              <MarketingMetricTile label={T("profitBefore")} value={fmtCurr(r.profitPerUnitBefore)} sub={`هامش: ${fmt1(r.marginBeforePct)}%`} positive={r.profitPerUnitBefore > 0} accent="emerald" />
              <MarketingMetricTile label={T("profitAfter")} value={fmtCurr(r.profitPerUnitAfter)} sub={`هامش: ${fmt1(r.marginAfterPct)}%`} positive={r.profitPerUnitAfter > 0} accent={r.profitPerUnitAfter > 0 ? "emerald" : "red"} />
              <MarketingMetricTile label={T("totalProfitBefore")} value={fmtCurr(r.totalProfitBefore)} sub={`طلبات: ${fmt(inputs.currentOrders)}`} accent="emerald" />
              <MarketingMetricTile label={T("totalProfitAfter")} value={fmtCurr(r.totalProfitAfter)} sub={`طلبات: ${fmt(Math.round(inputs.currentOrders * (1 + inputs.expectedLift / 100)))}`} positive={r.totalProfitAfter >= r.totalProfitBefore} accent={r.totalProfitAfter >= r.totalProfitBefore ? "emerald" : "red"} />
              <MarketingMetricTile label={T("profitChange")} value={`${r.profitChange >= 0 ? "+" : ""}${fmtCurr(r.profitChange)}`} sub={`تغير: ${fmt(r.profitChangePct)}%`} positive={r.profitChange >= 0} accent={r.profitChange >= 0 ? "emerald" : "red"} />
              <MarketingMetricTile label={T("requiredLift")} value={`${fmt(r.requiredLiftPct)}%`} sub={`تعادل: ${fmt(r.breakEvenOrders)}`} positive={r.isLiftAchievable} accent={r.isLiftAchievable ? "emerald" : "red"} />
            </div>

            {/* What-If Simulations */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <MarketingWhatIfButton
                  label={T("whatIfHalfDiscount", { target: Math.round(inputs.discountPct / 2) })}
                  icon={Percent}
                  desc={T("whatIfHalfDiscountDesc")}
                  active={activeAction === "halfDiscount"}
                  impact={whatIfAll.halfDiscount.impact}
                  curr={(v) => `${v >= 0 ? "+" : ""}${fmt(Math.round(v))}%`}
                  onClick={() => setActiveAction(activeAction === "halfDiscount" ? null : "halfDiscount")}
                  suffix={T("whatIfHalfDiscountImpact")}
                  isNegativeBest
                />
                <MarketingWhatIfButton
                  label={T("whatIfDoubleLift", { target: Math.min(300, inputs.expectedLift * 2) })}
                  icon={TrendingUp}
                  desc={T("whatIfDoubleLiftDesc")}
                  active={activeAction === "doubleLift"}
                  impact={whatIfAll.doubleLift.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "doubleLift" ? null : "doubleLift")}
                  suffix={T("whatIfDoubleLiftImpact")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfReduceCosts", { target: 10 })}
                  icon={Package}
                  desc={T("whatIfReduceCostsDesc")}
                  active={activeAction === "reduceCosts"}
                  impact={whatIfAll.reduceCosts.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "reduceCosts" ? null : "reduceCosts")}
                  suffix={T("whatIfReduceCostsImpact")}
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
                    label={T("profitBefore")}
                    base={fmtCurr(r.profitPerUnitBefore)}
                    projected={fmtCurr(whatIfAll[activeAction].result.profitPerUnitBefore)}
                    positive={whatIfAll[activeAction].result.totalProfitAfter >= r.totalProfitAfter}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("profitAfter")}
                    base={fmtCurr(r.profitPerUnitAfter)}
                    projected={fmtCurr(whatIfAll[activeAction].result.profitPerUnitAfter)}
                    positive={whatIfAll[activeAction].result.profitPerUnitAfter >= r.profitPerUnitAfter}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("totalProfitAfter")}
                    base={fmtCurr(r.totalProfitAfter)}
                    projected={fmtCurr(whatIfAll[activeAction].result.totalProfitAfter)}
                    positive={whatIfAll[activeAction].result.totalProfitAfter >= r.totalProfitAfter}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("requiredLift")}
                    base={`${fmt(r.requiredLiftPct)}%`}
                    projected={`${fmt(whatIfAll[activeAction].result.requiredLiftPct)}%`}
                    positive={whatIfAll[activeAction].result.requiredLiftPct <= r.requiredLiftPct}
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
