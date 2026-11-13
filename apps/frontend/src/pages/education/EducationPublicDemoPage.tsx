import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Link2,
  Users,
  CheckCircle2,
  Sparkles,
  School,
  AlertCircle,
  Check,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";

export default function EducationPublicDemoPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPublicInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(`education/demo-day/public/${id}`));
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "الفعالية غير متاحة أو تم إلغاؤها");
        setEvent(data.data);
      } catch (err: any) {
        setError(err.message || "تعذر جلب تفاصيل الفعالية");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicInfo();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !phone.trim()) {
      toast.error("اسم الطالب ورقم الهاتف مطلوبان");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl(`education/demo-day/public/${id}/register`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          guardianName: guardianName.trim() || null,
          phone: phone.trim(),
          phone2: phone2.trim() || null,
          email: email.trim() || null,
          age: age ? Number(age) : null,
          grade: grade.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "فشل إتمام التسجيل");
      setSubmitted(true);
      toast.success("تم تأكيد تسجيلك في اليوم التجريبي بنجاح!");
    } catch (err: any) {
      toast.error(err.message || "فشل إتمام التسجيل");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dtStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">الفعالية غير متاحة</h2>
          <p className="text-xs text-muted-foreground">{error || "نعتذر، لم نتمكن من العثور على هذه الفعالية"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans" dir="rtl">
      <div className="w-full max-w-xl space-y-4">
        {/* Event Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              جلسة تجريبية مجانية (Demo Day)
            </span>
            {event.companyName && (
              <span className="text-xs font-bold text-foreground">
                {event.companyName}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">الموعد والتوقيت</div>
                <div className="font-bold text-foreground font-mono">{formatDateTime(event.scheduledAt)}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-2.5">
              {event.locationType === "ONLINE" ? (
                <>
                  <Link2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-medium">نوع الحضور</div>
                    <div className="font-bold text-foreground">أونلاين (عبر رابط مباشر)</div>
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground font-medium">مكان الحضور</div>
                    <div className="font-bold text-foreground">{event.room || "مقر الأكاديمية"}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Spots Remaining Indicator */}
          <div className="flex items-center justify-between text-xs pt-1 px-1 text-muted-foreground">
            <span>المقاعد المتبقية:</span>
            <span className="font-mono font-bold text-foreground tabular-nums">
              {event.spotsLeft} من أصل {event.capacity} مقعد
            </span>
          </div>
        </div>

        {/* Registration Form or Success Screen */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-sm">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-foreground">تم تأكيد تسجيلك بنجاح!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                شكراً لك. تم حجز مقعدك في اليوم التجريبي وسيصلك تفاصيل الموعد ورابط الدخول عبر رسالة واتساب على رقمك المسجل.
              </p>
            </div>
          ) : event.isFull ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">اكتملت المقاعد لهذه الجلسة</h3>
              <p className="text-xs text-muted-foreground">نعتذر، اكتملت السعة القصوى لهذه الفعالية. يرجى متابعتنا للمواعيد القادمة.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border/50">
                بيانات التسجيل وتأكيد الحضور
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    اسم الطالب <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="مثال: يوسف أحمد"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    اسم ولي الأمر
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    رقم الهاتف (الواتساب) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    رقم هاتف بديل (اختياري)
                  </label>
                  <input
                    type="tel"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="01112345678"
                    dir="ltr"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    السن
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="80"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                    placeholder="مثال: 12"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    المرحلة الدراسية / الصف
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="مثال: السادس الابتدائي"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-black hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>تأكيد التسجيل وحجز المقعد مجاناً</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
