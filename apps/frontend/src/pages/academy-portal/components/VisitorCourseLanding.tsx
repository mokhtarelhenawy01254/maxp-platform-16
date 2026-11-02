import React from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { CourseCurriculumAccordion, ModuleItem, LessonItem } from "./CourseCurriculumAccordion";
import { CourseFaqSection } from "./CourseFaqSection";
import { formatArabicModules, formatArabicLessons } from "../utils/arabicPlural";

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  freePreviewLessons: number;
  thumbnailUrl?: string | null;
  storeProductId?: string | null;
  storeProduct?: { id: string; name?: string; price?: number } | null;
}

interface Props {
  course: CourseData;
  modules: ModuleItem[];
  totalLessons: number;
  freeLessons: number;
  firstLesson: LessonItem | null;
  isLoggedIn: boolean;
  studentName: string | null;
  studentPhone: string | null;
  copiedShare: boolean;
  onShare: () => void;
  onCheckout: () => void;
  storeProductId?: string | null;
}

export const VisitorCourseLanding: React.FC<Props> = ({
  course,
  modules,
  totalLessons,
  freeLessons,
  firstLesson,
  isLoggedIn,
  studentName,
  copiedShare,
  onShare,
  onCheckout,
  storeProductId,
}) => {
  const isFreeCourse = Number(course.price) <= 0;
  const isDefaultCourse = course.id === "cmuzmwaxs07r2juml2v04xon5";

  // Check valid store product ID (fallback to null if storeProduct was explicitly resolved to null)
  const candidateProductId = storeProductId ?? course.storeProductId ?? null;
  const effectiveStoreProductId =
    candidateProductId && course.storeProduct !== null ? candidateProductId : null;
  const storeProductUrl = effectiveStoreProductId ? `/store/product/${effectiveStoreProductId}` : null;

  // Single primary CTA target
  const startLearningUrl = firstLesson
    ? `/portal/course/${course.id}/lesson/${firstLesson.id}`
    : `/portal/catalog`;

  return (
    <div className="space-y-10 text-right" dir="rtl">
      {/* 1. Logged-in but not enrolled status notice */}
      {isLoggedIn && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-indigo-950 font-bold">
            <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              مرحباً بك يا {studentName || "عضو MaxP"} — حسابك مسجّل في الأكاديمية.
              {isFreeCourse
                ? " يمكنك البدء في دراسة الكورس فوراً مجاناً."
                : " كمّل اشتراكك لفتح كامل الدروس والتمارين والتواصل مع الكوتش."}
            </span>
          </div>
          {isFreeCourse ? (
            <Link
              to={startLearningUrl}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <span>ابدأ الآن مجانًا</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          ) : storeProductUrl ? (
            <Link
              to={storeProductUrl}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <span>إتمام الاشتراك — {course.price} ج.م</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCheckout}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs"
              >
                <span>إتمام الاشتراك — {course.price} ج.م</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-indigo-700/80 font-medium">
                (الدفع داخل المنصة)
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Hero Section — Unified Single CTA */}
      <section className="bg-card rounded-3xl border border-border/80 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isFreeCourse
                  ? `كورس تدريبي مجاني · ${formatArabicLessons(totalLessons)}`
                  : `${formatArabicLessons(totalLessons)}${
                      freeLessons > 0 ? ` · أول ${formatArabicLessons(freeLessons)} معاينة مجانًا` : ""
                    }`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-tight text-balance">
              {course.title ||
                (isDefaultCourse
                  ? "من أول إعلان… لأول نظام — كورس صاحب المحل"
                  : "تفاصيل الكورس التدريبي")}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl text-pretty">
              {course.description ||
                (isDefaultCourse
                  ? "مسار عملي متكامل يأخذك من أول خطوة في فهم عميلك وتحديد سعرك، وحتى إطلاق حملتك وقراءة أرقام أرباحك الحقيقية بدقة على شاشات المنصة."
                  : "منهج عملي مكثف يركز على التطبيق المباشر خطوة بخطوة للوصول إلى أفضل النتائج الترويجية والتشغيلية.")}
            </p>

            {/* Single Primary Action Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isFreeCourse ? (
                <Link
                  to={startLearningUrl}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>ابدأ مجانًا</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  {storeProductUrl ? (
                    <Link
                      to={storeProductUrl}
                      className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
                    >
                      <span>اشترك الآن — {course.price} ج.م</span>
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={onCheckout}
                        className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
                      >
                        <span>اشترك الآن — {course.price} ج.م</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-muted-foreground font-medium">
                        (الدفع داخل المنصة)
                      </span>
                    </div>
                  )}

                  {firstLesson && freeLessons > 0 && (
                    <Link
                      to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
                      className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-muted/60 hover:bg-muted text-foreground font-bold text-xs transition-colors flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span>معاينة أول درس</span>
                    </Link>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={onShare}
                title="مشاركة رابط الكورس"
                className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted/40 text-foreground font-bold text-xs transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">تم نسخ الرابط!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                    <span>مشاركة الكورس</span>
                  </>
                )}
              </button>
            </div>

            {/* Feature Chips (Clean, grammatical, zero production status) */}
            <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="px-3 py-1 rounded-lg bg-muted/50 border border-border/40 font-mono">
                {formatArabicModules(modules.length)} · {formatArabicLessons(totalLessons)}
              </span>
              <span className="px-3 py-1 rounded-lg bg-muted/50 border border-border/40">
                كوتش ذكي متخصص في محتوى الدرس
              </span>
              <span className="px-3 py-1 rounded-lg bg-muted/50 border border-border/40">
                تمارين عملية وتطبيقية على المنصة
              </span>
              {!isFreeCourse && freeLessons > 0 && (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-medium">
                  أول {formatArabicLessons(freeLessons)} متاحة للمعاينة
                </span>
              )}
            </div>
          </div>

          {(course.thumbnailUrl || isDefaultCourse) && (
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-border/90 shadow-xs bg-muted/20 aspect-square">
                <img
                  src={course.thumbnailUrl || "/og/p1_course-path_1080x1080.png"}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Target Audience / Who it's for (Condensed, crisp single card) */}
      <section className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="space-y-1">
          <span className="text-xs font-bold text-primary">لمن هذا الكورس</span>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            أصحاب المشاريع والمتاجر الذين يديرون تسويقهم بأنفسهم
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
            صُمم هذا المسار ليعطيك الرؤية العملية الشاملة من البداية وحتى تحقيق النتائج وقياس الأرباح الحقيقية.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-foreground">تحديد العميل والعرض</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              فهم دقيق للجمهور المستهدف وصياغة عروض بيع تسحب الطلبات وتغطي تكاليفك.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-foreground">تنفيذ الحملات وقراءة الأرقام</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              إطلاق إعلاناتك وربطها بالواتساب، ومتابعة ربحية كل إعلان دون أي تشتت.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-foreground">تطبيق عملي مع الكوتش</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              تطبيق على شاشات المنصة خطوة بخطوة مع كوتش ذكي يساعدك في التمارين.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Curriculum Accordion */}
      <section className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary">المحتوى الأكاديمي</span>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {formatArabicModules(modules.length)} · {formatArabicLessons(totalLessons)} — مسار تدريبي منظم
            </h2>
            <p className="text-xs text-muted-foreground">
              كل درس يقدم خطوة عملية محددة قابلة للتنفيذ المباشر.
            </p>
          </div>
          {!isFreeCourse && freeLessons > 0 && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
              أول {formatArabicLessons(freeLessons)} متاحة مجاناً للمعاينة
            </span>
          )}
        </div>

        <CourseCurriculumAccordion
          courseId={course.id}
          modules={modules}
          isFreeCourse={isFreeCourse}
          isEnrolled={false}
        />
      </section>

      {/* 5. Mini FAQ (3 Clear Real Questions) */}
      <CourseFaqSection price={course.price} isFreeCourse={isFreeCourse} />

      {/* 6. Closing Card for Paid Courses Only (Single CTA) */}
      {!isFreeCourse && (
        <section className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white text-center space-y-4 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ابدأ مسارك التدريبي اليوم
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed text-pretty">
            انضم الآن واستفد من كامل المنهج والتمارين العملية مع الكوتش الذكي في حسابك.
          </p>

          <div className="pt-2 flex flex-col items-center justify-center gap-2">
            {storeProductUrl ? (
              <Link
                to={storeProductUrl}
                className="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition-all shadow-md shadow-indigo-950 active:scale-95 flex items-center gap-2"
              >
                <span>اشترك الآن — {course.price} ج.م</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCheckout}
                  className="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition-all shadow-md shadow-indigo-950 active:scale-95 flex items-center gap-2"
                >
                  <span>اشترك الآن — {course.price} ج.م</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-300 font-medium">
                  (الدفع داخل المنصة)
                </span>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default VisitorCourseLanding;
