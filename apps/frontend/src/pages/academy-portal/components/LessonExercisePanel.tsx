import React, { useState } from "react";
import { Loader2, Dumbbell, Send, CheckCircle2, XCircle, Info, RotateCcw } from "lucide-react";

interface ExerciseVerdict {
  verdict: "ACCEPTED" | "REJECTED" | "NEEDS_MORE" | "PENDING" | string;
  missing?: string[];
  coachLine?: string;
  nextStep?: string;
}

interface Props {
  lessonId: string;
  enrollmentId: string | null;
  exerciseText: string | null;
  isAuthenticated: boolean;
  onAccepted: () => void;
}

const VERDICT_STYLES: Record<string, { box: string; icon: React.ReactNode; label: string }> = {
  ACCEPTED: {
    box: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    label: "تميز! تطبيقك للتمرين مقبول وتم احتساب الدرس كمكتمل",
  },
  REJECTED: {
    box: "bg-rose-50 border-rose-200 text-rose-800",
    icon: <XCircle className="w-5 h-5 text-rose-600" />,
    label: "تطبيقك لم يلبِّ متطلبات التمرين — راجع ملاحظات الكوتش وأعد المحاولة",
  },
  NEEDS_MORE: {
    box: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <Info className="w-5 h-5 text-amber-600" />,
    label: "التطبيق يحتاج تفاصيل إضافية — أكمل النواقص التالية وأعد التسليم",
  },
  PENDING: {
    box: "bg-slate-50 border-slate-200 text-slate-700",
    icon: <Info className="w-5 h-5 text-slate-500" />,
    label: "تم استلام تمرينك وقيد المراجعة",
  },
};

export const LessonExercisePanel: React.FC<Props> = ({
  lessonId,
  enrollmentId,
  exerciseText,
  isAuthenticated,
  onAccepted,
}) => {
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<ExerciseVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isAuthenticated && (submissionText.trim().length > 0 || submissionUrl.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
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

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/submit-exercise`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          enrollmentId,
          submissionText: submissionText.trim(),
          submissionUrl: submissionUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.message || "تعذر إرسال التمرين للمصحح الذكي");
      }
      const v: ExerciseVerdict = data.aiVerdict || { verdict: data.submission?.status || "PENDING" };
      setVerdict(v);
      setSubmissionText("");
      setSubmissionUrl("");
      if (v.verdict === "ACCEPTED") {
        onAccepted();
      }
    } catch (err: any) {
      setError(err?.message || "تعذر إرسال التمرين، حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const style = verdict ? VERDICT_STYLES[verdict.verdict] || VERDICT_STYLES.PENDING : null;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* نص التمرين المطلوب */}
      <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 space-y-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-extrabold text-indigo-900">تمرين تطبيقي على هذا الدرس</h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
          {exerciseText || "لا يوجد تمرين عملي مخصص لهذا الدرس."}
        </p>
      </div>

      {/* نتيجة المصحح الذكي */}
      {verdict && style && (
        <div className={`rounded-2xl border p-4 space-y-2 ${style.box}`}>
          <div className="flex items-center gap-2">
            {style.icon}
            <p className="text-xs font-extrabold">{style.label}</p>
          </div>
          {verdict.coachLine && (
            <p className="text-xs leading-relaxed pr-7 whitespace-pre-line">{verdict.coachLine}</p>
          )}
          {Array.isArray(verdict.missing) && verdict.missing.length > 0 && (
            <ul className="text-xs pr-7 space-y-1 list-disc list-inside">
              {verdict.missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
          {verdict.nextStep && (
            <p className="text-xs font-bold pr-7">
              الخطوة التالية: {verdict.nextStep}
            </p>
          )}
          {verdict.verdict !== "ACCEPTED" && (
            <button
              onClick={() => setVerdict(null)}
              className="inline-flex items-center gap-1.5 mr-7 px-3 py-1.5 rounded-lg bg-white border border-current/20 text-[11px] font-bold hover:bg-white/70 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تسليم محاولة جديدة</span>
            </button>
          )}
        </div>
      )}

      {/* نموذج التسليم */}
      {!verdict && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-800 block mb-1.5">
              اكتب تطبيقك للتمرين (مطلوب — سيصححه الكوتش الذكي)
            </span>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={6}
              placeholder="اكتب هنا إجابتك أو خطوات تطبيقك العملي لهذا الدرس..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-y"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-800 block mb-1.5">
              رابط إثبات إضافي (اختياري — صورة أو مستند)
            </span>
            <input
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
            />
          </label>

          {error && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {error}
            </p>
          )}

          {!isAuthenticated && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              تسليم التمرين متاح للمشتركين المسجلين — سجّل دخولك أولاً.
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:-scale-x-100" />}
            <span>{submitting ? "الكوتش الذكي يصحح تطبيقك..." : "تسليم التمرين للتصحيح"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
