import { Circle as CalculatorIcon, DollarSign as CurrencyDollarIcon, Activity as ChartBarIcon, AlertTriangle as ExclamationTriangleIcon, Info as InformationCircleIcon, Circle as ArrowTrendingUpIcon, Circle as SaveIcon, Trash2 as TrashIcon, Circle as ScaleIcon, Star as SparklesIcon, ShieldCheck as ShieldCheckIcon, Circle as RocketLaunchIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationCircleIcon, X as XCircleIcon, Settings as Cog6ToothIcon, Circle as CubeIcon, RefreshCw as ArrowPathIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useMemo, useEffect, useCallback } from "react";
import SliderInput from "@/components/common/SliderInput";
;
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

interface Inputs {
  aov: number; confirmationRate: number; deliveryRate: number;
  cogs: number; packingFees: number; shippingFees: number; rtoFees: number;
  piecesPerOrder: number;
}

interface Results {
  confirmed: number; delivered: number; rto: number;
  revenue: number; costPerDelivered: number; costPerRTO: number;
  deliveredCost: number; rtoCost: number; operatingProfit: number;
  bevCAC: number; bevROAS: number; safeCAC: number; targetROAS: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfAction = "delivery80" | "cogs90" | "rtoCut20";

const DEFAULTS: Inputs = {
  aov: 900, confirmationRate: 85, deliveryRate: 75,
  cogs: 350, packingFees: 25, shippingFees: 80, rtoFees: 60,
  piecesPerOrder: 1,
};

const STORAGE_KEY = "maxp_product_bev_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function compute(inputs: Inputs): Results {
  const { aov, confirmationRate, deliveryRate, cogs, packingFees, shippingFees, rtoFees, piecesPerOrder } = inputs;
  const cr = confirmationRate / 100, dr = deliveryRate / 100;
  const confirmed = 100 * cr;
  const delivered = confirmed * dr;
  const rto = confirmed - delivered;
  const revenue = delivered * aov;
  const costPerDelivered = (cogs + packingFees) * piecesPerOrder + shippingFees;
  const costPerRTO = packingFees * piecesPerOrder + rtoFees;
  const deliveredCost = delivered * costPerDelivered;
  const rtoCost = rto * costPerRTO;
  const operatingProfit = revenue - deliveredCost - rtoCost;
  const bevCAC = operatingProfit / 100;
  const bevROAS = operatingProfit > 0 ? revenue / operatingProfit : 0;
  const safeCAC = bevCAC * 0.8;
  const targetROAS = safeCAC > 0 ? revenue / (safeCAC * 100) : 0;
  return { confirmed, delivered, rto, revenue, costPerDelivered, costPerRTO, deliveredCost, rtoCost, operatingProfit, bevCAC, bevROAS, safeCAC, targetROAS };
}

