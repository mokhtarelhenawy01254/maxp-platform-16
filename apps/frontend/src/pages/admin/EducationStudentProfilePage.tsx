import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Phone, GraduationCap, User } from "lucide-react";

interface StudentData {
  id: string; firstName: string; lastName?: string; phone?: string; grade?: string; gender?: string; notes?: string; isActive: boolean;
  customer?: { id: string; firstName: string; lastName?: string; phone?: string };
  enrollments?: { id: string; remainingHours: number; totalHours: number; package: { name: string; subject?: { name: string } }; status: string }[];
}
interface Session { id: string; scheduledAt: string; status: string; subject: { name: string }; teacher?: { name: string }; plannedDuration: number; actualDuration?: number }

const EducationStudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'sessions'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const [sRes, sessRes] = await Promise.all([
          fetch(`/api/v1/education/students/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/v1/education/sessions?studentId=${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [sJson, sessJson] = await Promise.all([sRes.json(), sessRes.json()]);
        if (sJson.success) setStudent(sJson.data);
        if (sessJson.success) setSessions(sessJson.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;
  if (!student) return <div className="text-center py-12 text-red-600">الطالب غير موجود</div>;

  const activeEnrollments = student.enrollments?.filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED') || [];
  const confirmedSessions = sessions.filter(s => s.status === 'CONFIRMED');
  const upcomingSessions = sessions.filter(s => s.status === 'SCHEDULED');

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <Link to="/admin/education/students" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowRight size={16} /> العودة إلى الطلاب
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{student.firstName} {student.lastName || ""}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {student.phone && <span className="flex items-center gap-1"><Phone size={14} />{student.phone}</span>}
              {student.grade && <span className="flex items-center gap-1"><GraduationCap size={14} />{student.grade}</span>}
              {student.gender && <span>{student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {student.isActive ? 'نشط' : 'غير نشط'}
          </span>
        </div>
        {student.customer && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-1"><User size={14} />ولي الأمر</p>
            <p className="text-sm text-gray-600">{student.customer.firstName} {student.customer.lastName || ""} — {student.customer.phone}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">تسجيلات نشطة</p><p className="text-xl font-bold">{activeEnrollments.length}</p></div><div className="p-2 bg-blue-100 rounded-lg"><BookOpen size={20} className="text-blue-600" /></div></div></div>
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">حصص مؤكدة</p><p className="text-xl font-bold">{confirmedSessions.length}</p></div><div className="p-2 bg-green-100 rounded-lg"><Clock size={20} className="text-green-600" /></div></div></div>
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">حصص قادمة</p><p className="text-xl font-bold">{upcomingSessions.length}</p></div><div className="p-2 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div></div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button onClick={() => setActiveTab('info')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>التسجيلات والباقات</button>
        <button onClick={() => setActiveTab('sessions')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>الحصص</button>
      </div>

      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">التسجيلات النشطة</h2>
          {activeEnrollments.length === 0 ? <p className="text-sm text-gray-400">لا توجد تسجيلات نشطة</p> : (
            <div className="space-y-3">{activeEnrollments.map(e => (
              <div key={e.id} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold">{e.package?.name || "باقة"}</p><p className="text-sm text-gray-500">{e.package?.subject?.name || ""}</p></div>
                  <div className="text-left"><p className="text-sm font-bold">{e.remainingHours}/{e.totalHours} س</p><div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${(e.remainingHours / e.totalHours) * 100}%` }} /></div></div>
                </div>
              </div>
            ))}</div>
          )}
          {student.notes && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-semibold text-gray-700 mb-1">ملاحظات</p><p className="text-sm text-gray-600">{student.notes}</p></div>}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">جميع الحصص</h2>
          {sessions.length === 0 ? <p className="text-sm text-gray-400">لا توجد حصص</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-right py-2">التاريخ</th><th className="text-right py-2">المادة</th><th className="text-right py-2">المدرس</th><th className="text-right py-2">المدة</th><th className="text-right py-2">الحالة</th></tr></thead>
                <tbody>{sessions.map(s => <tr key={s.id} className="border-b last:border-0"><td className="py-2">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')}</td><td className="py-2">{s.subject?.name}</td><td className="py-2">{s.teacher?.name || "—"}</td><td className="py-2">{s.actualDuration || s.plannedDuration} د</td><td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.status === 'CONFIRMED' ? 'مؤكدة' : s.status === 'CANCELLED' ? 'ملغية' : 'مجدولة'}</span></td></tr>)}</tbody></table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EducationStudentProfilePage;
