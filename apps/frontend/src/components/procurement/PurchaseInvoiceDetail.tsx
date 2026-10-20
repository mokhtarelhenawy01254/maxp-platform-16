import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Pencil,
  Printer,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
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

interface InvoiceItem {
  id: string;
  productId?: string | null;
  productName: string;
  description?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  taxRate?: number | string;
  discountRate?: number | string;
  totalPrice: number | string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
}

interface SupplierPaymentRecord {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number | string;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
}

interface PurchaseInvoiceFull {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  status: string;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  shippingCost: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  notes?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrder?: {
    id: string;
    orderNumber: string;
  } | null;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  items?: InvoiceItem[];
  purchaseInvoiceItems?: InvoiceItem[];
  payments?: SupplierPaymentRecord[];
  supplierPayments?: SupplierPaymentRecord[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "outline",
};

export const PurchaseInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [invoice, setInvoice] = useState<PurchaseInvoiceFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    PENDING: t("procurement.purchaseInvoices.statusPending", "غير مدفوعة"),
    PAID: t("procurement.purchaseInvoices.statusPaid", "مدفوعة بالكامل"),
    CANCELLED: t("procurement.purchaseInvoices.statusCancelled", "ملغاة"),
  };

  const paymentMethodLabels: Record<string, string> = {
    CASH: t("procurement.supplierPayments.methodCash", "نقدي"),
    BANK_TRANSFER: t("procurement.supplierPayments.methodBankTransfer", "تحويل بنكي"),
    CHECK: t("procurement.supplierPayments.methodCheck", "شيك"),
    CREDIT_CARD: t("procurement.supplierPayments.methodCreditCard", "بطاقة ائتمان"),
    OTHER: t("procurement.supplierPayments.methodOther", "أخرى"),
  };

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<PurchaseInvoiceFull>(`/procurement/purchase-invoices/${id}`);
      setInvoice(response.data);
    } catch (err: unknown) {
      console.error("Error fetching purchase invoice:", err);
      const errResp = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        errResp.response?.data?.message ||
          t("procurement.purchaseInvoiceDetail.loadError", "فشل تحميل تفاصيل الفاتورة"),
      );
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">{t("common.loading", "جاري التحميل...")}</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error || t("procurement.purchaseInvoiceDetail.loadError", "الفاتورة غير موجودة")}</span>
        </div>
        <Button variant="outline" onClick={() => navigate("/procurement/purchase-invoices")}>
          <BackIcon className="size-4 me-2" />
          {t("procurement.purchaseInvoiceDetail.backToList", "العودة لقائمة الفواتير")}
        </Button>
      </div>
    );
  }

  const items = invoice.items || invoice.purchaseInvoiceItems || [];
  const payments = invoice.payments || invoice.supplierPayments || [];

  const isOverdue = (() => {
    if (!invoice.dueDate) return false;
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  })();

  const canPay = invoice.status !== "PAID" && invoice.status !== "CANCELLED";
  const canEdit = invoice.status !== "PAID";

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5 print:p-0">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border/70 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/procurement/purchase-invoices")}
            className="gap-1.5"
          >
            <BackIcon className="size-4" />
            {t("procurement.purchaseInvoiceDetail.backToList", "العودة للفواتير")}
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {invoice.invoiceNumber}
          </h1>
          <Badge variant={statusColors[invoice.status] || "outline"} className="ms-1 font-semibold">
            {statusLabels[invoice.status] ?? invoice.status}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="font-semibold">
              {t("procurement.purchaseInvoiceDetail.statusOverdue", "متأخر")}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPay && (
            <Button
              size="sm"
              variant="default"
              onClick={() =>
                navigate(`/procurement/supplier-payments/new?invoiceId=${invoice.id}`)
              }
              className="gap-1.5"
            >
              <CreditCard className="size-4" />
              {t("procurement.purchaseInvoiceDetail.recordPaymentBtn", "تسجيل دفعة")}
            </Button>
          )}

          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/procurement/purchase-invoices/${invoice.id}/edit`)}
              className="gap-1.5"
            >
              <Pencil className="size-4" />
              {t("procurement.purchaseInvoiceDetail.editBtn", "تعديل")}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="size-4" />
            {t("procurement.purchaseInvoiceDetail.printBtn", "طباعة")}
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
              {t("procurement.purchaseInvoiceDetail.supplierInfo", "بيانات المورد")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-bold text-base text-foreground">
              {invoice.supplier.name}
            </div>
            {invoice.supplier.phone && (
              <div className="text-xs text-muted-foreground font-mono">
                {invoice.supplier.phone}
              </div>
            )}
            {invoice.supplier.email && (
              <div className="text-xs text-muted-foreground">
                {invoice.supplier.email}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates & Linked PO */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              {t("procurement.purchaseInvoiceDetail.invoiceInfo", "التواريخ والأمر المرتبط")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseInvoiceDetail.invoiceDate", "تاريخ الفاتورة")}:</span>
              <span className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString("ar-EG")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseInvoiceDetail.dueDate", "تاريخ الاستحقاق")}:</span>
              <span className={`font-semibold ${isOverdue ? "text-destructive" : ""}`}>
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("ar-EG") : "-"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/50">
              <span className="text-muted-foreground">{t("procurement.purchaseInvoiceDetail.linkedOrder", "أمر الشراء")}:</span>
              {invoice.purchaseOrder ? (
                <button
                  type="button"
                  onClick={() => navigate(`/procurement/purchase-orders/${invoice.purchaseOrder?.id}`)}
                  className="font-mono font-semibold text-primary hover:underline flex items-center gap-1 text-xs"
                >
                  {invoice.purchaseOrder.orderNumber}
                  <ExternalLink className="size-3" />
                </button>
              ) : (
                <span className="text-muted-foreground font-normal">
                  {t("procurement.purchaseInvoiceDetail.directInvoice", "فاتورة مباشرة")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Balances */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-primary" />
              {t("procurement.purchaseInvoiceDetail.summaryTitle", "المبالغ والرصيد")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">الإجمالي:</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {Number(invoice.totalAmount).toFixed(2)} EGP
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-emerald-600">
              <span>المدفوع:</span>
              <span className="font-bold font-mono">{Number(invoice.paidAmount).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between items-baseline text-xs text-destructive pt-1 border-t border-border/50">
              <span className="font-semibold">المتبقي:</span>
              <span className="text-sm font-bold font-mono">{Number(invoice.remainingAmount).toFixed(2)} EGP</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card size="sm" className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <FileText className="size-4 text-primary" />
            {t("procurement.purchaseInvoiceDetail.itemsTitle", "بنود الفاتورة")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("procurement.purchaseInvoiceDetail.columnProduct", "الصنف")}</TableHead>
                  <TableHead className="text-center w-24">{t("procurement.purchaseInvoiceDetail.columnQuantity", "الكمية")}</TableHead>
                  <TableHead className="text-center w-28">{t("procurement.purchaseInvoiceDetail.columnUnitPrice", "سعر الوحدة")}</TableHead>
                  <TableHead className="text-center w-20">{t("procurement.purchaseInvoiceDetail.columnTax", "الضريبة")}</TableHead>
                  <TableHead className="text-center w-20">{t("procurement.purchaseInvoiceDetail.columnDiscount", "الخصم")}</TableHead>
                  <TableHead className="text-end w-28">{t("procurement.purchaseInvoiceDetail.columnTotal", "الإجمالي")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.productName || item.product?.name || "صنف"}</div>
                      {item.product?.sku && (
                        <div className="text-[11px] text-muted-foreground font-mono">{item.product.sku}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-center font-mono">{Number(item.unitPrice).toFixed(2)} EGP</TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {Number(item.taxRate || 0)}%
                    </TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {Number(item.discountRate || 0)}%
                    </TableCell>
                    <TableCell className="text-end font-mono font-bold text-foreground">
                      {Number(item.totalPrice).toFixed(2)} EGP
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notes */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {t("procurement.purchaseOrderForm.notesLabel", "ملاحظات الفاتورة")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <p className="p-3 rounded-lg bg-muted/40 border border-border/50 text-foreground min-h-[80px]">
              {invoice.notes || "لا توجد ملاحظات مسجلة على هذه الفاتورة"}
            </p>
          </CardContent>
        </Card>

        {/* Financial Breakdown */}
        <Card size="sm" className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {t("procurement.purchaseInvoiceDetail.summaryTitle", "ملخص المبالغ والمدفوعات")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("procurement.purchaseInvoiceDetail.subtotal", "المجموع:")}</span>
              <span className="font-mono font-medium">{Number(invoice.subtotal).toFixed(2)} EGP</span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t("procurement.purchaseInvoiceDetail.discountAmount", "الخصم:")}</span>
                <span className="font-mono font-medium">-{Number(invoice.discountAmount).toFixed(2)} EGP</span>
              </div>
            )}
            {Number(invoice.taxAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{t("procurement.purchaseInvoiceDetail.taxAmount", "الضرائب:")}</span>
                <span className="font-mono font-medium">+{Number(invoice.taxAmount).toFixed(2)} EGP</span>
              </div>
            )}
            {Number(invoice.shippingCost) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("procurement.purchaseInvoiceDetail.shippingCost", "الشحن:")}</span>
                <span className="font-mono font-medium">+{Number(invoice.shippingCost).toFixed(2)} EGP</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border font-bold">
              <span>{t("procurement.purchaseInvoiceDetail.totalAmount", "المبلغ الإجمالي:")}</span>
              <span className="font-mono text-primary">{Number(invoice.totalAmount).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>{t("procurement.purchaseInvoiceDetail.paidAmount", "المدفوع:")}</span>
              <span className="font-mono">{Number(invoice.paidAmount).toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-destructive font-bold text-base">
              <span>{t("procurement.purchaseInvoiceDetail.remainingAmount", "المتبقي:")}</span>
              <span className="font-mono">{Number(invoice.remainingAmount).toFixed(2)} EGP</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Payments Table */}
      <Card size="sm" className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CreditCard className="size-4 text-primary" />
              {t("procurement.purchaseInvoiceDetail.paymentsTitle", "سجل المدفوعات المسجلة")}
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {payments.length} دفعات
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t("procurement.purchaseInvoiceDetail.noPayments", "لا توجد دفعات مسجلة لهذه الفاتورة بعد")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("procurement.purchaseInvoiceDetail.columnPaymentNumber", "رقم الدفعة")}</TableHead>
                    <TableHead className="text-start">{t("procurement.purchaseInvoiceDetail.columnPaymentDate", "تاريخ الدفع")}</TableHead>
                    <TableHead className="text-center">{t("procurement.purchaseInvoiceDetail.columnAmount", "المبلغ")}</TableHead>
                    <TableHead className="text-center">{t("procurement.purchaseInvoiceDetail.columnMethod", "طريقة الدفع")}</TableHead>
                    <TableHead className="text-center">{t("procurement.purchaseInvoiceDetail.columnReference", "المرجع")}</TableHead>
                    <TableHead className="text-start">{t("procurement.purchaseInvoiceDetail.columnNotes", "ملاحظات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((pmt) => (
                    <TableRow key={pmt.id}>
                      <TableCell className="font-mono font-semibold">{pmt.paymentNumber}</TableCell>
                      <TableCell>{new Date(pmt.paymentDate).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-600">
                        {Number(pmt.amount).toFixed(2)} EGP
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {paymentMethodLabels[pmt.paymentMethod] || pmt.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {pmt.referenceNumber || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {pmt.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseInvoiceDetail;
