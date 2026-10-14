import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Info,
  FileText,
  Bookmark,
  Trash2,
  ArrowDown,
  Layers,
} from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import {
  MarketingTelemetryRibbon,
  MarketingChassisCard,
  MarketingPresetBar,
  MarketingMetricTile,
  TelemetryItem,
} from "./MarketingCalculatorComponents";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
type Scenario = "conservative" | "balanced" | "aggressive";

interface Inputs {
  fixedCosts: number;
  aov: number;
  piecesPerOrder: number;
  cogs: number;
  packingFees: number;
  shippingFees: number;
  rtoFees: number;
  cpp: number;
  confirmationRate: number;
  deliveryRate: number;
  ordersPerDay: number;
}

const SCENARIOS: Record<Scenario, Inputs> = {
  conservative: { fixedCosts: 80000, aov: 500, piecesPerOrder: 1, cogs: 250, packingFees: 30, shippingFees: 80, rtoFees: 70, cpp: 250, confirmationRate: 60, deliveryRate: 60, ordersPerDay: 30 },
  balanced: { fixedCosts: 120000, aov: 900, piecesPerOrder: 1, cogs: 350, packingFees: 25, shippingFees: 80, rtoFees: 60, cpp: 200, confirmationRate: 80, deliveryRate: 75, ordersPerDay: 50 },
  aggressive: { fixedCosts: 200000, aov: 1500, piecesPerOrder: 1, cogs: 500, packingFees: 20, shippingFees: 60, rtoFees: 50, cpp: 150, confirmationRate: 85, deliveryRate: 85, ordersPerDay: 100 },
};

const STORAGE_KEY = "maxp_break_even_saved";
interface SavedScenario { name: string; inputs: Inputs; currency: string; }

const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function compute(inputs: Inputs) {
  const { fixedCosts, aov, piecesPerOrder, cogs, packingFees, shippingFees, rtoFees, cpp, confirmationRate, deliveryRate, ordersPerDay } = inputs;
  const cr = confirmationRate / 100, dr = deliveryRate / 100;
  const effectiveDr = cr * dr;
  const costPerDelivered = (cogs + packingFees) * piecesPerOrder + shippingFees;
  const rtoCostPerFail = packingFees * piecesPerOrder + rtoFees;
  const per100 = 100, confirmed = per100 * cr, delivered = confirmed * dr, rto = confirmed - delivered;
  const revenue = delivered * aov;
  const totalDeliveredCost = delivered * costPerDelivered;
  const totalRtoCost = rto * rtoCostPerFail;
  const totalAdSpend = per100 * cpp;
  const opProfit = revenue - totalDeliveredCost - totalRtoCost - totalAdSpend;
  const contributionPerOrder = opProfit / per100;
  const contributionMargin = aov > 0 ? (contributionPerOrder / aov) * 100 : 0;
  const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil(fixedCosts / contributionPerOrder) : Infinity;
  const revenueRequired = breakEvenOrders * aov;
  const effectiveCac = effectiveDr > 0 ? cpp / effectiveDr : Infinity;
  const daysToBe = ordersPerDay > 0 ? Math.ceil(breakEvenOrders / ordersPerDay) : Infinity;
  const deliveredPerDay = ordersPerDay * effectiveDr;
  const monthlyRtoOrders = Math.round(rto * (ordersPerDay * 30) / per100);
  const monthlyRtoImpact = monthlyRtoOrders * rtoCostPerFail;
  return { costPerDelivered, rtoCostPerFail, effectiveDr: effectiveDr * 100, confirmed, delivered, rto, revenue, opProfit, contributionPerOrder, contributionMargin, breakEvenOrders, revenueRequired, effectiveCac, daysToBe, deliveredPerDay, monthlyRtoImpact, monthlyRtoOrders };
}

