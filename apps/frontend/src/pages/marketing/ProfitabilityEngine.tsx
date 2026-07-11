import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon,
  BookmarkIcon as SaveIcon, TrashIcon, DocumentTextIcon,
  SparklesIcon, ScaleIcon, ArrowPathIcon,
  PrinterIcon, ArrowDownTrayIcon, CheckIcon, XMarkIcon,
  ShieldCheckIcon, RocketLaunchIcon,
  CheckCircleIcon, ExclamationCircleIcon, XCircleIcon,
  ArrowTrendingUpIcon, CubeIcon, Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import SliderInput from "@/components/common/SliderInput";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

interface Inputs {
  aov: number; ordersPerDay: number; confirmationRate: number; deliveryRate: number;
  cogs: number; packingFees: number; shippingFees: number; rtoFees: number;
  fixedCosts: number; cpp: number;
}

interface Results {
  monthlyOrdersPlaced: number; ordersConfirmed: number; ordersDelivered: number; ordersRTO: number;
  revenue: number; variableCostDelivered: number; variableCostRTO: number; totalVariableCost: number;
  adSpend: number; grossProfit: number; grossProfitMargin: number;
  fixedCosts: number; netProfit: number; netProfitMargin: number; profitPerOrder: number;
  totalCosts: number; contributionPerOrder: number; breakEvenOrders: number;
  isAchievable: boolean; daysToBreakEven: number; bevCAC: number; safeCAC: number; netBreakEvenCPP: number;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; currency: string; }

type WhatIfField = "aov" | "cpp" | "deliveryRate" | "ordersPerDay";

const PRESETS: Record<string, Inputs> = {
  Conservative: { aov: 700, ordersPerDay: 30, confirmationRate: 65, deliveryRate: 75, cogs: 300, packingFees: 30, shippingFees: 70, rtoFees: 45, fixedCosts: 100000, cpp: 150 },
  Balanced: { aov: 900, ordersPerDay: 50, confirmationRate: 70, deliveryRate: 80, cogs: 350, packingFees: 35, shippingFees: 80, rtoFees: 50, fixedCosts: 150000, cpp: 200 },
  Aggressive: { aov: 1200, ordersPerDay: 100, confirmationRate: 75, deliveryRate: 85, cogs: 400, packingFees: 40, shippingFees: 90, rtoFees: 55, fixedCosts: 250000, cpp: 250 },
};

const STORAGE_KEY = "maxp_profitability_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();

function computeProfitability(inputs: Inputs): Results {
  const { aov, ordersPerDay, confirmationRate, deliveryRate, cogs, packingFees, shippingFees, rtoFees, fixedCosts, cpp } = inputs;
  const cr = confirmationRate / 100, dr = deliveryRate / 100;
  const monthlyOrdersPlaced = ordersPerDay * 30;
  const ordersConfirmed = monthlyOrdersPlaced * cr;
  const ordersDelivered = ordersConfirmed * dr;
  const ordersRTO = ordersConfirmed - ordersDelivered;
  const revenue = ordersDelivered * aov;
  const costPerDelivered = cogs + packingFees + shippingFees;
  const rtoUnitCost = packingFees + rtoFees;
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
  return { monthlyOrdersPlaced, ordersConfirmed, ordersDelivered, ordersRTO, revenue, variableCostDelivered, variableCostRTO, totalVariableCost, adSpend, grossProfit, grossProfitMargin, fixedCosts, netProfit, netProfitMargin, profitPerOrder, totalCosts, contributionPerOrder, breakEvenOrders, isAchievable, daysToBreakEven, bevCAC, safeCAC, netBreakEvenCPP };
}

function currencyValue(v: number, currency: string): string {
  const rate = CURRENCY_RATES[currency] || 1;
  return `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`;
}

