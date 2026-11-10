import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  UserPlus,
  Trash2,
  Edit,
  RefreshCw,
  Layers,
  MapPin,
  Sparkles,
  UserCheck,
  LayoutGrid,
  List
} from "lucide-react";
import { toast } from "sonner";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

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

export interface EducationGroup {
  id: string;
  name: string;
  code?: string | null;
  subjectId: string;
  subjectName?: string;
  teacherId?: string | null;
  teacherName?: string | null;
  teacherPhone?: string | null;
  level?: string | null;
  capacity: number;
  totalMembers: number;
  activeMembers: number;
  waitingMembers: number;
  feeType: "MONTHLY" | "FULL_COURSE";
  feeAmount: number;
  teacherRateType: "PERCENTAGE" | "FIXED_PER_SESSION" | "PER_STUDENT";
  teacherRateValue: number;
  scheduleDays: string[];
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  notes?: string | null;
  createdAt?: string;
}

export interface GroupMember {
  id: string;
  studentId: string;
  studentName: string;
  studentCode?: string;
  studentPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  status: "ACTIVE" | "WAITING_LIST" | "TRANSFERRED" | "DROPPED";
  paymentStatus: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";
  amountPaid: number;
  joinedAt: string;
  notes?: string;
}

export interface GroupSessionItem {
  id: string;
  sessionDate: string;
  topic?: string;
  homework?: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  notes?: string;
}

const WEEK_DAYS = [
  { id: "SATURDAY", label: "السبت" },
  { id: "SUNDAY", label: "الأحد" },
  { id: "MONDAY", label: "الاثنين" },
  { id: "TUESDAY", label: "الثلاثاء" },
  { id: "WEDNESDAY", label: "الأربعاء" },
  { id: "THURSDAY", label: "الخميس" },
  { id: "FRIDAY", label: "الجمعة" },
];

