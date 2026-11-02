import React from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Share2,
  Check,
  Award,
  BookOpen,
} from "lucide-react";
import { CourseCurriculumAccordion, ModuleItem, LessonItem } from "./CourseCurriculumAccordion";
import { formatArabicModules, formatArabicLessons } from "../utils/arabicPlural";

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  freePreviewLessons: number;
  thumbnailUrl?: string | null;
  storeProductId?: string | null;
}

interface Props {
  course: CourseData;
  modules: ModuleItem[];
  totalLessons: number;
  certificate?: { id: string } | null;
  enrollmentId?: string | null;
  copiedShare: boolean;
  onShare: () => void;
}

export const EnrolledCourseCockpit: React.FC<Props> = ({
  course,
  modules,
  totalLessons,
  certificate,
  enrollmentId,
  copiedShare,
  onShare,
}) => {
  // Flatten all lessons
  const flatLessons = modules.flatMap((m) => m.lessons || []);

  // Calculate completion stats
  const completedLessons = flatLessons.filter((l) => l.progress?.status === "DONE");
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isAllCompleted = totalLessons > 0 && completedCount >= totalLessons;

  // Next lesson to continue: First unlocked lesson not done yet, or first lesson
  const nextLessonToStudy: LessonItem | null =
    flatLessons.find((l) => l.progress?.status !== "DONE" && (l.isUnlocked || l.isFreePreview)) ||
    flatLessons[0] ||
    null;

  // Resume URL
  const resumeUrl = nextLessonToStudy
    ? `/portal/course/${course.id}/lesson/${nextLessonToStudy.id}`
    : flatLessons[0]
    ? `/portal/course/${course.id}/lesson/${flatLessons[0].id}`
    : `/portal/my-courses`;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* 1. Header & Progress Cockpit (Clean Learning Surface) */}
      <section className="bg-card rounded-3xl border border-border/80 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAllCompleted ? "كورس مكتمل" : "مشترك نشط"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {course.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onShare}
              title="مشاركة رابط الكورس"
              className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted/40 text-foreground font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span>مشاركة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Learning Progress Card & Single Primary CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>
                    أنجزت {completedCount} من {formatArabicLessons(totalLessons)}
                  </span>
                </span>
                <span className="font-mono text-primary tabular-nums text-sm font-black">
                  {progressPercent}%
                </span>
              </div>

              {/* Sleek Progress Bar */}
              <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden border border-border/40">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(progressPercent, 4)}%` }}
                />
              </div>
            </div>

            {/* Single Primary Action */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isAllCompleted ? (
                certificate || enrollmentId ? (
                  <Link
                    to={`/portal/certificate/${certificate?.id || enrollmentId}`}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-200 transition-all flex items-center gap-2 active:scale-98"
                  >
                    <Award className="w-4 h-4" />
                    <span>عرض شهادة الإتمام</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to={resumeUrl}
                    className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>مراجعة دروس الكورس</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                )
              ) : (
                <div className="flex flex-col items-start gap-1.5">
                  <Link
                    to={resumeUrl}
                    className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>ادخل الكورس</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <span className="text-xs text-muted-foreground font-medium">
                    {completedCount === 0
                      ? "ابدأ الدرس الأول الآن"
                      : `أكمل التعلم: ${nextLessonToStudy?.title || "الدرس التالي"}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="lg:col-span-4 bg-muted/20 border border-border/60 rounded-2xl p-4.5 space-y-3">
            <span className="text-xs font-bold text-foreground block">بيانات مسارك</span>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>إجمالي الوحدات:</span>
                <span className="font-bold text-foreground font-mono">
                  {formatArabicModules(modules.length)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>الدروس المتبقية:</span>
                <span className="font-bold text-foreground font-mono">
                  {formatArabicLessons(Math.max(0, totalLessons - completedCount))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>الكوتش الذكي:</span>
                <span className="font-bold text-emerald-600">متاح في كل درس</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Structured Syllabus (Full Curriculum with status) */}
      <section className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary">فهرس المحتوى</span>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {formatArabicModules(modules.length)} · {formatArabicLessons(totalLessons)}
            </h2>
          </div>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            {completedCount} مكتمل
          </span>
        </div>

        <CourseCurriculumAccordion
          courseId={course.id}
          modules={modules}
          isFreeCourse={false}
          isEnrolled={true}
        />
      </section>

      {/* 3. AI Coach Learning Support Card */}
      <section className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-6 sm:p-7 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2.5 text-indigo-950 font-bold text-sm">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>الكوتش الذكي يرافقك في كل خطوة</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed text-pretty">
          في مشغل كل درس، يمكنك فتح تاب «الكوتش الذكي للدرس» لطرح أي سؤال حول الشرح، أو الحصول على
          إرشادات مباشرة لحل التمرين العملي على شاشات المنصة.
        </p>
      </section>
    </div>
  );
};

export default EnrolledCourseCockpit;
