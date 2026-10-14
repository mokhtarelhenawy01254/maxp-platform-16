import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  PlayCircle,
  Plus,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Layers,
  ChevronLeft,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { academyApi, Course } from "./academyApi";

export default function AcademyDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await academyApi.getCourses();
      const list = Array.isArray(data) ? data : ((data as any)?.courses || (data as any)?.data || []);
      setCourses(list);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل بيانات الأكاديمية والمسارات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const safeCourses = useMemo(() => (Array.isArray(courses) ? courses : []), [courses]);

  const totalEnrollments = useMemo(
    () => safeCourses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0),
    [safeCourses]
  );

  const totalLessons = useMemo(
    () =>
      safeCourses.reduce(
        (sum, c) => sum + (c.modules?.reduce((mSum, m) => mSum + (m.lessons?.length || 0), 0) || 0),
        0
      ),
    [safeCourses]
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              أكاديمية ماكس بي التعليمية
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              LMS Platform v2.2
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة وبيع الدورات والمسارات التدريبية المعتمدة مع مساعد الذكاء الاصطناعي التفاعلي
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs self-end sm:self-auto">
          <Link
            to="/academy/catalog"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <PlayCircle className="size-3.5 text-primary" />
            <span>كتالوج الطلاب</span>
          </Link>
          <Link
            to="/academy/students"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <Users className="size-3.5 text-primary" />
            <span>سجل الطلاب</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-8 px-2 text-xs font-mono border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Link to="/academy/courses">
            <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
              <Plus className="size-3.5" />
              <span>إدارة الكورسات</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-mono">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modern KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي الدورات</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {safeCourses.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مسارات ومسودات</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <BookOpen className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">الطلاب المسجلين</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {totalEnrollments}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مشترك نشط حالياً</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Users className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">إجمالي الدروس</p>
            <p className="text-xl font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {totalLessons}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">فيديوهات وتمارين</p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <Layers className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">المساعد الذكي</p>
            <p className="text-sm font-bold tracking-tight text-emerald-500 mt-0.5 font-mono inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              جاهز ومُفعّل
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">إجابات فورية من المنهج</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Sparkles className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Flagship Course Promo / Single Surface Callout */}
      <div className="rounded-lg bg-card border border-border/80 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3" />
              <span>المسار القيادي المعتمد — Flagship Program</span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              دورة الميديا باير المحترف — Performance Media Buyer
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم تجهيز الدورة بالكامل بدروس تطبيقية مرتبة بالتسلسل، ومزودة بسكريبتات تدريبية، كويزات تقييم، علامة مائية ضد التسريب، ومساعد ذكي يرافق الطالب خطوة بخطوة.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/academy/courses">
              <Button size="sm" className="h-8 px-3 text-xs font-mono active:scale-[0.98]">
                تعديل المنهج والدروس
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground font-mono">الدورات التدريبية المضافة</h3>
            <Badge variant="outline" className="text-[10px] font-mono border-border/60">
              {safeCourses.length} مسار
            </Badge>
          </div>
          <Link
            to="/academy/courses"
            className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            <span>عرض كل الدورات</span>
            <ChevronLeft className="size-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-xs font-mono bg-card rounded-lg border border-border/70">
            جاري تحميل الدورات...
          </div>
        ) : safeCourses.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-lg bg-card border border-dashed border-border/80 text-center space-y-3">
            <BookOpen className="size-9 text-muted-foreground/50 mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">
              لا توجد دورات مسجلة بعد. يمكنك إنشاء دورتك الأولى وربطها بالمتجر الآن.
            </p>
            <Link to="/academy/courses">
              <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
                <Plus className="size-3.5" />
                <span>إنشاء دورة جديدة</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeCourses.map((course) => {
              const lessonCount =
                course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
              return (
                <div
                  key={course.id}
                  className="rounded-lg bg-card border border-border/70 hover:border-primary/40 hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ونشط" : "مسودة مؤقتة"}
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        {course.price > 0 ? `${course.price.toLocaleString("en-US")} ج.م` : "مجاني"}
                      </span>
                    </div>

                    <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                      {course.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description || "لا يوجد وصف مختصر"}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 font-mono">
                      <span>{lessonCount} درساً ({course.freePreviewLessons || 0} تجريبي)</span>
                      <span className="tabular-nums">{course._count?.enrollments || 0} مشترك</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-muted/20 border-t border-border/70 flex items-center gap-2">
                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="flex-1 py-1.5 rounded-md text-xs font-mono text-center bg-card hover:bg-muted text-foreground border border-border/70 transition-colors"
                    >
                      إدارة المنهج
                    </Link>
                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="px-3 py-1.5 rounded-md text-xs font-mono text-primary hover:bg-primary/10 border border-primary/25 transition-colors flex items-center gap-1"
                    >
                      <PlayCircle className="size-3.5" />
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
