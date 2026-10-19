import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, CheckCircle2, ArrowLeft, Loader2, PlayCircle, Layers, Clock, Award } from "lucide-react";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";

interface Lesson {
  id: string;
  title: string;
  isFreePreview: boolean;
  durationMin: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  freePreviewLessons: number;
  thumbnailUrl: string | null;
  modules: Module[];
  isEnrolled?: boolean;
}

const AcademyCatalogPublicPage: React.FC = () => {
  const branding = useCompanyBranding();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/v1/academy/catalog");
        const data = await res.json();
        if (data.success && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else {
          setError(data.error || "تعذر تحميل كتالوج الكورسات");
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  const isApexHost = typeof window !== "undefined" && (window.location.hostname === "maxp.online" || window.location.hostname === "www.maxp.online");
  const getCourseUrl = (cId: string, slug?: string) => {
    if (isApexHost) {
      const companySlug = slug || "max-p";
      return `https://${companySlug}.maxp.online/portal/course/${cId}`;
    }
    return `/portal/course/${cId}`;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Editorial Header */}
      <div className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 shadow-xs">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>كتالوج الكورسات — {branding.name ? `أكاديمية ${branding.name}` : "أكاديمية MaxP"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
            تعلّم إدارة إعلاناتك ونظام بيعك — من الواقع المصري
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            مسارات تطبيقية مصممة لأصحاب المحلات والمشاريع التجارية: كل درس خطوة واحدة قابلة للتنفيذ الفوري مع كوتش ذكي وتمارين عملية على المنصة.
          </p>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-2xl border border-border/70 p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">جاري تحميل الكورسات المتاحة...</span>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center space-y-2">
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold underline hover:opacity-80 transition-opacity"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/70 p-12 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="font-medium text-sm">لا توجد كورسات منشورة حالياً في الأكاديمية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const totalLessons = course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
            const firstLesson = course.modules[0]?.lessons[0];
            const previewLessons = Number(course.freePreviewLessons) || 0;

            return (
              <div
                key={course.id}
                className="bg-card rounded-2xl border border-border/70 hover:border-primary/40 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col overflow-hidden group"
              >
                {/* Course Card Thumbnail */}
                {(course.thumbnailUrl || course.id === 'cmuzmwaxs07r2juml2v04xon5') && (
                  isApexHost ? (
                    <a
                      href={getCourseUrl(course.id, (course as any).companySlug)}
                      className="block relative aspect-video w-full overflow-hidden bg-slate-100 border-b border-border/50"
                    >
                      <img
                        src={course.thumbnailUrl || '/og/p1_course-path_1080x1080.png'}
                        alt={course.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </a>
                  ) : (
                    <Link
                      to={`/portal/course/${course.id}`}
                      className="block relative aspect-video w-full overflow-hidden bg-slate-100 border-b border-border/50"
                    >
                      <img
                        src={course.thumbnailUrl || '/og/p1_course-path_1080x1080.png'}
                        alt={course.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  )
                )}

                {/* Course Card Header */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col space-y-4">
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    {previewLessons > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{previewLessons} {previewLessons === 1 ? "درس" : "دروس"} معاينة مجانًا</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1 font-mono tabular-nums">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{course.modules.length} وحدات</span>
                      <span className="text-border">·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{totalLessons} درس</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2 flex-1">
                    <h2 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {isApexHost ? (
                        <a href={getCourseUrl(course.id, (course as any).companySlug)}>{course.title}</a>
                      ) : (
                        <Link to={`/portal/course/${course.id}`}>{course.title}</Link>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {course.description || "مسار تطبيقي متكامل من أول فهم العميل وتظبيط العرض لحد قراءة الرقم وإطلاق الحملات الإعلانية."}
                    </p>
                  </div>

                  {/* Feature Chips */}
                  <div className="pt-3 border-t border-border/50 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>كوتش ذكي لكل درس مربوط بالسكريبت</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>تمارين حقيقية وتطبيق مباشر على المنصة</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">سعر الكورس</span>
                    <span className="text-lg font-extrabold text-foreground font-mono tabular-nums">
                      {course.price} <span className="text-xs font-bold text-muted-foreground">ج.م</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {firstLesson && previewLessons > 0 && (
                      <Link
                        to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                        title="مشاهدة الدرس الأول مجاناً"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </Link>
                    )}
                    {isApexHost ? (
                      <a
                        href={getCourseUrl(course.id, (course as any).companySlug)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98] shadow-xs"
                      >
                        <span>التفاصيل</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={`/portal/course/${course.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98] shadow-xs"
                      >
                        <span>التفاصيل</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AcademyCatalogPublicPage;
