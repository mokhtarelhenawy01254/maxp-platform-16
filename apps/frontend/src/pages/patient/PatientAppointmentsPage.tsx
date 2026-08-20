import React, { useEffect, useState } from "react";

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  serviceName?: string;
  branch?: { id: string; name: string };
  doctor?: { id: string; title: string; name: string };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒", cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "┘à╪ñ┘â╪»", cls: "bg-green-100 text-green-700" },
  completed: { label: "┘à┘â╪¬┘à┘ä", cls: "bg-blue-100 text-blue-700" },
  cancelled: { label: "┘à┘ä╪║┘è", cls: "bg-red-100 text-red-700" },
  no_show: { label: "┘ä┘à ╪¬╪¡╪╢╪▒", cls: "bg-gray-100 text-gray-600" },
};

const PatientAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('patientToken');
        const res = await fetch('/api/v1/booking/patient-portal/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setAppointments(json.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchAppointments();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">┘à┘ê╪º╪╣┘è╪»┘è</h1>
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-center py-12 text-gray-400">┘ä╪º ╪¬┘ê╪¼╪» ┘à┘ê╪º╪╣┘è╪» ┘à╪│╪¼┘ä╪⌐</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(a => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{a.serviceName || "┘à┘ê╪╣╪»"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_LABEL[a.status]?.cls || "bg-gray-100"}`}>{STATUS_LABEL[a.status]?.label || a.status}</span>
                </div>
                <p className="text-sm text-gray-500">≡ƒôà {String(a.appointmentDate).split("T")[0]} ┬╖ ΓÅ░ {a.startTime}</p>
                <p className="text-sm text-gray-500">≡ƒÅÑ {a.branch?.name || "ΓÇö"} ┬╖ ≡ƒæ¿ΓÇìΓÜò∩╕Å {a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : "╪ú┘è ╪╖╪¿┘è╪¿"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppointmentsPage;
