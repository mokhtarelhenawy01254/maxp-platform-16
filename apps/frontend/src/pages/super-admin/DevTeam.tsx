import React, { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase,
  FolderGit2,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  XCircle,
  AlertCircle
} from "lucide-react";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  skills: string[];
  availability: string;
  isActive: boolean;
  tasksCount: number;
  projectsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const roleLabels: Record<string, string> = {
  developer: "مطور برمجيات",
  designer: "مصمم واجهات وتجربة",
  project_manager: "مدير مشاريع",
  qa: "مهندس جودة واختبارات",
  devops: "مهندس بنية تحتية DevOps",
  tech_lead: "قائد تقني Tech Lead",
  product_manager: "مدير منتج",
};

const availabilityConfig: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  available: {
    label: "متاح للعمل",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
  busy: {
    label: "مشغول بمهام",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  away: {
    label: "في استراحة / بعيد",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  offline: {
    label: "غير متصل",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-slate-400",
  },
};

const DevTeam: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (showForm && !editingMember) {
      fetchAvailableUsers();
    }
  }, [showForm, editingMember]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("super-admin/dev/team"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTeamMembers(data.data);
      } else {
        console.error("Failed to fetch team members:", data.error);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(buildApiUrl("super-admin/users?limit=100"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const existingUserIds = teamMembers.map((m) => m.userId);
        const usersArray = Array.isArray(data.data) ? data.data : [];
        const available = usersArray.filter((u: User) => !existingUserIds.includes(u.id));
        setAvailableUsers(available);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العضو من فريق التطوير؟")) return;

    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/team/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success) {
        fetchTeamMembers();
      } else {
        alert(data.error || "فشل حذف العضو");
      }
    } catch (err) {
      alert("حدث خطأ أثناء حذف العضو");
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.department && member.department.toLowerCase().includes(q)) ||
        (member.skills && member.skills.some((s) => s.toLowerCase().includes(q)));
      const matchesRole = !filterRole || member.role === filterRole;
      const matchesAvailability =
        !filterAvailability || member.availability.toLowerCase() === filterAvailability.toLowerCase();
      return matchesSearch && matchesRole && matchesAvailability;
    });
  }, [teamMembers, searchQuery, filterRole, filterAvailability]);

  const stats = useMemo(() => {
    const total = teamMembers.length;
    const available = teamMembers.filter((m) => m.availability.toLowerCase() === "available").length;
    const active = teamMembers.filter((m) => m.isActive).length;
    const totalTasks = teamMembers.reduce((acc, m) => acc + (m.tasksCount || 0), 0);
    return { total, available, active, totalTasks };
  }, [teamMembers]);

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-6 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Engineering Roster & Directory
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              سجل وإدارة فريق التطوير الهندسي
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              إدارة الكوادر البرمجية، توزيع الأدوار، متابعة الجاهزية والمهام والمشاريع المسندة لكل مهندس.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchTeamMembers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
            >
              <UserPlus className="size-3.5" />
              <span>إضافة عضو جديد</span>
            </button>
          </div>
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الفريق</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
              {stats.total}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-muted text-muted-foreground">
            <Users className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">أعضاء متاحون</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.available}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">حسابات نشطة</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
              {stats.active}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">المهام الموزعة</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-amber-500 tabular-nums">
              {stats.totalTasks}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="size-5" />
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم، البريد، القسم، أو المهارة..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pr-8 pl-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">جميع الأدوار</option>
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="pr-8 pl-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">جميع حالات الجاهزية</option>
              {Object.entries(availabilityConfig).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {(filterRole || filterAvailability) && (
            <button
              type="button"
              onClick={() => {
                setFilterRole("");
                setFilterAvailability("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/50"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Team Cards Grid */}
      {loading ? (
        <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground rounded-xl border border-border/70 bg-card">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">جاري فحص وتحديث قائمة أعضاء الفريق...</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-12 text-center text-muted-foreground space-y-3">
          <Users className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">لا يوجد أعضاء يطابقون معايير البحث</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            يمكنك إضافة مهندسين ومطورين جدد للفريق وإسناد المهام البرمجية لهم.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <UserPlus className="size-3.5" />
            <span>إضافة عضو جديد</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMembers.map((member) => {
            const availKey = member.availability?.toLowerCase() || "offline";
            const availabilityInfo = availabilityConfig[availKey] || availabilityConfig.offline;

            return (
              <div
                key={member.id}
                className="rounded-xl border border-border/70 bg-card p-5 space-y-4 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between"
              >
                {/* Member Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full border border-border bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="size-full rounded-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">{member.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(member)}
                      className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="تعديل العضو"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(member.id)}
                      className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="حذف العضو"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Role & Department */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-3.5 text-muted-foreground/70" />
                    <span className="font-semibold text-foreground">
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                  {member.department && (
                    <div className="text-[11px] text-muted-foreground pr-5">
                      {member.department}
                    </div>
                  )}
                </div>

                {/* Availability & Active Badges */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${availabilityInfo.badgeClass}`}
                  >
                    <span className={`size-1.5 rounded-full ${availabilityInfo.dotClass}`} />
                    <span>{availabilityInfo.label}</span>
                  </span>
                  {!member.isActive && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                      غير نشط
                    </span>
                  )}
                </div>

                {/* Skills */}
                {member.skills && member.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">المهارات والتقنيات:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono border border-border/50"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          +{member.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 2-Stat Hairline Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-center font-mono">
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
                    <p className="text-base font-bold text-foreground tabular-nums">
                      {member.tasksCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">مهمة مسندة</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
                    <p className="text-base font-bold text-primary tabular-nums">
                      {member.projectsCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">مشروع</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TeamMemberFormModal
          member={editingMember}
          availableUsers={availableUsers}
          loadingUsers={loadingUsers}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            fetchTeamMembers();
          }}
        />
      )}
    </div>
  );
};

// Team Member Form Modal Component
const TeamMemberFormModal: React.FC<{
  member: TeamMember | null;
  availableUsers: User[];
  loadingUsers: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ member, availableUsers, loadingUsers, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    userId: member?.userId || "",
    role: member?.role || "developer",
    department: member?.department || "",
    skills: member?.skills?.join(", ") || "",
    availability: member?.availability || "available",
    isActive: member?.isActive !== undefined ? member.isActive : true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member && !formData.userId) {
      alert("يرجى اختيار مستخدم لإضافته كعضو فريق");
      return;
    }

    try {
      setSaving(true);
      const url = member
        ? buildApiUrl(`super-admin/dev/team/${member.id}`)
        : buildApiUrl("super-admin/dev/team");

      const payload: any = {
        ...formData,
        skills: formData.skills
          ? formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      if (!member) {
        payload.userId = formData.userId;
      } else {
        delete payload.userId;
      }

      const response = await fetch(url, {
        method: member ? "PUT" : "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || `فشل في ${member ? "تحديث" : "إضافة"} العضو`);
      }
    } catch (err) {
      alert("حدث خطأ أثناء حفظ بيانات العضو");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-foreground rounded-xl border border-border/80 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              {member ? "تعديل بيانات عضو الفريق" : "إضافة عضو جديد للفريق"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {!member && (
            <div>
              <label className="block font-medium text-foreground mb-1">
                المستخدم <span className="text-rose-500">*</span>
              </label>
              {loadingUsers ? (
                <div className="text-center py-3">
                  <RefreshCw className="size-4 animate-spin text-primary mx-auto" />
                </div>
              ) : (
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">اختر مستخدم...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              )}
              {!loadingUsers && availableUsers.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">لا يوجد مستخدمين متاحين للإضافة</p>
              )}
            </div>
          )}

          <div>
            <label className="block font-medium text-foreground mb-1">
              الدور الوظيفي <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              required
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">القسم أو التخصص</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="مثل: Frontend, Backend Core, AI Platform, DevOps..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">المهارات التقنية</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="مفصولة بفاصلة: React, TypeScript, Node.js, Python..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">حالة الجاهزية</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
            >
              {Object.entries(availabilityConfig).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="size-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="font-medium text-foreground cursor-pointer">
              عضو نشط في الفريق
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-95 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : member ? "تحديث البيانات" : "إضافة العضو"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevTeam;
