import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
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

const statusLabels: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING: "في انتظار الموافقة",
  APPROVED: "تمت الموافقة",
  SENT: "تم الإرسال",
  PARTIALLY_RECEIVED: "استلام جزئي",
  RECEIVED: "تم الاستلام",
  CANCELLED: "ملغي",
  CLOSED: "مغلق",
};

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    if (window.confirm("هل تريد الموافقة على هذا الأمر؟")) {
      try {
        await apiClient.post(`/procurement/purchase-orders/${id}/approve`);
        fetchOrders();
      } catch (error) {
        console.error("Error approving order:", error);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("هل تريد إلغاء هذا الأمر؟")) {
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
        <h1 className="text-2xl font-bold">أوامر الشراء</h1>
        <Button onClick={() => navigate("/procurement/purchase-orders/new")}>
          <Plus className="size-4" /> إنشاء أمر شراء جديد
        </Button>
      </div>

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن أمر شراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="min-w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
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
              <TableHead>رقم الأمر</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>تاريخ الأمر</TableHead>
              <TableHead>التسليم المتوقع</TableHead>
              <TableHead>عدد الأصناف</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
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
                      title="عرض التفاصيل"
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
                          title="تعديل"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(order.id)}
                          title="الموافقة"
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
                          title="إلغاء"
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
          <ProcurementMobileState>لا توجد أوامر شراء</ProcurementMobileState>
        ) : (
          orders.map((order) => (
            <ProcurementMobileCard
              key={order.id}
              eyebrow={order.orderNumber}
              title={order.supplier.name}
              subtitle={`عدد الأصناف: ${order._count.items}`}
              status={
                <Badge variant={statusColors[order.status] || "outline"}>
                  {statusLabels[order.status] || order.status}
                </Badge>
              }
              fields={[
                {
                  label: "تاريخ الأمر",
                  value: new Date(order.orderDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: "التسليم المتوقع",
                  value: order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString("ar-EG")
                    : "-",
                },
                {
                  label: "المبلغ الإجمالي",
                  value: `${Number(order.totalAmount).toFixed(2)} EGP`,
                  emphasis: true,
                },
                {
                  label: "هاتف المورد",
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
                    title="عرض التفاصيل"
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
                        title="تعديل"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApprove(order.id)}
                        title="الموافقة"
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
                        title="إلغاء"
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
            السابق
          </Button>
          <span className="text-sm px-3">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
