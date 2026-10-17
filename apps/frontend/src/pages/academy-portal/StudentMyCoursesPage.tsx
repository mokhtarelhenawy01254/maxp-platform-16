import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Award, ArrowLeft, PlayCircle, Loader2, Sparkles, CheckCircle2, Layers, Clock } from "lucide-react";

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
        // 🔒 التوكن منتهي/غير صالح → تنظيف والعودة لتسجيل الدخول بدل رسالة خطأ عامة
        if (res.status === 401) {
          localStorage.removeItem("studentToken");
          navigate("/portal/login?expired=1", { replace: true });
          return;
        }
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
    <div className="space-y-6 text-right" dir="rtl">
      {/* Editorial Header */}
      <div className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>لوحة تعلم الطالب</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">كورساتي المشترك بها</h1>
          <p className="text-xs text-muted-foreground">تابع تقدمك الدراسي وأكمل دروسك من حيث توقفت.</p>
        </div>

        <Link
          to="/portal/catalog"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors self-start sm:self-auto active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>تصفح المزيد من الكورسات</span>
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-2xl border border-border/70 p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">جاري تحميل مساراتك الدراسية...</span>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center space-y-2">
          <p className="font-bold text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs font-semibold underline hover:opacity-80">
            إعادة المحاولة
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/70 p-12 text-center text-muted-foreground space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/60" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-foreground">لا توجد كورسات مسجلة بهذا الرقم بعد</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              يمكنك الاشتراك في كورس MaxP الجديد أو مشاهدة أول درسين مجاناً من الكتالوج.
            </p>
          </div>
          <Link
            to="/portal/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors shadow-xs active:scale-[0.98]"
          >
            <span>استكشاف الكتالوج الآن</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enrollments.map((enr) => {
            const course = enr.course;
            const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
            const completedCount = enr.progress?.filter((p) => p.status === "DONE").length || 0;
            const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
            const isCompleted = progressPercent === 100;
            const flatLessons = (course.modules || []).flatMap((m) => m.lessons || []);
            const firstLessonId = flatLessons[0]?.id;
            // استكمال من حيث توقفت: أول درس لم يكتمل بعد (والأول لو الكورس خلص)
            const doneSet = new Set((enr.progress || []).filter((p) => p.status === "DONE").map((p) => p.lessonId));
            const resumeLessonId = flatLessons.find((l) => !doneSet.has(l.id))?.id || firstLessonId;

            return (
              <div
                key={enr.id}
                className="bg-card rounded-2xl border border-border/70 hover:border-primary/40 transition-all duration-200 shadow-xs flex flex-col overflow-hidden group"
              >
                <div className="p-5 sm:p-6 flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? "مكتمل بنجاح" : "قيد الدراسة"}</span>
                    </span>

                    <span className="text-xs font-mono tabular-nums text-muted-foreground inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{course.modules?.length || 0} وحدات</span>
                      <span className="text-border">·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{totalLessons} درس</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      <Link to={`/portal/course/${enr.courseId}`}>{course.title}</Link>
                    </h2>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description || "مسار تطبيقي متكامل من أول فهم العميل وتظبيط العرض لحد قراءة الرقم وإطلاق الحملات الإعلانية."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
                      <span>نسبة الإنجاز</span>
                      <span className="font-semibold text-foreground">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
                  {isCompleted ? (
                    <Link
                      to={`/portal/certificate/${enr.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>عرض الشهادة</span>
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      متبقي {totalLessons - completedCount} درس
                    </span>
                  )}

                  <Link
                    to={resumeLessonId ? `/portal/course/${enr.courseId}/lesson/${resumeLessonId}` : `/portal/course/${enr.courseId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98] shadow-xs"
                  >
                    <span>{progressPercent > 0 ? (isCompleted ? "مراجعة الكورس" : "أكمل من حيث توقفت") : "بدء الكورس"}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
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
