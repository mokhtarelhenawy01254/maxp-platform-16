import React, { useCallback, useEffect, useState } from "react";
import { Plus, Eye, Search } from "lucide-react";
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

const paymentMethodLabels: Record<string, string> = {
  CASH: "نقدي",
  BANK_TRANSFER: "تحويل بنكي",
  CHECK: "شيك",
  CREDIT_CARD: "بطاقة ائتمان",
  OTHER: "أخرى",
};

const SupplierPayments: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
        <h1 className="text-2xl font-bold">إدارة المدفوعات</h1>
        <Button onClick={() => navigate("/procurement/supplier-payments/new")}>
          <Plus className="size-4" /> تسجيل دفعة جديدة
        </Button>
      </div>

      <Card className="mb-3">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن دفعة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="min-w-[200px]">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
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
              <TableHead>رقم الدفعة</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.paymentNumber}</TableCell>
                <TableCell>{payment.supplier.name}</TableCell>
                <TableCell>
                  {payment.purchaseInvoice?.invoiceNumber || "دفعة مقدمة"}
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
                    title="عرض التفاصيل"
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
          <ProcurementMobileState>لا توجد مدفوعات</ProcurementMobileState>
        ) : (
          payments.map((payment) => (
            <ProcurementMobileCard
              key={payment.id}
              eyebrow={payment.paymentNumber}
              title={payment.supplier.name}
              subtitle={payment.purchaseInvoice?.invoiceNumber || "دفعة مقدمة"}
              status={
                <Badge variant="outline">
                  {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                </Badge>
              }
              fields={[
                {
                  label: "تاريخ الدفع",
                  value: new Date(payment.paymentDate).toLocaleDateString("ar-EG"),
                },
                {
                  label: "المبلغ",
                  value: `${Number(payment.amount).toFixed(2)} EGP`,
                  emphasis: true,
                },
                {
                  label: "طريقة الدفع",
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
                  title="عرض التفاصيل"
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

export default SupplierPayments;
