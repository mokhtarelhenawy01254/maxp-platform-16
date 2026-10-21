import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, CreditCard, Search, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
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

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  supplier: {
    id: string;
    name: string;
  };
  _count: {
    items: number;
    payments: number;
  };
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "outline",
};

const PurchaseInvoices: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const statusLabels: Record<string, string> = {
    PENDING: t("procurement.purchaseInvoices.statusPending", "غير مدفوعة"),
    PAID: t("procurement.purchaseInvoices.statusPaid", "مدفوعة"),
    CANCELLED: t("procurement.purchaseInvoices.statusCancelled", "ملغاة"),
  };

  const filterOptions = [
    { value: "all", label: t("procurement.purchaseInvoices.all", "الكل") },
    { value: "PENDING", label: t("procurement.purchaseInvoices.statusPending", "غير مدفوعة") },
    { value: "PAID", label: t("procurement.purchaseInvoices.statusPaid", "مدفوعة") },
    { value: "CANCELLED", label: t("procurement.purchaseInvoices.statusCancelled", "ملغاة") },
    { value: "OVERDUE", label: t("procurement.purchaseInvoices.statusOverdue", "متأخرة") },
  ];

  const isInvoiceOverdue = (invoice: PurchaseInvoice) => {
    if (!invoice.dueDate) return false;
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        invoices: PurchaseInvoice[];
        pagination: { totalPages: number };
      }>("/procurement/purchase-invoices", {
        params: { page, limit: 20, search: searchTerm, status: statusFilter },
      });
      setInvoices(response.data.invoices);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError(err?.response?.data?.message || t("procurement.purchaseInvoices.fetchError", "تعذر تحميل فواتير الشراء"));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, t]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("procurement.purchaseInvoices.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            سجل فواتير التوريد ومتابعة المبالغ المستحقة والمسددة وتواريخ الاستحقاق
          </p>
        </div>
        <Button onClick={() => navigate("/procurement/purchase-invoices/new")} className="gap-2">
          <Plus className="size-4" /> {t("procurement.purchaseInvoices.createNew")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchInvoices} className="h-7 text-xs">
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
              placeholder={t("procurement.purchaseInvoices.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-8"
            />
          </div>
          <div className="min-w-[200px]">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("procurement.purchaseInvoices.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
              <TableHead className="text-start">{t("procurement.purchaseInvoices.columnInvoiceNumber")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseInvoices.columnSupplier")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseInvoices.columnInvoiceDate")}</TableHead>
              <TableHead className="text-start">{t("procurement.purchaseInvoices.columnDueDate")}</TableHead>
              <TableHead className="text-end">{t("procurement.purchaseInvoices.columnTotalAmount")}</TableHead>
              <TableHead className="text-end">{t("procurement.purchaseInvoices.columnPaidAmount")}</TableHead>
              <TableHead className="text-end">{t("procurement.purchaseInvoices.columnRemainingAmount")}</TableHead>
              <TableHead className="text-center">{t("procurement.purchaseInvoices.columnStatus")}</TableHead>
              <TableHead className="text-center">{t("procurement.purchaseInvoices.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter
                    ? "لا توجد فواتير مطابقة لمعايير البحث"
                    : t("procurement.purchaseInvoices.emptyState", "لا توجد فواتير مسجلة")}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs font-medium text-primary text-start">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-start">{invoice.supplier.name}</TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(invoice.invoiceDate, i18n.language)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(invoice.dueDate, i18n.language)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium">
                    {formatCurrency(invoice.totalAmount, { locale: i18n.language })}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium text-emerald-600">
                    {formatCurrency(invoice.paidAmount, { locale: i18n.language })}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium text-destructive">
                    {formatCurrency(invoice.remainingAmount, { locale: i18n.language })}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <Badge variant={statusColors[invoice.status] || "outline"}>
                        {statusLabels[invoice.status] ?? invoice.status}
                      </Badge>
                      {isInvoiceOverdue(invoice) && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {t("procurement.purchaseInvoices.statusOverdue", "متأخر")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/procurement/purchase-invoices/${invoice.id}`)
                        }
                        title={t("procurement.purchaseInvoices.viewDetails")}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(
                              `/procurement/supplier-payments/new?invoiceId=${invoice.id}`,
                            )
                          }
                          title={t("procurement.purchaseInvoices.recordPayment")}
                        >
                          <CreditCard className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
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
        ) : invoices.length === 0 ? (
          <ProcurementMobileState>
            {searchTerm || statusFilter
              ? "لا توجد فواتير مطابقة لمعايير البحث"
              : t("procurement.purchaseInvoices.emptyState")}
          </ProcurementMobileState>
        ) : (
          invoices.map((invoice) => (
            <ProcurementMobileCard
              key={invoice.id}
              eyebrow={invoice.invoiceNumber}
              title={invoice.supplier.name}
              subtitle={t("procurement.purchaseInvoices.mobileSubtitle", { payments: invoice._count.payments, items: invoice._count.items })}
              status={
                <div className="flex items-center gap-1">
                  <Badge variant={statusColors[invoice.status] || "outline"}>
                    {statusLabels[invoice.status] ?? invoice.status}
                  </Badge>
                  {isInvoiceOverdue(invoice) && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {t("procurement.purchaseInvoices.statusOverdue", "متأخر")}
                    </Badge>
                  )}
                </div>
              }
              fields={[
                {
                  label: t("procurement.purchaseInvoices.mobileInvoiceDate"),
                  value: formatShortDate(invoice.invoiceDate, i18n.language),
                },
                {
                  label: t("procurement.purchaseInvoices.mobileDueDate"),
                  value: formatShortDate(invoice.dueDate, i18n.language),
                },
                {
                  label: t("procurement.purchaseInvoices.mobileTotal"),
                  value: formatCurrency(invoice.totalAmount, { locale: i18n.language }),
                  emphasis: true,
                },
                {
                  label: t("procurement.purchaseInvoices.mobilePaid"),
                  value: formatCurrency(invoice.paidAmount, { locale: i18n.language }),
                },
                {
                  label: t("procurement.purchaseInvoices.mobileRemaining"),
                  value: formatCurrency(invoice.remainingAmount, { locale: i18n.language }),
                  emphasis: invoice.remainingAmount > 0,
                },
              ]}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate(`/procurement/purchase-invoices/${invoice.id}`)
                    }
                    title={t("procurement.purchaseInvoices.viewDetails")}
                  >
                    <Eye className="size-4" />
                  </Button>
                  {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate(
                          `/procurement/supplier-payments/new?invoiceId=${invoice.id}`,
                        )
                      }
                      title={t("procurement.purchaseInvoices.recordPayment")}
                    >
                      <CreditCard className="size-4" />
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

export default PurchaseInvoices;
