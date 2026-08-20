import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  UserIcon, EnvelopeIcon, PhoneIcon, AcademicCapIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon, WalletIcon,
  ArrowRightIcon, StarIcon, BriefcaseIcon
} from "@heroicons/react/24/outline";

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  CONFIRMED: { label: "مؤكدة", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغية", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const EducationTeacherProfilePage: React.FC = () => {
  const { id } = useParams();
  const [teacher, setTeacher] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "payments">("sessions");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [tRes, sRes, pRes] = await Promise.all([
          fetch(`/api/v1/education/teachers/${id}`, { headers }),
          fetch(`/api/v1/education/sessions?teacherId=${id}`, { headers }),
          fetch(`/api/v1/education/payments?teacherId=${id}`, { headers })
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

  if (loading) return <div className="p-8 text-center text-gray-400 dark:text-gray-500">جاري التحميل...</div>;
  if (!teacher) return <div className="p-8 text-center text-red-500 dark:text-red-400">المدرس غير موجود</div>;

  const stats = [
    { label: "إجمالي الحصص", value: sessions.length, icon: AcademicCapIcon, color: "bg-blue-500" },
    { label: "الحصص المؤكدة", value: sessions.filter(s => s.status === "CONFIRMED").length, icon: CheckCircleIcon, color: "bg-green-500" },
    { label: "الحصص الملغية", value: sessions.filter(s => s.status === "CANCELLED").length, icon: XCircleIcon, color: "bg-red-500" },
    { label: "إجمالي المدفوعات", value: payments.reduce((a, p) => a + (p.status === "PAID" ? p.netAmount : 0), 0) + " ج.م", icon: WalletIcon, color: "bg-amber-500" },
  ];

  const tabs = [
    { id: "sessions" as const, label: "الحصص", icon: ClockIcon },
    { id: "payments" as const, label: "المرتبات", icon: WalletIcon },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      {/* Header with back button */}
      <Link to="/admin/education/teachers" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm mb-4 hover:underline">
        <ArrowRightIcon className="w-4 h-4" /> العودة إلى المدرسين
      </Link>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
            {teacher.avatarUrl ? (
              <img src={teacher.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{teacher.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs ${teacher.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                {teacher.isActive ? "نشط" : "غير نشط"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              {teacher.email && <span className="flex items-center gap-1"><EnvelopeIcon className="w-4 h-4" />{teacher.email}</span>}
              {teacher.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" />{teacher.phone}</span>}
            </div>
          </div>
        </div>

        {teacher.bio && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><BriefcaseIcon className="w-4 h-4" /> السيرة الذاتية</h3>
            <p className="text-sm">{teacher.bio}</p>
          </div>
        )}
        {teacher.qualifications && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><StarIcon className="w-4 h-4" /> المؤهلات</h3>
            <p className="text-sm">{teacher.qualifications}</p>
          </div>
        )}

        {teacher.subjectRates?.length > 0 && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">المواد وأسعار الساعة</h3>
            <div className="flex flex-wrap gap-2">
              {teacher.subjectRates.map((sr: any) => (
                <span key={sr.id} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-xs">
                  {sr.subject?.name}: {sr.hourlyRate} ج.م/س
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
              <div className={`${s.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                <th className="text-right py-3 px-4">الطالب</th>
                <th className="text-right py-3 px-4">المادة</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">المدة</th>
                <th className="text-right py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4 font-medium">{s.student?.firstName} {s.student?.lastName}</td>
                  <td className="py-3 px-4">{s.subject?.name}</td>
                  <td className="py-3 px-4">{new Date(s.scheduledAt).toLocaleDateString("ar-EG")} {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-3 px-4">{s.actualDuration || s.plannedDuration} د</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${SESSION_STATUS[s.status]?.color}`}>{SESSION_STATUS[s.status]?.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد حصص</p>}
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                <th className="text-right py-3 px-4">الفترة</th>
                <th className="text-right py-3 px-4">حصص</th>
                <th className="text-right py-3 px-4">ساعات</th>
                <th className="text-right py-3 px-4">الإجمالي</th>
                <th className="text-right py-3 px-4">خصم</th>
                <th className="text-right py-3 px-4">الصافي</th>
                <th className="text-right py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4">{new Date(p.periodFrom).toLocaleDateString("ar-EG")} - {new Date(p.periodTo).toLocaleDateString("ar-EG")}</td>
                  <td className="py-3 px-4">{p.totalSessions}</td>
                  <td className="py-3 px-4">{p.totalHours}</td>
                  <td className="py-3 px-4">{p.grossAmount} ج.م</td>
                  <td className="py-3 px-4">{p.deductions > 0 ? `${p.deductions} ج.م` : "—"}</td>
                  <td className="py-3 px-4 font-medium">{p.netAmount} ج.م</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      p.status === "PAID"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}>
                      {p.status === "PAID" ? "مدفوع" : "معلق"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مدفوعات</p>}
        </div>
      )}
    </div>
  );
};

export default EducationTeacherProfilePage;
