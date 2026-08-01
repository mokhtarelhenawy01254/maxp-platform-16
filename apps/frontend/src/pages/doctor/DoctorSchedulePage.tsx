import React, { useEffect, useState } from "react";

interface ScheduleAppointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  serviceName?: string;
  patient?: { id: string; firstName: string; lastName: string; phone?: string };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد الانتظار", cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "مؤكد", cls: "bg-green-100 text-green-700" },
  completed: { label: "مكتمل", cls: "bg-blue-100 text-blue-700" },
  cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700" },
  no_show: { label: "لم يحضر", cls: "bg-gray-100 text-gray-600" },
};

const DoctorSchedulePage: React.FC = () => {
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('doctorToken');
        const res = await fetch(`/api/v1/booking/doctor-portal/schedule?weekStart=${weekStart.toISOString().split('T')[0]}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setAppointments(json.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchSchedule();
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayName = (d: Date) => ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][d.getDay()];

  const shift = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">الجدول الأسبوعي</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100">السابق</button>
          <span className="text-sm text-gray-500 font-medium px-2">{weekStart.toLocaleDateString('ar-EG')}</span>
          <button onClick={() => shift(1)} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100">التالي</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {days.map(day => {
            const dayKey = day.toISOString().split('T')[0];
            const items = appointments.filter(a => String(a.appointmentDate).split('T')[0] === dayKey);
            return (
              <div key={dayKey} className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-sm mb-1">{dayName(day)}</h3>
                <p className="text-xs text-gray-400 mb-3">{day.toLocaleDateString('ar-EG')}</p>
                {items.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-sm">لا مواعيد</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(a => (
                      <div key={a.id} className="border rounded-lg p-2.5 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-600" dir="ltr">{a.startTime}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_LABEL[a.status]?.cls || "bg-gray-100"}`}>{STATUS_LABEL[a.status]?.label || a.status}</span>
                        </div>
                        <p className="font-medium">{a.patient ? `${a.patient.firstName} ${a.patient.lastName || ""}` : "—"}</p>
                        <p className="text-xs text-gray-500">{a.serviceName || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorSchedulePage;
