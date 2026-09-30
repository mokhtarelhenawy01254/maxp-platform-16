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
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6" dir="rtl">
      {/* Banner */}
      <div className="max-w-5xl mx-auto py-6 sm:py-10 text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>منصة التعليم الاحترافية من ماكس بي</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          تعلم وطبّق عملياً مع كوتش الذكاء الاصطناعي
        </h1>
        <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          دورات تدريبية متخصصة في التجارة الإلكترونية، شراء الوسائط، والأتمتة — مربوطة بمتجر حقيقي ومزودة بمساعد ذكي يرافقك خطوة بخطوة.
        </p>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-center">
        <div className="bg-muted/60 border border-border/60 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "catalog"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>كتالوج الدورات المتاحة</span>
          </button>
          <button
            onClick={() => setActiveTab("my-courses")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "my-courses"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>دوراتي المشترك بها</span>
            {myEnrollments.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center font-mono font-bold">
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
            <div className="py-20 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">جاري تجهيز كتالوج الدورات المتاحة...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">لا توجد دورات منشورة حالياً</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
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
                    className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between shadow-xs group"
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {course.isGlobal && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>كورس رسمي من MaxP</span>
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {course.freePreviewLessons > 0 ? `أول ${course.freePreviewLessons} دروس مجاناً` : "دورة متقدمة"}
                          </span>
                          {course.isEnrolled && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مشترك بالفعل</span>
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-foreground font-mono">
                            {course.price > 0 ? `${course.price} EGP` : "مجاناً"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition">
                          {course.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                          {course.description}
                        </p>
                      </div>

                      {/* Features checklist */}
                      <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{allLessons.length} درساً تطبيقياً مقسمة إلى {course.modules?.length || 0} وحدات</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>كوتش ذكاء اصطناعي تفاعلي للإجابة الفورية من سكريبت الدروس</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>اختبارات كويز وشهادة إتمام معتمدة فور إكمال الدورة</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center gap-3">
                      <Link
                        to={`/academy/catalog/${course.id}`}
                        className="flex-1 py-2.5 sm:py-3 rounded-xl text-center text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/60 transition shadow-xs"
                      >
                        معاينة المنهج والدروس المجانية
                      </Link>

                      {course.isEnrolled ? (
                        <Link
                          to={`/academy/catalog/${course.id}`}
                          className="px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition flex items-center gap-1.5 active:scale-[0.97]"
                        >
                          <span>ادخل الكورس</span>
                          <ArrowLeft className="w-4 h-4" />
                        </Link>
                      ) : course.price > 0 && course.storeProductId ? (
                        // كورس مدفوع مرتبط بمنتج → وجّه للمتجر
                        <a
                          href={`/store/products/${course.storeProductId}`}
                          className="px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition active:scale-[0.97]"
                        >
                          اشترك الآن
                        </a>
                      ) : course.price > 0 ? (
                        // كورس مدفوع بدون ربط منتج بعد
                        <span className="px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-muted text-muted-foreground border border-border/60 cursor-not-allowed">
                          قريباً في المتجر
                        </span>
                      ) : (
                        // كورس مجاني → تسجيل مباشر
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition active:scale-[0.97]"
                        >
                          سجّل مجاناً
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
            <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">لم تشترك في أي دورة بعد</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                تصفح الكتالوج واختر الدورة المناسبة لبدء رحلتك التعليمية مع كوتش الذكاء الاصطناعي.
              </p>
              <button
                onClick={() => setActiveTab("catalog")}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                تصفح الكتالوج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myEnrollments.map((enr) => (
                <div
                  key={enr.enrollmentId}
                  className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 p-5 sm:p-6 space-y-5 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {enr.status === "COMPLETED" ? "مكتملة بنجاح" : "قيد التعلّم"}
                      </span>
                      {enr.certificate && (
                        <a
                          href={`/api/v1/academy/certificates/${enr.enrollmentId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 flex items-center gap-1"
                        >
                          <Award className="w-4 h-4" />
                          <span>عرض الشهادة المعتمدة</span>
                        </a>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-foreground">{enr.course.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{enr.course.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>نسبة الإنجاز</span>
                        <span className="font-mono text-primary font-bold">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(enr.progressPercent, 4)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        أكملت {enr.completedCount} من أصل {enr.totalLessons} درساً
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <Link
                      to={`/academy/catalog/${enr.course.id}`}
                      className="w-full py-2.5 sm:py-3 rounded-xl text-center text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              التسجيل في دورة: {selectedCourse.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              أدخل بياناتك لتفعيل اشتراكك الفوري وبدء مشاهدة الدروس وتدريبات الكوتش الذكي.
            </p>

            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الهاتف / واتساب *</label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 transition"
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
