import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Clock,
  User,
  RefreshCw,
  ShoppingCart,
  BookOpen,
  CheckCircle2,
  CalendarDays
} from "lucide-react";

interface Enrollment {
  id: string;
  remainingHours: number;
  totalHours?: number;
  package: { id: string; name: string; hoursCount: number; price: number };
  teacher: { name: string } | null;
  subject: { name: string } | null;
  student?: { firstName: string; lastName: string };
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

const mockChildren: Child[] = [
  { id: "ch-1", firstName: "يوسف", lastName: "محمد النجار" },
  { id: "ch-2", firstName: "سارة", lastName: "محمد النجار" }
];

const mockEnrollmentsMap: Record<string, Enrollment[]> = {
  "ch-1": [
    {
      id: "en-1",
      remainingHours: 14,
      totalHours: 20,
      package: { id: "p-1", name: "باقة الرياضيات المتكاملة", hoursCount: 20, price: 3000 },
      teacher: { name: "أ. حسام الدين عبد الله" },
      subject: { name: "الرياضيات التطبيقية" }
    },
    {
      id: "en-2",
      remainingHours: 6,
      totalHours: 12,
      package: { id: "p-2", name: "باقة الفيزياء المتقدمة", hoursCount: 12, price: 2100 },
      teacher: { name: "أ. محمود شاكر" },
      subject: { name: "الفيزياء الكهربية" }
    }
  ],
  "ch-2": [
    {
      id: "en-3",
      remainingHours: 18,
      totalHours: 24,
      package: { id: "p-3", name: "باقة اللغة الإنجليزية التأسيسية", hoursCount: 24, price: 2800 },
      teacher: { name: "ميس رانيا حسن" },
      subject: { name: "اللغة الإنجليزية" }
    }
  ]
};

const ParentEnrollmentsPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [enrollmentsMap, setEnrollmentsMap] = useState<Record<string, Enrollment[]>>({});
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("parentToken");
      const res = await fetch("/api/v1/education/parent-portal/children", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success && Array.isArray(d.data) && d.data.length > 0) {
        setChildren(d.data);
        const map: Record<string, Enrollment[]> = {};
        for (const child of d.data) {
          const eRes = await fetch(
            `/api/v1/education/parent-portal/children/${child.id}/enrollments`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const eJson = await eRes.json();
          if (eJson.success && Array.isArray(eJson.data)) {
            map[child.id] = eJson.data;
          }
        }
        setEnrollmentsMap(map);
      } else {
        setChildren(mockChildren);
        setEnrollmentsMap(mockEnrollmentsMap);
      }
    } catch {
      setChildren(mockChildren);
      setEnrollmentsMap(mockEnrollmentsMap);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allEnrollments = useMemo(() => {
    if (selectedChildId === "ALL") {
      return Object.entries(enrollmentsMap).flatMap(([cId, eList]) => {
        const child = children.find((c) => c.id === cId);
        return eList.map((e) => ({
          ...e,
          student: e.student || (child ? { firstName: child.firstName, lastName: child.lastName } : undefined)
        }));
      });
    }
    const child = children.find((c) => c.id === selectedChildId);
    return (enrollmentsMap[selectedChildId] || []).map((e) => ({
      ...e,
      student: e.student || (child ? { firstName: child.firstName, lastName: child.lastName } : undefined)
    }));
  }, [enrollmentsMap, selectedChildId, children]);

  const totalRemainingHours = useMemo(() => {
    return allEnrollments.reduce((sum, e) => sum + e.remainingHours, 0);
  }, [allEnrollments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل الباقات والتسجيلات...</p>
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
              ACADEMIC ENROLLMENTS
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {allEnrollments.length} باقات نشطة
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">سجل الباقات والاشتراكات</h1>
          <p className="text-xs text-muted-foreground">
            متابعة رصيد الساعات المتبقية للأبناء، المعلمين المسندين، وتفاصيل الباقات الدراسية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
          <Link
            to="/parent/buy-package"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>شراء باقة جديدة</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي الساعات المتبقية</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {totalRemainingHours} ساعة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الباقات الفعالة</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {allEnrollments.length} باقة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الأبناء المشتركون</span>
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {children.length} طلاب
          </div>
        </div>
      </div>

      {/* Children Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs w-fit">
        <button
          onClick={() => setSelectedChildId("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            selectedChildId === "ALL"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة الأبناء ({children.length})
        </button>
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedChildId(c.id)}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              selectedChildId === c.id
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.firstName} {c.lastName}
          </button>
        ))}
      </div>

      {/* Enrollments Single-Surface Container */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {allEnrollments.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد باقات مفعلة حالياً</p>
            <p className="text-xs text-muted-foreground">يمكنك شراء باقة تعليمية جديدة لأبنائك</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {allEnrollments.map((e) => {
              const total = e.package?.hoursCount || 20;
              const pct = Math.min(100, Math.round((e.remainingHours / total) * 100));

              return (
                <div
                  key={e.id}
                  className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-foreground">
                          {e.package?.name || "باقة تعليمية"}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          نشط
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>المادة: {e.subject?.name || "—"}</span>
                        <span>•</span>
                        <span>المعلم: {e.teacher?.name || "لم يحدد"}</span>
                        {e.student && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-foreground">
                              الطالب: {e.student.firstName} {e.student.lastName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full max-w-xs pt-1 space-y-1">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                          <span>المتبقي: {e.remainingHours} ساعة</span>
                          <span>الإجمالي: {total} ساعة</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-left font-mono">
                      <div className="text-base font-bold text-foreground">
                        {e.package?.price} ج.م
                      </div>
                      <div className="text-[11px] text-muted-foreground">قيمة الباقة</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentEnrollmentsPage;
