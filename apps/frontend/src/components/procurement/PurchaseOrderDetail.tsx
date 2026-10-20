import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  PackageCheck,
  XCircle,
  Pencil,
  Printer,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ReceiveItemsDialog } from "./ReceiveItemsDialog";
import { formatCurrency } from "../../utils/currency";
import { formatShortDate } from "../../utils/dateFormat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseOrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  description?: string | null;
  quantity: number | string;
  receivedQuantity: number | string;
  unitPrice: number | string;
  taxRate?: number | string;
  discountRate?: number | string;
  totalPrice: number | string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    stock?: number;
  } | null;
}

interface LinkedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  status: string;
}

interface PurchaseOrderFull {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDelivery?: string | null;
  receivedDate?: string | null;
  status: string;
  paymentTerms?: string | null;
  notes?: string | null;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  shippingCost: number | string;
  totalAmount: number | string;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  purchaseOrderItems: PurchaseOrderItem[];
  purchaseInvoices?: LinkedInvoice[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING: "secondary",
  ORDERED: "default",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

export const PurchaseOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [order, setOrder] = useState<PurchaseOrderFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const invoiceStatusLabels: Record<string, string> = {
    PENDING: t("procurement.purchaseInvoices.statusPending", "غير مدفوعة"),
    PAID: t("procurement.purchaseInvoices.statusPaid", "مدفوعة"),
    CANCELLED: t("procurement.purchaseInvoices.statusCancelled", "ملغاة"),
  };

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<PurchaseOrderFull>(`/procurement/purchase-orders/${id}`);
      setOrder(response.data);
    } catch (err: unknown) {
      console.error("Error fetching purchase order:", err);
      const errResp = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errResp.response?.data?.message || t("procurement.purchaseOrderDetail.loadError", "فشل تحميل تفاصيل أمر الشراء"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleApprove = () => {
    if (!order) return;
    setConfirmDialog({
      open: true,
      title: t("procurement.purchaseOrderDetail.confirmApproveTitle", "تأكيد الموافقة على أمر الشراء"),
      content: t("procurement.purchaseOrderDetail.confirmApproveContent", "هل أنت متأكد من رغبتك في اعتماد والموافقة على أمر الشراء هذا؟"),
      confirmColor: "primary",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/procurement/purchase-orders/${order.id}/approve`);
          await fetchOrder();
        } catch (err: any) {
          console.error("Error approving order:", err);
          setError(err?.response?.data?.message || "تعذر اعتماد أمر الشراء");
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleCancel = () => {
    if (!order) return;
    setConfirmDialog({
      open: true,
      title: t("procurement.purchaseOrderDetail.confirmCancelTitle", "تأكيد إلغاء أمر الشراء"),
      content: t("procurement.purchaseOrderDetail.confirmCancelContent", "هل أنت متأكد من رغبتك في إلغاء أمر الشراء؟ لا يمكن التراجع عن هذا الإجراء."),
      confirmColor: "error",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/procurement/purchase-orders/${order.id}/cancel`);
          await fetchOrder();
        } catch (err: any) {
          console.error("Error cancelling order:", err);
          setError(err?.response?.data?.message || "تعذر إلغاء أمر الشراء");
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">{t("common.loading", "جاري التحميل...")}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error || t("procurement.purchaseOrderDetail.loadError", "أمر الشراء غير موجود")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={fetchOrder}>
            إعادة المحاولة
          </Button>
          <Button variant="outline" onClick={() => navigate("/procurement/purchase-orders")}>
            <BackIcon className="size-4 me-2" />
            {t("procurement.purchaseOrderDetail.backToList", "العودة لقائمة الأوامر")}
          </Button>
        </div>
      </div>
    );
  }

  const items = order.purchaseOrderItems || [];
  const invoices = order.purchaseInvoices || [];
  const canApprove = order.status === "DRAFT" || order.status === "PENDING";
  const canReceive = order.status === "ORDERED" || order.status === "PARTIALLY_RECEIVED";
  const canCancel = order.status !== "RECEIVED" && order.status !== "CANCELLED";

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5 print:p-0">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border/70 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/procurement/purchase-orders")}
            className="gap-1.5"
          >
            <BackIcon className="size-4" />
            {t("procurement.purchaseOrderDetail.backToList", "العودة للأوامر")}
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {order.orderNumber}
          </h1>
          <Badge variant={statusColors[order.status] || "outline"} className="ms-1 font-semibold">
            {statusLabels[order.status] ?? order.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              disabled={actionLoading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="size-4" />
              {t("procurement.purchaseOrderDetail.approveBtn", "موافقة على الأمر")}
            </Button>
          )}

