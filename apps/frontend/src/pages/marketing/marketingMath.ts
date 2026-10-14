/**
 * 🧮 Marketing Financial & Advertising Calculators Engine
 *
 * Core mathematical models for ROAS, CLV, Discount Impact, Pricing, and Break-Even
 */

export const MKT_CURRENCIES = ["EGP", "SAR", "USD"] as const;
export const MKT_CURRENCY_RATES: Record<string, number> = { EGP: 1, SAR: 0.12, USD: 0.02 };
export const MKT_CURRENCY_SYMBOLS: Record<string, string> = { EGP: "ج.م", SAR: "ر.س", USD: "$" };
export const mktSym = (code: string) => MKT_CURRENCY_SYMBOLS[code] || code;

/* =========================================================================
   1. Ad Budget Planner
   ========================================================================= */
export interface AdBudgetInputs {
  targetRevenue: number;
  aov: number;
  targetRoas: number;
  cpp: number;
  totalBudget: number;
  convRate: number;
  dailyCap: number;
}

export interface AdBudgetResults {
  monthlyBudget: number;
  dailySpend: number;
  expectedOrders: number;
  costPerOrder: number;
  expectedRevenue: number;
  profitAfterAds: number;
  actualRoas: number;
  daysToTarget: number;
  clicksNeeded: number;
  dailyClicks: number;
  estimatedCpc: number;
  cppCpcGap: number;
}

export const AD_BUDGET_PRESETS: Record<"starter" | "growth" | "scale", AdBudgetInputs> = {
  starter: { targetRevenue: 100000, aov: 500, targetRoas: 3, cpp: 120, totalBudget: 33333, convRate: 3, dailyCap: 3000 },
  growth: { targetRevenue: 300000, aov: 800, targetRoas: 4, cpp: 180, totalBudget: 75000, convRate: 4, dailyCap: 8000 },
  scale: { targetRevenue: 700000, aov: 1200, targetRoas: 5, cpp: 250, totalBudget: 140000, convRate: 5, dailyCap: 20000 },
};

export function computeAdBudget(
  inputs: AdBudgetInputs,
  mode: "cpp" | "budget" = "cpp",
): AdBudgetResults {
  const budget = mode === "budget" ? inputs.totalBudget : inputs.targetRevenue / inputs.targetRoas;
  const expectedRevenue = mode === "budget" ? budget * inputs.targetRoas : inputs.targetRevenue;
  const orders = Math.round(expectedRevenue / inputs.aov);
  const dailySpend = budget / 30;
  const costPerOrder = orders > 0 ? budget / orders : 0;
  const profit = expectedRevenue - budget;
  const roas = budget > 0 ? expectedRevenue / budget : 0;
  const days = inputs.dailyCap > 0 ? Math.ceil(budget / inputs.dailyCap) : 0;
  const clicks = Math.round(orders / (inputs.convRate / 100));
  const dailyClicks = Math.round(clicks / 30);
  const cpc = clicks > 0 ? budget / clicks : 0;
  const gap = cpc > 0 ? Math.round(inputs.cpp / cpc) : 0;

  return {
    monthlyBudget: budget,
    dailySpend,
    expectedOrders: orders,
    costPerOrder,
    expectedRevenue,
    profitAfterAds: profit,
    actualRoas: roas,
    daysToTarget: days,
    clicksNeeded: clicks,
    dailyClicks,
    estimatedCpc: cpc,
    cppCpcGap: gap,
  };
}

/* =========================================================================
   2. CLV Calculator
   ========================================================================= */
export interface ClvInputs {
  aov: number;
  frequency: number;
  lifespan: number;
  margin: number;
  cac: number;
}

export interface ClvResults {
  annualValue: number;
  grossClv: number;
  netClv: number;
  clvCacRatio: number;
  netProfit: number;
}

export const CLV_PRESETS: Record<string, ClvInputs> = {
  basic: { aov: 500, frequency: 2, lifespan: 3, margin: 30, cac: 300 },
  subscription: { aov: 200, frequency: 12, lifespan: 4, margin: 70, cac: 500 },
  luxury: { aov: 3000, frequency: 1.5, lifespan: 5, margin: 45, cac: 2000 },
  saas: { aov: 100, frequency: 12, lifespan: 5, margin: 80, cac: 800 },
  quick: { aov: 200, frequency: 6, lifespan: 2, margin: 25, cac: 150 },
};

export function computeClv(i: ClvInputs): ClvResults {
  const annualValue = i.aov * i.frequency;
  const grossClv = annualValue * i.lifespan;
  const netClv = grossClv * (i.margin / 100);
  const clvCacRatio = i.cac > 0 ? netClv / i.cac : 0;
  const netProfit = netClv - i.cac;
  return { annualValue, grossClv, netClv, clvCacRatio, netProfit };
}

/* =========================================================================
   3. Discount Impact Calculator (Multi-tab)
   ========================================================================= */
export type DiscountTab = "product" | "order" | "bogo" | "freeShipping" | "quantity";

