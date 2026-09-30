import { useEffect, useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Award,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  X,
  MessageCircle,
  GraduationCap,
  Loader2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { academyApi, Course, MyEnrollment } from "./academyApi";
import { useAuth } from "../../hooks/useAuthSimple";

export default function AcademyCatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<MyEnrollment[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "my-courses">("catalog");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FREE" | "PAID" | "ENROLLED">("ALL");

  // Enroll modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);

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
      const msg = err?.response?.data?.error || "فشل تحميل كتالوج الأكاديمية";
      setError(msg);
      toast.error(msg);
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

  const handleOpenEnrollModal = (course: Course) => {
    setSelectedCourse(course);
    // Prefill from authenticated user profile
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    setStudentName(fullName || (user as any)?.name || "");
    setStudentPhone((user as any)?.phone || "");
    setStudentEmail(user?.email || "");
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

      toast.success(`تم تسجيلك في دورة "${selectedCourse.title}" بنجاح!`);

      // Update state locally
      setCourses((prev) =>
        prev.map((c) => (c.id === selectedCourse.id ? { ...c, isEnrolled: true } : c))
      );
      loadMyCourses();

      const targetCourseId = selectedCourse.id;
      setSelectedCourse(null);
      navigate(`/academy/catalog/${targetCourseId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "فشل التسجيل في الدورة";
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  // Filtered Catalog Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Type filter
      if (typeFilter === "FREE" && c.price > 0) return false;
      if (typeFilter === "PAID" && c.price <= 0) return false;
      if (typeFilter === "ENROLLED" && !c.isEnrolled) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = (c.title || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [courses, typeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6" dir="rtl">
      {/* Banner Hero */}
      <div className="max-w-5xl mx-auto py-6 sm:py-9 text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>منصة التعليم والتدريب التطبيقي من MaxP</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          تعلم وطبّق عملياً مع كوتش الذكاء الاصطناعي
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          دورات متخصصة في التجارة الإلكترونية، شراء الوسائط، والأتمتة — مربوطة ببيئة عمل حقيقية ومصحح آلي للتمارين لتقييم أدائك خطوة بخطوة.
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
            <span>كتالوج الدورات المتاحة ({courses.length})</span>
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
          <>
            {/* Search & Filter Bar */}
            <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن دورة أو موضوع..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-muted-foreground font-medium ml-1 flex-shrink-0">عرض:</span>
                {[
                  { id: "ALL", label: "الكل" },
                  { id: "FREE", label: "مجاني" },
                  { id: "PAID", label: "مدفوع" },
                  { id: "ENROLLED", label: "مشترك بها" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      typeFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">جاري تجهيز كتالوج الدورات المتاحة...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {searchQuery || typeFilter !== "ALL"
                    ? "لا توجد دورات تطابق خيارات البحث الحالية"
                    : "لا توجد دورات منشورة حالياً"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || typeFilter !== "ALL"
                    ? "جرّب تغيير كلمات البحث أو مسح الفلتر لإظهار بقية الكورسات المتاحة."
                    : "يرجى التحقق من لوحة الإدارة ونشر الدورات المطلوبة أولاً."}
                </p>
                {(searchQuery || typeFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("ALL");
                    }}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                  >
                    إعادة ضبط الفلتر
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCourses.map((course) => {
                  const allLessons = course.modules?.flatMap((m) => m.lessons) || [];

                  return (
                    <div
                      key={course.id}
                      className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between shadow-xs group"
                    >
                      {/* Course Cover / Thumbnail */}
                      {course.thumbnailUrl ? (
                        <div className="w-full h-40 sm:h-44 overflow-hidden relative bg-muted/40 border-b border-border/60">
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 right-3 text-white font-mono font-bold text-sm bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                            {course.price > 0 ? `${course.price} EGP` : "مجاناً"}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 sm:h-28 bg-gradient-to-l from-primary/15 via-primary/5 to-muted border-b border-border/60 p-4 flex items-center justify-between">
                          <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <span className="text-lg font-bold text-foreground font-mono">
                            {course.price > 0 ? `${course.price} EGP` : "مجاناً"}
                          </span>
                        </div>
                      )}

                      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
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

                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition">
                              {course.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                              {course.description || "دورة تدريبية متخصصة ومكثفة مع تطبيقات عملية وكوتش ذكي للمتابعة."}
                            </p>
                          </div>
                        </div>

                        {/* Features checklist */}
                        <div className="space-y-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span>{allLessons.length} درساً تطبيقياً مقسمة إلى {course.modules?.length || 0} وحدات</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span>كوتش ذكاء اصطناعي تفاعلي للإجابة الفورية من سكريبت الدروس</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span>اختبارات كويز وشهادة إتمام معتمدة فور إكمال الدورة</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center gap-3">
                        <Link
                          to={`/academy/catalog/${course.id}`}
                          className="flex-1 py-2.5 sm:py-3 rounded-xl text-center text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/60 transition shadow-xs"
                        >
                          معاينة المنهج والدروس
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
                          <a
                            href={`/store/products/${course.storeProductId}`}
                            className="px-5 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition active:scale-[0.97]"
                          >
                            شراء الدورة
                          </a>
                        ) : course.price > 0 ? (
                          <a
                            href={`https://wa.me/201000000000?text=${encodeURIComponent(`مرحباً، أود الاستفسار والاشتراك في كورس: ${course.title}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 sm:py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1.5 active:scale-[0.97]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>تواصل للاشتراك</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleOpenEnrollModal(course)}
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
            )}
          </>
        ) : (
          /* My Courses Tab */
          myEnrollments.length === 0 ? (
            <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">لم تشترك في أي دورة بعد</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                تصفح كتالوج الدورات واختر الدورة المناسبة لبدء رحلتك التعليمية مع كوتش الذكاء الاصطناعي.
              </p>
              <button
                onClick={() => setActiveTab("catalog")}
                className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
                        {enr.status === "COMPLETED" ? "مكتملة بنجاح" : "قيد التعلم"}
                      </span>
                      {enr.certificate && (
                        <a
                          href={`/api/v1/academy/certificates/${enr.enrollmentId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
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
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                التسجيل في دورة: {selectedCourse.title}
              </h2>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              أدخل بياناتك لتفعيل اشتراكك الفوري وبدء مشاهدة الدروس وتدريبات الكوتش الذكي.
            </p>

            <form onSubmit={handleEnroll} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">رقم الهاتف / واتساب *</label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono shadow-xs"
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {enrolling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تأكيد والبدء فوراً</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
