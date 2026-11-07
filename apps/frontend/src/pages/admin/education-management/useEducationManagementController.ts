import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  EducationSubject,
  EducationPackage,
  EducationStudent,
  EducationTeacher,
  EducationEnrollment,
  EducationSession,
  Customer,
  TabId,
} from "./types";
import { TABS } from "./types";
import { api, searchCustomersApi, fetchJson, getAuthHeaders } from "./api";

export function useEducationManagementController() {
  const { "*": path } = useParams();
  const navigate = useNavigate();
  const urlTab = (path || "").split("/")[0];
  const activeTab = (
    TABS.map((t) => t.id).includes(urlTab as TabId) ? urlTab : "dashboard"
  ) as TabId;
  const setActiveTab = (tab: TabId) =>
    navigate(`/admin/education/${tab === "dashboard" ? "" : tab}`);

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
  const [subjectModal, setSubjectModal] = useState<
    Partial<EducationSubject> | null | undefined
  >(undefined);
  const [packageModal, setPackageModal] = useState<
    Partial<EducationPackage> | null | undefined
  >(undefined);
  const [studentModal, setStudentModal] = useState<
    Partial<EducationStudent> | null | undefined
  >(undefined);
  const [teacherModal, setTeacherModal] = useState<
    Partial<EducationTeacher> | null | undefined
  >(undefined);
  const [sessionModal, setSessionModal] = useState<
    Partial<EducationSession> | null | undefined
  >(undefined);
  const [enrollmentModal, setEnrollmentModal] = useState<
    Partial<EducationEnrollment> | null | undefined
  >(undefined);

  // Search/filter
  const [subjectSearch, setSubjectSearch] = useState("");
  const [packageSubjectFilter, setPackageSubjectFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [sessionFilters, setSessionFilters] = useState({
    status: "",
    teacherId: "",
    from: "",
    to: "",
  });
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);

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
    if (sessionFilters.teacherId)
      params.append("teacherId", sessionFilters.teacherId);
    if (sessionFilters.from) params.append("from", sessionFilters.from);
    if (sessionFilters.to) params.append("to", sessionFilters.to);
    try {
      setSessions(await fetchJson(api(`sessions?${params}`)));
    } catch (e: any) {
      throw e;
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchAll();
    } else if (activeTab === "subjects") {
      setLoading(true);
      fetchSubjects().finally(() => setLoading(false));
    } else if (activeTab === "packages") {
      setLoading(true);
      fetchPackages().finally(() => setLoading(false));
    } else if (activeTab === "students") {
      setLoading(true);
      fetchStudents().finally(() => setLoading(false));
    } else if (activeTab === "teachers") {
      setLoading(true);
      fetchTeachers().finally(() => setLoading(false));
    } else if (activeTab === "enrollments") {
      setLoading(true);
      fetchEnrollments().finally(() => setLoading(false));
    } else if (activeTab === "sessions") {
      setLoading(true);
      fetchSessions().finally(() => setLoading(false));
    }
  }, [activeTab]);

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
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) {
      alert(result.error || "فشل الحفظ");
      return false;
    }
    return true;
  };

  const deleteItem = async (entity: string, id: string) => {
    if (!confirm("تأكيد الحذف؟")) return false;
    const res = await fetch(api(`${entity}/${id}`), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "فشل الحذف");
      return false;
    }
    return true;
  };

  const toggleActive = async (
    entity: string,
    id: string,
    current: boolean
  ) => {
    const res = await fetch(api(`${entity}/${id}`), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive: !current }),
    });
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
  const handleConfirmSession = async (
    id: string,
    actualDuration?: number
  ) => {
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
    const res = await fetch(api(`sessions/${id}/cancel`), {
      method: "PUT",
      headers: getAuthHeaders(),
    });
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
      sessionsToday: sessions.filter((s) =>
        s.scheduledAt?.startsWith(today)
      ).length,
      totalSessions: sessions.filter((s) => s.status === "CONFIRMED").length,
      scheduledSessions: sessions.filter((s) => s.status === "SCHEDULED").length,
    }),
    [subjects, packages, students, teachers, enrollments, sessions, today]
  );

  return {
    activeTab,
    setActiveTab,
    subjects,
    packages,
    students,
    teachers,
    enrollments,
    sessions,
    customers,
    loading,
    error,
    stats,
    // Modals
    subjectModal,
    setSubjectModal,
    packageModal,
    setPackageModal,
    studentModal,
    setStudentModal,
    teacherModal,
    setTeacherModal,
    sessionModal,
    setSessionModal,
    enrollmentModal,
    setEnrollmentModal,
    // Filters
    subjectSearch,
    setSubjectSearch,
    packageSubjectFilter,
    setPackageSubjectFilter,
    studentSearch,
    setStudentSearch,
    teacherSearch,
    setTeacherSearch,
    sessionFilters,
    setSessionFilters,
    customerResults,
    searchCustomers,
    fetchAll,
    // Handlers
    handleSaveSubject,
    handleToggleSubject,
    handleDeleteSubject,
    handleSavePackage,
    handleTogglePackage,
    handleDeletePackage,
    handleSaveStudent,
    handleToggleStudent,
    handleDeleteStudent,
    handleSaveTeacher,
    handleToggleTeacher,
    handleDeleteTeacher,
    handleSaveEnrollment,
    handleDeleteEnrollment,
    handleSaveSession,
    handleConfirmSession,
    handleCancelSession,
  };
}
