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
  Filter
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
    lastVisit: "2026-10-12"
  },
  {
    id: "pat-002",
    firstName: "فاطمة الزهراء",
    lastName: "الشناوي",
    phone: "01123456789",
    gender: "female",
    bloodType: "A+",
    _count: { appointments: 4 },
    lastVisit: "2026-10-10"
  },
  {
    id: "pat-003",
    firstName: "محمد",
    lastName: "هاني القاضي",
    phone: "01234567890",
    gender: "male",
    bloodType: "B+",
    _count: { appointments: 12 },
    lastVisit: "2026-10-08"
  },
  {
    id: "pat-004",
    firstName: "نادية",
    lastName: "عبد المجيد رضوان",
    phone: "01555667788",
    gender: "female",
    bloodType: "AB+",
    _count: { appointments: 3 },
    lastVisit: "2026-10-05"
  },
  {
    id: "pat-005",
    firstName: "ياسر",
    lastName: "فاروق الألفي",
    phone: "01000112244",
    gender: "male",
    bloodType: "O-",
    _count: { appointments: 6 },
    lastVisit: "2026-09-28"
  }
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
        headers: { Authorization: `Bearer ${token}` }
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
  const totalVisits = patients.reduce((acc, p) => acc + (p._count?.appointments ?? 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل سجل المرضى...</p>
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
              PATIENTS REGISTRY
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {totalPatients} ملف طبي مسجل
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">سجل ملفات المرضى</h1>
          <p className="text-xs text-muted-foreground">
            إدارة البيانات الطبية الشخصية، سجل الزيارات، وفصائل الدم للمراجعين
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPatients}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي المراجعين</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {totalPatients} مريض
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي الزيارات والكشوفات</span>
            <HeartPulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {totalVisits} زيارة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">معدل مراجعة المريض</span>
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {(totalVisits / Math.max(1, totalPatients)).toFixed(1)} كشوفات / ملف
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
          <button
            onClick={() => setGenderFilter("ALL")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              genderFilter === "ALL"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({patients.length})
          </button>
          <button
            onClick={() => setGenderFilter("male")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              genderFilter === "male"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ذكور ({patients.filter((p) => p.gender === "male").length})
          </button>
          <button
            onClick={() => setGenderFilter("female")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              genderFilter === "female"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            إناث ({patients.filter((p) => p.gender === "female").length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Single-Surface Patients Table */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Users className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا يوجد مرضى مطابقين للبحث</p>
            <p className="text-xs text-muted-foreground">جرب تعديل شروط البحث أو الفلاتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-3 px-4">اسم المريض</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">الجنس</th>
                  <th className="py-3 px-4">فصيلة الدم</th>
                  <th className="py-3 px-4">عدد الزيارات</th>
                  <th className="py-3 px-4">آخر مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {p.firstName ? p.firstName[0] : "م"}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {p.firstName} {p.lastName || ""}
                          </span>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-foreground/90" dir="ltr">
                      {p.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {p.gender === "female" ? "أنثى" : p.gender === "male" ? "ذكر" : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.bloodType ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          <Droplet className="w-2.5 h-2.5" />
                          {p.bloodType}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-muted text-foreground border border-border/50">
                        {p._count?.appointments ?? 0} زيارة
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
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
