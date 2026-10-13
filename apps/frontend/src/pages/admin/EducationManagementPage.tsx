import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  GraduationCap,
  BookOpen,
  Gift,
  Users,
  Clock,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  Phone,
  Eye,
  Sparkles,
  AlertTriangle,
  School,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";

const getCompanyId = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").companyId || null;
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

const api = (path: string) => {
  const base = buildApiUrl(`education/${path}`);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, window.location.origin);
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

const searchCustomersApi = (q: string) => {
  const base = buildApiUrl(`customers/search?query=${encodeURIComponent(q)}`);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, window.location.origin);
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

interface EducationSubject {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface EducationPackage {
  id: string;
  subjectId: string;
  name: string;
  description?: string;
  hoursCount: number;
  sessionDuration: number;
  price: number;
  isActive: boolean;
  subject?: { id: string; name: string };
}

interface EducationStudent {
  id: string;
  customerId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  grade?: string;
  notes?: string;
  isActive: boolean;
  customer?: { id: string; firstName: string; lastName: string; phone: string };
  enrollments?: EducationEnrollment[];
}

interface EducationTeacher {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  bio?: string;
  qualifications?: string;
  avatarUrl?: string;
  isActive: boolean;
  subjectRates?: { id: string; subjectId: string; hourlyRate: number; subject: { id: string; name: string } }[];
}

interface EducationEnrollment {
  id: string;
  studentId: string;
  packageId: string;
  teacherId: string;
  totalHours: number;
  remainingHours: number;
  amountPaid: number;
  paymentStatus: string;
  enrollmentDate: string;
  expiresAt?: string;
  isActive: boolean;
  student?: { id: string; firstName: string; lastName?: string };
  package?: { id: string; name: string; subject?: { id: string; name: string } };
  teacher?: { id: string; name: string };
}

interface EducationSession {
  id: string;
  enrollmentId: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration?: number;
  topic?: string;
  notes?: string;
  status: string;
  createdAt: string;
  student?: { id: string; firstName: string; lastName?: string };
  teacher?: { id: string; name: string };
  subject?: { id: string; name: string };
  enrollment?: { id: string; remainingHours: number };
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

type TabId = "dashboard" | "subjects" | "packages" | "students" | "teachers" | "enrollments" | "sessions";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: BarChart3 },
  { id: "subjects", label: "المواد", icon: BookOpen },
  { id: "packages", label: "الباقات", icon: Gift },
  { id: "students", label: "الطلاب", icon: Users },
  { id: "teachers", label: "المدرسين", icon: GraduationCap },
  { id: "enrollments", label: "التسجيلات", icon: Layers },
  { id: "sessions", label: "الحصص", icon: Clock },
];

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  CONFIRMED: { label: "مؤكدة", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "ملغية", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

const fetchJson = async (url: string, options?: RequestInit, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error("الخادم غير متاح حالياً - جارٍ إعادة التشغيل");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "فشل العملية");
      return data.data;
    } catch (e: any) {
      if (attempt < retries && (e.message?.includes("502") || e.message?.includes("503") || e.message?.includes("fetch"))) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
};

const MODAL_CLS = "bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-xl mx-4 space-y-4";
const INPUT_CLS = "w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const CELL_CLS = "py-3 px-4 text-xs";

