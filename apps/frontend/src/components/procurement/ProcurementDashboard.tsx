import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Receipt, CreditCard, Users, RefreshCw, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "../dashboard/MetricCard";
import PeriodSelector, { PeriodRange } from "../common/PeriodSelector";
import { formatCurrency } from "../../utils/currency";
import { formatShortDate } from "../../utils/dateFormat";

interface DashboardData {
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchaseOrders: number;
    pendingOrders: number;
    totalInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalPayments: number;
    totalPurchaseAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
  topSuppliers: Array<{
    id: string;
    name: string;
    currentBalance: number;
    _count: {
      purchaseOrders: number;
      purchaseInvoices: number;
    };
  }>;
  recentOrders: Array<any>;
  recentInvoices: Array<any>;
  recentPayments: Array<any>;
}

const ProcurementDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRtl = i18n.language !== "en";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<DashboardData>("/procurement/reports/dashboard");
      setData(response.data as DashboardData);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err?.response?.data?.message || "حدث خطأ أثناء جلب لوحة المعلومات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePeriodChange = (range: PeriodRange) => {
    // Note: The procurement dashboard endpoint returns lifetime company totals.
    // Period selection directs users to the dedicated reports workspace for date-filtered analytics.
    if (range.startDate && range.endDate) {
      navigate(`/procurement/reports?startDate=${range.startDate}&endDate=${range.endDate}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto my-12" dir={isRtl ? "rtl" : "ltr"}>
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold">{error}</h2>
        <Button variant="outline" onClick={fetchDashboardData} className="gap-2">
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const summary = data?.summary || ({} as any);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header and Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("procurement.dashboard.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            مؤشرات أداء المشتريات وفواتير التوريد والذمم الدائنة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector
            initialPeriod="30"
            onChange={handlePeriodChange}
            className="w-auto"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* KPI Cards using platform MetricCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          variant="simple"
          icon={Users}
          label={t("procurement.dashboard.totalSuppliers")}
          value={String(summary.totalSuppliers ?? 0)}
          isRtl={isRtl}
          onClick={() => navigate("/procurement/suppliers")}
        />
        <MetricCard
          variant="simple"
          icon={ShoppingCart}
          label={t("procurement.dashboard.purchaseOrders")}
          value={String(summary.totalPurchaseOrders ?? 0)}
          isRtl={isRtl}
          onClick={() => navigate("/procurement/purchase-orders")}
        />
        <MetricCard
          variant="simple"
          icon={Receipt}
          label={t("procurement.dashboard.pendingInvoices")}
          value={String(summary.pendingInvoices ?? 0)}
          isRtl={isRtl}
          onClick={() => navigate("/procurement/purchase-invoices?status=PENDING")}
        />
        <MetricCard
          variant="simple"
          icon={CreditCard}
          label={t("procurement.dashboard.totalPayments")}
          value={String(summary.totalPayments ?? 0)}
          isRtl={isRtl}
          onClick={() => navigate("/procurement/supplier-payments")}
        />
      </div>

      {/* Monetary Totals Cards with unified formatCurrency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          onClick={() => navigate("/procurement/reports?tab=orders")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all border border-border/70"
        >
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">
              {t("procurement.dashboard.totalPurchases")}
            </span>
            <div className="text-2xl font-mono tabular-nums font-bold tracking-tight text-foreground">
              {formatCurrency(summary.totalPurchaseAmount, { locale: i18n.language })}
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate("/procurement/reports?tab=payments")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all border border-border/70"
        >
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">
              {t("procurement.dashboard.totalPaid")}
            </span>
            <div className="text-2xl font-mono tabular-nums font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalPaidAmount, { locale: i18n.language })}
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate("/procurement/reports?tab=aging")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all border border-border/70"
        >
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1">
              {t("procurement.dashboard.pendingAmount")}
            </span>
            <div className="text-2xl font-mono tabular-nums font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.totalPendingAmount, { locale: i18n.language })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card className="border border-border/70">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-3">
              {t("procurement.dashboard.topSuppliers")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead className="text-center">{t("procurement.dashboard.orders")}</TableHead>
                  <TableHead className="text-center">{t("procurement.dashboard.invoices")}</TableHead>
                  <TableHead className="text-end">{t("procurement.dashboard.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.topSuppliers || data.topSuppliers.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      لا يوجد موردون مسجلون حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium text-primary text-start">
                        {supplier.name || "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {supplier._count?.purchaseOrders ?? 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {supplier._count?.purchaseInvoices ?? 0}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {formatCurrency(supplier.currentBalance, { locale: i18n.language })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border border-border/70">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-3">
              {t("procurement.dashboard.recentPurchaseOrders")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("procurement.dashboard.orderNumber")}</TableHead>
                  <TableHead className="text-start">{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead className="text-end">{t("procurement.dashboard.amount")}</TableHead>
                  <TableHead className="text-center">{t("procurement.dashboard.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.recentOrders || data.recentOrders.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      لا توجد أوامر شراء حديثة
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => navigate(`/procurement/purchase-orders/${order.id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary text-start">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-start">{order.supplier?.name || "—"}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {formatCurrency(order.totalAmount, { locale: i18n.language })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="md:col-span-2 border border-border/70">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-3">
              {t("procurement.dashboard.recentInvoices")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("procurement.dashboard.invoiceNumber")}</TableHead>
                  <TableHead className="text-start">{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead className="text-start">{t("procurement.dashboard.date")}</TableHead>
                  <TableHead className="text-end">{t("procurement.dashboard.totalAmount")}</TableHead>
                  <TableHead className="text-end">{t("procurement.dashboard.paid")}</TableHead>
                  <TableHead className="text-end">{t("procurement.dashboard.remaining")}</TableHead>
                  <TableHead className="text-center">{t("procurement.dashboard.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.recentInvoices || data.recentInvoices.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      لا توجد فواتير شراء حديثة
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      onClick={() => navigate(`/procurement/purchase-invoices/${invoice.id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary text-start">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-start">{invoice.supplier?.name || "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums text-start">
                        {formatShortDate(invoice.invoiceDate, i18n.language)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {formatCurrency(invoice.totalAmount, { locale: i18n.language })}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(invoice.paidAmount, { locale: i18n.language })}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-semibold text-rose-500">
                        {formatCurrency(invoice.remainingAmount, { locale: i18n.language })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{invoice.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcurementDashboard;
