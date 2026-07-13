import React, { useEffect, useState } from "react";

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: string;
  subject: { name: string };
  teacher: { name: string };
  student: { firstName: string; lastName: string };
}

const ParentSessionsPage: React.FC = () => {
  const [children, setChildren] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [sessionsMap, setSessionsMap] = useState<Record<string, Session[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    fetch('/api/v1/education/parent-portal/children', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(async d => {
        if (!d.success) return;
        setChildren(d.data);
        const map: Record<string, Session[]> = {};
        for (const child of d.data) {
          const res = await fetch(`/api/v1/education/parent-portal/children/${child.id}/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const s = await res.json();
          if (s.success) map[child.id] = s.data;
        }
        setSessionsMap(map);
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الحصص</h1>
      {children.map(child => {
        const sessions = sessionsMap[child.id] || [];
        const upcoming = sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledAt) >= new Date());
        return (
          <div key={child.id} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">{child.firstName} {child.lastName}</h2>
            {upcoming.length === 0 && <p className="text-gray-400 text-sm mb-4">لا توجد حصص قادمة</p>}
            <div className="space-y-2">
              {upcoming.map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.subject?.name || '—'} — {s.teacher?.name}</p>
                      <p className="text-sm text-gray-500">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')} {new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} — {s.plannedDuration} دقيقة</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">مجدولة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParentSessionsPage;
