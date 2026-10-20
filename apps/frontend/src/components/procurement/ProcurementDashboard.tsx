import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Receipt, CreditCard, Users } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}> = ({ title, value, icon, color, onClick }) => (
  <Card
    onClick={onClick}
    className={onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40 transition-all" : ""}
  >
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h4 className="text-2xl font-bold">{value}</h4>
        </div>
        <div
          className="flex items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color, width: 56, height: 56 }}
        >
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProcurementDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<DashboardData>("/procurement/reports/dashboard");
      setData(response.data as DashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (v: any) => (Number(v) || 0).toFixed(2);

  if (loading || !data) {
    return <div className="p-3">{t("procurement.dashboard.loading")}</div>;
  }

  const summary = data?.summary || {};

  return (
    <div className="p-3">
      <h1 className="text-2xl font-bold mb-3">{t("procurement.dashboard.title")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-3">
        <StatCard
          title={t("procurement.dashboard.totalSuppliers")}
          value={summary.totalSuppliers ?? 0}
          icon={<Users />}
          color="#1976d2"
          onClick={() => navigate("/procurement/suppliers")}
        />
        <StatCard
          title={t("procurement.dashboard.purchaseOrders")}
          value={summary.totalPurchaseOrders ?? 0}
          icon={<ShoppingCart />}
          color="#2e7d32"
          onClick={() => navigate("/procurement/purchase-orders")}
        />
        <StatCard
          title={t("procurement.dashboard.pendingInvoices")}
          value={summary.pendingInvoices ?? 0}
          icon={<Receipt />}
          color="#ed6c02"
          onClick={() => navigate("/procurement/purchase-invoices?status=PENDING")}
        />
        <StatCard
          title={t("procurement.dashboard.totalPayments")}
          value={summary.totalPayments ?? 0}
          icon={<CreditCard />}
          color="#9c27b0"
          onClick={() => navigate("/procurement/supplier-payments")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-3">
        <Card
          onClick={() => navigate("/procurement/reports?tab=orders")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
        >
          <CardContent>
            <h3 className="text-base font-semibold mb-1">{t("procurement.dashboard.totalPurchases")}</h3>
            {fmtMoney(summary.totalPurchaseAmount)} {t("dashboard.egp")}
          </CardContent>
        </Card>
        <Card
          onClick={() => navigate("/procurement/reports?tab=payments")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
        >
          <CardContent>
            <h3 className="text-base font-semibold mb-1">{t("procurement.dashboard.totalPaid")}</h3>
            {fmtMoney(summary.totalPaidAmount)} {t("dashboard.egp")}
          </CardContent>
        </Card>
        <Card
          onClick={() => navigate("/procurement/reports?tab=aging")}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
        >
          <CardContent>
            <h3 className="text-base font-semibold mb-1">{t("procurement.dashboard.pendingAmount")}</h3>
            {fmtMoney(summary.totalPendingAmount)} {t("dashboard.egp")}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-base font-semibold mb-2">{t("procurement.dashboard.topSuppliers")}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.orders")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.invoices")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.topSuppliers ?? []).map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium text-primary">{supplier.name || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{supplier._count?.purchaseOrders ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{supplier._count?.purchaseInvoices ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(supplier.currentBalance)} {t("dashboard.egp")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-base font-semibold mb-2">{t("procurement.dashboard.recentPurchaseOrders")}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("procurement.dashboard.orderNumber")}</TableHead>
                  <TableHead>{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.amount")}</TableHead>
                  <TableHead>{t("procurement.dashboard.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentOrders ?? []).map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => navigate(`/procurement/purchase-orders/${order.id}`)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary">{order.orderNumber}</TableCell>
                    <TableCell>{order.supplier?.name || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(order.totalAmount)} {t("dashboard.egp")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent>
            <h3 className="text-base font-semibold mb-2">{t("procurement.dashboard.recentInvoices")}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("procurement.dashboard.invoiceNumber")}</TableHead>
                  <TableHead>{t("procurement.dashboard.supplier")}</TableHead>
                  <TableHead>{t("procurement.dashboard.date")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.totalAmount")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.paid")}</TableHead>
                  <TableHead className="text-right">{t("procurement.dashboard.remaining")}</TableHead>
                  <TableHead>{t("procurement.dashboard.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentInvoices ?? []).map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    onClick={() => navigate(`/procurement/purchase-invoices/${invoice.id}`)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.supplier?.name || "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {new Date(invoice.invoiceDate).toLocaleDateString(i18n.language)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(invoice.totalAmount)} {t("dashboard.egp")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtMoney(invoice.paidAmount)} {t("dashboard.egp")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-rose-500">
                      {fmtMoney(invoice.remainingAmount)} {t("dashboard.egp")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcurementDashboard;
