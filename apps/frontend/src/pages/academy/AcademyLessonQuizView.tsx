import { Check, HelpCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Quiz } from "./academyApi";

interface AcademyLessonQuizViewProps {
  quiz: Quiz;
  quizAnswers: number[];
  quizSubmitting: boolean;
  quizResult: any;
  onChangeAnswer: (qIdx: number, optIdx: number) => void;
  onSubmitQuiz: () => void;
}

export function AcademyLessonQuizView({
  quiz,
  quizAnswers,
  quizSubmitting,
  quizResult,
  onChangeAnswer,
  onSubmitQuiz,
}: AcademyLessonQuizViewProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <span>{quiz.title}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
            نسبة النجاح المطلوبة لاجتياز الدرس: {quiz.passScorePercent}%
          </p>
        </div>

        {quizResult && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border font-mono tabular-nums self-start sm:self-auto ${
              quizResult.passed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            درجتك: {quizResult.scorePercent}% ({quizResult.passed ? "ناجح ومكتمل!" : "لم تجتز"})
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-3.5">
        {quiz.questions.map((q, qIdx) => {
          const fb = quizResult?.feedback?.[qIdx];
          return (
            <div
              key={qIdx}
              className={`p-4 rounded-xl border ${
                fb
                  ? fb.isCorrect
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-destructive/5 border-destructive/20"
                  : "bg-muted/20 border-border/50"
              } space-y-2.5 transition-colors`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-semibold text-foreground font-mono tabular-nums">
                  {qIdx + 1}. {q.q}
                </h4>
                {fb && (
                  <span className="text-xs font-semibold">
                    {fb.isCorrect ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> صحيحة
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> غير صحيحة
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      quizAnswers[qIdx] === optIdx
                        ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
                        : "bg-card border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quiz_q_${qIdx}`}
                      checked={quizAnswers[qIdx] === optIdx}
                      onChange={() => onChangeAnswer(qIdx, optIdx)}
                      className="text-primary focus:ring-primary border-input accent-primary w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              {fb && !fb.isCorrect && fb.explanation && (
                <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">توضيح الإجابة: {fb.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
        <button
          onClick={onSubmitQuiz}
          disabled={quizSubmitting || quizAnswers.length < quiz.questions.length}
          className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
        >
          {quizSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{quizSubmitting ? "جاري تصحيح الإجابات..." : "تسليم إجابات الاختبار"}</span>
        </button>
      </div>
    </div>
  );
}
