import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  Award,
  PlayCircle,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Layers,
} from "lucide-react";
import { academyApi, Course } from "./academyApi";

export default function AcademyDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await academyApi.getCourses();
      setCourses(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل بيانات الأكاديمية");
    } finally {
      setLoading(false);
    }
  };

  const totalEnrollments = courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
  const totalLessons = courses.reduce(
    (sum, c) => sum + (c.modules?.reduce((mSum, m) => mSum + (m.lessons?.length || 0), 0) || 0),
    0
  );

  return (
    <div className="w-full bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              أكاديمية ماكس بي — MaxP Academy
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              إدارة وبيع الدورات والمسارات التدريبية المعتمدة مدعومة بكوتش الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/academy/catalog"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 transition-all active:scale-[0.98]"
          >
            <PlayCircle className="w-4 h-4 text-primary" />
            <span>بوابة الطلاب (الكتالوج)</span>
          </Link>
          <Link
            to="/academy/courses"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>إدارة الكورسات</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modern 2026 KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Courses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md hover:border-primary/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">إجمالي الدورات</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{courses.length}</span>
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              جاهزة
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">منشورة ومسودات بالمنصة</p>
        </div>

        {/* Total Students */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md hover:border-sky-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">الطلاب المسجلين</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{totalEnrollments}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>نشط</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">مشترك يتعلم حالياً</p>
        </div>

        {/* Total Lessons */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md hover:border-purple-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">إجمالي الدروس</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{totalLessons}</span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              درساً
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">دروس مزودة بسكريبتات ذكية</p>
        </div>

        {/* AI Coach Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">كوتش الـ AI</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">100%</span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              مُفعّل
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">يجيب بدقة من سكريبت الدرس</p>
        </div>
      </div>

      {/* Flagship Course Promo / Action Box (2026 Ambient Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/25 p-5 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الدورة القيادية الجاهزة — Flagship Course</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
              دورة الميديا باير المحترف — Performance Media Buyer (29 درساً)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              تم تجهيز الدورة بالكامل بـ 29 درساً تطبيقياً مرتبة بالتسلسل، ومزودة بسكريبتات احترافية، كويزات تقييم، علامة مائية ضد التسريب، ومساعد ذكي يرافق الطالب خطوة بخطوة.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/academy/courses"
              className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm shadow-primary/20 active:scale-[0.98]"
            >
              تعديل المنهج والدروس
            </Link>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-extrabold text-foreground">الدورات التدريبية المضافة</h3>
          <Link to="/academy/courses" className="text-xs sm:text-sm text-primary hover:underline font-semibold flex items-center gap-1">
            <span>إدارة كافة الكورسات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">جاري تحميل الدورات...</div>
        ) : courses.length === 0 ? (
          <div className="p-10 rounded-3xl bg-card border border-dashed border-border text-center space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto" />
            <p className="text-sm text-muted-foreground">لا توجد دورات مسجلة بعد. يمكنك إنشاء دورتك الأولى الآن.</p>
            <Link
              to="/academy/courses"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء دورة جديدة</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => {
              const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
              return (
                <div
                  key={course.id}
                  className="rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ونشط" : "مسودة مؤقتة"}
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {course.price > 0 ? `${course.price} EGP` : "مجاني"}
                      </span>
                    </div>

                    <h4 className="font-bold text-foreground text-base leading-snug line-clamp-2">
                      {course.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description || "لا يوجد وصف مختصر"}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                      <span>{lessonCount} درساً ({course.freePreviewLessons} مجاناً)</span>
                      <span>{course._count?.enrollments || 0} مشترك</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 border-t border-border/60 flex items-center gap-2">
                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-center bg-card hover:bg-accent text-foreground border border-border/60 transition"
                    >
                      إدارة المنهج
                    </Link>
                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/25 transition flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
