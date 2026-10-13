import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  PlayCircle,
  Plus,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Layers,
  ChevronLeft,
  Activity,
  CheckCircle2,
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Unified Command Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                أكاديمية ماكس بي
              </h1>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/70">
                LMS Platform
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة وبيع الدورات والمسارات التدريبية المعتمدة مع مساعد الذكاء الاصطناعي التفاعلي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link
            to="/academy/catalog"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <PlayCircle className="w-3.5 h-3.5 text-primary" />
            <span>كتالوج الطلاب</span>
          </Link>
          <Link
            to="/academy/students"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>سجل الطلاب</span>
          </Link>
          <Link
            to="/academy/courses"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إدارة الكورسات</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modern KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Courses */}
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الدورات</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground font-mono tabular-nums">{courses.length}</span>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              جاهزة
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">منشورة ومسودات بالمنصة</p>
        </div>

        {/* Total Students */}
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">الطلاب المسجلين</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground font-mono tabular-nums">{totalEnrollments}</span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>نشط</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">مشترك مسجل حالياً</p>
        </div>

        {/* Total Lessons */}
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الدروس</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground font-mono tabular-nums">{totalLessons}</span>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              درساً
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">دروس فيديو وسكريبتات ذكية</p>
        </div>

        {/* AI Tutor Assistant */}
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المساعد الذكي</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground font-mono tabular-nums">100%</span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              مُفعّل
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">يجيب بدقة من سكريبت كل درس</p>
        </div>
      </div>

      {/* Flagship Course Promo / Single Surface Callout */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/80 p-4 sm:p-5 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              <span>الدورة القيادية المعتمدة — Flagship Course</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              دورة الميديا باير المحترف — Performance Media Buyer
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم تجهيز الدورة بالكامل بـ 29 درساً تطبيقياً مرتبة بالتسلسل، ومزودة بسكريبتات تدريبية، كويزات تقييم، علامة مائية ضد التسريب، ومساعد ذكي يرافق الطالب خطوة بخطوة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/academy/courses"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs active:scale-[0.98]"
            >
              تعديل المنهج والدروس
            </Link>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground">الدورات التدريبية المضافة</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {courses.length}
            </span>
          </div>
          <Link
            to="/academy/courses"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <span>عرض كل الدورات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-xs sm:text-sm bg-card rounded-xl border border-border/70">
            جاري تحميل الدورات...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              لا توجد دورات مسجلة بعد. يمكنك إنشاء دورتك الأولى وربطها بالمتجر الآن.
            </p>
            <Link
              to="/academy/courses"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء دورة جديدة</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {courses.map((course) => {
              const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
              return (
                <div
                  key={course.id}
                  className="rounded-xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ونشط" : "مسودة مؤقتة"}
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        {course.price > 0 ? `${course.price.toLocaleString()} ج.م` : "مجاني"}
                      </span>
                    </div>

                    <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                      {course.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description || "لا يوجد وصف مختصر"}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60">
                      <span>{lessonCount} درساً ({course.freePreviewLessons} تجريبي)</span>
                      <span className="font-mono tabular-nums">{course._count?.enrollments || 0} مشترك</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-muted/30 border-t border-border/70 flex items-center gap-2">
                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center bg-card hover:bg-accent text-foreground border border-border/70 transition"
                    >
                      إدارة المنهج
                    </Link>
                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/25 transition flex items-center gap-1"
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
