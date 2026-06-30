import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon, DocumentTextIcon,
} from "@heroicons/react/24/outline";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;

type Scenario = "conservative" | "balanced" | "aggressive";

interface Inputs {
  fixedCosts: number; aov: number; cogs: number; packingFees: number;
  shippingFees: number; rtoFees: number; cpp: number;
  confirmationRate: number; deliveryRate: number; ordersPerDay: number;
}

const SCENARIOS: Record<Scenario, Inputs> = {
  conservative: { fixedCosts: 80000, aov: 500, cogs: 250, packingFees: 30, shippingFees: 80, rtoFees: 70, cpp: 250, confirmationRate: 60, deliveryRate: 60, ordersPerDay: 30 },
  balanced: { fixedCosts: 120000, aov: 900, cogs: 350, packingFees: 25, shippingFees: 80, rtoFees: 60, cpp: 200, confirmationRate: 80, deliveryRate: 75, ordersPerDay: 50 },
  aggressive: { fixedCosts: 200000, aov: 1500, cogs: 500, packingFees: 20, shippingFees: 60, rtoFees: 50, cpp: 150, confirmationRate: 85, deliveryRate: 85, ordersPerDay: 100 },
};

const STORAGE_KEY = "maxp_break_even_saved";
interface SavedScenario { name: string; inputs: Inputs; currency: string; }

