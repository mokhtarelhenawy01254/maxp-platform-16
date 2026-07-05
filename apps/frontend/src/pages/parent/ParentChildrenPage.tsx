import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  grade?: string;
}

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: string;
  subject: { name: string };
  teacher: { name: string };
  enrollment: { remainingHours: number; totalHours: number };
}

interface Enrollment {
  id: string;
  remainingHours: number;
  totalHours?: number;
  package: { id: string; name: string; hoursCount: number; price: number };
  teacher: { name: string } | null;
  subject: { name: string } | null;
}

const ParentChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    fetch('/api/v1/education/parent-portal/children', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => { if (d.success) setChildren(d.data); })
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">أبنائي</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map(child => (
          <Link key={child.id} to={`/parent/children/${child.id}`}
            className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all block">
            <h3 className="font-bold text-lg">{child.firstName} {child.lastName}</h3>
            {child.grade && <p className="text-sm text-gray-500">الصف: {child.grade}</p>}
            <p className="text-sm text-emerald-600 mt-2">عرض التفاصيل ←</p>
          </Link>
        ))}
        {children.length === 0 && <p className="text-gray-500 col-span-2">لا يوجد أبناء مسجلين</p>}
      </div>
    </div>
  );
};

const ParentChildDetailPage: React.FC = () => {
  const { studentId } = useParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'enrollments'>('sessions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parentToken');
    Promise.all([
      fetch(`/api/v1/education/parent-portal/children/${studentId}/sessions`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/education/parent-portal/children/${studentId}/enrollments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([sessRes, enrRes]) => {
      if (sessRes.success) setSessions(sessRes.data);
      if (enrRes.success) setEnrollments(enrRes.data);
    }).finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <Link to="/parent/children" className="text-sm text-emerald-600 hover:underline mb-4 inline-block">← العودة إلى الأبناء</Link>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('sessions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'sessions' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>الحصص</button>
        <button onClick={() => setActiveTab('enrollments')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'enrollments' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>التسجيلات</button>
      </div>

      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.length === 0 && <p className="text-gray-500">لا توجد حصص</p>}
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.subject?.name || '—'}</p>
                  <p className="text-sm text-gray-500">المدرس: {s.teacher?.name}</p>
                  <p className="text-xs text-gray-400">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')} {new Date(s.scheduledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} — {s.actualDuration || s.plannedDuration} دقيقة</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  s.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {s.status === 'CONFIRMED' ? 'مؤكدة' : s.status === 'CANCELLED' ? 'ملغية' : 'مجدولة'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="space-y-3">
          {enrollments.length === 0 && <p className="text-gray-500">لا توجد تسجيلات</p>}
          {enrollments.map(e => (
            <div key={e.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{e.package?.name || 'باقة'}</p>
                  <p className="text-sm text-gray-500">{e.subject?.name} — المدرس: {e.teacher?.name || 'لم يحدد'}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{e.remainingHours}/{e.package?.hoursCount || 0} س</p>
                  <p className="text-xs text-gray-400">{e.package?.price} ج.م</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { ParentChildrenPage, ParentChildDetailPage };