export default function ProjectBreakEvenCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [activeScenario, setActiveScenario] = useState<Scenario>("balanced");
  const [inputs, setInputs] = useState<Inputs>({ ...SCENARIOS.balanced });
  const [saved, setSaved] = useState<SavedScenario[]>([]);

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const applyScenario = (s: Scenario) => {
    setActiveScenario(s);
    setInputs({ ...SCENARIOS[s] });
  };

  const s = sym(currency);
  const r = useMemo(() => compute(inputs), [inputs]);

  const isProfit = r.contributionPerOrder > 0;
  const marginLevel = r.contributionMargin > 10 ? "good" : r.contributionMargin > 0 ? "marginal" : "loss";
  const dateStr = new Date().toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const dayLabel = r.daysToBe <= 1 ? t("projectBreakEven.day") : t("projectBreakEven.days");
  const timeLabel = isFinite(r.daysToBe) ? `${fmt(r.daysToBe)} ${dayLabel}` : "∞";

  const saveCurrent = () => {
    if (saved.length >= 3) return;
    const name = prompt(t("projectBreakEven.savePrompt")) || `${t("projectBreakEven.scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { name, inputs: { ...inputs }, currency }]);
  };

  const loadSaved = (sc: SavedScenario) => { setInputs({ ...sc.inputs }); setCurrency(sc.currency); };
  const deleteSaved = (i: number) => persist(saved.filter((_, idx) => idx !== i));
  const T = (k: string) => t(`projectBreakEven.${k}`);

  const telemetryItems: TelemetryItem[] = [
    {
      label: T("breakEvenOrders"),
      value: isFinite(r.breakEvenOrders) ? fmt(r.breakEvenOrders) : "∞",
      sub: isFinite(r.breakEvenOrders) ? T("orders") : undefined,
      color: isProfit ? "emerald" : "rose",
    },
    {
      label: T("revenueRequired"),
      value: isFinite(r.revenueRequired) ? `${fmt(r.revenueRequired)} ${s}` : "∞",
      sub: T("revenueRequiredSub"),
      color: "primary",
    },
    {
      label: T("timeToBe"),
      value: timeLabel,
      sub: `${fmt1(r.deliveredPerDay)} ${T("deliveredPerDay")}`,
      color: isFinite(r.daysToBe) && r.daysToBe < 60 ? "emerald" : "amber",
    },
    {
      label: T("profitPerOrder"),
      value: `${fmt(r.contributionPerOrder)} ${s}`,
      sub: `${r.contributionMargin.toFixed(1)}%`,
      color: isProfit ? "emerald" : "rose",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto space-y-4 p-3 sm:p-5">
        {/* Chassis Top Control Bar */}
        <div className="bg-card border border-border/70 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{T("desc")}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-auto border border-border/70 bg-background rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({sym(c)})</option>)}
            </select>
          </div>
        </div>

        {/* Telemetry Ribbon */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <MarketingTelemetryRibbon items={telemetryItems} />

          {/* Action Ribbon: Presets + Saved */}
          <div className="p-3 bg-muted/10 border-t border-border/70 flex flex-wrap gap-2 items-center justify-between">
            <MarketingPresetBar
              presets={["conservative", "balanced", "aggressive"] as Scenario[]}
              current={activeScenario}
              onSelect={applyScenario}
              labels={{
                conservative: T("conservative"),
                balanced: T("balanced"),
                aggressive: T("aggressive"),
              }}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveCurrent}
                disabled={saved.length >= 3}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/70 text-foreground hover:bg-muted/30 disabled:opacity-40 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-primary" />
                {T("save")} ({saved.length}/3)
              </button>
              {saved.map((sc, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted/40 border border-border/70">
                  <button type="button" onClick={() => loadSaved(sc)} className="text-foreground hover:text-primary truncate max-w-24 font-medium">
                    {sc.name}
                  </button>
                  <button type="button" onClick={() => deleteSaved(i)} className="text-muted-foreground hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid: Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MarketingChassisCard title={T("fixedCosts")} icon={<Building2 className="w-4 h-4 text-primary" />}>
            <SliderInput currencySymbol={s} label={T("fixedCostsHint")} value={inputs.fixedCosts} min={0} max={500000} step={1000} onChange={set("fixedCosts")} />
          </MarketingChassisCard>

          <MarketingChassisCard title={T("revenueCosts")} icon={<DollarSign className="w-4 h-4 text-emerald-500" />}>
            <SliderInput currencySymbol={s} label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
            <SliderInput currencySymbol={s} label={T("piecesPerOrder")} value={inputs.piecesPerOrder} min={1} max={20} step={1} onChange={set("piecesPerOrder")} />
            <SliderInput currencySymbol={s} label={T("cogs")} value={inputs.cogs} min={0} max={3000} step={10} onChange={set("cogs")} />
            <SliderInput currencySymbol={s} label={T("packing")} value={inputs.packingFees} min={0} max={200} step={5} onChange={set("packingFees")} />
            <SliderInput currencySymbol={s} label={T("shipping")} value={inputs.shippingFees} min={0} max={500} step={10} onChange={set("shippingFees")} />
            <SliderInput currencySymbol={s} label={T("rtoFee")} value={inputs.rtoFees} min={0} max={300} step={10} onChange={set("rtoFees")} />
          </MarketingChassisCard>

          <MarketingChassisCard title={T("marketing")} icon={<TrendingUp className="w-4 h-4 text-purple-500" />}>
            <SliderInput currencySymbol={s} label={T("cpp")} value={inputs.cpp} min={0} max={1000} step={10} onChange={set("cpp")} />
            <SliderInput currencySymbol={s} label={T("confirmRate")} value={inputs.confirmationRate} min={0} max={100} step={5} isPercent onChange={set("confirmationRate")} />
            <SliderInput currencySymbol={s} label={T("deliveryRate")} value={inputs.deliveryRate} min={0} max={100} step={5} isPercent onChange={set("deliveryRate")} />
            <SliderInput currencySymbol={s} label={T("ordersPerDay")} value={inputs.ordersPerDay} min={1} max={500} step={1} onChange={set("ordersPerDay")} />
          </MarketingChassisCard>
        </div>

        {/* Results Chassis Card */}
        <div className="bg-card border border-border/70 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> {T("results")}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{T("codModel")} • {dateStr}</p>
            </div>
            {marginLevel === "marginal" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="w-3 h-3" /> {T("marginal")}
              </span>
            )}
            {marginLevel === "loss" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle className="w-3 h-3" /> {T("lossBadge")}
              </span>
            )}
          </div>

          {!isProfit && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{T("lossWarning")}</span>
            </div>
          )}

          {/* Secondary Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MarketingMetricTile label={T("profitPerOrder")} value={`${fmt(r.contributionPerOrder)} ${s}`} sub={`${T("margin")} ${r.contributionMargin.toFixed(1)}%`} positive={isProfit} accent="emerald" />
            <MarketingMetricTile label={T("effectiveCac")} value={`${isFinite(r.effectiveCac) ? fmt(r.effectiveCac) : "∞"} ${s}`} sub={T("effectiveCacSub")} positive={r.effectiveCac < inputs.aov} accent="blue" />
            <MarketingMetricTile label={T("costPerDelivered")} value={`${fmt(r.costPerDelivered)} ${s}`} sub={T("costPerDeliveredSub")} positive={r.costPerDelivered < inputs.aov} accent="gray" />
            <MarketingMetricTile label={T("rtoImpact")} value={`${fmt(r.monthlyRtoImpact)} ${s}`} sub={`${T("rtoImpactSub")} ${fmt(r.monthlyRtoOrders)} ${T("returnMonth")}`} positive={false} accent="red" />
          </div>

          {/* Funnel Flow */}
          <div className="bg-muted/10 border border-border/70 rounded-lg p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{T("orderFlow")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-card border border-border/60 rounded-md">
                <div className="text-muted-foreground text-[10px]">{T("placed")}</div>
                <div className="text-sm font-bold font-mono text-foreground mt-0.5">100</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(100 * inputs.cpp)} {s} {T("ads")}</div>
              </div>
              <div className="p-2.5 bg-card border border-border/60 rounded-md">
                <div className="text-muted-foreground text-[10px]">{T("confirmed")} ({inputs.confirmationRate}%)</div>
                <div className="text-sm font-bold font-mono text-primary mt-0.5">{fmt1(r.confirmed)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(100 - r.confirmed)} {T("unconfirmed")}</div>
              </div>
              <div className="p-2.5 bg-card border border-border/60 rounded-md">
                <div className="text-muted-foreground text-[10px]">{T("delivered")} ({inputs.deliveryRate}%)</div>
                <div className="text-sm font-bold font-mono text-emerald-500 mt-0.5">{fmt1(r.delivered)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(r.revenue)} {s} {T("revenue")}</div>
              </div>
              <div className="p-2.5 bg-card border border-border/60 rounded-md">
                <div className="text-muted-foreground text-[10px]">{T("returned")} (RTO)</div>
                <div className="text-sm font-bold font-mono text-rose-500 mt-0.5">{fmt1(r.rto)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(Math.round(r.rto * r.rtoCostPerFail))} {s} {T("loss")}</div>
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="border border-border/70 rounded-lg p-3">
              <h3 className="text-xs font-bold text-foreground mb-2">{T("inputSummary")}</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border/60 font-mono">
                  {[
                    [T("fixedCosts"), `${fmt(inputs.fixedCosts)} ${s}`],
                    [T("aov"), `${fmt(inputs.aov)} ${s}`],
                    [T("piecesPerOrder"), `${fmt(inputs.piecesPerOrder)}`],
                    [T("cpp"), `${fmt(inputs.cpp)} ${s}`],
                    [T("confirmRate"), `${inputs.confirmationRate}%`],
                    [T("deliveryRate"), `${inputs.deliveryRate}%`],
                    [T("effectiveDeliveryRate"), `${r.effectiveDr.toFixed(1)}%`],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-1 text-muted-foreground font-sans">{k}</td>
                      <td className={`py-1 font-semibold text-foreground ${isRtl ? "text-left" : "text-right"}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-border/70 rounded-lg p-3">
              <h3 className="text-xs font-bold text-foreground mb-2">{T("costBreakdown")}</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border/60 font-mono">
                  {[
                    [T("cogs"), `${fmt(inputs.cogs)} ${s}`],
                    [T("packing"), `${fmt(inputs.packingFees)} ${s}`],
                    [T("shipping"), `${fmt(inputs.shippingFees)} ${s}`],
                    [T("rtoFee"), `${fmt(inputs.rtoFees)} ${s}`],
                    [T("costPerDelivered"), `${fmt(r.costPerDelivered)} ${s}`],
                    [T("rtoUnitCost"), `${fmt(r.rtoCostPerFail)} ${s}`],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-1 text-muted-foreground font-sans">{k}</td>
                      <td className={`py-1 font-semibold text-foreground ${isRtl ? "text-left" : "text-right"}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step-by-Step Formula Accordion */}
          <details className="border border-border/70 rounded-lg p-3 text-xs group">
            <summary className="font-semibold text-muted-foreground group-open:text-foreground cursor-pointer flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-primary" />
              {T("stepByStep")}
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-sans">
                    <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>#</th>
                    <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("step")}</th>
                    <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("formula")}</th>
                    <th className={`py-1.5 px-2 ${isRtl ? "text-left" : "text-right"}`}>{T("result")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    [T("costPerDelivered"), T("costPerDeliveredFormula"), `${fmt(r.costPerDelivered)} ${s}`],
                    [T("rtoUnitCost"), T("rtoCostPerFailFormula"), `${fmt(r.rtoCostPerFail)} ${s}`],
                    [T("revenuePer100"), `${fmt1(r.delivered)} × AOV`, `${fmt(r.revenue)} ${s}`],
                    [T("operatingProfit"), "Revenue − Costs − Ad Spend", `${fmt(r.opProfit)} ${s}`],
                    [T("breakEvenCalc"), `${T("fixedCosts")} ÷ Contribution`, `${isFinite(r.breakEvenOrders) ? fmt(r.breakEvenOrders) : "∞"}`],
                    [T("revenueRequiredCalc"), "BE Orders × AOV", `${isFinite(r.revenueRequired) ? fmt(r.revenueRequired) : "∞"} ${s}`],
                  ].map(([step, formula, res], i) => (
                    <tr key={i}>
                      <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-1 px-2 font-medium font-sans text-foreground">{step}</td>
                      <td className="py-1 px-2 text-muted-foreground">{formula}</td>
                      <td className={`py-1 px-2 font-bold text-foreground ${isRtl ? "text-left" : "text-right"}`}>{res}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