export interface DetailedDiscountInputs {
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

export interface DetailedDiscountResults {
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

export const DISCOUNT_DEFAULTS: DetailedDiscountInputs = {
  originalPrice: 800,
  aov: 1200,
  cogs: 300,
  cogsPerItem: 250,
  itemsPerOrder: 2,
  shipping: 70,
  adCost: 150,
  discountPct: 20,
  currentOrders: 150,
  expectedLift: 50,
};

export function computeDetailedDiscount(
  inputs: DetailedDiscountInputs,
  tab: DiscountTab,
): DetailedDiscountResults {
  const { originalPrice, aov, cogs, cogsPerItem, itemsPerOrder, shipping, adCost, discountPct, currentOrders, expectedLift } = inputs;

  let priceBefore: number;
  let priceAfter: number;
  let totalCostPerUnit: number;

  switch (tab) {
    case "product":
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      priceAfter = originalPrice * (1 - discountPct / 100);
      break;
    case "order":
      totalCostPerUnit = (cogsPerItem + adCost) * itemsPerOrder + shipping;
      priceBefore = aov;
      priceAfter = aov * (1 - discountPct / 100);
      break;
    case "bogo":
      totalCostPerUnit = (cogs + shipping + adCost) * 2;
      priceBefore = originalPrice * 2;
      priceAfter = originalPrice * 1;
      break;
    case "freeShipping":
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice + shipping;
      priceAfter = originalPrice * 1;
      break;
    case "quantity":
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      priceAfter = originalPrice * (1 - Math.min(50, discountPct) / 100);
      break;
    default:
      totalCostPerUnit = cogs + shipping + adCost;
      priceBefore = originalPrice;
      priceAfter = originalPrice * (1 - discountPct / 100);
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
    totalCostPerUnit,
    priceBefore,
    priceAfter,
    profitPerUnitBefore,
    profitPerUnitAfter,
    marginBeforePct,
    marginAfterPct,
    totalProfitBefore,
    totalProfitAfter,
    profitChange,
    profitChangePct,
    breakEvenOrders,
    requiredLiftPct,
    isLiftAchievable,
  };
}

/* =========================================================================
   4. Pricing Strategy Calculator
   ========================================================================= */
export interface PricingInputs {
  cogs: number;
  markupPct: number;
  competitorPrice: number;
  monthlyFixedCosts: number;
  targetUnits: number;
}

export interface PricingResults {
  sellingPrice: number;
  grossMarginPerUnit: number;
  grossMarginPct: number;
  totalMonthlyRevenue: number;
  totalMonthlyProfit: number;
  breakEvenUnits: number;
  priceVersusCompetitorPct: number;
}

export function computePricingStrategy(i: PricingInputs): PricingResults {
  const sellingPrice = i.cogs * (1 + i.markupPct / 100);
  const grossMarginPerUnit = sellingPrice - i.cogs;
  const grossMarginPct = sellingPrice > 0 ? (grossMarginPerUnit / sellingPrice) * 100 : 0;
  const totalMonthlyRevenue = sellingPrice * i.targetUnits;
  const totalMonthlyProfit = grossMarginPerUnit * i.targetUnits - i.monthlyFixedCosts;
  const breakEvenUnits =
    grossMarginPerUnit > 0 ? Math.ceil(i.monthlyFixedCosts / grossMarginPerUnit) : 0;
  const priceVersusCompetitorPct =
    i.competitorPrice > 0
      ? ((sellingPrice - i.competitorPrice) / i.competitorPrice) * 100
      : 0;

  return {
    sellingPrice,
    grossMarginPerUnit,
    grossMarginPct,
    totalMonthlyRevenue,
    totalMonthlyProfit,
    breakEvenUnits,
    priceVersusCompetitorPct,
  };
}

/* =========================================================================
   5. Product Break Even Calculator
   ========================================================================= */
export interface BreakEvenInputs {
  monthlyFixedCosts: number;
  averageSellingPrice: number;
  variableCostPerUnit: number;
  currentMonthlyUnits: number;
}

export interface BreakEvenResults {
  contributionMargin: number;
  contributionMarginRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  currentMonthlyProfit: number;
  safetyMarginPct: number;
}

export function computeProductBreakEven(i: BreakEvenInputs): BreakEvenResults {
  const contributionMargin = i.averageSellingPrice - i.variableCostPerUnit;
  const contributionMarginRatio =
    i.averageSellingPrice > 0 ? contributionMargin / i.averageSellingPrice : 0;
  const breakEvenUnits =
    contributionMargin > 0 ? Math.ceil(i.monthlyFixedCosts / contributionMargin) : 0;
  const breakEvenRevenue = breakEvenUnits * i.averageSellingPrice;
  const currentMonthlyProfit =
    contributionMargin * i.currentMonthlyUnits - i.monthlyFixedCosts;
  const safetyMarginPct =
    i.currentMonthlyUnits > 0
      ? ((i.currentMonthlyUnits - breakEvenUnits) / i.currentMonthlyUnits) * 100
      : 0;

  return {
    contributionMargin,
    contributionMarginRatio,
    breakEvenUnits,
    breakEvenRevenue,
    currentMonthlyProfit,
    safetyMarginPct,
  };
}
