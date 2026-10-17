import React, { useState } from "react";
import { Loader2, HelpCircle, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

export interface StudentQuiz {
  id?: string;
  title?: string;
  passScorePercent: number;
  questions: Array<{ id?: string; q: string; options: string[] }>;
}

interface QuizResult {
  passed: boolean;
  scorePercent: number;
  passScorePercent: number;
  correctCount: number;
  totalCount: number;
  feedback: Array<{ questionId: string | number; isCorrect: boolean; explanation?: string | null; correctIndex?: number }>;
}

interface Props {
  lessonId: string;
  enrollmentId: string | null;
  quiz: StudentQuiz;
  previousScore?: number | null;
  onPassed: () => void;
}

export const LessonQuizPanel: React.FC<Props> = ({
  lessonId,
  enrollmentId,
  quiz,
  previousScore,
  onPassed,
}) => {
  const [answers, setAnswers] = useState<number[]>(() => quiz.questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a >= 0);

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setError(null);

    if (!enrollmentId) {
      setError("جاري تحميل بيانات اشتراكك... حدّث الصفحة وحاول مرة أخرى.");
      return;
    }

    try {
      setSubmitting(true);
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/submit-quiz`, {
        method: "POST",
        headers,
        body: JSON.stringify({ enrollmentId, answers }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.message || "تعذر تسليم إجاباتك");
      }
      setResult(data as QuizResult);
      if (data.passed) {
        onPassed();
      }
    } catch (err: any) {
      setError(err?.message || "تعذر تسليم إجاباتك، حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers(quiz.questions.map(() => -1));
    setError(null);
  };

  if (result) {
    return (
      <div className="space-y-4 text-right" dir="rtl">
        <div
          className={`rounded-2xl border p-5 text-center space-y-2 ${
            result.passed
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          {result.passed ? (
            <Trophy className="w-8 h-8 text-emerald-600 mx-auto" />
          ) : (
            <RotateCcw className="w-8 h-8 text-amber-600 mx-auto" />
          )}
          <p className={`text-sm font-extrabold ${result.passed ? "text-emerald-800" : "text-amber-800"}`}>
            {result.passed ? "مبروك! اجتزت اختبار هذا الدرس" : "لم تجتز الاختبار هذه المرة"}
          </p>
          <p className="text-xs font-bold tabular-nums text-slate-700">
            نتيجتك: {result.scorePercent}% ({result.correctCount} من {result.totalCount}) — النجاح من {result.passScorePercent}%
          </p>
          {!result.passed && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {quiz.questions.map((question, qIdx) => {
            const fb = result.feedback[qIdx];
            return (
              <div
                key={question.id || qIdx}
                className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                  fb?.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"
                }`}
              >
                <div className="flex items-start gap-2 font-bold text-slate-800">
                  {fb?.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {qIdx + 1}. {question.q}
                  </span>
                </div>
                {!fb?.isCorrect && (
                  <div className="pr-6 space-y-1 text-slate-600">
                    {typeof fb?.correctIndex === "number" && question.options[fb.correctIndex] && (
                      <p>
                        <span className="font-bold text-emerald-700">الإجابة الصحيحة:</span>{" "}
                        {question.options[fb.correctIndex]}
                      </p>
                    )}
                    {fb?.explanation && <p className="leading-relaxed">{fb.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-extrabold text-slate-900">
            {quiz.title || "اختبار الدرس"}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 tabular-nums">
            {quiz.questions.length} سؤال
          </span>
          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            النجاح من {quiz.passScorePercent}%
          </span>
          {typeof previousScore === "number" && (
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
              آخر نتيجة: {previousScore}%
            </span>
          )}
        </div>
      </div>

      {quiz.questions.map((question, qIdx) => (
        <fieldset key={question.id || qIdx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
          <legend className="px-2 text-xs font-bold text-slate-800">
            {qIdx + 1}. {question.q}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {question.options.map((option, oIdx) => {
              const selected = answers[qIdx] === oIdx;
              return (
                <label
                  key={oIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all active:scale-[0.99] ${
                    selected
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                      : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q_${question.id || qIdx}`}
                    checked={selected}
                    onChange={() => {
                      const next = [...answers];
                      next[qIdx] = oIdx;
                      setAnswers(next);
                    }}
                    className="accent-indigo-600"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error && (
        <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        <span>{submitting ? "جاري التصحيح..." : allAnswered ? "تسليم الإجابات" : "أجب على جميع الأسئلة أولاً"}</span>
      </button>
    </div>
  );
};
