import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, DollarSign, CalendarDays, Phone, Mail, Award } from "lucide-react";

interface TeacherData {
  id: string; name: string; phone?: string; email?: string; bio?: string; qualifications?: string;
  isActive: boolean; subjectRates: { id: string; hourlyRate: number; subject: { id: string; name: string } }[];
}
interface Session { id: string; scheduledAt: string; status: string; subject: { name: string }; student: { firstName: string; lastName: string }; plannedDuration: number; actualDuration?: number }
interface Payment { id: string; periodFrom: string; periodTo: string; totalSessions: number; grossAmount: number; netAmount: number; status: string }

const EducationTeacherProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const [tRes, sRes, pRes] = await Promise.all([
          fetch(`/api/v1/education/teachers/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/v1/education/sessions?teacherId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/v1/education/payments?teacherId=${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [tJson, sJson, pJson] = await Promise.all([tRes.json(), sRes.json(), pRes.json()]);
        if (tJson.success) setTeacher(tJson.data);
        if (sJson.success) setSessions(sJson.data);
        if (pJson.success) setPayments(pJson.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;
  if (!teacher) return <div className="text-center py-12 text-red-600">المدرس غير موجود</div>;

  const confirmedSessions = sessions.filter(s => s.status === 'CONFIRMED');
  const upcomingSessions = sessions.filter(s => s.status === 'SCHEDULED');
  const totalEarnings = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netAmount, 0);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <Link to="/admin/education/teachers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowRight size={16} /> العودة إلى المدرسين
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{teacher.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {teacher.phone && <span className="flex items-center gap-1"><Phone size={14} />{teacher.phone}</span>}
              {teacher.email && <span className="flex items-center gap-1"><Mail size={14} />{teacher.email}</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${teacher.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {teacher.isActive ? 'نشط' : 'غير نشط'}
          </span>
        </div>

        {teacher.bio && <div className="mt-4"><h3 className="text-sm font-semibold text-gray-700 mb-1">السيرة الذاتية</h3><p className="text-sm text-gray-600">{teacher.bio}</p></div>}
        {teacher.qualifications && <div className="mt-3"><h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Award size={14} />المؤهلات</h3><p className="text-sm text-gray-600">{teacher.qualifications}</p></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">المواد</p><p className="text-xl font-bold">{teacher.subjectRates?.length || 0}</p></div><div className="p-2 bg-blue-100 rounded-lg"><BookOpen size={20} className="text-blue-600" /></div></div></div>
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">إجمالي الحصص</p><p className="text-xl font-bold">{confirmedSessions.length}</p></div><div className="p-2 bg-green-100 rounded-lg"><CalendarDays size={20} className="text-green-600" /></div></div></div>
        <div className="bg-white rounded-xl shadow-sm border p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">إجمالي المدفوعات</p><p className="text-xl font-bold">{totalEarnings} ج.م</p></div><div className="p-2 bg-amber-100 rounded-lg"><DollarSign size={20} className="text-amber-600" /></div></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">أسعار المواد</h2>
          {teacher.subjectRates?.map(sr => (
            <div key={sr.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="font-medium">{sr.subject.name}</span>
              <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{sr.hourlyRate} ج.م/س</span>
            </div>
          ))}
          {(!teacher.subjectRates || teacher.subjectRates.length === 0) && <p className="text-sm text-gray-400">لا توجد أسعار</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">الحصص القادمة</h2>
          {upcomingSessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
              <div>
                <p className="font-medium">{s.student?.firstName} {s.student?.lastName}</p>
                <p className="text-gray-500">{s.subject?.name} — {s.plannedDuration} دقيقة</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(s.scheduledAt).toLocaleDateString('ar-EG')}</span>
            </div>
          ))}
          {upcomingSessions.length === 0 && <p className="text-sm text-gray-400">لا توجد حصص قادمة</p>}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">المرتبات</h2>
        {payments.length === 0 ? <p className="text-sm text-gray-400">لا توجد مدفوعات</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-right py-2">الفترة</th><th className="text-right py-2">حصص</th><th className="text-right py-2">الإجمالي</th><th className="text-right py-2">الحالة</th></tr></thead>
              <tbody>{payments.map(p => <tr key={p.id} className="border-b last:border-0"><td className="py-2">{new Date(p.periodFrom).toLocaleDateString('ar-EG')} — {new Date(p.periodTo).toLocaleDateString('ar-EG')}</td><td className="py-2">{p.totalSessions}</td><td className="py-2">{p.netAmount} ج.م</td><td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.status === 'PAID' ? 'مدفوع' : 'معلق'}</span></td></tr>)}</tbody></table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationTeacherProfilePage;
