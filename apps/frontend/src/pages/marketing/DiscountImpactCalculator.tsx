import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  CalculatorIcon, ChartBarIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ArrowTrendingUpIcon,
  BookmarkIcon as SaveIcon, TrashIcon,
  SparklesIcon, CheckCircleIcon,
  ArrowPathIcon, ScaleIcon,
  ShoppingCartIcon, GiftIcon,
  TruckIcon, CubeIcon, TagIcon,
} from "@heroicons/react/24/outline";

const CURRENCIES = ["EGP", "SAR", "USD"] as const;
const CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
const CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
const sym = (code: string) => CURRENCY_SYMBOLS[code] || code;

type DiscountTab = "product" | "order" | "bogo" | "freeShipping" | "quantity";
type Preset = "small" | "medium" | "flash";

interface Inputs {
  originalPrice: number;
  aov: number;
  cogs: number;
  cogsPerItem: number;
  itemsPerOrder: number;
  shipping: number;
  adCost: number;
  discountPct: number;
  currentOrders: number;
  expectedLift: number;
}

interface Results {
  totalCostPerUnit: number;
  priceBefore: number;
  priceAfter: number;
  profitPerUnitBefore: number;
  profitPerUnitAfter: number;
  marginBeforePct: number;
  marginAfterPct: number;
  totalProfitBefore: number;
  totalProfitAfter: number;
  profitChange: number;
  profitChangePct: number;
  breakEvenOrders: number;
  requiredLiftPct: number;
  isLiftAchievable: boolean;
}

interface SavedScenario { id: string; name: string; inputs: Inputs; tab: DiscountTab; currency: string; }

type WhatIfAction = "halfDiscount" | "doubleLift" | "reduceCosts";

const getProductPresets = (p: Preset): Pick<Inputs, "originalPrice" | "cogs" | "shipping" | "adCost" | "discountPct" | "currentOrders" | "expectedLift"> => {
  if (p === "small") return { originalPrice: 800, cogs: 300, shipping: 70, adCost: 150, discountPct: 10, currentOrders: 150, expectedLift: 30 };
  if (p === "medium") return { originalPrice: 800, cogs: 300, shipping: 70, adCost: 150, discountPct: 20, currentOrders: 150, expectedLift: 50 };
  return { originalPrice: 800, cogs: 300, shipping: 70, adCost: 150, discountPct: 40, currentOrders: 150, expectedLift: 100 };
};

const DEFAULTS: Inputs = { originalPrice: 800, aov: 1200, cogs: 300, cogsPerItem: 250, itemsPerOrder: 2, shipping: 70, adCost: 150, discountPct: 20, currentOrders: 150, expectedLift: 50 };

const STORAGE_KEY = "maxp_discount_impact_saved";
const fmt = (n: number) => Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
const fmt1 = (n: number) => Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";

