import React, { useEffect, useState } from "react";

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: string;
  student: { firstName: string; lastName: string };
  subject: { name: string };
  enrollment: { remainingHours: number };
}

const TeacherSchedulePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('teacherToken');
        const res = await fetch('/api/v1/education/teacher-portal/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setSessions(json.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchSessions();
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;

  const upcoming = sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledAt) >= new Date());
  const past = sessions.filter(s => s.status !== 'SCHEDULED' || new Date(s.scheduledAt) < new Date());

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">جدول الحصص</h1>

      <h2 className="text-lg font-semibold mb-3 text-gray-800">الحصص القادمة</h2>
      {upcoming.length === 0 && <p className="text-gray-500 mb-6">لا توجد حصص قادمة</p>}
      <div className="space-y-3 mb-8">
        {upcoming.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.student.firstName} {s.student.lastName}</p>
              <p className="text-sm text-gray-500">{s.subject.name} — {s.plannedDuration} دقيقة</p>
              <p className="text-xs text-gray-400">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')} {new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">مجدولة</span>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3 text-gray-800">الحصص السابقة</h2>
      {past.length === 0 && <p className="text-gray-500">لا توجد حصص سابقة</p>}
      <div className="space-y-3">
        {past.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.student.firstName} {s.student.lastName}</p>
              <p className="text-sm text-gray-500">{s.subject.name} — {s.actualDuration || s.plannedDuration} دقيقة</p>
              <p className="text-xs text-gray-400">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              s.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
              s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {s.status === 'CONFIRMED' ? 'مؤكدة' : s.status === 'CANCELLED' ? 'ملغية' : 'مجدولة'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherSchedulePage;
