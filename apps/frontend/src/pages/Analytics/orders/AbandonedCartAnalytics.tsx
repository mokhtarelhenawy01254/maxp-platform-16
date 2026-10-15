import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  XCircle,
  RefreshCw,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Tag,
  MessageSquare,
} from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import {
  AbandonedCartStats,
  CartItem,
  FilterType,
} from "./abandonedCartTypes";
import AbandonedCartTable from "./AbandonedCartTable";
import AbandonedCartDetailModal from "./AbandonedCartDetailModal";
import AbandonedCartProductsChart from "./AbandonedCartProductsChart";

export default function AbandonedCartAnalytics() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<AbandonedCartStats | null>(null);
  const [activeTab, setActiveTab] = useState<"abandoned" | "recovered">("abandoned");
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

      if (response?.success && response.data) {
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
      setError(err?.message || "تعذر جلب بيانات السلات المتروكة");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (range) fetchData();
  }, [range, fetchData]);

  const cleanPhone = (phone?: string | null): string => {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9+]/g, "");
    if (cleaned.startsWith("01") && cleaned.length === 11) {
      cleaned = "20" + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleWhatsApp = (cart: CartItem) => {
    const phone = cleanPhone(cart.customerPhone);
    if (!phone) return;
    const name = cart.customerName || "عميلنا العزيز";
    const msg = `مرحباً ${name}، لاحظنا اهتمامك بمنتجاتنا وسلتك ما زالت محفوظة لك! يسعدنا مساعدتك في إتمام طلبك وتوصيله لك سريعاً. هل تود تأكيد الطلب الآن؟`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const filteredCarts = useMemo(() => {
    if (!stats?.recentAbandonedCarts) return [];
    let list = stats.recentAbandonedCarts;

    if (filter === "with_phone") list = list.filter((c) => c.hasPhone);
    else if (filter === "fresh") list = list.filter((c) => c.urgencyTier === "fresh");
    else if (filter === "active") list = list.filter((c) => c.urgencyTier === "active");
    else if (filter === "expired") list = list.filter((c) => c.urgencyTier === "expired");

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
    link.setAttribute("download", `abandoned_carts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            تحليل السلات المتروكة والاسترداد
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            تتبع نية الشراء غير المكتملة وفرص التواصل المباشر لاسترجاع المبيعات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector onRangeChange={setRange} />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Operational Quick Bridges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link
          to="/orders/incomplete"
          className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium text-foreground truncate">ورشة الطلبات غير المكتملة</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
        </Link>

        <Link
          to="/orders/incomplete/reports"
          className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium text-foreground truncate">سجل تقارير الاسترداد</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
        </Link>

        <Link
          to="/whatsapp/templates"
          className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium text-foreground truncate">قوالب رسائل واتساب</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
        </Link>

        <Link
          to="/coupons"
          className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium text-foreground truncate">كوبونات تحفيز الشراء</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
        </Link>
      </div>

      {loading && !stats && (
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-xs text-muted-foreground">جاري جمع وتحديث بيانات السلات المتروكة...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5 text-center">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-md"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>السلات المتروكة</span>
                <ShoppingCart className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {(stats?.abandonedCarts || 0).toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                من إجمالي {(stats?.totalCarts || 0).toLocaleString()} سلة منشأة
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>الإيراد المفقود</span>
                <DollarSign className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              </div>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatPrice(stats?.totalCartValue || 0)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                متوسط السلة: {formatPrice(stats?.avgCartValue || 0)}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>الإيراد المسترجع</span>
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPrice(stats?.recoveredRevenue || 0)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                تم استرجاع {(stats?.convertedCarts || 0).toLocaleString()} سلة مؤكدة
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>معدل التخلي والاسترداد</span>
                <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {(stats?.abandonmentRate || 0).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {(stats?.recoveryRate || 0).toFixed(1)}% استرداد
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">نسبة النجاح من المفقود</p>
            </div>
          </div>

          {/* Cart Conversion Funnel Bar */}
          {stats?.funnel && stats.funnel.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-card p-4 shadow-none">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                مراحل مسار سلات الشراء (Funnel)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono tabular-nums">
                {stats.funnel.map((step, idx) => {
                  const baseCount = stats.funnel[0]?.count || 1;
                  const pct = baseCount > 0 ? Math.round((step.count / baseCount) * 100) : 0;
                  return (
                    <div
                      key={step.stage || idx}
                      className="p-3 rounded-md border border-border/70 bg-muted/20 flex flex-col justify-between"
                    >
                      <span className="font-sans text-xs text-muted-foreground">{step.label}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-foreground">
                          {step.count.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
          <AbandonedCartProductsChart products={stats?.topAbandonedProducts || []} />

          {/* Actionable Recovery Workbench & Table */}
          <AbandonedCartTable
            activeTab={activeTab}
            onTabChange={setActiveTab}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            abandonedCarts={filteredCarts}
            convertedCarts={stats?.recentConverted || []}
            onSelectCart={setSelectedCart}
            onWhatsApp={handleWhatsApp}
            cleanPhone={cleanPhone}
            onExportCSV={handleExportCSV}
          />
        </>
      )}

      {/* Modal Inspector */}
      <AbandonedCartDetailModal
        selectedCart={selectedCart}
        onClose={() => setSelectedCart(null)}
        onWhatsApp={handleWhatsApp}
        cleanPhone={cleanPhone}
      />
    </div>
  );
}