export default function ProductBreakEvenCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);

  const r = useMemo(() => compute(inputs), [inputs]);

  const dateStr = new Date().toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

  const whatIfAll = useMemo(() => {
    const make = (action: WhatIfAction) => {
      const mod = { ...inputs };
      if (action === "delivery80") mod.deliveryRate = 80;
      else if (action === "cogs90") mod.cogs = Math.round(inputs.cogs * 0.9);
      else if (action === "rtoCut20") {
        const rtoRate = 1 - inputs.deliveryRate / 100;
        mod.deliveryRate = Math.round((1 - rtoRate * 0.8) * 100);
      }
      return compute(mod);
    };
    return {
      delivery80: { result: make("delivery80"), impact: make("delivery80").bevCAC - r.bevCAC },
      cogs90: { result: make("cogs90"), impact: make("cogs90").bevCAC - r.bevCAC },
      rtoCut20: { result: make("rtoCut20"), impact: make("rtoCut20").bevCAC - r.bevCAC },
    };
  }, [inputs, r.bevCAC]);

  const applyWhatIf = (action: WhatIfAction) => {
    setActiveAction(activeAction === action ? null : action);
  };

  const revertWhatIf = () => setActiveAction(null);

  const costChartData = useMemo(() => [
    { name: t("productBreakEven.cogs"), value: inputs.cogs * 100, fill: "hsl(217 91% 60%)" },
    { name: t("productBreakEven.packing"), value: inputs.packingFees * 100, fill: "hsl(142 76% 36%)" },
    { name: t("productBreakEven.shipping"), value: inputs.shippingFees * 100, fill: "hsl(189 96% 52%)" },
    { name: t("productBreakEven.rtoFee"), value: inputs.rtoFees * r.rto, fill: "hsl(0 84% 60%)" },
  ], [inputs, r.rto, t]);

  const maxCostChart = Math.max(...costChartData.map(d => d.value), 1);

  const zoneKey = r.bevCAC >= 150 ? "safe" : r.bevCAC >= 80 ? "warning" : "danger";

  const maxScale = Math.max(r.bevCAC * 1.4, 100);
  const safeWidth = Math.min(100, (r.safeCAC / maxScale) * 100);
  const warningWidth = Math.min(100, Math.max(0, ((r.bevCAC - r.safeCAC) / maxScale) * 100));
  const dangerWidth = Math.max(0, 100 - safeWidth - warningWidth);

  const alerts = useMemo(() => {
    const M: { type: "error" | "warn" | "info"; msg: string }[] = [];
    if (r.operatingProfit <= 0) M.push({ type: "error", msg: t("productBreakEven.alertLoss") });
    if (r.bevROAS > 3) M.push({ type: "warn", msg: t("productBreakEven.alertHighROAS", { roas: r.bevROAS.toFixed(2) }) });
    if (r.bevROAS < 1.5) M.push({ type: "info", msg: t("productBreakEven.alertLowROAS", { roas: r.bevROAS.toFixed(2) }) });
    return M;
  }, [r, t]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    const effectiveMargin = (inputs.aov - (inputs.cogs + inputs.packingFees + inputs.shippingFees + inputs.rtoFees)) / inputs.aov * 100;
    if (inputs.deliveryRate < 80) {
      const improvement = Math.min(5, Math.round((80 - inputs.deliveryRate) / 2));
      R.push({ icon: <CubeIcon className="w-5 h-5 text-blue-500" />, title: t("productBreakEven.recImproveDelivery"), desc: t("productBreakEven.recImproveDeliveryDesc", { rate: inputs.deliveryRate, target: Math.min(100, inputs.deliveryRate + improvement * 2), improvement }) });
    }
    if (inputs.confirmationRate < 80) {
      R.push({ icon: <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />, title: t("productBreakEven.recImproveConfirmation"), desc: t("productBreakEven.recImproveConfirmationDesc", { rate: inputs.confirmationRate }) });
    }
    if (effectiveMargin < 40) {
      const targetCOGS = Math.round(inputs.aov * 0.35 - inputs.packingFees - inputs.shippingFees - inputs.rtoFees);
      if (targetCOGS > 0 && targetCOGS < inputs.cogs) R.push({ icon: <Cog6ToothIcon className="w-5 h-5 text-purple-500" />, title: t("productBreakEven.recReduceCOGS"), desc: t("productBreakEven.recReduceCOGSDesc", { target: fmtCurr(targetCOGS), current: fmtCurr(inputs.cogs) }) });
    }
    if (r.rtoCost > r.deliveredCost * 0.1) {
      R.push({ icon: <ScaleIcon className="w-5 h-5 text-amber-500" />, title: t("productBreakEven.recReduceRTO"), desc: t("productBreakEven.recReduceRTODesc", { cost: fmtCurr(Math.round(r.rtoCost * 30 / 100)) }) });
    }
    return R;
  }, [inputs, r, t, fmtCurr]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const names = [t("productBreakEven.scenarioDefault") + " 1", t("productBreakEven.scenarioDefault") + " 2", t("productBreakEven.scenarioDefault") + " 3"];
    const n = scenarioName.trim() || names[saved.length];
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => { setInputs({ ...s.inputs }); setCurrency(s.currency); };
  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  const T = (k: string) => t(`productBreakEven.${k}`);



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

        {/* Save section */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder={T("scenarioNamePlaceholder")}
              className="w-24 sm:w-32 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
            <button onClick={saveScenario} disabled={saved.length >= 3}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed">
              <SaveIcon className="w-3.5 h-3.5 shrink-0" /> {T("save")} ({saved.length}/3)
            </button>
          </div>
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
              <button onClick={() => deleteScenario(sc.id)} className="text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 sm:p-4 rounded-xl border text-xs sm:text-sm ${
                a.type === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  : a.type === "warn" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              }`}>
                <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                  a.type === "error" ? "text-red-500" : a.type === "warn" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <Card title={T("orderFlow")} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
              <SliderInput label={T("piecesPerOrder")} value={inputs.piecesPerOrder} min={1} max={20} step={1} onChange={set("piecesPerOrder")} />
              <SliderInput currencySymbol={sym(currency)} label={T("confirmationRate")} value={inputs.confirmationRate} min={30} max={100} step={5} isPercent onChange={set("confirmationRate")} />
              <SliderInput currencySymbol={sym(currency)} label={T("deliveryRate")} value={inputs.deliveryRate} min={20} max={100} step={5} isPercent onChange={set("deliveryRate")} />
              <div className="pt-2 text-xs text-gray-500 flex justify-between">
                <span>{T("per100Orders")}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">100 {T("orders")}</span>
              </div>
            </Card>

            <Card title={T("costStructure")} icon={<ChartBarIcon className="w-5 h-5 text-purple-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("cogs")} value={inputs.cogs} min={1} max={1000} step={10} onChange={set("cogs")} />
              <SliderInput currencySymbol={sym(currency)} label={T("packing")} value={inputs.packingFees} min={1} max={100} step={5} onChange={set("packingFees")} />
              <SliderInput currencySymbol={sym(currency)} label={T("shipping")} value={inputs.shippingFees} min={30} max={200} step={10} onChange={set("shippingFees")} />
              <SliderInput currencySymbol={sym(currency)} label={T("rtoFee")} value={inputs.rtoFees} min={20} max={150} step={10} onChange={set("rtoFees")} />
            </Card>

            {/* Order Funnel Per 100 */}
            <Card title={T("per100Breakdown")} icon={<ScaleIcon className="w-5 h-5 text-blue-500" />}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">{T("placedOrders")}</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">100</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-green-600 dark:text-green-400">{T("confirmed")}</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{fmt1(r.confirmed)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-emerald-600 dark:text-emerald-400">{T("delivered")}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt1(r.delivered)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-red-500">{T("rtoFailed")}</span>
                  <span className="font-bold text-red-500">{fmt1(r.rto)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label={T("bevCAC")} value={fmtCurr(r.bevCAC)} sub={T("bevCACSub")} positive={r.bevCAC > 0} />
              <MetricCard label={T("bevROAS")} value={`${r.bevROAS.toFixed(2)}x`} sub={T("bevROASSub")} positive={r.bevROAS >= 2} />
              <MetricCard label={T("safeCAC")} value={fmtCurr(r.safeCAC)} sub={T("safeCACSub")} positive={true} />
              <MetricCard label={T("targetROAS")} value={`${r.targetROAS.toFixed(2)}x`} sub={T("targetROASSub")} positive={r.targetROAS >= 2} />
            </div>

            {/* Per 100 Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{T("per100Summary")}</h3>
              <div className="overflow-x-auto text-xs sm:text-sm">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      [T("totalRevenue"), fmtCurr(r.revenue), true],
                      [T("costDelivered"), `- ${fmtCurr(Math.round(r.deliveredCost))}`, false],
                      [T("costRTO"), `- ${fmtCurr(Math.round(r.rtoCost))}`, false],
                      [T("operatingProfit"), fmtCurr(Math.round(r.operatingProfit)), r.operatingProfit >= 0],
                    ].map(([label, val, positive], i) => (
                      <tr key={i} className={i === 3 ? "border-t-2 border-gray-300 dark:border-gray-600" : ""}>
                        <td className={`py-1.5 sm:py-2 ${i === 3 ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>{label}</td>
                        <td className={`py-1.5 sm:py-2 font-mono font-semibold ${isRtl ? "text-left" : "text-right"} ${
                          i === 3 ? (r.operatingProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                            : positive ? "text-gray-900 dark:text-gray-100" : "text-red-500"
                        }`}>{val as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CAC Health Zone with slider */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ScaleIcon className="w-4 h-4 shrink-0" /> {T("cacHealthZone")}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold ${
                  zoneKey === "safe"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : zoneKey === "warning"
                      ? "bg-yellow-500/15 border border-yellow-500/30 text-yellow-400"
                      : "bg-red-500/15 border border-red-500/30 text-red-400"
                }`}>
                  {zoneKey === "safe"
                    ? <><CheckCircleIcon className="w-3.5 h-3.5" /> {T("safeZone")}</>
                    : zoneKey === "warning"
                      ? <><ExclamationCircleIcon className="w-3.5 h-3.5" /> {T("warningZone")}</>
                      : <><XCircleIcon className="w-3.5 h-3.5" /> {T("dangerZone")}</>
                  }
                </span>
              </div>
              <div className="space-y-1">
                <div className="relative h-5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500/70 transition-all duration-300" style={{ width: `${safeWidth}%` }} />
                  <div className="bg-yellow-500/70 transition-all duration-300" style={{ width: `${warningWidth}%` }} />
                  <div className="bg-red-500/70 transition-all duration-300" style={{ width: `${dangerWidth}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0</span>
                  <span className="text-emerald-400">{T("safe")}: {fmtCurr(r.safeCAC)}</span>
                  <span className="text-yellow-400">{T("breakEven")}: {fmtCurr(r.bevCAC)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                  <span className="text-gray-500">{T("safe")}</span>
                  <div className="font-semibold text-emerald-500 font-mono">{fmtCurr(Math.round(r.safeCAC))}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                  <span className="text-gray-500">{T("breakEven")}</span>
                  <div className="font-semibold text-yellow-500 font-mono">{fmtCurr(Math.round(r.bevCAC))}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                  <span className="text-gray-500">{T("bevROAS")}</span>
                  <div className="font-semibold text-blue-500 font-mono">{r.bevROAS.toFixed(2)}x</div>
                </div>
              </div>
            </div>

            {/* Cost Impact Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("costImpact")}
              </h3>
              <div className="space-y-2">
                {costChartData.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(Math.round(d.value))} {sym(currency)}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (d.value / maxCostChart) * 100)}%`, backgroundColor: d.fill }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What-If Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <WhatIfButton
                  label={T("whatIfDelivery")}
                  emoji="🎯"
                  desc={T("whatIfDeliveryDesc")}
                  active={activeAction === "delivery80"}
                  impact={whatIfAll.delivery80.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("delivery80")}
                />
                <WhatIfButton
                  label={T("whatIfCOGS")}
                  emoji="📦"
                  desc={T("whatIfCOGSDesc")}
                  active={activeAction === "cogs90"}
                  impact={whatIfAll.cogs90.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("cogs90")}
                />
                <WhatIfButton
                  label={T("whatIfRTO")}
                  emoji="📉"
                  desc={T("whatIfRTODesc")}
                  active={activeAction === "rtoCut20"}
                  impact={whatIfAll.rtoCut20.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("rtoCut20")}
                />
              </div>
              {activeAction && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{T("whatIfComparison")}</span>
                    <button onClick={revertWhatIf} className="text-[10px] text-red-400 hover:text-red-600 underline">{T("whatIfReset")}</button>
                  </div>
                  <WhatIfRow label={T("bevCAC")} base={fmtCurr(Math.round(r.bevCAC))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.bevCAC))} positive={whatIfAll[activeAction].result.bevCAC >= r.bevCAC} />
                  <WhatIfRow label={T("bevROAS")} base={`${r.bevROAS.toFixed(2)}x`} projected={`${whatIfAll[activeAction].result.bevROAS.toFixed(2)}x`} positive={whatIfAll[activeAction].result.bevROAS <= r.bevROAS} />
                  <WhatIfRow label={T("operatingProfit")} base={fmtCurr(Math.round(r.operatingProfit))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.operatingProfit))} positive={whatIfAll[activeAction].result.operatingProfit >= r.operatingProfit} />
                </div>
              )}
            </div>

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

            {/* Formula Accordion */}
            <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <InformationCircleIcon className="w-4 h-4 shrink-0" /> {T("howItWorks")}
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
                      [T("stepConfirmed"), `100 × ${inputs.confirmationRate}%`, `${fmt1(r.confirmed)}`],
                      [T("stepDelivered"), `${fmt1(r.confirmed)} × ${inputs.deliveryRate}%`, `${fmt1(r.delivered)} / ${fmt1(r.rto)} RTO`],
                      [T("stepRevenue"), `${fmt1(r.delivered)} × ${fmtCurr(inputs.aov)}`, fmtCurr(Math.round(r.revenue))],
                      [T("stepCostDelivered"), `${fmt1(r.delivered)} × ${fmtCurr(r.costPerDelivered)}`, `- ${fmtCurr(Math.round(r.deliveredCost))}`],
                      [T("stepCostRTO"), `${fmt1(r.rto)} × ${fmtCurr(r.costPerRTO)}`, `- ${fmtCurr(Math.round(r.rtoCost))}`],
                      [T("stepOperatingProfit"), `${T("stepRevenue")} − ${T("stepCost")}`, fmtCurr(Math.round(r.operatingProfit))],
                      [T("stepBevCAC"), `${T("stepOperatingProfit")} ÷ 100`, fmtCurr(Math.round(r.bevCAC))],
                      [T("stepBevROAS"), `${fmtCurr(Math.round(r.revenue))} ÷ ${fmtCurr(Math.round(r.operatingProfit))}`, `${r.bevROAS.toFixed(2)}x`],
                      [T("stepSafeCAC"), `${fmtCurr(Math.round(r.bevCAC))} × 80%`, fmtCurr(Math.round(r.safeCAC))],
                      [T("stepTargetROAS"), `${fmtCurr(Math.round(r.revenue))} ÷ (${fmtCurr(Math.round(r.safeCAC))} × 100)`, `${r.targetROAS.toFixed(2)}x`],
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

          </div>
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

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function WhatIfButton({ label, emoji, desc, active, impact, curr, onClick }: {
  label: string; emoji: string; desc: string; active: boolean; impact: number | null; curr: (v: number) => string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all ${
        active
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400"
          : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
      }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{emoji}</span>
        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
      </div>
      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">{desc}</div>
      {impact !== null && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className={impact >= 0 ? "text-emerald-500" : "text-red-500"}>{impact >= 0 ? "+" : ""}{curr(Math.round(impact))}</span>
          <span className="text-gray-400">B-EV CAC impact</span>
        </div>
      )}
    </button>
  );
}

function WhatIfRow({ label, base, projected, positive }: { label: string; base: string; projected: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{base}</span>
        <span className="text-gray-300">→</span>
        <span className={`font-semibold font-mono ${positive ? "text-emerald-500" : "text-red-500"}`}>{projected}</span>
      </div>
    </div>
  );
}
