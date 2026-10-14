/**
 * 📊 Product Break-Even & COD Unit Economics Calculator
 *
 * حاسبة نقطة التعادل وهوامش الدفع عند الاستلام (COD)
 * Linear Single-Surface Chassis - Zero Emojis - MaxP Platform Standards
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import SliderInput from "@/components/common/SliderInput";
import {
  Calculator,
  TrendingUp,
  Sliders,
  Sparkles,
  ShieldCheck,
  Target,
  Package,
  TrendingDown,
  Scale,
} from "lucide-react";
import {
  MarketingTelemetryRibbon,
  MarketingMetricTile,
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
  confirmationRate: number;
  deliveryRate: number;
  cogs: number;
  packingFees: number;
  shippingFees: number;
  rtoFees: number;
  piecesPerOrder: number;
}

export interface Results {
  confirmed: number;
  delivered: number;
  rto: number;
  revenue: number;
  costPerDelivered: number;
  costPerRTO: number;
  deliveredCost: number;
  rtoCost: number;
  operatingProfit: number;
  bevCAC: number;
  bevROAS: number;
  safeCAC: number;
  targetROAS: number;
}

interface SavedScenario {
  id: string;
  name: string;
  inputs: Inputs;
  currency: string;
}

type WhatIfAction = "delivery80" | "cogs90" | "rtoCut20";

const DEFAULTS: Inputs = {
  aov: 900,
  confirmationRate: 85,
  deliveryRate: 75,
  cogs: 350,
  packingFees: 25,
  shippingFees: 80,
  rtoFees: 60,
  piecesPerOrder: 1,
};

const STORAGE_KEY = "maxp_product_bev_saved";
const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function compute(inputs: Inputs): Results {
  const { aov, confirmationRate, deliveryRate, cogs, packingFees, shippingFees, rtoFees, piecesPerOrder } = inputs;
  const cr = confirmationRate / 100;
  const dr = deliveryRate / 100;
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

  return {
    confirmed,
    delivered,
    rto,
    revenue,
    costPerDelivered,
    costPerRTO,
    deliveredCost,
    rtoCost,
    operatingProfit,
    bevCAC,
    bevROAS,
    safeCAC,
    targetROAS,
  };
}

export default function ProductBreakEvenCalculator() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState("EGP");
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [activeAction, setActiveAction] = useState<WhatIfAction | null>(null);

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

  const T = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const key = `productBreakEven.${k}`;
      return vars ? t(key, vars) : t(key);
    },
    [t],
  );

  const r = useMemo(() => compute(inputs), [inputs]);

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

  const alerts = useMemo(() => {
    const M: { type: "success" | "warn" | "error"; title: string; msg: string }[] = [];
    if (r.operatingProfit <= 0) {
      M.push({ type: "error", title: "خسارة تشغيلية", msg: T("alertLoss") });
    }
    if (r.bevROAS > 3) {
      M.push({ type: "warn", title: "عائد تعادل مرتفع", msg: T("alertHighROAS", { roas: r.bevROAS.toFixed(2) }) });
    }
    if (r.operatingProfit > 0 && r.bevROAS <= 2.5) {
      M.push({ type: "success", title: "اقتصاديات قوية", msg: "المنتج يتمتع بنطاق أمان عالي وعائد تعادل مريح يتيح التوسع الإعلاني." });
    }
    return M;
  }, [r, T]);

  const saveScenario = () => {
    if (saved.length >= 3) return;
    const n = scenarioName.trim() || `${T("scenarioDefault")} ${saved.length + 1}`;
    persist([...saved, { id: Date.now().toString(), name: n, inputs: { ...inputs }, currency }]);
    setScenarioName("");
  };

  const zoneKey = r.bevCAC >= 150 ? "safe" : r.bevCAC >= 80 ? "warning" : "danger";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calculator className="w-5 h-5" />
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

      {/* Scenarios Bar */}
      <div className="p-3 bg-card border border-border/70 rounded-xl">
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
            { label: T("bevCAC"), value: fmtCurr(r.bevCAC), sub: "أعلى تكلفة شراء للتعادل", color: "primary" },
            { label: T("bevROAS"), value: `${r.bevROAS.toFixed(2)}x`, sub: "أدنى عائد إعلاني", color: r.bevROAS <= 2.5 ? "emerald" : "amber" },
            { label: T("safeCAC"), value: fmtCurr(r.safeCAC), sub: "التكلفة الآمنة (80%)", color: "emerald" },
            { label: T("operatingProfit"), value: fmtCurr(r.operatingProfit), sub: "ربح كل 100 طلب", color: r.operatingProfit > 0 ? "emerald" : "rose" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/70">
          {/* Inputs Column */}
          <div className="lg:col-span-5 p-5 space-y-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/70">
              <Sliders className="w-4 h-4 text-primary" />
              مدخلات الدفع عند الاستلام والتكاليف
            </span>

            <SliderInput currencySymbol={mktSym(currency)} label={T("aov")} value={inputs.aov} min={50} max={5000} step={10} onChange={set("aov")} />
            <SliderInput label={T("piecesPerOrder")} value={inputs.piecesPerOrder} min={1} max={20} step={1} onChange={set("piecesPerOrder")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("confirmationRate")} value={inputs.confirmationRate} min={30} max={100} step={5} isPercent onChange={set("confirmationRate")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("deliveryRate")} value={inputs.deliveryRate} min={20} max={100} step={5} isPercent onChange={set("deliveryRate")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("cogs")} value={inputs.cogs} min={1} max={1000} step={10} onChange={set("cogs")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("packing")} value={inputs.packingFees} min={1} max={100} step={5} onChange={set("packingFees")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("shipping")} value={inputs.shippingFees} min={30} max={200} step={10} onChange={set("shippingFees")} />
            <SliderInput currencySymbol={mktSym(currency)} label={T("rtoFee")} value={inputs.rtoFees} min={20} max={150} step={10} onChange={set("rtoFees")} />
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-muted/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <MarketingMetricTile label={T("bevCAC")} value={fmtCurr(r.bevCAC)} sub="أعلى CAC تعادل" accent="blue" />
              <MarketingMetricTile label={T("bevROAS")} value={`${r.bevROAS.toFixed(2)}x`} sub="أدنى ROAS تعادل" positive={r.bevROAS <= 2.5} accent="purple" />
              <MarketingMetricTile label={T("safeCAC")} value={fmtCurr(r.safeCAC)} sub="الهدف الإعلاني الآمن" accent="emerald" />
              <MarketingMetricTile label={T("targetROAS")} value={`${r.targetROAS.toFixed(2)}x`} sub="ROAS الأرباح" accent="yellow" />
            </div>

            {/* COD Funnel per 100 Orders */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  مخطط تحويل 100 طلب (COD Funnel)
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  تسليم: {inputs.deliveryRate}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">مؤكد</span>
                  <span className="text-sm font-bold font-mono text-foreground">{fmt1(r.confirmed)}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">مستلم</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmt1(r.delivered)}</span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 block">مرتجع (RTO)</span>
                  <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">{fmt1(r.rto)}</span>
                </div>
              </div>
            </div>

            {/* What-If Simulations */}
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">{T("whatIfTitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <MarketingWhatIfButton
                  label={T("whatIfDelivery")}
                  icon={Target}
                  desc={T("whatIfDeliveryDesc")}
                  active={activeAction === "delivery80"}
                  impact={whatIfAll.delivery80.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "delivery80" ? null : "delivery80")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfCOGS")}
                  icon={Package}
                  desc={T("whatIfCOGSDesc")}
                  active={activeAction === "cogs90"}
                  impact={whatIfAll.cogs90.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "cogs90" ? null : "cogs90")}
                />
                <MarketingWhatIfButton
                  label={T("whatIfRTO")}
                  icon={TrendingDown}
                  desc={T("whatIfRTODesc")}
                  active={activeAction === "rtoCut20"}
                  impact={whatIfAll.rtoCut20.impact}
                  curr={fmtCurr}
                  onClick={() => setActiveAction(activeAction === "rtoCut20" ? null : "rtoCut20")}
                />
              </div>

              {activeAction && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1 mt-2">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-primary/10">
                    <span className="text-xs font-bold text-primary">{T("whatIfComparison")}</span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                    >
                      {T("whatIfReset")}
                    </button>
                  </div>
                  <MarketingWhatIfDeltaRow
                    label={T("bevCAC")}
                    base={fmtCurr(r.bevCAC)}
                    projected={fmtCurr(whatIfAll[activeAction].result.bevCAC)}
                    positive={whatIfAll[activeAction].result.bevCAC >= r.bevCAC}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("bevROAS")}
                    base={`${r.bevROAS.toFixed(2)}x`}
                    projected={`${whatIfAll[activeAction].result.bevROAS.toFixed(2)}x`}
                    positive={whatIfAll[activeAction].result.bevROAS <= r.bevROAS}
                  />
                  <MarketingWhatIfDeltaRow
                    label={T("operatingProfit")}
                    base={fmtCurr(r.operatingProfit)}
                    projected={fmtCurr(whatIfAll[activeAction].result.operatingProfit)}
                    positive={whatIfAll[activeAction].result.operatingProfit >= r.operatingProfit}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
