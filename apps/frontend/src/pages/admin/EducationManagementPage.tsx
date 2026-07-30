import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  AcademicCapIcon, BookOpenIcon, GiftIcon, UserGroupIcon,
  UsersIcon, ClockIcon, ChartBarSquareIcon, PlusIcon,
  PencilIcon, TrashIcon, XMarkIcon, CheckIcon,
  MagnifyingGlassIcon, PhoneIcon, EyeIcon
} from "@heroicons/react/24/outline";

const getCompanyId = (): string | null => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
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
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};
const searchCustomersApi = (q: string) => {
  const base = buildApiUrl(`customers/search?query=${encodeURIComponent(q)}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

interface EducationSubject {
  id: string; name: string; description?: string; isActive: boolean;
}
interface EducationPackage {
  id: string; subjectId: string; name: string; description?: string;
  hoursCount: number; sessionDuration: number; price: number; isActive: boolean;
  subject?: { id: string; name: string };
}
interface EducationStudent {
  id: string; customerId: string; firstName: string; lastName?: string;
  phone?: string; gender?: string; grade?: string; notes?: string; isActive: boolean;
  customer?: { id: string; firstName: string; lastName: string; phone: string };
  enrollments?: EducationEnrollment[];
}
interface EducationTeacher {
  id: string; name: string; phone?: string; email?: string; bio?: string; qualifications?: string; avatarUrl?: string; isActive: boolean;
  subjectRates?: { id: string; subjectId: string; hourlyRate: number; subject: { id: string; name: string } }[];
}
interface EducationEnrollment {
  id: string; studentId: string; packageId: string; teacherId: string;
  totalHours: number; remainingHours: number; amountPaid: number;
  paymentStatus: string; enrollmentDate: string; expiresAt?: string; isActive: boolean;
  student?: { id: string; firstName: string; lastName?: string };
  package?: { id: string; name: string; subject?: { id: string; name: string } };
  teacher?: { id: string; name: string };
}
interface EducationSession {
  id: string; enrollmentId: string; studentId: string; teacherId: string; subjectId: string;
  scheduledAt: string; plannedDuration: number; actualDuration?: number;
  topic?: string; notes?: string; status: string; createdAt: string;
  student?: { id: string; firstName: string; lastName?: string };
  teacher?: { id: string; name: string };
  subject?: { id: string; name: string };
  enrollment?: { id: string; remainingHours: number };
}
interface Customer { id: string; firstName: string; lastName: string; phone: string; }

type TabId = "dashboard" | "subjects" | "packages" | "students" | "teachers" | "enrollments" | "sessions";
const TABS: { id: TabId; label: string; icon: typeof ChartBarSquareIcon }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: ChartBarSquareIcon },
  { id: "subjects", label: "المواد", icon: BookOpenIcon },
  { id: "packages", label: "الباقات", icon: GiftIcon },
  { id: "students", label: "الطلاب", icon: UserGroupIcon },
  { id: "teachers", label: "المدرسين", icon: UsersIcon },
  { id: "enrollments", label: "التسجيلات", icon: AcademicCapIcon },
  { id: "sessions", label: "الحصص", icon: ClockIcon },
];

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  CONFIRMED: { label: "مؤكدة", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغية", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const fetchJson = async (url: string, options?: RequestInit, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        throw new Error("الخادم غير متاح حالياً - جارٍ إعادة التشغيل");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "فشل العملية");
      return data.data;
    } catch (e: any) {
      if (attempt < retries && (e.message?.includes("502") || e.message?.includes("503") || e.message?.includes("fetch"))) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
};

const MODAL_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
const INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
const CELL_CLS = "py-3 px-4";

export default function EducationManagementPage() {
  const { "*": path } = useParams();
  const navigate = useNavigate();
  const urlTab = (path || "").split("/")[0];
  const activeTab = (TABS.map(t => t.id).includes(urlTab as TabId) ? urlTab : "dashboard") as TabId;
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

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === "dashboard") { fetchAll(); }
    if (activeTab === "subjects") { setLoading(true); fetchSubjects().finally(() => setLoading(false)); }
    if (activeTab === "packages") { setLoading(true); fetchPackages().finally(() => setLoading(false)); }
    if (activeTab === "students") { setLoading(true); fetchStudents().finally(() => setLoading(false)); }
    if (activeTab === "teachers") { setLoading(true); fetchTeachers().finally(() => setLoading(false)); }
    if (activeTab === "enrollments") { setLoading(true); fetchEnrollments().finally(() => setLoading(false)); }
    if (activeTab === "sessions") { setLoading(true); fetchSessions().finally(() => setLoading(false)); }
  }, [activeTab]);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try { await Promise.all([fetchSubjects(), fetchPackages(), fetchStudents(), fetchTeachers(), fetchEnrollments(), fetchSessions()]); }
    catch (e: any) { setError(e.message || "فشل تحميل البيانات"); }
    setLoading(false);
  };

  const fetchSubjects = async () => { try { setSubjects(await fetchJson(api("subjects"))); } catch (e: any) { throw e; } };
  const fetchPackages = async () => { try { setPackages(await fetchJson(api("packages"))); } catch (e: any) { throw e; } };
  const fetchStudents = async () => { try { setStudents(await fetchJson(api("students"))); } catch (e: any) { throw e; } };
  const fetchTeachers = async () => { try { setTeachers(await fetchJson(api("teachers"))); } catch (e: any) { throw e; } };
  const fetchEnrollments = async () => { try { setEnrollments(await fetchJson(api("enrollments"))); } catch (e: any) { throw e; } };
  const fetchSessions = async () => {
    const params = new URLSearchParams();
    if (sessionFilters.status) params.append("status", sessionFilters.status);
    if (sessionFilters.teacherId) params.append("teacherId", sessionFilters.teacherId);
    if (sessionFilters.from) params.append("from", sessionFilters.from);
    if (sessionFilters.to) params.append("to", sessionFilters.to);
    try { setSessions(await fetchJson(api(`sessions?${params}`))); } catch (e: any) { throw e; } }

  const searchCustomers = async (q: string) => {
    if (!q || q.length < 2) { setCustomerResults([]); return; }
    try {
      const data = await fetchJson(searchCustomersApi(q));
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch { setCustomerResults([]); } };

  // CRUD helpers
  const saveItem = async (entity: string, data: any) => {
    const isEdit = !!data.id;
    const url = isEdit ? api(`${entity}/${data.id}`) : api(entity);
    const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
    const result = await res.json();
    if (!result.success) { alert(result.error || "فشل الحفظ"); return false; }
    return true;
  };
  const deleteItem = async (entity: string, id: string) => {
    if (!confirm("تأكيد الحذف؟")) return false;
    const res = await fetch(api(`${entity}/${id}`), { method: "DELETE", headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) { alert(data.error || "فشل الحذف"); return false; }
    return true;
  };
  const toggleActive = async (entity: string, id: string, current: boolean) => {
    const res = await fetch(api(`${entity}/${id}`), { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ isActive: !current }) });
    const data = await res.json();
    if (!data.success) { alert(data.error || "فشل التحديث"); return false; }
    return true;
  };

  // Subject handlers
  const handleSaveSubject = async (d: Partial<EducationSubject>) => {
    if (!(await saveItem("subjects", d))) return;
    setSubjectModal(undefined); fetchSubjects();
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
    setPackageModal(undefined); fetchPackages();
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
    setStudentModal(undefined); fetchStudents();
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
    setTeacherModal(undefined); fetchTeachers();
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
    setEnrollmentModal(undefined); fetchEnrollments();
  };
  const handleDeleteEnrollment = async (id: string) => {
    if (await deleteItem("enrollments", id)) fetchEnrollments();
  };

  // Session handlers
  const handleSaveSession = async (d: Partial<EducationSession>) => {
    if (!(await saveItem("sessions", d))) return;
    setSessionModal(undefined); fetchSessions();
  };
  const handleConfirmSession = async (id: string, actualDuration?: number) => {
    const res = await fetch(api(`sessions/${id}/confirm`), { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ actualDuration: actualDuration || undefined }) });
    const data = await res.json();
    if (!data.success) { alert(data.error || "فشل التأكيد"); return; }
    fetchSessions();
  };
  const handleCancelSession = async (id: string) => {
    if (!confirm("تأكيد إلغاء الحصة؟")) return;
    const res = await fetch(api(`sessions/${id}/cancel`), { method: "PUT", headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) { alert(data.error || "فشل الإلغاء"); return; }
    fetchSessions();
  };

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const stats = {
    totalSubjects: subjects.filter(s => s.isActive).length,
    totalPackages: packages.filter(p => p.isActive).length,
    totalStudents: students.filter(s => s.isActive).length,
    totalTeachers: teachers.filter(t => t.isActive).length,
    activeEnrollments: enrollments.filter(e => e.remainingHours > 0).length,
    sessionsToday: sessions.filter(s => s.scheduledAt?.startsWith(today)).length,
    totalSessions: sessions.filter(s => s.status === "CONFIRMED").length,
    scheduledSessions: sessions.filter(s => s.status === "SCHEDULED").length,
  };

  // ==================== RENDERERS ====================

  const renderDashboard = () => (
    <div>
      <h2 className="text-xl font-bold mb-6">لوحة التحكم</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "المواد", value: stats.totalSubjects, icon: BookOpenIcon, color: "bg-blue-500" },
          { label: "الباقات", value: stats.totalPackages, icon: GiftIcon, color: "bg-purple-500" },
          { label: "الطلاب", value: stats.totalStudents, icon: UserGroupIcon, color: "bg-green-500" },
          { label: "المدرسين", value: stats.totalTeachers, icon: UsersIcon, color: "bg-orange-500" },
          { label: "تسجيلات نشطة", value: stats.activeEnrollments, icon: AcademicCapIcon, color: "bg-indigo-500" },
          { label: "حصص اليوم", value: stats.sessionsToday, icon: ClockIcon, color: "bg-yellow-500" },
          { label: "حصص مجدولة", value: stats.scheduledSessions, icon: ClockIcon, color: "bg-blue-500" },
          { label: "حصص مؤكدة", value: stats.totalSessions, icon: CheckIcon, color: "bg-green-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSubjects = () => {
    const filtered = subjects.filter(s => !subjectSearch || s.name.includes(subjectSearch));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة المواد</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} /></div>
            <button onClick={() => setSubjectModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة مادة</button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["الاسم", "الوصف", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <td className={CELL_CLS + " font-medium"}>{s.name}</td>
                <td className={CELL_CLS + " text-gray-500 dark:text-gray-400"}>{s.description || "—"}</td>
                <td className={CELL_CLS}><span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{s.isActive ? "نشط" : "غير نشط"}</span></td>
                <td className={CELL_CLS}>
                  <div className="flex gap-1">
                    <button onClick={() => setSubjectModal(s)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleSubject(s.id, s.isActive)} className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg ${s.isActive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`}><CheckIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteSubject(s.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="حذف"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواد</p>}
        </div>
        {subjectModal !== undefined && <SubjectModal subject={subjectModal} onClose={() => setSubjectModal(undefined)} onSave={handleSaveSubject} />}
      </div>
    );
  };

  const renderPackages = () => {
    const filtered = packages.filter(p => !packageSubjectFilter || p.subjectId === packageSubjectFilter);
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة الباقات</h2>
          <div className="flex gap-3">
            <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={packageSubjectFilter} onChange={e => setPackageSubjectFilter(e.target.value)}>
              <option value="">كل المواد</option>
              {subjects.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => setPackageModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة باقة</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!p.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{p.subject?.name || "—"}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">{p.hoursCount} ساعة</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{p.sessionDuration} دقيقة/حصة</span>
                <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">{p.price} ج.م</span>
              </div>
              {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{p.description}</p>}
              <div className="flex gap-2">
                <button onClick={() => setPackageModal(p)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => handleTogglePackage(p.id, p.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${p.isActive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{p.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => handleDeletePackage(p.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><TrashIcon className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">لا توجد باقات</p>}
        </div>
        {packageModal !== undefined && <PackageModal pkg={packageModal} subjects={subjects} onClose={() => setPackageModal(undefined)} onSave={handleSavePackage} />}
      </div>
    );
  };

  const renderStudents = () => {
    const filtered = students.filter(s => !studentSearch || s.firstName.includes(studentSearch) || s.lastName?.includes(studentSearch) || s.phone?.includes(studentSearch));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة الطلاب</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
            <button onClick={() => setStudentModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة طالب</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold">{s.firstName} {s.lastName || ""}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{s.grade || "—"}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><PhoneIcon className="w-3 h-3" />{s.phone || "—"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">ولي الأمر: {s.customer ? `${s.customer.firstName} ${s.customer.lastName || ""}` : "—"}</div>
              <div className="flex gap-2">
                <Link to={`/admin/education/student/${s.id}`} className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><EyeIcon className="w-3.5 h-3.5 inline ml-1" />عرض</Link>
                <button onClick={() => setStudentModal(s)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => handleToggleStudent(s.id, s.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${s.isActive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{s.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => handleDeleteStudent(s.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg"><TrashIcon className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">لا يوجد طلاب</p>}
        </div>
        {studentModal !== undefined && <StudentModal student={studentModal} customers={customers} customerResults={customerResults} onCustomerSearch={searchCustomers} onClose={() => setStudentModal(undefined)} onSave={handleSaveStudent} />}
      </div>
    );
  };

  const renderTeachers = () => {
    const filtered = teachers.filter(t => !teacherSearch || t.name.includes(teacherSearch) || t.phone?.includes(teacherSearch));
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة المدرسين</h2>
          <div className="flex gap-3">
            <div className="relative"><MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} /></div>
            <button onClick={() => setTeacherModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة مدرس</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!t.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold">{t.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{t.phone || "—"}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${t.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.subjectRates?.map(sr => (
                  <span key={sr.id} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{sr.subject.name}: {sr.hourlyRate} ج.م/س</span>
                ))}
                {(!t.subjectRates || t.subjectRates.length === 0) && <span className="text-xs text-gray-400">لا توجد أسعار</span>}
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/education/teacher/${t.id}`} className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><EyeIcon className="w-3.5 h-3.5 inline ml-1" />عرض</Link>
                <button onClick={() => setTeacherModal(t)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => handleToggleTeacher(t.id, t.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${t.isActive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{t.isActive ? "تعطيل" : "تفعيل"}</button>
                <button onClick={() => handleDeleteTeacher(t.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg"><TrashIcon className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">لا يوجد مدرسين</p>}
        </div>
        {teacherModal !== undefined && <TeacherModal teacher={teacherModal} subjects={subjects} onClose={() => setTeacherModal(undefined)} onSave={handleSaveTeacher} />}
      </div>
    );
  };

  const renderEnrollments = () => {
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة التسجيلات</h2>
          <button onClick={() => setEnrollmentModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة تسجيل</button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
              {["الطالب", "الباقة", "المادة", "المدرس", "المتبقي", "المدفوع", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}
            </tr></thead>
            <tbody>
              {enrollments.map(e => {
                const remaining = e.remainingHours ?? 0;
                const total = e.totalHours ?? 0;
                const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
                return (
                  <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                    <td className={CELL_CLS + " font-medium"}>{e.student ? `${e.student.firstName} ${e.student.lastName || ""}` : "—"}</td>
                    <td className={CELL_CLS}>{e.package?.name || "—"}</td>
                    <td className={CELL_CLS}>{e.package?.subject?.name || "—"}</td>
                    <td className={CELL_CLS}>{e.teacher?.name || <span className="text-amber-500 text-xs">لم يحدد</span>}</td>
                    <td className={CELL_CLS}>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${remaining < total * 0.2 ? "text-red-600" : remaining < total * 0.5 ? "text-amber-600" : "text-green-600"}`}>{remaining}/{total}</span>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct <= 20 ? "bg-red-500" : pct <= 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className={CELL_CLS}>{e.amountPaid || 0} ج.م</td>
                    <td className={CELL_CLS}>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${["COMPLETED","PAID"].includes(e.paymentStatus) ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : e.paymentStatus === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                        {["COMPLETED","PAID"].includes(e.paymentStatus) ? "مدفوع" : "معلق"}
                      </span>
                    </td>
                    <td className={CELL_CLS}>
                      <div className="flex gap-1">
                        <button onClick={() => setEnrollmentModal(e)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                        {!e.teacher?.id && <span className="text-xs text-amber-500 self-center">⚠️</span>}
                        <button onClick={() => handleDeleteEnrollment(e.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {enrollments.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد تسجيلات</p>}
        </div>
        {enrollmentModal !== undefined && <EnrollmentModal enrollment={enrollmentModal} students={students} packages={packages} teachers={teachers} subjects={subjects} onClose={() => setEnrollmentModal(undefined)} onSave={handleSaveEnrollment} />}
      </div>
    );
  };

  const renderSessions = () => {
    const filtered = sessions.filter(s => {
      if (sessionFilters.status && s.status !== sessionFilters.status) return false;
      if (sessionFilters.teacherId && s.teacherId !== sessionFilters.teacherId) return false;
      if (sessionFilters.from && s.scheduledAt < sessionFilters.from) return false;
      if (sessionFilters.to && s.scheduledAt > sessionFilters.to + "T23:59:59") return false;
      return true;
    });
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">إدارة الحصص</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={sessionFilters.status} onChange={e => setSessionFilters({ ...sessionFilters, status: e.target.value })}>
              <option value="">كل الحالات</option>
              {Object.entries(SESSION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={sessionFilters.teacherId} onChange={e => setSessionFilters({ ...sessionFilters, teacherId: e.target.value })}>
              <option value="">كل المدرسين</option>
              {teachers.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={sessionFilters.from} onChange={e => setSessionFilters({ ...sessionFilters, from: e.target.value })} />
            <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={sessionFilters.to} onChange={e => setSessionFilters({ ...sessionFilters, to: e.target.value })} />
            <button onClick={() => setSessionModal({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />إضافة حصة</button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
              {["الطالب", "المدرس", "المادة", "التاريخ", "المدة", "الحالة", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className={CELL_CLS + " font-medium"}>{s.student ? `${s.student.firstName} ${s.student.lastName || ""}` : "—"}</td>
                  <td className={CELL_CLS}>{s.teacher?.name || "—"}</td>
                  <td className={CELL_CLS}>{s.subject?.name || "—"}</td>
                  <td className={CELL_CLS}>{new Date(s.scheduledAt).toLocaleDateString("ar-EG")} {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className={CELL_CLS}>{s.actualDuration || s.plannedDuration} د</td>
                  <td className={CELL_CLS}><span className={`px-2 py-0.5 rounded-full text-xs ${SESSION_STATUS[s.status]?.color || ""}`}>{SESSION_STATUS[s.status]?.label || s.status}</span></td>
                  <td className={CELL_CLS}>
                    <div className="flex gap-1">
                      {s.status === "SCHEDULED" && (
                        <>
                          <button onClick={() => handleConfirmSession(s.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="تأكيد"><CheckIcon className="w-4 h-4" /></button>
                          <button onClick={() => handleCancelSession(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="إلغاء"><XMarkIcon className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => setSessionModal(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="عرض"><PencilIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد حصص</p>}
        </div>
        {sessionModal !== undefined && <SessionModal session={sessionModal} teachers={teachers} subjects={subjects} enrollments={enrollments} students={students} onClose={() => setSessionModal(undefined)} onSave={handleSaveSession} />}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة المراكز التعليمية</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">نظام إدارة المواد والطلاب والمدرسين والحصص</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-8 md:flex-nowrap md:border-b md:dark:border-gray-700 md:overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-xl md:rounded-none transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 md:bg-transparent md:text-blue-600 md:dark:text-blue-400 md:border-b-2 md:border-blue-600" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 md:bg-transparent md:text-gray-500 md:dark:text-gray-400 md:border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 md:hover:border-gray-300 md:dark:hover:border-gray-600"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="text-center py-16">
          <div className="text-red-500 dark:text-red-400 text-lg mb-2">⚠️ فشل تحميل البيانات</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={fetchAll} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">إعادة المحاولة</button>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جاري التحميل...</div>
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

function SubjectModal({ subject, onClose, onSave }: {
  subject?: Partial<EducationSubject> | null;
  onClose: () => void;
  onSave: (d: Partial<EducationSubject>) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", description: "", ...subject });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{subject?.id ? "تعديل مادة" : "إضافة مادة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label><textarea className={INPUT_CLS} rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function PackageModal({ pkg, subjects, onClose, onSave }: {
  pkg?: Partial<EducationPackage> | null;
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationPackage>) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", description: "", subjectId: "", hoursCount: 1, sessionDuration: 60, price: 0, ...pkg });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{pkg?.id ? "تعديل باقة" : "إضافة باقة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">الاسم</label><input className={INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">المادة</label>
            <select className={INPUT_CLS} value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">اختر المادة</option>
              {subjects.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">عدد الساعات</label><input type="number" min={1} className={INPUT_CLS} value={form.hoursCount} onChange={e => setForm({ ...form, hoursCount: Number(e.target.value) })} /></div>
            <div><label className="block text-sm font-medium mb-1">الدقائق/حصة</label><input type="number" min={15} step={15} className={INPUT_CLS} value={form.sessionDuration} onChange={e => setForm({ ...form, sessionDuration: Number(e.target.value) })} /></div>
            <div><label className="block text-sm font-medium mb-1">السعر (ج.م)</label><input type="number" min={0} className={INPUT_CLS} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">الوصف</label><textarea className={INPUT_CLS} rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.subjectId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ student, customers, customerResults, onCustomerSearch, onClose, onSave }: {
  student?: Partial<EducationStudent> | null;
  customers: Customer[];
  customerResults: Customer[];
  onCustomerSearch: (q: string) => void;
  onClose: () => void;
  onSave: (d: Partial<EducationStudent>) => Promise<void>;
}) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", gender: "male", grade: "", notes: "", customerId: "", ...student });
  const [customerSearch, setCustomerSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const selectedCustomer = customers.find(c => c.id === form.customerId) || customerResults.find(c => c.id === form.customerId);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{student?.id ? "تعديل طالب" : "إضافة طالب"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">الاسم الأول</label><input className={INPUT_CLS} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">الاسم الأخير</label><input className={INPUT_CLS} value={form.lastName || ""} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">الهاتف</label><input className={INPUT_CLS} value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">الجنس</label>
              <select className={INPUT_CLS} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium mb-1">المرحلة/الصف</label><input className={INPUT_CLS} value={form.grade || ""} onChange={e => setForm({ ...form, grade: e.target.value })} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">ولي الأمر (عميل)</label>
            <input className={INPUT_CLS} placeholder="ابحث عن ولي أمر..." value={customerSearch || (selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "")} onChange={e => { onCustomerSearch(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} />
            {showResults && customerResults.length > 0 && (
              <div className="border dark:border-gray-600 rounded-lg mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800">
                {customerResults.map(c => (
                  <div key={c.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm" onClick={() => { setForm({ ...form, customerId: c.id }); setCustomerSearch(""); setShowResults(false); }}>
                    {c.firstName} {c.lastName} - {c.phone}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea className={INPUT_CLS} rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.firstName || !form.customerId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function TeacherModal({ teacher, subjects, onClose, onSave }: {
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
    teacher?.subjectRates?.map(sr => ({ subjectId: sr.subjectId, hourlyRate: sr.hourlyRate })) || []
  );

  const addRate = (subjectId: string) => {
    if (subjectRates.some(sr => sr.subjectId === subjectId)) return;
    setSubjectRates([...subjectRates, { subjectId, hourlyRate: 0 }]);
  };
  const updRate = (subjectId: string, hourlyRate: number) => {
    setSubjectRates(subjectRates.map(sr => sr.subjectId === subjectId ? { ...sr, hourlyRate } : sr));
  };
  const delRate = (subjectId: string) => {
    setSubjectRates(subjectRates.filter(sr => sr.subjectId !== subjectId));
  };

  const remainingSubjects = subjects.filter(s => s.isActive && !subjectRates.some(sr => sr.subjectId === s.id));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{teacher?.id ? "تعديل مدرس" : "إضافة مدرس"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">الاسم</label><input className={INPUT_CLS} value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">الهاتف</label><input className={INPUT_CLS} value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">البريد الإلكتروني</label><input className={INPUT_CLS} value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">السيرة الذاتية</label><textarea className={INPUT_CLS} rows={2} value={bio} onChange={e => setBio(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">المؤهلات</label><textarea className={INPUT_CLS} rows={2} value={qualifications} onChange={e => setQualifications(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">{teacher?.id ? "كلمة المرور الجديدة (اتركها فارغة إن لم ترد التغيير)" : "كلمة المرور (للدخول إلى بوابة المدرس)"}</label><input type="password" className={INPUT_CLS} value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div>
            <label className="block text-sm font-medium mb-2">أسعار المواد (سعر الساعة)</label>
            {subjectRates.map(sr => {
              const subj = subjects.find(s => s.id === sr.subjectId);
              return (
                <div key={sr.subjectId} className="flex items-center gap-2 mb-2">
                  <span className="text-sm w-28">{subj?.name || "—"}</span>
                  <input type="number" min={0} className={"border dark:border-gray-600 rounded-lg px-2 py-1 text-sm w-24 dark:bg-gray-800 dark:text-gray-100"} value={sr.hourlyRate} onChange={e => updRate(sr.subjectId, Number(e.target.value))} />
                  <span className="text-xs text-gray-500">ج.م/س</span>
                  <button onClick={() => delRate(sr.subjectId)} className="p-1 text-red-500 hover:bg-red-50 rounded"><XMarkIcon className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
            {remainingSubjects.length > 0 && (
              <select className={INPUT_CLS + " mt-1"} value="" onChange={e => { if (e.target.value) addRate(e.target.value); }}>
                <option value="">+ إضافة مادة</option>
                {remainingSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ ...teacher, name, phone, email, password: password || undefined, bio, qualifications, subjectRates })} disabled={!name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function SessionModal({ session, teachers, subjects, enrollments, students, onClose, onSave }: {
  session?: Partial<EducationSession> | null;
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enrollments: EducationEnrollment[];
  students: EducationStudent[];
  onClose: () => void;
  onSave: (d: Partial<EducationSession>) => Promise<void>;
}) {
  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const [form, setForm] = useState({
    ...session,
    enrollmentId: session?.enrollmentId || "",
    scheduledAt: session?.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
    plannedDuration: session?.plannedDuration || 60,
    topic: session?.topic || "",
    notes: session?.notes || "",
  });
  const selectedEnrollment = enrollments.find(e => e.id === form.enrollmentId);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{session?.id ? "تفاصيل الحصة" : "إضافة حصة"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          {!session?.id && (
            <>
              <div><label className="block text-sm font-medium mb-1">التسجيل</label>
                <select className={INPUT_CLS} value={form.enrollmentId} onChange={e => setForm({ ...form, enrollmentId: e.target.value })}>
                  <option value="">اختر التسجيل</option>
                  {enrollments.filter(e => e.isActive && e.remainingHours > 0).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.student?.firstName} {e.student?.lastName || ""} - {e.package?.name} ({e.remainingHours}/{e.totalHours} س)
                    </option>
                  ))}
                </select>
                {selectedEnrollment && (
                  <p className={`text-xs mt-1 ${selectedEnrollment.teacher ? "text-green-600" : "text-red-500"}`}>
                    {selectedEnrollment.teacher
                      ? `المتبقي: ${selectedEnrollment.remainingHours} ساعة - المدرس: ${selectedEnrollment.teacher.name}`
                      : "⚠️ يجب تعيين مدرس للتسجيل أولاً"}
                  </p>
                )}
              </div>
            </>
          )}
          <div><label className="block text-sm font-medium mb-1">تاريخ ووقت الحصة</label><input type="datetime-local" className={INPUT_CLS} value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">المدة (دقيقة)</label><input type="number" min={15} step={15} className={INPUT_CLS} value={form.plannedDuration} onChange={e => setForm({ ...form, plannedDuration: Number(e.target.value) })} disabled={!!session?.id} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">الموضوع</label><input className={INPUT_CLS} value={form.topic || ""} onChange={e => setForm({ ...form, topic: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea className={INPUT_CLS} rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {session?.status && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm">الحالة: <span className={`px-2 py-0.5 rounded-full text-xs ${SESSION_STATUS[session.status]?.color}`}>{SESSION_STATUS[session.status]?.label}</span></p>
              {session.actualDuration && <p className="text-xs text-gray-500 mt-1">المدة الفعلية: {session.actualDuration} دقيقة</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          {!session?.id && (
            <button onClick={() => onSave(form)} disabled={!form.enrollmentId || !form.scheduledAt} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
          )}
        </div>
      </div>
    </div>
  );
}

function EnrollmentModal({ enrollment, students, packages, teachers, subjects, onClose, onSave }: {
  enrollment?: Partial<EducationEnrollment> | null;
  students: EducationStudent[];
  packages: EducationPackage[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationEnrollment>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    studentId: "", packageId: "", teacherId: "", amountPaid: 0,
    paymentStatus: enrollment?.paymentStatus === "PAID" ? "COMPLETED" : (enrollment?.paymentStatus || "PENDING"), expiresAt: "",
  });
  const selectedPackage = packages.find(p => p.id === form.packageId);
  const filteredTeachers = selectedPackage
    ? teachers.filter(t => t.subjectRates?.some(sr => sr.subjectId === selectedPackage.subjectId))
    : teachers;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{enrollment?.id ? "تعديل تسجيل" : "إضافة تسجيل"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">الطالب</label>
            <select className={INPUT_CLS} value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} disabled={!!enrollment?.id}>
              <option value="">اختر الطالب</option>
              {students.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ""} {s.phone ? `- ${s.phone}` : ""}</option>
              ))}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">الباقة</label>
            <select className={INPUT_CLS} value={form.packageId} onChange={e => { setForm({ ...form, packageId: e.target.value, teacherId: "" }); }} disabled={!!enrollment?.id}>
              <option value="">اختر الباقة</option>
              {packages.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.subject?.name} ({p.hoursCount}س - {p.price}ج.م)</option>
              ))}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">المدرس {!enrollment?.id && <span className="text-gray-400 text-xs">(اختياري - يمكن تعيينه لاحقاً)</span>}</label>
            <select className={INPUT_CLS} value={form.teacherId || ""} onChange={e => setForm({ ...form, teacherId: e.target.value || "" })}>
              <option value="">-- لم يحدد بعد --</option>
              {filteredTeachers.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {filteredTeachers.length === 0 && form.packageId && (
              <p className="text-xs text-amber-500 mt-1">لا يوجد مدرسين لهذه المادة. أضف مدرساً مع سعر للمادة أولاً.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">المبلغ المدفوع</label><input type="number" min={0} className={INPUT_CLS} value={form.amountPaid} onChange={e => setForm({ ...form, amountPaid: Number(e.target.value) })} /></div>
            <div><label className="block text-sm font-medium mb-1">حالة الدفع</label>
              <select className={INPUT_CLS} value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="PENDING">معلق</option>
                <option value="COMPLETED">مدفوع</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium mb-1">تاريخ انتهاء الباقة</label><input type="date" className={INPUT_CLS} value={form.expiresAt?.split("T")[0] || ""} onChange={e => setForm({ ...form, expiresAt: e.target.value || "" })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ ...form, teacherId: form.teacherId || null })} disabled={!form.studentId || !form.packageId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}
