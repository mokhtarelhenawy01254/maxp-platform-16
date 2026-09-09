import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users, Award, PlayCircle, Plus, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">أكاديمية ماكس بي — MaxP Academy</h1>
              <p className="text-xs sm:text-sm text-slate-400">إدارة وبيع الدورات التدريبية المعتمدة مع كوتش الذكاء الاصطناعي</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/academy/catalog"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <span>بوابة الطلاب (الكتالوج)</span>
          </Link>
          <Link
            to="/academy/courses"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إدارة الكورسات</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">إجمالي الدورات</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-white">{courses.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">منشورة ومسودات</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">الطلاب المسجلين</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-sky-400">{totalEnrollments}</div>
          <div className="text-[11px] text-slate-500 mt-1">مشترك نشط</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">إجمالي الدروس</span>
            <PlayCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-purple-400">{totalLessons}</div>
          <div className="text-[11px] text-slate-500 mt-1">درس مزود بسكريبت</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">كوتش الـ AI</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-400">مُفعّل 100%</div>
          <div className="text-[11px] text-slate-500 mt-1">مقيد بسكريبتات الدروس</div>
        </div>
      </div>

      {/* Flagship Course Promo / Action Box */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 sm:p-6 mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>الدورة القيادية الجاهزة — Flagship Course</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">دورة الميديا باير المحترف — Performance Media Buyer (29 درساً)</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تم تجهيز الدورة بالكامل بـ 29 درساً مرتباً بالتسلسل، ومزودة بسكريبتات تدريبية متخصصة وكويزات تفاعلية وكوتش ذكي لا يهلوس ويجيب الطلاب فورياً.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/academy/courses"
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-900/40"
            >
              تعديل المنهج والدروس
            </Link>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-200">الدورات الحالية في الأكاديمية</h3>
          <Link to="/academy/courses" className="text-xs sm:text-sm text-emerald-400 hover:underline flex items-center gap-1">
            <span>عرض الكل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">جاري تحميل الدورات...</div>
        ) : courses.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">لا توجد دورات مسجلة بعد. يمكنك إنشاء دورتك الأولى أو تشغيل سكريبت التغذية.</p>
            <Link
              to="/academy/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
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
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ومتاح للبيع" : "مسودة قيد التجهيز"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{course.price > 0 ? `${course.price} EGP` : "مجاني"}</span>
                    </div>

                    <h4 className="font-bold text-white text-base leading-snug line-clamp-2">{course.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description || "لا يوجد وصف مختصر"}</p>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                      <span>{lessonCount} درساً ({course.freePreviewLessons} مجاناً)</span>
                      <span>{course._count?.enrollments || 0} طالباً</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2">
                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      إدارة الدروس
                    </Link>
                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 transition flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>عرض</span>
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
