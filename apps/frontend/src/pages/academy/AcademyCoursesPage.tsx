import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus, PlayCircle, Edit3, Trash2, CheckCircle2, AlertCircle, Eye, ShoppingCart } from "lucide-react";
import { academyApi, Course } from "./academyApi";

export default function AcademyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Course Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("1499");
  const [newPreviewCount, setNewPreviewCount] = useState("2");
  const [newStoreProductId, setNewStoreProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setSubmitting(true);
      await academyApi.createCourse({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        price: Number(newPrice) || 0,
        freePreviewLessons: Number(newPreviewCount) || 2,
        storeProductId: newStoreProductId.trim() || undefined,
      });
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إنشاء الدورة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      const nextPublished = !course.isPublished;
      await academyApi.updateCourse(course.id, { isPublished: nextPublished });
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "تعذر تعديل حالة النشر");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدورة وكافة وحداتها ودروسها؟")) return;
    try {
      await academyApi.deleteCourse(courseId);
      loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حذف الدورة");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>إدارة الدورات التدريبية</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            أنشئ المناهج، وحدد أسعار البيع، واضبط الدروس التجريبية المجانية
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كورس جديد</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Courses List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">جاري تحميل الدورات...</div>
        ) : courses.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">لا توجد كورسات مضافة بعد</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              ابدأ الآن بإنشاء أول دورة تعليمية، وقم بربطها بمنتج في المتجر لتمكين البيع التلقائي بالفيزا وفودافون كاش.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              إنشاء كورس الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {courses.map((course) => {
              const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
              return (
                <div
                  key={course.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ونشط" : "مسودة (غير معروض للطلاب)"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-md">
                        {course.price > 0 ? `${course.price} EGP` : "مجاني"}
                      </span>
                      {course.storeProductId && (
                        <span className="text-[11px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span>مربوط بالمتجر</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white">{course.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 line-clamp-1">{course.description || "لا يوجد وصف"}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{course.modules?.length || 0} وحدات</span>
                      <span>•</span>
                      <span>{lessonCount} درساً ({course.freePreviewLessons} مجاناً)</span>
                      <span>•</span>
                      <span>{course._count?.enrollments || 0} مشترك</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => handleTogglePublish(course)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        course.isPublished
                          ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                          : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {course.isPublished ? "تحويل لمسودة" : "نشر الكورس"}
                    </button>

                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل المنهج</span>
                    </Link>

                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="معاينة كطالب"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">إنشاء دورة تدريبية جديدة</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الدورة *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: دورة احتراف إعلانات فيسبوك 2026"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وصف الدورة</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="نبذة عن المهارات التي سيكتسبها الطالب..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">سعر البيع (EGP)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الدروس المجانية (معاينة)</label>
                  <input
                    type="number"
                    value={newPreviewCount}
                    onChange={(e) => setNewPreviewCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  معرف منتج المتجر (اختياري للربط التلقائي)
                </label>
                <input
                  type="text"
                  value={newStoreProductId}
                  onChange={(e) => setNewStoreProductId(e.target.value)}
                  placeholder="ID المنتج في المتجر للاشتراك التلقائي فور الدفع"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  {submitting ? "جاري الإنشاء..." : "إنشاء الدورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
