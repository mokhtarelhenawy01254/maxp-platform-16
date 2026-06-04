import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalculatorIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  MinusIcon,
  BookmarkIcon as SaveIcon,
} from "@heroicons/react/24/outline";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import LineChart from "../../components/charts/LineChart";
import BarChart from "../../components/charts/BarChart";

// Types
interface CampaignInputs {
  campaignName: string;
  productName: string;
  targetAudienceSize: number;
  campaignDuration: number;
  messageType:
    | "promotional"
    | "reminder"
    | "welcome"
    | "abandoned_cart"
    | "custom";
  budget: number;
  costPerMessage: number;
  productPrice: number;
  profitMargin: number;
  averageOrderValue: number;
  expectedOpenRate: number;
  expectedResponseRate: number;
  expectedConversionRate: number;
  useHistoricalData: boolean;
  historicalPeriod: "7d" | "30d" | "90d";
  // Performance metrics
  dailyTarget: number;
  orderTarget: number;
  successfulMessages: number;
  failedMessages: number;
  repliesReceived: number; // Added
  currentOrders: number;
}

interface PredictionResults {
  expectedMessagesSent: number;
  expectedSavedMessages: number;
  expectedConversations: number;
  expectedConversions: number;
  expectedRevenue: number;
  expectedProfit: number;
  expectedRoi: number;
  costPerAcquisition: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  confidenceScore: number;

  // KPI rates
  successRate: number;
  failureRate: number;
  replyRate: number; // Added
  orderRate: number; // Added

  // Achievement/Goal fields
  totalSent: number;
  orderAchievementRate: number;
  remainingOrdersToTarget: number;
  messagesToDailyTarget: number;
  sendingAchievementRate: number;

  // Predictive fields
  expectedOrdersFromSuccess: number;
  expectedOrdersFromDaily: number;
  messagesPerOrder: number;
  requiredSuccessfulMessages: number; // Added (Goal Predictor)
}

interface ScenarioResults {
  conservative: PredictionResults;
  realistic: PredictionResults;
  optimistic: PredictionResults;
  custom: PredictionResults;
}

interface HistoricalDefaults {
  avgOpenRate: number;
  avgResponseRate: number;
  avgConversionRate: number;
  avgRevenuePerMessage: number;
  avgRevenuePerConversation: number;
  peakHours: number[];
  bestDays: string[];
  costPerMessage: number;
}

interface SavedScenario {
  id: string;
  name: string;
  inputs: CampaignInputs;
  results: PredictionResults;
  createdAt: Date;
}

type CampaignTab = "input" | "results" | "scenarios" | "comparison";

type StoredPredictionResults = Partial<PredictionResults> & {
  roi?: number;
  conversions?: number;
  revenue?: number;
  profit?: number;
};

interface StoredScenarioPayload {
  id: string;
  name: string;
  inputs: CampaignInputs;
  results?: StoredPredictionResults;
  createdAt: string;
}

