import { useEffect, useState } from "react";
import { Users, BookOpen, Award, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { academyApi, Course, StudentProgressRow } from "./academyApi";

export default function AcademyStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [students, setStudents] = useState<StudentProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await academyApi.getCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
        await loadStudents(data[0].id);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل بيانات الطلاب");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (cId: string) => {
    try {
      setLoading(true);
      const data = await academyApi.getStudentsProgress(cId);
      setStudents(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تحميل الطلاب للدورة المحددة");
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    loadStudents(cId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>متابعة الطلاب والتقدم الأكاديمي</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            متابعة نسب إكمال الدروس، درجات الاختبارات، وتفاصيل الشهادات المعتمدة الصادرة للطلاب
          </p>
        </div>

        {courses.length > 0 && (
          <div className="w-full sm:w-64">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="mt-6">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">جاري تحميل بيانات الطلاب...</div>
        ) : students.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">لا يوجد طلاب مسجلين في هذه الدورة بعد</h3>
            <p className="text-xs text-slate-400">
              سيظهر هنا كل طالب فور شرائه الدورة من المتجر أو تسجيله عبر بوابة الطلاب.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3.5">اسم الطالب</th>
                  <th className="p-3.5">الهاتف / واتساب</th>
                  <th className="p-3.5">نسبة الإكمال</th>
                  <th className="p-3.5">الدروس المنجزة</th>
                  <th className="p-3.5">الشهادة</th>
                  <th className="p-3.5">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3.5 font-bold text-white">{st.studentName || "طالب"}</td>
                    <td className="p-3.5 font-mono text-slate-400">{st.studentPhone || "—"}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${st.progressPercent}%` }}
                          />
                        </div>
                        <span className="font-bold text-emerald-400">{st.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {st.completedLessonsCount} من {st.totalLessonsCount} درس
                    </td>
                    <td className="p-3.5">
                      {st.hasCertificate ? (
                        <a
                          href={`/api/v1/academy/certificates/${st.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>معتمدة ({st.certificateNumber})</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">قيد التقدم</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(st.enrolledAt).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
