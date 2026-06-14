import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuthSimple";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const CustomerInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const mockInvoices = [
        { id: "cme8q7mnr000kuf3wgftcsv3l", invoiceNumber: "INV-202506-31819812", issueDate: "2025-08-01", dueDate: "2025-08-15", totalAmount: 7500, currency: "EGP", status: "PENDING" },
        { id: "inv-2", invoiceNumber: "INV-202507-12345678", issueDate: "2025-07-01", dueDate: "2025-07-15", totalAmount: 7500, currency: "EGP", status: "PAID" },
        { id: "inv-3", invoiceNumber: "INV-202506-87654321", issueDate: "2025-06-01", dueDate: "2025-06-15", totalAmount: 7500, currency: "EGP", status: "OVERDUE" },
      ];
      setInvoices(mockInvoices);
    } catch (error) {
      console.error("خطأ في جلب الفواتير:", error);
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
      case "OVERDUE": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "PAID": return "مدفوعة";
      case "PENDING": return "في الانتظار";
      case "OVERDUE": return "متأخرة";
      case "DRAFT": return "مسودة";
      default: return status;
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const handlePayInvoice = (invoice) => window.open(`/payment/${invoice.id}`, "_blank");

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-3 min-h-screen bg-background transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">🧾 فواتيري</h1>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[
          { label: "إجمالي الفواتير", value: invoices.length, color: "text-blue-600 dark:text-blue-400" },
          { label: "فواتير مدفوعة", value: invoices.filter(i => i.status === "PAID").length, color: "text-green-600 dark:text-green-400" },
          { label: "في الانتظار", value: invoices.filter(i => i.status === "PENDING").length, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "فواتير متأخرة", value: invoices.filter(i => i.status === "OVERDUE").length, color: "text-red-600 dark:text-red-400" },
        ].map((card, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground">
        <div className="p-4">
          <h2 className="text-base font-semibold mb-4">قائمة الفواتير</h2>
          {invoices.length === 0 ? (
            <Alert><AlertDescription>لا توجد فواتير حالياً</AlertDescription></Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>تاريخ الإصدار</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-bold">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="font-bold text-green-600 dark:text-green-400">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">عرض</Button>
                        {(invoice.status === "PENDING" || invoice.status === "OVERDUE") && (
                          <Button size="sm" onClick={() => handlePayInvoice(invoice)}>دفع</Button>
                        )}
                        <Button variant="outline" size="sm">تحميل</Button>
                      </div>
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

export default CustomerInvoices;