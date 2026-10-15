import {
  FileText,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Loader2,
  Send,
} from "lucide-react";
import { Lesson, ExerciseSubmission } from "./academyApi";

interface AcademyLessonExerciseViewProps {
  currentLesson: Lesson | null;
  exerciseSubmissions: ExerciseSubmission[];
  isEditingSubmission: boolean;
  exerciseTextVal: string;
  exerciseUrlVal: string;
  submittingExercise: boolean;
  onSetExerciseTextVal: (v: string) => void;
  onSetExerciseUrlVal: (v: string) => void;
  onSetIsEditingSubmission: (v: boolean) => void;
  onSubmitExercise: () => void;
}

export function AcademyLessonExerciseView({
  currentLesson,
  exerciseSubmissions,
  isEditingSubmission,
  exerciseTextVal,
  exerciseUrlVal,
  submittingExercise,
  onSetExerciseTextVal,
  onSetExerciseUrlVal,
  onSetIsEditingSubmission,
  onSubmitExercise,
}: AcademyLessonExerciseViewProps) {
  const latest = exerciseSubmissions[0];
  const verdict = latest?.status;
  const ai = latest?.aiVerdictJson;

  return (
    <div className="space-y-4">
      {/* Exercise Ruler & Instructions Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>نص ومسطرة التمرين العملي للدرس</span>
          </h3>
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
            بوابة اجتياز عملية
          </span>
        </div>
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
          {currentLesson?.exerciseText ||
            "لا يوجد تمرين محدد لهذا الدرس، احرص على مشاهدة الفيديو جيداً."}
        </div>
      </div>

      {/* Submissions & AI Feedback Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>تسليم التمرين والتصحيح الذكي الفوري</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              يتم فحص تسليمك آلياً وفق معايير مسطرة التمرين فور إرساله
            </p>
          </div>

          {exerciseSubmissions.length > 0 && !isEditingSubmission && (
            <button
              onClick={() => onSetIsEditingSubmission(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/70 transition flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              <span>تعديل وإعادة التسليم</span>
            </button>
          )}
        </div>

        {/* Prior submission review / verdict display */}
        {exerciseSubmissions.length > 0 && !isEditingSubmission && latest && (
          <div className="space-y-4">
            {verdict === "ACCEPTED" ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>تم قبول تسليمك للتمرين بنجاح (مقبول)</span>
                </div>
                {ai?.coachLine && <p className="text-xs">{ai.coachLine}</p>}
                {ai?.nextStep && (
                  <p className="text-xs font-semibold text-foreground">
                    الخطوة القادمة: {ai.nextStep}
                  </p>
                )}
              </div>
            ) : verdict === "REJECTED" || verdict === "NEEDS_MORE" ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>
                    {verdict === "REJECTED"
                      ? "التسليم بحاجة لإكمال النواقص (مرفوض)"
                      : "التسليم بحاجة لتوضيحات إضافية"}
                  </span>
                </div>
                {ai?.coachLine && <p className="text-xs">{ai.coachLine}</p>}

                {ai && Array.isArray(ai.missing) && ai.missing.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-background/80 border border-rose-500/20 text-foreground space-y-1.5">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                      البنود الناقصة طبقاً لمسطرة التمرين:
                    </span>
                    <ul className="space-y-1 text-xs">
                      {ai.missing.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => onSetIsEditingSubmission(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تعديل الحل وإعادة التسليم الآن</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 flex items-center gap-2 text-xs font-medium">
                <Clock className="w-4 h-4 text-sky-500" />
                <span>تم استلام التمرين وجاري مراجعته وتقييمه.</span>
              </div>
            )}

            {/* Display submitted text and links */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                <span>
                  تسليمك المسجل بتاريخ {new Date(latest.createdAt).toLocaleString("ar-EG")}
                </span>
                {latest.instructorNote && (
                  <span className="text-primary font-semibold">ملاحظة المدرب مسجلة</span>
                )}
              </div>

              {latest.submissionText && (
                <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {latest.submissionText}
                </div>
              )}

              {latest.submissionUrl && (
                <div className="pt-1">
                  <a
                    href={latest.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>عرض المرفق / لقطة الشاشة ({latest.submissionUrl})</span>
                  </a>
                </div>
              )}

              {latest.instructorNote && (
                <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground">
                  <span className="font-bold text-primary block mb-1">
                    ملاحظة المدرب البشري:
                  </span>
                  <p>{latest.instructorNote}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New submission or editing prior submission */}
        {(exerciseSubmissions.length === 0 || isEditingSubmission) && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>نص الإجابة وخطوات التطبيق:</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={exerciseTextVal}
                onChange={(e) => onSetExerciseTextVal(e.target.value)}
                placeholder="اكتب هنا تفاصيل تنفيذك لبنود التمرين وملاحظاتك بالتفصيل..."
                rows={5}
                className="w-full p-3.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                رابط لقطات الشاشة أو المرفقات (Google Drive / رابط مباشر / Imgur):
              </label>
              <input
                type="url"
                value={exerciseUrlVal}
                onChange={(e) => onSetExerciseUrlVal(e.target.value)}
                placeholder="https://drive.google.com/... أو https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              {exerciseSubmissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSetIsEditingSubmission(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                >
                  إلغاء التعديل
                </button>
              )}

              <button
                type="button"
                onClick={onSubmitExercise}
                disabled={submittingExercise || (!exerciseTextVal.trim() && !exerciseUrlVal.trim())}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {submittingExercise ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التقييم بواسطة المصحح الذكي...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>تسليم التمرين للتقييم الذكي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
