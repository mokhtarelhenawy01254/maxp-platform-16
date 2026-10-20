import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, CreditCard, Search } from "lucide-react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
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
      const response = await apiClient.get<{
        invoices: PurchaseInvoice[];
        pagination: { totalPages: number };
      }>("/procurement/purchase-invoices", {
        params: { page, limit: 20, search: searchTerm, status: statusFilter },
      });
      setInvoices(response.data.invoices);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="p-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between mb-3">
        <h1 className="text-2xl font-bold">{t("procurement.purchaseInvoices.title")}</h1>
        <Button onClick={() => navigate("/procurement/purchase-invoices/new")}>
          <Plus className="size-4" /> {t("procurement.purchaseInvoices.createNew")}
        </Button>
      </div>

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("procurement.purchaseInvoices.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
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
        </CardContent>
      </Card>

      <div className="hidden md:block rounded-xl border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("procurement.purchaseInvoices.columnInvoiceNumber")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnSupplier")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnInvoiceDate")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnDueDate")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnTotalAmount")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnPaidAmount")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnRemainingAmount")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnStatus")}</TableHead>
              <TableHead>{t("procurement.purchaseInvoices.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.supplier.name}</TableCell>
                <TableCell>
                  {new Date(invoice.invoiceDate).toLocaleDateString("ar-EG")}
                </TableCell>
                <TableCell>
                  {invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("ar-EG")
                    : "-"}
                </TableCell>
                <TableCell>{Number(invoice.totalAmount).toFixed(2)} EGP</TableCell>
                <TableCell>{Number(invoice.paidAmount).toFixed(2)} EGP</TableCell>
                <TableCell>{Number(invoice.remainingAmount).toFixed(2)} EGP</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
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
                <TableCell>
                  <div className="flex items-center gap-1">
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:hidden gap-2">
        {invoices.length === 0 ? (
          <ProcurementMobileState>{t("procurement.purchaseInvoices.emptyState")}</ProcurementMobileState>
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
                  value: new Date(invoice.invoiceDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: t("procurement.purchaseInvoices.mobileDueDate"),
                  value: invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("ar-EG")
                    : "-",
                },
                {
                  label: t("procurement.purchaseInvoices.mobileTotal"),
                  value: `${Number(invoice.totalAmount).toFixed(2)} EGP`,
                  emphasis: true,
                },
                {
                  label: t("procurement.purchaseInvoices.mobilePaid"),
                  value: `${Number(invoice.paidAmount).toFixed(2)} EGP`,
                },
                {
                  label: t("procurement.purchaseInvoices.mobileRemaining"),
                  value: `${Number(invoice.remainingAmount).toFixed(2)} EGP`,
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
