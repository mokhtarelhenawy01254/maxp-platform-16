import React, { useEffect, useState } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  discount: number;
  amountPaid: number;
  net: number;
  remaining: number;
  status: string;
  dueDate?: string;
  appointment?: { id: string; appointmentDate: string; serviceName?: string };
}

const STATUS_LABEL: Record<string, string> = { UNPAID: "غير مسددة", PARTIAL: "مسدد جزئياً", PAID: "مسددة", REFUNDED: "ملغاة" };

const PatientInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('patientToken');
        const res = await fetch('/api/v1/booking/patient-portal/invoices', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setInvoices(json.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchInvoices();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">فواتيري</h1>
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : invoices.length === 0 ? (
        <p className="text-center py-12 text-gray-400">لا توجد فواتير</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b bg-gray-50 text-gray-500 text-sm">{["رقم الفاتورة", "الخدمة", "الإجمالي", "المسدد", "المتبقي", "الحالة"].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="py-3 px-4 font-medium" dir="ltr">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4">{inv.appointment?.serviceName || "—"}</td>
                  <td className="py-3 px-4">{inv.total}</td>
                  <td className="py-3 px-4 text-green-600">{inv.amountPaid}</td>
                  <td className="py-3 px-4 font-medium text-red-600">{inv.remaining}</td>
                  <td className="py-3 px-4">{STATUS_LABEL[inv.status] || inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientInvoicesPage;