function compute(inputs: Inputs, tab: DiscountTab): Results {
  const { originalPrice, aov, cogs, cogsPerItem, itemsPerOrder, shipping, adCost, discountPct, currentOrders, expectedLift } = inputs;

  let priceBefore: number, priceAfter: number, totalCostPerUnit: number;

  switch (tab) {
    case "product": {
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      priceAfter = originalPrice * (1 - discountPct / 100);
      break;
    }
    case "order": {
      totalCostPerUnit = (cogsPerItem + adCost) * itemsPerOrder + shipping;
      priceBefore = aov;
      priceAfter = aov * (1 - discountPct / 100);
      break;
    }
    case "bogo": {
      totalCostPerUnit = (cogs + shipping + adCost) * 2;
      priceBefore = originalPrice * 2;
      priceAfter = originalPrice * 1;
      break;
    }
    case "freeShipping": {
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice + shipping;
      priceAfter = originalPrice * 1;
      break;
    }
    case "quantity": {
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      const effectiveQtyDiscount = Math.min(50, discountPct);
      priceAfter = originalPrice * (1 - effectiveQtyDiscount / 100);
      break;
    }
    default: {
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      priceAfter = originalPrice * (1 - discountPct / 100);
    }
  }

  const profitPerUnitBefore = priceBefore - totalCostPerUnit;
  const profitPerUnitAfter = priceAfter - totalCostPerUnit;
  const marginBeforePct = priceBefore > 0 ? (profitPerUnitBefore / priceBefore) * 100 : 0;
  const marginAfterPct = priceAfter > 0 ? (profitPerUnitAfter / priceAfter) * 100 : 0;
  const totalProfitBefore = profitPerUnitBefore * currentOrders;
  const projectedOrders = Math.round(currentOrders * (1 + expectedLift / 100));
  const totalProfitAfter = profitPerUnitAfter * projectedOrders;
  const profitChange = totalProfitAfter - totalProfitBefore;
  const profitChangePct = totalProfitBefore > 0 ? (profitChange / totalProfitBefore) * 100 : 0;
  const breakEvenOrders = profitPerUnitAfter > 0 ? Math.ceil(totalProfitBefore / profitPerUnitAfter) : Infinity;
  const requiredLiftPct = currentOrders > 0 ? ((breakEvenOrders / currentOrders - 1) * 100) : 0;
  const isLiftAchievable = requiredLiftPct <= expectedLift;

  return {
    totalCostPerUnit, priceBefore, priceAfter,
    profitPerUnitBefore, profitPerUnitAfter,
    marginBeforePct, marginAfterPct,
    totalProfitBefore, totalProfitAfter,
    profitChange, profitChangePct,
    breakEvenOrders, requiredLiftPct, isLiftAchievable,
  };
}

