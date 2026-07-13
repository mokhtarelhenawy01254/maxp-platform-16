import React, { useEffect, useState } from "react";

interface Payment {
  id: string;
  periodFrom: string;
  periodTo: string;
  totalSessions: number;
  totalHours: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  paidAt: string | null;
}

const TeacherPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem('teacherToken');
        const res = await fetch('/api/v1/education/teacher-portal/payments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setPayments(json.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">المرتبات</h1>
      {payments.length === 0 && <p className="text-gray-500">لا توجد مدفوعات بعد</p>}
      <div className="space-y-3">
        {payments.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {new Date(p.periodFrom).toLocaleDateString('ar-EG')} — {new Date(p.periodTo).toLocaleDateString('ar-EG')}
                </p>
                <p className="text-lg font-bold mt-1">{p.netAmount} ج.م</p>
                <p className="text-sm text-gray-500">{p.totalSessions} حصة — {p.totalHours} ساعة</p>
                {p.deductions > 0 && <p className="text-xs text-red-500">خصم: {p.deductions} ج.م</p>}
              </div>
              <div className="text-left">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {p.status === 'PAID' ? 'مدفوع' : 'معلق'}
                </span>
                {p.paidAt && <p className="text-xs text-gray-400 mt-1">{new Date(p.paidAt).toLocaleDateString('ar-EG')}</p>}
              </div>
            </div>
            {p.deductions > 0 && (
              <div className="mt-2 pt-2 border-t text-sm text-gray-500">
                الإجمالي: {p.grossAmount} ج.م — الخصم: {p.deductions} ج.م — الصافي: {p.netAmount} ج.م
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherPaymentsPage;
