import { useState, useEffect, type FormEvent } from "react";
import { HelpCircle, Plus, Trash2, X, CheckCircle2 } from "lucide-react";
import { Lesson, Question } from "./academyApi";

interface AcademyQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onSave: (payload: {
    title: string;
    passScorePercent: number;
    questions: Question[];
  }) => Promise<void>;
}

export function AcademyQuizModal({
  isOpen,
  onClose,
  lesson,
  onSave,
}: AcademyQuizModalProps) {
  const [quizTitle, setQuizTitle] = useState("اختبار نهاية الدرس");
  const [quizPassScore, setQuizPassScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([
    { q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lesson?.quiz) {
      setQuizTitle(lesson.quiz.title || "اختبار نهاية الدرس");
      setQuizPassScore(lesson.quiz.passScorePercent || 70);
      setQuestions(
        lesson.quiz.questions?.length
          ? lesson.quiz.questions
          : [{ q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]
      );
    } else if (lesson) {
      setQuizTitle(`اختبار: ${lesson.title}`);
      setQuizPassScore(70);
      setQuestions([{ q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
    }
  }, [lesson, isOpen]);

  if (!isOpen || !lesson) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        title: quizTitle,
        passScorePercent: Number(quizPassScore) || 70,
        questions,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                إعداد اختبار الدرس (Quiz)
              </h2>
              <p className="text-xs text-muted-foreground">
                حدد الأسئلة والخيارات والإجابة الصحيحة ونسبة النجاح
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">
                عنوان الاختبار
              </label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">
                نسبة النجاح المطلوبة (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={quizPassScore}
                onChange={(e) => setQuizPassScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs">أسئلة الاختبار</span>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {questions.length} سؤال
              </span>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-3.5 sm:p-4 rounded-xl bg-muted/15 border border-border/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs font-mono tabular-nums">
                      السؤال {qIdx + 1}
                    </span>
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                      className="text-xs text-destructive hover:text-destructive/80 transition font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف السؤال</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  placeholder="نص السؤال..."
                  value={q.q}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qIdx].q = e.target.value;
                    setQuestions(next);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <div className="space-y-2">
                  <label className="block text-[11px] text-muted-foreground font-medium">
                    الاختيارات (اختر الإجابة الصحيحة بالضغط على الدائرة):
                  </label>
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                          q.correctIndex === optIdx
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => {
                            const next = [...questions];
                            next[qIdx].correctIndex = optIdx;
                            setQuestions(next);
                          }}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          placeholder={`خيار ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...questions];
                            next[qIdx].options[optIdx] = e.target.value;
                            setQuestions(next);
                          }}
                          className="flex-1 px-2 py-1 bg-transparent border-0 text-xs text-foreground focus:outline-none"
                        />
                        {q.correctIndex === optIdx && (
                          <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>صحيح</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    شرح توضيحي للإجابة الصحيحة (اختياري يظهر للطالب بعد الحل):
                  </label>
                  <input
                    type="text"
                    placeholder="لماذا هذه هي الإجابة الصحيحة؟"
                    value={q.explanation || ""}
                    onChange={(e) => {
                      const next = [...questions];
                      next[qIdx].explanation = e.target.value;
                      setQuestions(next);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setQuestions([
                  ...questions,
                  { q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" },
                ])
              }
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-muted/20 border border-dashed border-border/80 text-primary hover:bg-muted/40 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سؤال آخر</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition active:scale-[0.98]"
            >
              {saving ? "جاري الحفظ..." : "حفظ الاختبار"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
