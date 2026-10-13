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
  ChevronLeft,
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

  const supportPhone = useMemo(() => {
    const raw = (
      user?.company?.phone ||
      (typeof window !== "undefined" && (window as any)?.__ENV__?.VITE_SUPPORT_WHATSAPP_NUMBER) ||
      "201123087745"
    ).replace(/[^0-9]/g, "");
    return raw.startsWith("0") ? `2${raw}` : raw;
  }, [user]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (typeFilter === "FREE" && c.price > 0) return false;
      if (typeFilter === "PAID" && c.price <= 0) return false;
      if (typeFilter === "ENROLLED" && !c.isEnrolled) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = (c.title || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [courses, typeFilter, searchQuery]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Banner Hero (Single-surface) */}
      <div className="max-w-4xl mx-auto py-4 sm:py-6 text-center space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>منصة التعليم والتدريب التطبيقي من MaxP</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          تعلم وطبّق عملياً مع كوتش الذكاء الاصطناعي
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          دورات متخصصة في التجارة الإلكترونية، شراء الوسائط، والأتمتة — مربوطة ببيئة عمل حقيقية ومصحح آلي للتمارين لتقييم أدائك خطوة بخطوة.
        </p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-center">
        <div className="bg-muted/40 border border-border/70 p-1 rounded-xl flex items-center gap-1 shadow-xs">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === "catalog"
                ? "bg-card text-foreground shadow-xs border border-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>كتالوج الدورات ({courses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("my-courses")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === "my-courses"
                ? "bg-card text-foreground shadow-xs border border-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>دوراتي المشترك بها</span>
            {myEnrollments.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-mono font-bold">
                {myEnrollments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto">
        {activeTab === "catalog" ? (
          <>
            {/* Search & Filter Bar */}
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن دورة أو موضوع..."
                  className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] text-muted-foreground font-medium ml-1 flex-shrink-0">عرض:</span>
                {[
                  { id: "ALL", label: "الكل" },
                  { id: "FREE", label: "مجاني" },
                  { id: "PAID", label: "مدفوع" },
                  { id: "ENROLLED", label: "مشترك بها" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
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
              <div className="py-20 text-center space-y-2">
                <Loader2 className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">جاري تجهيز كتالوج الدورات المتاحة...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-2.5 shadow-xs">
                <BookOpen className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {searchQuery || typeFilter !== "ALL"
                    ? "لا توجد دورات تطابق خيارات البحث الحالية"
                    : "لا توجد دورات منشورة حالياً"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
                    className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                  >
                    إعادة ضبط الفلتر
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredCourses.map((course) => {
                  const allLessons = course.modules?.flatMap((m) => m.lessons) || [];

                  return (
                    <div
                      key={course.id}
                      className="rounded-xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between shadow-xs group"
                    >
                      {/* Course Cover / Thumbnail */}
                      {course.thumbnailUrl ? (
                        <div className="w-full h-36 sm:h-40 overflow-hidden relative bg-muted/40 border-b border-border/60">
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-2.5 right-2.5 text-white font-mono font-bold text-xs bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs tabular-nums">
                            {course.price > 0 ? `${course.price.toLocaleString()} ج.م` : "مجاناً"}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 sm:h-24 bg-gradient-to-l from-primary/15 via-primary/5 to-muted border-b border-border/70 p-3.5 flex items-center justify-between">
                          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <span className="text-base font-bold text-foreground font-mono tabular-nums">
                            {course.price > 0 ? `${course.price.toLocaleString()} ج.م` : "مجاناً"}
                          </span>
                        </div>
                      )}

                      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {course.isGlobal && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>كورس رسمي من MaxP</span>
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {course.freePreviewLessons > 0 ? `أول ${course.freePreviewLessons} دروس مجاناً` : "دورة متقدمة"}
                            </span>
                            {course.isEnrolled && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مشترك بالفعل</span>
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition leading-snug">
                              {course.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                              {course.description || "دورة تدريبية متخصصة ومكثفة مع تطبيقات عملية وكوتش ذكي للمتابعة."}
                            </p>
                          </div>
                        </div>

                        {/* Features checklist */}
                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Video className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>{allLessons.length} درساً تطبيقياً مقسمة إلى {course.modules?.length || 0} وحدات</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>كوتش ذكاء اصطناعي تفاعلي للإجابة الفورية من سكريبت الدروس</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span>اختبارات كويز وشهادة إتمام معتمدة فور إكمال الدورة</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 border-t border-border/70 flex items-center gap-2">
                        <Link
                          to={`/academy/catalog/${course.id}`}
                          className="flex-1 py-1.5 rounded-lg text-center text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/70 transition shadow-xs"
                        >
                          معاينة المنهج
                        </Link>

                        {course.isEnrolled ? (
                          <Link
                            to={`/academy/catalog/${course.id}`}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition flex items-center gap-1 active:scale-[0.98]"
                          >
                            <span>ادخل الكورس</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </Link>
                        ) : course.price > 0 && course.storeProductId ? (
                          <a
                            href={`/products/${course.storeProductId}`}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98]"
                          >
                            شراء الدورة
                          </a>
                        ) : course.price > 0 ? (
                          <a
                            href={`https://wa.me/${supportPhone}?text=${encodeURIComponent(`مرحباً، أود الاستفسار والاشتراك في كورس: ${course.title}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition flex items-center gap-1 active:scale-[0.98]"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>تواصل للاشتراك</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleOpenEnrollModal(course)}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98]"
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
            <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-2.5 shadow-xs">
              <BookOpen className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">لم تشترك في أي دورة بعد</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                تصفح كتالوج الدورات واختر الدورة المناسبة لبدء رحلتك التعليمية مع كوتش الذكاء الاصطناعي.
              </p>
              <button
                onClick={() => setActiveTab("catalog")}
                className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                تصفح الكتالوج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {myEnrollments.map((enr) => (
                <div
                  key={enr.enrollmentId}
                  className="rounded-xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {enr.status === "COMPLETED" ? "مكتملة بنجاح" : "قيد التعلم"}
                      </span>
                      {enr.certificate && (
                        <a
                          href={`/api/v1/academy/certificates/${enr.enrollmentId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>عرض الشهادة المعتمدة</span>
                        </a>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground">{enr.course.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{enr.course.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>نسبة الإنجاز</span>
                        <span className="font-mono text-primary font-bold tabular-nums">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(enr.progressPercent, 4)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        أكملت {enr.completedCount} من أصل {enr.totalLessons} درساً
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <Link
                      to={`/academy/catalog/${enr.course.id}`}
                      className="w-full py-2 rounded-lg text-center text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>متابعة الكورس الآن</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                التسجيل في دورة: {selectedCourse.title}
              </h2>
              <button
                onClick={() => setSelectedCourse(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              أدخل بياناتك لتفعيل اشتراكك الفوري وبدء مشاهدة الدروس وتدريبات الكوتش الذكي.
            </p>

            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
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
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {enrolling && <Loader2 className="w-3 h-3 animate-spin" />}
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
