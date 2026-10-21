import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatCurrency } from "../../utils/currency";
import { formatShortDate } from "../../utils/dateFormat";
import {
  ProcurementMobileCard,
  ProcurementMobileState,
} from "./ProcurementMobileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDelivery?: string;
  status: string;
  totalAmount: number;
  supplier: {
    id: string;
    name: string;
    phone?: string;
  };
  _count: {
    items: number;
  };
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING: "secondary",
  ORDERED: "default",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

const PurchaseOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    confirmColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
  }>({
    open: false,
    title: "",
    content: "",
    onConfirm: () => {},
  });

  const statusLabels: Record<string, string> = {
    DRAFT: t("procurement.purchaseOrders.statusDraft", "مسودة"),
    PENDING: t("procurement.purchaseOrders.statusPending", "في انتظار الموافقة"),
    ORDERED: t("procurement.purchaseOrders.statusOrdered", "معتمد / قيد التوريد"),
    PARTIALLY_RECEIVED: t("procurement.purchaseOrders.statusPartiallyReceived", "استلام جزئي"),
    RECEIVED: t("procurement.purchaseOrders.statusReceived", "تم الاستلام"),
    CANCELLED: t("procurement.purchaseOrders.statusCancelled", "ملغي"),
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        orders: PurchaseOrder[];
        pagination: { totalPages: number };
      }>("/procurement/purchase-orders", {
        params: { page, limit: 20, search: searchTerm, status: statusFilter },
      });
      setOrders(response.data.orders);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      console.error("Error fetching purchase orders:", err);
      setError(err?.response?.data?.message || t("procurement.purchaseOrders.fetchError", "تعذر تحميل أوامر الشراء"));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = (id: string) => {
    setConfirmDialog({
      open: true,
      title: t("procurement.purchaseOrderDetail.confirmApproveTitle", "تأكيد الموافقة"),
      content: t("procurement.purchaseOrders.confirmApprove", "هل تريد الموافقة على هذا الأمر؟"),
      confirmColor: "primary",
      onConfirm: async () => {
        try {
          await apiClient.post(`/procurement/purchase-orders/${id}/approve`);
          fetchOrders();
        } catch (error) {
          console.error("Error approving order:", error);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleCancel = (id: string) => {
    setConfirmDialog({
      open: true,
      title: t("procurement.purchaseOrderDetail.confirmCancelTitle", "تأكيد الإلغاء"),
      content: t("procurement.purchaseOrders.confirmCancel", "هل تريد إلغاء هذا الأمر؟"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          await apiClient.post(`/procurement/purchase-orders/${id}/cancel`);
          fetchOrders();
        } catch (error) {
          console.error("Error cancelling order:", error);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("procurement.purchaseOrders.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة ومتابعة أوامر الشراء الصادرة للموردين وحالات الاستلام
          </p>
        </div>
        <Button onClick={() => navigate("/procurement/purchase-orders/new")} className="gap-2">
          <Plus className="size-4" /> {t("procurement.purchaseOrders.createNew")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchOrders} className="h-7 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Integrated Single-Surface Filter Bar */}
      <div className="p-3 rounded-xl border border-border/70 bg-card">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("procurement.purchaseOrders.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-8"
            />
          </div>
          <div className="min-w-[200px]">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("procurement.purchaseOrders.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("procurement.purchaseOrders.all")}</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="hidden md:block rounded-xl border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("procurement.purchaseOrders.columnOrderNumber")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseOrders.columnSupplier")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseOrders.columnOrderDate")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseOrders.columnExpectedDelivery")}</TableHead>
              <TableHead className="text-center">{t("procurement.purchaseOrders.columnItemCount")}</TableHead>
              <TableHead className="text-end">{t("procurement.purchaseOrders.columnTotalAmount")}</TableHead>
              <TableHead className="text-center">{t("procurement.purchaseOrders.columnStatus")}</TableHead>
              <TableHead className="text-center">{t("procurement.purchaseOrders.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter
                    ? "لا توجد أوامر شراء مطابقة لمعايير البحث"
                    : t("procurement.purchaseOrders.emptyState", "لا توجد أوامر شراء مسجلة")}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs font-medium text-primary text-start">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-start">{order.supplier.name}</TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(order.orderDate, i18n.language)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(order.expectedDelivery, i18n.language)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{order._count.items}</TableCell>
                  <TableCell className="text-end tabular-nums font-medium">
                    {formatCurrency(order.totalAmount, { locale: i18n.language })}
                  </TableCell>
                <TableCell>
                  <Badge variant={statusColors[order.status] || "outline"}>
                    {statusLabels[order.status] ?? order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate(`/procurement/purchase-orders/${order.id}`)
                      }
                      title={t("procurement.purchaseOrders.viewDetails")}
                    >
                      <Eye className="size-4" />
                    </Button>
                    {(order.status === "DRAFT" || order.status === "PENDING") && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/procurement/purchase-orders/${order.id}/edit`)
                          }
                          title={t("procurement.purchaseOrders.edit")}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(order.id)}
                          title={t("procurement.purchaseOrders.approve")}
                        >
                          <CheckCircle className="size-4 text-green-600" />
                        </Button>
                      </>
                    )}
                    {order.status !== "RECEIVED" &&
                      order.status !== "CANCELLED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(order.id)}
                          title={t("procurement.purchaseOrders.cancel")}
                        >
                          <XCircle className="size-4 text-red-600" />
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:hidden gap-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <ProcurementMobileState>
            {searchTerm || statusFilter
              ? "لا توجد أوامر شراء مطابقة لمعايير البحث"
              : t("procurement.purchaseOrders.emptyState")}
          </ProcurementMobileState>
        ) : (
          orders.map((order) => (
            <ProcurementMobileCard
              key={order.id}
              eyebrow={order.orderNumber}
              title={order.supplier.name}
              subtitle={t("procurement.purchaseOrders.mobileItemCount", { count: order._count.items })}
              status={
                <Badge variant={statusColors[order.status] || "outline"}>
                  {statusLabels[order.status] ?? order.status}
                </Badge>
              }
              fields={[
                {
                  label: t("procurement.purchaseOrders.mobileOrderDate"),
                  value: formatShortDate(order.orderDate, i18n.language),
                },
                {
                  label: t("procurement.purchaseOrders.mobileExpectedDelivery"),
                  value: formatShortDate(order.expectedDelivery, i18n.language),
                },
                {
                  label: t("procurement.purchaseOrders.mobileTotalAmount"),
                  value: formatCurrency(order.totalAmount, { locale: i18n.language }),
                  emphasis: true,
                },
                {
                  label: t("procurement.purchaseOrders.mobileSupplierPhone"),
                  value: order.supplier.phone || "-",
                },
              ]}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate(`/procurement/purchase-orders/${order.id}`)
                    }
                    title={t("procurement.purchaseOrders.viewDetails")}
                  >
                    <Eye className="size-4" />
                  </Button>
                  {(order.status === "DRAFT" || order.status === "PENDING") && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/procurement/purchase-orders/${order.id}/edit`)
                        }
                        title={t("procurement.purchaseOrders.edit")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApprove(order.id)}
                        title={t("procurement.purchaseOrders.approve")}
                      >
                        <CheckCircle className="size-4 text-green-600" />
                      </Button>
                    </>
                  )}
                  {order.status !== "RECEIVED" &&
                    order.status !== "CANCELLED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancel(order.id)}
                        title={t("procurement.purchaseOrders.cancel")}
                      >
                        <XCircle className="size-4 text-red-600" />
                      </Button>
                    )}
                </>
              }
            />
          ))
        )}
      </div>

      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("common.previous")}
          </Button>
          <span className="text-sm px-3">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("common.next")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        confirmColor={confirmDialog.confirmColor}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PurchaseOrders;
