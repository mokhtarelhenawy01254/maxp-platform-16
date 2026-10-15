import { Check, HelpCircle } from "lucide-react";
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
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-purple-500" />
            <span>{quiz.title}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            نسبة النجاح المطلوبة لاجتياز الدرس: {quiz.passScorePercent}%
          </p>
        </div>

        {quizResult && (
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              quizResult.passed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            درجتك: {quizResult.scorePercent}% ({quizResult.passed ? "ناجح ومكتمل!" : "لم تجتز"})
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {quiz.questions.map((q, qIdx) => {
          const fb = quizResult?.feedback?.[qIdx];
          return (
            <div
              key={qIdx}
              className={`p-4 rounded-xl border ${
                fb
                  ? fb.isCorrect
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-rose-500/5 border-rose-500/30"
                  : "bg-muted/30 border-border/60"
              } space-y-2.5`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                  {qIdx + 1}. {q.q}
                </h4>
                {fb && (
                  <span className="text-xs font-bold">
                    {fb.isCorrect ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> صحيحة
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">غير صحيحة</span>
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      quizAnswers[qIdx] === optIdx
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-300 font-medium"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quiz_q_${qIdx}`}
                      checked={quizAnswers[qIdx] === optIdx}
                      onChange={() => onChangeAnswer(qIdx, optIdx)}
                      className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              {fb && !fb.isCorrect && fb.explanation && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                  توضيح الإجابة: {fb.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
        <button
          onClick={onSubmitQuiz}
          disabled={quizSubmitting || quizAnswers.length < quiz.questions.length}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition disabled:opacity-50"
        >
          {quizSubmitting ? "جاري تصحيح الإجابات..." : "تسليم إجابات الاختبار"}
        </button>
      </div>
    </div>
  );
}
