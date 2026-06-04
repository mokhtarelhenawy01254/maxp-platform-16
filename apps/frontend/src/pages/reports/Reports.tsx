import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useCurrency } from "../../hooks/useCurrency";
import { apiClient } from "../../services/apiClient";
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartPieIcon,
  EyeIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";

interface ReportData {
  id: string;
  name: string;
  description: string;
  type:
    | "sales"
    | "customers"
    | "conversations"
    | "products"
    | "performance"
    | "moderators";
  period: string;
  data: any[];
  lastUpdated: string;
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useDateFormat();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(true);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [funnelData, setFunnelData] = useState<any | null>(null);
  const { formatPrice } = useCurrency();

  const toDateInputValue = (date: Date) =>
    date.toISOString().split("T")[0];

  const buildPresetRanges = () => {
    const now = new Date();
    const today = toDateInputValue(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toDateInputValue(yesterdayDate);

    const last7Start = new Date(now);
    last7Start.setDate(last7Start.getDate() - 6);
    const last30Start = new Date(now);
    last30Start.setDate(last30Start.getDate() - 29);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return [
      {
        id: "today",
        label: t("reports.presets.today"),
        range: { start: today, end: today },
      },
      {
        id: "yesterday",
        label: t("reports.presets.yesterday"),
        range: { start: yesterday, end: yesterday },
      },
      {
        id: "last7",
        label: t("reports.presets.last7Days"),
        range: { start: toDateInputValue(last7Start), end: today },
      },
      {
        id: "last30",
        label: t("reports.presets.last30Days"),
        range: { start: toDateInputValue(last30Start), end: today },
      },
      {
        id: "thisMonth",
        label: t("reports.presets.thisMonth"),
        range: { start: toDateInputValue(thisMonthStart), end: today },
      },
      {
        id: "lastMonth",
        label: t("reports.presets.lastMonth"),
        range: {
          start: toDateInputValue(lastMonthStart),
          end: toDateInputValue(lastMonthEnd),
        },
      },
    ];
  };

  const presets = buildPresetRanges();
  const activePresetId =
    presets.find(
      (preset) =>
        preset.range.start === dateRange.start &&
        preset.range.end === dateRange.end,
    )?.id || null;

  const todayString = toDateInputValue(new Date());
  const isTodayRange =
    dateRange.start === todayString && dateRange.end === todayString;

  const handleStartDateChange = (value: string) => {
    if (!value) return;
    setDateRange((prev) => {
      const start = value;
      const end = prev.end && prev.end < start ? start : prev.end;
      return { start, end };
    });
  };

  const handleEndDateChange = (value: string) => {
    if (!value) return;
    setDateRange((prev) => {
      const end = value;
      const start = prev.start && prev.start > end ? end : prev.start;
      return { start, end };
    });
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const derivedMetrics = useMemo(() => {
    if (!reports.length) return { summaryCards: [], topProducts: [] };
    const safeNumber = (value: any) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === "string") {
        const parsed = parseFloat(value.replace("%", ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const sumBy = (items: any[], key: string) =>
      items.reduce((sum, item) => sum + safeNumber(item?.[key]), 0);

    const averageBy = (items: any[], key: string) => {
      if (!items.length) return 0;
      const total = sumBy(items, key);
      return total / items.length;
    };

    const salesReport = reports.find((report) => report.type === "sales");
    const customersReport = reports.find(
      (report) => report.type === "customers",
    );
    const productsReport = reports.find((report) => report.type === "products");
    const performanceReport = reports.find(
      (report) => report.type === "performance",
    );

    const salesRows = Array.isArray(salesReport?.data)
      ? salesReport.data
      : [];
    const customersRows = Array.isArray(customersReport?.data)
      ? customersReport.data
      : [];
    const productsRows = Array.isArray(productsReport?.data)
      ? productsReport.data
      : [];
    const performanceData = performanceReport?.data;

    const totalSales = sumBy(salesRows, "sales");
    const totalOrders = sumBy(salesRows, "orders");

    const totalNewCustomers = sumBy(customersRows, "newCustomers");
    const totalConversions = sumBy(customersRows, "conversions");
    const avgRate = averageBy(customersRows, "rate");

    const extractMetric = (data: any, keys: string[]) => {
      if (!data) return null;
      const normalizedKeys = keys.map((key) => key.toLowerCase());
      if (Array.isArray(data)) {
        for (const item of data) {
          const name = String(
            item?.metric ?? item?.name ?? item?.key ?? item?.title ?? "",
          ).toLowerCase();
          if (normalizedKeys.some((key) => name.includes(key))) {
            const value =
              item?.value ??
              item?.count ??
              item?.total ??
              item?.rate ??
              item?.percentage;
            return safeNumber(value);
          }
        }
        return null;
      }

      if (typeof data === "object") {
        for (const key of keys) {
          if (data[key] !== undefined && data[key] !== null) {
            return safeNumber(data[key]);
          }
        }
      }
      return null;
    };

    const conversionRateFromPerf = extractMetric(performanceData, [
      "conversion",
      "conversion_rate",
      "conversionRate",
      "cr",
    ]);

    const funnelSteps = Array.isArray(funnelData?.funnelSteps)
      ? funnelData.funnelSteps
      : [];
    const visitsFromFunnel = funnelSteps.find((step: any) => {
      const name = String(step?.step || "").toLowerCase();
      return (
        name.includes("زيارة") ||
        name.includes("زيارات") ||
        name.includes("visit")
      );
    });
    const visitsMetric = visitsFromFunnel
      ? safeNumber(visitsFromFunnel.count)
      : null;

    const conversionRateFromFunnel =
      funnelData?.overallConversionRate !== undefined &&
      funnelData?.overallConversionRate !== null
        ? safeNumber(funnelData.overallConversionRate)
        : null;

    const conversionRate =
      conversionRateFromFunnel ??
      conversionRateFromPerf ??
      (totalNewCustomers > 0
        ? (totalConversions / totalNewCustomers) * 100
        : avgRate);

    const visitMetric = visitsMetric ?? extractMetric(performanceData, [
      "visit",
      "session",
      "traffic",
      "pageview",
      "views",
    ]);

    const itemKeys = [
      "itemsSold",
      "items",
      "itemsCount",
      "items_count",
      "quantity",
      "qty",
      "pieces",
      "units",
    ];
    const hasItemsData = salesRows.some((row) =>
      itemKeys.some((key) => row?.[key] !== undefined && row?.[key] !== null),
    );
    const totalItemsFromSales = hasItemsData
      ? salesRows.reduce((sum, row) => {
          const valueKey = itemKeys.find(
            (key) => row?.[key] !== undefined && row?.[key] !== null,
          );
          return sum + safeNumber(valueKey ? row[valueKey] : 0);
        }, 0)
      : null;

    const totalItemsFromProducts = productsRows.length
      ? productsRows.reduce((sum, row) => {
          const valueKey = itemKeys.find(
            (key) => row?.[key] !== undefined && row?.[key] !== null,
          );
          if (valueKey) return sum + safeNumber(row[valueKey]);
          if (row?.sales !== undefined && row?.sales !== null) {
            return sum + safeNumber(row.sales);
          }
          return sum;
        }, 0)
      : null;

    const totalItemsSold =
      totalItemsFromSales !== null
        ? totalItemsFromSales
        : totalItemsFromProducts;

    const topProducts = Array.isArray(productsRows)
      ? productsRows
          .map((row) => {
            const name =
              row?.name ?? row?.product ?? row?.title ?? row?.sku ?? null;
            if (!name) return null;
            const quantityKeys = [
              "quantity",
              "qty",
              "itemsSold",
              "items",
              "count",
              "orders",
              "units",
            ];
            const revenueKeys = ["revenue", "salesValue", "amount", "total"];

            const quantityKey = quantityKeys.find(
              (key) => row?.[key] !== undefined && row?.[key] !== null,
            );
            const revenueKey = revenueKeys.find(
              (key) => row?.[key] !== undefined && row?.[key] !== null,
            );

            let value = 0;
            let label = "—";
            let sortValue = 0;

            if (quantityKey) {
              value = safeNumber(row[quantityKey]);
              sortValue = value;
              label = `${value.toLocaleString()} قطعة`;
            } else if (row?.sales !== undefined && row?.sales !== null && !revenueKey) {
              value = safeNumber(row.sales);
              sortValue = value;
              label = `${value.toLocaleString()} قطعة`;
            } else if (revenueKey) {
              value = safeNumber(row[revenueKey]);
              sortValue = value;
              label = formatPrice(value);
            } else if (row?.sales !== undefined && row?.sales !== null) {
              value = safeNumber(row.sales);
              sortValue = value;
              label = formatPrice(value);
            }

            return { name, label, sortValue };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.sortValue - a.sortValue)
          .slice(0, 3)
      : [];

    const summaryCards = [
      {
        id: "total-sales",
        title: "إجمالي المبيعات",
        value: formatPrice(totalSales || 0),
        icon: CurrencyDollarIcon,
        color: "text-green-600 bg-green-50 dark:bg-green-900/20",
      },
      {
        id: "total-orders",
        title: isTodayRange ? "طلبات اليوم" : "إجمالي الطلبات",
        value: totalOrders.toLocaleString(),
        icon: ShoppingCartIcon,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
      },
      {
        id: "items-sold",
        title: isTodayRange ? "قطع اليوم" : "عدد القطع",
        value:
          totalItemsSold !== null
            ? totalItemsSold.toLocaleString()
            : "غير متاح",
        icon: ChartPieIcon,
        color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
      },
      {
        id: "store-visits",
        title: "زيارات المتجر",
        value:
          visitMetric !== null
            ? Number(visitMetric).toLocaleString()
            : "غير متاح",
        icon: EyeIcon,
        color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20",
      },
      {
        id: "conversion-rate",
        title: "نسبة التحويل",
        value:
          conversionRate !== null && Number.isFinite(conversionRate)
            ? `${Math.round(conversionRate)}%`
            : "غير متاح",
        icon: ChartBarIcon,
        color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
      },
      {
        id: "new-customers",
        title: "عملاء جدد",
        value: totalNewCustomers.toLocaleString(),
        icon: UserGroupIcon,
        color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
      },
    ].filter(Boolean) as Array<{
      id: string;
      title: string;
      value: string;
      icon: React.ComponentType<any>;
      color: string;
    }>;

    return { summaryCards, topProducts };
  }, [reports, formatPrice, isTodayRange, funnelData]);

  const { summaryCards, topProducts } = derivedMetrics;

  const fetchReports = async () => {
    try {
      setLoading(true);
      setPartialErrors([]);

      // استدعاء API الحقيقي لجلب جميع التقارير
      const params = `startDate=${dateRange.start}&endDate=${dateRange.end}`;

      // جلب كل تقرير على حدة باستخدام apiClient
      // baseURL already includes /api/v1, so we only need /reports
      const requests = [
        { key: "sales", label: "تقرير المبيعات", type: "report", promise: apiClient.get(`/reports/sales?${params}`) },
        { key: "customers", label: "تقرير العملاء", type: "report", promise: apiClient.get(`/reports/customers?${params}`) },
        { key: "conversations", label: "تقرير المحادثات", type: "report", promise: apiClient.get(`/reports/conversations?${params}`) },
        { key: "products", label: "تقرير المنتجات", type: "report", promise: apiClient.get(`/reports/products?${params}`) },
        { key: "performance", label: "تقرير الأداء", type: "report", promise: apiClient.get(`/reports/performance?${params}`) },
        { key: "moderators", label: "تقرير المشرفين", type: "report", promise: apiClient.get(`/reports/moderators?${params}`) },
        { key: "funnel", label: "تحليل القمع", type: "funnel", promise: apiClient.get(`/analytics/funnel?${params}`) },
      ];

      const results = await Promise.allSettled(
        requests.map((request) => request.promise),
      );

      const reportsData: ReportData[] = [];
      const failedLabels: string[] = [];
      let nextFunnelData: any | null = null;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (requests[index].type === "report") {
            const data = result.value?.data?.data;
            if (data) {
              reportsData.push(data);
            }
          } else if (requests[index].type === "funnel") {
            nextFunnelData = result.value?.data?.data ?? null;
          }
        } else {
          failedLabels.push(requests[index].label);
          console.error(
            `Error fetching ${requests[index].key} report:`,
            result.reason,
          );
        }
      });

      if (failedLabels.length > 0) {
        setPartialErrors(failedLabels);
      }
      setFunnelData(nextFunnelData);

      setReports(reportsData);
      setSelectedReport((prev) => {
        if (!reportsData.length) return null;
        if (!prev) return reportsData[0];
        const match = reportsData.find(
          (report) => report.id === prev.id || report.type === prev.type,
        );
        return match || reportsData[0];
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      // في حالة الخطأ، عرض رسالة للمستخدم
      alert("حدث خطأ في تحميل التقارير. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: "pdf" | "excel" | "csv") => {
    if (!selectedReport) return;

    // Mock export functionality
    alert(
      `تم تصدير التقرير "${selectedReport.name}" بصيغة ${format.toUpperCase()}`,
    );
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "daily":
        return t("reports.periods.daily");
      case "weekly":
        return t("reports.periods.weekly");
      case "monthly":
        return t("reports.periods.monthly");
      default:
        return t("reports.periods.custom");
    }
  };

  const relatedViews = [
    {
      id: "profit-loss",
      title: t("reports.profitLossTitle"),
      description: t("reports.profitLossDescription"),
      cta: t("reports.openRoute"),
      icon: CurrencyDollarIcon,
      onClick: () => navigate("/reports/profit-loss"),
    },
    {
      id: "advanced-analytics",
      title: t("reports.advancedAnalyticsTitle"),
      description: t("reports.advancedAnalyticsDescription"),
      cta: t("reports.openRoute"),
      icon: PresentationChartLineIcon,
      onClick: () => navigate("/analytics"),
    },
  ];

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "sales":
        return (
          <ChartBarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case "customers":
        return (
          <DocumentChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        );
      case "conversations":
        return (
          <ChartBarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        );
      case "products":
        return (
          <DocumentChartBarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        );
      case "performance":
        return (
          <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        );
      case "moderators":
        return <EyeIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />;
      default:
        return (
          <DocumentChartBarIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "sales":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "customers":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "conversations":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
      case "products":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      case "performance":
        return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300";
      case "moderators":
        return "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
    }
  };

  const renderReportData = (report: ReportData) => {
    switch (report.type) {
      case "sales":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    المبيعات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الطلبات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    متوسط الطلب
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {report.data.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                      {formatPrice(row.sales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatPrice(row.avgOrder)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "customers":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.data.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {item.week}
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      عملاء جدد:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.newCustomers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      تحويلات:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.conversions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      معدل التحويل:
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {item.rate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "moderators":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الموظف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الرسائل المرسلة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    المحادثات المكتملة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {report.data.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">
                      {row.messagesCount} رسالة
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.conversationsCount} محادثة
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            لا توجد بيانات متاحة لهذا التقرير
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <DocumentChartBarIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
            التقارير والإحصائيات
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            تحليل شامل لأداء المنصة والمبيعات
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t("reports.dateRange")}</span>
            </div>
            <input
              type="date"
              value={dateRange.start}
              max={dateRange.end}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <span className="text-gray-500">{t("reports.to")}</span>
            <input
              type="date"
              value={dateRange.end}
              min={dateRange.start}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <button
              onClick={fetchReports}
              disabled={loading}
              className="p-2 border rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              title={t("common.refresh")}
              type="button"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.range)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activePresetId === preset.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {summaryCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {partialErrors.length > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t("reports.partialErrors", {
            reports: partialErrors.join("، "),
          })}
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("reports.topProducts")}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {topProducts.map((item: any, index: number) => (
              <div
                key={`${item.name}-${index}`}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="bg-white shadow rounded-lg dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-5 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("reports.availableReports")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("reports.availableReportsHint")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {reports.map((report) => {
              const isSelected = selectedReport?.id === report.id;

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className={`rounded-2xl border p-4 text-right transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-100 dark:border-indigo-400 dark:bg-indigo-900/20 dark:ring-indigo-900/40"
                      : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500/50 dark:hover:bg-gray-700/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 rounded-xl bg-gray-50 p-2 dark:bg-gray-700/70">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {report.name}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getReportTypeColor(report.type)}`}
                        >
                          {getPeriodLabel(report.period)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-5 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("reports.relatedViews")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("reports.relatedViewsHint")}
            </p>
          </div>
          <div className="space-y-3 p-4">
            {relatedViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={view.onClick}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-right transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-500/50 dark:hover:bg-gray-900"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-300">
                    <view.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {view.title}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                      {view.description}
                    </p>
                    <span className="mt-3 inline-flex text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                      {view.cta}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="bg-white shadow rounded-lg dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                  {t("reports.selectedReport")}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedReport.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t("reports.selectedReportHint")}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  آخر تحديث: {formatDate(selectedReport.lastUpdated)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled
                  title={t("reports.exportSoonHint")}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium leading-4 text-gray-500 shadow-sm cursor-not-allowed dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-400"
                >
                  <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                  {t("reports.exportPdfSoon")}
                </button>
                <button
                  disabled
                  title={t("reports.exportSoonHint")}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium leading-4 text-gray-500 shadow-sm cursor-not-allowed dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-400"
                >
                  <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                  {t("reports.exportExcelSoon")}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">{renderReportData(selectedReport)}</div>
        </div>
      )}
    </div>
  );
};

export default Reports;
