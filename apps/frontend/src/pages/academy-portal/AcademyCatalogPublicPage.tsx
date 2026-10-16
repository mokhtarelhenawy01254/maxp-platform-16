import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, CheckCircle2, ArrowLeft, Loader2, PlayCircle } from "lucide-react";
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

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>كتالوج الكورسات — {branding.name ? `أكاديمية ${branding.name}` : "أكاديمية MaxP"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            تعلّم إدارة إعلاناتك ونظام بيعك — من الواقع المصري
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            مسارات تطبيقية مصممة لأصحاب المحلات والمشاريع التجارية: كل درس خطوة واحدة قابلة للتنفيذ الفوري مع كوتش ذكي وتمارين عملية على المنصة.
          </p>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">جاري تحميل الكورسات المتاحة...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-2">
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold underline hover:text-rose-950"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <p className="font-medium text-sm">لا توجد كورسات منشورة حالياً في الأكاديمية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const totalLessons = course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
            const firstLesson = course.modules[0]?.lessons[0];

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col overflow-hidden group"
              >
                {/* Course Card Header */}
                <div className="p-6 flex-1 flex flex-col space-y-4">
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>أول درسين معاينة مجانًا</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {course.modules.length} وحدات · 25 درس
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2 flex-1">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                      <Link to={`/portal/course/${course.id}`}>{course.title}</Link>
                    </h2>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {course.description || "مسار تطبيقي متكامل من أول فهم العميل وتظبيط العرض لحد قراءة الرقم وإطلاق الحملات الإعلانية."}
                    </p>
                  </div>

                  {/* Feature Chips */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>كوتش ذكي لكل درس مربوط بالسكريبت</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>تمارين حقيقية وتطبيق مباشر على المنصة</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">سعر الكورس</span>
                    <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {course.price} <span className="text-xs font-bold text-slate-600">ج.م</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {firstLesson && (
                      <Link
                        to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="مشاهدة الدرس الأول مجاناً"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </Link>
                    )}
                    <Link
                      to={`/portal/course/${course.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-95 shadow-sm"
                    >
                      <span>التفاصيل</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </Link>
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
