import {
  Award,
  RotateCcw,
  Ban,
  MessageCircle,
  Users,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { StudentProgressRow } from "./academyApi";

interface AcademyStudentsTableProps {
  students: StudentProgressRow[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  suspendingId: string | null;
  onToggleSuspend: (studentId: string, currentStatus: string) => Promise<void>;
  onOpenManualEnroll: () => void;
}

export function AcademyStudentsTable({
  students,
  loading,
  searchQuery,
  statusFilter,
  suspendingId,
  onToggleSuspend,
  onOpenManualEnroll,
}: AcademyStudentsTableProps) {
  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("01")) clean = "2" + clean;
    return `https://wa.me/${clean}`;
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-xs text-muted-foreground">جاري تحميل بيانات الطلاب...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs" dir="rtl">
        <div className="w-10 h-10 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center mx-auto">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-foreground">
          {searchQuery || statusFilter !== "ALL"
            ? "لا توجد نتائج مطابقة لمعايير البحث والتصفية"
            : "لا يوجد طلاب مسجلين في هذه الدورة بعد"}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {searchQuery || statusFilter !== "ALL"
            ? "جرّب تغيير كلمات البحث أو مسح الفلتر لإظهار بقية الطلاب."
            : "يمكنك إضافة طالب يدوياً الآن أو انتظار تسجيل الطلاب عبر المتجر أو رابط الكورس."}
        </p>
        {!searchQuery && statusFilter === "ALL" && (
          <button
            onClick={onOpenManualEnroll}
            className="mt-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition active:scale-[0.98]"
          >
            تسجيل أول طالب الآن
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/70 overflow-hidden shadow-xs" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs text-foreground">
          <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 sm:p-3.5">اسم الطالب</th>
              <th className="p-3 sm:p-3.5">الهاتف / واتساب</th>
              <th className="p-3 sm:p-3.5">نسبة الإكمال</th>
              <th className="p-3 sm:p-3.5">الدروس المنجزة</th>
              <th className="p-3 sm:p-3.5">الشهادة</th>
              <th className="p-3 sm:p-3.5">انتهاء الاشتراك</th>
              <th className="p-3 sm:p-3.5">تاريخ التسجيل</th>
              <th className="p-3 sm:p-3.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {students.map((st) => {
              const waLink = getWhatsAppLink(st.studentPhone);

              return (
                <tr
                  key={st.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    st.status === "SUSPENDED" ? "opacity-60 bg-muted/10" : ""
                  }`}
                >
                  <td className="p-3 sm:p-3.5 font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      {st.status === "SUSPENDED" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                          موقوف
                        </span>
                      )}
                      {st.isExpired && st.status !== "SUSPENDED" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                          منتهي
                        </span>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{st.studentName || "طالب"}</div>
                        {st.studentEmail && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {st.studentEmail}
                          </div>
                        )}
                        {st.orderId && (
                          <div
                            className="text-[10px] text-primary/80 font-mono mt-0.5"
                            title={`مسجل عبر الطلب: ${st.orderId}`}
                          >
                            طلب رقم: {st.orderId.slice(-8)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-3 sm:p-3.5 font-mono text-muted-foreground">
                    {st.studentPhone ? (
                      <div className="flex items-center gap-1.5">
                        <span>{st.studentPhone}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            title="مراسلة عبر واتساب"
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="p-3 sm:p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${st.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-bold text-primary font-mono tabular-nums">
                        {st.progressPercent}%
                      </span>
                    </div>
                  </td>

                  <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                    {st.completedLessonsCount} / {st.totalLessonsCount} درس
                  </td>

                  <td className="p-3 sm:p-3.5">
                    {st.hasCertificate ? (
                      <a
                        href={`/api/v1/academy/certificates/${st.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>معتمدة ({st.certificateNumber})</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">قيد التقدم</span>
                    )}
                  </td>

                  <td className="p-3 sm:p-3.5 font-mono tabular-nums">
                    {st.expiresAt ? (
                      <span
                        className={
                          st.isExpired ? "text-rose-500 font-bold" : "text-muted-foreground"
                        }
                      >
                        {new Date(st.expiresAt).toLocaleDateString("ar-EG")}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        مؤبد
                      </span>
                    )}
                  </td>

                  <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                    {new Date(st.enrolledAt).toLocaleDateString("ar-EG")}
                  </td>

                  <td className="p-3 sm:p-3.5 text-center">
                    <button
                      disabled={suspendingId === st.id}
                      onClick={() => onToggleSuspend(st.id, st.status)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border active:scale-[0.98] ${
                        st.status === "SUSPENDED"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                      }`}
                    >
                      {st.status === "SUSPENDED" ? (
                        <span className="flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>تفعيل</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          <span>إيقاف</span>
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