export default function ProfitabilityEngine() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const printRef = useRef<HTMLDivElement>(null);

  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...PRESETS.Balanced });
  const [adMode, setAdMode] = useState<"cpp" | "total">("cpp");
  const [totalBudget, setTotalBudget] = useState(300000);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeProfile, setActiveProfile] = useState("Balanced");
  const [whatIfAdjustments, setWhatIfAdjustments] = useState<Record<WhatIfField, number>>({ aov: 0, cpp: 0, deliveryRate: 0, ordersPerDay: 0 });

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = (v: number) => currencyValue(v, currency);

  const results = useMemo(() => computeProfitability(inputs), [inputs]);

  const whatIfInputs = useMemo<Inputs>(() => {
    const adj = whatIfAdjustments;
    return {
      ...inputs,
      aov: Math.max(50, inputs.aov + adj.aov),
      cpp: Math.max(0, inputs.cpp + adj.cpp),
      deliveryRate: Math.max(0, Math.min(100, inputs.deliveryRate + adj.deliveryRate)),
      ordersPerDay: Math.max(1, inputs.ordersPerDay + adj.ordersPerDay),
    };
  }, [inputs, whatIfAdjustments]);

  const whatIfResults = useMemo(() => whatIfAdjustments.aov !== 0 || whatIfAdjustments.cpp !== 0 || whatIfAdjustments.deliveryRate !== 0 || whatIfAdjustments.ordersPerDay !== 0 ? computeProfitability(whatIfInputs) : null, [whatIfInputs, whatIfAdjustments]);

  const profitColor = results.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const profitBg = results.netProfit >= 0 ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10";

  const zoneKey = results.netProfit >= 0
    ? (inputs.cpp <= results.safeCAC ? "safe" : "warning")
    : "danger";

  const waterfallData = useMemo(() => [
    { name: t("profitabilityEngine.revenue"), value: results.revenue * conversionRate, fill: "hsl(142 76% 36%)" },
    { name: t("profitabilityEngine.variableCosts"), value: -results.totalVariableCost * conversionRate, fill: "hsl(0 84% 60%)" },
    { name: t("profitabilityEngine.adSpend"), value: -results.adSpend * conversionRate, fill: "hsl(0 84% 60%)" },
    { name: t("profitabilityEngine.grossProfit"), value: results.grossProfit * conversionRate, fill: results.grossProfit >= 0 ? "hsl(189 96% 52%)" : "hsl(0 84% 60%)" },
    { name: t("profitabilityEngine.fixedCosts"), value: -inputs.fixedCosts * conversionRate, fill: "hsl(0 84% 60%)" },
    { name: t("profitabilityEngine.netProfit"), value: results.netProfit * conversionRate, fill: results.netProfit >= 0 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)" },
  ], [results, conversionRate, inputs.fixedCosts, t]);

  const maxScale = Math.max(results.netBreakEvenCPP > 0 ? results.netBreakEvenCPP * 1.4 : 0, inputs.cpp * 1.2, 10);
  const safeWidth = results.netBreakEvenCPP > 0 ? Math.min(100, (results.safeCAC / maxScale) * 100) : 0;
  const warningWidth = results.netBreakEvenCPP > 0 ? Math.min(100, Math.max(0, ((results.netBreakEvenCPP - results.safeCAC) / maxScale) * 100)) : 0;
  const dangerWidth = Math.max(0, 100 - safeWidth - warningWidth);
  const cppMarker = Math.min(100, (inputs.cpp / maxScale) * 100);

  const alerts = useMemo(() => {
    const M: { type: "error" | "warn" | "info"; msg: string }[] = [];
    if (results.netProfit < 0) M.push({ type: "error", msg: t("profitabilityEngine.alertLoss", { amount: fmtCurr(Math.abs(results.netProfit)) }) });
    if (results.daysToBreakEven > 30 && results.isAchievable) M.push({ type: "error", msg: t("profitabilityEngine.alertBreakEvenDays", { days: results.daysToBreakEven.toFixed(1) }) });
    if (inputs.cpp > results.bevCAC) M.push({ type: "warn", msg: t("profitabilityEngine.alertCppExceeds", { cpp: fmtCurr(inputs.cpp), bev: fmtCurr(results.bevCAC) }) });
    if (results.netProfitMargin >= 20) M.push({ type: "info", msg: t("profitabilityEngine.alertHealthyMargin", { margin: results.netProfitMargin.toFixed(1) }) });
    return M;
  }, [results, inputs, currency, t, fmtCurr]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];
    if (inputs.cpp > results.safeCAC) {
      const targetCpp = Math.round(results.safeCAC);
      R.push({ icon: <ScaleIcon className="w-5 h-5 text-amber-500" />, title: t("profitabilityEngine.recReduceCpp"), desc: t("profitabilityEngine.recReduceCppDesc", { target: fmtCurr(targetCpp), current: fmtCurr(inputs.cpp), saving: fmtCurr(Math.round((inputs.cpp - targetCpp) * results.monthlyOrdersPlaced)) }) });
    }
    if (inputs.deliveryRate < 80) {
      const improvement = Math.round((80 - inputs.deliveryRate) / 2);
      R.push({ icon: <CubeIcon className="w-5 h-5 text-blue-500" />, title: t("profitabilityEngine.recImproveDelivery"), desc: t("profitabilityEngine.recImproveDeliveryDesc", { rate: inputs.deliveryRate, target: Math.min(100, inputs.deliveryRate + improvement * 2), improvement }) });
    }
    if (results.netProfit < 0) {
      const neededAov = Math.ceil(results.revenue / results.ordersDelivered + Math.abs(results.netProfit) / results.ordersDelivered);
      R.push({ icon: <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />, title: t("profitabilityEngine.recIncreaseAov"), desc: t("profitabilityEngine.recIncreaseAovDesc", { target: fmtCurr(neededAov), current: fmtCurr(inputs.aov), diff: fmtCurr(neededAov - inputs.aov) }) });
    }
    if (results.grossProfitMargin < 20) {
      const targetCogs = Math.round((inputs.aov - (inputs.aov * 0.2) - inputs.packingFees - inputs.shippingFees));
      if (targetCogs > 0 && targetCogs < inputs.cogs) R.push({ icon: <Cog6ToothIcon className="w-5 h-5 text-purple-500" />, title: t("profitabilityEngine.recReduceCogs"), desc: t("profitabilityEngine.recReduceCogsDesc", { target: fmtCurr(targetCogs), current: fmtCurr(inputs.cogs), diff: fmtCurr(inputs.cogs - targetCogs) }) });
    }
    return R;
  }, [inputs, results, currency, t, fmtCurr]);

  const applyPreset = (name: string) => {
    setActiveProfile(name); setInputs({ ...PRESETS[name] });
  };

  const handleAdModeToggle = (mode: "cpp" | "total") => {
    if (mode === "total" && adMode === "cpp") setTotalBudget(inputs.cpp * inputs.ordersPerDay * 30);
    if (mode === "cpp" && adMode === "total") {
      const d = inputs.ordersPerDay * 30;
      setInputs((p) => ({ ...p, cpp: d > 0 ? Math.round(totalBudget / d) : 0 }));
    }
    setAdMode(mode);
  };

  const saveScenario = () => {
    if (saved.length >= 4) return;
    const names = ["Scenario A", "Scenario B", "Scenario C", "Scenario D"];
    const n = scenarioName.trim() || names[saved.length];
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => { setInputs({ ...s.inputs }); setCurrency(s.currency); };
  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  const [printMode, setPrintMode] = useState(false);
  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => { window.print(); setPrintMode(false); }, 100);
  };

  const handleExportCSV = () => {
    const rows = [
      [t("profitabilityEngine.metric"), t("profitabilityEngine.value")],
      [t("profitabilityEngine.monthlyOrdersPlaced"), results.monthlyOrdersPlaced],
      [t("profitabilityEngine.ordersConfirmed"), results.ordersConfirmed.toFixed(1)],
      [t("profitabilityEngine.ordersDelivered"), results.ordersDelivered.toFixed(1)],
      [t("profitabilityEngine.ordersRTO"), results.ordersRTO.toFixed(1)],
      [t("profitabilityEngine.revenue"), fmtCurr(results.revenue)],
      [t("profitabilityEngine.totalVariableCost"), fmtCurr(results.totalVariableCost)],
      [t("profitabilityEngine.adSpend"), fmtCurr(results.adSpend)],
      [t("profitabilityEngine.grossProfit"), fmtCurr(results.grossProfit)],
      [t("profitabilityEngine.netProfit"), fmtCurr(results.netProfit)],
      [t("profitabilityEngine.netProfitMargin"), `${results.netProfitMargin.toFixed(1)}%`],
      [t("profitabilityEngine.breakEvenOrders"), isFinite(results.breakEvenOrders) ? results.breakEvenOrders.toString() : "∞"],
      [t("profitabilityEngine.daysToBreakEven"), isFinite(results.daysToBreakEven) ? results.daysToBreakEven.toString() : "∞"],
      [t("profitabilityEngine.bevCAC"), fmtCurr(results.bevCAC)],
      [t("profitabilityEngine.safeCAC"), fmtCurr(results.safeCAC)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "profitability-engine.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatIfChange = (field: WhatIfField, delta: number) =>
    setWhatIfAdjustments((p) => ({ ...p, [field]: p[field] + delta }));

  const resetWhatIf = () => setWhatIfAdjustments({ aov: 0, cpp: 0, deliveryRate: 0, ordersPerDay: 0 });

  const T = (k: string) => t(`profitabilityEngine.${k}`);

  const WhatIfChip: React.FC<{ label: string; field: WhatIfField; value: number }> = ({ label, field, value }) => (
    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => handleWhatIfChange(field, -value)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold">−</button>
        <span className="w-14 text-center text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">
          {whatIfAdjustments[field] > 0 ? "+" : ""}{whatIfAdjustments[field]}
        </span>
        <button onClick={() => handleWhatIfChange(field, value)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold">+</button>
      </div>
    </div>
  );

  const WhatIfResult: React.FC<{ label: string; base: number; projected: number; fmt?: (v: number) => string }> = ({ label, base, projected, fmt: vfmt }) => {
    const vf = vfmt || fmtCurr;
    const diff = projected - base;
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{vf(base)}</span>
          <span className="text-gray-300">→</span>
          <span className={`font-semibold font-mono ${diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>{vf(projected)}</span>
          <span className={`text-[10px] font-mono ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4 ${printMode ? "print-mode" : ""}`} dir={i18n.dir()} ref={printRef}>
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

        {/* Presets + Save + Export */}
        <div className="flex flex-wrap gap-2 items-center">
          {Object.keys(PRESETS).map((name) => (
            <button key={name} onClick={() => applyPreset(name)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                activeProfile === name
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}>
              {name === "Conservative" ? <ShieldCheckIcon className="w-4 h-4 shrink-0" /> : name === "Balanced" ? <ScaleIcon className="w-4 h-4 shrink-0" /> : <RocketLaunchIcon className="w-4 h-4 shrink-0" />} {T(name.toLowerCase())}
            </button>
          ))}
          <span className="text-gray-300 dark:text-gray-700 mx-1 hidden sm:inline">|</span>

          {/* Save scenario */}
          <div className="flex items-center gap-1">
            <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder={T("scenarioNamePlaceholder")}
              className="w-24 sm:w-32 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
            <button onClick={saveScenario} disabled={saved.length >= 4}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed">
              <SaveIcon className="w-3.5 h-3.5 shrink-0" /> {T("save")} ({saved.length}/4)
            </button>
          </div>
          {saved.map((sc) => (
            <div key={sc.id} className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => loadScenario(sc)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 truncate max-w-20 sm:max-w-none">{sc.name}</button>
              <button onClick={() => deleteScenario(sc.id)} className="text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="w-3 h-3" /></button>
            </div>
          ))}

          <span className="text-gray-300 dark:text-gray-700 mx-1 hidden sm:inline">|</span>
          <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <PrinterIcon className="w-3.5 h-3.5 shrink-0" /> {T("print")}
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" /> CSV
          </button>
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
            <Card title={T("revenueVolume")} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
              <SliderInput currencySymbol={sym(currency)} label={T("ordersPerDay")} value={inputs.ordersPerDay} min={1} max={500} step={1} onChange={set("ordersPerDay")} />
              <SliderInput currencySymbol={sym(currency)} label={T("confirmationRate")} value={inputs.confirmationRate} min={0} max={100} step={5} isPercent onChange={set("confirmationRate")} />
              <SliderInput currencySymbol={sym(currency)} label={T("deliveryRate")} value={inputs.deliveryRate} min={0} max={100} step={5} isPercent onChange={set("deliveryRate")} />
              {/* Order funnel preview */}
              <div className="pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500"><span>{T("monthlyPlaced")}</span><span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{fmt(results.monthlyOrdersPlaced)}</span></div>
                <div className="flex justify-between text-gray-500"><span>{T("monthlyConfirmed")}</span><span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{fmt(results.ordersConfirmed)}</span></div>
                <div className="flex justify-between text-gray-500"><span>{T("monthlyDelivered")}</span><span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{fmt(results.ordersDelivered)}</span></div>
                <div className="flex justify-between text-gray-500"><span>{T("monthlyRTO")}</span><span className="font-mono font-semibold text-red-500">{fmt(results.ordersRTO)}</span></div>
              </div>
            </Card>

            <Card title={T("variableCosts")} icon={<ChartBarIcon className="w-5 h-5 text-purple-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("cogs")} value={inputs.cogs} min={0} max={3000} step={10} onChange={set("cogs")} />
              <SliderInput currencySymbol={sym(currency)} label={T("packingFees")} value={inputs.packingFees} min={0} max={200} step={5} onChange={set("packingFees")} />
              <SliderInput currencySymbol={sym(currency)} label={T("shippingFees")} value={inputs.shippingFees} min={0} max={500} step={10} onChange={set("shippingFees")} />
              <SliderInput currencySymbol={sym(currency)} label={T("rtoFees")} value={inputs.rtoFees} min={0} max={300} step={10} onChange={set("rtoFees")} />
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><span className="text-gray-500">{T("costPerDelivered")}</span><div className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(inputs.cogs + inputs.packingFees + inputs.shippingFees)}</div></div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><span className="text-gray-500">{T("rtoUnitCost")}</span><div className="font-semibold text-red-500">{fmtCurr(inputs.packingFees + inputs.rtoFees)}</div></div>
              </div>
            </Card>

            <Card title={T("fixedMarketing")} icon={<ChartBarIcon className="w-5 h-5 text-orange-500" />}>
              <SliderInput currencySymbol={sym(currency)} label={T("fixedCosts")} value={inputs.fixedCosts} min={0} max={500000} step={1000} onChange={set("fixedCosts")} />
              <div className="space-y-2">
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 text-[11px] font-mono font-semibold w-fit">
                  {(["cpp", "total"] as const).map((mode) => (
                    <button key={mode} onClick={() => handleAdModeToggle(mode)}
                      className={`px-2.5 py-1 rounded-md transition-all ${adMode === mode ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"}`}>
                      {mode === "cpp" ? T("cppMode") : T("totalBudgetMode")}
                    </button>
                  ))}
                </div>
                {adMode === "cpp" ? (
                  <>
                    <SliderInput currencySymbol={sym(currency)} label={T("cpp")} value={inputs.cpp} min={0} max={1000} step={10} onChange={set("cpp")} />
                    <div className="text-xs text-gray-500">{T("totalAdSpend")}: <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(results.adSpend)}</span></div>
                  </>
                ) : (
                  <>
                    <SliderInput currencySymbol={sym(currency)} label={T("totalBudget")} value={totalBudget} min={0} max={2000000} step={10000}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = parseFloat(e.target.value) || 0;
                        setTotalBudget(v);
                        const d = inputs.ordersPerDay * 30;
                        setInputs((p) => ({ ...p, cpp: d > 0 ? Math.round(v / d) : 0 }));
                      }} />
                    <div className="text-xs text-gray-500">{T("derivedCpp")}: <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(inputs.cpp)}</span></div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* Net Profit Card */}
            <div className={`rounded-xl border p-4 sm:p-6 ${profitBg} ${printMode ? "print:border print:shadow-none" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-gray-500">{T("monthlyNetProfit")}</span>
                {results.netProfit >= 0 ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <XMarkIcon className="w-5 h-5 text-red-500" />}
              </div>
              <div className={`text-3xl sm:text-4xl font-mono font-bold mb-1 ${profitColor}`}>{fmtCurr(results.netProfit)}</div>
              <div className="text-sm text-gray-500">
                {T("margin")}: <span className={`font-mono font-semibold ${profitColor}`}>{results.netProfitMargin.toFixed(1)}%</span>
                {" - "}
                <span className={`font-mono font-semibold ${profitColor}`}>{fmtCurr(results.profitPerOrder)}</span> {T("perDeliveredOrder")}
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard label={T("monthlyRevenue")} value={fmtCurr(results.revenue)} positive={results.revenue > 0} />
              <MetricCard label={T("totalCosts")} value={fmtCurr(results.totalCosts)} positive={false} />
              <MetricCard label={T("grossProfit")} value={fmtCurr(results.grossProfit)} sub={`${results.grossProfitMargin.toFixed(1)}%`} positive={results.grossProfit >= 0} />
              <MetricCard label={T("adSpendShort")} value={fmtCurr(results.adSpend)} sub={`${results.netProfitMargin >= 0 ? "" : ""}`} positive={results.netProfitMargin >= 15} />
              <MetricCard label={T("breakEvenOrders")} value={isFinite(results.breakEvenOrders) ? fmt(results.breakEvenOrders) : "∞"} sub={results.isAchievable ? T("achievable") : T("notAchievable")} positive={results.isAchievable} />
              <MetricCard label={T("daysToBreakEven")} value={isFinite(results.daysToBreakEven) ? fmt(results.daysToBreakEven) : "∞"} sub={results.daysToBreakEven <= 30 && results.isAchievable ? T("goodTimeline") : T("longTimeline")} positive={results.daysToBreakEven <= 30 && results.isAchievable} />
            </div>

            {/* P&L Breakdown Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{T("pnlBreakdown")}</h3>
              <div className="overflow-x-auto text-xs sm:text-sm">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      [T("monthlyRevenue"), fmtCurr(results.revenue), true],
                      [T("variableCostsShort"), `- ${fmtCurr(results.totalVariableCost)}`, results.totalVariableCost > 0],
                      [T("adSpendShort"), `- ${fmtCurr(results.adSpend)}`, results.adSpend > 0],
                      [T("grossProfit"), fmtCurr(results.grossProfit), results.grossProfit >= 0],
                      [T("fixedCosts"), `- ${fmtCurr(inputs.fixedCosts)}`, true],
                      [T("netProfit"), fmtCurr(results.netProfit), results.netProfit >= 0],
                    ].map(([label, val, positive], i) => (
                      <tr key={i} className={i === 4 ? "border-t-2 border-gray-300 dark:border-gray-600" : ""}>
                        <td className={`py-1.5 sm:py-2 text-${i === 5 ? "gray-900 dark:text-gray-100 font-bold" : "gray-600 dark:text-gray-400"}`}>{label}</td>
                        <td className={`py-1.5 sm:py-2 font-mono font-semibold ${isRtl ? "text-left" : "text-right"} ${
                          i === 5 ? (results.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                            : positive ? "text-gray-900 dark:text-gray-100" : "text-red-500"
                        }`}>{val as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Waterfall Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("costWaterfall")}
              </h3>
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" strokeOpacity={0.4} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <ReferenceLine y={0} stroke="hsl(217 33% 30%)" strokeDasharray="3 3" />
                    <Tooltip cursor={{ fill: "hsl(189 96% 52% / 0.08)" }}
                      contentStyle={{ background: "hsl(222 35% 12%)", border: "1px solid hsl(189 96% 52% / 0.4)", borderRadius: 8, fontSize: 11, color: "hsl(210 40% 96%)" }}
                      labelStyle={{ color: "hsl(210 40% 96%)", fontWeight: 600, marginBottom: 4 }}
                      formatter={(v: number) => [`${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, ""]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} activeBar={false}>
                      {waterfallData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CAC Health Zone */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <ScaleIcon className="w-4 h-4 shrink-0" /> {T("cacHealthZone")}
              </h3>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                zoneKey === "safe" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : zoneKey === "warning" ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}>
                {zoneKey === "safe" ? <CheckCircleIcon className="w-4 h-4" /> : zoneKey === "warning" ? <ExclamationCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />} {zoneKey === "safe" ? T("safeZone") : zoneKey === "warning" ? T("warningZone") : T("dangerZone")}
                <span className="font-mono"> - {T("cppShort")}: {fmtCurr(inputs.cpp)}</span>
              </div>
              <div className="space-y-1">
                <div className="relative h-5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500/70 transition-all duration-300" style={{ width: `${safeWidth}%` }} />
                  <div className="bg-yellow-500/70 transition-all duration-300" style={{ width: `${warningWidth}%` }} />
                  <div className="bg-red-500/70 transition-all duration-300" style={{ width: `${dangerWidth}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-200 shadow-[0_0_6px_rgba(255,255,255,0.8)]" style={{ left: `${cppMarker}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0</span>
                  <span className="text-emerald-400">{T("safe")}: {fmtCurr(results.safeCAC)}</span>
                  <span className="text-yellow-400">{T("breakEven")}: {results.netBreakEvenCPP > 0 ? fmtCurr(results.netBreakEvenCPP) : "N/A"}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><span className="text-gray-500">{T("cppShort")}</span><div className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurr(inputs.cpp)}</div></div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><span className="text-gray-500">{T("bevCAC")}</span><div className="font-semibold text-emerald-500">{fmtCurr(results.bevCAC)}</div></div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2"><span className="text-gray-500">{T("netBevCPP")}</span><div className="font-semibold text-yellow-500">{fmtCurr(results.netBreakEvenCPP)}</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* What-If Simulator */}
        <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            <ArrowPathIcon className="w-4 h-4 shrink-0" /> {T("whatIfTitle")} <span className="text-gray-400 font-normal">({T("whatIfDesc")})</span>
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <WhatIfChip label={T("aov")} field="aov" value={50} />
              <WhatIfChip label={T("cpp")} field="cpp" value={25} />
              <WhatIfChip label={T("deliveryRate")} field="deliveryRate" value={5} />
              <WhatIfChip label={T("ordersPerDay")} field="ordersPerDay" value={10} />
            </div>
            {whatIfResults && (
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{T("whatIfComparison")}</span>
                  <button onClick={resetWhatIf} className="text-[10px] text-red-400 hover:text-red-600 underline">{T("whatIfReset")}</button>
                </div>
                <WhatIfResult label={T("netProfit")} base={results.netProfit} projected={whatIfResults.netProfit} />
                <WhatIfResult label={T("monthlyRevenue")} base={results.revenue} projected={whatIfResults.revenue} />
                <WhatIfResult label={T("grossProfit")} base={results.grossProfit} projected={whatIfResults.grossProfit} />
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">{T("breakEvenOrders")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{isFinite(results.breakEvenOrders) ? fmt(results.breakEvenOrders) : "∞"}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-semibold font-mono text-gray-900 dark:text-gray-100">{isFinite(whatIfResults.breakEvenOrders) ? fmt(whatIfResults.breakEvenOrders) : "∞"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">{T("daysToBreakEven")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{isFinite(results.daysToBreakEven) ? fmt(results.daysToBreakEven) : "∞"}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-semibold font-mono text-gray-900 dark:text-gray-100">{isFinite(whatIfResults.daysToBreakEven) ? fmt(whatIfResults.daysToBreakEven) : "∞"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>

        {/* AI Recommendations */}
        <details className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            <SparklesIcon className="w-4 h-4 shrink-0" /> {T("recommendations")} {recommendations.length > 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{recommendations.length}</span>}
          </summary>
          {recommendations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0">{r.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
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
                  [T("stepMonthlyOrders"), `${T("ordersPerDay")} × 30`, `${fmt(results.monthlyOrdersPlaced)}`],
                  [T("stepOrdersConfirmed"), `${fmt(results.monthlyOrdersPlaced)} × ${inputs.confirmationRate}%`, `${fmt(results.ordersConfirmed)}`],
                  [T("stepOrdersDelivered"), `${fmt(results.ordersConfirmed)} × ${inputs.deliveryRate}%`, `${fmt(results.ordersDelivered)} ${T("delivered")} / ${fmt(results.ordersRTO)} RTO`],
                  [T("stepRevenue"), `${fmt(results.ordersDelivered)} × AOV ${fmtCurr(inputs.aov)}`, fmtCurr(results.revenue)],
                  [T("stepVariableCosts"), `${T("costPerDelivered")} + ${T("rtoCost")}`, fmtCurr(results.totalVariableCost)],
                  [T("stepAdSpend"), `${fmt(results.monthlyOrdersPlaced)} × CPP ${fmtCurr(inputs.cpp)}`, fmtCurr(results.adSpend)],
                  [T("stepGrossProfit"), `${T("revenue")} − ${T("variableCostsShort")} − ${T("adSpendShort")}`, fmtCurr(results.grossProfit)],
                  [T("stepNetProfit"), `${T("grossProfit")} − ${T("fixedCosts")}`, fmtCurr(results.netProfit)],
                  [T("stepMargin"), `${T("netProfit")} ÷ ${T("revenue")} × 100`, `${results.netProfitMargin.toFixed(1)}%`],
                  [T("stepBreakEven"), `${T("fixedCosts")} ÷ ${T("contributionPerOrder")}`, `${isFinite(results.breakEvenOrders) ? fmt(results.breakEvenOrders) : "∞"} ${T("orders")}`],
                  [T("stepDaysToBE"), `${T("breakEvenOrders")} ÷ ${T("ordersPerDay")}`, `${isFinite(results.daysToBreakEven) ? fmt(results.daysToBreakEven) : "∞"} ${T("days")}`],
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

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
