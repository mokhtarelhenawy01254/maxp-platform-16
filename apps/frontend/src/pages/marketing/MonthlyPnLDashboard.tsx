/**
 * 📊 Monthly Profit & Loss (P&L) Dashboard
 *
 * لوحة الأرباح والخسائر الشهرية ونقطة تعادل المشروع
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  BarChart3,
  Sliders,
  DollarSign,
  Building,
  Package,
} from "lucide-react";
import SliderInput from "@/components/common/SliderInput";
import {
  MarketingTelemetryRibbon,
  MarketingMetricTile,
  MarketingPresetBar,
  MarketingScenarioBar,
  MarketingAlertBanner,
} from "./MarketingCalculatorComponents";
import {
  MKT_CURRENCIES,
  MKT_CURRENCY_RATES,
  mktSym,
} from "./marketingMath";

export interface Inputs {
  revenue: number;
  cogs: number;
  shipping: number;
  adSpend: number;
  platformFees: number;
  otherVariable: number;
  salaries: number;
  rent: number;
  otherFixed: number;
}

export interface Results {
  grossProfit: number;
  grossMargin: number;
  totalVariable: number;
  totalFixed: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  breakEvenRevenue: number;
}

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  currency: string;
}

const PRESETS: Record<string, Partial<Inputs>> = {
  sideHustle: { revenue: 50_000, cogs: 20_000, shipping: 3_000, adSpend: 8_000, platformFees: 2_000, otherVariable: 1_000, salaries: 5_000, rent: 1_000, otherFixed: 500 },
  growingStore: { revenue: 200_000, cogs: 80_000, shipping: 15_000, adSpend: 40_000, platformFees: 8_000, otherVariable: 5_000, salaries: 20_000, rent: 5_000, otherFixed: 2_000 },
  established: { revenue: 500_000, cogs: 175_000, shipping: 25_000, adSpend: 60_000, platformFees: 15_000, otherVariable: 10_000, salaries: 50_000, rent: 15_000, otherFixed: 5_000 },
};

const DEFAULTS: Inputs = {
  revenue: 200_000,
  cogs: 80_000,
  shipping: 15_000,
  adSpend: 40_000,
  platformFees: 8_000,
  otherVariable: 5_000,
  salaries: 20_000,
  rent: 5_000,
  otherFixed: 2_000,
};

const STORAGE_KEY = "maxp_monthly_pnl_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();

export function compute(inputs: Inputs): Results {
  const { revenue, cogs, shipping, adSpend, platformFees, otherVariable, salaries, rent, otherFixed } = inputs;
  const grossProfit = revenue - cogs - shipping;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const totalVariable = cogs + shipping + adSpend + platformFees + otherVariable;
  const totalFixed = salaries + rent + otherFixed;
  const totalExpenses = totalVariable + totalFixed;
  const netProfit = revenue - totalExpenses;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const contributionMargin = revenue - totalVariable;
  const breakEvenRevenue = contributionMargin > 0 ? (totalFixed / contributionMargin) * revenue : 0;

  return { grossProfit, grossMargin, totalVariable, totalFixed, totalExpenses, netProfit, netMargin, breakEvenRevenue };
}

export default function MonthlyPnLDashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [preset, setPreset] = useState("growingStore");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

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

  const loadPreset = (key: string) => {
    setPreset(key);
    const p = PRESETS[key];
    if (p) setInputs((prev) => ({ ...prev, ...p }));
  };

  const rate = MKT_CURRENCY_RATES[currency] || 1;
  const fmtCurr = useCallback(
    (v: number) =>
      `${(v * rate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${mktSym(currency)}`,
    [rate, currency],
  );

  const r = useMemo(() => compute(inputs), [inputs]);
  const T = useCallback((k: string) => t(`monthlyPnL.${k}`), [t]);

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (r.netProfit <= 0) {
      M.push({ type: "error", title: "خسارة شهرية", msg: T("alertLoss") });
    }
    if (r.grossMargin < 30) {
      M.push({ type: "warn", title: "هامش إجمالي ضعيف", msg: T("alertLowMargin") });
    }
    if (inputs.revenue > 0 && inputs.adSpend / inputs.revenue > 0.4) {
      M.push({ type: "warn", title: "إنفاق إعلاني مرتفع", msg: T("alertHighAdSpend") });
    }
    if (r.netProfit > 0 && r.netMargin >= 15) {
      M.push({ type: "success", title: "ربحية صحية", msg: "المشروع يحقق هامش صافي ربح ممتاز يتجاوز 15%." });
    }
    return M;
  }, [r, inputs, T]);

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

      {/* Control bar: Presets & Scenarios */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-xl">
        <MarketingPresetBar
          presets={["sideHustle", "growingStore", "established"]}
          current={preset}
          onSelect={loadPreset}
          labels={{
            sideHustle: T("presetSideHustle"),
            growingStore: T("presetGrowingStore"),
            established: T("presetEstablished"),
          }}
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
            { label: T("netProfit"), value: fmtCurr(r.netProfit), sub: `صافي: ${r.netMargin.toFixed(1)}%`, color: r.netProfit >= 0 ? "emerald" : "rose" },
            { label: T("grossProfit"), value: fmtCurr(r.grossProfit), sub: `هامش: ${r.grossMargin.toFixed(1)}%`, color: "primary" },
            { label: T("totalExpenses"), value: fmtCurr(r.totalExpenses), sub: `متغير: ${fmtCurr(r.totalVariable)}`, color: "purple" },
            { label: T("breakEvenRevenue"), value: fmtCurr(r.breakEvenRevenue), sub: "إيراد التعادل الأدنى", color: r.breakEvenRevenue <= inputs.revenue ? "emerald" : "amber" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/70">
              <Sliders className="w-4 h-4 text-primary" />
              الإيرادات والتكاليف الشهرية
            </span>

            <SliderInput currencySymbol={mktSym(currency)} label={T("monthlyRevenue")} value={inputs.revenue} min={10_000} max={2_000_000} step={10_000} onChange={set("revenue")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("cogs")} value={inputs.cogs} min={1_000} max={1_000_000} step={5_000} onChange={set("cogs")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("shipping")} value={inputs.shipping} min={500} max={200_000} step={1_000} onChange={set("shipping")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("adSpend")} value={inputs.adSpend} min={1_000} max={500_000} step={5_000} onChange={set("adSpend")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("platformFees")} value={inputs.platformFees} min={500} max={100_000} step={1_000} onChange={set("platformFees")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("salaries")} value={inputs.salaries} min={1_000} max={500_000} step={5_000} onChange={set("salaries")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("rent")} value={inputs.rent} min={500} max={200_000} step={1_000} onChange={set("rent")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("otherFixed")} value={inputs.otherFixed} min={0} max={200_000} step={1_000} onChange={set("otherFixed")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("netProfit")} value={fmtCurr(r.netProfit)} sub={`هامش ${r.netMargin.toFixed(1)}%`} positive={r.netProfit >= 0} accent={r.netProfit >= 0 ? "emerald" : "red"} />
              <MarketingMetricTile label={T("grossProfit")} value={fmtCurr(r.grossProfit)} sub={`هامش ${r.grossMargin.toFixed(1)}%`} accent="blue" />
              <MarketingMetricTile label={T("totalExpenses")} value={fmtCurr(r.totalExpenses)} sub="متغير + ثابت" accent="purple" />
              <MarketingMetricTile label={T("breakEvenRevenue")} value={fmtCurr(r.breakEvenRevenue)} sub="تغطية المصاريف" positive={r.breakEvenRevenue <= inputs.revenue} accent={r.breakEvenRevenue <= inputs.revenue ? "emerald" : "yellow"} />
            </div>

            {/* P&L Statement Breakdown Table */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  قائمة الدخل والنتائج المالية (P&L Summary)
                </span>
                <span className={`text-xs font-mono font-bold ${r.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  صافي الربح: {fmtCurr(r.netProfit)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("monthlyRevenue")}</span>
                  <span className="font-mono font-bold text-foreground">{fmtCurr(inputs.revenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("totalVariable")} (بضاعة + شحن + إعلانات)</span>
                  <span className="font-mono text-rose-500">- {fmtCurr(r.totalVariable)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50 font-semibold">
                  <span className="text-foreground">{T("grossProfit")}</span>
                  <span className="font-mono text-primary">{fmtCurr(r.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{T("totalFixed")} (رواتب + إيجار + مصاريف ثابتة)</span>
                  <span className="font-mono text-rose-500">- {fmtCurr(r.totalFixed)}</span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-sm font-bold border-t border-border">
                  <span className="text-foreground">{T("netProfit")}</span>
                  <span className={`font-mono ${r.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {fmtCurr(r.netProfit)} ({r.netMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
