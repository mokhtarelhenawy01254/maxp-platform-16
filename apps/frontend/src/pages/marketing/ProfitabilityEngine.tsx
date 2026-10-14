/**
 * 📊 E-Commerce Profitability Engine
 *
 * محرك الربحية الشامل وتحليل هوامش التجارة الإلكترونية ونفقات الإعلانات
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  BarChart3,
  Sliders,
  DollarSign,
  Package,
  Sparkles,
  ShieldCheck,
  Scale,
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
  aov: number;
  ordersPerDay: number;
  confirmationRate: number;
  deliveryRate: number;
  cogs: number;
  packingFees: number;
  shippingFees: number;
  rtoFees: number;
  fixedCosts: number;
  cpp: number;
  piecesPerOrder: number;
}

export interface Results {
  monthlyOrdersPlaced: number;
  ordersConfirmed: number;
  ordersDelivered: number;
  ordersRTO: number;
  revenue: number;
  variableCostDelivered: number;
  variableCostRTO: number;
  totalVariableCost: number;
  adSpend: number;
  grossProfit: number;
  grossProfitMargin: number;
  fixedCosts: number;
  netProfit: number;
  netProfitMargin: number;
  profitPerOrder: number;
  totalCosts: number;
  contributionPerOrder: number;
  breakEvenOrders: number;
  isAchievable: boolean;
  daysToBreakEven: number;
  bevCAC: number;
  safeCAC: number;
  netBreakEvenCPP: number;
}

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  currency: string;
}

type Profile = "Conservative" | "Balanced" | "Aggressive";

export const PRESETS: Record<Profile, Inputs> = {
  Conservative: { aov: 700, ordersPerDay: 30, confirmationRate: 65, deliveryRate: 75, cogs: 300, packingFees: 30, shippingFees: 70, rtoFees: 45, fixedCosts: 100000, cpp: 150, piecesPerOrder: 1 },
  Balanced: { aov: 900, ordersPerDay: 50, confirmationRate: 70, deliveryRate: 80, cogs: 350, packingFees: 35, shippingFees: 80, rtoFees: 50, fixedCosts: 150000, cpp: 200, piecesPerOrder: 1 },
  Aggressive: { aov: 1200, ordersPerDay: 100, confirmationRate: 75, deliveryRate: 85, cogs: 400, packingFees: 40, shippingFees: 90, rtoFees: 55, fixedCosts: 250000, cpp: 250, piecesPerOrder: 1 },
};

const STORAGE_KEY = "maxp_profitability_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();

export function computeProfitability(inputs: Inputs): Results {
  const { aov, ordersPerDay, confirmationRate, deliveryRate, cogs, packingFees, shippingFees, rtoFees, fixedCosts, cpp, piecesPerOrder } = inputs;
  const cr = confirmationRate / 100;
  const dr = deliveryRate / 100;
  const monthlyOrdersPlaced = ordersPerDay * 30;
  const ordersConfirmed = monthlyOrdersPlaced * cr;
  const ordersDelivered = ordersConfirmed * dr;
  const ordersRTO = ordersConfirmed - ordersDelivered;
  const revenue = ordersDelivered * aov;
  const costPerDelivered = (cogs + packingFees) * piecesPerOrder + shippingFees;
  const rtoUnitCost = packingFees * piecesPerOrder + rtoFees;
  const variableCostDelivered = ordersDelivered * costPerDelivered;
  const variableCostRTO = ordersRTO * rtoUnitCost;
  const totalVariableCost = variableCostDelivered + variableCostRTO;
  const adSpend = monthlyOrdersPlaced * cpp;
  const grossProfit = revenue - totalVariableCost - adSpend;
  const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = grossProfit - fixedCosts;
  const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const profitPerOrder = ordersDelivered > 0 ? netProfit / ordersDelivered : 0;
  const totalCosts = totalVariableCost + adSpend + fixedCosts;
  const contributionPerOrder = monthlyOrdersPlaced > 0 ? grossProfit / monthlyOrdersPlaced : 0;
  const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil(fixedCosts / contributionPerOrder) : Infinity;
  const isAchievable = isFinite(breakEvenOrders) && breakEvenOrders <= monthlyOrdersPlaced * 3;
  const daysToBreakEven = ordersPerDay > 0 && isFinite(breakEvenOrders) ? Math.ceil(breakEvenOrders / ordersPerDay) : Infinity;
  const bevCAC = monthlyOrdersPlaced > 0 ? grossProfit / monthlyOrdersPlaced : 0;
  const safeCAC = bevCAC * 0.8;
  const netBreakEvenCPP = monthlyOrdersPlaced > 0 ? (revenue - totalVariableCost - fixedCosts) / monthlyOrdersPlaced : bevCAC;

  return {
    monthlyOrdersPlaced,
    ordersConfirmed,
    ordersDelivered,
    ordersRTO,
    revenue,
    variableCostDelivered,
    variableCostRTO,
    totalVariableCost,
    adSpend,
    grossProfit,
    grossProfitMargin,
    fixedCosts,
    netProfit,
    netProfitMargin,
    profitPerOrder,
    totalCosts,
    contributionPerOrder,
    breakEvenOrders,
    isAchievable,
    daysToBreakEven,
    bevCAC,
    safeCAC,
    netBreakEvenCPP,
  };
}

export default function ProfitabilityEngine() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...PRESETS.Balanced });
  const [activeProfile, setActiveProfile] = useState<Profile>("Balanced");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeWhatIf, setActiveWhatIf] = useState<string | null>(null);

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

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) =>
      `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const results = useMemo(() => computeProfitability(inputs), [inputs]);
  const T = useCallback((k: string) => t(`profitabilityEngine.${k}`), [t]);

  const whatIfSimulations = useMemo(() => {
    return {
      boostAov: { label: "+15% متوسط الطلب", res: computeProfitability({ ...inputs, aov: Math.round(inputs.aov * 1.15) }) },
      cutCpp: { label: "-20% تكلفة الشراء (CPP)", res: computeProfitability({ ...inputs, cpp: Math.round(inputs.cpp * 0.8) }) },
      improveDelivery: { label: "+10% نسبة التسليم", res: computeProfitability({ ...inputs, deliveryRate: Math.min(100, inputs.deliveryRate + 10) }) },
    };
  }, [inputs]);

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (results.netProfit <= 0) {
      M.push({ type: "error", title: "تحذير خسارة صافية", msg: T("alertLoss") || "المشروع يتكبد خسائر شهرية في ظل المعطيات الحالية." });
    }
    if (inputs.cpp > results.safeCAC) {
      M.push({ type: "warn", title: "مخاطرة تكلفة الشراء", msg: `تكلفة الشراء الحالية (${fmtCurr(inputs.cpp)}) تتجاوز الحد الآمن (${fmtCurr(results.safeCAC)}).` });
    }
    if (results.netProfit > 0 && results.netProfitMargin >= 12) {
      M.push({ type: "success", title: "أداء تجاري ممتاز", msg: `المشروع يحقق صافي ربح ${results.netProfitMargin.toFixed(1)}% بعد خصم كافة التكاليف التشغيلية والإعلانات.` });
    }
    return M;
  }, [results, inputs.cpp, T, fmtCurr]);

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
            <BarChart3 className="w-5 h-5" />
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

      {/* Control bar: Profile Presets & Scenarios */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-xl">
        <MarketingPresetBar
          presets={["Conservative", "Balanced", "Aggressive"] as Profile[]}
          current={activeProfile}
          onSelect={(p) => { setActiveProfile(p); setInputs({ ...PRESETS[p] }); }}
          labels={{ Conservative: "متحفظ", Balanced: "متوازن", Aggressive: "توسعي" }}
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
            { label: T("netProfit"), value: fmtCurr(results.netProfit), sub: `هامش: ${results.netProfitMargin.toFixed(1)}%`, color: results.netProfit >= 0 ? "emerald" : "rose" },
            { label: T("grossProfit"), value: fmtCurr(results.grossProfit), sub: `هامش: ${results.grossProfitMargin.toFixed(1)}%`, color: "primary" },
            { label: "أعلى تكلفة شراء (BEV CPP)", value: fmtCurr(results.netBreakEvenCPP), sub: `آمن: ${fmtCurr(results.safeCAC)}`, color: inputs.cpp <= results.safeCAC ? "emerald" : "amber" },
            { label: "إيراد شهري متوقع", value: fmtCurr(results.revenue), sub: `${fmt(results.ordersDelivered)} طلب مستلم`, color: "purple" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/70">
              <Sliders className="w-4 h-4 text-primary" />
              مدخلات التشغيل والإعلانات
            </span>

            <SliderInput currencySymbol={mktSym(currency)} label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
            <SliderInput label={T("ordersPerDay")} value={inputs.ordersPerDay} min={1} max={500} step={1} onChange={set("ordersPerDay")} suffix=" طلب/يوم" />
            <SliderInput currencySymbol={mktSym(currency)} label={T("confirmationRate")} value={inputs.confirmationRate} min={30} max={100} step={5} isPercent onChange={set("confirmationRate")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("deliveryRate")} value={inputs.deliveryRate} min={20} max={100} step={5} isPercent onChange={set("deliveryRate")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("cogs")} value={inputs.cogs} min={10} max={2000} step={10} onChange={set("cogs")} />
            <SliderInput currencySymbol={mktSym(currency)} label="تكلفة الإعلان لكل طلب (CPP)" value={inputs.cpp} min={10} max={1000} step={5} onChange={set("cpp")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("fixedCosts")} value={inputs.fixedCosts} min={0} max={1000000} step={5000} onChange={set("fixedCosts")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("netProfit")} value={fmtCurr(results.netProfit)} sub={`هامش: ${results.netProfitMargin.toFixed(1)}%`} positive={results.netProfit >= 0} accent={results.netProfit >= 0 ? "emerald" : "red"} />
              <MarketingMetricTile label={T("grossProfit")} value={fmtCurr(results.grossProfit)} sub="بعد الإعلانات" accent="blue" />
              <MarketingMetricTile label="الإنفاق الإعلاني" value={fmtCurr(results.adSpend)} sub={`طلبات: ${fmt(results.monthlyOrdersPlaced)}`} accent="purple" />
              <MarketingMetricTile label="ربح كل طلب مسلّم" value={fmtCurr(results.profitPerOrder)} sub="صافي ربح حقيقي" positive={results.profitPerOrder >= 0} accent={results.profitPerOrder >= 0 ? "emerald" : "red"} />
            </div>

            {/* Financial Waterfall Summary Table */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  تحليل تدفق الإيرادات والأرباح
                </span>
                <span className={`text-xs font-mono font-bold ${results.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  الصافي: {fmtCurr(results.netProfit)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("revenue")} ({fmt(results.ordersDelivered)} طلب)</span>
                  <span className="font-mono font-bold text-foreground">{fmtCurr(results.revenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("totalVariableCost")} (بضاعة + شحن + مرتجعات)</span>
                  <span className="font-mono text-rose-500">- {fmtCurr(results.totalVariableCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("adSpend")} ({fmtCurr(inputs.cpp)} / طلب)</span>
                  <span className="font-mono text-rose-500">- {fmtCurr(results.adSpend)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50 font-semibold">
                  <span className="text-foreground">{T("grossProfit")}</span>
                  <span className="font-mono text-primary">{fmtCurr(results.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("fixedCosts")} (مصاريف تشغيل شهرية)</span>
                  <span className="font-mono text-rose-500">- {fmtCurr(inputs.fixedCosts)}</span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-sm font-bold border-t border-border">
                  <span className="text-foreground">{T("netProfit")}</span>
                  <span className={`font-mono ${results.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {fmtCurr(results.netProfit)} ({results.netProfitMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* What-If Simulation Controls */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(whatIfSimulations).map(([key, item]) => {
                  const delta = item.res.netProfit - results.netProfit;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveWhatIf(activeWhatIf === key ? null : key)}
                      className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                        activeWhatIf === key ? "bg-primary/5 border-primary ring-1 ring-primary text-foreground" : "bg-card border-border/70 hover:bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                        <span className={`text-[11px] font-mono font-bold ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {delta >= 0 ? "+" : ""}{fmtCurr(delta)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">أثر صافي الربح الشهري</span>
                    </button>
                  );
                })}
              </div>

              {activeWhatIf && (() => {
                const sim = (whatIfSimulations as any)[activeWhatIf];
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 space-y-1 mt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-primary/10">
                      <span className="text-xs font-bold text-primary">مقارنة نتائج المحاكاة</span>
                      <button type="button" onClick={() => setActiveWhatIf(null)} className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer">إلغاء</button>
                    </div>
                    <MarketingWhatIfDeltaRow label="صافي الربح" base={fmtCurr(results.netProfit)} projected={fmtCurr(sim.res.netProfit)} positive={sim.res.netProfit >= results.netProfit} />
                    <MarketingWhatIfDeltaRow label="هامش الربح الصافي" base={`${results.netProfitMargin.toFixed(1)}%`} projected={`${sim.res.netProfitMargin.toFixed(1)}%`} positive={sim.res.netProfitMargin >= results.netProfitMargin} />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
