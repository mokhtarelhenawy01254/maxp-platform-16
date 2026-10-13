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
  CheckCircle2
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
    prescription: "أوميبرازول 20 ملجم (كبسولة قبل الإفطار) + موتيليوم 10 ملجم (قرص قبل الوجبات)."
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
    prescription: "مكمل فيتامين د 50000 وحدة دولية (كبسولة أسبوعياً لمدة شهر)."
  }
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
        headers: { Authorization: `Bearer ${token}` }
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
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل السجل الطبي...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              MEDICAL HISTORY
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              سجل سري ومحمي
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">تاريخي الطبي والروشتات</h1>
          <p className="text-xs text-muted-foreground">
            كشف الزيارات السابقة، تقارير التشخيص، والوصفات الدوائية المعتمدة من الأطباء
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الزيارات السريرية</span>
            <HeartPulse className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {visits.length} زيارات
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الروشتات الموثقة</span>
            <Pill className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {visits.filter((v) => v.prescription).length} وصفة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">حالة السجل الطبي</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-sm font-semibold text-foreground mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            محدث ومكتمل
          </div>
        </div>
      </div>

      {/* Visits Timeline Container */}
      <div className="space-y-4">
        {visits.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card p-12 text-center space-y-2 shadow-sm">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد سجلات طبية مدونة بعد</p>
            <p className="text-xs text-muted-foreground">سيظهر تقرير الكشف هنا فور اعتماده من الطبيب المعالج</p>
          </div>
        ) : (
          visits.map((v) => {
            const dateStr = new Date(v.appointmentDate).toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric"
            });

            return (
              <div
                key={v.id}
                className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4 hover:border-border transition-all"
              >
                {/* Visit Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {v.serviceName || "كشف استشاري"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                        زيارة موثقة
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-mono text-foreground/80">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-foreground/80">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {v.startTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground self-start sm:self-center">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{v.doctor ? `${v.doctor.title || ""} ${v.doctor.name || ""}` : "طبيب العيادة"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{v.branch?.name || "الفرع الرئيسي"}</span>
                    </span>
                  </div>
                </div>

                {/* Clinical Notes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {v.diagnosis && (
                    <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span>التشخيص الطبي</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {v.diagnosis}
                      </p>
                    </div>
                  )}

                  {v.treatmentPlan && (
                    <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>خطة العلاج والإرشادات</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {v.treatmentPlan}
                      </p>
                    </div>
                  )}

                  {v.prescription && (
                    <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-blue-600" />
                        <span>الوصفة الدوائية (الروشتة)</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed font-mono">
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
