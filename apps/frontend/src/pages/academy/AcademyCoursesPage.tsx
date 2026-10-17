import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  PlayCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Tag,
  Globe,
  RefreshCw,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { academyApi, Course, AcademyStoreProduct } from "./academyApi";
import { AcademyCreateCourseModal } from "./AcademyCreateCourseModal";
import { AcademySyncOrderModal } from "./AcademySyncOrderModal";

export default function AcademyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [storeProducts, setStoreProducts] = useState<AcademyStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncOrderNumber, setSyncOrderNumber] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadCourses();
    loadStoreProducts();
  }, []);

  const loadStoreProducts = async () => {
    try {
      const prods = await academyApi.getStoreProducts();
      setStoreProducts(prods);
    } catch (_) {}
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await academyApi.getCourses();
      setCourses(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل الكورسات");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (payload: any) => {
    try {
      await academyApi.createCourse(payload);
      setIsModalOpen(false);
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إنشاء الدورة");
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      await academyApi.updateCourse(course.id, {
        isPublished: !course.isPublished,
      });
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تعديل حالة النشر");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدورة بالكامل وجميع محتوياتها؟")) return;
    try {
      await academyApi.deleteCourse(id);
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حذف الدورة");
    }
  };

  const handleSyncOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncOrderNumber.trim()) return;

    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await academyApi.syncOrderEnrollment(syncOrderNumber.trim());
      setSyncResult(res);
      loadCourses();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.response?.data?.error || "حدث خطأ أثناء مزامنة الطلب",
      });
    } finally {
      setSyncing(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q));
  });

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>إدارة الدورات والأكاديمية</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            بناء مناهج الدورات، الفيديوهات المحمية، وسكريبتات الذكاء الاصطناعي للمتدربين.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setSyncOrderNumber("");
              setSyncResult(null);
              setIsSyncModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span>مزامنة طلب يدوياً</span>
          </button>

          <Link
            to="/academy/catalog"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>عرض الكتالوج</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء دورة جديدة</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الدورات التدريبية..."
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
        <div className="text-xs text-muted-foreground font-mono tabular-nums">
          إجمالي الدورات: {filteredCourses.length}
        </div>
      </div>

      {/* Content Area */}
      <div>
        {loading ? (
          <div className="py-24 text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل الدورات التدريبية...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 sm:p-14 rounded-2xl bg-card border border-dashed border-border/80 text-center max-w-xl mx-auto space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {searchQuery ? "لا توجد دورات مطابقة لبحثك" : "لا توجد دورات تدريبية بعد"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? "جرب البحث بكلمات أخرى أو امسح شريط البحث لعرض كافة الدورات."
                : "ابدأ الآن في إنشاء أول دورة تدريبية لك على المنصة وأضف الفيديوهات والتمارين والاختبارات."}
            </p>
            {!searchQuery && (
              <div className="pt-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-xs active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء أول دورة الآن</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group rounded-2xl bg-card border border-border/70 hover:border-border transition-colors overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        course.isPublished
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {course.isPublished ? "منشور" : "مسودة"}
                    </span>

                    <div className="flex items-center gap-2">
                      {course.visibility === "PUBLIC" || !course.visibility ? (
                        <Globe className="w-3.5 h-3.5 text-sky-500" title="عام بالكتالوج" />
                      ) : course.visibility === "UNLISTED" ? (
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" title="غير مدرج" />
                      ) : course.visibility === "TAG_GATED" ? (
                        <Tag className="w-3.5 h-3.5 text-amber-500" title="مقيد بوسوم" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-rose-500" title="خاص" />
                      )}
                      <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                        {course.price > 0 ? `${course.price} ج.م` : "مجاني"}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {course.description || "لا يوجد وصف مدخل للدورة."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono tabular-nums">
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{course.lessonsCount || 0} درساً</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{course.enrolledCount || 0} طالباً</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98] flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>إدارة المنهج</span>
                    </Link>
                    <button
                      onClick={() => handleTogglePublish(course)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.98] ${
                        course.isPublished
                          ? "border-border/70 hover:bg-muted text-muted-foreground"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {course.isPublished ? "إلغاء النشر" : "نشر"}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition active:scale-[0.98]"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AcademyCreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        storeProducts={storeProducts}
      />

      <AcademySyncOrderModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSubmit={handleSyncOrder}
        syncOrderNumber={syncOrderNumber}
        setSyncOrderNumber={setSyncOrderNumber}
        syncing={syncing}
        syncResult={syncResult}
      />
    </div>
  );
}
