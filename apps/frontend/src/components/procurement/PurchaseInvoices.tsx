import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, CreditCard, Search } from "lucide-react";
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
  PARTIALLY_PAID: "default",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

const statusLabels: Record<string, string> = {
  PENDING: "في انتظار الدفع",
  PARTIALLY_PAID: "مدفوع جزئياً",
  PAID: "مدفوع بالكامل",
  OVERDUE: "متأخر",
  CANCELLED: "ملغي",
};

const PurchaseInvoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await apiClient.get("/procurement/purchase-invoices", {
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
        <h1 className="text-2xl font-bold">فواتير الموردين</h1>
        <Button onClick={() => navigate("/procurement/purchase-invoices/new")}>
          <Plus className="size-4" /> إنشاء فاتورة جديدة
        </Button>
      </div>

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن فاتورة..."
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
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>تاريخ الفاتورة</TableHead>
              <TableHead>تاريخ الاستحقاق</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>المبلغ المدفوع</TableHead>
              <TableHead>المبلغ المتبقي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
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
                  <Badge variant={statusColors[invoice.status] || "outline"}>
                    {statusLabels[invoice.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate(`/procurement/purchase-invoices/${invoice.id}`)
                      }
                      title="عرض التفاصيل"
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
                        title="تسجيل دفعة"
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
          <ProcurementMobileState>لا توجد فواتير موردين</ProcurementMobileState>
        ) : (
          invoices.map((invoice) => (
            <ProcurementMobileCard
              key={invoice.id}
              eyebrow={invoice.invoiceNumber}
              title={invoice.supplier.name}
              subtitle={`دفعات: ${invoice._count.payments} | أصناف: ${invoice._count.items}`}
              status={
                <Badge variant={statusColors[invoice.status] || "outline"}>
                  {statusLabels[invoice.status] || invoice.status}
                </Badge>
              }
              fields={[
                {
                  label: "تاريخ الفاتورة",
                  value: new Date(invoice.invoiceDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: "تاريخ الاستحقاق",
                  value: invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("ar-EG")
                    : "-",
                },
                {
                  label: "الإجمالي",
                  value: `${Number(invoice.totalAmount).toFixed(2)} EGP`,
                  emphasis: true,
                },
                {
                  label: "المدفوع",
                  value: `${Number(invoice.paidAmount).toFixed(2)} EGP`,
                },
                {
                  label: "المتبقي",
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
                    title="عرض التفاصيل"
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
                      title="تسجيل دفعة"
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

export default PurchaseInvoices;
