import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  FolderGit2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Trash2,
  Eye,
  X,
  Layers,
  ArrowUpRight,
  FolderOpen
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  color: string;
  icon: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  managerId: string | null;
  managerName: string | null;
  managerAvatar: string | null;
  tasksCount: number;
  completedTasks: number;
  releasesCount: number;
  tags: string[];
  repository: string | null;
  createdAt: string;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const statusConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PLANNING: {
    label: "تخطيط",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  ACTIVE: {
    label: "نشط",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  ON_HOLD: {
    label: "معلق",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  COMPLETED: {
    label: "مكتمل",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  CANCELLED: {
    label: "ملغي",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
};

const priorityConfig: Record<string, { label: string; dotClass: string }> = {
  CRITICAL: { label: "حرج", dotClass: "bg-rose-500" },
  HIGH: { label: "مرتفع", dotClass: "bg-amber-500" },
  MEDIUM: { label: "متوسط", dotClass: "bg-blue-500" },
  LOW: { label: "منخفض", dotClass: "bg-slate-400" },
};

const DevProjects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [filterStatus]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);

      const response = await fetch(
        buildApiUrl(`super-admin/dev/projects?${params.toString()}`),
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }
      );

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشروع نهائياً؟")) return;

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/projects/${id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchProjects();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesSearch;
    });
  }, [projects, searchQuery]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "ACTIVE").length;
    const totalTasks = projects.reduce((acc, p) => acc + (p.tasksCount || 0), 0);
    const completedTasks = projects.reduce((acc, p) => acc + (p.completedTasks || 0), 0);
    return { total, active, totalTasks, completedTasks };
  }, [projects]);

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-6 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <FolderGit2 className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Engineering Projects Directory
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              سجل وإدارة مشاريع التطوير
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              تتبع محافظ المشاريع البرمجية، مؤشرات تقدم الإنجاز، ربط مديري المشاريع وإصدارات النظام.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchProjects}
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
              <Plus className="size-3.5" />
              <span>مشروع جديد</span>
            </button>
          </div>
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card shadow-2xs divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 overflow-hidden">
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي المشاريع</span>
            <Layers className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
            {stats.total}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">المشاريع النشطة</span>
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.active}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي المهام</span>
            <Clock className="size-3.5 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
            {stats.totalTasks}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">المهام المنجزة</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.completedTasks}
          </div>
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
            placeholder="البحث باسم المشروع، الوصف، أو التصنيف..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pr-8 pl-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">جميع الحالات</option>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {filterStatus && (
            <button
              type="button"
              onClick={() => setFilterStatus("")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/50"
            >
              مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground rounded-xl border border-border/70 bg-card">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">جاري فحص وتحديث قائمة المشاريع...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-12 text-center text-muted-foreground space-y-3">
          <FolderOpen className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">لا توجد مشاريع تطابق البحث</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            يمكنك البدء بإنشاء مشروع تطوير جديد وربط المهام وأعضاء الفريق به.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>مشروع جديد</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((project) => {
            const statusInfo = statusConfig[project.status] || statusConfig.PLANNING;
            const priorityInfo = priorityConfig[project.priority] || priorityConfig.MEDIUM;
            const isOverdue =
              project.endDate &&
              new Date(project.endDate) < new Date() &&
              project.status !== "COMPLETED";

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/super-admin/dev-tasks?projectId=${project.id}`)}
                className="rounded-xl border border-border/70 bg-card overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-sm flex flex-col justify-between group"
              >
                {/* Accent Ribbon */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: project.color || "#6366f1" }}
                />

                <div className="p-5 space-y-4 flex-1">
                  {/* Card Title & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="size-4 text-primary shrink-0" />
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/super-admin/dev-tasks?projectId=${project.id}`);
                        }}
                        className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="عرض المهام"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف المشروع"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status & Priority Chips */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                      <span className={`size-1.5 rounded-full ${priorityInfo.dotClass}`} />
                      <span>{priorityInfo.label}</span>
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground text-[11px]">نسبة الإنجاز</span>
                      <span className="font-bold text-foreground tabular-nums">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 3-Stat Hairline Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/60 text-center font-mono">
                    <div>
                      <div className="text-base font-bold text-foreground tabular-nums">
                        {project.tasksCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">مهمة</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {project.completedTasks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">مكتملة</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-primary tabular-nums">
                        {project.releasesCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">إصدار</div>
                    </div>
                  </div>

                  {/* Manager & Timeline */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {project.managerName && (
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground/70" />
                        <span>المدير:</span>
                        <span className="font-medium text-foreground">{project.managerName}</span>
                      </div>
                    )}
                    {project.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar
                          className={`size-3.5 ${
                            isOverdue ? "text-rose-500" : "text-muted-foreground/70"
                          }`}
                        />
                        <span>الموعد:</span>
                        <span
                          className={`font-mono tabular-nums ${
                            isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-foreground"
                          }`}
                        >
                          {new Date(project.endDate).toLocaleDateString("ar-EG")}
                          {isOverdue && " (متأخر)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Tag Pills */}
                {project.tags && project.tags.length > 0 && (
                  <div className="p-3 bg-muted/20 border-t border-border/60 flex flex-wrap gap-1 items-center">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-background text-muted-foreground border border-border/60 rounded text-[10px] font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Project Form Modal */}
      {showForm && (
        <ProjectFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
};

// Project Form Modal Component
const ProjectFormModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "MEDIUM",
    color: "#6366f1",
    startDate: "",
    endDate: "",
    managerId: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(buildApiUrl("super-admin/dev/team"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTeamMembers(data.data.map((m: any) => ({ id: m.id, name: m.name })));
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("يرجى ملء اسم المشروع والوصف");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        managerId: formData.managerId || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      const response = await fetch(buildApiUrl("super-admin/dev/projects"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || "فشل إنشاء المشروع");
      }
    } catch (err) {
      alert("حدث خطأ أثناء إنشاء المشروع");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-foreground rounded-xl border border-border/80 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">إنشاء مشروع تطوير جديد</h2>
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
          <div>
            <label className="block font-medium text-foreground mb-1">
              اسم المشروع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              وصف المشروع <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">تاريخ البدء</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">مدير المشروع</label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">غير محدد</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">لون التمييز</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-9 w-full border border-border rounded-lg cursor-pointer bg-background"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              التصنيفات (مفصولة بفاصلة)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="frontend, backend, ai, mobile..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
            />
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
              {saving ? "جاري الإنشاء..." : "إنشاء المشروع"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevProjects;
