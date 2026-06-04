import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  ProcurementMobileCard,
  ProcurementMobileState,
} from "./ProcurementMobileCard";
import { desktopTableSx, mobileListSx } from "./procurementResponsiveSx";

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

const statusColors: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"
> = {
  DRAFT: "default",
  PENDING: "warning",
  APPROVED: "info",
  SENT: "primary",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "success",
  CANCELLED: "error",
  CLOSED: "default",
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
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h4">أوامر الشراء</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/procurement/purchase-orders/new")}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          إنشاء أمر شراء جديد
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
            <TextField
              fullWidth
              placeholder="البحث عن أمر شراء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 200 } }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={desktopTableSx}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم الأمر</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell>تاريخ الأمر</TableCell>
              <TableCell>التسليم المتوقع</TableCell>
              <TableCell>عدد الأصناف</TableCell>
              <TableCell>المبلغ الإجمالي</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
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
                    ? new Date(order.expectedDelivery).toLocaleDateString(
                        "ar-EG",
                      )
                    : "-"}
                </TableCell>
                <TableCell>{order._count.items}</TableCell>
                <TableCell>
                  {Number(order.totalAmount).toFixed(2)} EGP
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[order.status]}
                    color={statusColors[order.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() =>
                      navigate(`/procurement/purchase-orders/${order.id}`)
                    }
                    title="عرض التفاصيل"
                  >
                    <ViewIcon />
                  </IconButton>
                  {(order.status === "DRAFT" || order.status === "PENDING") && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(
                            `/procurement/purchase-orders/${order.id}/edit`,
                          )
                        }
                        title="تعديل"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleApprove(order.id)}
                        title="الموافقة"
                        color="success"
                      >
                        <ApproveIcon />
                      </IconButton>
                    </>
                  )}
                  {order.status !== "RECEIVED" &&
                    order.status !== "CLOSED" &&
                    order.status !== "CANCELLED" && (
                      <IconButton
                        size="small"
                        onClick={() => handleCancel(order.id)}
                        title="إلغاء"
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={mobileListSx}>
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
                <Chip
                  label={statusLabels[order.status] || order.status}
                  color={statusColors[order.status] || "default"}
                  size="small"
                />
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
                  <IconButton
                    aria-label="عرض التفاصيل"
                    size="small"
                    onClick={() =>
                      navigate(`/procurement/purchase-orders/${order.id}`)
                    }
                    title="عرض التفاصيل"
                  >
                    <ViewIcon />
                  </IconButton>
                  {(order.status === "DRAFT" || order.status === "PENDING") && (
                    <>
                      <IconButton
                        aria-label="تعديل"
                        size="small"
                        onClick={() =>
                          navigate(
                            `/procurement/purchase-orders/${order.id}/edit`,
                          )
                        }
                        title="تعديل"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="الموافقة"
                        size="small"
                        onClick={() => handleApprove(order.id)}
                        title="الموافقة"
                        color="success"
                      >
                        <ApproveIcon />
                      </IconButton>
                    </>
                  )}
                  {order.status !== "RECEIVED" &&
                    order.status !== "CLOSED" &&
                    order.status !== "CANCELLED" && (
                      <IconButton
                        aria-label="إلغاء"
                        size="small"
                        onClick={() => handleCancel(order.id)}
                        title="إلغاء"
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                </>
              }
            />
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default PurchaseOrders;
