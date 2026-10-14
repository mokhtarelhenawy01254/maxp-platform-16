import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowRight,
} from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import {
  MarketingTelemetryRibbon,
  MarketingChassisCard,
  MarketingMetricTile,
  TelemetryItem,
} from "./MarketingCalculatorComponents";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;
const MAX_COURIERS = 5;
const MIN_COURIERS = 2;

interface CourierInput {
  name: string;
  deliveryCost: number;
  rtoCost: number;
  deliveryRate: number;
  extraFees: number;
  codPct: number;
}

interface CourierResult extends CourierInput {
  deliveredOrders: number;
  failedOrders: number;
  shippingCost: number;
  rtoCostTotal: number;
  codCost: number;
  extraFeesTotal: number;
  total: number;
  costPerDelivered: number;
}

function computeCourier(c: CourierInput, aov: number, orders: number): CourierResult {
  const deliveredOrders = orders * (c.deliveryRate / 100);
  const failedOrders = orders - deliveredOrders;
  const shippingCost = orders * c.deliveryCost;
  const rtoCostTotal = failedOrders * c.rtoCost;
  const codCost = deliveredOrders * aov * (c.codPct / 100);
  const extraFeesTotal = orders * c.extraFees;
  const total = shippingCost + rtoCostTotal + codCost + extraFeesTotal;
  const costPerDelivered = deliveredOrders > 0 ? total / deliveredOrders : 0;
  return { ...c, deliveredOrders, failedOrders, shippingCost, rtoCostTotal, codCost, extraFeesTotal, total, costPerDelivered };
}

const defaultCourier = (label: string): CourierInput => ({
  name: label,
  deliveryCost: label === "A" ? 50 : 70,
  rtoCost: label === "A" ? 35 : 40,
  deliveryRate: label === "A" ? 70 : 85,
  extraFees: 0,
  codPct: 1.5,
});

