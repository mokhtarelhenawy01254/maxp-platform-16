import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
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
  APPROVED: "default",
  SENT: "default",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
  CLOSED: "outline",
};

const PurchaseOrders: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const statusLabels: Record<string, string> = {
    DRAFT: t("procurement.purchaseOrders.statusDraft"),
    PENDING: t("procurement.purchaseOrders.statusPending"),
    APPROVED: t("procurement.purchaseOrders.statusApproved"),
    SENT: t("procurement.purchaseOrders.statusSent"),
    PARTIALLY_RECEIVED: t("procurement.purchaseOrders.statusPartiallyReceived"),
    RECEIVED: t("procurement.purchaseOrders.statusReceived"),
    CANCELLED: t("procurement.purchaseOrders.statusCancelled"),
    CLOSED: t("procurement.purchaseOrders.statusClosed"),
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await apiClient.get("/procurement/purchase-orders", {
        params: { page, limit: 20, search: searchTerm, status: statusFilter },
      });
      setOrders(response.data.orders);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (id: string) => {
    if (window.confirm(t("procurement.purchaseOrders.confirmApprove"))) {
      try {
        await apiClient.post(`/procurement/purchase-orders/${id}/approve`);
        fetchOrders();
      } catch (error) {
        console.error("Error approving order:", error);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm(t("procurement.purchaseOrders.confirmCancel"))) {
      try {
        await apiClient.post(`/procurement/purchase-orders/${id}/cancel`);
        fetchOrders();
      } catch (error) {
        console.error("Error cancelling order:", error);
      }
    }
  };

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between mb-3">
        <h1 className="text-2xl font-bold">{t("procurement.purchaseOrders.title")}</h1>
        <Button onClick={() => navigate("/procurement/purchase-orders/new")}>
          <Plus className="size-4" /> {t("procurement.purchaseOrders.createNew")}
        </Button>
      </div>

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("procurement.purchaseOrders.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="min-w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        </CardContent>
      </Card>

      <div className="hidden md:block rounded-xl border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("procurement.purchaseOrders.columnOrderNumber")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnSupplier")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnOrderDate")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnExpectedDelivery")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnItemCount")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnTotalAmount")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnStatus")}</TableHead>
              <TableHead>{t("procurement.purchaseOrders.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>{order.supplier.name}</TableCell>
                <TableCell>
                  {new Date(order.orderDate).toLocaleDateString("ar-EG")}
                </TableCell>
                <TableCell>
                  {order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString("ar-EG")
                    : "-"}
                </TableCell>
                <TableCell>{order._count.items}</TableCell>
                <TableCell>{Number(order.totalAmount).toFixed(2)} EGP</TableCell>
                <TableCell>
                  <Badge variant={statusColors[order.status] || "outline"}>
                    {statusLabels[order.status]}
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
                      order.status !== "CLOSED" &&
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:hidden gap-2">
        {orders.length === 0 ? (
          <ProcurementMobileState>{t("procurement.purchaseOrders.emptyState")}</ProcurementMobileState>
        ) : (
          orders.map((order) => (
            <ProcurementMobileCard
              key={order.id}
              eyebrow={order.orderNumber}
              title={order.supplier.name}
              subtitle={t("procurement.purchaseOrders.mobileItemCount", { count: order._count.items })}
              status={
                <Badge variant={statusColors[order.status] || "outline"}>
                  {statusLabels[order.status] || order.status}
                </Badge>
              }
              fields={[
                {
                  label: t("procurement.purchaseOrders.mobileOrderDate"),
                  value: new Date(order.orderDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: t("procurement.purchaseOrders.mobileExpectedDelivery"),
                  value: order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString("ar-EG")
                    : "-",
                },
                {
                  label: t("procurement.purchaseOrders.mobileTotalAmount"),
                  value: `${Number(order.totalAmount).toFixed(2)} EGP`,
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
                    order.status !== "CLOSED" &&
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
    </div>
  );
};

export default PurchaseOrders;
