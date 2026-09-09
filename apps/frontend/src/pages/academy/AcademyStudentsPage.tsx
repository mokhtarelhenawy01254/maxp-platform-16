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

  const totalStudents = students.length;
  const completedStudents = students.filter((s) => s.hasCertificate || s.progressPercent === 100).length;
  const inProgressStudents = totalStudents - completedStudents;

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
            <Users className="w-6 h-6 text-primary" />
            <span>متابعة الطلاب والتقدم الأكاديمي</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            متابعة نسب إكمال الدروس، درجات الاختبارات، وتفاصيل الشهادات المعتمدة الصادرة للطلاب
          </p>
        </div>

        {courses.length > 0 && (
          <div className="w-full sm:w-72">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
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
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      {courses.length > 0 && !loading && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">إجمالي المسجلين</span>
              <div className="text-2xl font-extrabold text-foreground mt-1 font-mono">{totalStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">أكملوا الدورة بنجاح</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{completedStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">قيد التعلّم والمتابعة</span>
              <div className="text-2xl font-extrabold text-primary mt-1 font-mono">{inProgressStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="mt-6">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">جاري تحميل بيانات الطلاب...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">لا يوجد طلاب مسجلين في هذه الدورة بعد</h3>
            <p className="text-xs text-muted-foreground">
              سيظهر هنا كل طالب فور شرائه الدورة من المتجر أو تسجيله عبر بوابة الطلاب.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-foreground">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3.5 sm:p-4">اسم الطالب</th>
                    <th className="p-3.5 sm:p-4">الهاتف / واتساب</th>
                    <th className="p-3.5 sm:p-4">نسبة الإكمال</th>
                    <th className="p-3.5 sm:p-4">الدروس المنجزة</th>
                    <th className="p-3.5 sm:p-4">الشهادة</th>
                    <th className="p-3.5 sm:p-4">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/30 transition">
                      <td className="p-3.5 sm:p-4 font-bold text-foreground">{st.studentName || "طالب"}</td>
                      <td className="p-3.5 sm:p-4 font-mono text-muted-foreground">{st.studentPhone || "—"}</td>
                      <td className="p-3.5 sm:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${st.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-primary font-mono">{st.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 sm:p-4 text-muted-foreground font-mono">
                        {st.completedLessonsCount} من {st.totalLessonsCount} درس
                      </td>
                      <td className="p-3.5 sm:p-4">
                        {st.hasCertificate ? (
                          <a
                            href={`/api/v1/academy/certificates/${st.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>معتمدة ({st.certificateNumber})</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">قيد التقدم</span>
                        )}
                      </td>
                      <td className="p-3.5 sm:p-4 text-muted-foreground font-mono">
                        {new Date(st.enrolledAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
