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
  pending: { label: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒", cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "┘à╪ñ┘â╪»", cls: "bg-green-100 text-green-700" },
  completed: { label: "┘à┘â╪¬┘à┘ä", cls: "bg-blue-100 text-blue-700" },
  cancelled: { label: "┘à┘ä╪║┘è", cls: "bg-red-100 text-red-700" },
  no_show: { label: "┘ä┘à ┘è╪¡╪╢╪▒", cls: "bg-gray-100 text-gray-600" },
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

  const dayName = (d: Date) => ["╪º┘ä╪ú╪¡╪»", "╪º┘ä╪Ñ╪½┘å┘è┘å", "╪º┘ä╪½┘ä╪º╪½╪º╪í", "╪º┘ä╪ú╪▒╪¿╪╣╪º╪í", "╪º┘ä╪«┘à┘è╪│", "╪º┘ä╪¼┘à╪╣╪⌐", "╪º┘ä╪│╪¿╪¬"][d.getDay()];

  const shift = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">╪º┘ä╪¼╪»┘ê┘ä ╪º┘ä╪ú╪│╪¿┘ê╪╣┘è</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100">╪º┘ä╪│╪º╪¿┘é</button>
          <span className="text-sm text-gray-500 font-medium px-2">{weekStart.toLocaleDateString('ar-EG')}</span>
          <button onClick={() => shift(1)} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100">╪º┘ä╪¬╪º┘ä┘è</button>
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
                  <p className="text-center py-6 text-gray-400 text-sm">┘ä╪º ┘à┘ê╪º╪╣┘è╪»</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(a => (
                      <div key={a.id} className="border rounded-lg p-2.5 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-600" dir="ltr">{a.startTime}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_LABEL[a.status]?.cls || "bg-gray-100"}`}>{STATUS_LABEL[a.status]?.label || a.status}</span>
                        </div>
                        <p className="font-medium">{a.patient ? `${a.patient.firstName} ${a.patient.lastName || ""}` : "ΓÇö"}</p>
                        <p className="text-xs text-gray-500">{a.serviceName || "ΓÇö"}</p>
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
