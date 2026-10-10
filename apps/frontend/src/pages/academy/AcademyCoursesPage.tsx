import { useEffect, useState, type FormEvent } from "react";
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
  ShoppingCart,
  Shield,
  Lock,
  Tag,
  Globe,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { academyApi, Course, AcademyStoreProduct } from "./academyApi";

export default function AcademyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [storeProducts, setStoreProducts] = useState<AcademyStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Course Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("1499");
  const [newPreviewCount, setNewPreviewCount] = useState("2");
  const [newStoreProductId, setNewStoreProductId] = useState("");
  const [newVisibility, setNewVisibility] = useState<"PUBLIC" | "UNLISTED" | "INVITE_ONLY" | "TAG_GATED">("PUBLIC");
  const [newAllowedTags, setNewAllowedTags] = useState("");
  const [newEnableWatermark, setNewEnableWatermark] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Manual Sync Order Modal
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
    } catch (_) {
      // Non-blocking
    }
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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setSubmitting(true);
      const tagsArray = newAllowedTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await academyApi.createCourse({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        price: Number(newPrice) || 0,
        freePreviewLessons: Number(newPreviewCount) || 2,
        storeProductId: newStoreProductId.trim() || undefined,
        visibility: newVisibility,
        allowedTags: newVisibility === "TAG_GATED" ? tagsArray : [],
        enableWatermark: newEnableWatermark,
      });
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewAllowedTags("");
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

  const handleSyncOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!syncOrderNumber.trim()) return;
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await academyApi.syncOrderEnrollment(syncOrderNumber.trim());
      if (res.success && res.enrolled > 0) {
        setSyncResult({
          success: true,
          message: `تم بنجاح! تم تسجيل الطالب في ${res.enrolled} دورة مرتبطة بالطلب.`,
        });
        loadCourses();
      } else if (res.success) {
        setSyncResult({
          success: false,
          message: res.message || "الطلب لا يحتوي على منتجات مرتبطة بكورسات، أو تم تسجيل الطالب مسبقاً.",
        });
      } else {
        setSyncResult({
          success: false,
          message: res.message || "تعذر إتمام المزامنة",
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.response?.data?.error || "فشل مزامنة الطلب. تأكد من صحة رقم الطلب.",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              إدارة الدورات التدريبية
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              أنشئ المناهج، واربطها بمنتجات المتجر للتسجيل التلقائي فور الدفع، واضبط الخصوصية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setSyncResult(null);
              setSyncOrderNumber("");
              setIsSyncModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
            title="مزامنة تسجيل طالب يدوياً لطلب تم سداده"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>مزامنة طلب سداد</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء كورس جديد</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Courses List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">جاري تحميل الدورات...</div>
        ) : courses.length === 0 ? (
          <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground/60 mx-auto" />
            <h3 className="text-base font-bold text-foreground">لا توجد كورسات مضافة بعد</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              ابدأ الآن بإنشاء أول دورة تعليمية، وقم بربطها بمنتج في المتجر لتمكين البيع التلقائي بالفيزا وفودافون كاش.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition active:scale-[0.98]"
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
                  className="rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.isPublished ? "منشور ونشط" : "مسودة مؤقتة"}
                      </span>

                      {/* Visibility Badge */}
                      {course.visibility === "UNLISTED" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>غير مدرج (رابط مباشر)</span>
                        </span>
                      )}
                      {course.visibility === "INVITE_ONLY" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>خاص (دعوة فقط)</span>
                        </span>
                      )}
                      {course.visibility === "TAG_GATED" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>مخصص لوسوم: {course.allowedTags?.join(", ") || "بدون تحديد"}</span>
                        </span>
                      )}
                      {(!course.visibility || course.visibility === "PUBLIC") && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>عام بالكتالوج</span>
                        </span>
                      )}

                      {/* Watermark Badge */}
                      {course.enableWatermark !== false && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>علامة مائية ضد التسريب</span>
                        </span>
                      )}

                      {/* Global Platform Course Badge */}
                      {course.isGlobal && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>كورس عام على المنصة</span>
                        </span>
                      )}

                      <span className="text-xs font-mono font-bold bg-muted text-foreground px-2 py-0.5 rounded-md">
                        {course.price > 0 ? `${course.price} EGP` : "مجاني"}
                      </span>

                      {course.storeProductId && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            <span>مربوط بمنتج: {course.storeProduct?.name || course.storeProductId}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>تسجيل تلقائي عند الدفع</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground">{course.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{course.description || "لا يوجد وصف"}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{course.modules?.length || 0} وحدات</span>
                      <span>•</span>
                      <span>{lessonCount} درساً ({course.freePreviewLessons} مجاناً)</span>
                      <span>•</span>
                      <span>{course._count?.enrollments || 0} مشترك</span>
                    </div>
                  </div>

                  {/* Actions (Single Depth Responsive Row) */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                    <button
                      onClick={() => handleTogglePublish(course)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        course.isPublished
                          ? "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      {course.isPublished ? "تحويل لمسودة" : "نشر الكورس"}
                    </button>

                    <Link
                      to={`/academy/courses/${course.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      <span>تعديل المنهج</span>
                    </Link>

                    <Link
                      to={`/academy/catalog/${course.id}`}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition"
                      title="معاينة كطالب"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
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

      {/* New Course Modal (2026 Responsive Dialog) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="text-lg font-bold text-foreground">إنشاء دورة تدريبية جديدة</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">اسم الدورة *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: دورة احتراف إعلانات فيسبوك 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">وصف الدورة</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="نبذة عن المهارات التي سيكتسبها الطالب..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">سعر البيع (EGP)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الدروس المجانية (معاينة)</label>
                  <input
                    type="number"
                    value={newPreviewCount}
                    onChange={(e) => setNewPreviewCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  ربط بمنتج من المتجر (للتسجيل التلقائي فور الدفع)
                </label>
                {storeProducts.length > 0 ? (
                  <select
                    value={newStoreProductId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setNewStoreProductId(selId);
                      const prod = storeProducts.find((p) => p.id === selId);
                      if (prod && (!newPrice || newPrice === "0" || newPrice === "1499")) {
                        setNewPrice(String(prod.price));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- بدون ربط بمنتج متجر --</option>
                    {storeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} EGP {p.sku ? `- SKU: ${p.sku}` : ""})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newStoreProductId}
                    onChange={(e) => setNewStoreProductId(e.target.value)}
                    placeholder="ID المنتج في المتجر للاشتراك التلقائي فور الدفع"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                )}
                {storeProducts.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>
                      {newStoreProductId ? "⚡ التسجيل التلقائي مفعّل فور تأكيد وسداد طلب هذا المنتج" : "اختر المنتج الذي عند شرائه يتم تسجيل الطالب تلقائياً"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const customId = prompt("أدخل معرف المنتج (Store Product ID) يدوياً:", newStoreProductId);
                        if (customId !== null) setNewStoreProductId(customId.trim());
                      }}
                      className="text-primary hover:underline text-[11px]"
                    >
                      إدخال ID يدوي
                    </button>
                  </div>
                )}
              </div>

              {/* Privacy & Visibility */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    نطاق ظهور الدورة (الخصوصية والوصول)
                  </label>
                  <select
                    value={newVisibility}
                    onChange={(e: any) => setNewVisibility(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="PUBLIC">عام (معروض للجميع في كتالوج الأكاديمية)</option>
                    <option value="UNLISTED">غير مدرج (مخفي من الكتالوج ومتاح برابط مباشر فقط)</option>
                    <option value="INVITE_ONLY">خاص / دعوة فقط (لا يظهر إلا للمشتركين المسجلين)</option>
                    <option value="TAG_GATED">مخصص لوسوم معينة (يظهر فقط لعملاء بوسوم CRM محددة)</option>
                  </select>
                </div>

                {newVisibility === "TAG_GATED" && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      الوسوم المصرح لها برؤية الكورس (مفصولة بفواصل)
                    </label>
                    <input
                      type="text"
                      value={newAllowedTags}
                      onChange={(e) => setNewAllowedTags(e.target.value)}
                      placeholder="مثال: vip, agency, media_buyer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      سيظهر الكورس في الكتالوج فقط للعملاء الذين يمتلكون واحداً على الأقل من هذه الوسوم.
                    </p>
                  </div>
                )}

                {/* Watermark toggle */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEnableWatermark}
                    onChange={(e) => setNewEnableWatermark(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-primary border-input focus:ring-primary"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">تفعيل العلامة المائية ضد التسريب (Anti-Leak Watermark)</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      تعرض اسم ورقم هاتف وتوقيت دخول الطالب متحركاً على الفيديو لمنع تصوير الشاشة وتحديد المسرب.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? "جاري الإنشاء..." : "إنشاء الدورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Sync Paid Order Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">مزامنة طلب مدفوع</h2>
                  <p className="text-xs text-muted-foreground">تسجيل الطالب تلقائياً لطلب تم سداده مسبقاً</p>
                </div>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSyncOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  رقم الطلب (Order Number أو ID)
                </label>
                <input
                  type="text"
                  value={syncOrderNumber}
                  onChange={(e) => setSyncOrderNumber(e.target.value)}
                  placeholder="مثال: ORD-1002 أو رقم الأوردر"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  يقوم النظام بالبحث في بنود الطلب عن أي كورس مرتبط بمنتجات الطلب، وتسجيل الطالب فوراً دون تكرار.
                </p>
              </div>

              {syncResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    syncResult.success
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{syncResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={syncing || !syncOrderNumber.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                >
                  {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{syncing ? "جاري المزامنة..." : "بدء المزامنة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