const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function compute(inputs: Inputs) {
  const { fixedCosts, aov, cogs, packingFees, shippingFees, rtoFees, cpp, confirmationRate, deliveryRate, ordersPerDay } = inputs;
  const cr = confirmationRate / 100, dr = deliveryRate / 100;
  const effectiveDr = cr * dr;
  const costPerDelivered = cogs + packingFees + shippingFees;
  const rtoCostPerFail = packingFees + rtoFees;
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

  const applyScenario = (s: Scenario) => setInputs({ ...SCENARIOS[s] });

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

  const loadSaved = (s: SavedScenario) => { setInputs({ ...s.inputs }); setCurrency(s.currency); };
  const deleteSaved = (i: number) => persist(saved.filter((_, idx) => idx !== i));

  const T = (k: string) => t(`projectBreakEven.${k}`);

  const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: React.ChangeEventHandler; isPercent?: boolean }> =
    ({ label, value, min, max, step = 1, onChange, isPercent }) => (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">{label}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(value)}{isPercent ? "%" : ` ${s}`}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{fmt(min)}{isPercent ? "%" : ` ${s}`}</span>
          <span>{fmt(max)}{isPercent ? "%" : ` ${s}`}</span>
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
              <CalculatorIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
              {T("title")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{T("desc")}</p>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {T(c)}</option>)}
          </select>
        </div>

        {/* Scenario + Save */}
        <div className="flex flex-wrap gap-2 items-center">
          {(["conservative", "balanced", "aggressive"] as Scenario[]).map((s) => (
            <button key={s} onClick={() => applyScenario(s)}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">
              {s === "conservative" ? "🛡 " : s === "balanced" ? "⚖️ " : "🚀 "}{T(s)}
            </button>
          ))}
          <span className="text-gray-300 dark:text-gray-700 mx-1 hidden sm:inline">|</span>
          <button onClick={saveCurrent} disabled={saved.length >= 3}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed">
            <SaveIcon className="w-4 h-4 shrink-0" /> {T("save")} ({saved.length}/3)
          </button>
          {saved.map((sc, i) => (
            <div key={i} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadSaved(sc)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
              <button onClick={() => deleteSaved(i)} className="text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Input sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card title={T("fixedCosts")} icon={<BuildingOfficeIcon className="w-5 h-5 text-gray-500" />}>
            <Slider label={T("fixedCostsHint")} value={inputs.fixedCosts} min={0} max={500000} step={1000} onChange={set("fixedCosts")} />
          </Card>
          <Card title={T("revenueCosts")} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500" />}>
            <Slider label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
            <Slider label={T("cogs")} value={inputs.cogs} min={0} max={3000} step={10} onChange={set("cogs")} />
            <Slider label={T("packing")} value={inputs.packingFees} min={0} max={200} step={5} onChange={set("packingFees")} />
            <Slider label={T("shipping")} value={inputs.shippingFees} min={0} max={500} step={10} onChange={set("shippingFees")} />
            <Slider label={T("rtoFee")} value={inputs.rtoFees} min={0} max={300} step={10} onChange={set("rtoFees")} />
          </Card>
          <Card title={T("marketing")} icon={<ChartBarIcon className="w-5 h-5 text-purple-500" />}>
            <Slider label={T("cpp")} value={inputs.cpp} min={0} max={1000} step={10} onChange={set("cpp")} />
            <Slider label={T("confirmRate")} value={inputs.confirmationRate} min={0} max={100} step={5} isPercent onChange={set("confirmationRate")} />
            <Slider label={T("deliveryRate")} value={inputs.deliveryRate} min={0} max={100} step={5} isPercent onChange={set("deliveryRate")} />
            <Slider label={T("ordersPerDay")} value={inputs.ordersPerDay} min={1} max={500} step={1} onChange={set("ordersPerDay")} />
          </Card>
        </div>

        {/* Results */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 shrink-0" /> {T("results")}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{T("codModel")} • {dateStr}</p>
            </div>
            {marginLevel === "marginal" && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" /> ⚠️ {T("marginal")}
              </span>
            )}
            {marginLevel === "loss" && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" /> 🛑 {T("lossBadge")}
              </span>
            )}
          </div>

          {/* Break-even Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <BigCard value={isFinite(r.breakEvenOrders) ? fmt(r.breakEvenOrders) : "∞"} label={T("breakEvenOrders")} sub={T("breakEvenOrdersSub")} isProfit={isProfit} />
            <BigCard value={isFinite(r.revenueRequired) ? `${fmt(r.revenueRequired)} ${s}` : "∞"} label={T("revenueRequired")} sub={T("revenueRequiredSub")} isProfit={isProfit} />
            <BigCard value={timeLabel} label={T("timeToBe")} sub={`${T("timeToBeSub")} ${fmt(inputs.ordersPerDay)} ${T("ordersPerDay")} → ${fmt1(r.deliveredPerDay)} ${T("deliveredPerDay")}`} isProfit={isProfit} />
          </div>

          {!isProfit && (
            <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
              <span>{T("lossWarning")}</span>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard label={T("profitPerOrder")} value={`${fmt(r.contributionPerOrder)} ${s}`} sub={`${T("margin")} ${r.contributionMargin.toFixed(1)}%`} positive={isProfit} />
            <MetricCard label={T("effectiveCac")} value={`${isFinite(r.effectiveCac) ? fmt(r.effectiveCac) : "∞"} ${s}`} sub={T("effectiveCacSub")} positive={r.effectiveCac < inputs.aov} />
            <MetricCard label={T("costPerDelivered")} value={`${fmt(r.costPerDelivered)} ${s}`} sub={T("costPerDeliveredSub")} positive={r.costPerDelivered < inputs.aov} />
            <MetricCard label={T("rtoImpact")} value={`${fmt(r.monthlyRtoImpact)} ${s}`} sub={`${T("rtoImpactSub")} ${fmt(r.monthlyRtoOrders)} ${T("returnMonth")}`} positive={false} />
          </div>

          {/* Unit Economics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{T("rtoUnitCost")}</h3>
              <div className="text-xl sm:text-2xl font-bold text-orange-500">{fmt(r.rtoCostPerFail)} {s}</div>
              <div className="text-xs text-gray-400">{T("rtoUnitCostSub")}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{T("effectiveDeliveryRate")}</h3>
              <div className="text-xl sm:text-2xl font-bold text-blue-500">{r.effectiveDr.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">{inputs.confirmationRate}% × {inputs.deliveryRate}%</div>
            </div>
          </div>
        </div>

        {/* Order Flow Simulation */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("orderFlow")}
          </h3>
          <div className="space-y-0">
            <FunnelStep label={T("placed")} value={100} cost={`${fmt(100 * inputs.cpp)} ${s} ${T("ads")}`} color="bg-blue-500" />
            <FunnelArrow />
            <FunnelStep label={`${T("confirmed")} (${inputs.confirmationRate}%)`} value={r.confirmed} split={
              <span className="text-xs text-gray-400">{fmt(100 - r.confirmed)} {T("unconfirmed")}</span>
            } color="bg-green-500" />
            <FunnelArrow />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <FunnelStep label={`${T("delivered")} (${inputs.deliveryRate}% ${T("ofConfirmed")})`} value={r.delivered} cost={`${fmt(r.revenue)} ${s} ${T("revenue")}`} color="bg-emerald-500" />
              </div>
              <div>
                <FunnelStep label={T("returned")} value={r.rto} cost={`${fmt(Math.round(r.rto * r.rtoCostPerFail))} ${s} ${T("loss")}`} color="bg-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Input Parameters + Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("inputSummary")}</h3>
            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    [T("fixedCosts"), `${fmt(inputs.fixedCosts)} ${s}`],
                    [T("aov"), `${fmt(inputs.aov)} ${s}`],
                    [T("cpp"), `${fmt(inputs.cpp)} ${s}`],
                    [T("confirmRate"), `${inputs.confirmationRate}%`],
                    [T("deliveryRate"), `${inputs.deliveryRate}%`],
                    [T("effectiveDeliveryRate"), `${r.effectiveDr.toFixed(1)}%`],
                    [T("ordersPerDay"), `${fmt(inputs.ordersPerDay)}`],
                  ].map(([k, v]) => (
                    <tr key={k} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-1.5 sm:py-2 text-gray-600 dark:text-gray-400">{k}</td>
                      <td className={`py-1.5 sm:py-2 font-semibold text-gray-900 dark:text-gray-100 ${isRtl ? "text-left" : "text-right"}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("costBreakdown")}</h3>
            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    [T("cogs"), `${fmt(inputs.cogs)} ${s}`],
                    [T("packing"), `${fmt(inputs.packingFees)} ${s}`],
                    [T("shipping"), `${fmt(inputs.shippingFees)} ${s}`],
                    [T("rtoFee"), `${fmt(inputs.rtoFees)} ${s}`],
                    [T("costPerDelivered"), `${fmt(r.costPerDelivered)} ${s}`],
                    [T("rtoUnitCost"), `${fmt(r.rtoCostPerFail)} ${s}`],
                  ].map(([k, v]) => (
                    <tr key={k} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-1.5 sm:py-2 text-gray-600 dark:text-gray-400">{k}</td>
                      <td className={`py-1.5 sm:py-2 font-semibold text-gray-900 dark:text-gray-100 ${isRtl ? "text-left" : "text-right"}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Step-by-Step Formula */}
        <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            <InformationCircleIcon className="w-4 h-4 shrink-0" /> {T("stepByStep")}
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>#</th>
                  <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("step")}</th>
                  <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{T("formula")}</th>
                  <th className={`py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-left" : "text-right"}`}>{T("result")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  [T("costPerDelivered"), T("costPerDeliveredFormula"), `${fmt(r.costPerDelivered)} ${s}`],
                  [T("rtoUnitCost"), T("rtoCostPerFailFormula"), `${fmt(r.rtoCostPerFail)} ${s}`],
                  [T("confirmedPer100"), `100 × ${inputs.confirmationRate}%`, `${fmt1(r.confirmed)} ${T("orders")}`],
                  [T("deliveredRtoSplit"), `${fmt1(r.confirmed)} × ${inputs.deliveryRate}%`, `${fmt1(r.delivered)} ${T("deliveredLabel")} / ${fmt1(r.rto)} RTO`],
                  [T("effectiveDrFormula"), `${inputs.confirmationRate}% × ${inputs.deliveryRate}%`, `${r.effectiveDr.toFixed(1)}%`],
                  [T("revenuePer100"), `${fmt1(r.delivered)} × AOV ${fmt(inputs.aov)}`, `${fmt(r.revenue)} ${s}`],
                  [T("totalDeliveredCost"), `${fmt1(r.delivered)} × ${fmt(r.costPerDelivered)}`, `- ${fmt(Math.round(r.delivered * r.costPerDelivered))} ${s}`],
                  [T("totalRtoCost"), `${fmt1(r.rto)} × ${fmt(r.rtoCostPerFail)}`, `- ${fmt(Math.round(r.rto * r.rtoCostPerFail))} ${s}`],
                  [T("totalAdSpend"), `100 × CPP ${fmt(inputs.cpp)}`, `- ${fmt(100 * inputs.cpp)} ${s}`],
                  [T("operatingProfit"), "Revenue − Costs − Ad Spend", `${fmt(r.opProfit)} ${s}`],
                  [T("profitPerOrderCalc"), "Op. Profit ÷ 100", `${fmt(r.contributionPerOrder)} ${s}`],
                  [T("marginPercent"), `(Contribution ÷ AOV) × 100`, `${r.contributionMargin.toFixed(1)}%`],
                  [T("breakEvenCalc"), `${T("fixedCosts")} ÷ ${T("profitPerOrder")}`, `${isFinite(r.breakEvenOrders) ? fmt(r.breakEvenOrders) : "∞"}`],
                  [T("revenueRequiredCalc"), "BE Orders × AOV", `${isFinite(r.revenueRequired) ? fmt(r.revenueRequired) : "∞"} ${s}`],
                  [T("timeToBeCalc"), `BE Orders ÷ ${T("ordersPerDay")}`, timeLabel],
                ].map(([step, formula, result], i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-400">{i + 1}</td>
                    <td className={`py-1.5 sm:py-2 px-2 sm:px-3 text-gray-900 dark:text-gray-100 font-medium ${isRtl ? "text-right" : "text-left"}`}>{step}</td>
                    <td className={`py-1.5 sm:py-2 px-2 sm:px-3 text-gray-500 dark:text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>{formula}</td>
                    <td className={`py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-900 dark:text-gray-100 ${isRtl ? "text-left" : "text-right"}`}>{result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* Report */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 space-y-4 print:shadow-none print:border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              <DocumentTextIcon className="w-4 h-4 inline ml-1 shrink-0" />{T("report")}
            </h3>
            <span className="text-xs text-gray-400">{dateStr}</span>
          </div>
          <p className="text-xs text-gray-400">{T("codModel")} • {currency} • {marginLevel === "good" ? T("reportProfit") : marginLevel === "marginal" ? T("reportMarginal") : T("reportLoss")}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
            <div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{isFinite(r.breakEvenOrders) ? fmt(r.breakEvenOrders) : "∞"}</div>
              <div className="text-xs text-gray-500">{T("breakEvenOrders")}</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{isFinite(r.revenueRequired) ? `${fmt(r.revenueRequired)} ${s}` : "∞"}</div>
              <div className="text-xs text-gray-500">{T("revenueRequired")}</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{timeLabel}</div>
              <div className="text-xs text-gray-500">{T("timeToBe")}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{T("reportInputs")}</h4>
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {[
                    [T("fixedCosts"), `${fmt(inputs.fixedCosts)} ${s}`],
                    ["AOV", `${fmt(inputs.aov)} ${s}`],
                    ["CPP", `${fmt(inputs.cpp)} ${s}`],
                    [T("confirmRate"), `${inputs.confirmationRate}%`],
                    [T("deliveryRate"), `${inputs.deliveryRate}%`],
                    [T("effectiveDeliveryRate"), `${r.effectiveDr.toFixed(1)}%`],
                    [T("ordersPerDay"), `${fmt(inputs.ordersPerDay)}`],
                  ].map(([k, v]) => (
                    <tr key={k}><td className="py-1 text-gray-500">{k}</td><td className={`py-1 font-semibold ${isRtl ? "text-left" : "text-right"}`}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{T("reportResults")}</h4>
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {[
                    [T("profitPerOrder"), `${fmt(r.contributionPerOrder)} ${s}`],
                    [T("marginPercent"), `${r.contributionMargin.toFixed(1)}%`],
                    [T("effectiveCac"), `${isFinite(r.effectiveCac) ? fmt(r.effectiveCac) : "∞"} ${s}`],
                    [T("costPerDelivered"), `${fmt(r.costPerDelivered)} ${s}`],
                    [T("rtoImpact"), `${fmt(r.monthlyRtoImpact)} ${s}`],
                    [T("reportRtoMonth"), `${fmt(r.monthlyRtoOrders)}`],
                  ].map(([k, v]) => (
                    <tr key={k}><td className="py-1 text-gray-500">{k}</td><td className={`py-1 font-semibold ${isRtl ? "text-left" : "text-right"}`}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-600">
          {T("footer")} <a href="https://tools.e-cart.academy/project-break-even" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">eCart Project Break-Even</a>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-4 sm:space-y-5">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">{icon}{title}</h2>
      {children}
    </div>
  );
}

function BigCard({ value, label, sub, isProfit }: { value: string; label: string; sub: string; isProfit: boolean }) {
  return (
    <div className={`rounded-xl p-4 sm:p-5 text-center border-2 ${isProfit ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"}`}>
      <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-100 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold ${positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function FunnelStep({ label, value, cost, split, color }: { label: string; value: number; cost?: React.ReactNode; split?: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
      <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{fmt1(value)}</span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        {cost && <div className="text-xs text-gray-400 dark:text-gray-500">{cost}</div>}
        {split}
      </div>
    </div>
  );
}

function FunnelArrow() {
  return <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-0.5">↓</div>;
}

function BuildingOfficeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" /><path d="M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" /><path d="M10 11h4" /><path d="M10 15h4" /><path d="M10 7V3" />
    </svg>
  );
}
