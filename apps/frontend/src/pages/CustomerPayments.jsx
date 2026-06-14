import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuthSimple";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const CustomerPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const mockPayments = [
        { id: "pay-1", paymentNumber: "PAY-202507-001", amount: 7500, method: "WALLET_TRANSFER", status: "COMPLETED", paidAt: "2025-07-15T10:30:00Z", invoice: { invoiceNumber: "INV-202507-12345678" } },
        { id: "pay-2", paymentNumber: "PAY-202506-002", amount: 7500, method: "WALLET_TRANSFER", status: "COMPLETED", paidAt: "2025-06-15T14:20:00Z", invoice: { invoiceNumber: "INV-202506-87654321" } },
        { id: "pay-3", paymentNumber: "PAY-202508-003", amount: 7500, method: "WALLET_TRANSFER", status: "PENDING", paidAt: null, invoice: { invoiceNumber: "INV-202508-31819812" } },
      ];
      setPayments(mockPayments);
    } catch (error) {
      console.error("خطأ في جلب المدفوعات:", error);
      setError("خطأ في الاتصال بالخادم");
    } finally { setLoading(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
      case "FAILED": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "COMPLETED": return "مكتملة";
      case "PENDING": return "في الانتظار";
      case "FAILED": return "فشلت";
      default: return status;
    }
  };

  const getMethodText = (method) => {
    switch (method) {
      case "WALLET_TRANSFER": return "تحويل محفظة";
      case "BANK_TRANSFER": return "تحويل بنكي";
      case "CREDIT_CARD": return "بطاقة ائتمان";
      case "CASH": return "نقداً";
      default: return method;
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const totalAmount = payments.reduce((sum, p) => p.status === "COMPLETED" ? sum + p.amount : sum, 0);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3 min-h-screen bg-background transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">💰 مدفوعاتي</h1>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[
          { label: "إجمالي المدفوعات", value: payments.length, color: "text-blue-600 dark:text-blue-400" },
          { label: "إجمالي المبلغ المدفوع", value: formatCurrency(totalAmount), color: "text-green-600 dark:text-green-400" },
          { label: "مدفوعات مكتملة", value: payments.filter(p => p.status === "COMPLETED").length, color: "text-green-600 dark:text-green-400" },
          { label: "في الانتظار", value: payments.filter(p => p.status === "PENDING").length, color: "text-yellow-600 dark:text-yellow-400" },
        ].map((card, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground">
        <div className="p-4">
          <h2 className="text-base font-semibold mb-4">سجل المدفوعات</h2>
          {payments.length === 0 ? (
            <Alert><AlertDescription>لا توجد مدفوعات حالياً</AlertDescription></Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفع</TableHead>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-bold">{payment.paymentNumber}</TableCell>
                    <TableCell>{payment.invoice?.invoiceNumber || "غير محدد"}</TableCell>
                    <TableCell className="font-bold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getMethodText(payment.method)}</TableCell>
                    <TableCell>{payment.paidAt ? formatDate(payment.paidAt) : "غير محدد"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPayments;