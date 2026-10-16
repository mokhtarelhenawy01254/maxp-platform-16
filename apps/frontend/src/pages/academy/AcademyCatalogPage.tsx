import { useEffect, useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  X,
  MessageCircle,
  Loader2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { academyApi, Course, MyEnrollment } from "./academyApi";
import { useAuth } from "../../hooks/useAuthSimple";
import { AcademyEnrollModal } from "./AcademyEnrollModal";
import { AcademyMyCoursesTab } from "./AcademyMyCoursesTab";

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
      <div className="max-w-4xl mx-auto py-4 sm:py-6 text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>منصة التعليم والتدريب التطبيقي من MaxP</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          تعلم وطبّق عملياً مع كوتش الذكاء الاصطناعي
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          دورات متخصصة في التجارة الإلكترونية، شراء الوسائط، والأتمتة - مربوطة ببيئة عمل حقيقية ومصحح آلي للتمارين لتقييم أدائك خطوة بخطوة.
        </p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-center">
        <div className="bg-muted/30 border border-border/70 p-1 rounded-xl flex items-center gap-1 shadow-xs">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
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
                  className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition active:scale-[0.98] ${
                      typeFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">جاري تجهيز كتالوج الدورات المتاحة...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-card border border-dashed border-border/80 text-center space-y-2.5 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {searchQuery || typeFilter !== "ALL"
                    ? "لا توجد دورات تطابق خيارات البحث الحالية"
                    : "لا توجد دورات منشورة حالياً"}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl bg-card border border-border/70 overflow-hidden flex flex-col justify-between shadow-xs hover:border-border transition-colors group"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {course.level === "BEGINNER"
                            ? "مبتدئ"
                            : course.level === "INTERMEDIATE"
                            ? "متوسط"
                            : "متقدم"}
                        </span>
                        <div className="font-mono text-xs font-bold text-foreground tabular-nums">
                          {course.price > 0 ? `${course.price} ج.م` : "مجاناً"}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono tabular-nums">
                        <span className="flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{course.lessonsCount || 0} درساً</span>
                        </span>
                        {course.certificateEnabled && (
                          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                            <Award className="w-3.5 h-3.5" />
                            <span>شهادة معتمدة</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-muted/20 border-t border-border/60 flex items-center gap-2">
                      <Link
                        to={`/academy/catalog/${course.id}`}
                        className="flex-1 py-1.5 rounded-lg text-center text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/70 transition shadow-xs active:scale-[0.98]"
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
                          <MessageCircle className="w-3.5 h-3.5" />
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
                ))}
              </div>
            )}
          </>
        ) : (
          <AcademyMyCoursesTab
            myEnrollments={myEnrollments}
            onBrowseCatalog={() => setActiveTab("catalog")}
          />
        )}
      </div>

      {/* Quick Enroll Modal Subcomponent */}
      <AcademyEnrollModal
        selectedCourse={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onSubmit={handleEnroll}
        studentName={studentName}
        setStudentName={setStudentName}
        studentPhone={studentPhone}
        setStudentPhone={setStudentPhone}
        studentEmail={studentEmail}
        setStudentEmail={setStudentEmail}
        enrolling={enrolling}
      />
    </div>
  );
}
