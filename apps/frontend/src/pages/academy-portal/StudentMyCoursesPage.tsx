import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Award, ArrowLeft, PlayCircle, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface ProgressItem {
  id: string;
  lessonId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
}

interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnailUrl: string | null;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string }>;
  }>;
}

interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  completedAt: string | null;
  course: CourseItem;
  progress: ProgressItem[];
}

const StudentMyCoursesPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const studentToken = localStorage.getItem("studentToken");

    if (!studentToken) {
      navigate("/portal/login", { replace: true });
      return;
    }

    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers: Record<string, string> = {
          Authorization: `Bearer ${studentToken}`,
        };

        const res = await fetch(`/api/v1/academy/my-courses`, {
          headers,
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.enrollments)) {
          setEnrollments(data.enrollments);
        } else {
          setError(data.error || "تعذر تحميل قائمة كورساتك");
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل الكورسات");
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, [navigate]);

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>لوحة تعلم الطالب</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">كورساتي المشترك بها</h1>
          <p className="text-xs text-slate-500">تابع تقدمك الدراسي وأكمل دروسك من حيث توقفت.</p>
        </div>

        <Link
          to="/portal/catalog"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>تصفح المزيد من الكورسات</span>
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">جاري تحميل مساراتك الدراسية...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-2">
          <p className="font-bold text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs font-semibold underline">
            إعادة المحاولة
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800">لا توجد كورسات مسجلة بهذا الرقم بعد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              يمكنك الاشتراك في كورس MaxP الجديد أو مشاهدة أول درسين مجاناً من الكتالوج.
            </p>
          </div>
          <Link
            to="/portal/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors shadow-sm"
          >
            <span>انتقل إلى الكتالوج</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((enr) => {
            const course = enr.course;
            const allLessons = course.modules?.flatMap((m) => m.lessons) || [];
            const totalLessons = allLessons.length;
            const completedCount = enr.progress?.filter((p) => p.status === "DONE").length || 0;
            const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            // Find next uncompleted lesson
            const completedIds = new Set(enr.progress?.filter((p) => p.status === "DONE").map((p) => p.lessonId) || []);
            const nextLesson = allLessons.find((l) => !completedIds.has(l.id)) || allLessons[0];

            return (
              <div
                key={enr.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>اشتراك نشط</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {completedCount} من {totalLessons} درس مكتمل
                    </span>
                  </div>

                  {/* Course Title */}
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      <Link to={`/portal/course/${enr.courseId}`} className="hover:text-indigo-600 transition-colors">
                        {course.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {course.description || "مسار تطبيقي من إطلاق الحملات حتى قراءة الأرقام الحقيقية."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>نسبة الإنجاز</span>
                      <span className="tabular-nums font-mono text-indigo-700">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {progressPercent === 100 && (
                    <Link
                      to={`/portal/certificate/${enr.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>عرض الشهادة</span>
                    </Link>
                  )}

                  {nextLesson && (
                    <Link
                      to={`/portal/course/${enr.courseId}/lesson/${nextLesson.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-100 mr-auto active:scale-95"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>كمّل من حيث وقفت ({nextLesson.title.slice(0, 24)}...)</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentMyCoursesPage;