          {canReceive && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setReceiveDialogOpen(true)}
              className="gap-1.5"
            >
              <PackageCheck className="size-4" />
              {t("procurement.purchaseOrderDetail.receiveBtn", "استلام الأصناف")}
            </Button>
          )}

          {canApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/procurement/purchase-orders/${order.id}/edit`)}
              className="gap-1.5"
            >
              <Pencil className="size-4" />
              {t("procurement.purchaseOrderDetail.editBtn", "تعديل")}
            </Button>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={actionLoading}
              className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <XCircle className="size-4" />
              {t("procurement.purchaseOrderDetail.cancelBtn", "إلغاء الأمر")}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="size-4" />
            {t("procurement.purchaseOrderDetail.printBtn", "طباعة")}
          </Button>
        </div>
      </div>

      {/* Meta Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Info */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" />
              {t("procurement.purchaseOrderDetail.supplierInfo", "بيانات المورد")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-bold text-base text-foreground">
              {order.supplier.name}
            </div>
            {order.supplier.phone && (
              <div className="text-xs text-muted-foreground font-mono">
                {order.supplier.phone}
              </div>
            )}
            {order.supplier.email && (
              <div className="text-xs text-muted-foreground">
                {order.supplier.email}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates Info */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              {t("procurement.purchaseOrderDetail.orderInfo", "التواريخ والمواعيد")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseOrderDetail.orderDate", "تاريخ الأمر")}:</span>
              <span className="font-semibold tabular-nums">{formatShortDate(order.orderDate, i18n.language)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseOrderDetail.expectedDelivery", "التسليم المتوقع")}:</span>
              <span className="font-semibold tabular-nums">
                {formatShortDate(order.expectedDelivery, i18n.language)}
              </span>
            </div>
            {order.receivedDate && (
              <div className="flex justify-between text-emerald-600">
                <span>{t("procurement.purchaseOrderDetail.receivedDate", "تاريخ الاستلام")}:</span>
                <span className="font-semibold tabular-nums">{formatShortDate(order.receivedDate, i18n.language)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Highlights */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-primary" />
              {t("procurement.purchaseOrderDetail.summaryTitle", "المبلغ الإجمالي")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-primary tabular-nums">
              {formatCurrency(order.totalAmount, { locale: i18n.language })}
            </div>
            <div className="text-xs text-muted-foreground">
              {items.length} أصناف في هذا الأمر
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card size="sm" className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <FileText className="size-4 text-primary" />
            {t("procurement.purchaseOrderDetail.itemsTitle", "الأصناف المطلوبة")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("procurement.purchaseOrderDetail.columnProduct", "الصنف")}</TableHead>
                  <TableHead className="text-center w-20">{t("procurement.purchaseOrderDetail.columnOrdered", "المطلوب")}</TableHead>
                  <TableHead className="text-center w-20">{t("procurement.purchaseOrderDetail.columnReceived", "المستلم")}</TableHead>
                  <TableHead className="text-center w-20">{t("procurement.purchaseOrderDetail.columnRemaining", "المتبقي")}</TableHead>
                  <TableHead className="text-center w-28">{t("procurement.purchaseOrderDetail.columnUnitPrice", "سعر الوحدة")}</TableHead>
                  <TableHead className="text-end w-28">{t("procurement.purchaseOrderDetail.columnTotal", "الإجمالي")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const rec = Number(item.receivedQuantity) || 0;
                  const rem = Math.max(0, qty - rec);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.productName || item.product?.name || "صنف"}</div>
                        {item.product?.sku && (
                          <div className="text-[11px] text-muted-foreground font-mono">{item.product.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold">{qty}</TableCell>
                      <TableCell className="text-center font-mono text-emerald-600 font-semibold">{rec}</TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">{rem}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">{formatCurrency(item.unitPrice, { locale: i18n.language })}</TableCell>
                      <TableCell className="text-end font-mono font-bold text-foreground tabular-nums">
                        {formatCurrency(item.totalPrice, { locale: i18n.language })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notes & Payment Terms */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {t("procurement.purchaseOrderForm.notesLabel", "ملاحظات وشروط الدفع")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="font-semibold block text-muted-foreground mb-1">
                {t("procurement.purchaseOrderForm.paymentTermsLabel", "شروط الدفع والتسليم")}:
              </span>
              <p className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-foreground">
                {order.paymentTerms || "لا توجد شروط خاصة"}
              </p>
            </div>
            <div>
              <span className="font-semibold block text-muted-foreground mb-1">
                {t("procurement.purchaseOrderForm.notesLabel", "ملاحظات إضافية")}:
              </span>
              <p className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-foreground">
                {order.notes || "لا توجد ملاحظات"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {t("procurement.purchaseOrderDetail.summaryTitle", "ملخص المبالغ")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseOrderDetail.subtotal", "المجموع قبل الخصم:")}</span>
              <span className="font-mono font-medium tabular-nums">{formatCurrency(order.subtotal, { locale: i18n.language })}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t("procurement.purchaseOrderDetail.additionalDiscount", "خصم إضافي:")}</span>
                <span className="font-mono font-medium tabular-nums">-{formatCurrency(order.discountAmount, { locale: i18n.language })}</span>
              </div>
            )}
            {Number(order.taxAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{t("procurement.purchaseOrderDetail.taxAmount", "إجمالي الضرائب:")}</span>
                <span className="font-mono font-medium tabular-nums">+{formatCurrency(order.taxAmount, { locale: i18n.language })}</span>
              </div>
            )}
            {Number(order.shippingCost) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("procurement.purchaseOrderDetail.shippingCost", "مصاريف الشحن:")}</span>
                <span className="font-mono font-medium tabular-nums">+{formatCurrency(order.shippingCost, { locale: i18n.language })}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
              <span>{t("procurement.purchaseOrderDetail.grandTotal", "الإجمالي النهائي:")}</span>
              <span className="font-mono text-primary tabular-nums">{formatCurrency(order.totalAmount, { locale: i18n.language })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Invoices Section */}
      <Card size="sm" className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              {t("procurement.purchaseOrderDetail.linkedInvoices", "الفواتير المرتبطة بأمر الشراء")}
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {invoices.length} فواتير
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          {invoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t("procurement.purchaseOrderDetail.noLinkedInvoices", "لا توجد فواتير مرتبطة بهذا الأمر بعد")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">رقم الفاتورة</TableHead>
                    <TableHead className="text-start">تاريخ الفاتورة</TableHead>
                    <TableHead className="text-start">تاريخ الاستحقاق</TableHead>
                    <TableHead className="text-center">المبلغ الإجمالي</TableHead>
                    <TableHead className="text-center">المدفوع</TableHead>
                    <TableHead className="text-center">المتبقي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-end">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="tabular-nums">{formatShortDate(inv.invoiceDate, i18n.language)}</TableCell>
                      <TableCell className="tabular-nums">{formatShortDate(inv.dueDate, i18n.language)}</TableCell>
                      <TableCell className="text-center font-mono font-medium tabular-nums">{formatCurrency(inv.totalAmount, { locale: i18n.language })}</TableCell>
                      <TableCell className="text-center font-mono text-emerald-600 tabular-nums">{formatCurrency(inv.paidAmount, { locale: i18n.language })}</TableCell>
                      <TableCell className="text-center font-mono text-destructive tabular-nums">{formatCurrency(inv.remainingAmount, { locale: i18n.language })}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={inv.status === "PAID" ? "default" : "secondary"}>
                          {invoiceStatusLabels[inv.status] ?? inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/procurement/purchase-invoices/${inv.id}`)}
                        >
                          عرض الفاتورة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Items Modal */}
      <ReceiveItemsDialog
        open={receiveDialogOpen}
        onClose={() => setReceiveDialogOpen(false)}
        order={order}
        onSuccess={() => fetchOrder()}
      />

      {/* Confirmation Dialog */}
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

export default PurchaseOrderDetail;
