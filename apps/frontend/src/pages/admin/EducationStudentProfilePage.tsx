import { User as UserIcon, Phone as PhoneIcon, Circle as BookOpenIcon, Circle as CalendarDaysIcon, Clock as ClockIcon, Check as CheckCircleIcon, X as XCircleIcon, Activity as ChartBarIcon, ArrowRight as ArrowRightIcon, Circle as AcademicCapIcon } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
;

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  CONFIRMED: { label: "مؤكدة", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغية", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const EducationStudentProfilePage: React.FC = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"enrollments" | "sessions">("enrollments");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [stRes, eRes, sRes] = await Promise.all([
          fetch(`/api/v1/education/students/${id}`, { headers }),
          fetch(`/api/v1/education/enrollments?studentId=${id}`, { headers }),
          fetch(`/api/v1/education/sessions?studentId=${id}`, { headers })
        ]);
        const [stJson, eJson, sJson] = await Promise.all([stRes.json(), eRes.json(), sRes.json()]);
        if (stJson.success) setStudent(stJson.data);
        if (eJson.success) setEnrollments(eJson.data);
        if (sJson.success) setSessions(sJson.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400 dark:text-gray-500">جاري التحميل...</div>;
  if (!student) return <div className="p-8 text-center text-red-500">الطالب غير موجود</div>;

  const totalHours = enrollments.reduce((a: number, e: any) => a + e.totalHours, 0);
  const usedHours = enrollments.reduce((a: number, e: any) => a + (e.totalHours - e.remainingHours), 0);
  const pct = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

  const stats = [
    { label: "تسجيلات نشطة", value: enrollments.filter(e => e.isActive !== false).length, icon: AcademicCapIcon, color: "bg-blue-500" },
    { label: "إجمالي الحصص", value: sessions.length, icon: ChartBarIcon, color: "bg-purple-500" },
    { label: "الحصص المؤكدة", value: sessions.filter(s => s.status === "CONFIRMED").length, icon: CheckCircleIcon, color: "bg-green-500" },
    { label: "نسبة الاستهلاك", value: `${pct}%`, icon: ClockIcon, color: pct >= 80 ? "bg-red-500" : "bg-amber-500" },
  ];

  const tabs = [
    { id: "enrollments" as const, label: "التسجيلات", icon: BookOpenIcon },
    { id: "sessions" as const, label: "الحصص", icon: CalendarDaysIcon },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <Link to="/admin/education/students" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm mb-4 hover:underline">
        <ArrowRightIcon className="w-4 h-4" /> العودة إلى الطلاب
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs ${student.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                {student.isActive ? "نشط" : "غير نشط"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              {student.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" />{student.phone}</span>}
              {student.grade && <span>الصف: {student.grade}</span>}
              {student.gender && <span>{student.gender === "male" ? "ذكر" : "أنثى"}</span>}
            </div>
          </div>
        </div>

        {student.notes && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-medium">ملاحظات:</span> {student.notes}</p>
          </div>
        )}

        {student.customer && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">ولي الأمر:</span> {student.customer.firstName} {student.customer.lastName}
            {student.customer.phone && <> — {student.customer.phone}</>}
            {student.customer.email && <> — {student.customer.email}</>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
              <div className={`${s.color} p-3 rounded-lg`}><Icon className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {totalHours > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">استهلاك الساعات</span>
            <span className="font-medium">{usedHours}/{totalHours} س ({pct}%)</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct <= 30 ? "bg-green-500" : pct <= 70 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Enrollments Tab */}
      {tab === "enrollments" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                <th className="text-right py-3 px-4">الباقة</th>
                <th className="text-right py-3 px-4">المادة</th>
                <th className="text-right py-3 px-4">المدرس</th>
                <th className="text-right py-3 px-4">المتبقي</th>
                <th className="text-right py-3 px-4">الإجمالي</th>
                <th className="text-right py-3 px-4">المدفوع</th>
                <th className="text-right py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4 font-medium">{e.package?.name}</td>
                  <td className="py-3 px-4">{e.package?.subject?.name}</td>
                  <td className="py-3 px-4">{e.teacher?.name || "—"}</td>
                  <td className="py-3 px-4">{e.remainingHours} س</td>
                  <td className="py-3 px-4">{e.totalHours} س</td>
                  <td className="py-3 px-4">{e.amountPaid} ج.م</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      e.paymentStatus === "COMPLETED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}>
                      {e.paymentStatus === "COMPLETED" ? "مدفوع" : "معلق"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enrollments.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد تسجيلات</p>}
        </div>
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                <th className="text-right py-3 px-4">المدرس</th>
                <th className="text-right py-3 px-4">المادة</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">المدة</th>
                <th className="text-right py-3 px-4">الموضوع</th>
                <th className="text-right py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4 font-medium">{s.teacher?.name}</td>
                  <td className="py-3 px-4">{s.subject?.name}</td>
                  <td className="py-3 px-4">{new Date(s.scheduledAt).toLocaleDateString("ar-EG")} {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-3 px-4">{s.actualDuration || s.plannedDuration} د</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{s.topic || "—"}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${SESSION_STATUS[s.status]?.color}`}>{SESSION_STATUS[s.status]?.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد حصص</p>}
        </div>
      )}
    </div>
  );
};

export default EducationStudentProfilePage;