const CampaignPredictionCalculator: React.FC = () => {
  const tabs: Array<{
    id: CampaignTab;
    label: string;
    icon: typeof CalculatorIcon;
  }> = [
    { id: "input", label: "إعدادات الحملة", icon: CalculatorIcon },
    {
      id: "results",
      label: "النتائج المتوقعة",
      icon: ChartBarIcon,
    },
  ];

  const [defaults, setDefaults] = useState<HistoricalDefaults | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [activeTab, setActiveTab] = useState<CampaignTab>("input");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarioResults, setScenarioResults] =
    useState<ScenarioResults | null>(null);

  // Form inputs
  const [inputs, setInputs] = useState<CampaignInputs>({
    campaignName: "",
    productName: "",
    targetAudienceSize: 1000,
    campaignDuration: 7,
    messageType: "promotional",
    budget: 500,
    costPerMessage: 0.05,
    productPrice: 150,
    profitMargin: 30,
    averageOrderValue: 150,
    expectedOpenRate: 75,
    expectedResponseRate: 25,
    expectedConversionRate: 12,
    useHistoricalData: true,
    historicalPeriod: "30d",
    dailyTarget: 1000,
    orderTarget: 100,
    successfulMessages: 0,
    failedMessages: 0,
    repliesReceived: 0,
    currentOrders: 0,
  });

  // Fetch historical defaults on mount
  const fetchHistoricalDefaults = useCallback(async () => {
    try {
      const response = await fetch(
        buildApiUrl("campaign-calculator/defaults"),
        {
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDefaults(data.data);
          // Auto-fill with historical data if enabled
          if (inputs.useHistoricalData) {
            setInputs((prev) => ({
              ...prev,
              expectedOpenRate: data.data.avgOpenRate || prev.expectedOpenRate,
              expectedResponseRate:
                data.data.avgResponseRate || prev.expectedResponseRate,
              expectedConversionRate:
                data.data.avgConversionRate || prev.expectedConversionRate,
              costPerMessage: data.data.costPerMessage || prev.costPerMessage,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching historical defaults:", err);
    }
  }, [inputs.useHistoricalData]);

  const loadSavedScenarios = useCallback(() => {
    const saved = localStorage.getItem("campaignScenarios");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredScenarioPayload[];
        setSavedScenarios(
          parsed.map((scenario) => {
            // Migrate old format to new format if needed
            const results = {
              ...(scenario.results || {}),
            } as StoredPredictionResults;
            if (
              results.roi !== undefined &&
              results.expectedRoi === undefined
            ) {
              results.expectedConversions = results.conversions;
              results.expectedRevenue = results.revenue;
              results.expectedProfit = results.profit;
              results.expectedRoi = results.roi;
            }
            return {
              ...scenario,
              results: results as PredictionResults,
              createdAt: new Date(scenario.createdAt),
            };
          }),
        );
      } catch (e) {
        console.error("Error loading saved scenarios:", e);
      }
    }
  }, []);

  useEffect(() => {
    fetchHistoricalDefaults();
    loadSavedScenarios();
  }, [fetchHistoricalDefaults, loadSavedScenarios]);

  const saveScenario = () => {
    if (!inputs.campaignName) {
      alert("الرجاء إدخال اسم للحملة قبل الحفظ");
      return;
    }

    const newScenario: SavedScenario = {
      id: Date.now().toString(),
      name: inputs.campaignName,
      inputs: { ...inputs },
      results: calculatePredictions(inputs),
      createdAt: new Date(),
    };

    const updated = [...savedScenarios, newScenario];
    setSavedScenarios(updated);
    localStorage.setItem("campaignScenarios", JSON.stringify(updated));
    alert("تم حفظ السيناريو بنجاح!");
  };

  // Calculation functions
  const calculatePredictions = useCallback(
    (campaignInputs: CampaignInputs): PredictionResults => {
      const {
        targetAudienceSize,
        costPerMessage,
        productPrice,
        profitMargin,
        averageOrderValue,
        expectedOpenRate,
        expectedResponseRate,
        expectedConversionRate,
        // New metrics inputs
        dailyTarget,
        orderTarget,
        successfulMessages,
        failedMessages,
        repliesReceived,
        currentOrders,
      } = campaignInputs;

      // Core calculations
      const expectedMessagesSent = targetAudienceSize;
      const expectedSavedMessages = Math.round(
        targetAudienceSize * (expectedOpenRate / 100),
      );
      const expectedConversations = Math.round(
        expectedSavedMessages * (expectedResponseRate / 100),
      );
      const expectedConversions = Math.round(
        expectedConversations * (expectedConversionRate / 100),
      );

      // Revenue calculations
      const expectedRevenue = expectedConversions * averageOrderValue;
      const expectedProfit = expectedRevenue * (profitMargin / 100);
      const totalCost = expectedMessagesSent * costPerMessage;
      const expectedRoi =
        totalCost > 0 ? ((expectedProfit - totalCost) / totalCost) * 100 : 0;

      // CPA and Break-even
      const costPerAcquisition =
        expectedConversions > 0 ? totalCost / expectedConversions : 0;
      const profitPerUnit = productPrice * (profitMargin / 100);
      const breakEvenUnits =
        profitPerUnit > 0 ? Math.ceil(totalCost / profitPerUnit) : 0;
      const breakEvenRevenue = breakEvenUnits * productPrice;

      // Confidence score based on data availability
      const confidenceScore = defaults ? 85 : 60;

      // Total Sent
      const totalSent = successfulMessages + failedMessages;

      // Rates calculation
      const successRate =
        totalSent > 0 ? (successfulMessages / totalSent) * 100 : 0;
      const failureRate =
        totalSent > 0 ? (failedMessages / totalSent) * 100 : 0;
      const replyRate =
        successfulMessages > 0
          ? (repliesReceived / successfulMessages) * 100
          : 0;
      const orderRate =
        successfulMessages > 0 ? (currentOrders / successfulMessages) * 100 : 0;

      // Achievement
      const orderAchievementRate =
        orderTarget > 0 ? (currentOrders / orderTarget) * 100 : 0;
      const remainingOrdersToTarget = Math.max(0, orderTarget - currentOrders);
      const messagesToDailyTarget = Math.max(0, dailyTarget - totalSent);
      const sendingAchievementRate =
        dailyTarget > 0 ? (totalSent / dailyTarget) * 100 : 0;

      // Predictors
      const avgOrderRate = orderRate / 100;
      const expectedOrdersFromSuccess = Math.round(
        successfulMessages * avgOrderRate,
      );
      const expectedOrdersFromDaily = Math.round(dailyTarget * avgOrderRate);
      const messagesPerOrder =
        currentOrders > 0 ? successfulMessages / currentOrders : 0;

      // The "Goal Predictor": How many successful messages needed for the Target Orders?
      // Using current performance (orderRate)
      const requiredSuccessfulMessages =
        avgOrderRate > 0 ? Math.ceil(orderTarget / avgOrderRate) : 0;

      return {
        expectedMessagesSent,
        expectedSavedMessages,
        expectedConversations,
        expectedConversions,
        expectedRevenue,
        expectedProfit,
        expectedRoi,
        costPerAcquisition,
        breakEvenUnits,
        breakEvenRevenue,
        confidenceScore,
        // New metrics
        successRate,
        failureRate,
        replyRate,
        orderRate,
        totalSent,
        orderAchievementRate,
        remainingOrdersToTarget,
        messagesToDailyTarget,
        sendingAchievementRate,
        expectedOrdersFromSuccess,
        expectedOrdersFromDaily,
        messagesPerOrder,
        requiredSuccessfulMessages,
      };
    },
    [defaults],
  );

  // Calculate all scenarios
  useEffect(() => {
    const conservative: CampaignInputs = {
      ...inputs,
      expectedOpenRate: inputs.expectedOpenRate * 0.7,
      expectedResponseRate: inputs.expectedResponseRate * 0.6,
      expectedConversionRate: inputs.expectedConversionRate * 0.5,
    };

    const optimistic: CampaignInputs = {
      ...inputs,
      expectedOpenRate: Math.min(inputs.expectedOpenRate * 1.2, 95),
      expectedResponseRate: Math.min(inputs.expectedResponseRate * 1.3, 60),
      expectedConversionRate: Math.min(inputs.expectedConversionRate * 1.5, 40),
    };

    setScenarioResults({
      conservative: calculatePredictions(conservative),
      realistic: calculatePredictions(inputs),
      optimistic: calculatePredictions(optimistic),
      custom: calculatePredictions(inputs),
    });
  }, [inputs, calculatePredictions]);

  const currentResults = scenarioResults?.realistic;

  // Chart data
  const funnelData = useMemo(() => {
    if (!currentResults) return [];
    return [
      {
        name: "الجمهور المستهدف",
        value: currentResults.expectedMessagesSent,
        color: "#3b82f6",
      },
      {
        name: "الرسائل المحفوظة",
        value: currentResults.expectedSavedMessages,
        color: "#8b5cf6",
      },
      {
        name: "المحادثات",
        value: currentResults.expectedConversations,
        color: "#f59e0b",
      },
      {
        name: "التحويلات",
        value: currentResults.expectedConversions,
        color: "#10b981",
      },
    ];
  }, [currentResults]);

  const dailyProjectionData = useMemo(() => {
    if (!currentResults) return [];
    const days = inputs.campaignDuration;
    const dailyRevenue = currentResults.expectedRevenue / days;
    const data = [];
    let cumulative = 0;

    for (let i = 1; i <= days; i++) {
      cumulative += dailyRevenue;
      data.push({
        day: `يوم ${i}`,
        daily: Math.round(dailyRevenue),
        cumulative: Math.round(cumulative),
        breakEven: currentResults.breakEvenRevenue,
      });
    }
    return data;
  }, [currentResults, inputs.campaignDuration]);

  // Smart recommendations
  const recommendations = useMemo(() => {
    const recs: Array<{
      type: "warning" | "success" | "info";
      title: string;
      message: string;
    }> = [];
    if (!currentResults) return recs;

    if (currentResults.expectedRoi < 0) {
      recs.push({
        type: "warning",
        title: "تحذير: ROI سالب",
        message:
          "الحملة المتوقع أن تكون غير مربحة. consider زيادة معدل التحويل أو تقليل التكلفة.",
      });
    }

    if (currentResults.expectedRoi > 100) {
      recs.push({
        type: "success",
        title: "فرصة ممتازة",
        message: `ROI متوقع ${currentResults.expectedRoi?.toFixed(0) || 0}% - هذه حملة واعدة جداً!`,
      });
    }

    if (inputs.expectedConversionRate < 5) {
      recs.push({
        type: "info",
        title: "تحسين معدل التحويل",
        message: "معدل التحويل منخفض. جرب تحسين نص الرسالة أو عرض خصم أكبر.",
      });
    }

    if (defaults) {
      if (inputs.expectedOpenRate < defaults.avgOpenRate) {
        recs.push({
          type: "info",
          title: "نسبة الفتح أقل من المتوسط",
          message: `متوسط الشركة ${defaults.avgOpenRate}%. تحقق من جودة عنوان الرسالة.`,
        });
      }
    }

    return recs;
  }, [currentResults, inputs, defaults]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ar-EG").format(value);
  };

  const renderRiskBadge = (roi: number) => {
    if (roi < 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium business-bg-danger-soft business-text-danger">
          <ExclamationTriangleIcon className="w-4 h-4 ml-1" />
          مخاطر عالية
        </span>
      );
    } else if (roi < 50) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium business-bg-warning-soft business-text-warning">
          <MinusIcon className="w-4 h-4 ml-1" />
          مخاطر متوسطة
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium business-bg-success-soft business-text-success">
          <CheckCircleIcon className="w-4 h-4 ml-1" />
          فرصة ممتازة
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen business-shell-gradient p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold business-text-strong mb-2 flex items-center gap-3">
                <CalculatorIcon className="w-10 h-10 business-text-primary" />
                حاسبة توقعات نتائج الحملات
              </h1>
              <p className="business-text-muted">
                خطط لحملاتك بذكاء مع توقعات دقيقة بناءً على البيانات التاريخية
              </p>
            </div>
            {defaults && (
              <div className="text-sm business-text-muted business-bg-panel px-4 py-2 rounded-lg shadow">
                <SparklesIcon className="w-4 h-4 inline ml-1 business-text-warning" />
                بيانات تاريخية متاحة
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="business-bg-panel rounded-xl shadow-lg mb-6">
          <div className="border-b business-border">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "business-border-primary-strong business-text-primary"
                      : "business-border-clear business-text-muted business-hover-muted business-control-border"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Input Tab */}
        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Data Inputs */}
            <div className="business-bg-panel rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold business-text-strong mb-4 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 business-text-primary" />
                بيانات الحملة المباشرة
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium business-text-body mb-1">
                    اسم المنتج
                  </label>
                  <input
                    type="text"
                    value={inputs.productName}
                    onChange={(e) =>
                      setInputs({ ...inputs, productName: e.target.value })
                    }
                    className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                    placeholder="مثال: عرض سماعات بلوتوث"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium business-text-body mb-1">
                      التارجيت اليومي
                    </label>
                    <input
                      type="number"
                      value={inputs.dailyTarget}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          dailyTarget: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium business-text-body mb-1">
                      تارجت الاوردرات
                    </label>
                    <input
                      type="number"
                      value={inputs.orderTarget}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          orderTarget: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium business-text-body mb-1">
                      عدد الرسايل الناجح (الإجمالي)
                    </label>
                    <input
                      type="number"
                      value={inputs.successfulMessages}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          successfulMessages: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-success-soft business-text-strong business-focus-success font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium business-text-body mb-1">
                      عدد الرسايل الفاشل (الإجمالي)
                    </label>
                    <input
                      type="number"
                      value={inputs.failedMessages}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          failedMessages: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-danger-soft business-text-strong business-focus-danger font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium business-text-body mb-1">
                      عدد الردود المستلمة (العملاء اللي ردوا)
                    </label>
                    <input
                      type="number"
                      value={inputs.repliesReceived}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          repliesReceived: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-secondary-soft business-text-strong business-focus-secondary font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium business-text-body mb-1">
                    عدد الاوردرات الحالي
                  </label>
                  <input
                    type="number"
                    value={inputs.currentOrders}
                    onChange={(e) =>
                      setInputs({
                        ...inputs,
                        currentOrders: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-primary-soft business-text-strong business-focus-primary font-bold text-xl"
                  />
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full mt-4 text-sm business-text-primary hover:underline flex items-center justify-center gap-1"
                >
                  {showAdvanced
                    ? "إخفاء الإعدادات المتقدمة"
                    : "إظهار إعدادات الحسابات المتقدمة"}
                  {showAdvanced ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <>
                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold business-text-strong mb-4 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 business-text-success" />
                    الافتراضات المالية
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium business-text-body mb-1">
                        إجمالي الجمهور المستهدف
                      </label>
                      <input
                        type="number"
                        value={inputs.targetAudienceSize}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            targetAudienceSize: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium business-text-body mb-1">
                        تكلفة الرسالة (ج.م)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={inputs.costPerMessage}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            costPerMessage: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium business-text-body mb-1">
                        متوسط قيمة الأوردر (ج.م)
                      </label>
                      <input
                        type="number"
                        value={inputs.averageOrderValue}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            averageOrderValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold business-text-strong mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 business-text-secondary" />
                    افتراضات الأداء (%)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium business-text-body mb-1">
                        معدل التحويل المتوقع (%)
                      </label>
                      <input
                        type="number"
                        value={inputs.expectedConversionRate}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            expectedConversionRate:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
                      />
                      <p className="text-xs business-text-muted mt-1">
                        يُستخدم للتوقعات المستقبلية بناءً على الإرسال الناجح
                      </p>
                    </div>
                    {/* Use Historical Data Toggle */}
                    <div className="mt-6 p-4 business-bg-primary-soft rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inputs.useHistoricalData}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setInputs({
                              ...inputs,
                              useHistoricalData: checked,
                            });
                            if (checked && defaults) {
                              setInputs((prev) => ({
                                ...prev,
                                useHistoricalData: true,
                                expectedConversionRate:
                                  defaults.avgConversionRate,
                                costPerMessage: defaults.costPerMessage,
                              }));
                            }
                          }}
                          className="w-5 h-5 business-text-primary rounded business-focus-primary"
                        />
                        <div>
                          <p className="text-sm font-medium business-text-strong">
                            استخدام البيانات التاريخية
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Results Tab */}
        {(activeTab === "results" || !showAdvanced) && currentResults && (
          <div className="space-y-6 mt-6">
            {/* Dashboard Results (The 17 requested fields) */}
            <div className="business-bg-panel rounded-xl shadow-lg p-6 border-t-4 business-border-primary-strong">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold business-text-strong flex items-center gap-3">
                  <SparklesIcon className="w-8 h-8 business-text-warning" />
                  تحليل الأداء المباشر ({inputs.productName || "المنتج"})
                </h3>
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 business-bg-primary-soft business-text-primary rounded-full text-sm font-bold">
                    تارجت رسايل: {formatNumber(inputs.dailyTarget)}
                  </span>
                  <span className="px-4 py-1.5 business-bg-success-soft business-text-success rounded-full text-sm font-bold">
                    تارجت اوردرات: {formatNumber(inputs.orderTarget)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Predictive Target (The Goal Predictor) */}
                <div className="lg:col-span-4 business-bg-brand-gradient rounded-2xl p-8 business-text-on-accent shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <SparklesIcon className="w-32 h-32" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <CalculatorIcon className="w-6 h-6" />
                      توقعات تحقيق الهدف (Goal Predictor)
                    </h4>
                    <p className="business-text-on-accent mb-6 text-lg">
                      لتحقيق هدفك بالوصول إلى{" "}
                      <span className="font-black business-text-on-accent">
                        {formatNumber(inputs.orderTarget)}
                      </span>{" "}
                      أوردر بناءً على أدائك الحالي:
                    </p>
                    <div className="flex flex-col md:flex-row items-baseline gap-4">
                      <p className="text-sm opacity-80">
                        أنت بحاجة إلى إجمالي إرسال ناجح:
                      </p>
                      <p className="text-6xl font-black">
                        {formatNumber(
                          currentResults.requiredSuccessfulMessages,
                        )}
                      </p>
                      <p className="text-2xl font-bold opacity-90">
                        رسالة ناجحة
                      </p>
                    </div>
                    <div className="mt-8 flex gap-6 border-t business-border-on-accent pt-6">
                      <div>
                        <p className="text-xs opacity-70 mb-1">
                          نسبة الردود الحالية
                        </p>
                        <p className="text-xl font-bold">
                          {currentResults.replyRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70 mb-1">
                          نسبة الأوردرات الحالية
                        </p>
                        <p className="text-xl font-bold">
                          {currentResults.orderRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievement Summary */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      الوصول الفعلي (ناجح)
                    </p>
                    <p className="text-4xl font-black business-text-primary">
                      {formatNumber(inputs.successfulMessages)}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-bold business-text-subtle">
                        من إجمالي {formatNumber(currentResults.totalSent)}
                      </span>
                      <span className="text-xs font-bold business-text-success">
                        نجاح {currentResults.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      الردود (الناس اللي ردت)
                    </p>
                    <p className="text-4xl font-black business-text-secondary">
                      {formatNumber(inputs.repliesReceived)}
                    </p>
                    <p className="text-xs mt-3 font-bold business-text-secondary">
                      نسبة الرد: {currentResults.replyRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      عدد الاوردرات الحالي
                    </p>
                    <p className="text-4xl font-black business-text-success">
                      {formatNumber(inputs.currentOrders)}
                    </p>
                    <div className="mt-3 w-full business-bg-soft-strong business-bg-soft h-2 rounded-full overflow-hidden">
                      <div
                        className="business-bg-success-solid h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, currentResults.orderAchievementRate)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs mt-2 font-bold business-text-subtle">
                      تحقيق الهدف:{" "}
                      {currentResults.orderAchievementRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      تحليل الأداء (أوردر/إرسال)
                    </p>
                    <p className="text-3xl font-bold business-text-secondary">
                      {currentResults.orderRate.toFixed(2)}%
                    </p>
                    <p className="text-xs mt-1 business-text-subtle">
                      {currentResults.messagesPerOrder.toFixed(1)} رسالة لكل
                      أوردر
                    </p>
                  </div>
                </div>

                {/* Status Metrics */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      الباقي علي تارجت الاوردرات
                    </p>
                    <p className="text-3xl font-bold business-text-warning">
                      {formatNumber(currentResults.remainingOrdersToTarget)}
                    </p>
                    <p className="text-xs mt-1 business-text-subtle">
                      من أصل {inputs.orderTarget}
                    </p>
                  </div>

                  <div className="business-bg-soft p-5 rounded-2xl border business-border relative overflow-hidden">
                    <p className="text-sm business-text-muted mb-1">
                      إحصائيات الفشل
                    </p>
                    <p className="text-3xl font-bold business-text-danger">
                      {formatNumber(inputs.failedMessages)}
                    </p>
                    <p className="text-xs mt-1 font-bold business-text-danger">
                      نسبة الفشل: {currentResults.failureRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="business-bg-soft p-5 rounded-2xl border business-border">
                    <p className="text-sm business-text-muted mb-1">
                      الباقي علي تارجيت ارسال
                    </p>
                    <p className="text-3xl font-bold business-text-secondary">
                      {formatNumber(currentResults.messagesToDailyTarget)}
                    </p>
                    <p className="text-xs mt-1 font-bold business-text-subtle">
                      إنجاز الإرسال:{" "}
                      {currentResults.sendingAchievementRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="business-bg-primary-soft p-5 rounded-2xl border business-border-primary-soft">
                    <p className="text-xs business-text-primary font-bold mb-1">
                      المتوقع عند اكتمال الإرسال
                    </p>
                    <p className="text-3xl font-black business-text-primary">
                      {formatNumber(currentResults.expectedOrdersFromDaily)}
                    </p>
                    <p className="text-[10px] mt-1 business-text-primary opacity-70">
                      أوردر متوقع تحقيقه اليوم
                    </p>
                  </div>
                </div>
              </div>

              {/* Extra details row */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t business-border pt-6">
                <div>
                  <p className="text-xs business-text-subtle mb-1">
                    التارجيت اليومي
                  </p>
                  <p className="text-lg font-bold business-text-body">
                    {formatNumber(inputs.dailyTarget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs business-text-subtle mb-1">
                    عدد الارسال الفاشل
                  </p>
                  <p className="text-lg font-bold business-text-danger">
                    {formatNumber(inputs.failedMessages)}
                  </p>
                </div>
                <div>
                  <p className="text-xs business-text-subtle mb-1">
                    نسبة الرسايل للارسال
                  </p>
                  <p className="text-lg font-bold business-text-success">
                    {currentResults.successRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs business-text-subtle mb-1">المنتج</p>
                  <p className="text-lg font-bold business-text-body">
                    {inputs.productName || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Existing analysis (Show only if showAdvanced is true) */}
            {showAdvanced && (
              <div className="business-bg-primary-solid  rounded-xl shadow-lg p-6 business-text-on-accent mb-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CalculatorIcon className="w-6 h-6" />
                  تحليل مالي متقدم
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="business-bg-accent-glass rounded-lg p-4">
                    <p className="text-sm opacity-80 mb-1">
                      عدد المحادثات المتوقعة
                    </p>
                    <p className="text-3xl font-bold">
                      {formatNumber(currentResults.expectedConversations)}
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      بناءً على نسبة رد {inputs.expectedResponseRate}%
                    </p>
                  </div>
                  <div className="business-bg-accent-glass rounded-lg p-4">
                    <p className="text-sm opacity-80 mb-1">
                      عدد الأوردرات المتوقعة (كامل الجمهور)
                    </p>
                    <p className="text-3xl font-bold">
                      {formatNumber(currentResults.expectedConversions)}
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      بناءً على نسبة تحويل {inputs.expectedConversionRate}%
                    </p>
                  </div>
                  <div className="business-bg-accent-glass rounded-lg p-4">
                    <p className="text-sm opacity-80 mb-1">
                      الإيرادات المتوقعة
                    </p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(currentResults.expectedRevenue)}
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      بمتوسط {inputs.averageOrderValue} ج.م/أوردر
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards (Detailed) */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="business-bg-brand-gradient rounded-xl shadow-lg p-6 business-text-on-accent">
                  <div className="flex items-center justify-between mb-4">
                    <CurrencyDollarIcon className="h-12 w-12 opacity-80" />
                    {renderRiskBadge(currentResults.expectedRoi)}
                  </div>
                  <p className="text-sm opacity-90 mb-1">الإيرادات المتوقعة</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(currentResults.expectedRevenue)}
                  </p>
                </div>

                <div className="business-bg-success-gradient rounded-xl shadow-lg p-6 business-text-on-accent">
                  <div className="flex items-center justify-between mb-4">
                    <ArrowTrendingUpIcon className="h-12 w-12 opacity-80" />
                    <div className="business-bg-accent-glass-strong rounded-full p-2">
                      <span className="text-lg font-bold">
                        {currentResults.expectedRoi?.toFixed(0) || 0}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-1">الربح المتوقع</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(currentResults.expectedProfit)}
                  </p>
                </div>

                <div className="business-bg-secondary-gradient rounded-xl shadow-lg p-6 business-text-on-accent">
                  <div className="flex items-center justify-between mb-4">
                    <UsersIcon className="h-12 w-12 opacity-80" />
                    <div className="business-bg-accent-glass-strong rounded-full p-2">
                      <span className="text-lg font-bold">
                        {formatNumber(currentResults.expectedConversions)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-1">التحويلات المتوقعة</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(currentResults.expectedConversions)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    من {formatNumber(currentResults.expectedConversations)}{" "}
                    محادثة
                  </p>
                </div>

                <div className="business-bg-warning-gradient rounded-xl shadow-lg p-6 business-text-on-accent">
                  <div className="flex items-center justify-between mb-4">
                    <CalculatorIcon className="h-12 w-12 opacity-80" />
                    <div className="business-bg-accent-glass-strong rounded-full p-2">
                      <span className="text-lg font-bold">CPA</span>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-1">تكلفة اكتساب العميل</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(currentResults.costPerAcquisition)}
                  </p>
                </div>
              </div>
            )}

            {showAdvanced && (
              <div className="business-bg-panel rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold business-text-strong mb-6 flex items-center gap-2">
                  <InformationCircleIcon className="w-6 h-6 business-text-primary" />
                  تحليل نقطة التعادل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 business-bg-primary-soft rounded-xl">
                    <p className="text-sm business-text-primary mb-2">
                      وحدات التعادل المطلوبة
                    </p>
                    <p className="text-3xl font-bold business-text-primary">
                      {formatNumber(currentResults.breakEvenUnits)}
                    </p>
                    <p className="text-xs business-text-primary mt-1">
                      منتج/خدمة
                    </p>
                  </div>
                  <div className="p-4 business-bg-success-soft rounded-xl">
                    <p className="text-sm business-text-success mb-2">
                      إيرادات التعادل
                    </p>
                    <p className="text-3xl font-bold business-text-success">
                      {formatCurrency(currentResults.breakEvenRevenue)}
                    </p>
                    <p className="text-xs business-text-success mt-1">
                      المبلغ المطلوب تحقيقه
                    </p>
                  </div>
                  <div className="p-4 business-bg-secondary-soft rounded-xl">
                    <p className="text-sm business-text-secondary mb-2">
                      فائض التعادل
                    </p>
                    <p className="text-3xl font-bold business-text-secondary">
                      {formatNumber(
                        Math.max(
                          0,
                          currentResults.expectedConversions -
                            currentResults.breakEvenUnits,
                        ),
                      )}
                    </p>
                    <p className="text-xs business-text-secondary mt-1">
                      وحدات فوق التعادل
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts (Advanced) */}
            {showAdvanced && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold business-text-strong mb-4">
                    قمع التحويل المتوقع
                  </h3>
                  <div className="h-80">
                    <BarChart
                      data={funnelData}
                      xKey="name"
                      bars={[{ key: "value", name: "العدد", color: "#3b82f6" }]}
                      height={300}
                    />
                  </div>
                </div>

                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold business-text-strong mb-4">
                    توقع الإيرادات اليومية
                  </h3>
                  <div className="h-80">
                    <LineChart
                      data={dailyProjectionData}
                      xKey="day"
                      lines={[
                        {
                          key: "cumulative",
                          name: "الإيرادات التراكمية",
                          color: "#10b981",
                        },
                        {
                          key: "breakEven",
                          name: "نقطة التعادل",
                          color: "#ef4444",
                        },
                      ]}
                      height={300}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Smart Recommendations (Advanced) */}
            {showAdvanced && recommendations.length > 0 && (
              <div className="business-bg-panel rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold business-text-strong mb-4 flex items-center gap-2">
                  <LightBulbIcon className="w-6 h-6 business-text-warning" />
                  توصيات ذكية
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg flex items-start gap-3 ${
                        rec.type === "warning"
                          ? "business-bg-danger-soft border business-border-danger-soft"
                          : rec.type === "success"
                            ? "business-bg-success-soft border business-border-success-soft"
                            : "business-bg-primary-soft border business-border-primary-soft"
                      }`}
                    >
                      {rec.type === "warning" ? (
                        <ExclamationTriangleIcon className="w-5 h-5 business-text-danger flex-shrink-0 mt-0.5" />
                      ) : rec.type === "success" ? (
                        <CheckCircleIcon className="w-5 h-5 business-text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <InformationCircleIcon className="w-5 h-5 business-text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium business-text-strong">
                          {rec.title}
                        </p>
                        <p className="text-sm business-text-muted">
                          {rec.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Scenario Button (Advanced) */}
            {showAdvanced && (
              <div className="flex justify-center">
                <button
                  onClick={saveScenario}
                  className="flex items-center gap-2 px-6 py-3 business-bg-primary-solid business-text-on-accent rounded-lg business-hover-primary-solid transition-colors font-medium"
                >
                  <SaveIcon className="w-5 h-5" />
                  حفظ هذا السيناريو
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignPredictionCalculator;