export default function ShippingOptimizer() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [aov, setAov] = useState(800);
  const [orders, setOrders] = useState(300);
  const [couriers, setCouriers] = useState<CourierInput[]>([
    defaultCourier("A"),
    defaultCourier("B"),
  ]);

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);
  const fmt = (n: number) => Math.round(n).toLocaleString();

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `shippingOptimizer.${k}`;
    return vars ? t(key, vars as any) : t(key);
  }, [t]);

  const results = useMemo(() => couriers.map((c) => computeCourier(c, aov, orders)), [couriers, aov, orders]);
  const best = useMemo(() => (results.length ? results.reduce((a, b) => (a.total < b.total ? a : b)) : null), [results]);
  const worst = useMemo(() => (results.length ? results.reduce((a, b) => (a.total > b.total ? a : b)) : null), [results]);
  const sortedResults = useMemo(() => [...results].sort((a, b) => a.total - b.total), [results]);

  const updateCourier = (idx: number, field: keyof CourierInput, value: number) => {
    setCouriers((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const addCourier = () => {
    if (couriers.length >= MAX_COURIERS) return;
    const nextLabel = String.fromCharCode(65 + couriers.length);
    setCouriers((prev) => [...prev, defaultCourier(nextLabel)]);
  };

  const removeCourier = (idx: number) => {
    if (couriers.length <= MIN_COURIERS) return;
    setCouriers((prev) => prev.filter((_, i) => i !== idx));
  };

  const winSavings = best && worst && best.name !== worst.name ? worst.total - best.total : 0;

  const telemetryItems: TelemetryItem[] = [
    {
      label: T("verdict"),
      value: best ? `${T("courier")} ${best.name}` : "—",
      sub: best ? `${best.deliveryRate}% delivery` : undefined,
      color: "emerald",
    },
    {
      label: T("totalPerMonth"),
      value: best ? fmtCurr(Math.round(best.total)) : "—",
      sub: best ? `${fmtCurr(Math.round(best.costPerDelivered))} / order` : undefined,
      color: "primary",
    },
    {
      label: "Monthly Savings",
      value: fmtCurr(winSavings),
      sub: `vs ${worst?.name || "B"}`,
      color: winSavings > 0 ? "emerald" : "muted",
    },
    {
      label: "Annual Impact",
      value: fmtCurr(winSavings * 12),
      sub: "12 months forecast",
      color: winSavings > 0 ? "emerald" : "muted",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto space-y-4 p-3 sm:p-5">
        {/* Top Control Bar */}
        <div className="bg-card border border-border/70 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary shrink-0" />
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
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Settings & Couriers */}
          <div className="xl:col-span-2 space-y-4">
            <MarketingChassisCard title={T("storeSettings")} icon={<DollarSign className="w-4 h-4 text-primary" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("aov")} value={aov} min={100} max={10000} step={100} onChange={(e) => setAov(parseFloat(e.target.value))} />
              <SliderInput currencySymbol="" label={T("ordersPerMonth")} value={orders} min={10} max={10000} step={10} onChange={(e) => setOrders(parseFloat(e.target.value))} suffix=" orders" />
            </MarketingChassisCard>

            <MarketingChassisCard
              title={`${T("couriers")} (${couriers.length}/${MAX_COURIERS})`}
              icon={<Truck className="w-4 h-4 text-primary" />}
              badge={
                couriers.length < MAX_COURIERS ? (
                  <button
                    type="button"
                    onClick={addCourier}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-md border border-primary/20"
                  >
                    <Plus className="w-3 h-3" /> {T("addCourier")}
                  </button>
                ) : undefined
              }
            >
              <div className="space-y-3">
                {couriers.map((c, idx) => (
                  <div key={idx} className="border border-border/70 rounded-lg p-3 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <h3 className="text-xs font-bold text-foreground">{T("courier")} {c.name}</h3>
                      {couriers.length > MIN_COURIERS && (
                        <button type="button" onClick={() => removeCourier(idx)} className="text-muted-foreground hover:text-rose-500 text-xs flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <SliderInput currencySymbol={sym(currency)} label={T("deliveryCost")} value={c.deliveryCost} min={0} max={500} step={5} onChange={(e) => updateCourier(idx, "deliveryCost", parseFloat(e.target.value))} />
                    <SliderInput currencySymbol={sym(currency)} label={T("rtoCost")} value={c.rtoCost} min={0} max={500} step={5} onChange={(e) => updateCourier(idx, "rtoCost", parseFloat(e.target.value))} />
                    <SliderInput currencySymbol="" label={T("deliveryRate")} value={c.deliveryRate} min={30} max={100} step={1} isPercent onChange={(e) => updateCourier(idx, "deliveryRate", parseFloat(e.target.value))} />
                    <SliderInput currencySymbol={sym(currency)} label={T("extraFees")} value={c.extraFees} min={0} max={200} step={5} onChange={(e) => updateCourier(idx, "extraFees", parseFloat(e.target.value))} />
                    <SliderInput currencySymbol="" label={T("codCommission")} value={c.codPct} min={0} max={10} step={0.5} isPercent onChange={(e) => updateCourier(idx, "codPct", parseFloat(e.target.value))} />
                  </div>
                ))}
              </div>
            </MarketingChassisCard>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4">
            {/* Winner Spotlight Banner */}
            {best && worst && best.name !== worst.name && (
              <div className="bg-card border border-emerald-500/30 rounded-xl p-4 shadow-xs flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {T("courier")} {best.name} {T("wins", { amount: fmtCurr(winSavings) })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {T("savingsPerYear", { amount: fmtCurr(winSavings * 12) })}
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-primary" /> {T("comparisonTable")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground font-sans">
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("courier")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("deliveryPct")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("costPerDelivered")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("shipping")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("rto")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-right" : "text-left"}`}>{T("cod")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-left" : "text-right"}`}>{T("totalPerMonth")}</th>
                      <th className={`py-1.5 px-2 ${isRtl ? "text-left" : "text-right"}`}>{T("verdict")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedResults.map((r) => {
                      const isBest = best && r.name === best.name;
                      const isWorst = worst && r.name === worst.name;
                      return (
                        <tr key={r.name} className={`hover:bg-muted/20 ${isBest ? "bg-emerald-500/5" : isWorst ? "bg-rose-500/5" : ""}`}>
                          <td className="py-2 px-2 font-bold font-sans text-foreground">{T("courier")} {r.name}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmt(r.deliveryRate)}%</td>
                          <td className="py-2 px-2 font-bold text-foreground">{fmtCurr(Math.round(r.costPerDelivered))}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmtCurr(Math.round(r.shippingCost))}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmtCurr(Math.round(r.rtoCostTotal))}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmtCurr(Math.round(r.codCost))}</td>
                          <td className={`py-2 px-2 font-bold ${isBest ? "text-emerald-500" : isWorst ? "text-rose-500" : "text-foreground"} ${isRtl ? "text-left" : "text-right"}`}>
                            {fmtCurr(Math.round(r.total))}
                          </td>
                          <td className={`py-2 px-2 ${isRtl ? "text-left" : "text-right"}`}>
                            {isBest && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{T("best")}</span>}
                            {isWorst && !isBest && <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">{T("worst")}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Breakdown per Courier */}
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{T("costBreakdown")}</h3>
              <div className="space-y-4">
                {results.map((r) => {
                  const maxV = Math.max(r.shippingCost, r.rtoCostTotal, r.codCost, r.extraFeesTotal, 1);
                  return (
                    <div key={r.name} className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/10">
                      <div className="flex justify-between text-xs font-bold text-foreground">
                        <span>{T("courier")} {r.name}</span>
                        <span className="font-mono text-primary">{fmtCurr(Math.round(r.total))}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-sans">{T("shipping")}</span>
                          <span className="text-foreground">{fmtCurr(Math.round(r.shippingCost))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-sans">{T("rto")}</span>
                          <span className="text-rose-500">{fmtCurr(Math.round(r.rtoCostTotal))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-sans">{T("cod")}</span>
                          <span className="text-amber-500">{fmtCurr(Math.round(r.codCost))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-sans">{T("extra")}</span>
                          <span className="text-foreground">{fmtCurr(Math.round(r.extraFeesTotal))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
