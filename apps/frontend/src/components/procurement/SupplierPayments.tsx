import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { formatCurrency } from "../../utils/currency";
import { formatShortDate } from "../../utils/dateFormat";
import {
  ProcurementMobileCard,
  ProcurementMobileState,
} from "./ProcurementMobileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DateInput } from '../ui/DateInput';

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  bankName?: string;
  checkNumber?: string;
  checkDate?: string;
  notes?: string;
  supplier: {
    id: string;
    name: string;
    phone?: string;
  };
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
  };
}

interface EditFormData {
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  bankName: string;
  checkNumber: string;
  checkDate: string;
  notes: string;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "نقدي", icon: Banknote },
  { value: "BANK_TRANSFER", label: "تحويل بنكي", icon: Building2 },
  { value: "INSTAPAY", label: "إنستاباي / محفظة إلكترونية", icon: CreditCard },
  { value: "CHECK", label: "شيك مصرفي", icon: FileText },
  { value: "OTHER", label: "أخرى", icon: Receipt },
];

const SupplierPayments: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit Modal State
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    amount: "",
    paymentDate: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    bankName: "",
    checkNumber: "",
    checkDate: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingPayment, setDeletingPayment] = useState<SupplierPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const paymentMethodLabels: Record<string, string> = {
    CASH: t("procurement.supplierPayments.methodCash", "نقدي"),
    BANK_TRANSFER: t("procurement.supplierPayments.methodBankTransfer", "تحويل بنكي"),
    INSTAPAY: "إنستاباي / محفظة",
    CHECK: t("procurement.supplierPayments.methodCheck", "شيك"),
    CREDIT_CARD: t("procurement.supplierPayments.methodCreditCard", "بطاقة ائتمان"),
    OTHER: t("procurement.supplierPayments.methodOther", "أخرى"),
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        payments: SupplierPayment[];
        pagination: { totalPages: number };
      }>("/procurement/supplier-payments", {
        params: {
          page,
          limit: 20,
          search: searchTerm,
          paymentMethod: methodFilter === "all" ? undefined : methodFilter,
        },
      });
      setPayments(response.data.payments);
      setTotalPages(response.data.pagination.totalPages || 1);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setError(
        err?.response?.data?.message ||
          t("procurement.supplierPayments.fetchError", "تعذر تحميل سجل المدفوعات")
      );
    } finally {
      setLoading(false);
    }
  }, [methodFilter, page, searchTerm, t]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Open Edit Modal
  const handleOpenEdit = (payment: SupplierPayment) => {
    setEditingPayment(payment);
    const dateStr = payment.paymentDate
      ? new Date(payment.paymentDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const checkDateStr = payment.checkDate
      ? new Date(payment.checkDate).toISOString().split("T")[0]
      : "";

    setEditForm({
      amount: String(payment.amount ?? ""),
      paymentDate: dateStr,
      paymentMethod: payment.paymentMethod || "CASH",
      referenceNumber: payment.referenceNumber || "",
      bankName: payment.bankName || "",
      checkNumber: payment.checkNumber || "",
      checkDate: checkDateStr,
      notes: payment.notes || "",
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const parsedAmount = parseFloat(editForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(t("procurement.supplierPayments.invalidAmount", "يرجى إدخال مبلغ صحيح أكبر من الصفر"));
      return;
    }

    try {
      setSavingEdit(true);
      await apiClient.put(`/procurement/supplier-payments/${editingPayment.id}`, {
        amount: parsedAmount,
        paymentDate: editForm.paymentDate,
        paymentMethod: editForm.paymentMethod,
        referenceNumber: editForm.referenceNumber.trim() || undefined,
        bankName: editForm.bankName.trim() || undefined,
        checkNumber: editForm.checkNumber.trim() || undefined,
        checkDate: editForm.checkDate || undefined,
        notes: editForm.notes.trim() || undefined,
      });

      toast.success(
        t("procurement.supplierPayments.editPaymentSuccess", "تم تحديث بيانات الدفعة بنجاح")
      );
      setEditingPayment(null);
      await fetchPayments();
    } catch (err: any) {
      console.error("Error updating payment:", err);
      toast.error(
        err?.response?.data?.message ||
          t("procurement.supplierPayments.editPaymentError", "تعذر تحديث بيانات الدفعة")
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Confirm
  const handleOpenDelete = (payment: SupplierPayment) => {
    setDeletingPayment(payment);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingPayment) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/procurement/supplier-payments/${deletingPayment.id}`);
      toast.success(
        t("procurement.supplierPayments.deletePaymentSuccess", "تم حذف الدفعة بنجاح وتحديث الحسابات")
      );
      setDeletingPayment(null);
      await fetchPayments();
    } catch (err: any) {
      console.error("Error deleting payment:", err);
      toast.error(
        err?.response?.data?.message ||
          t("procurement.supplierPayments.deletePaymentError", "تعذر حذف الدفعة")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("procurement.supplierPayments.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            سندات الصرف النقدية والتحويلات البنكية للموردين ومتابعة السدادات المالية
          </p>
        </div>
        <Button onClick={() => navigate("/procurement/supplier-payments/new")} className="gap-2">
          <Plus className="size-4" /> {t("procurement.supplierPayments.createNew")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPayments} className="h-7 text-xs">
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
              placeholder={t("procurement.supplierPayments.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-8"
            />
          </div>
          <div className="min-w-[200px]">
            <Select value={methodFilter} onValueChange={(val) => setMethodFilter(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("procurement.supplierPayments.filterPaymentMethod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("procurement.supplierPayments.all")}</SelectItem>
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("procurement.supplierPayments.columnPaymentNumber")}</TableHead>
              <TableHead className="text-start">{t("procurement.supplierPayments.columnSupplier")}</TableHead>
              <TableHead className="text-start">{t("procurement.supplierPayments.columnInvoiceNumber")}</TableHead>
              <TableHead className="text-start">{t("procurement.supplierPayments.columnPaymentDate")}</TableHead>
              <TableHead className="text-end">{t("procurement.supplierPayments.columnAmount")}</TableHead>
              <TableHead className="text-center">{t("procurement.supplierPayments.columnPaymentMethod")}</TableHead>
              <TableHead className="text-center">{t("procurement.supplierPayments.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm || methodFilter
                    ? "لا توجد مدفوعات مطابقة لمعايير البحث"
                    : t("procurement.supplierPayments.emptyState", "لا توجد مدفوعات مسجلة")}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs font-medium text-primary text-start">
                    {payment.paymentNumber}
                  </TableCell>
                  <TableCell className="text-start">{payment.supplier.name}</TableCell>
                  <TableCell className="font-mono text-xs text-start">
                    {payment.purchaseInvoice?.invoiceNumber ||
                      t("procurement.supplierPayments.advancePayment", "دفعة مقدمة")}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(payment.paymentDate, i18n.language)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium text-emerald-600">
                    {formatCurrency(payment.amount, { locale: i18n.language })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View Voucher Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/procurement/supplier-payments/${payment.id}`)}
                        title={t("procurement.supplierPayments.viewDetails", "عرض السند")}
                        aria-label={t("procurement.supplierPayments.viewDetails", "عرض السند")}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {/* Edit Payment Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(payment)}
                        title={t("procurement.supplierPayments.editPayment", "تعديل الدفعة")}
                        aria-label={t("procurement.supplierPayments.editPayment", "تعديل الدفعة")}
                        className="hover:text-primary"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {/* Delete Payment Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDelete(payment)}
                        title={t("procurement.supplierPayments.deletePayment", "حذف الدفعة")}
                        aria-label={t("procurement.supplierPayments.deletePayment", "حذف الدفعة")}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="grid md:hidden gap-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : payments.length === 0 ? (
          <ProcurementMobileState>
            {searchTerm || methodFilter
              ? "لا توجد مدفوعات مطابقة لمعايير البحث"
              : t("procurement.supplierPayments.emptyState")}
          </ProcurementMobileState>
        ) : (
          payments.map((payment) => (
            <ProcurementMobileCard
              key={payment.id}
              eyebrow={payment.paymentNumber}
              title={payment.supplier.name}
              subtitle={
                payment.purchaseInvoice?.invoiceNumber ||
                t("procurement.supplierPayments.advancePayment", "دفعة مقدمة")
              }
              status={
                <Badge variant="outline">
                  {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                </Badge>
              }
              fields={[
                {
                  label: t("procurement.supplierPayments.mobilePaymentDate", "تاريخ الدفع"),
                  value: formatShortDate(payment.paymentDate, i18n.language),
                },
                {
                  label: t("procurement.supplierPayments.mobileAmount", "المبلغ"),
                  value: formatCurrency(payment.amount, { locale: i18n.language }),
                  emphasis: true,
                },
                {
                  label: t("procurement.supplierPayments.mobilePaymentMethod", "طريقة الدفع"),
                  value: paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod,
                },
              ]}
              actions={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/procurement/supplier-payments/${payment.id}`)}
                    title={t("procurement.supplierPayments.viewDetails", "عرض السند")}
                    aria-label={t("procurement.supplierPayments.viewDetails", "عرض السند")}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(payment)}
                    title={t("procurement.supplierPayments.editPayment", "تعديل الدفعة")}
                    aria-label={t("procurement.supplierPayments.editPayment", "تعديل الدفعة")}
                    className="hover:text-primary"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDelete(payment)}
                    title={t("procurement.supplierPayments.deletePayment", "حذف الدفعة")}
                    aria-label={t("procurement.supplierPayments.deletePayment", "حذف الدفعة")}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              }
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("common.previous", "السابق")}
          </Button>
          <span className="text-sm px-3">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("common.next", "التالي")}
          </Button>
        </div>
      </div>

      {/* ========================================== */}
      {/* EDIT PAYMENT MODAL                         */}
      {/* ========================================== */}
      <Dialog open={Boolean(editingPayment)} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Pencil className="size-5 text-primary" />
              <span>{t("procurement.supplierPayments.editPaymentTitle", "تعديل بيانات سند الصرف")}</span>
              {editingPayment && (
                <Badge variant="outline" className="font-mono text-xs ms-auto">
                  {editingPayment.paymentNumber}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("procurement.supplierPayments.editPaymentSubtitle", "تعديل تفاصيل السداد وطريقة الصرف والبيانات المالية")}
            </DialogDescription>
          </DialogHeader>

          {editingPayment && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              {/* Payment Summary Info */}
              <div className="p-3 rounded-lg bg-muted/40 border text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block">المورد:</span>
                  <span className="font-bold text-foreground">{editingPayment.supplier.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">الفاتورة المرتبطة:</span>
                  <span className="font-mono font-medium text-foreground">
                    {editingPayment.purchaseInvoice?.invoiceNumber || "دفعة مقدمة غير مرتبطة بفاتورة"}
                  </span>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount" className="text-xs font-semibold">
                    المبلغ المدفوع (ج.م) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-xs font-semibold">
                    تاريخ السداد <span className="text-destructive">*</span>
                  </Label>
                  <DateInput
                    id="edit-date"
                    
                    required
                    value={editForm.paymentDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-method" className="text-xs font-semibold">
                  طريقة الدفع <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={editForm.paymentMethod}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, paymentMethod: val }))}
                >
                  <SelectTrigger id="edit-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-muted-foreground" />
                            <span>{method.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Bank / Transfer / Check Fields */}
              {(editForm.paymentMethod === "BANK_TRANSFER" ||
                editForm.paymentMethod === "INSTAPAY" ||
                editForm.paymentMethod === "CHECK") && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-bank" className="text-xs font-semibold">
                    اسم البنك / المحفظة
                  </Label>
                  <Input
                    id="edit-bank"
                    placeholder="مثال: البنك الأهلي المصري، CIB، فودافون كاش..."
                    value={editForm.bankName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
              )}

              {editForm.paymentMethod === "CHECK" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-check-number" className="text-xs font-semibold">
                      رقم الشيك
                    </Label>
                    <Input
                      id="edit-check-number"
                      placeholder="رقم الشيك المصرفي"
                      value={editForm.checkNumber}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, checkNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-check-date" className="text-xs font-semibold">
                      تاريخ استحقاق الشيك
                    </Label>
                    <DateInput
                      id="edit-check-date"
                      
                      value={editForm.checkDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, checkDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Reference Number */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-ref" className="text-xs font-semibold">
                  رقم المرجع / الحوالة / الإيصال
                </Label>
                <Input
                  id="edit-ref"
                  placeholder="رقم العملية البنكية أو إيصال الصرف"
                  value={editForm.referenceNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs font-semibold">
                  ملاحظات
                </Label>
                <Textarea
                  id="edit-notes"
                  rows={2}
                  placeholder="أي ملاحظات إضافية حول السداد..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPayment(null)}
                  disabled={savingEdit}
                >
                  {t("procurement.supplierPayments.cancel", "إلغاء")}
                </Button>
                <Button type="submit" disabled={savingEdit} className="gap-2">
                  {savingEdit && <Loader2 className="size-4 animate-spin" />}
                  {savingEdit
                    ? t("procurement.supplierPayments.saving", "جاري الحفظ...")
                    : t("procurement.supplierPayments.saveChanges", "حفظ التعديلات")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* DELETE CONFIRMATION DIALOG                 */}
      {/* ========================================== */}
      <Dialog open={Boolean(deletingPayment)} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg font-bold">
              <AlertCircle className="size-5" />
              <span>{t("procurement.supplierPayments.confirmDeletePaymentTitle", "تأكيد حذف الدفعة")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              سيتم التراجع عن هذه المعاملة المالية وإعادة تسوية الحسابات.
            </DialogDescription>
          </DialogHeader>

          {deletingPayment && (
            <div className="space-y-3 py-2 text-sm">
              <p className="leading-relaxed">
                هل أنت متأكد من حذف الدفعة رقم{" "}
                <strong className="font-mono text-primary font-bold">{deletingPayment.paymentNumber}</strong>{" "}
                بقيمة{" "}
                <strong className="text-destructive font-bold">
                  {formatCurrency(deletingPayment.amount)}
                </strong>{" "}
                الخاصة بالمورد{" "}
                <strong className="font-bold">{deletingPayment.supplier.name}</strong> نهائياً؟
              </p>
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive space-y-1">
                <p className="font-semibold">تأثير الحذف:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>سيتم زيادة مديونية المورد (إرجاع المبلغ لرصيده).</li>
                  {deletingPayment.purchaseInvoice && (
                    <li>
                      سيتم إعادة فتح المبلغ المتبقي على الفاتورة رقم{" "}
                      <span className="font-mono">{deletingPayment.purchaseInvoice.invoiceNumber}</span>.
                    </li>
                  )}
                  <li>سيتم حذف القيد المالي المرتبط بالدفعة في الخزينة.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingPayment(null)}
              disabled={deleting}
            >
              {t("procurement.supplierPayments.cancel", "إلغاء")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {deleting ? "جاري الحذف..." : t("procurement.supplierPayments.deletePayment", "حذف نهائياً")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPayments;
