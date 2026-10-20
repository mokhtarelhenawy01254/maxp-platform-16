import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, Search, AlertCircle } from "lucide-react";
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

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  supplier: {
    id: string;
    name: string;
  };
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
  };
}

const SupplierPayments: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const paymentMethodLabels: Record<string, string> = {
    CASH: t("procurement.supplierPayments.methodCash"),
    BANK_TRANSFER: t("procurement.supplierPayments.methodBankTransfer"),
    CHECK: t("procurement.supplierPayments.methodCheck"),
    CREDIT_CARD: t("procurement.supplierPayments.methodCreditCard"),
    OTHER: t("procurement.supplierPayments.methodOther"),
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        payments: SupplierPayment[];
        pagination: { totalPages: number };
      }>("/procurement/supplier-payments", {
        params: { page, limit: 20, search: searchTerm, paymentMethod: methodFilter },
      });
      setPayments(response.data.payments);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setError(err?.response?.data?.message || t("procurement.supplierPayments.fetchError", "تعذر تحميل سجل المدفوعات"));
    } finally {
      setLoading(false);
    }
  }, [methodFilter, page, searchTerm, t]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between mb-3">
        <h1 className="text-2xl font-bold">{t("procurement.supplierPayments.title")}</h1>
        <Button onClick={() => navigate("/procurement/supplier-payments/new")}>
          <Plus className="size-4" /> {t("procurement.supplierPayments.createNew")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPayments} className="h-7 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
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
                    <SelectItem key={key} value={key}>{label}</SelectItem>
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
                    {payment.purchaseInvoice?.invoiceNumber || t("procurement.supplierPayments.advancePayment")}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-start">
                    {formatShortDate(payment.paymentDate, i18n.language)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium text-emerald-600">
                    {formatCurrency(payment.amount, { locale: i18n.language })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {paymentMethodLabels[payment.paymentMethod]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate(`/procurement/supplier-payments/${payment.id}`)
                      }
                      title={t("procurement.supplierPayments.viewDetails")}
                    >
                      <Eye className="size-4" />
                    </Button>
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
              subtitle={payment.purchaseInvoice?.invoiceNumber || t("procurement.supplierPayments.advancePayment")}
              status={
                <Badge variant="outline">
                  {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                </Badge>
              }
              fields={[
                {
                  label: t("procurement.supplierPayments.mobilePaymentDate"),
                  value: formatShortDate(payment.paymentDate, i18n.language),
                },
                {
                  label: t("procurement.supplierPayments.mobileAmount"),
                  value: formatCurrency(payment.amount, { locale: i18n.language }),
                  emphasis: true,
                },
                {
                  label: t("procurement.supplierPayments.mobilePaymentMethod"),
                  value: paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod,
                },
              ]}
              actions={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    navigate(`/procurement/supplier-payments/${payment.id}`)
                  }
                  title={t("procurement.supplierPayments.viewDetails")}
                >
                  <Eye className="size-4" />
                </Button>
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

export default SupplierPayments;
