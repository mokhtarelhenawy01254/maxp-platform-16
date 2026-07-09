import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  TruckIcon, CurrencyDollarIcon, ExclamationTriangleIcon,
  CheckCircleIcon, SparklesIcon, InformationCircleIcon,
  PlusCircleIcon, TrashIcon, ArrowTrendingUpIcon,
  ChartBarIcon, ScaleIcon,
} from "@heroicons/react/24/outline";

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

  const T = useCallback((k: string, vars?: Record<string, string | number | string>) => {
    const key = `shippingOptimizer.${k}`;
    return vars ? t(key, vars as any) : t(key);
  }, [t]);

  const results = useMemo(() => couriers.map((c) => computeCourier(c, aov, orders)), [couriers, aov, orders]);

  const best = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((a, b) => (a.total < b.total ? a : b));
  }, [results]);

  const worst = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((a, b) => (a.total > b.total ? a : b));
  }, [results]);

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

  const sortedResults = useMemo(() => [...results].sort((a, b) => a.total - b.total), [results]);

  const maxTotal = Math.max(...results.map((r) => r.total), 1);

  const chartData = useMemo(() => {
    return results.map((r) => {
      const items = [
        { name: T("delivery"), value: r.shippingCost, fill: "hsl(210 80% 55%)" },
        { name: T("rto"), value: r.rtoCostTotal, fill: "hsl(0 72% 55%)" },
        { name: T("cod"), value: r.codCost, fill: "hsl(260 70% 60%)" },
        { name: T("extra"), value: r.extraFeesTotal, fill: "hsl(35 85% 55%)" },
      ];
      const maxV = Math.max(...items.map((d) => d.value), 1);
      return { name: `${T("courier")} ${r.name}`, items: items.map((d) => ({ ...d, pct: Math.min(100, (d.value / maxV) * 100) })) };
    });
  }, [results, T]);

  const insights = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];

    if (best && worst && best.name !== worst.name) {
      const savings = worst.total - best.total;
      M.push({
        type: "success",
        title: T("profitableChoice", { courier: `${T("courier")} ${best.name}` }),
        msg: T("profitableChoiceDesc", { amount: fmtCurr(savings), worst: `${T("courier")} ${worst.name}`, yearly: fmtCurr(savings * 12), diff: fmtCurr(best.costPerDelivered - worst.costPerDelivered) }),
      });
    }

    results.forEach((r) => {
      const rtoRate = 1 - r.deliveryRate / 100;
      if (rtoRate > 0.2) {
        M.push({
          type: "warn",
          title: T("highRtoWarning", { courier: `${T("courier")} ${r.name}` }),
          msg: T("highRtoWarningDesc", { pct: fmt(rtoRate * 100), orders: fmt(Math.round(r.failedOrders)), cost: fmtCurr(r.rtoCost) }),
        });
      }
      if (r.codPct > 3) {
        M.push({
          type: "warn",
          title: T("highCodWarning", { courier: `${T("courier")} ${r.name}` }),
          msg: T("highCodWarningDesc", { pct: r.codPct, amount: fmtCurr(r.codCost) }),
        });
      }
    });

    if (best && worst && best.name !== worst.name) {
      const gap = worst.total - best.total;
      if (gap > best.total * 0.2) {
        M.push({
          type: "error",
          title: T("bigGapWarning"),
          msg: T("bigGapWarningDesc", { amount: fmtCurr(gap) }),
        });
      }
    }

    return M;
  }, [results, best, worst, T, fmtCurr, fmt]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    const savingsPerPct = orders * aov * 0.01;
    const worstCourier = worst?.name || "B";
    const bestCourier = best?.name || "A";

    R.push({
      icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
      title: T("recVerifyPhones"),
      desc: T("recVerifyPhonesDesc", { amount: fmtCurr(savingsPerPct * 5) }),
    });

    R.push({
      icon: <CurrencyDollarIcon className="w-5 h-5 text-amber-500" />,
      title: T("recCodNegotiate"),
      desc: T("recCodNegotiateDesc", { amount: fmtCurr(savingsPerPct * 2) }),
    });

    R.push({
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />,
      title: T("recRtoReduce"),
      desc: T("recRtoReduceDesc", { amount: fmtCurr(savingsPerPct * 3) }),
    });

    R.push({
      icon: <ScaleIcon className="w-5 h-5 text-purple-500" />,
      title: T("recCourierMix"),
      desc: T("recCourierMixDesc", { best: `${T("courier")} ${bestCourier}`, worst: `${T("courier")} ${worstCourier}` }),
    });

    const extraFeesTotal = results.reduce((s, r) => s + r.extraFeesTotal, 0);
    if (extraFeesTotal > 0) {
      R.push({
        icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />,
        title: T("recExtraFees"),
        desc: T("recExtraFeesDesc", { amount: fmtCurr(extraFeesTotal) }),
      });
    }

    return R;
  }, [results, best, worst, orders, aov, T, fmtCurr]);

  const winSavings = best && worst && best.name !== worst.name ? worst.total - best.total : 0;

  const Slider: React.FC<{
    label: string; value: number; min: number; max: number;
    step?: number; onChange: (v: number) => void;
    isPercent?: boolean; suffix?: string;
  }> = ({ label, value, min, max, step = 1, onChange, isPercent, suffix }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="flex items-center gap-1">
          <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} min={min} max={max} step={step}
            className="w-20 sm:w-24 text-right font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{isPercent ? "%" : suffix || sym(currency)}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(min)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
        <span>{fmt(max)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TruckIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{T("desc")}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {T(c)}</option>)}
            </select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Store Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4 sm:space-y-5">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-500" /> {T("storeSettings")}
              </h2>
              <Slider label={T("aov")} value={aov} min={100} max={10000} step={100} onChange={setAov} />
              <Slider label={T("ordersPerMonth")} value={orders} min={10} max={10000} step={10} onChange={setOrders} suffix=" orders" />
            </div>

            {/* Couriers */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
                  <TruckIcon className="w-5 h-5 text-blue-500" /> {T("couriers")} ({couriers.length}/{MAX_COURIERS})
                </h2>
                {couriers.length < MAX_COURIERS && (
                  <button onClick={addCourier}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <PlusCircleIcon className="w-3.5 h-3.5" /> {T("addCourier")}
                  </button>
                )}
              </div>
              {couriers.map((c, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{T("courier")} {c.name}</h3>
                    {couriers.length > MIN_COURIERS && (
                      <button onClick={() => removeCourier(idx)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                        <TrashIcon className="w-3.5 h-3.5" /> {T("removeCourier")}
                      </button>
                    )}
                  </div>
                  <Slider label={T("deliveryCost")} value={c.deliveryCost} min={0} max={500} step={5} onChange={(v) => updateCourier(idx, "deliveryCost", v)} />
                  <Slider label={T("rtoCost")} value={c.rtoCost} min={0} max={500} step={5} onChange={(v) => updateCourier(idx, "rtoCost", v)} />
                  <Slider label={T("deliveryRate")} value={c.deliveryRate} min={30} max={100} step={1} isPercent onChange={(v) => updateCourier(idx, "deliveryRate", v)} />
                  <Slider label={T("extraFees")} value={c.extraFees} min={0} max={200} step={5} onChange={(v) => updateCourier(idx, "extraFees", v)} />
                  <Slider label={T("codCommission")} value={c.codPct} min={0} max={10} step={0.5} isPercent onChange={(v) => updateCourier(idx, "codPct", v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* Winner Banner */}
            {best && worst && best.name !== worst.name && (
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <TruckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      {T("courier")} {best.name} {T("wins", { amount: fmtCurr(winSavings) })}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {T("savingsPerYear", { amount: fmtCurr(winSavings * 12) })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("comparisonTable")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("courier")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("deliveryPct")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("costPerDelivered")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("shipping")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("rto")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("cod")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("extra")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-left" : "text-right"}`}>{T("totalPerMonth")}</th>
                      <th className={`py-2 px-2 text-gray-500 dark:text-gray-400 ${isRtl ? "text-left" : "text-right"}`}>{T("verdict")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sortedResults.map((r, i) => {
                      const isBest = best && r.name === best.name;
                      const isWorst = worst && r.name === worst.name;
                      return (
                        <tr key={r.name} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isBest ? "bg-emerald-50/50 dark:bg-emerald-900/5" : ""} ${isWorst ? "bg-red-50/50 dark:bg-red-900/5" : ""}`}>
                          <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">{T("courier")} {r.name}</td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{fmt(r.deliveryRate)}%</td>
                          <td className="py-2 px-2 font-mono text-gray-900 dark:text-gray-100">{fmtCurr(Math.round(r.costPerDelivered))}</td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{fmtCurr(Math.round(r.shippingCost))}</td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{fmtCurr(Math.round(r.rtoCostTotal))}</td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{fmtCurr(Math.round(r.codCost))}</td>
                          <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{fmtCurr(Math.round(r.extraFeesTotal))}</td>
                          <td className={`py-2 px-2 font-mono font-bold ${isBest ? "text-emerald-600" : isWorst ? "text-red-600" : "text-gray-900 dark:text-gray-100"} ${isRtl ? "text-left" : "text-right"}`}>{fmtCurr(Math.round(r.total))}</td>
                          <td className={`py-2 px-2 font-bold text-xs ${isRtl ? "text-left" : "text-right"}`}>
                            {isBest && <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{T("best")}</span>}
                            {isWorst && !isBest && <span className="text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{T("worst")}</span>}
                            {!isBest && !isWorst && <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Breakdown Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("costBreakdown")}
              </h3>
              <div className="space-y-6">
                {chartData.map((courier) => (
                  <div key={courier.name}>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{courier.name}</p>
                    <div className="space-y-2">
                      {courier.items.map((d, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(Math.round(d.value))}</span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.pct}%`, backgroundColor: d.fill }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" /> {T("smartInsights")}
                </h3>
                {insights.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 sm:p-4 rounded-xl border text-xs sm:text-sm ${
                    a.type === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                      : a.type === "warn" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  }`}>
                    <div className="flex items-start gap-2 w-full">
                      {a.type === "success" ? <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-emerald-500" />
                        : <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${a.type === "error" ? "text-red-500" : "text-yellow-500"}`} />}
                      <div className="flex-1">
                        <div className="font-semibold">{a.title}</div>
                        <div className="mt-0.5">{a.msg}</div>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        a.type === "success" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : a.type === "warn" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}>{T(a.type === "success" ? "healthy" : "warning")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Recommendations */}
            <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <SparklesIcon className="w-4 h-4 shrink-0" /> {T("recommendations")} {recommendations.length > 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{recommendations.length}</span>}
              </summary>
              {recommendations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0">{rec.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rec.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{rec.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-xs text-gray-400">{T("noRecommendations")}</div>
              )}
            </details>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 dark:text-gray-600">
              {T("footer")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
