import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Building2, Phone, Mail, DollarSign, Percent,
  Calendar, CheckCircle2, Clock, AlertCircle, Edit, User,
} from "lucide-react";
import { BookingDoctorDetail, STATUS_MAP, api, getAuthHeaders } from "./shared";

const fmtMoney = (n?: number) => (n != null ? `${Number(n).toFixed(2)} ج.م` : "—");
const WEEKDAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function DoctorDetailPage({ doctorId }: { doctorId?: string }) {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<BookingDoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`doctors/${doctorId}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل التحميل");
        if (!cancelled) setDoctor(json.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ أثناء جلب الملف");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [doctorId]);

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto space-y-6" dir="rtl">
      {/* Top Header Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/booking/doctors")}
            className="p-2 border border-border/70 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع لقائمة الأطباء"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {doctor ? `${doctor.title} ${doctor.name}` : "ملف الطبيب"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doctor?.specialty || "التفاصيل المهنية، جدول المواعيد، والأداء المالي للطبيب"}
            </p>
          </div>
        </div>

        {doctor && (
          <button
            onClick={() => navigate("/admin/booking/doctors")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            تعديل الطبيب
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-muted-foreground">جاري تحميل ملف الطبيب...</div>
      ) : error ? (
        <div className="bg-card border border-border/70 rounded-xl p-8 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => navigate("/admin/booking/doctors")}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg"
          >
            العودة للأطباء
          </button>
        </div>
      ) : doctor ? (
        <div className="space-y-6">
          {/* Profile Chassis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4 md:col-span-1 border-b md:border-b-0 md:border-l border-border/60 pb-4 md:pb-0 md:pl-4">
              {doctor.avatarUrl ? (
                <img src={doctor.avatarUrl} alt={doctor.name} className="w-16 h-16 rounded-xl object-cover border border-border/70 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xl font-bold font-mono">
                  {(doctor.name || "؟").charAt(0)}
                </div>
              )}
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">{doctor.title} {doctor.name}</h2>
                <p className="text-xs text-muted-foreground">{doctor.specialty || "—"}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${doctor.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${doctor.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {doctor.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-3 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <span>الفرع: <strong className="text-foreground font-medium">{doctor.branchName || "—"}</strong></span>
                </div>
                {doctor.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground" dir="ltr">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-foreground">{doctor.phone}</span>
                  </div>
                )}
                {doctor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground" dir="ltr">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-foreground">{doctor.email}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> رسوم الكشف
                  </span>
                  <p className="font-mono tabular-nums text-sm font-bold text-foreground">{fmtMoney(doctor.consultationFee)}</p>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3" /> نسبة العمولة
                  </span>
                  <p className="font-mono tabular-nums text-sm font-bold text-foreground">{doctor.commissionRate != null ? `${doctor.commissionRate}%` : "—"}</p>
                </div>
              </div>

              {doctor.bio && <p className="text-muted-foreground text-xs leading-relaxed">{doctor.bio}</p>}
            </div>
          </div>

          {/* Stats Telemetry Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border/70 bg-card overflow-hidden divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 shadow-sm">
            <div className="p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground">إجمالي المواعيد</span>
              <div className="text-lg font-bold font-mono tabular-nums text-foreground">{doctor.stats?.total ?? 0}</div>
            </div>
            <div className="p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground">مواعيد اليوم</span>
              <div className="text-lg font-bold font-mono tabular-nums text-primary">{doctor.stats?.today ?? 0}</div>
            </div>
            <div className="p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground">مواعيد قادمة</span>
              <div className="text-lg font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">{doctor.stats?.upcoming ?? 0}</div>
            </div>
            <div className="p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground">مكتملة</span>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{doctor.stats?.completed ?? 0}</div>
            </div>
          </div>

          {/* Performance & Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground">مؤشرات الأداء والحضور</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>نسبة الحضور</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{doctor.stats?.attendanceRate ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, doctor.stats?.attendanceRate ?? 0)}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>نسبة عدم الحضور</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{doctor.stats?.noShowRate ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, doctor.stats?.noShowRate ?? 0)}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                  <div className="bg-muted/30 border border-border/60 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground block">مكتمل</span>
                    <strong className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{doctor.stats?.completed ?? 0}</strong>
                  </div>
                  <div className="bg-muted/30 border border-border/60 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground block">انتظار</span>
                    <strong className="text-xs font-mono text-amber-600 dark:text-amber-400">{doctor.stats?.pending ?? 0}</strong>
                  </div>
                  <div className="bg-muted/30 border border-border/60 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground block">ملغي</span>
                    <strong className="text-xs font-mono text-rose-600 dark:text-rose-400">{doctor.stats?.cancelled ?? 0}</strong>
                  </div>
                  <div className="bg-muted/30 border border-border/60 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground block">لم يحضر</span>
                    <strong className="text-xs font-mono text-muted-foreground">{doctor.stats?.noShow ?? 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground">الأداء والتحصيل المالي</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-0.5">
                  <span className="text-muted-foreground">إجمالي المطالب</span>
                  <p className="font-mono text-sm font-bold text-foreground">{fmtMoney(doctor.stats?.totalBilled)}</p>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-0.5">
                  <span className="text-muted-foreground">المحصل</span>
                  <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(doctor.stats?.collected)}</p>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-0.5">
                  <span className="text-muted-foreground">الخصومات</span>
                  <p className="font-mono text-sm font-bold text-muted-foreground">{fmtMoney(doctor.stats?.discounts)}</p>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-0.5">
                  <span className="text-muted-foreground">المتبقي</span>
                  <p className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">{fmtMoney(doctor.stats?.outstanding)}</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 col-span-2 space-y-0.5">
                  <span className="text-primary font-medium">عمولة الطبيب المستحقة ({doctor.commissionRate != null ? `${doctor.commissionRate}%` : "—"})</span>
                  <p className="font-mono text-base font-bold text-primary">{fmtMoney(doctor.stats?.commission)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Availability weekly ribbon */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              مواعيد العمل الأسبوعية
            </h3>
            {(!doctor.availability || doctor.availability.length === 0) ? (
              <p className="text-center py-6 text-xs text-muted-foreground">لم يتم ضبط جدول الأيام والساعات بعد</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {WEEKDAY_NAMES.map((dayName, idx) => {
                  const slot = (doctor.availability || []).find(a => a.dayOfWeek === idx && a.isAvailable);
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-2.5 text-center transition-colors ${
                        slot
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted/30 border-border/60 text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs font-semibold">{dayName}</p>
                      {slot ? (
                        <p className="text-xs font-mono font-bold mt-1" dir="ltr">{slot.startTime} - {slot.endTime}</p>
                      ) : (
                        <p className="text-[11px] mt-1 opacity-60">راحة</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
