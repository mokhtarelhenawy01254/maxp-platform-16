import React, { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, Wallet, CheckCircle2 } from "lucide-react";

interface DashboardData {
  upcomingAppointments: number;
  completedAppointments: number;
  totalAppointments: number;
  unpaidInvoices: number;
  totalSpent: number;
}

const PatientDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const patient = JSON.parse(localStorage.getItem('patient') || '{}');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('patientToken');
        const res = await fetch('/api/v1/booking/patient-portal/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.message || '╪¡╪»╪½ ╪«╪╖╪ú');
      } catch { setError('┘ü╪┤┘ä ╪º┘ä╪º╪¬╪╡╪º┘ä'); }
      finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>;
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;

  const stats = [
    { label: '┘à┘ê╪º╪╣┘è╪» ┘é╪º╪»┘à╪⌐', value: data?.upcomingAppointments ?? 0, icon: CalendarDays, color: 'text-teal-600 bg-teal-100' },
    { label: '┘à┘ê╪º╪╣┘è╪» ┘à┘â╪¬┘à┘ä╪⌐', value: data?.completedAppointments ?? 0, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { label: '┘ü┘ê╪º╪¬┘è╪▒ ╪║┘è╪▒ ┘à╪│╪»╪»╪⌐', value: data?.unpaidInvoices ?? 0, icon: Wallet, color: 'text-amber-600 bg-amber-100' },
    { label: '╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ╪»┘ü╪╣╪¬┘ç', value: `${data?.totalSpent ?? 0} ╪¼.┘à`, icon: ClipboardList, color: 'text-blue-600 bg-blue-100' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">╪ú┘ç┘ä╪º┘ï╪î {patient.firstName || '╪╣╪▓┘è╪▓┘å╪º'} ≡ƒæï</h1>
      <p className="text-gray-500 mb-6">┘å╪¬┘à┘å┘ë ┘ä┘â ╪»┘ê╪º┘à ╪º┘ä╪╡╪¡╪⌐ ┘ê╪º┘ä╪╣╪º┘ü┘è╪⌐</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${s.color}`}><Icon size={24} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientDashboardPage;
