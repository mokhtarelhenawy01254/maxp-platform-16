import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, PlayCircle, Clock, Award, ShieldCheck, Check, Sparkles, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { academyApi, Course, MyEnrollment } from "./academyApi";

export default function AcademyCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<MyEnrollment[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "my-courses">("catalog");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enroll modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalog();
    loadMyCourses();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await academyApi.getCatalog();
      setCourses(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل كتالوج الأكاديمية");
    } finally {
      setLoading(false);
    }
  };

  const loadMyCourses = async () => {
    try {
      const data = await academyApi.getMyCourses();
      setMyEnrollments(data);
    } catch (err) {
      console.error("Failed to load enrolled courses:", err);
    }
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      setEnrolling(true);
      await academyApi.enrollStudent(selectedCourse.id, {
        studentName: studentName.trim() || undefined,
        studentPhone: studentPhone.trim() || undefined,
        studentEmail: studentEmail.trim() || undefined,
      });

      // Navigate to course viewer
      navigate(`/academy/catalog/${selectedCourse.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل التسجيل في الدورة");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6" dir="rtl">
      {/* Banner */}
      <div className="max-w-5xl mx-auto py-6 sm:py-10 text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>منصة التعليم الاحترافية من ماكس بي</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          تعلم وطبّق عملياً مع كوتش الذكاء الاصطناعي
        </h1>
        <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          دورات تدريبية متخصصة في التجارة الإلكترونية، شراء الوسائط، والأتمتة — مربوطة بمتجر حقيقي ومزودة بمساعد ذكي يرافقك خطوة بخطوة.
        </p>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-center">
        <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "catalog"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>كتالوج الدورات المتاحة</span>
          </button>
          <button
            onClick={() => setActiveTab("my-courses")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "my-courses"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>دوراتي المشترك بها</span>
            {myEnrollments.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[11px] flex items-center justify-center font-mono">
                {myEnrollments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto">
        {activeTab === "catalog" ? (
          /* Catalog Tab */
          loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">جاري تجهيز كتالوج الدورات المتاحة...</div>
          ) : courses.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">لا توجد دورات منشورة حالياً</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                يرجى التحقق من لوحة الإدارة ونشر الدورات المطلوبة أولاً.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => {
                const allLessons = course.modules?.flatMap((m) => m.lessons) || [];

                return (
                  <div
                    key={course.id}
                    className="rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition overflow-hidden flex flex-col justify-between shadow-xl shadow-black/40 group"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {course.freePreviewLessons > 0 ? `أول ${course.freePreviewLessons} دروس مجاناً` : "دورة متقدمة"}
                          </span>
                          {course.isEnrolled && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مشترك بالفعل</span>
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-white font-mono">
                            {course.price > 0 ? `${course.price} EGP` : "مجاناً"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition">
                          {course.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
                          {course.description}
                        </p>
                      </div>

                      {/* Features checklist */}
                      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>{allLessons.length} درساً تطبيقياً مقسمة إلى {course.modules?.length || 0} وحدات</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>كوتش ذكاء اصطناعي تفاعلي للإجابة الفورية من سكريبت الدروس</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>اختبارات كويز وشهادة إتمام معتمدة فور إكمال الدورة</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center gap-3">
                      <Link
                        to={`/academy/catalog/${course.id}`}
                        className="flex-1 py-3 rounded-xl text-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      >
                        معاينة المنهج والدروس المجانية
                      </Link>

                      {course.isEnrolled ? (
                        <Link
                          to={`/academy/catalog/${course.id}`}
                          className="px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5"
                        >
                          <span>متابعة التعلم</span>
                          <ArrowLeft className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition"
                        >
                          تسجيل الآن
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* My Courses Tab */
          myEnrollments.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">لم تشترك في أي دورة بعد</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                تصفح الكتالوج واختر الدورة المناسبة لبدء رحلتك التعليمية مع كوتش الذكاء الاصطناعي.
              </p>
              <button
                onClick={() => setActiveTab("catalog")}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                تصفح الكتالوج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myEnrollments.map((enr) => (
                <div
                  key={enr.enrollmentId}
                  className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 flex flex-col justify-between shadow-xl shadow-black/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {enr.status === "COMPLETED" ? "مكتملة بنجاح" : "قيد التعلّم"}
                      </span>
                      {enr.certificate && (
                        <a
                          href={`/api/v1/academy/certificates/${enr.enrollmentId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Award className="w-4 h-4" />
                          <span>عرض الشهادة المعتمدة</span>
                        </a>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white">{enr.course.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 line-clamp-2">{enr.course.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>نسبة الإنجاز</span>
                        <span className="font-mono text-emerald-400 font-bold">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(enr.progressPercent, 4)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        أكملت {enr.completedCount} من أصل {enr.totalLessons} درساً
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <Link
                      to={`/academy/catalog/${enr.course.id}`}
                      className="w-full py-3 rounded-xl text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2"
                    >
                      <span>متابعة الكورس الآن</span>
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Quick Enroll Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white">
              التسجيل في دورة: {selectedCourse.title}
            </h2>
            <p className="text-xs text-slate-400">
              أدخل بياناتك لتفعيل اشتراكك الفوري وبدء مشاهدة الدروس وتدريبات الكوتش الذكي.
            </p>

            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف / واتساب *</label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {enrolling ? "جاري التفعيل..." : "تأكيد والبدء فوراً"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
