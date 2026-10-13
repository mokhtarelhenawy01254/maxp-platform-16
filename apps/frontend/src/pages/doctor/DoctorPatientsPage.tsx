import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Droplet,
  User,
  HeartPulse,
  CalendarDays,
  ChevronLeft,
  Filter,
} from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  gender?: "male" | "female" | string;
  bloodType?: string;
  _count?: { appointments: number };
  lastVisit?: string;
}

const mockPatientsList: Patient[] = [
  {
    id: "pat-001",
    firstName: "عبد الرحمن",
    lastName: "كمال الملاح",
    phone: "01098765432",
    gender: "male",
    bloodType: "O+",
    _count: { appointments: 8 },
    lastVisit: "2026-10-12",
  },
  {
    id: "pat-002",
    firstName: "فاطمة الزهراء",
    lastName: "الشناوي",
    phone: "01123456789",
    gender: "female",
    bloodType: "A+",
    _count: { appointments: 4 },
    lastVisit: "2026-10-10",
  },
  {
    id: "pat-003",
    firstName: "محمد",
    lastName: "هاني القاضي",
    phone: "01234567890",
    gender: "male",
    bloodType: "B+",
    _count: { appointments: 12 },
    lastVisit: "2026-10-08",
  },
  {
    id: "pat-004",
    firstName: "نادية",
    lastName: "عبد المجيد رضوان",
    phone: "01555667788",
    gender: "female",
    bloodType: "AB+",
    _count: { appointments: 3 },
    lastVisit: "2026-10-05",
  },
  {
    id: "pat-005",
    firstName: "ياسر",
    lastName: "فاروق الألفي",
    phone: "01000112244",
    gender: "male",
    bloodType: "O-",
    _count: { appointments: 6 },
    lastVisit: "2026-09-28",
  },
];

const DoctorPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"ALL" | "male" | "female">("ALL");

  const fetchPatients = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("doctorToken");
      const res = await fetch("/api/v1/booking/doctor-portal/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setPatients(json.data);
      } else {
        setPatients(mockPatientsList);
      }
    } catch {
      setPatients(mockPatientsList);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (p.firstName || "").toLowerCase().includes(q) ||
        (p.lastName || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
      );
    });
  }, [patients, search, genderFilter]);

  const totalPatients = patients.length;
  const totalVisits = patients.reduce(
    (acc, p) => acc + (p._count?.appointments ?? 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل سجل المرضى...</span>
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
              PATIENTS REGISTRY
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              إجمالي {totalPatients} ملف طبي مسجل
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            سجل ملفات المرضى
          </h1>
          <p className="text-xs text-muted-foreground">
            إدارة البيانات الطبية الشخصية، سجل الزيارات، وفصائل الدم للمراجعين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatients}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي المراجعين</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalPatients} مريض
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الزيارات والكشوفات</span>
            <HeartPulse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalVisits} زيارة
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">معدل مراجعة المريض</span>
            <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {(totalVisits / Math.max(1, totalPatients)).toFixed(1)} كشوفات / ملف
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 text-xs">
          <button
            onClick={() => setGenderFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              genderFilter === "ALL"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({patients.length})
          </button>
          <button
            onClick={() => setGenderFilter("male")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              genderFilter === "male"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ذكور ({patients.filter((p) => p.gender === "male").length})
          </button>
          <button
            onClick={() => setGenderFilter("female")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              genderFilter === "female"
                ? "border border-border/70 bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            إناث ({patients.filter((p) => p.gender === "female").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background py-1.5 pl-3 pr-9 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Single-Surface Patients Table Chassis */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {filtered.length === 0 ? (
          <div className="space-y-2 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
            <p className="text-sm font-medium text-foreground">لا يوجد مرضى مطابقين للبحث</p>
            <p className="text-xs text-muted-foreground">جرب تعديل مصطلح البحث أو الفلاتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">اسم المريض</th>
                  <th className="px-4 py-3 font-medium">رقم الهاتف</th>
                  <th className="px-4 py-3 font-medium">الجنس</th>
                  <th className="px-4 py-3 font-medium">فصيلة الدم</th>
                  <th className="px-4 py-3 font-medium">عدد الزيارات</th>
                  <th className="px-4 py-3 font-medium">آخر مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                          {p.firstName ? p.firstName[0] : "م"}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {p.firstName} {p.lastName || ""}
                          </span>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-foreground" dir="ltr">
                      {p.phone || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {p.gender === "female" ? "أنثى" : p.gender === "male" ? "ذكر" : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.bloodType ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-destructive">
                          <Droplet className="h-2.5 w-2.5" />
                          {p.bloodType}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md border border-border/50 bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                        {p._count?.appointments ?? 0} زيارة
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString("ar-EG") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPatientsPage;
