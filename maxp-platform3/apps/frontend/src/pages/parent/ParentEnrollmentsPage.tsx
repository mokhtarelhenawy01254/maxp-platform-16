import React, { useEffect, useState } from "react";

interface Enrollment {
  id: string;
  remainingHours: number;
  package: { id: string; name: string; hoursCount: number; price: number };
  teacher: { name: string } | null;
  subject: { name: string } | null;
  student: { firstName: string; lastName: string };
}

const ParentEnrollmentsPage: React.FC = () => {
  const [children, setChildren] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [enrollmentsMap, setEnrollmentsMap] = useState<Record<string, Enrollment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    fetch('/api/v1/education/parent-portal/children', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(async d => {
        if (!d.success) return;
        setChildren(d.data);
        const map: Record<string, Enrollment[]> = {};
        for (const child of d.data) {
          const res = await fetch(`/api/v1/education/parent-portal/children/${child.id}/enrollments`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const s = await res.json();
          if (s.success) map[child.id] = s.data;
        }
        setEnrollmentsMap(map);
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">التسجيلات</h1>
      {children.map(child => {
        const enrollments = enrollmentsMap[child.id] || [];
        return (
          <div key={child.id} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">{child.firstName} {child.lastName}</h2>
            {enrollments.length === 0 && <p className="text-gray-400 text-sm">لا توجد تسجيلات</p>}
            <div className="space-y-2">
              {enrollments.map(e => (
                <div key={e.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{e.package?.name || 'باقة'}</p>
                      <p className="text-sm text-gray-500">{e.subject?.name || '—'} — المدرس: {e.teacher?.name || 'لم يحدد'}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{e.remainingHours}/{e.package?.hoursCount || 0} س</p>
                      <p className="text-xs text-gray-400">{e.package?.price} ج.م</p>
                    </div>
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

export default ParentEnrollmentsPage;
