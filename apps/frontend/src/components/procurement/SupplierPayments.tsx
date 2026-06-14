import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, Search } from "lucide-react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
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
      const response = await apiClient.get("/procurement/supplier-payments", {
        params: { page, limit: 20, search: searchTerm, paymentMethod: methodFilter },
      });
      setPayments(response.data.payments);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, [methodFilter, page, searchTerm]);

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

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("procurement.supplierPayments.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="min-w-[200px]">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
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
              <TableHead>{t("procurement.supplierPayments.columnPaymentNumber")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnSupplier")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnInvoiceNumber")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnPaymentDate")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnAmount")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnPaymentMethod")}</TableHead>
              <TableHead>{t("procurement.supplierPayments.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.paymentNumber}</TableCell>
                <TableCell>{payment.supplier.name}</TableCell>
                <TableCell>
                  {payment.purchaseInvoice?.invoiceNumber || t("procurement.supplierPayments.advancePayment")}
                </TableCell>
                <TableCell>
                  {new Date(payment.paymentDate).toLocaleDateString("ar-EG")}
                </TableCell>
                <TableCell>{Number(payment.amount).toFixed(2)} EGP</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {paymentMethodLabels[payment.paymentMethod]}
                  </Badge>
                </TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:hidden gap-2">
        {payments.length === 0 ? (
          <ProcurementMobileState>{t("procurement.supplierPayments.emptyState")}</ProcurementMobileState>
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
                  value: new Date(payment.paymentDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: t("procurement.supplierPayments.mobileAmount"),
                  value: `${Number(payment.amount).toFixed(2)} EGP`,
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
