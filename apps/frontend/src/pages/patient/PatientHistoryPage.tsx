import React, { useEffect, useState } from "react";

interface Visit {
  id: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  serviceName?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  prescription?: string;
  branch?: { id: string; name: string };
  doctor?: { id: string; title: string; name: string };
}

const PatientHistoryPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('patientToken');
        const res = await fetch('/api/v1/booking/patient-portal/medical-history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setVisits(json.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">تاريخي الطبي</h1>
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : visits.length === 0 ? (
        <p className="text-center py-12 text-gray-400">لا توجد سجلات طبية بعد</p>
      ) : (
        <div className="space-y-4">
          {visits.map(v => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold text-teal-600">📅 {String(v.appointmentDate).split("T")[0]}</span>
                <span className="text-sm text-gray-500">⏰ {v.startTime}</span>
                <span className="text-sm text-gray-500">🏥 {v.branch?.name || "—"}</span>
                <span className="text-sm text-gray-500">👨‍⚕️ {v.doctor ? `${v.doctor.title || ""} ${v.doctor.name || ""}` : "—"}</span>
              </div>
              {v.diagnosis && <p className="text-sm mb-1"><span className="font-medium">التشخيص:</span> {v.diagnosis}</p>}
              {v.treatmentPlan && <p className="text-sm mb-1"><span className="font-medium">خطة العلاج:</span> {v.treatmentPlan}</p>}
              {v.prescription && <p className="text-sm mb-1"><span className="font-medium">الوصفة:</span> {v.prescription}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientHistoryPage;