export default function DiscountImpactCalculator() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [tab, setTab] = useState<DiscountTab>("product");
  const [preset, setPreset] = useState<Preset>("medium");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setSaved(JSON.parse(d)); } catch { /* ignore */ }
  }, []);

  const persist = useCallback((list: SavedScenario[]) => {
    setSaved(list); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, []);

  const set = (field: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((p) => ({ ...p, [field]: parseFloat(e.target.value) || 0 }));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const presets = getProductPresets(p);
    setInputs((prev) => ({ ...prev, ...presets }));
  };

  const conversionRate = CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback((v: number) => `${(v * conversionRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${sym(currency)}`, [conversionRate, currency]);

  const T = useCallback((k: string, vars?: Record<string, string | number>) => {
    const key = `discountImpact.${k}`;
    return vars ? t(key, vars) : t(key);
  }, [t]);

  const r = useMemo(() => compute(inputs, tab), [inputs, tab]);

  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

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

  const applyWhatIf = (action: WhatIfAction) => {
    setActiveAction(activeAction === action ? null : action);
  };

  const revertWhatIf = () => setActiveAction(null);

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];

    if (!r.isLiftAchievable) {
      M.push({ type: "warn", title: T("alertLiftNotEnough"), msg: T("alertLiftNotEnoughMsg", { required: fmt(r.requiredLiftPct), expected: inputs.expectedLift }) });
    } else {
      M.push({ type: "success", title: T("alertProfitUp"), msg: T("alertProfitUpMsg", { before: fmt(r.totalProfitBefore * conversionRate), sym: sym(currency), after: fmt(r.totalProfitAfter * conversionRate), pct: fmt(r.profitChangePct) }) });
    }

    if (r.profitChange < 0) {
      M.push({ type: "error", title: T("alertProfitDown"), msg: T("alertProfitDownMsg", { before: fmt(r.totalProfitBefore * conversionRate), sym: sym(currency), after: fmt(r.totalProfitAfter * conversionRate), pct: fmt(Math.abs(r.profitChangePct)) }) });
    }

    if (r.marginAfterPct < 10 && r.marginAfterPct > 0) {
      M.push({ type: "warn", title: T("alertMarginTooLow"), msg: T("alertMarginTooLowMsg", { margin: fmt1(r.marginAfterPct) }) });
    }

    if (inputs.discountPct >= 30) {
      M.push({ type: "warn", title: T("alertAggressiveDiscount"), msg: T("alertAggressiveDiscountMsg", { pct: inputs.discountPct }) });
    }

    return M;
  }, [r, inputs, currency, conversionRate, T]);

  const recommendations = useMemo(() => {
    const R: { icon: React.ReactNode; title: string; desc: string }[] = [];

    if (r.requiredLiftPct > inputs.expectedLift && inputs.discountPct > 10) {
      const suggestedDiscount = Math.round(inputs.discountPct * 0.6);
      const suggestedR = compute({ ...inputs, discountPct: suggestedDiscount }, tab);
      R.push({ icon: <TagIcon className="w-5 h-5 text-blue-500" />, title: T("recReduceDiscount"), desc: T("recReduceDiscountDesc", { current: inputs.discountPct, lift: fmt(r.requiredLiftPct), suggested: suggestedDiscount, newLift: fmt(suggestedR.requiredLiftPct) }) });
    }

    if (r.marginBeforePct < 25) {
      const costField = tab === "order" ? inputs.cogsPerItem : inputs.cogs;
      const targetReduction = Math.round(costField * 0.15);
      R.push({ icon: <CubeIcon className="w-5 h-5 text-amber-500" />, title: T("recImproveCosts"), desc: T("recImproveCostsDesc", { margin: fmt1(r.marginBeforePct), target: fmt(targetReduction * conversionRate), sym: sym(currency) }) });
    }

    if (r.requiredLiftPct > 80 && inputs.expectedLift < 100) {
      const suggestedDiscount = Math.round(inputs.discountPct * 0.5);
      const suggestedR = compute({ ...inputs, discountPct: suggestedDiscount }, tab);
      R.push({ icon: <ArrowTrendingUpIcon className="w-5 h-5 text-purple-500" />, title: T("recTestSmaller"), desc: T("recTestSmallerDesc", { current: inputs.discountPct, suggested: suggestedDiscount, lift: fmt(r.requiredLiftPct), newLift: fmt(suggestedR.requiredLiftPct) }) });
    }

    return R;
  }, [r, inputs, tab, currency, conversionRate, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const names = [T("scenarioDefault") + " 1", T("scenarioDefault") + " 2", T("scenarioDefault") + " 3"];
    const n = scenarioName.trim() || names[saved.length];
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, tab, currency }]);
    setScenarioName("");
  };

  const loadScenario = (s: SavedScenario) => { setInputs({ ...s.inputs }); setTab(s.tab); setCurrency(s.currency); };
  const deleteScenario = (id: string) => persist(saved.filter((s) => s.id !== id));

  const TABS: { key: DiscountTab; labelKey: string }[] = [
    { key: "product", labelKey: "tabProduct" },
    { key: "order", labelKey: "tabOrder" },
    { key: "bogo", labelKey: "tabBogo" },
    { key: "freeShipping", labelKey: "tabFreeShipping" },
    { key: "quantity", labelKey: "tabQuantity" },
  ];

  const costBreakdownData = useMemo(() => {
    const items = [
      { name: T("revenue"), value: r.priceAfter, fill: "hsl(189 96% 52%)" },
      { name: T("totalCost"), value: r.totalCostPerUnit, fill: "hsl(0 72% 51%)" },
    ];
    const maxV = Math.max(...items.map((d) => d.value), 1);
    return items.map((d) => ({ ...d, pct: Math.min(100, (d.value / maxV) * 100) }));
  }, [r, T]);

  const Slider: React.FC<{
    label: string; value: number; min: number; max: number;
    step?: number; onChange: React.ChangeEventHandler;
    isPercent?: boolean; suffix?: string;
  }> = ({ label, value, min, max, step = 1, onChange, isPercent, suffix }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="flex items-center gap-1">
          <input type="number" value={value} onChange={onChange} min={min} max={max} step={step}
            className="w-20 sm:w-24 text-right font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{isPercent ? "%" : suffix || sym(currency)}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(min)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
        <span>{fmt(max)}{isPercent ? "%" : ` ${sym(currency)}`}</span>
      </div>
    </div>
  );

  const inputIcon = (tab === "product" || tab === "quantity") ? <TagIcon className="w-5 h-5 text-blue-500" />
    : tab === "order" ? <ShoppingCartIcon className="w-5 h-5 text-purple-500" />
    : tab === "bogo" ? <GiftIcon className="w-5 h-5 text-pink-500" />
    : tab === "freeShipping" ? <TruckIcon className="w-5 h-5 text-amber-500" />
    : <CalculatorIcon className="w-5 h-5 text-blue-500" />;

  const profitIsPositive = r.profitChange >= 0;
  const liftLabel = r.requiredLiftPct > 0
    ? (r.isLiftAchievable ? `✅ ${T("alertProfitUp")}` : `⚠️ ${T("alertLiftNotEnough")}`)
    : `✅ ${T("alertProfitUp")}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-6 px-3 sm:px-4" dir={i18n.dir()}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TagIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
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

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {(["small", "medium", "flash"] as Preset[]).map((p) => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                preset === p
                  ? p === "small"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    : p === "medium"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                      : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                p === "small" ? "bg-blue-500" : p === "medium" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              {T(`preset${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
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

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                tab === t.key
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}>
              {T(t.labelKey)}
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <Card title={T("productInputs")} icon={inputIcon}>
              {(tab === "product" || tab === "bogo" || tab === "quantity" || tab === "freeShipping") && (
                <Slider label={T("originalPrice")} value={inputs.originalPrice} min={50} max={10000} step={10} onChange={set("originalPrice")} />
              )}
              {tab === "order" && (
                <>
                  <Slider label={T("aov")} value={inputs.aov} min={100} max={20000} step={50} onChange={set("aov")} />
                  <Slider label={T("cogsPerItem")} value={inputs.cogsPerItem} min={10} max={5000} step={10} onChange={set("cogsPerItem")} />
                  <Slider label={T("itemsPerOrder")} value={inputs.itemsPerOrder} min={1} max={20} step={1} onChange={set("itemsPerOrder")} />
                </>
              )}
              {tab !== "order" && (
                <Slider label={T("cogs")} value={inputs.cogs} min={10} max={5000} step={10} onChange={set("cogs")} />
              )}
              {tab !== "order" && (
                <Slider label={T("shipping")} value={inputs.shipping} min={0} max={500} step={5} onChange={set("shipping")} />
              )}
              {tab !== "order" && (
                <Slider label={T("adCost")} value={inputs.adCost} min={0} max={1000} step={10} onChange={set("adCost")} />
              )}
              {tab !== "bogo" && tab !== "freeShipping" && (
                <Slider label={T("discountPct")} value={inputs.discountPct} min={1} max={70} step={1} isPercent onChange={set("discountPct")} />
              )}
              {tab === "bogo" && (
                <div className="text-xs bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800 rounded-lg p-3 text-pink-700 dark:text-pink-300">
                  {T("bogoNote")}
                </div>
              )}
              {tab === "freeShipping" && (
                <div className="text-xs bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-700 dark:text-amber-300">
                  {T("freeShippingNote")}
                </div>
              )}
              {tab === "quantity" && (
                <div className="text-xs bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-purple-700 dark:text-purple-300">
                  {T("tierLabel", { tier: 1 })} — {T("tierMinQty")}: 5, {T("tierDiscount")}: {inputs.discountPct}%
                </div>
              )}
              <Slider label={T("currentOrders")} value={inputs.currentOrders} min={10} max={5000} step={10} onChange={set("currentOrders")} suffix=" orders" />
              <Slider label={T("expectedLift")} value={inputs.expectedLift} min={0} max={300} step={5} isPercent onChange={set("expectedLift")} />
            </Card>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* Before vs After */}
            <Card title={T("beforeAfter")} icon={<ScaleIcon className="w-5 h-5 text-blue-500" />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <MetricCard label={T("priceBefore")} value={fmtCurr(Math.round(r.priceBefore))} sub={T("priceBeforeSub")} positive={true} accent="blue" />
                <MetricCard label={T("priceAfter")} value={fmtCurr(Math.round(r.priceAfter))} sub={T("priceAfterSub", { pct: tab === "bogo" ? 50 : tab === "freeShipping" ? fmt(Math.round((1 - r.priceAfter / r.priceBefore) * 100)) : inputs.discountPct })} positive={r.priceAfter < r.priceBefore} accent="purple" />
                <MetricCard label={T("profitBefore")} value={fmtCurr(Math.round(r.profitPerUnitBefore))} sub={T("profitBeforeSub", { margin: fmt1(r.marginBeforePct) })} positive={r.profitPerUnitBefore > 0} accent={r.profitPerUnitBefore > 0 ? "emerald" : "red"} />
                <MetricCard label={T("profitAfter")} value={fmtCurr(Math.round(r.profitPerUnitAfter))} sub={T("profitAfterSub", { margin: fmt1(r.marginAfterPct) })} positive={r.profitPerUnitAfter > 0} accent={r.profitPerUnitAfter > 0 ? "emerald" : "red"} />
                <MetricCard label={T("totalProfitBefore")} value={fmtCurr(Math.round(r.totalProfitBefore))} sub={T("totalProfitBeforeSub", { orders: fmt(inputs.currentOrders) })} positive={r.totalProfitBefore > 0} accent="emerald" />
                <MetricCard label={T("totalProfitAfter")} value={fmtCurr(Math.round(r.totalProfitAfter))} sub={T("totalProfitAfterSub", { orders: fmt(Math.round(inputs.currentOrders * (1 + inputs.expectedLift / 100))) })} positive={r.totalProfitAfter > r.totalProfitBefore} accent={r.totalProfitAfter >= r.totalProfitBefore ? "emerald" : "red"} />
                <MetricCard label={T("profitChange")} value={`${r.profitChange >= 0 ? "+" : ""}${fmtCurr(Math.round(Math.abs(r.profitChange)))}`} sub={T("profitChangeSub")} positive={r.profitChange >= 0} accent={r.profitChange >= 0 ? "emerald" : "red"} />
                <MetricCard label={T("requiredLift")} value={`${fmt(r.requiredLiftPct)}%`} sub={T("requiredLiftSub", { orders: fmt(r.breakEvenOrders), currentOrders: fmt(inputs.currentOrders) })} positive={r.isLiftAchievable} accent={r.isLiftAchievable ? "emerald" : "red"} />
              </div>
            </Card>

            {/* Cost Breakdown Comparison */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 shrink-0" /> {T("breakdown")}
              </h3>
              <div className="space-y-3">
                {costBreakdownData.map((d, i) => (
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
                <div className="pt-2 flex justify-between text-xs border-t border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 font-medium">{T("costBreakdown")}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono font-semibold">
                    {T("revenue")}: {fmtCurr(Math.round(r.priceAfter))} | {T("totalCost")}: {fmtCurr(Math.round(r.totalCostPerUnit))} | {T("profitAfter")}: {fmtCurr(Math.round(r.profitPerUnitAfter))}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 sm:p-4 rounded-xl border text-xs sm:text-sm ${
                    a.type === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                      : a.type === "warn" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  }`}>
                    {a.type === "success" ? <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-emerald-500" />
                      : <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                        a.type === "error" ? "text-red-500" : "text-yellow-500"
                      }`} />}
                    <div>
                      <div className="font-semibold">{a.title}</div>
                      <div>{a.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* What-If Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <WhatIfButton
                  label={T("whatIfHalfDiscount", { target: Math.round(inputs.discountPct / 2) })}
                  emoji="✂️"
                  desc={T("whatIfHalfDiscountDesc")}
                  active={activeAction === "halfDiscount"}
                  impact={whatIfAll.halfDiscount.impact}
                  curr={(v: number) => `${v >= 0 ? "+" : ""}${fmt(Math.round(v))}%`}
                  onClick={() => applyWhatIf("halfDiscount")}
                  suffix={T("whatIfHalfDiscountImpact")}
                  isNegativeBest
                />
                <WhatIfButton
                  label={T("whatIfDoubleLift", { target: Math.min(300, inputs.expectedLift * 2) })}
                  emoji="📈"
                  desc={T("whatIfDoubleLiftDesc")}
                  active={activeAction === "doubleLift"}
                  impact={whatIfAll.doubleLift.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("doubleLift")}
                  suffix={T("whatIfDoubleLiftImpact")}
                />
                <WhatIfButton
                  label={T("whatIfReduceCosts", { target: 10 })}
                  emoji="📦"
                  desc={T("whatIfReduceCostsDesc")}
                  active={activeAction === "reduceCosts"}
                  impact={whatIfAll.reduceCosts.impact}
                  curr={fmtCurr}
                  onClick={() => applyWhatIf("reduceCosts")}
                  suffix={T("whatIfReduceCostsImpact")}
                />
              </div>
              {activeAction && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{T("whatIfTitle")}</span>
                    <button onClick={revertWhatIf} className="text-[10px] text-red-400 hover:text-red-600 underline">{T("scenarioDefault")}</button>
                  </div>
                  <WhatIfRow label={T("profitBefore")} base={fmtCurr(Math.round(r.profitPerUnitBefore))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.profitPerUnitBefore))} positive={whatIfAll[activeAction].result.totalProfitAfter >= r.totalProfitAfter} />
                  <WhatIfRow label={T("profitAfter")} base={fmtCurr(Math.round(r.profitPerUnitAfter))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.profitPerUnitAfter))} positive={whatIfAll[activeAction].result.profitPerUnitAfter >= r.profitPerUnitAfter} />
                  <WhatIfRow label={T("totalProfitAfter")} base={fmtCurr(Math.round(r.totalProfitAfter))} projected={fmtCurr(Math.round(whatIfAll[activeAction].result.totalProfitAfter))} positive={whatIfAll[activeAction].result.totalProfitAfter >= r.totalProfitAfter} />
                  <WhatIfRow label={T("requiredLift")} base={`${fmt(r.requiredLiftPct)}%`} projected={`${fmt(whatIfAll[activeAction].result.requiredLiftPct)}%`} positive={whatIfAll[activeAction].result.requiredLiftPct <= r.requiredLiftPct} />
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
                      [T("step1"), T("step1Formula"), fmtCurr(Math.round(r.totalCostPerUnit))],
                      [T("step2"), `${T("step1Formula")} = ${fmtCurr(Math.round(r.priceBefore))} − ${fmtCurr(Math.round(r.totalCostPerUnit))}`, fmtCurr(Math.round(r.profitPerUnitBefore))],
                      [T("step3"), `${fmtCurr(Math.round(r.priceBefore))} × (1 − ${tab === "bogo" ? 50 : inputs.discountPct}%)`, fmtCurr(Math.round(r.priceAfter))],
                      [T("step4"), `${fmtCurr(Math.round(r.priceAfter))} − ${fmtCurr(Math.round(r.totalCostPerUnit))}`, fmtCurr(Math.round(r.profitPerUnitAfter))],
                      [T("step5"), `${fmtCurr(Math.round(r.profitPerUnitBefore))} × ${inputs.currentOrders}`, fmtCurr(Math.round(r.totalProfitBefore))],
                      [T("step6"), `${fmtCurr(Math.round(r.profitPerUnitAfter))} × (${inputs.currentOrders} × (1 + ${inputs.expectedLift}%))`, fmtCurr(Math.round(r.totalProfitAfter))],
                      [T("step7"), `${fmtCurr(Math.round(r.totalProfitBefore))} ÷ ${fmtCurr(Math.round(r.profitPerUnitAfter))}`, fmt(r.breakEvenOrders)],
                      [T("step8"), `(${fmt(r.breakEvenOrders)} ÷ ${inputs.currentOrders} − 1) × 100`, `${fmt(r.requiredLiftPct)}%`],
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

function MetricCard({ label, value, sub, positive, accent = "emerald" }: {
  label: string; value: string; sub: string; positive: boolean; accent?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    gray: "text-gray-900 dark:text-gray-100",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono ${positive ? colorMap[accent] || colorMap.emerald : colorMap.red}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function WhatIfButton({ label, emoji, desc, active, impact, curr, onClick, suffix, isNegativeBest }: {
  label: string; emoji: string; desc: string; active: boolean;
  impact: number | null; curr: (v: number) => string; onClick: () => void;
  suffix?: string; isNegativeBest?: boolean;
}) {
  const isPositive = impact !== null && (isNegativeBest ? impact < 0 : impact > 0);
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
          <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
            {isNegativeBest ? "" : (isPositive ? "+" : "")}{curr(Math.round(impact))}
          </span>
          <span className="text-gray-400">{suffix || ""}</span>
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