export default function EducationGroupsPage({ embedded = false }: { embedded?: boolean }) {
  const [groups, setGroups] = useState<EducationGroup[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Active Group Details Drawer/Modal
  const [activeGroup, setActiveGroup] = useState<EducationGroup | null>(null);
  const [groupDetails, setGroupDetails] = useState<{
    members: GroupMember[];
    sessions: GroupSessionItem[];
  } | null>(null);
  const [drawerTab, setDrawerTab] = useState<"members" | "attendance" | "financials">("members");

  // Modals
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<EducationGroup> | null>(null);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollPaymentStatus, setEnrollPaymentStatus] = useState("PAID");
  const [enrollAmountPaid, setEnrollAmountPaid] = useState<number | string>("");

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<GroupMember | null>(null);
  const [targetGroupId, setTargetGroupId] = useState("");

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionHomework, setSessionHomework] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: "PRESENT" | "ABSENT" | "EXCUSED"; notes: string }>>({});
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);

  const [financialsData, setFinancialsData] = useState<any | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [enrollStudentFilter, setEnrollStudentFilter] = useState("");

  const eligibleStudents = useMemo(() => {
    const enrolledIds = new Set(groupDetails?.members?.map((m) => m.studentId) || []);
    return allStudents.filter((st) => {
      if (enrolledIds.has(st.id)) return false;
      if (!enrollStudentFilter.trim()) return true;
      const q = enrollStudentFilter.toLowerCase().trim();
      const name = `${st.firstName || ""} ${st.lastName || ""}`.toLowerCase();
      const code = (st.code || "").toLowerCase();
      const phone = st.phone || "";
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [allStudents, groupDetails?.members, enrollStudentFilter]);

  const filteredMembers = useMemo(() => {
    if (!groupDetails?.members) return [];
    if (!memberSearch.trim()) return groupDetails.members;
    const q = memberSearch.toLowerCase().trim();
    return groupDetails.members.filter((m) =>
      m.studentName?.toLowerCase().includes(q) ||
      m.studentCode?.toLowerCase().includes(q) ||
      m.studentPhone?.includes(q) ||
      m.guardianName?.toLowerCase().includes(q)
    );
  }, [groupDetails?.members, memberSearch]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [grpRes, subjRes, teachRes, stuRes] = await Promise.allSettled([
        fetch(api("groups"), { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch(api("subjects"), { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch(api("teachers"), { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch(api("students"), { headers: getAuthHeaders() }).then((r) => r.json()),
      ]);

      if (grpRes.status === "fulfilled" && grpRes.value?.success) {
        setGroups(grpRes.value.data || []);
      }
      if (subjRes.status === "fulfilled" && subjRes.value?.success) {
        setSubjects(subjRes.value.data || []);
      }
      if (teachRes.status === "fulfilled" && teachRes.value?.success) {
        setTeachers(teachRes.value.data || []);
      }
      if (stuRes.status === "fulfilled" && stuRes.value?.success) {
        setAllStudents(stuRes.value.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching education groups:", err);
      toast.error("تعذر تحميل بيانات المجموعات التعليمية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch single group full details
  const fetchGroupDetails = async (groupId: string) => {
    try {
      const res = await fetch(api(`groups/${groupId}`), { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setGroupDetails({
          members: json.data.members || [],
          sessions: json.data.sessions || [],
        });
        // Also fetch financials
        fetchGroupFinancials(groupId);
      }
    } catch (err) {
      console.error("Failed to load group details:", err);
    }
  };

  const fetchGroupFinancials = async (groupId: string) => {
    try {
      const res = await fetch(api(`groups/${groupId}/financials`), { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setFinancialsData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch group financials:", err);
    }
  };

  const handleOpenGroupDetails = (group: EducationGroup, tab: "members" | "attendance" | "financials" = "members") => {
    setActiveGroup(group);
    setDrawerTab(tab);
    fetchGroupDetails(group.id);
  };

  // Group Form Save
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name?.trim()) {
      toast.error("اسم المجموعة مطلوب");
      return;
    }
    if (!editingGroup?.subjectId) {
      toast.error("يرجى اختيار المادة الدراسية");
      return;
    }

    try {
      const isEdit = !!editingGroup.id;
      const url = isEdit ? api(`groups/${editingGroup.id}`) : api("groups");
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingGroup),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(isEdit ? "تم تحديث المجموعة بنجاح" : "تم إنشاء المجموعة بنجاح");
        setGroupModalOpen(false);
        setEditingGroup(null);
        fetchData();
        if (activeGroup?.id === editingGroup.id) {
          fetchGroupDetails(editingGroup.id);
        }
      } else {
        toast.error(data.error || "فشل حفظ المجموعة");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ المجموعة");
    }
  };

  // Delete Group
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المجموعة "${name}"؟ سيتم حذف جميع تسجيلات الحضور الخاصة بها.`)) {
      return;
    }
    try {
      const res = await fetch(api(`groups/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف المجموعة");
        if (activeGroup?.id === id) setActiveGroup(null);
        fetchData();
      } else {
        toast.error(data.error || "فشل حذف المجموعة");
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // Enroll Student to Group
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !enrollStudentId) {
      toast.error("يرجى اختيار الطالب");
      return;
    }
    try {
      const res = await fetch(api(`groups/${activeGroup.id}/members`), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: enrollStudentId,
          paymentStatus: enrollPaymentStatus,
          amountPaid: enrollAmountPaid || (enrollPaymentStatus === "PAID" ? activeGroup.feeAmount : 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data?.message || "تم تسكين الطالب بنجاح");
        setEnrollModalOpen(false);
        setEnrollStudentId("");
        setEnrollAmountPaid("");
        setEnrollStudentFilter("");
        fetchGroupDetails(activeGroup.id);
        fetchData();
        setActiveGroup((prev) => prev ? {
          ...prev,
          activeMembers: data.data?.status === "ACTIVE" ? (prev.activeMembers || 0) + 1 : prev.activeMembers,
          waitingMembers: data.data?.status === "WAITING_LIST" ? (prev.waitingMembers || 0) + 1 : prev.waitingMembers,
          totalMembers: (prev.totalMembers || 0) + 1,
        } : null);
      } else {
        toast.error(data.error || "فشل تسكين الطالب");
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء التسكين");
    }
  };

  // Remove Member
  const handleRemoveMember = async (studentId: string, studentName: string) => {
    if (!activeGroup) return;
    if (!window.confirm(`هل أنت متأكد من إزالة الطالب "${studentName}" من المجموعة؟`)) return;

    try {
      const res = await fetch(api(`groups/${activeGroup.id}/members/${studentId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إزالة الطالب من المجموعة");
        fetchGroupDetails(activeGroup.id);
        fetchData();
        setActiveGroup((prev) => prev ? {
          ...prev,
          activeMembers: Math.max(0, (prev.activeMembers || 1) - 1),
          totalMembers: Math.max(0, (prev.totalMembers || 1) - 1),
        } : null);
      } else {
        toast.error(data.error || "فشل إزالة الطالب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء العملية");
    }
  };

  // Transfer Member to another group
  const handleTransferMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !transferStudent || !targetGroupId) {
      toast.error("يرجى اختيار المجموعة المستهدفة");
      return;
    }
    try {
      const res = await fetch(api(`groups/${activeGroup.id}/transfer-member`), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: transferStudent.studentId,
          targetGroupId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم نقل الطالب للمجموعة الجديدة بنجاح");
        setTransferModalOpen(false);
        setTransferStudent(null);
        setTargetGroupId("");
        fetchGroupDetails(activeGroup.id);
        fetchData();
        setActiveGroup((prev) => prev ? {
          ...prev,
          activeMembers: Math.max(0, (prev.activeMembers || 1) - 1),
          totalMembers: Math.max(0, (prev.totalMembers || 1) - 1),
        } : null);
      } else {
        toast.error(data.error || "فشل نقل الطالب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء نقل الطالب");
    }
  };

  // Open Attendance Modal for active group
  const handleOpenAttendanceModal = () => {
    const activeMembers = groupDetails?.members?.filter((m) => m.status === "ACTIVE") || [];
    if (!activeGroup || activeMembers.length === 0) {
      toast.info("لا يوجد طلاب منتظمين في المجموعة لتسجيل الحضور");
      return;
    }
    // Default everyone to PRESENT
    const initialRecords: Record<string, { status: "PRESENT" | "ABSENT" | "EXCUSED"; notes: string }> = {};
    groupDetails.members
      .filter((m) => m.status === "ACTIVE")
      .forEach((m) => {
        initialRecords[m.studentId] = { status: "PRESENT", notes: "" };
      });
    setAttendanceRecords(initialRecords);
    setAttendanceModalOpen(true);
  };

  // Save Bulk Session & Attendance
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    const list = Object.entries(attendanceRecords).map(([studentId, val]) => ({
      studentId,
      status: val.status,
      notes: val.notes,
    }));

    try {
      const res = await fetch(api(`groups/${activeGroup.id}/sessions`), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionDate,
          teacherId: activeGroup.teacherId,
          topic: sessionTopic,
          homework: sessionHomework,
          attendanceList: list,
          notifyAbsentWhatsApp: notifyWhatsApp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم توثيق المحاضرة وتسجيل الحضور وإشعار أولياء الأمور بنجاح");
        setAttendanceModalOpen(false);
        setSessionTopic("");
        setSessionHomework("");
        fetchGroupDetails(activeGroup.id);
      } else {
        toast.error(data.error || "فشل حفظ الحضور");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ الحضور");
    }
  };

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.code && g.code.toLowerCase().includes(search.toLowerCase()));
      const matchSubject = !selectedSubject || g.subjectId === selectedSubject;
      const matchTeacher = !selectedTeacher || g.teacherId === selectedTeacher;
      const matchStatus = !selectedStatus ||
        (selectedStatus === "FULL" ? (g.status === "FULL" || g.isFull) :
         selectedStatus === "OPEN" ? (g.status === "OPEN" && !g.isFull) :
         g.status === selectedStatus);
      return matchSearch && matchSubject && matchTeacher && matchStatus;
    });
  }, [groups, search, selectedSubject, selectedTeacher, selectedStatus]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const activeGroups = groups.filter((g) => g.status === "OPEN" || g.status === "IN_PROGRESS").length;
    const totalStudentsEnrolled = groups.reduce((acc, g) => acc + (g.activeMembers || 0), 0);
    const totalWaitingList = groups.reduce((acc, g) => acc + (g.waitingMembers || 0), 0);
    const totalCapacity = groups.reduce((acc, g) => acc + (g.capacity || 0), 0);
    const capacityRatio = totalCapacity > 0 ? Math.round((totalStudentsEnrolled / totalCapacity) * 100) : 0;
    return { totalGroups, activeGroups, totalStudentsEnrolled, totalWaitingList, capacityRatio };
  }, [groups]);

  return (
    <div className={`w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 font-sans rtl ${embedded ? "" : "pb-24"}`} dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3.5 h-3.5" />
              نظام المجموعات الدراسية (الجروبات)
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {stats.activeGroups} مجموعة نشطة حالياً
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            إدارة المجموعات التعليمية
          </h1>
          <p className="text-xs text-muted-foreground">
            إدارة فصول ومجموعات الطلاب، المواعيد الأسبوعية الثابتة، التسكين، الحضور والغياب الجماعي، وتسويات المعلمين.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            title="تحديث البيانات"
            className="p-2.5 rounded-xl border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingGroup({
                name: "",
                code: `GRP-${101 + groups.length}`,
                capacity: 15,
                feeType: "MONTHLY",
                feeAmount: 350,
                teacherRateType: "PERCENTAGE",
                teacherRateValue: 50,
                scheduleDays: ["SATURDAY", "TUESDAY"],
                startTime: "17:00",
                endTime: "18:30",
                status: "OPEN",
              });
              setGroupModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            إنشاء مجموعة جديدة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border/70 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">إجمالي المجموعات</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalGroups}</div>
          <div className="text-[11px] text-muted-foreground">
            {stats.activeGroups} قيد التشغيل
          </div>
        </div>

        <div className="bg-card border border-border/70 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">الطلاب المسكنين</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalStudentsEnrolled}</div>
          <div className="text-[11px] text-emerald-600 font-medium">طالب منتظم بالفصول</div>
        </div>

        <div className="bg-card border border-border/70 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">نسبة الإشغال</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.capacityRatio}%</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.capacityRatio > 85 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(stats.capacityRatio, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border/70 p-4 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">قوائم الانتظار</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalWaitingList}</div>
          <div className="text-[11px] text-muted-foreground">طلاب بانتظار أماكن شاغرة</div>
        </div>

        <div className="bg-card border border-border/70 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">نظام التشغيل</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm font-bold text-foreground mt-1">جروبات ومواعيد ثابتة</div>
          <div className="text-[11px] text-muted-foreground">حضور جماعي + اشتراك دوري</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border/70 p-3.5 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المجموعة أو الكود..."
              className="w-full bg-background border border-input rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">جميع المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Teacher Filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">جميع المعلمين</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">جميع الحالات</option>
            <option value="OPEN">مفتوح للتسجيل</option>
            <option value="FULL">مكتمل العدد</option>
            <option value="IN_PROGRESS">قيد التشغيل</option>
            <option value="COMPLETED">منتهي</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border border-border/80 rounded-xl p-1 bg-muted/40 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              viewMode === "grid" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="عرض الكروت"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              viewMode === "table" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="عرض الجدول"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-muted-foreground">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">جاري تحميل المجموعات الدراسية...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">لا توجد مجموعات دراسية مطابقة</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              لم يتم العثور على مجموعات أو أنك لم تقم بإنشاء أي مجموعة دراسية بعد.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingGroup({
                name: "",
                code: `GRP-${101 + groups.length}`,
                capacity: 15,
                feeType: "MONTHLY",
                feeAmount: 350,
                teacherRateType: "PERCENTAGE",
                teacherRateValue: 50,
                scheduleDays: ["SATURDAY", "TUESDAY"],
                startTime: "17:00",
                endTime: "18:30",
                status: "OPEN",
              });
              setGroupModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            إنشاء أول مجموعة دراسية
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const fillPercentage = group.capacity > 0 ? Math.round(((group.activeMembers || 0) / group.capacity) * 100) : 0;
            const isFull = fillPercentage >= 100;

            return (
              <div
                key={group.id}
                className="bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                          {group.code || "GRP"}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            group.status === "OPEN"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : group.status === "FULL"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          }`}
                        >
                          {group.status === "OPEN" ? "مفتوح للتسجيل" : group.status === "FULL" ? "مكتمل" : group.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground leading-snug">{group.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroup(group);
                          setGroupModalOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="تعديل المجموعة"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="حذف المجموعة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject & Teacher Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-md font-medium">
                      <BookOpen className="w-3 h-3" />
                      {group.subjectName || "مادة دراسية"}
                    </span>
                    {group.teacherName && (
                      <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-foreground font-medium">
                        <GraduationCap className="w-3 h-3 text-muted-foreground" />
                        {group.teacherName}
                      </span>
                    )}
                    {group.level && (
                      <span className="text-[11px] text-muted-foreground">({group.level})</span>
                    )}
                  </div>
                </div>

                {/* Schedule & Days */}
                <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      الأيام:
                    </span>
                    <span className="font-semibold text-foreground">
                      {Array.isArray(group.scheduleDays) && group.scheduleDays.length > 0
                        ? group.scheduleDays
                            .map((d) => WEEK_DAYS.find((wd) => wd.id === d)?.label || d)
                            .join(" • ")
                        : "لم يتم تحديد الأيام"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      الموعد:
                    </span>
                    <span className="font-mono text-foreground font-semibold" dir="ltr">
                      {group.startTime || "17:00"} - {group.endTime || "18:30"}
                    </span>
                  </div>

                  {group.room && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        المكان / القاعة:
                      </span>
                      <span className="text-foreground">{group.room}</span>
                    </div>
                  )}
                </div>

                {/* Capacity & Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      الطلاب المسكنين:{" "}
                      <strong className="text-foreground">
                        {group.activeMembers || 0} / {group.capacity}
                      </strong>
                    </span>
                    <span className="font-bold text-primary font-mono">{fillPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs border-t border-border/50">
                    <span className="text-muted-foreground">الاشتراك:</span>
                    <span className="font-bold text-foreground">
                      {group.feeAmount} ج {group.feeType === "MONTHLY" ? "/ شهر" : "/ للمستوى"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => handleOpenGroupDetails(group, "members")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold gap-1 transition-colors"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>الطلاب ({group.activeMembers || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenGroupDetails(group, "attendance")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold gap-1 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>تسجيل الحضور</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenGroupDetails(group, "financials")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold gap-1 transition-colors"
                  >
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span>الحسابات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">كود / اسم المجموعة</th>
                  <th className="py-3 px-4">المادة</th>
                  <th className="py-3 px-4">المعلم</th>
                  <th className="py-3 px-4">المواعيد الثابتة</th>
                  <th className="py-3 px-4">الإشغال</th>
                  <th className="py-3 px-4">الاشتراك</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{g.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{g.code || "—"}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{g.subjectName || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{g.teacherName || "غير معين"}</td>
                    <td className="py-3 px-4">
                      <div className="text-foreground">
                        {Array.isArray(g.scheduleDays)
                          ? g.scheduleDays.map((d) => WEEK_DAYS.find((wd) => wd.id === d)?.label || d).join(" • ")
                          : "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                        {g.startTime} - {g.endTime}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">
                        {g.activeMembers || 0} / {g.capacity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {g.feeAmount} ج {g.feeType === "MONTHLY" ? "شهرياً" : "كورس"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          g.status === "OPEN"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : g.status === "FULL"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {g.status === "OPEN" ? "مفتوح" : g.status === "FULL" ? "مكتمل" : g.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupDetails(g, "members")}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                        >
                          إدارة المجموعة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(g);
                            setGroupModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id, g.name)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Group Detail Drawer / Modal */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-card border-r border-border h-full w-full max-w-2xl shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between rtl font-sans">
            <div className="space-y-5">
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                      {activeGroup.code || "GRP"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {activeGroup.subjectName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{activeGroup.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    المعلم: <strong>{activeGroup.teacherName || "غير معين"}</strong> • المواعيد:{" "}
                    {Array.isArray(activeGroup.scheduleDays)
                      ? activeGroup.scheduleDays.map((d) => WEEK_DAYS.find((wd) => wd.id === d)?.label || d).join(" • ")
                      : "—"}{" "}
                    ({activeGroup.startTime} - {activeGroup.endTime})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveGroup(null)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab("members")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    drawerTab === "members"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  طلاب الجروب ({groupDetails?.members?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab("attendance")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    drawerTab === "attendance"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  المحاضرات والحضور ({groupDetails?.sessions?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab("financials")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    drawerTab === "financials"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  تقرير الحسابات والتسوية
                </button>
              </div>

              {/* Tab 1: Students Roster & Waiting list */}
              {drawerTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs font-semibold text-foreground">
                      قائمة الطلاب المسكنين (
                      {groupDetails?.members?.filter((m) => m.status === "ACTIVE").length || 0} من أصل{" "}
                      {activeGroup.capacity})
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        title="طباعة كشف طلاب المجموعة"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted text-foreground border border-border rounded-lg text-xs font-medium hover:bg-muted/80 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        طباعة الكشف
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnrollModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        تسكين طالب جديد
                      </button>
                    </div>
                  </div>

                  {groupDetails?.members && groupDetails.members.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="بحث عن طالب بالاسم، الكود، أو رقم الهاتف..."
                        className="w-full bg-background border border-input rounded-xl pr-8 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {groupDetails?.members?.length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-xl space-y-2">
                      <p className="text-xs text-muted-foreground">لا يوجد طلاب مسكنين في هذه المجموعة حتى الآن.</p>
                      <button
                        type="button"
                        onClick={() => setEnrollModalOpen(true)}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        اضغط هنا لتسكين أول طالب
                      </button>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-6 text-center bg-muted/20 rounded-xl text-xs text-muted-foreground">
                      لا يوجد طلاب مطابقون لبحثك "{memberSearch}".
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{member.studentName}</span>
                              {member.studentCode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {member.studentCode}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  member.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-purple-500/10 text-purple-600"
                                }`}
                              >
                                {member.status === "ACTIVE" ? "منتظم" : "قائمة انتظار"}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-[11px] flex items-center gap-3">
                              {member.studentPhone && <span>هاتف: {member.studentPhone}</span>}
                              {member.guardianName && <span>ولي الأمر: {member.guardianName}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                member.paymentStatus === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {member.paymentStatus === "PAID" ? "تم السداد" : "غير مسدد"}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setTransferStudent(member);
                                setTransferModalOpen(true);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="نقل لمجموعة أخرى"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.studentId, member.studentName)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="إزالة من المجموعة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Sessions & Bulk Attendance */}
              {drawerTab === "attendance" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground">سجلات المحاضرات والحضور الجماعي</div>
                    <button
                      type="button"
                      onClick={handleOpenAttendanceModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      تسجيل محاضرة وحضور جديد
                    </button>
                  </div>

                  {groupDetails?.sessions?.length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-xl space-y-2">
                      <p className="text-xs text-muted-foreground">لم يتم تسجيل أي محاضرات أو حضور للجروب حتى الآن.</p>
                      <button
                        type="button"
                        onClick={handleOpenAttendanceModal}
                        className="text-xs text-emerald-600 font-semibold hover:underline"
                      >
                        اضغط هنا لتسجيل أول محاضرة
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupDetails?.sessions?.map((session) => (
                        <div
                          key={session.id}
                          className="bg-card border border-border/80 rounded-xl p-3 space-y-2 text-xs shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {session.topic || "محاضرة دورية للمجموعة"}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {(() => {
                                const d = new Date(session.sessionDate);
                                return isNaN(d.getTime()) ? (session.sessionDate || "—") : d.toLocaleDateString("ar-EG");
                              })()}
                            </span>
                          </div>

                          {session.homework && (
                            <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                              <strong>الواجب:</strong> {session.homework}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                            <span className="text-emerald-600 font-semibold">حضور: {session.presentCount} طالب</span>
                            <span className="text-red-600 font-semibold">غياب: {session.absentCount} طالب</span>
                            <span className="text-muted-foreground">إجمالي المقيدين: {session.totalCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Group Financials & Settlement */}
              {drawerTab === "financials" && (
                <div className="space-y-4">
                  {financialsData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                          <span className="text-muted-foreground">إجمالي الاشتراكات المحصلة</span>
                          <div className="text-lg font-bold text-foreground font-mono">
                            {financialsData.totalCollected} ج
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            من {financialsData.paidCount} طالب مسدد
                          </span>
                        </div>

                        <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                          <span className="text-muted-foreground">المحاضرات المنفذة</span>
                          <div className="text-lg font-bold text-foreground font-mono">
                            {financialsData.sessionCount} محاضرة
                          </div>
                          <span className="text-[10px] text-muted-foreground">تم توثيقها بنجاح</span>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl space-y-1">
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            مستحقات المعلم المحسوبة
                          </span>
                          <div className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">
                            {financialsData.teacherShare} ج
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            بناءً على ({financialsData.teacherRateType === "PERCENTAGE" ? `${financialsData.teacherRateValue}% نسبة` : `${financialsData.teacherRateValue} ج / حصة`})
                          </span>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl space-y-1">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            صافي ربح السنتر
                          </span>
                          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                            {financialsData.centerProfit} ج
                          </div>
                          <span className="text-[10px] text-muted-foreground">بعد خصم أجر المعلم</span>
                        </div>
                      </div>

                      <div className="bg-card border border-border p-4 rounded-xl text-xs space-y-2">
                        <h4 className="font-bold text-foreground">قواعد التسوية للجروب:</h4>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px]">
                          <li>يتم احتساب أجر المعلم وصافي دخل السنتر آلياً مع كل اشتراك يتم تحصيله.</li>
                          <li>
                            في نظام النسبة المئوية: تزيد مستحقات المعلم كلما زاد عدد الطلاب المسكنين في المجموعة.
                          </li>
                          <li>
                            في نظام الأجر الثابت: يتم احتساب الأجر بعدد المحاضرات المنفذة فعلياً بغض النظر عن الغياب.
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      جاري احتساب التسوية والبيانات المالية...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Bottom Close */}
            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create / Edit Group */}
      {groupModalOpen && editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-xl mx-auto space-y-4 max-h-[90vh] overflow-y-auto rtl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {editingGroup.id ? "تعديل بيانات المجموعة" : "إنشاء مجموعة دراسية جديدة"}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-foreground">اسم المجموعة *</label>
                  <input
                    type="text"
                    required
                    value={editingGroup.name || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    placeholder="مثال: لغة إنجليزية - أبطال الابتدائي - ليفل 1"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">كود المجموعة</label>
                  <input
                    type="text"
                    value={editingGroup.code || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
                    placeholder="مثال: GRP-101"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">المادة الدراسية *</label>
                  <select
                    required
                    value={editingGroup.subjectId || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, subjectId: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="">اختر المادة...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {subjects.length === 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                      ⚠️ لا توجد مواد مسجلة بعد. أضف مادة أولاً من تبويب المواد.
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">المعلم المسؤول</label>
                  <select
                    value={editingGroup.teacherId || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, teacherId: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="">اختر المعلم (اختياري)...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && (
                    <span className="text-[10px] text-muted-foreground block">
                      (يمكنك إنشاء المجموعة وتعيين المعلم لاحقاً)
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">المستوى / المرحلة</label>
                  <input
                    type="text"
                    value={editingGroup.level || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, level: e.target.value })}
                    placeholder="مثال: Grade 4 أو Level 2"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">الطاقة الاستيعابية (الحد الأقصى) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingGroup.capacity || 15}
                    onChange={(e) => setEditingGroup({ ...editingGroup, capacity: parseInt(e.target.value, 10) })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">نوع الاشتراك</label>
                  <select
                    value={editingGroup.feeType || "MONTHLY"}
                    onChange={(e) => setEditingGroup({ ...editingGroup, feeType: e.target.value as any })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="MONTHLY">اشتراك شهري</option>
                    <option value="FULL_COURSE">اشتراك المستوى بالكامل</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">قيمة الاشتراك (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingGroup.feeAmount || 0}
                    onChange={(e) => setEditingGroup({ ...editingGroup, feeAmount: parseFloat(e.target.value) })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">طريقة محاسبة المعلم</label>
                  <select
                    value={editingGroup.teacherRateType || "PERCENTAGE"}
                    onChange={(e) => setEditingGroup({ ...editingGroup, teacherRateType: e.target.value as any })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="PERCENTAGE">نسبة مئوية من الاشتراكات (%)</option>
                    <option value="FIXED_PER_SESSION">مبلغ ثابت لكل محاضرة</option>
                    <option value="PER_STUDENT">مبلغ عن كل طالب شهرياً</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    قيمة نسبة/أجر المعلم ({editingGroup.teacherRateType === "PERCENTAGE" ? "%" : "ج.م"})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingGroup.teacherRateValue || 50}
                    onChange={(e) => setEditingGroup({ ...editingGroup, teacherRateValue: parseFloat(e.target.value) })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Days selection */}
              <div className="space-y-1.5 pt-2 border-t border-border/80">
                <label className="font-semibold text-foreground block">الأيام الثابتة أسبوعياً *</label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = editingGroup.scheduleDays?.includes(day.id);
                    return (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => {
                          const current = editingGroup.scheduleDays || [];
                          const updated = isSelected
                            ? current.filter((d) => d !== day.id)
                            : [...current, day.id];
                          setEditingGroup({ ...editingGroup, scheduleDays: updated });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">وقت البدء</label>
                  <input
                    type="time"
                    value={editingGroup.startTime || "17:00"}
                    onChange={(e) => setEditingGroup({ ...editingGroup, startTime: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">وقت الانتهاء</label>
                  <input
                    type="time"
                    value={editingGroup.endTime || "18:30"}
                    onChange={(e) => setEditingGroup({ ...editingGroup, endTime: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Location / Room */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">القاعة أو رابط الأونلاين</label>
                <input
                  type="text"
                  value={editingGroup.room || ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, room: e.target.value })}
                  placeholder="مثال: قاعة 3 - الدور الثاني أو رابط Zoom"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm"
                >
                  {editingGroup.id ? "تحديث المجموعة" : "إنشاء المجموعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Enroll Student in Active Group */}
      {enrollModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto space-y-4 rtl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">تسكين طالب في ({activeGroup.name})</h3>
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">اختر الطالب للتسكين *</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={enrollStudentFilter}
                    onChange={(e) => setEnrollStudentFilter(e.target.value)}
                    placeholder="ابحث عن طالب بالاسم، الهاتف، أو الكود..."
                    className="w-full bg-background border border-input rounded-xl pr-8 pl-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
                <select
                  required
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">
                    {eligibleStudents.length === 0
                      ? "لا يوجد طلاب متاحون للتسكين"
                      : "اختر الطالب من القائمة..."}
                  </option>
                  {eligibleStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName || ""} {st.code ? `(${st.code})` : ""} - {st.phone || "بدون هاتف"}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground">
                  (يتم إخفاء الطلاب المسكنين بالفعل في هذه المجموعة تلقائياً لمنع التكرار)
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">حالة سداد الاشتراك</label>
                <select
                  value={enrollPaymentStatus}
                  onChange={(e) => setEnrollPaymentStatus(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="PAID">مسدد بالكامل</option>
                  <option value="PENDING">معلق / لم يسدد بعد</option>
                  <option value="PARTIAL">سداد جزئي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">المبلغ المدفوع (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  value={enrollAmountPaid}
                  onChange={(e) => setEnrollAmountPaid(e.target.value)}
                  placeholder={`القيمة الافتراضية: ${activeGroup.feeAmount} ج`}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              {activeGroup.activeMembers >= activeGroup.capacity && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs space-y-1">
                  <strong>تنبيه:</strong> المجموعة مكتملة العدد ({activeGroup.capacity} طالب). سيتم إضافة الطالب تلقائياً في <strong>قائمة الانتظار</strong> إلا إذا تم تفريغ مقعد.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  تأكيد التسكين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Transfer Student to another group */}
      {transferModalOpen && transferStudent && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto space-y-4 rtl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                نقل الطالب ({transferStudent.studentName})
              </h3>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferMember} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                سيتم نقل الطالب من المجموعة الحالية (<strong>{activeGroup.name}</strong>) إلى المجموعة المحددة أدناه مع
                نقل سجل اشتراكه.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">اختر المجموعة البديلة *</label>
                <select
                  required
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">اختر المجموعة...</option>
                  {groups
                    .filter((g) => g.id !== activeGroup.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} - ({g.subjectName}) - شاغر: {g.capacity - (g.activeMembers || 0)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  تأكيد النقل الفوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Bulk Session & Attendance Logger */}
      {attendanceModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-auto space-y-4 max-h-[90vh] overflow-y-auto rtl font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  تسجيل محاضرة وحضور جماعي ({activeGroup.name})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  المعلم: {activeGroup.teacherName || "غير معين"} • التاريخ: {sessionDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">تاريخ المحاضرة *</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">موضوع الدرس المشروح (Topic)</label>
                  <input
                    type="text"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    placeholder="مثال: مراجعة الوحدة الأولى وحل التمارين"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-foreground">الواجب المنزلي (Homework)</label>
                  <input
                    type="text"
                    value={sessionHomework}
                    onChange={(e) => setSessionHomework(e.target.value)}
                    placeholder="مثال: حل صفحة 24 و25 في كتاب التدريبات"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Bulk Attendance Checklist */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">كشف حضور الطلاب:</span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      حاضر: {Object.values(attendanceRecords).filter((r) => r.status === "PRESENT").length}
                    </span>
                    <span className="text-[11px] font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                      غائب: {Object.values(attendanceRecords).filter((r) => r.status === "ABSENT").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated: any = {};
                        Object.keys(attendanceRecords).forEach((id) => {
                          updated[id] = { status: "PRESENT", notes: "" };
                        });
                        setAttendanceRecords(updated);
                      }}
                      className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[11px] font-semibold hover:bg-emerald-500/20"
                    >
                      تحضير الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: any = {};
                        Object.keys(attendanceRecords).forEach((id) => {
                          updated[id] = { status: "ABSENT", notes: "" };
                        });
                        setAttendanceRecords(updated);
                      }}
                      className="px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg text-[11px] font-semibold hover:bg-red-500/20"
                    >
                      تغييب الكل
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto p-1">
                  {groupDetails?.members
                    ?.filter((m) => m.status === "ACTIVE")
                    .map((member) => {
                      const record = attendanceRecords[member.studentId] || { status: "PRESENT", notes: "" };
                      return (
                        <div
                          key={member.studentId}
                          className="flex items-center justify-between gap-3 p-2 bg-muted/40 rounded-xl border border-border/60"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{member.studentName}</span>
                            {member.studentCode && (
                              <span className="text-[10px] font-mono text-muted-foreground">({member.studentCode})</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceRecords({
                                  ...attendanceRecords,
                                  [member.studentId]: { ...record, status: "PRESENT" },
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                record.status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              حاضر
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceRecords({
                                  ...attendanceRecords,
                                  [member.studentId]: { ...record, status: "ABSENT" },
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                record.status === "ABSENT"
                                  ? "bg-red-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              غائب
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceRecords({
                                  ...attendanceRecords,
                                  [member.studentId]: { ...record, status: "EXCUSED" },
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                record.status === "EXCUSED"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              معتذر
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* WhatsApp Notification toggle */}
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <input
                  type="checkbox"
                  id="whatsappToggle"
                  checked={notifyWhatsApp}
                  onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="whatsappToggle" className="cursor-pointer font-medium text-emerald-800 dark:text-emerald-300">
                  إرسال إشعار غياب فوري عبر واتساب لأولياء أمور الطلاب الغائبين تلقائياً
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  حفظ المحاضرة والحضور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
