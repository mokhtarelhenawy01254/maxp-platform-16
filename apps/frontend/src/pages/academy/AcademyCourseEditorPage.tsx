import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  AlertCircle,
  Eye,
  Settings,
  Shield,
  Lock,
  Tag,
  Globe,
  Loader2,
} from "lucide-react";
import { academyApi, Course, Lesson, Question, AcademyStoreProduct } from "./academyApi";
import { AcademyCourseSettingsModal } from "./AcademyCourseSettingsModal";
import { AcademyLessonModal } from "./AcademyLessonModal";
import { AcademyQuizModal } from "./AcademyQuizModal";
import { AcademyAddModuleModal } from "./AcademyAddModuleModal";
import { AcademyModuleList } from "./AcademyModuleList";

export default function AcademyCourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [storeProducts, setStoreProducts] = useState<AcademyStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Module modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  // Lesson modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Quiz modal
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizLesson, setQuizLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (id) loadCourse();
    loadStoreProducts();
  }, [id]);

  const loadStoreProducts = async () => {
    try {
      const prods = await academyApi.getStoreProducts();
      setStoreProducts(prods);
    } catch (_) {}
  };

  const loadCourse = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await academyApi.getCourseDetails(id);
      setCourse(data);
    } catch (err: any) {
      // silently handle or log
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (payload: any) => {
    if (!id) return;
    try {
      await academyApi.updateCourse(id, payload);
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ إعدادات الدورة");
    }
  };

  const handleAddModule = async (title: string, desc?: string) => {
    if (!id) return;
    try {
      await academyApi.addModule(id, {
        title,
        description: desc,
        sortOrder: (course?.modules?.length || 0) + 1,
      });
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إضافة الوحدة");
    }
  };

  const openLessonModal = (modId: string, lesson?: Lesson) => {
    setSelectedModuleId(modId);
    setEditingLesson(lesson || null);
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (payload: any) => {
    if (!selectedModuleId) return;
    try {
      if (editingLesson) {
        await academyApi.updateLesson(editingLesson.id, payload);
      } else {
        await academyApi.addLesson(selectedModuleId, payload);
      }
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ الدرس");
    }
  };

  const openQuizModal = (lesson: Lesson) => {
    setQuizLesson(lesson);
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async (payload: { title: string; passScorePercent: number; questions: Question[] }) => {
    if (!quizLesson) return;
    try {
      await academyApi.saveLessonQuiz(quizLesson.id, payload);
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ الاختبار");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("هل تريد حذف هذه الوحدة ودروسها؟")) {
      await academyApi.deleteModule(moduleId);
      loadCourse();
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm("هل تريد حذف هذا الدرس؟")) {
      await academyApi.deleteLesson(lessonId);
      loadCourse();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل منهج الدورة...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground flex items-center justify-center p-8" dir="rtl">
        <div className="text-center space-y-3 p-8 rounded-2xl bg-card border border-border/70 max-w-md shadow-xs">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-base font-bold text-foreground">الدورة غير موجودة أو تم حذفها</h2>
          <p className="text-xs text-muted-foreground">يرجى التأكد من المعرف المطلوب أو اختيار دورة أخرى من القائمة.</p>
          <Link
            to="/academy/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs active:scale-[0.98]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لقائمة الدورات</span>
          </Link>
        </div>
      </div>
    );
  }

  const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Command Bar & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <Link
            to="/academy/courses"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition"
          >
            <ArrowRight className="w-3 h-3" />
            <span>العودة لكل الدورات</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{course.title}</h1>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                course.isPublished
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {course.isPublished ? "منشور" : "مسودة"}
            </span>

            {course.visibility === "UNLISTED" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>غير مدرج (رابط مباشر)</span>
              </span>
            )}
            {course.visibility === "INVITE_ONLY" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>خاص (دعوة فقط)</span>
              </span>
            )}
            {course.visibility === "TAG_GATED" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                <span>مخصص لوسوم: {course.allowedTags?.join(", ") || "بدون تحديد"}</span>
              </span>
            )}
            {(!course.visibility || course.visibility === "PUBLIC") && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" />
                <span>عام بالكتالوج</span>
              </span>
            )}

            {course.enableWatermark !== false && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                <span>علامة مائية نشطة</span>
              </span>
            )}

            <span className="text-xs font-mono font-bold bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border/70 tabular-nums">
              {course.price > 0 ? `${course.price.toLocaleString()} ج.م` : "مجاني"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>إعدادات الدورة</span>
          </button>

          <Link
            to={`/academy/catalog/${course.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>معاينة كطالب</span>
          </Link>
          <button
            onClick={() => setIsModuleModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة وحدة</span>
          </button>
        </div>
      </div>

      {/* Course Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-border transition-colors">
          <span className="text-[11px] text-muted-foreground font-medium">عدد الوحدات التدريبية</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {course.modules?.length || 0}
          </p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-border transition-colors">
          <span className="text-[11px] text-muted-foreground font-medium">إجمالي الدروس</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {lessonCount}
          </p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-border transition-colors">
          <span className="text-[11px] text-muted-foreground font-medium">دروس المعاينة المجانية</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {course.freePreviewLessons || 0}
          </p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-border transition-colors">
          <span className="text-[11px] text-muted-foreground font-medium">الطلاب المسجلين</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {course._count?.enrollments || 0}
          </p>
        </div>
      </div>

      {/* Modules & Lessons Curriculum */}
      <AcademyModuleList
        modules={course.modules}
        onOpenAddModule={() => setIsModuleModalOpen(true)}
        onOpenAddLesson={(modId) => openLessonModal(modId)}
        onOpenEditLesson={(modId, lesson) => openLessonModal(modId, lesson)}
        onOpenQuizModal={(lesson) => openQuizModal(lesson)}
        onDeleteModule={handleDeleteModule}
        onDeleteLesson={handleDeleteLesson}
      />

      {/* Add Module Modal */}
      <AcademyAddModuleModal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        onAdd={handleAddModule}
      />

      {/* Settings Modal */}
      <AcademyCourseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        course={course}
        storeProducts={storeProducts}
        onSave={handleSaveSettings}
      />

      {/* Lesson Modal */}
      <AcademyLessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        moduleId={selectedModuleId}
        editingLesson={editingLesson}
        onSave={handleSaveLesson}
      />

      {/* Quiz Modal */}
      <AcademyQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        lesson={quizLesson}
        onSave={handleSaveQuiz}
      />
    </div>
  );
}
