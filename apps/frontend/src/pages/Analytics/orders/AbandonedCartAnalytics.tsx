import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ShoppingCartIcon,
  XCircleIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  FireIcon,
  TagIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";

interface CartProductItem {
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
}

interface CartItem {
  id: string;
  cartId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  governorate?: string | null;
  itemsCount: number;
  items: CartProductItem[];
  cartValue: number;
  createdAt: string;
  lastUpdated: string;
  expiresAt: string;
  hasPhone: boolean;
  urgencyTier: "fresh" | "active" | "expired";
  hasStartedCheckout: boolean;
}

interface ConvertedCartItem {
  id: string;
  cartId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  cartValue: number;
  convertedAt: string;
  channel?: string | null;
  employeeName?: string | null;
  governorate?: string | null;
}

interface FunnelStep {
  stage: string;
  label: string;
  count: number;
}

interface TopProduct {
  productId?: string | null;
  productName: string;
  category: string;
  image?: string | null;
  price: number;
  abandonedCount: number;
  lostRevenue: number;
}

interface AbandonedCartStats {
  totalCarts: number;
  abandonedCarts: number;
  activeCarts: number;
  convertedCarts: number;
  abandonmentRate: number;
  recoveryRate: number;
  totalCartValue: number;
  activeCartValue: number;
  recoveredRevenue: number;
  avgCartValue: number;
  funnel: FunnelStep[];
  topAbandonedProducts: TopProduct[];
  recentAbandonedCarts: CartItem[];
  recentConverted: ConvertedCartItem[];
}

type FilterType = "all" | "with_phone" | "fresh" | "active" | "expired";

const AbandonedCartAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isRTL = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<AbandonedCartStats | null>(null);

  const [activeTab, setActiveTab] = useState<"abandoned" | "recovered">(
    "abandoned",
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCart, setSelectedCart] = useState<CartItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getAbandonedCartAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      );

      if (response && response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          totalCarts: 0,
          abandonedCarts: 0,
          activeCarts: 0,
          convertedCarts: 0,
          abandonmentRate: 0,
          recoveryRate: 0,
          totalCartValue: 0,
          activeCartValue: 0,
          recoveredRevenue: 0,
          avgCartValue: 0,
          funnel: [],
          topAbandonedProducts: [],
          recentAbandonedCarts: [],
          recentConverted: [],
        });
      }
    } catch (err: any) {
      console.error("AbandonedCartAnalytics error:", err);
      setError(err.message || t("abandonedCartAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [range, t]);

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range, fetchData]);

  // Clean phone number helper
  const cleanPhone = (phone?: string | null): string => {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9+]/g, "");
    if (cleaned.startsWith("01") && cleaned.length === 11) {
      cleaned = "20" + cleaned.slice(1);
    }
    return cleaned;
  };

  // WhatsApp click handler with recovery message
  const handleWhatsApp = (cart: CartItem) => {
    const phone = cleanPhone(cart.customerPhone);
    if (!phone) return;
    const name = cart.customerName || t("abandonedCartAnalytics.guestCustomer");
    const msg = isRTL
      ? `مرحباً ${name}، لاحظنا اهتمامك بمنتجاتنا وسلتك ما زالت محفوظة لك! يسعدنا مساعدتك في إتمام طلبك وتوصيله لك سريعاً. هل تود تأكيد الطلب الآن؟`
      : `Hello ${name}, we noticed you left items in your cart! They are reserved for you. Would you like us to help complete your order?`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Filter and search recent carts
  const filteredCarts = useMemo(() => {
    if (!stats?.recentAbandonedCarts) return [];
    let list = stats.recentAbandonedCarts;

    if (filter === "with_phone") {
      list = list.filter((c) => c.hasPhone);
    } else if (filter === "fresh") {
      list = list.filter((c) => c.urgencyTier === "fresh");
    } else if (filter === "active") {
      list = list.filter((c) => c.urgencyTier === "active");
    } else if (filter === "expired") {
      list = list.filter((c) => c.urgencyTier === "expired");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.cartId.toLowerCase().includes(q) ||
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.customerPhone && c.customerPhone.includes(q)) ||
          (c.governorate && c.governorate.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [stats?.recentAbandonedCarts, filter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredCarts.length) return;
    const headers = [
      "Cart ID",
      "Customer Name",
      "Phone",
      "Governorate",
      "Items Count",
      "Cart Value",
      "Urgency",
      "Date",
    ];
    const rows = filteredCarts.map((c) => [
      `"${c.cartId}"`,
      `"${c.customerName || "غير محدد"}"`,
      `"${c.customerPhone || "غير محدد"}"`,
      `"${c.governorate || "غير محدد"}"`,
      c.itemsCount,
      c.cartValue,
      c.urgencyTier,
      new Date(c.lastUpdated).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `abandoned_carts_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20">
            <ShoppingCartIcon className="h-6 w-6" />
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {t("abandonedCartAnalytics.title")}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("abandonedCartAnalytics.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PeriodSelector onRangeChange={setRange} />
        <button
          onClick={fetchData}
          title={t("abandonedCartAnalytics.retry")}
          className="p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition shadow-sm"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 p-3 sm:p-6" dir={isRTL ? "rtl" : "ltr"}>
      {header}

      {/* Strategic Operational Quick-Bridges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Link
          to="/orders/incomplete"
          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-blue-500 text-white shrink-0">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-100 truncate">
              {t("abandonedCartAnalytics.goToWorkbench")}
            </span>
          </div>
          <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition">
            &larr;
          </span>
        </Link>

        <Link
          to="/orders/incomplete/reports"
          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-purple-500 text-white shrink-0">
              <CheckCircleIcon className="h-4 w-4" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-100 truncate">
              {t("abandonedCartAnalytics.goToReports")}
            </span>
          </div>
          <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition">
            &larr;
          </span>
        </Link>

        <Link
          to="/whatsapp/templates"
          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0">
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100 truncate">
              {t("abandonedCartAnalytics.goToWhatsApp")}
            </span>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition">
            &larr;
          </span>
        </Link>

        <Link
          to="/coupons"
          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
              <TagIcon className="h-4 w-4" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 truncate">
              كوبونات التحفيز
            </span>
          </div>
          <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition">
            &larr;
          </span>
        </Link>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <ShoppingCartIcon className="h-5 w-5 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-4">
            جاري جمع وتحديث بيانات السلات المهجورة...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 p-5 sm:p-6 rounded-2xl border border-red-200 dark:border-red-800/40 text-center">
          <XCircleIcon className="h-10 w-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">
            {t("abandonedCartAnalytics.fetchError")}
          </h3>
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t("abandonedCartAnalytics.retry")}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Abandoned Carts Count */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t("abandonedCartAnalytics.abandonedCarts")}
                </span>
                <span className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <ShoppingCartIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                  {stats?.abandonedCarts?.toLocaleString() || 0}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                  <span>من إجمالي {stats?.totalCarts?.toLocaleString() || 0} سلة منشأة</span>
                </div>
              </div>
            </div>

            {/* 2. Lost Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t("abandonedCartAnalytics.totalCartValue")}
                </span>
                <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                  {formatPrice(stats?.totalCartValue || 0)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                  <span>متوسط السلة: {formatPrice(stats?.avgCartValue || 0)}</span>
                </div>
              </div>
            </div>

            {/* 3. Recovered Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <SparklesIcon className="h-4 w-4" />
                  {t("abandonedCartAnalytics.recoveredRevenue")}
                </span>
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatPrice(stats?.recoveredRevenue || 0)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>تم استرجاع {stats?.convertedCarts?.toLocaleString() || 0} سلة مؤكدة</span>
                </div>
              </div>
            </div>

            {/* 4. Rates: Abandonment vs Recovery */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  معدل التخلي والاسترداد
                </span>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <ClockIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                    {stats?.abandonmentRate?.toFixed(1) || 0}%
                  </div>
                  <span className="text-[11px] text-gray-400">معدل التخلي</span>
                </div>
                <div className="text-left rtl:text-right">
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats?.recoveryRate?.toFixed(1) || 0}%
                  </div>
                  <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">معدل الاسترداد</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Conversion Funnel Bar */}
          {stats?.funnel && stats.funnel.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/80">
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white mb-3">
                {t("abandonedCartAnalytics.funnelTitle")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {stats.funnel.map((step, idx) => {
                  const baseCount = stats.funnel[0]?.count || 1;
                  const pct = baseCount > 0 ? Math.round((step.count / baseCount) * 100) : 0;
                  const colors = [
                    "border-blue-200 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-300",
                    "border-amber-200 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300",
                    "border-red-200 bg-red-50/50 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300",
                    "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300",
                  ];
                  return (
                    <div
                      key={step.stage || idx}
                      className={`p-3 sm:p-4 rounded-xl border ${colors[idx % colors.length]} flex flex-col justify-between`}
                    >
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {step.label}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                          {step.count.toLocaleString()}
                        </span>
                        <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-gray-900/80 shadow-xs">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Abandoned Products Section */}
          {stats?.topAbandonedProducts && stats.topAbandonedProducts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/80">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {t("abandonedCartAnalytics.topAbandonedProducts")}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    المنتجات الأكثر تركاً في السلات وقيمة الإيرادات المحتجزة بداخلها
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Chart */}
                <div className="lg:col-span-2 h-[280px] sm:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                    <BarChart
                      data={stats.topAbandonedProducts}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: isRTL ? 20 : 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                      <YAxis
                        dataKey="productName"
                        type="category"
                        stroke="#9CA3AF"
                        fontSize={11}
                        width={130}
                        tickFormatter={(val) =>
                          val.length > 18 ? val.substring(0, 18) + "..." : val
                        }
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          name === "lostRevenue" ? formatPrice(val) : `${val} مرة`,
                          name === "lostRevenue" ? "الإيراد المفقود" : "مرات التخلي",
                        ]}
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="lostRevenue" radius={[0, 6, 6, 0]}>
                        {stats.topAbandonedProducts.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? "#EF4444" : index === 1 ? "#F97316" : "#F59E0B"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top 5 Quick List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    أعلى 5 منتجات مفقودة
                  </h4>
                  {stats.topAbandonedProducts.slice(0, 5).map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[11px]">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                            {prod.productName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            تُرك {prod.abandonedCount} مرة
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-red-600 dark:text-red-400 shrink-0">
                        {formatPrice(prod.lostRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actionable Recovery Workbench & Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/80 overflow-hidden">
            {/* Header with Tabs & Search */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("abandoned")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                      activeTab === "abandoned"
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    السلات المتروكة ({stats?.recentAbandonedCarts?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("recovered")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      activeTab === "recovered"
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    تم استرجاعها ({stats?.recentConverted?.length || 0})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === "abandoned" && filteredCarts.length > 0 && (
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
                      {t("abandonedCartAnalytics.exportCsv")}
                    </button>
                  )}
                </div>
              </div>

              {/* Filters and Search Bar (Active when in abandoned tab) */}
              {activeTab === "abandoned" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <button
                      onClick={() => setFilter("all")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                        filter === "all"
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t("abandonedCartAnalytics.filterAll")}
                    </button>
                    <button
                      onClick={() => setFilter("with_phone")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition flex items-center gap-1 ${
                        filter === "with_phone"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {t("abandonedCartAnalytics.filterWithPhone")}
                    </button>
                    <button
                      onClick={() => setFilter("fresh")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition flex items-center gap-1 ${
                        filter === "fresh"
                          ? "bg-orange-600 text-white"
                          : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100"
                      }`}
                    >
                      <FireIcon className="h-3.5 w-3.5" />
                      {t("abandonedCartAnalytics.filterFresh")}
                    </button>
                    <button
                      onClick={() => setFilter("active")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                        filter === "active"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      {t("abandonedCartAnalytics.filterActive")}
                    </button>
                    <button
                      onClick={() => setFilter("expired")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                        filter === "expired"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {t("abandonedCartAnalytics.filterExpired")}
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("abandonedCartAnalytics.searchPlaceholder") as string}
                      className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tab 1: Abandoned Carts Table */}
            {activeTab === "abandoned" && (
              <>
                {filteredCarts.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <ShoppingCartIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-gray-700 dark:text-gray-200">
                      {t("abandonedCartAnalytics.noData")}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
                      {t("abandonedCartAnalytics.noDataDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-right rtl:text-right ltr:text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 font-bold">
                          <th className="py-3 px-3 sm:px-4">{t("abandonedCartAnalytics.customer")}</th>
                          <th className="py-3 px-3 sm:px-4">{t("abandonedCartAnalytics.products")}</th>
                          <th className="py-3 px-3 sm:px-4">{t("abandonedCartAnalytics.cartValue")}</th>
                          <th className="py-3 px-3 sm:px-4">{t("abandonedCartAnalytics.status")}</th>
                          <th className="py-3 px-3 sm:px-4">{t("abandonedCartAnalytics.lastUpdated")}</th>
                          <th className="py-3 px-3 sm:px-4 text-center">{t("abandonedCartAnalytics.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredCarts.map((cart) => {
                          const isFresh = cart.urgencyTier === "fresh";
                          const isActive = cart.urgencyTier === "active";
                          return (
                            <tr
                              key={cart.id || cart.cartId}
                              className="hover:bg-orange-50/20 dark:hover:bg-gray-700/30 transition group"
                            >
                              {/* Customer info */}
                              <td className="py-3 px-3 sm:px-4">
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {cart.customerName || (
                                    <span className="text-gray-400 italic font-normal">
                                      {t("abandonedCartAnalytics.guestCustomer")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {cart.customerPhone ? (
                                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold dir-ltr">
                                      {cart.customerPhone}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">
                                      لم يدخل رقم هاتف
                                    </span>
                                  )}
                                  {cart.governorate && (
                                    <span className="text-[11px] text-gray-400">
                                      • {cart.governorate}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Products preview */}
                              <td className="py-3 px-3 sm:px-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCart(cart)}
                                  className="text-right rtl:text-right ltr:text-left hover:text-blue-600 dark:hover:text-blue-400 transition"
                                >
                                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                                    {cart.itemsCount} {cart.itemsCount === 1 ? "منتج" : "منتجات"}
                                  </div>
                                  <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                                    {cart.items.map((i) => i.name).join("، ") || "تفاصيل السلة"}
                                  </div>
                                </button>
                              </td>

                              {/* Cart Value */}
                              <td className="py-3 px-3 sm:px-4 font-black text-gray-900 dark:text-white">
                                {formatPrice(cart.cartValue)}
                              </td>

                              {/* Status & Priority Badge */}
                              <td className="py-3 px-3 sm:px-4">
                                {isFresh && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs animate-pulse">
                                    <FireIcon className="h-3.5 w-3.5" />
                                    فرصة ذهبية
                                  </span>
                                )}
                                {isActive && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    <ClockIcon className="h-3.5 w-3.5" />
                                    سلة نشطة
                                  </span>
                                )}
                                {!isFresh && !isActive && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    منتهية الصلاحية
                                  </span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 dark:text-gray-400">
                                {new Date(cart.lastUpdated).toLocaleDateString(
                                  isRTL ? "ar-EG" : "en-GB",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>

                              {/* Quick Actions (WhatsApp, Call, Modal) */}
                              <td className="py-3 px-3 sm:px-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {cart.hasPhone ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleWhatsApp(cart)}
                                        title="تواصل فوري عبر واتساب"
                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition shadow-xs"
                                      >
                                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                      </button>
                                      <a
                                        href={`tel:${cleanPhone(cart.customerPhone)}`}
                                        title="اتصال هاتفي مباشر"
                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition shadow-xs"
                                      >
                                        <PhoneIcon className="h-4 w-4" />
                                      </a>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic">
                                      لا يوجد هاتف
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setSelectedCart(cart)}
                                    title={t("abandonedCartAnalytics.viewItems")}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Tab 2: Recovered Carts Table */}
            {activeTab === "recovered" && (
              <>
                {(!stats?.recentConverted || stats.recentConverted.length === 0) ? (
                  <div className="p-8 sm:p-12 text-center">
                    <CheckCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-gray-700 dark:text-gray-200">
                      لا توجد سلات مسترجعة مسجلة في هذه الفترة
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
                      عندما يقوم فريقك بتحويل سلة غير مكتملة أو يكمل العميل الشراء بعد التذكير، ستظهر هنا موثقة بأرقام الطلبات.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-right rtl:text-right ltr:text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold">
                          <th className="py-3 px-3 sm:px-4">رقم الطلب المسترد</th>
                          <th className="py-3 px-3 sm:px-4">قيمة الطلب</th>
                          <th className="py-3 px-3 sm:px-4">المسؤول / القناة</th>
                          <th className="py-3 px-3 sm:px-4">المحافظة</th>
                          <th className="py-3 px-3 sm:px-4">تاريخ الاسترجاع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {stats.recentConverted.map((conv) => (
                          <tr
                            key={conv.id || conv.cartId}
                            className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition"
                          >
                            <td className="py-3 px-3 sm:px-4 font-bold text-gray-900 dark:text-white">
                              {conv.orderNumber ? (
                                <Link
                                  to={`/orders`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  {conv.orderNumber}
                                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                "تم التحويل"
                              )}
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-black text-emerald-600 dark:text-emerald-400">
                              {formatPrice(conv.cartValue)}
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                                {conv.employeeName || (conv.channel === "natural" ? "تحويل ذاتي" : "إدارة المتجر")}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-gray-500 dark:text-gray-400">
                              {conv.governorate || "غير محدد"}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conv.convertedAt).toLocaleDateString(
                                isRTL ? "ar-EG" : "en-GB",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal: Cart Items Detailed Inspector */}
      {selectedCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                  <ShoppingCartIcon className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {t("abandonedCartAnalytics.cartDetailsTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCart(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Customer Summary in Modal */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">العميل:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedCart.customerName || t("abandonedCartAnalytics.guestCustomer")}
                </span>
              </div>
              {selectedCart.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">الهاتف:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold dir-ltr">
                    {selectedCart.customerPhone}
                  </span>
                </div>
              )}
              {selectedCart.governorate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">المحافظة:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {selectedCart.governorate}
                  </span>
                </div>
              )}
            </div>

            {/* Products List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase">
                المنتجات داخل السلة ({selectedCart.items.length})
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {selectedCart.items.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-10 rounded-lg object-cover border border-gray-100 dark:border-gray-700 shrink-0"
                        />
                      ) : (
                        <span className="size-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                          <ShoppingCartIcon className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm sm:text-base">
              <span className="font-bold text-gray-700 dark:text-gray-300">
                إجمالي قيمة السلة:
              </span>
              <span className="font-black text-red-600 dark:text-red-400 text-lg sm:text-xl">
                {formatPrice(selectedCart.cartValue)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              {selectedCart.hasPhone && (
                <>
                  <button
                    type="button"
                    onClick={() => handleWhatsApp(selectedCart)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    تواصل عبر واتساب
                  </button>
                  <a
                    href={`tel:${cleanPhone(selectedCart.customerPhone)}`}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    اتصال
                  </a>
                </>
              )}
              <Link
                to="/orders/incomplete"
                className="py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                فتح الورشة
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbandonedCartAnalytics;

