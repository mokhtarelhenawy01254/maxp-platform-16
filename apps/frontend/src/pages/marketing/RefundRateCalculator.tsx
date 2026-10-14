import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Sliders, DollarSign, TrendingDown, RotateCcw, Sparkles, Bookmark, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import { MarketingTelemetryRibbon, MarketingChassisCard, MarketingPresetBar, MarketingMetricTile, MarketingAlertBanner, TelemetryItem } from "./MarketingCalculatorComponents";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type Preset = "low" | "average" | "high";
type WhatIfAction = "reduceRefundRate" | "raiseRestocking" | "reduceShipping" | "improveMargin";

interface Inputs { revenue: number; orders: number; refundRate: number; refundAmount: number; shipping: number; restocking: number; margin: number; }
interface Results { refundedOrders: number; totalRefund: number; shippingCost: number; restockingRecovery: number; netRefundLoss: number; lostProfit: number; effectiveRevenue: number; maxAcceptableRate: number; lossPct: number; }
interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

const PRESETS: Record<Preset, Inputs> = {
  low: { revenue: 500000, orders: 600, refundRate: 5, refundAmount: 500, shipping: 30, restocking: 5, margin: 30 },
  average: { revenue: 500000, orders: 600, refundRate: 10, refundAmount: 700, shipping: 50, restocking: 10, margin: 35 },
  high: { revenue: 500000, orders: 600, refundRate: 20, refundAmount: 900, shipping: 80, restocking: 15, margin: 40 },
};

const DEFAULTS: Inputs = { revenue: 500000, orders: 600, refundRate: 10, refundAmount: 700, shipping: 50, restocking: 10, margin: 35 };
const STORAGE_KEY = "maxp_refund_saved";
const INDUSTRY_BENCHMARKS = [
  { key: "benchmarkFashion", refundRate: 15 }, { key: "benchmarkElectronics", refundRate: 8 },
  { key: "benchmarkHealth", refundRate: 5 }, { key: "benchmarkFood", refundRate: 3 },
  { key: "benchmarkHome", refundRate: 10 }, { key: "benchmarkGeneral", refundRate: 8 },
];

const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
const fmt1 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });
const MAX_ACCEPTABLE_REFUND_REVENUE_SHARE = 0.15;

