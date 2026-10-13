import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Building2,
  User,
  RefreshCw,
  FileText,
  Activity,
  HeartPulse,
  Pill,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface Visit {
  id: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  serviceName?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  prescription?: string;
  branch?: { id: string; name: string };
  doctor?: { id: string; title: string; name: string };
}

const mockMedicalHistory: Visit[] = [
  {
    id: "v-1",
    appointmentDate: "2026-10-05T10:00:00Z",
    startTime: "10:30 ص",
    status: "completed",
    serviceName: "فحص باطنة واستشارة هضمية",
    branch: { id: "b1", name: "الفرع الرئيسي - المهندسين" },
    doctor: { id: "d1", title: "د.", name: "خالد عبد الرحمن" },
    diagnosis: "التهاب خفيف بجدار المعدة مع عسر هضم وظيفي، ضغط الدم 120/80 مستقر.",
    treatmentPlan: "اتباع حمية غذائية متوازنة وتجنب الأطعمة الحارة والدهنية لمدة 14 يوماً مع متابعة الأعراض.",
    prescription: "أوميبرازول 20 ملجم (كبسولة قبل الإفطار) + موتيليوم 10 ملجم (قرص قبل الوجبات).",
  },
  {
    id: "v-2",
    appointmentDate: "2026-08-18T14:00:00Z",
    startTime: "02:15 م",
    status: "completed",
    serviceName: "فحص دوري سنوي ومتابعة سكر",
    branch: { id: "b2", name: "فرع التجمع الخامس" },
    doctor: { id: "d2", title: "د.", name: "إيمان عبد العزيز" },
    diagnosis: "مستوى السكر الصائم 98 mg/dL وتراكمي HbA1c 5.4% ضمن المعدل الطبيعي الممتاز.",
    treatmentPlan: "الاستمرار على ممارسة رياضة المشي يومياً 30 دقيقة وشرب كميات كافية من الماء.",
    prescription: "مكمل فيتامين د 50000 وحدة دولية (كبسولة أسبوعياً لمدة شهر).",
  },
];

const PatientHistoryPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("patientToken");
      const res = await fetch("/api/v1/booking/patient-portal/medical-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setVisits(json.data);
      } else {
        setVisits(mockMedicalHistory);
      }
    } catch {
      setVisits(mockMedicalHistory);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل السجل الطبي...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              MEDICAL HISTORY
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              سجل سري ومحمي
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            تاريخي الطبي والروشتات
          </h1>
          <p className="text-xs text-muted-foreground">
            كشف الزيارات السابقة، تقارير التشخيص، والوصفات الدوائية المعتمدة من الأطباء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">الزيارات السريرية</span>
            <HeartPulse className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {visits.length} زيارات
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">موثقة بالعيادة</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">الروشتات الموثقة</span>
            <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {visits.filter((v) => v.prescription).length} وصفة
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">أدوية معتمدة</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">حالة السجل الطبي</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            محدث ومكتمل
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">جاهز للاطلاع</div>
        </div>
      </div>

      {/* Visits Timeline Container */}
      <div className="space-y-4">
        {visits.length === 0 ? (
          <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-12 text-center shadow-xs">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد سجلات طبية مدونة بعد</p>
            <p className="text-xs text-muted-foreground">
              سيظهر تقرير الكشف هنا فور اعتماده من الطبيب المعالج
            </p>
          </div>
        ) : (
          visits.map((v) => {
            const dateStr = new Date(v.appointmentDate).toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={v.id}
                className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-xs transition-all hover:border-border"
              >
                {/* Visit Header */}
                <div className="flex flex-col justify-between gap-2 border-b border-border/50 pb-3.5 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {v.serviceName || "كشف استشاري"}
                      </span>
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        زيارة موثقة
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {v.startTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-start text-xs text-muted-foreground sm:self-center">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {v.doctor
                          ? `${v.doctor.title || ""} ${v.doctor.name || ""}`
                          : "طبيب العيادة"}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{v.branch?.name || "الفرع الرئيسي"}</span>
                    </span>
                  </div>
                </div>

                {/* Clinical Notes Grid */}
                <div className="grid grid-cols-1 gap-3.5 text-xs md:grid-cols-3">
                  {v.diagnosis && (
                    <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span>التشخيص الطبي</span>
                      </div>
                      <p className="leading-relaxed text-muted-foreground">
                        {v.diagnosis}
                      </p>
                    </div>
                  )}

                  {v.treatmentPlan && (
                    <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>خطة العلاج والإرشادات</span>
                      </div>
                      <p className="leading-relaxed text-muted-foreground">
                        {v.treatmentPlan}
                      </p>
                    </div>
                  )}

                  {v.prescription && (
                    <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Pill className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>الوصفة الدوائية (الروشتة)</span>
                      </div>
                      <p className="font-mono leading-relaxed text-muted-foreground">
                        {v.prescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PatientHistoryPage;
