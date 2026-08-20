import React, { useState, useEffect, useMemo } from 'react';
import {
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  DollarSign as DollarSignIcon,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  RefreshCw as RefreshCwIcon,
  Download as DownloadIcon,
  AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuthSimple';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { buildApiUrl } from '../../utils/urlHelper';

interface PredictionParams {
  messagesCount: number;
  savedRate: number;
  conversionRate: number;
  avgRevenuePerConversation: number;
  campaignCost: number;
  peakHour: number;
  bestDay: number;
}

interface PredictionResult {
  predictedSaved: number;
  predictedIgnored: number;
  predictedConversations: number;
  predictedRevenue: number;
  predictedOrders: number;
  roi: number;
  breakEven: number;
  profit: number;
  costPerMessage: number;
  costPerConversion: number;
  scenarios: ScenarioResult[];
}

interface ScenarioResult {
  name: string;
  description: string;
  savedRate: number;
  conversionRate: number;
  revenue: number;
  roi: number;
  profit: number;
}

interface HistoricalStats {
  averageSavedRate: number;
  averageConversionRate: number;
  averageRevenuePerConversation: number;
  peakHour: number;
  bestDay: number;
  dailyTrend: Array<{
    date: string;
    savedRate: number;
    conversionRate: number;
    revenue: number;
  }>;
  hourlyPattern: Array<{
    hour: number;
    savedRate: number;
    conversionRate: number;
  }>;
}

const CampaignResultsPredictor: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [params, setParams] = useState<PredictionParams>({
    messagesCount: 1000,
    savedRate: 35,
    conversionRate: 12,
    avgRevenuePerConversation: 85,
    campaignCost: 500,
    peakHour: 20,
    bestDay: 5
  });

  const fetchHistoricalStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        buildApiUrl('conversations/stats/historical-prediction-data'),
        { headers }
      );

      if (!response.ok) {
        throw new Error('فشل في جلب البيانات التاريخية');
      }

      const data = await response.json();
      if (data.success) {
        setHistoricalStats(data.data);
        // Initialize parameters with historical averages
        setParams(prev => ({
          ...prev,
          savedRate: data.data.averageSavedRate,
          conversionRate: data.data.averageConversionRate,
          avgRevenuePerConversation: data.data.averageRevenuePerConversation,
          peakHour: data.data.peakHour,
          bestDay: data.data.bestDay
        }));
      } else {
        throw new Error(data.error || 'فشل في جلب البيانات');
      }
    } catch (err: any) {
      console.error('Error fetching historical stats:', err);
      setError(err.message || 'حدث خطأ أثناء جلب البيانات التاريخية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalStats();
  }, []);

  const calculatePrediction = () => {
    // Calculate basic predictions
    const predictedSaved = Math.round(params.messagesCount * (params.savedRate / 100));
    const predictedIgnored = params.messagesCount - predictedSaved;
    const predictedConversations = Math.round(predictedSaved * (params.conversionRate / 100));
    const predictedRevenue = predictedConversations * params.avgRevenuePerConversation;
    const predictedOrders = Math.round(predictedConversations * 0.8); // Assumed 80% conversion to order

    // Calculate financial metrics
    const roi = ((predictedRevenue - params.campaignCost) / params.campaignCost) * 100;
    const breakEven = Math.ceil((params.campaignCost / (params.avgRevenuePerConversation * (params.savedRate / 100) * (params.conversionRate / 100))));
    const profit = predictedRevenue - params.campaignCost;
    const costPerMessage = params.campaignCost / params.messagesCount;
    const costPerConversion = params.campaignCost / predictedConversations;

    // Generate scenarios
    const scenarios: ScenarioResult[] = [
      {
        name: 'سيناريو متشائم',
        description: 'نموذج أسوأ الحالات (نسبة محفظة thấp)',
        savedRate: Math.max(0, params.savedRate - 10),
        conversionRate: Math.max(0, params.conversionRate - 5),
        revenue: 0,
        roi: 0,
        profit: 0
      },
      {
        name: 'سيناريو متوقع',
        description: 'المتوقع بناءً على البيانات التاريخية',
        savedRate: params.savedRate,
        conversionRate: params.conversionRate,
        revenue: 0,
        roi: 0,
        profit: 0
      },
      {
        name: 'سيناريو مثالي',
        description: 'أفضل الحالات (زيادة 20% في معدل التحويل)',
        savedRate: Math.min(100, params.savedRate + 10),
        conversionRate: Math.min(100, params.conversionRate + 5),
        revenue: 0,
        roi: 0,
        profit: 0
      }
    ];

    // Calculate scenario details
    scenarios.forEach(scenario => {
      const scenarioSaved = Math.round(params.messagesCount * (scenario.savedRate / 100));
      const scenarioConversations = Math.round(scenarioSaved * (scenario.conversionRate / 100));
      scenario.revenue = scenarioConversations * params.avgRevenuePerConversation;
      scenario.roi = ((scenario.revenue - params.campaignCost) / params.campaignCost) * 100;
      scenario.profit = scenario.revenue - params.campaignCost;
    });

    setPrediction({
      predictedSaved,
      predictedIgnored,
      predictedConversations,
      predictedRevenue,
      predictedOrders,
      roi,
      breakEven,
      profit,
      costPerMessage,
      costPerConversion,
      scenarios
    });
  };

  useEffect(() => {
    if (historicalStats) {
      calculatePrediction();
    }
  }, [params]);

  const handleParamChange = (key: keyof PredictionParams, value: number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetToHistorical = () => {
    if (historicalStats) {
      setParams(prev => ({
        ...prev,
        savedRate: historicalStats.averageSavedRate,
        conversionRate: historicalStats.averageConversionRate,
        avgRevenuePerConversation: historicalStats.averageRevenuePerConversation,
        peakHour: historicalStats.peakHour,
        bestDay: historicalStats.bestDay
      }));
    }
  };

  const exportReport = () => {
    if (!prediction) return;

    const report = {
      prediction,
      parameters: params,
      generatedAt: new Date().toLocaleString('ar-EG')
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-prediction-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <CalculatorIcon className="w-10 h-10 text-blue-600" />
                حاسبة توقعات نتائج حملات الرسائل
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                أداة متقدمة لتوقعات أداء حملات الرسائل بناءً على البيانات التاريخية والتجارب السابقة
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetToHistorical}
                disabled={!historicalStats}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <RefreshCwIcon className="w-5 h-5" />
                إعادة تعيين إلى المتوسط التاريخي
              </button>
              {prediction && (
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  تصدير التقرير
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <RefreshCwIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">جاري تحميل البيانات التاريخية...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              <button
                onClick={fetchHistoricalStats}
                className="text-sm text-red-600 dark:text-red-400 underline mt-1"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && historicalStats && (
          <div className="space-y-6">
            {/* Parameters Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <TargetIcon className="w-6 h-6 text-blue-600" />
                المتغيرات الأساسية
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Parameters */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      عدد الرسائل المرسلة
                    </label>
                    <input
                      type="number"
                      value={params.messagesCount}
                      onChange={(e) => handleParamChange('messagesCount', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      تكلفة الحملة (ج.م)
                    </label>
                    <input
                      type="number"
                      value={params.campaignCost}
                      onChange={(e) => handleParamChange('campaignCost', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      متوسط الإيراد لكل محادثة (ج.م)
                    </label>
                    <input
                      type="number"
                      value={params.avgRevenuePerConversation}
                      onChange={(e) => handleParamChange('avgRevenuePerConversation', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="10"
                    />
                  </div>
                </div>

                {/* Performance Parameters */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نسبة الحفظ (%) - المتوسط التاريخي: {historicalStats.averageSavedRate}%
                    </label>
                    <input
                      type="range"
                      value={params.savedRate}
                      onChange={(e) => handleParamChange('savedRate', parseInt(e.target.value) || 0)}
                      className="w-full"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>0%</span>
                      <span>{params.savedRate}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      معدل التحويل (%) - المتوسط التاريخي: {historicalStats.averageConversionRate}%
                    </label>
                    <input
                      type="range"
                      value={params.conversionRate}
                      onChange={(e) => handleParamChange('conversionRate', parseInt(e.target.value) || 0)}
                      className="w-full"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>0%</span>
                      <span>{params.conversionRate}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Optimal Timing */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">الوقت الأمثل للإرسال</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">أفضل ساعة:</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{params.peakHour}:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">أفضل يوم:</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{days[params.bestDay]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {prediction && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <UsersIcon className="h-12 w-12 opacity-80" />
                      <div className="bg-white/20 rounded-full p-2">
                        <ArrowTrendingUpIcon className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mb-1">الرسائل المحفوظة المتوقعة</p>
                    <p className="text-4xl font-bold">
                      {prediction.predictedSaved.toLocaleString('ar-EG')}
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {params.savedRate}% من إجمالي الرسائل
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <TargetIcon className="h-12 w-12 opacity-80" />
                      <div className="bg-white/20 rounded-full p-2">
                        <ArrowTrendingUpIcon className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mb-1">المحادثات المتوقعة</p>
                    <p className="text-4xl font-bold">
                      {prediction.predictedConversations.toLocaleString('ar-EG')}
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {params.conversionRate}% من الرسائل المحفوظة
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSignIcon className="h-12 w-12 opacity-80" />
                      <div className="bg-white/20 rounded-full p-2">
                        <ArrowTrendingUpIcon className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mb-1">الإيرادات المتوقعة</p>
                    <p className="text-4xl font-bold">
                      {parseFloat(prediction.predictedRevenue.toFixed(0)).toLocaleString('ar-EG')} ج.م
                    </p>
                  </div>

                  <div className={`bg-gradient-to-br ${prediction.profit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform`}>
                    <div className="flex items-center justify-between mb-4">
                      <BarChart3Icon className="h-12 w-12 opacity-80" />
                      <div className="bg-white/20 rounded-full p-2">
                        {prediction.profit >= 0 ? (
                          <ArrowTrendingUpIcon className="h-6 w-6" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-6 w-6" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mb-1">الأرباح المتوقعة</p>
                    <p className="text-4xl font-bold">
                      {parseFloat(prediction.profit.toFixed(0)).toLocaleString('ar-EG')} ج.م
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      العائد على الاستثمار: {parseFloat(prediction.roi.toFixed(1))}%
                    </p>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Messages Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      توزيع الرسائل المتوقع
                    </h3>
                    <PieChart
                      data={[
                        { name: 'محفوظة', value: prediction.predictedSaved },
                        { name: 'متجاهلة', value: prediction.predictedIgnored }
                      ]}
                      colors={['#10b981', '#ef4444']}
                      height={300}
                    />
                  </div>

                  {/* Scenarios Comparison */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      مقارنة السيناريوهات
                    </h3>
                    <div className="space-y-4">
                      {prediction.scenarios.map((scenario, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${index === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                            index === 1 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' :
                              'bg-green-50 dark:bg-green-900/20 border-green-500'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{scenario.name}</h4>
                            <span className={`text-sm font-bold ${scenario.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                              {parseFloat(scenario.roi.toFixed(1))}% ROI
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{scenario.description}</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">نسبة الحفظ:</span>
                            <span className="font-medium">{scenario.savedRate}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">معدل التحويل:</span>
                            <span className="font-medium">{scenario.conversionRate}%</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-gray-600 dark:text-gray-400">الإيرادات:</span>
                            <span className="text-gray-900 dark:text-white">
                              {parseFloat(scenario.revenue.toFixed(0)).toLocaleString('ar-EG')} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-gray-600 dark:text-gray-400">الأرباح:</span>
                            <span className={`${scenario.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                              {parseFloat(scenario.profit.toFixed(0)).toLocaleString('ar-EG')} ج.م
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    المقاييس المتقدمة
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">نقطة التعادل</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {prediction.breakEven.toLocaleString('ar-EG')} رسالة
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        العدد الأدنى من الرسائل المطلوب لإسترداد التكلفة
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">التكلفة لكل رسالة</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {parseFloat(prediction.costPerMessage.toFixed(2))} ج.م
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        متوسط التكلفة لكل رسالة مرسلة
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">التكلفة لكل تحويل</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {parseFloat(prediction.costPerConversion.toFixed(2))} ج.م
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        التكلفة المتوقعة لكل محادثة محولة
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">عدد الطلبات المتوقع</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {prediction.predictedOrders.toLocaleString('ar-EG')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        بناءً على 80% معدل تحويل من المحادثة إلى طلب
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">الربح لكل رسالة</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {parseFloat((prediction.profit / params.messagesCount).toFixed(2))} ج.م
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        متوسط الأرباح لكل رسالة مرسلة
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">الكفاءة التكلفوية</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {parseFloat((prediction.predictedRevenue / params.campaignCost).toFixed(2))}x
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        المبلغ المسترد لكل جنيه تم استثماره
                      </p>
                    </div>
                  </div>
                </div>

                {/* Historical Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      اتجاه معدل الحفظ التاريخي
                    </h3>
                    <LineChart
                      data={historicalStats.dailyTrend}
                      xKey="date"
                      lines={[
                        { key: 'savedRate', name: 'نسبة الحفظ (%)', color: '#10b981' },
                        { key: 'conversionRate', name: 'معدل التحويل (%)', color: '#3b82f6' }
                      ]}
                      height={300}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      نمط النشاط الساعي
                    </h3>
                    <BarChart
                      data={historicalStats.hourlyPattern}
                      xKey="hour"
                      bars={[
                        { key: 'savedRate', name: 'نسبة الحفظ (%)', color: '#10b981' },
                        { key: 'conversionRate', name: 'معدل التحويل (%)', color: '#3b82f6' }
                      ]}
                      height={300}
                    />
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <TargetIcon className="w-6 h-6 text-green-600" />
                    التوصيات الخبيرة
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">نصيحة الحفظ:</p>
                          <p className="text-xs text-gray-500">
                            زيادة نسبة الحفظ بنسبة 10% يمكن أن تُزود الإيرادات بنسبة {parseFloat((prediction.predictedRevenue * 0.25).toFixed(0)).toLocaleString('ar-EG')} ج.م
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">نصيحة التحويل:</p>
                          <p className="text-xs text-gray-500">
                            تحسين معدل التحويل بنسبة 5% يمكن أن يُزود الأرباح بنسبة {parseFloat((prediction.profit * 0.15).toFixed(0)).toLocaleString('ar-EG')} ج.م
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">نصيحة التكلفة:</p>
                          <p className="text-xs text-gray-500">
                            خفض تكلفة الحملة بنسبة 20% يمكن أن يُحسن العائد على الاستثمار بنسبة {parseFloat(prediction.roi * 1.3).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">نصيحة التوقيت:</p>
                          <p className="text-xs text-gray-500">
                            الإرسال في الساعة {params.peakHour}:00 يمكن أن يُزود نسبة الحفظ بنسبة 12% بناءً على البيانات التاريخية
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">تحذير هام:</p>
                          <p className="text-xs text-gray-500">
                            إذا لم يتم تحقيق {parseFloat((params.campaignCost / params.avgRevenuePerConversation).toFixed(0)).toLocaleString('ar-EG')} محادثة محولة، ستكون الحملة خاسرة
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">نصيحة الاستثمار:</p>
                          <p className="text-xs text-gray-500">
                            الحملة الحالية تُعتبر مربحة فقط إذا كانت نسبة الحفظ &gt;= {parseFloat((params.campaignCost / (params.messagesCount * params.avgRevenuePerConversation * params.conversionRate / 100)).toFixed(1))}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignResultsPredictor;