export const compute = (i: Inputs): Results => {
  const refundedOrders = i.orders * (i.refundRate / 100);
  const totalRefund = refundedOrders * i.refundAmount;
  const shippingCost = refundedOrders * i.shipping;
  const restockingRecovery = totalRefund * (i.restocking / 100);
  const netRefundLoss = totalRefund + shippingCost - restockingRecovery;
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

export default function RefundRateCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState<Preset>("average");
  const [currency, setCurrency] = useState("EGP");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `refundRateCalculator.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);
  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const r = useMemo(() => compute(inputs), [inputs]);

  const whatIfResults = useMemo(() => {
    return {
      reduceRefundRate: { labelKey: "reduceRefundRate", results: compute({ ...inputs, refundRate: 5 }) },
      raiseRestocking: { labelKey: "raiseRestocking", results: compute({ ...inputs, restocking: 15 }) },
      reduceShipping: { labelKey: "reduceShipping", results: compute({ ...inputs, shipping: 25 }) },
      improveMargin: { labelKey: "improveMargin", results: compute({ ...inputs, margin: 50 }) },
    };
  }, [inputs]);

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
    }
    return a;
  }, [inputs, r, T, fmtCurr]);

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

  const telemetryItems: TelemetryItem[] = [
    {
      label: T("refundedOrders"),
      value: fmt(r.refundedOrders),
      sub: `${inputs.refundRate}% of ${fmt(inputs.orders)}`,
      color: r.refundedOrders < 30 ? "emerald" : "amber",
    },
    {
      label: T("totalRefund"),
      value: fmtCurr(r.totalRefund),
      sub: T("totalRefundSub"),
      color: "rose",
    },
    {
      label: T("netRefundLoss"),
      value: fmtCurr(r.netRefundLoss),
      sub: `${fmt1(r.lossPct)}% ${T("revenueLabel")}`,
      color: r.lossPct > 10 ? "rose" : "amber",
    },
    {
      label: T("effectiveRevenue"),
      value: fmtCurr(r.effectiveRevenue),
      sub: T("effectiveRevenueSub"),
      color: "emerald",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto space-y-4 p-3 sm:p-5">
        {/* Top Control Bar */}
        <div className="bg-card border border-border/70 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{T("subtitle")}</p>
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

        {/* Telemetry Ribbon & Presets */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <MarketingTelemetryRibbon items={telemetryItems} />

          <div className="p-3 bg-muted/10 border-t border-border/70 flex flex-wrap gap-2 items-center justify-between">
            <MarketingPresetBar
              presets={["low", "average", "high"] as Preset[]}
              current={preset}
              onSelect={loadPreset}
              labels={{
                low: T("presetLow"),
                average: T("presetAverage"),
                high: T("presetHigh"),
              }}
            />

            <div className="flex items-center gap-1.5">
              <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder={T("scenarioName")} className="w-24 sm:w-28 text-xs bg-background border border-border/70 rounded-lg px-2 py-1 text-foreground" />
              <button type="button" onClick={saveScenario} disabled={saved.length >= 3} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-border/70 text-foreground hover:bg-muted/30 disabled:opacity-40">
                <Bookmark className="w-3 h-3 text-primary" /> {T("saveScenario")}
              </button>
              {saved.map((sc) => (
                <div key={sc.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-muted/40 border border-border/70">
                  <button type="button" onClick={() => loadScenario(sc)} className="text-foreground hover:text-primary truncate max-w-16 font-medium">{sc.name}</button>
                  <button type="button" onClick={() => deleteScenario(sc.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inputs + Results Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Inputs Column */}
          <div className="xl:col-span-2 space-y-4">
            <MarketingChassisCard title={T("calculate")} icon={<Sliders className="w-4 h-4 text-primary" />}>
              <SliderInput label={T("inputRevenue")} value={inputs.revenue} min={10000} max={5000000} step={1000} onChange={set("revenue")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputOrders")} value={inputs.orders} min={10} max={10000} step={10} onChange={set("orders")} suffix="" />
              <SliderInput label={T("inputRefundRate")} value={inputs.refundRate} min={1} max={40} step={1} onChange={set("refundRate")} isPercent />
              <SliderInput label={T("inputRefundAmount")} value={inputs.refundAmount} min={10} max={5000} step={10} onChange={set("refundAmount")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputShipping")} value={inputs.shipping} min={0} max={200} step={5} onChange={set("shipping")} suffix={` ${sym(currency)}`} />
              <SliderInput label={T("inputRestocking")} value={inputs.restocking} min={0} max={30} step={1} onChange={set("restocking")} isPercent />
              <SliderInput label={T("inputMargin")} value={inputs.margin} min={5} max={80} step={1} onChange={set("margin")} isPercent />

              <button
                type="button"
                onClick={() => { setInputs({ ...DEFAULTS }); setActiveAction(null); }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {T("reset")}
              </button>
            </MarketingChassisCard>
          </div>

          {/* Results Column */}
          <div className="xl:col-span-3 space-y-4">
            {/* Metric Tiles Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MarketingMetricTile label={T("shippingCost")} value={fmtCurr(r.shippingCost)} sub={T("shippingCostSub", { count: r.refundedOrders, cost: fmtCurr(inputs.shipping) })} positive={false} accent="red" />
              <MarketingMetricTile label={T("restockingRecovery")} value={fmtCurr(r.restockingRecovery)} sub={T("restockingRecoverySub", { rate: inputs.restocking })} positive accent="emerald" />
              <MarketingMetricTile label={T("lostProfit")} value={fmtCurr(r.lostProfit)} sub={T("netRefundLossSub")} positive={false} accent="yellow" />
              <MarketingMetricTile label={T("maxAcceptableRate")} value={`${fmt1(r.maxAcceptableRate)}%`} sub={T("maxAcceptableRateSub")} positive={inputs.refundRate <= r.maxAcceptableRate} accent={inputs.refundRate <= r.maxAcceptableRate ? "emerald" : "red"} />
            </div>

            {/* Loss Breakdown Bar */}
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{T("lossChart")}</h3>
              <div className="space-y-2">
                {[
                  { label: T("chartRefund"), val: fmtCurr(r.totalRefund), raw: r.totalRefund, color: "bg-rose-500" },
                  { label: T("chartShipping"), val: fmtCurr(r.shippingCost), raw: r.shippingCost, color: "bg-amber-500" },
                  { label: T("chartRestocking"), val: `-${fmtCurr(r.restockingRecovery)}`, raw: r.restockingRecovery, color: "bg-emerald-500" },
                  { label: T("chartNetLoss"), val: fmtCurr(r.netRefundLoss), raw: r.netRefundLoss, color: "bg-primary" },
                ].map((row, i) => {
                  const maxV = Math.max(r.totalRefund, r.shippingCost, r.netRefundLoss, 1);
                  const pct = Math.min(100, Math.max(4, (row.raw / maxV) * 100));
                  return (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-24 text-muted-foreground truncate">{row.label}</span>
                      <div className="flex-1 h-3.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-24 text-right font-mono font-bold text-foreground">{row.val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Benchmarks & Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs">
                <h3 className="text-xs font-bold text-foreground mb-2">{T("benchmarks")}</h3>
                <table className="w-full text-xs font-mono">
                  <tbody className="divide-y divide-border/60">
                    {INDUSTRY_BENCHMARKS.map((b) => {
                      const ok = inputs.refundRate <= b.refundRate;
                      return (
                        <tr key={b.key} className="py-1">
                          <td className="py-1 text-muted-foreground font-sans">{T(b.key)}</td>
                          <td className="py-1 text-center font-bold text-foreground">{b.refundRate}%</td>
                          <td className="py-1 text-right">
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${ok ? "text-emerald-500" : "text-rose-500"}`}>
                              {ok ? T("belowAvg") : T("aboveAvg")}
                              {ok ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-foreground mb-2">{T("alerts")}</h3>
                <MarketingAlertBanner alerts={alerts} />
              </div>
            </div>

            {/* What-If Quick Actions */}
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{T("quickActions")}</h3>
                <span className="text-[10px] text-muted-foreground">What-If Simulation</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(whatIfResults) as WhatIfAction[]).map((action) => {
                  const isActive = activeAction === action;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setActiveAction(isActive ? null : action)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary/20"
                          : "bg-muted/20 border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {T(whatIfResults[action].labelKey)}
                    </button>
                  );
                })}
              </div>

              {activeAction && (() => {
                const wa = whatIfResults[activeAction];
                return (
                  <div className="mt-2 border-t border-border/70 pt-2 space-y-1 text-xs font-mono">
                    {[
                      { label: T("netRefundLoss"), curr: fmtCurr(r.netRefundLoss), next: fmtCurr(wa.results.netRefundLoss), pos: wa.results.netRefundLoss <= r.netRefundLoss },
                      { label: T("effectiveRevenue"), curr: fmtCurr(r.effectiveRevenue), next: fmtCurr(wa.results.effectiveRevenue), pos: wa.results.effectiveRevenue >= r.effectiveRevenue },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5">
                        <span className="font-sans text-foreground text-xs">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{row.curr}</span>
                          <span className="font-bold text-foreground">{row.next}</span>
                          <span className={`text-[10px] font-bold ${row.pos ? "text-emerald-500" : "text-rose-500"}`}>{row.pos ? "Optimal" : "Higher"}</span>
                        </div>
                      </div>
                    ))}
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
