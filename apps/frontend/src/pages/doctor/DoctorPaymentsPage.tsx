import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  discount: number;
  amountPaid: number;
  status: string;
}

interface PaymentsData {
  invoices: Invoice[];
  totalRevenue: number;
  collected: number;
  outstanding: number;
}

const STATUS_LABEL: Record<string, string> = { UNPAID: "╪║┘è╪▒ ┘à╪│╪»╪»╪⌐", PARTIAL: "┘à╪│╪»╪» ╪¼╪▓╪ª┘è╪º┘ï", PAID: "┘à╪│╪»╪»╪⌐", REFUNDED: "┘à┘ä╪║╪º╪⌐" };

const DoctorPaymentsPage: React.FC = () => {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem('doctorToken');
        const res = await fetch('/api/v1/booking/doctor-portal/payments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>;

  const stats = [
    { label: '╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ┘è╪▒╪º╪»', value: data?.totalRevenue ?? 0 },
    { label: '╪º┘ä┘à╪¡╪╡┘æ┘ä', value: data?.collected ?? 0 },
    { label: '╪º┘ä┘à╪¬╪¿┘é┘è', value: data?.outstanding ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">╪º┘ä┘à╪»┘ü┘ê╪╣╪º╪¬</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold flex items-center gap-2"><Wallet size={20} className="text-blue-600" />{s.value} ╪¼.┘à</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-gray-50 text-gray-500 text-sm">{["╪▒┘é┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è", "╪º┘ä╪«╪╡┘à", "╪º┘ä┘à╪│╪»╪»", "╪º┘ä╪¡╪º┘ä╪⌐"].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
          <tbody>
            {(!data?.invoices || data.invoices.length === 0) ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">┘ä╪º ╪¬┘ê╪¼╪» ┘ü┘ê╪º╪¬┘è╪▒ ┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘à┘ê╪º╪╣┘è╪»┘â</td></tr>
            ) : data.invoices.map(inv => (
              <tr key={inv.id} className="border-b hover:bg-gray-50 text-sm">
                <td className="py-3 px-4 font-medium" dir="ltr">{inv.invoiceNumber}</td>
                <td className="py-3 px-4">{inv.total}</td>
                <td className="py-3 px-4 text-gray-500">{inv.discount}</td>
                <td className="py-3 px-4 text-green-600">{inv.amountPaid}</td>
                <td className="py-3 px-4">{STATUS_LABEL[inv.status] || inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorPaymentsPage;
