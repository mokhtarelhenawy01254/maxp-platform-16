import { useState, useMemo } from "react";
import {
  FileText,
  Filter,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ExerciseSubmission } from "./academyApi";

interface AcademyStudentsSubmissionsTabProps {
  submissions: ExerciseSubmission[];
  loading: boolean;
  onSaveReview: (
    subId: string,
    status: "ACCEPTED" | "REJECTED" | "NEEDS_MORE",
    note?: string
  ) => Promise<void>;
}

export function AcademyStudentsSubmissionsTab({
  submissions,
  loading,
  onSaveReview,
}: AcademyStudentsSubmissionsTabProps) {
  const [submissionFilter, setSubmissionFilter] = useState<string>("ALL");
  const [selectedSubmission, setSelectedSubmission] =
    useState<ExerciseSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingAction, setReviewingAction] = useState<
    "ACCEPTED" | "REJECTED" | "NEEDS_MORE" | null
  >(null);

  const filteredSubmissions = useMemo(() => {
    if (submissionFilter === "ALL") return submissions;
    return submissions.filter((s) => s.status === submissionFilter);
  }, [submissions, submissionFilter]);

  const handleOpenReview = (sub: ExerciseSubmission) => {
    setSelectedSubmission(sub);
    setReviewNote(sub.instructorNote || "");
  };

  const handleExecuteReview = async (
    status: "ACCEPTED" | "REJECTED" | "NEEDS_MORE"
  ) => {
    if (!selectedSubmission) return;
    try {
      setReviewingAction(status);
      await onSaveReview(selectedSubmission.id, status, reviewNote.trim());
      setSelectedSubmission(null);
    } finally {
      setReviewingAction(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Submissions Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            تصفية حسب الحالة:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: "ALL", label: "الكل" },
              { id: "PENDING", label: "معلق / قيد المراجعة" },
              { id: "ACCEPTED", label: "مقبول" },
              { id: "REJECTED", label: "مرفوض / ناقص" },
              { id: "NEEDS_MORE", label: "بحاجة لتوضيح" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSubmissionFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  submissionFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {filteredSubmissions.length} تسليم
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-2">
          <Loader2 className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">جاري تحميل تسليمات التمارين...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
          <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto" />
          <h3 className="text-xs sm:text-sm font-bold text-foreground">
            لا توجد تسليمات تطابق الفلتر المحدد
          </h3>
          <p className="text-xs text-muted-foreground">
            تظهر هنا حلول الطلاب للتمارين فور إرسالها للتقييم والمراجعة.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-foreground">
              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 sm:p-3.5">الطالب</th>
                  <th className="p-3 sm:p-3.5">الدرس</th>
                  <th className="p-3 sm:p-3.5">حالة المصحح الذكي</th>
                  <th className="p-3 sm:p-3.5">رأي المصحح</th>
                  <th className="p-3 sm:p-3.5">تاريخ التسليم</th>
                  <th className="p-3 sm:p-3.5 text-center">إجراءات المراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSubmissions.map((sub) => {
                  const verdict = sub.status;
                  const ai = sub.aiVerdictJson;

                  return (
                    <tr key={sub.id} className="hover:bg-muted/20 transition">
                      <td className="p-3 sm:p-3.5 font-bold text-foreground">
                        <div>{sub.studentName || "طالب"}</div>
                        {sub.studentPhone && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {sub.studentPhone}
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-3.5 font-medium text-foreground">
                        {sub.lessonTitle || `درس ${sub.lessonSortOrder || ""}`}
                      </td>
                      <td className="p-3 sm:p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 ${
                            verdict === "ACCEPTED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : verdict === "REJECTED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : verdict === "NEEDS_MORE"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                          }`}
                        >
                          {verdict === "ACCEPTED" && <Check className="w-2.5 h-2.5" />}
                          {verdict === "REJECTED" && <X className="w-2.5 h-2.5" />}
                          <span>
                            {verdict === "ACCEPTED"
                              ? "مقبول"
                              : verdict === "REJECTED"
                              ? "ناقص / مرفوض"
                              : verdict === "NEEDS_MORE"
                              ? "بحاجة لتوضيح"
                              : "معلق"}
                          </span>
                        </span>
                      </td>
                      <td
                        className="p-3 sm:p-3.5 max-w-xs text-muted-foreground truncate"
                        title={ai?.coachLine}
                      >
                        {ai?.coachLine || sub.aiFeedback || "—"}
                      </td>
                      <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                        {new Date(sub.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-3 sm:p-3.5 text-center">
                        <button
                          onClick={() => handleOpenReview(sub)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition shadow-xs"
                        >
                          فحص واعتماد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal for Instructor */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          dir="rtl"
        >
          <div className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>مراجعة تسليم الطالب: {selectedSubmission.studentName}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  الدرس: {selectedSubmission.lessonTitle} — تاريخ التسليم:{" "}
                  {new Date(selectedSubmission.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground block">
                إجابة وتطبيق الطالب:
              </span>
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {selectedSubmission.submissionText ||
                  "لم يكتب الطالب نصاً، واعتمد على رابط المرفق."}
              </div>
            </div>

            {selectedSubmission.submissionUrl && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground block">
                  رابط المرفقات / اللقطة:
                </span>
                <a
                  href={selectedSubmission.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح الرابط المرفق للمعاينة</span>
                </a>
              </div>
            )}

            {selectedSubmission.aiVerdictJson && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>تقييم المصحح الذكي (AI Grader):</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {selectedSubmission.aiVerdictJson.verdict}
                  </span>
                </div>

                {selectedSubmission.aiVerdictJson.coachLine && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSubmission.aiVerdictJson.coachLine}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">
                ملاحظة المدرب البشري (تظهر للطالب في واجهة الدرس):
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="اكتب توجيهاتك أو ملاحظاتك للطالب..."
                rows={3}
                className="w-full p-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleExecuteReview("REJECTED")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "REJECTED" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                <span>طلب تعديل (رفض)</span>
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleExecuteReview("NEEDS_MORE")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "NEEDS_MORE" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span>طلب توضيح</span>
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleExecuteReview("ACCEPTED")}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "ACCEPTED" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>اعتماد وقبول</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