export default function EducationManagementPage() {
  const { "*": path } = useParams();
  const navigate = useNavigate();
  const urlTab = (path || "").split("/")[0];
  const activeTab = (TABS.map((t) => t.id).includes(urlTab as TabId) ? urlTab : "dashboard") as TabId;
  const setActiveTab = (tab: TabId) => navigate(`/admin/education/${tab === "dashboard" ? "" : tab}`);

  const [subjects, setSubjects] = useState<EducationSubject[]>([]);
  const [packages, setPackages] = useState<EducationPackage[]>([]);
  const [students, setStudents] = useState<EducationStudent[]>([]);
  const [teachers, setTeachers] = useState<EducationTeacher[]>([]);
  const [enrollments, setEnrollments] = useState<EducationEnrollment[]>([]);
  const [sessions, setSessions] = useState<EducationSession[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [subjectModal, setSubjectModal] = useState<Partial<EducationSubject> | null | undefined>(undefined);
  const [packageModal, setPackageModal] = useState<Partial<EducationPackage> | null | undefined>(undefined);
  const [studentModal, setStudentModal] = useState<Partial<EducationStudent> | null | undefined>(undefined);
  const [teacherModal, setTeacherModal] = useState<Partial<EducationTeacher> | null | undefined>(undefined);
  const [sessionModal, setSessionModal] = useState<Partial<EducationSession> | null | undefined>(undefined);
  const [enrollmentModal, setEnrollmentModal] = useState<Partial<EducationEnrollment> | null | undefined>(undefined);

  // Search/filter
  const [subjectSearch, setSubjectSearch] = useState("");
  const [packageSubjectFilter, setPackageSubjectFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [sessionFilters, setSessionFilters] = useState({ status: "", teacherId: "", from: "", to: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchAll();
    }
    if (activeTab === "subjects") {
      setLoading(true);
      fetchSubjects().finally(() => setLoading(false));
    }
    if (activeTab === "packages") {
      setLoading(true);
      fetchPackages().finally(() => setLoading(false));
    }
    if (activeTab === "students") {
      setLoading(true);
      fetchStudents().finally(() => setLoading(false));
    }
    if (activeTab === "teachers") {
      setLoading(true);
      fetchTeachers().finally(() => setLoading(false));
    }
    if (activeTab === "enrollments") {
      setLoading(true);
      fetchEnrollments().finally(() => setLoading(false));
    }
    if (activeTab === "sessions") {
      setLoading(true);
      fetchSessions().finally(() => setLoading(false));
    }
  }, [activeTab]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSubjects(),
        fetchPackages(),
        fetchStudents(),
        fetchTeachers(),
        fetchEnrollments(),
        fetchSessions(),
      ]);
    } catch (e: any) {
      setError(e.message || "فشل تحميل البيانات");
    }
    setLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      setSubjects(await fetchJson(api("subjects")));
    } catch (e: any) {
      throw e;
    }
  };
  const fetchPackages = async () => {
    try {
      setPackages(await fetchJson(api("packages")));
    } catch (e: any) {
      throw e;
    }
  };
  const fetchStudents = async () => {
    try {
      setStudents(await fetchJson(api("students")));
    } catch (e: any) {
      throw e;
    }
  };
  const fetchTeachers = async () => {
    try {
      setTeachers(await fetchJson(api("teachers")));
    } catch (e: any) {
      throw e;
    }
  };
  const fetchEnrollments = async () => {
    try {
      setEnrollments(await fetchJson(api("enrollments")));
    } catch (e: any) {
      throw e;
    }
  };
  const fetchSessions = async () => {
    const params = new URLSearchParams();
    if (sessionFilters.status) params.append("status", sessionFilters.status);
    if (sessionFilters.teacherId) params.append("teacherId", sessionFilters.teacherId);
    if (sessionFilters.from) params.append("from", sessionFilters.from);
    if (sessionFilters.to) params.append("to", sessionFilters.to);
    try {
      setSessions(await fetchJson(api(`sessions?${params}`)));
    } catch (e: any) {
      throw e;
    }
  };

  const searchCustomers = async (q: string) => {
    if (!q || q.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const data = await fetchJson(searchCustomersApi(q));
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    }
  };

  // CRUD helpers
  const saveItem = async (entity: string, data: any) => {
    const isEdit = !!data.id;
    const url = isEdit ? api(`${entity}/${data.id}`) : api(entity);
    const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
    const result = await res.json();
    if (!result.success) {
      alert(result.error || "فشل الحفظ");
      return false;
    }
    return true;
  };
  const deleteItem = async (entity: string, id: string) => {
    if (!confirm("تأكيد الحذف؟")) return false;
    const res = await fetch(api(`${entity}/${id}`), { method: "DELETE", headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "فشل الحذف");
      return false;
    }
    return true;
  };
  const toggleActive = async (entity: string, id: string, current: boolean) => {
    const res = await fetch(api(`${entity}/${id}`), { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ isActive: !current }) });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "فشل التحديث");
      return false;
    }
    return true;
  };

  // Subject handlers
  const handleSaveSubject = async (d: Partial<EducationSubject>) => {
    if (!(await saveItem("subjects", d))) return;
    setSubjectModal(undefined);
    fetchSubjects();
  };
  const handleToggleSubject = async (id: string, current: boolean) => {
    if (await toggleActive("subjects", id, current)) fetchSubjects();
  };
  const handleDeleteSubject = async (id: string) => {
    if (await deleteItem("subjects", id)) fetchSubjects();
  };

  // Package handlers
  const handleSavePackage = async (d: Partial<EducationPackage>) => {
    if (!(await saveItem("packages", d))) return;
    setPackageModal(undefined);
    fetchPackages();
  };
  const handleTogglePackage = async (id: string, current: boolean) => {
    if (await toggleActive("packages", id, current)) fetchPackages();
  };
  const handleDeletePackage = async (id: string) => {
    if (await deleteItem("packages", id)) fetchPackages();
  };

  // Student handlers
  const handleSaveStudent = async (d: Partial<EducationStudent>) => {
    if (!(await saveItem("students", d))) return;
    setStudentModal(undefined);
    fetchStudents();
  };
  const handleToggleStudent = async (id: string, current: boolean) => {
    if (await toggleActive("students", id, current)) fetchStudents();
  };
  const handleDeleteStudent = async (id: string) => {
    if (await deleteItem("students", id)) fetchStudents();
  };

  // Teacher handlers
  const handleSaveTeacher = async (d: Partial<EducationTeacher>) => {
    if (!(await saveItem("teachers", d))) return;
    setTeacherModal(undefined);
    fetchTeachers();
  };
  const handleToggleTeacher = async (id: string, current: boolean) => {
    if (await toggleActive("teachers", id, current)) fetchTeachers();
  };
  const handleDeleteTeacher = async (id: string) => {
    if (await deleteItem("teachers", id)) fetchTeachers();
  };

  // Enrollment handlers
  const handleSaveEnrollment = async (d: Partial<EducationEnrollment>) => {
    if (!(await saveItem("enrollments", d))) return;
    setEnrollmentModal(undefined);
    fetchEnrollments();
  };
  const handleDeleteEnrollment = async (id: string) => {
    if (await deleteItem("enrollments", id)) fetchEnrollments();
  };

  // Session handlers
  const handleSaveSession = async (d: Partial<EducationSession>) => {
    if (!(await saveItem("sessions", d))) return;
    setSessionModal(undefined);
    fetchSessions();
  };
  const handleConfirmSession = async (id: string, actualDuration?: number) => {
    const res = await fetch(api(`sessions/${id}/confirm`), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ actualDuration: actualDuration || undefined }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "فشل التأكيد");
      return;
    }
    fetchSessions();
  };
  const handleCancelSession = async (id: string) => {
    if (!confirm("تأكيد إلغاء الحصة؟")) return;
    const res = await fetch(api(`sessions/${id}/cancel`), { method: "PUT", headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "فشل الإلغاء");
      return;
    }
    fetchSessions();
  };

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const stats = useMemo(
    () => ({
      totalSubjects: subjects.filter((s) => s.isActive).length,
      totalPackages: packages.filter((p) => p.isActive).length,
      totalStudents: students.filter((s) => s.isActive).length,
      totalTeachers: teachers.filter((t) => t.isActive).length,
      activeEnrollments: enrollments.filter((e) => e.remainingHours > 0).length,
      sessionsToday: sessions.filter((s) => s.scheduledAt?.startsWith(today)).length,
      totalSessions: sessions.filter((s) => s.status === "CONFIRMED").length,
      scheduledSessions: sessions.filter((s) => s.status === "SCHEDULED").length,
    }),
    [subjects, packages, students, teachers, enrollments, sessions, today]
  );

  // ==================== RENDERERS ====================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "المواد الدراسية", value: stats.totalSubjects, icon: BookOpen, color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" },
          { label: "الباقات المتاحة", value: stats.totalPackages, icon: Gift, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" },
          { label: "الطلاب المسجلين", value: stats.totalStudents, icon: Users, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "المدرسين المتاحين", value: stats.totalTeachers, icon: GraduationCap, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { label: "تسجيلات سارية", value: stats.activeEnrollments, icon: Layers, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
          { label: "حصص اليوم", value: stats.sessionsToday, icon: Clock, color: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20" },
          { label: "حصص مجدولة", value: stats.scheduledSessions, icon: Calendar, color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20" },
          { label: "حصص مؤكدة", value: stats.totalSessions, icon: CheckCircle2, color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20" },
        ].map((c, i) => (
          <div key={i} className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              أحدث الحصص المجدولة
            </h3>
            <button onClick={() => setActiveTab("sessions")} className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {sessions.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="font-medium text-foreground">{s.student ? `${s.student.firstName} ${s.student.lastName || ""}` : "—"}</span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-muted-foreground">{s.subject?.name || "مادة غير محددة"}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] border ${SESSION_STATUS[s.status]?.color || ""}`}>
                  {SESSION_STATUS[s.status]?.label || s.status}
                </span>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-center py-6 text-xs text-muted-foreground">لا توجد حصص مسجلة</p>}
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              التسجيلات النشطة
            </h3>
            <button onClick={() => setActiveTab("enrollments")} className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {enrollments.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="font-medium text-foreground">{e.student ? `${e.student.firstName} ${e.student.lastName || ""}` : "—"}</span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-muted-foreground">{e.package?.name}</span>
                </div>
                <span className="font-mono tabular-nums text-xs font-medium text-primary">
                  {e.remainingHours}/{e.totalHours} س
                </span>
              </div>
            ))}
            {enrollments.length === 0 && <p className="text-center py-6 text-xs text-muted-foreground">لا توجد تسجيلات نشطة</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubjects = () => {
    const filtered = subjects.filter((s) => !subjectSearch || s.name.includes(subjectSearch));
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة المواد الأكاديمية</h2>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                className="bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="بحث في المواد..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setSubjectModal({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة مادة
            </button>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {["الاسم", "الوصف", "الحالة", ""].map((h) => (
                  <th key={h} className="text-right py-3 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className={CELL_CLS + " font-medium text-foreground"}>{s.name}</td>
                  <td className={CELL_CLS + " text-muted-foreground"}>{s.description || "—"}</td>
                  <td className={CELL_CLS}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.isActive ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSubjectModal(s)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSubject(s.id, s.isActive)}
                        className={`p-1.5 rounded-md transition-colors ${
                          s.isActive
                            ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={s.isActive ? "تعطيل" : "تفعيل"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(s.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-12 text-xs text-muted-foreground">لا توجد مواد مسجلة</p>}
        </div>
        {subjectModal !== undefined && (
          <SubjectModal subject={subjectModal} onClose={() => setSubjectModal(undefined)} onSave={handleSaveSubject} />
        )}
      </div>
    );
  };

  const renderPackages = () => {
    const filtered = packages.filter((p) => !packageSubjectFilter || p.subjectId === packageSubjectFilter);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة باقات الحصص</h2>
          <div className="flex items-center gap-2.5">
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={packageSubjectFilter}
              onChange={(e) => setPackageSubjectFilter(e.target.value)}
            >
              <option value="">كل المواد</option>
              {subjects
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setPackageModal({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة باقة
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`bg-card border border-border/80 rounded-xl p-4.5 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
                !p.isActive ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.subject?.name || "—"}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    p.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {p.isActive ? "نشط" : "معطل"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums">
                  {p.hoursCount} ساعة
                </span>
                <span className="bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md font-mono tabular-nums">
                  {p.sessionDuration} دقيقة/حصة
                </span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums font-semibold">
                  {p.price} ج.م
                </span>
              </div>

              {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}

              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <button
                  onClick={() => setPackageModal(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => handleTogglePackage(p.id, p.isActive)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    p.isActive ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {p.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => handleDeletePackage(p.id)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="حذف الباقة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-xs text-muted-foreground">لا توجد باقات مسجلة</p>}
        </div>
        {packageModal !== undefined && (
          <PackageModal pkg={packageModal} subjects={subjects} onClose={() => setPackageModal(undefined)} onSave={handleSavePackage} />
        )}
      </div>
    );
  };

  const renderStudents = () => {
    const filtered = students.filter(
      (s) => !studentSearch || s.firstName.includes(studentSearch) || s.lastName?.includes(studentSearch) || s.phone?.includes(studentSearch)
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة الطلاب</h2>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                className="bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="بحث عن طالب..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setStudentModal({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة طالب
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`bg-card border border-border/80 rounded-xl p-4.5 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
                !s.isActive ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {s.firstName} {s.lastName || ""}
                  </h3>
                  <p className="text-xs text-muted-foreground">{s.grade || "الصف غير محدد"}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    s.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {s.isActive ? "نشط" : "معطل"}
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                <Phone className="w-3 h-3 text-primary shrink-0" />
                {s.phone || "—"}
              </div>

              <div className="text-xs text-muted-foreground">
                ولي الأمر: {s.customer ? `${s.customer.firstName} ${s.customer.lastName || ""}` : "—"}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Link
                  to={`/admin/education/student/${s.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض
                </Link>
                <button
                  onClick={() => setStudentModal(s)}
                  className="px-2.5 py-1.5 text-xs text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleStudent(s.id, s.isActive)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    s.isActive ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {s.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => handleDeleteStudent(s.id)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-xs text-muted-foreground">لا يوجد طلاب مسجلين</p>}
        </div>
        {studentModal !== undefined && (
          <StudentModal
            student={studentModal}
            customers={customers}
            customerResults={customerResults}
            onCustomerSearch={searchCustomers}
            onClose={() => setStudentModal(undefined)}
            onSave={handleSaveStudent}
          />
        )}
      </div>
    );
  };

  const renderTeachers = () => {
    const filtered = teachers.filter((t) => !teacherSearch || t.name.includes(teacherSearch) || t.phone?.includes(teacherSearch));
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة المدرسين والكوادر التعليمية</h2>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                className="bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="بحث عن مدرس..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setTeacherModal({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة مدرس
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-card border border-border/80 rounded-xl p-4.5 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
                !t.isActive ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{t.phone || "—"}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    t.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {t.isActive ? "نشط" : "معطل"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {t.subjectRates?.map((sr) => (
                  <span
                    key={sr.id}
                    className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums"
                  >
                    {sr.subject.name}: {sr.hourlyRate} ج.م/س
                  </span>
                ))}
                {(!t.subjectRates || t.subjectRates.length === 0) && <span className="text-xs text-muted-foreground">لا توجد أسعار محددة</span>}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Link
                  to={`/admin/education/teacher/${t.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض
                </Link>
                <button
                  onClick={() => setTeacherModal(t)}
                  className="px-2.5 py-1.5 text-xs text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleTeacher(t.id, t.isActive)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    t.isActive ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {t.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => handleDeleteTeacher(t.id)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-xs text-muted-foreground">لا يوجد مدرسين مسجلين</p>}
        </div>
        {teacherModal !== undefined && (
          <TeacherModal teacher={teacherModal} subjects={subjects} onClose={() => setTeacherModal(undefined)} onSave={handleSaveTeacher} />
        )}
      </div>
    );
  };

  const renderEnrollments = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة التسجيلات والاشتراكات</h2>
          <button
            onClick={() => setEnrollmentModal({})}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة تسجيل جديد
          </button>
        </div>

        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {["الطالب", "الباقة", "المادة", "المدرس", "الساعات المتبقية", "المدفوع", "الحالة", ""].map((h) => (
                  <th key={h} className="text-right py-3 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {enrollments.map((e) => {
                const remaining = e.remainingHours ?? 0;
                const total = e.totalHours ?? 0;
                const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className={CELL_CLS + " font-medium text-foreground"}>
                      {e.student ? `${e.student.firstName} ${e.student.lastName || ""}` : "—"}
                    </td>
                    <td className={CELL_CLS + " text-muted-foreground"}>{e.package?.name || "—"}</td>
                    <td className={CELL_CLS + " text-muted-foreground"}>{e.package?.subject?.name || "—"}</td>
                    <td className={CELL_CLS}>
                      {e.teacher?.name || <span className="text-amber-500 text-[11px] font-medium">لم يحدد بعد</span>}
                    </td>
                    <td className={CELL_CLS}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono tabular-nums font-medium ${
                            remaining < total * 0.2
                              ? "text-red-600 dark:text-red-400"
                              : remaining < total * 0.5
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {remaining}/{total}
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct <= 20 ? "bg-red-500" : pct <= 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={CELL_CLS + " font-mono tabular-nums text-foreground"}>{e.amountPaid || 0} ج.م</td>
                    <td className={CELL_CLS}>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          ["COMPLETED", "PAID"].includes(e.paymentStatus)
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : e.paymentStatus === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                      >
                        {["COMPLETED", "PAID"].includes(e.paymentStatus) ? "مدفوع" : "معلق"}
                      </span>
                    </td>
                    <td className={CELL_CLS}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEnrollmentModal(e)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!e.teacher?.id && (
                          <span title="مطلوب تعيين مدرس">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteEnrollment(e.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {enrollments.length === 0 && <p className="text-center py-12 text-xs text-muted-foreground">لا توجد تسجيلات مسجلة</p>}
        </div>
        {enrollmentModal !== undefined && (
          <EnrollmentModal
            enrollment={enrollmentModal}
            students={students}
            packages={packages}
            teachers={teachers}
            subjects={subjects}
            onClose={() => setEnrollmentModal(undefined)}
            onSave={handleSaveEnrollment}
          />
        )}
      </div>
    );
  };

  const renderSessions = () => {
    const filtered = sessions.filter((s) => {
      if (sessionFilters.status && s.status !== sessionFilters.status) return false;
      if (sessionFilters.teacherId && s.teacherId !== sessionFilters.teacherId) return false;
      if (sessionFilters.from && s.scheduledAt < sessionFilters.from) return false;
      if (sessionFilters.to && s.scheduledAt > sessionFilters.to + "T23:59:59") return false;
      return true;
    });
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-bold text-foreground">إدارة الحصص والجداول</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={sessionFilters.status}
              onChange={(e) => setSessionFilters({ ...sessionFilters, status: e.target.value })}
            >
              <option value="">كل الحالات</option>
              {Object.entries(SESSION_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={sessionFilters.teacherId}
              onChange={(e) => setSessionFilters({ ...sessionFilters, teacherId: e.target.value })}
            >
              <option value="">كل المدرسين</option>
              {teachers
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <input
              type="date"
              className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={sessionFilters.from}
              onChange={(e) => setSessionFilters({ ...sessionFilters, from: e.target.value })}
            />
            <input
              type="date"
              className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={sessionFilters.to}
              onChange={(e) => setSessionFilters({ ...sessionFilters, to: e.target.value })}
            />
            <button
              onClick={() => setSessionModal({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة حصة
            </button>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {["الطالب", "المدرس", "المادة", "التاريخ والوقت", "المدة", "الحالة", ""].map((h) => (
                  <th key={h} className="text-right py-3 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className={CELL_CLS + " font-medium text-foreground"}>
                    {s.student ? `${s.student.firstName} ${s.student.lastName || ""}` : "—"}
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>{s.teacher?.name || "—"}</td>
                  <td className={CELL_CLS + " text-muted-foreground"}>{s.subject?.name || "—"}</td>
                  <td className={CELL_CLS + " font-mono text-muted-foreground"}>
                    {new Date(s.scheduledAt).toLocaleDateString("ar-EG")}{" "}
                    {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className={CELL_CLS + " font-mono tabular-nums text-foreground"}>
                    {s.actualDuration || s.plannedDuration} دقيقة
                  </td>
                  <td className={CELL_CLS}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        SESSION_STATUS[s.status]?.color || ""
                      }`}
                    >
                      {SESSION_STATUS[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex items-center justify-end gap-1">
                      {s.status === "SCHEDULED" && (
                        <>
                          <button
                            onClick={() => handleConfirmSession(s.id)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                            title="تأكيد الحضور"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelSession(s.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="إلغاء الحصة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSessionModal(s)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="تفاصيل"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-12 text-xs text-muted-foreground">لا توجد حصص مسجلة</p>}
        </div>
        {sessionModal !== undefined && (
          <SessionModal
            session={sessionModal}
            teachers={teachers}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            onClose={() => setSessionModal(undefined)}
            onSave={handleSaveSession}
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <School className="w-3.5 h-3.5" />
              القطاع التعليمي
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.totalStudents} طالب مسجل
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            إدارة المراكز والأكاديميات التعليمية
          </h1>
          <p className="text-xs text-muted-foreground">
            نظام متكامل لإدارة المواد، باقات الحصص، المدرسين، والطلاب وجداول الحصص الدورية
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">تعذر تحميل بيانات المركز التعليمي</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">جاري تحميل البيانات التعليمية...</span>
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "subjects" && renderSubjects()}
          {activeTab === "packages" && renderPackages()}
          {activeTab === "students" && renderStudents()}
          {activeTab === "teachers" && renderTeachers()}
          {activeTab === "enrollments" && renderEnrollments()}
          {activeTab === "sessions" && renderSessions()}
        </>
      )}
    </div>
  );
}

// ==================== MODALS ====================

function SubjectModal({
  subject,
  onClose,
  onSave,
}: {
  subject?: Partial<EducationSubject> | null;
  onClose: () => void;
  onSave: (d: Partial<EducationSubject>) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", description: "", ...subject });
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{subject?.id ? "تعديل المادة" : "إضافة مادة جديدة"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">اسم المادة *</label>
            <input className={INPUT_CLS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">الوصف</label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageModal({
  pkg,
  subjects,
  onClose,
  onSave,
}: {
  pkg?: Partial<EducationPackage> | null;
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationPackage>) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", description: "", subjectId: "", hoursCount: 1, sessionDuration: 60, price: 0, ...pkg });
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{pkg?.id ? "تعديل باقة الحصص" : "إضافة باقة جديدة"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">اسم الباقة *</label>
            <input className={INPUT_CLS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">المادة *</label>
            <select className={INPUT_CLS} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">اختر المادة</option>
              {subjects
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">عدد الساعات</label>
              <input
                type="number"
                min={1}
                className={INPUT_CLS}
                value={form.hoursCount}
                onChange={(e) => setForm({ ...form, hoursCount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الدقائق/حصة</label>
              <input
                type="number"
                min={15}
                step={15}
                className={INPUT_CLS}
                value={form.sessionDuration}
                onChange={(e) => setForm({ ...form, sessionDuration: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">السعر (ج.م)</label>
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">الوصف</label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.subjectId}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentModal({
  student,
  customers,
  customerResults,
  onCustomerSearch,
  onClose,
  onSave,
}: {
  student?: Partial<EducationStudent> | null;
  customers: Customer[];
  customerResults: Customer[];
  onCustomerSearch: (q: string) => void;
  onClose: () => void;
  onSave: (d: Partial<EducationStudent>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "male",
    grade: "",
    notes: "",
    customerId: "",
    ...student,
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const selectedCustomer = customers.find((c) => c.id === form.customerId) || customerResults.find((c) => c.id === form.customerId);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{student?.id ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الاسم الأول *</label>
              <input className={INPUT_CLS} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الاسم الأخير</label>
              <input className={INPUT_CLS} value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الهاتف</label>
              <input className={INPUT_CLS} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الجنس</label>
              <select className={INPUT_CLS} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">المرحلة / الصف</label>
            <input className={INPUT_CLS} value={form.grade || ""} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">ولي الأمر (العميل) *</label>
            <input
              className={INPUT_CLS}
              placeholder="ابحث عن ولي أمر بالاسم أو الهاتف..."
              value={customerSearch || (selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "")}
              onChange={(e) => {
                onCustomerSearch(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
            />
            {showResults && customerResults.length > 0 && (
              <div className="border border-border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card shadow-lg divide-y divide-border/60">
                {customerResults.map((c) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 hover:bg-muted/40 cursor-pointer text-xs"
                    onClick={() => {
                      setForm({ ...form, customerId: c.id });
                      setCustomerSearch("");
                      setShowResults(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{c.firstName} {c.lastName}</span>
                    <span className="text-muted-foreground mr-2 font-mono">({c.phone})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">ملاحظات</label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.firstName || !form.customerId}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherModal({
  teacher,
  subjects,
  onClose,
  onSave,
}: {
  teacher?: Partial<EducationTeacher> | null;
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationTeacher>) => Promise<void>;
}) {
  const [name, setName] = useState(teacher?.name || "");
  const [phone, setPhone] = useState(teacher?.phone || "");
  const [email, setEmail] = useState(teacher?.email || "");
  const [bio, setBio] = useState(teacher?.bio || "");
  const [qualifications, setQualifications] = useState(teacher?.qualifications || "");
  const [password, setPassword] = useState("");
  const [subjectRates, setSubjectRates] = useState<{ subjectId: string; hourlyRate: number }[]>(
    teacher?.subjectRates?.map((sr) => ({ subjectId: sr.subjectId, hourlyRate: sr.hourlyRate })) || []
  );

  const addRate = (subjectId: string) => {
    if (subjectRates.some((sr) => sr.subjectId === subjectId)) return;
    setSubjectRates([...subjectRates, { subjectId, hourlyRate: 0 }]);
  };
  const updRate = (subjectId: string, hourlyRate: number) => {
    setSubjectRates(subjectRates.map((sr) => (sr.subjectId === subjectId ? { ...sr, hourlyRate } : sr)));
  };
  const delRate = (subjectId: string) => {
    setSubjectRates(subjectRates.filter((sr) => sr.subjectId !== subjectId));
  };

  const remainingSubjects = subjects.filter((s) => s.isActive && !subjectRates.some((sr) => sr.subjectId === s.id));

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{teacher?.id ? "تعديل بيانات المدرس" : "إضافة مدرس جديد"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">اسم المدرس *</label>
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الهاتف</label>
              <input className={INPUT_CLS} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">البريد الإلكتروني</label>
              <input className={INPUT_CLS} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">السيرة الذاتية</label>
            <textarea className={INPUT_CLS} rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">المؤهلات العلمية</label>
            <textarea className={INPUT_CLS} rows={2} value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {teacher?.id ? "كلمة المرور الجديدة (اتركها فارغة للتخطي)" : "كلمة المرور (لبوابة المدرس)"}
            </label>
            <input type="password" className={INPUT_CLS} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-medium text-foreground">تسعير المواد الدراسية (سعر الساعة)</label>
            {subjectRates.map((sr) => {
              const subj = subjects.find((s) => s.id === sr.subjectId);
              return (
                <div key={sr.subjectId} className="flex items-center gap-2">
                  <span className="text-xs w-28 text-foreground truncate">{subj?.name || "—"}</span>
                  <input
                    type="number"
                    min={0}
                    className="bg-background border border-input rounded-lg px-2.5 py-1 text-xs w-24 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    value={sr.hourlyRate}
                    onChange={(e) => updRate(sr.subjectId, Number(e.target.value))}
                  />
                  <span className="text-[11px] text-muted-foreground">ج.م/س</span>
                  <button onClick={() => delRate(sr.subjectId)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {remainingSubjects.length > 0 && (
              <select
                className={INPUT_CLS + " mt-1"}
                value=""
                onChange={(e) => {
                  if (e.target.value) addRate(e.target.value);
                }}
              >
                <option value="">+ إضافة مادة وتحديد سعر الساعة</option>
                {remainingSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          <button
            onClick={() =>
              onSave({
                ...teacher,
                name,
                phone,
                email,
                password: password || undefined,
                bio,
                qualifications,
                subjectRates,
              })
            }
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionModal({
  session,
  teachers,
  subjects,
  enrollments,
  students,
  onClose,
  onSave,
}: {
  session?: Partial<EducationSession> | null;
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enrollments: EducationEnrollment[];
  students: EducationStudent[];
  onClose: () => void;
  onSave: (d: Partial<EducationSession>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    ...session,
    enrollmentId: session?.enrollmentId || "",
    scheduledAt: session?.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
    plannedDuration: session?.plannedDuration || 60,
    topic: session?.topic || "",
    notes: session?.notes || "",
  });
  const selectedEnrollment = enrollments.find((e) => e.id === form.enrollmentId);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{session?.id ? "تفاصيل وبيانات الحصة" : "جدولة حصة جديدة"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {!session?.id && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">التسجيل / الاشتراك *</label>
              <select className={INPUT_CLS} value={form.enrollmentId} onChange={(e) => setForm({ ...form, enrollmentId: e.target.value })}>
                <option value="">اختر التسجيل</option>
                {enrollments
                  .filter((e) => e.isActive && e.remainingHours > 0)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.student?.firstName} {e.student?.lastName || ""} - {e.package?.name} ({e.remainingHours}/{e.totalHours} س)
                    </option>
                  ))}
              </select>
              {selectedEnrollment && (
                <p
                  className={`text-[11px] mt-1 ${
                    selectedEnrollment.teacher ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                  }`}
                >
                  {selectedEnrollment.teacher
                    ? `المتبقي: ${selectedEnrollment.remainingHours} ساعة - المدرس: ${selectedEnrollment.teacher.name}`
                    : "تنبيه: يجب تعيين مدرس للتسجيل أولاً"}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">تاريخ ووقت الحصة *</label>
            <input
              type="datetime-local"
              className={INPUT_CLS}
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">المدة المخططة (بالدقائق)</label>
            <input
              type="number"
              min={15}
              step={15}
              className={INPUT_CLS}
              value={form.plannedDuration}
              onChange={(e) => setForm({ ...form, plannedDuration: Number(e.target.value) })}
              disabled={!!session?.id}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">موضوع الحصة والدرس</label>
            <input className={INPUT_CLS} value={form.topic || ""} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">ملاحظات إضافية</label>
            <textarea className={INPUT_CLS} rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {session?.status && (
            <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1 text-xs">
              <p className="flex items-center gap-1.5">
                <span className="text-muted-foreground">حالة الحصة:</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] border ${SESSION_STATUS[session.status]?.color || ""}`}>
                  {SESSION_STATUS[session.status]?.label}
                </span>
              </p>
              {session.actualDuration && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  المدة الفعلية: {session.actualDuration} دقيقة
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          {!session?.id && (
            <button
              onClick={() => onSave(form)}
              disabled={!form.enrollmentId || !form.scheduledAt}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              حفظ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EnrollmentModal({
  enrollment,
  students,
  packages,
  teachers,
  subjects,
  onClose,
  onSave,
}: {
  enrollment?: Partial<EducationEnrollment> | null;
  students: EducationStudent[];
  packages: EducationPackage[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationEnrollment>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    studentId: "",
    packageId: "",
    teacherId: "",
    amountPaid: 0,
    paymentStatus: enrollment?.paymentStatus === "PAID" ? "COMPLETED" : enrollment?.paymentStatus || "PENDING",
    expiresAt: "",
  });
  const selectedPackage = packages.find((p) => p.id === form.packageId);
  const filteredTeachers = selectedPackage
    ? teachers.filter((t) => t.subjectRates?.some((sr) => sr.subjectId === selectedPackage.subjectId))
    : teachers;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">{enrollment?.id ? "تعديل التسجيل" : "إضافة تسجيل جديد"}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">الطالب *</label>
            <select
              className={INPUT_CLS}
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              disabled={!!enrollment?.id}
            >
              <option value="">اختر الطالب</option>
              {students
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName || ""} {s.phone ? `- ${s.phone}` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">الباقة الدراسية *</label>
            <select
              className={INPUT_CLS}
              value={form.packageId}
              onChange={(e) => {
                setForm({ ...form, packageId: e.target.value, teacherId: "" });
              }}
              disabled={!!enrollment?.id}
            >
              <option value="">اختر الباقة</option>
              {packages
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.subject?.name} ({p.hoursCount}س - {p.price}ج.م)
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المدرس المعين {!enrollment?.id && <span className="text-muted-foreground text-[11px]">(اختياري)</span>}
            </label>
            <select
              className={INPUT_CLS}
              value={form.teacherId || ""}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value || "" })}
            >
              <option value="">-- لم يحدد بعد --</option>
              {filteredTeachers
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            {filteredTeachers.length === 0 && form.packageId && (
              <p className="text-[11px] text-amber-500 mt-1">لا يوجد مدرسين لهذه المادة. أضف مدرساً مع سعر للمادة أولاً.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">المبلغ المدفوع (ج.م)</label>
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={form.amountPaid}
                onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">حالة السداد</label>
              <select
                className={INPUT_CLS}
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="PENDING">معلق</option>
                <option value="COMPLETED">مدفوع</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">تاريخ انتهاء الباقة</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={form.expiresAt?.split("T")[0] || ""}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value || "" })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80">
            إلغاء
          </button>
          <button
            onClick={() => onSave({ ...form, teacherId: form.teacherId || null })}
            disabled={!form.studentId || !form.packageId}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
