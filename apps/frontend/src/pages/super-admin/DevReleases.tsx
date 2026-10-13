import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Bug,
  Wrench,
  Trash2,
  FolderGit2,
  X,
  Package
} from "lucide-react";

interface Release {
  id: string;
  version: string;
  name: string;
  description: string | null;
  status: string;
  releaseDate: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  tasksCount: number;
  completedTasks: number;
  progress: number;
  tasksByType: {
    features: number;
    bugs: number;
    enhancements: number;
  };
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
  IN_PROGRESS: {
    label: "قيد العمل",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  READY: {
    label: "جاهز للإطلاق",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  RELEASED: {
    label: "صدر رسمياً",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  COMPLETED: {
    label: "مكتمل",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  CANCELLED: {
    label: "ملغي",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
};

const DevReleases: React.FC = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReleases();
    fetchProjects();
  }, [filterStatus, filterProject]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(buildApiUrl("super-admin/dev/projects"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterProject) params.append("projectId", filterProject);

      const response = await fetch(
        buildApiUrl(`super-admin/dev/releases?${params.toString()}`),
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }
      );

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setReleases(data.data);
      }
    } catch (err) {
      console.error("Error fetching releases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإصدار نهائياً؟")) return;

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/releases/${id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchReleases();
      }
    } catch (err) {
      console.error("Error deleting release:", err);
    }
  };

  const filteredReleases = useMemo(() => {
    return releases.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.version.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.projectName && r.projectName.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [releases, searchQuery]);

  const stats = useMemo(() => {
    const total = releases.length;
    const inProgress = releases.filter(
      (r) => r.status === "IN_PROGRESS" || r.status === "PLANNING"
    ).length;
    const released = releases.filter(
      (r) => r.status === "RELEASED" || r.status === "COMPLETED"
    ).length;
    const totalTasks = releases.reduce((acc, r) => acc + (r.tasksCount || 0), 0);
    return { total, inProgress, released, totalTasks };
  }, [releases]);

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-6 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <Tag className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Release Train & Changelog
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              سجل وإدارة إصدارات النظام
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              تخطيط خارطة طريق الإصدارات، جداول المهام والميزات الجديدة، ومتابعة جاهزية النشر.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchReleases}
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
              <span>إصدار جديد</span>
            </button>
          </div>
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الإصدارات</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
              {stats.total}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-muted text-muted-foreground">
            <Package className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">قيد التطوير والتجهيز</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {stats.inProgress}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Clock className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">صدرت رسمياً</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.released}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">المهام المجدولة</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
              {stats.totalTasks}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
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
            placeholder="البحث برقم الإصدار، الاسم، أو المشروع..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <div className="relative">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="pr-8 pl-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">جميع المشاريع</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {(filterStatus || filterProject) && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("");
                setFilterProject("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/50"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Releases Cards */}
      {loading ? (
        <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground rounded-xl border border-border/70 bg-card">
          <RefreshCw className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">جاري فحص وتحديث قائمة الإصدارات...</span>
        </div>
      ) : filteredReleases.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-12 text-center text-muted-foreground space-y-3">
          <Tag className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">لا توجد إصدارات مسجلة</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            قم بإنشاء إصدار جديد لربط المهام البرمجية وتتبع خارطة إطلاق الميزات.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>إصدار جديد</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReleases.map((release) => {
            const statusInfo = statusConfig[release.status] || statusConfig.PLANNING;

            return (
              <div
                key={release.id}
                className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <code className="text-sm font-bold font-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {release.version.startsWith("v") ? release.version : `v${release.version}`}
                      </code>
                      <h3 className="text-base font-bold text-foreground">
                        {release.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {release.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                        {release.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => handleDelete(release.id)}
                      className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="حذف الإصدار"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Project Tag */}
                {release.projectName && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FolderGit2 className="size-3.5 text-muted-foreground/70" />
                    <span>المشروع:</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: release.projectColor || "#6366f1" }}
                      />
                      {release.projectName}
                    </span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground text-[11px]">مؤشر الجاهزية</span>
                    <span className="font-bold text-foreground tabular-nums">{release.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${release.progress}%` }}
                    />
                  </div>
                </div>

                {/* 4-Stat Breakdown Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 text-center">
                    <p className="text-base font-bold font-mono text-foreground tabular-nums">
                      {release.tasksCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">إجمالي المهام</p>
                  </div>

                  <div className="rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="size-3.5" />
                      <p className="text-base font-bold font-mono tabular-nums">
                        {release.tasksByType?.features ?? 0}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">ميزات جديدة</p>
                  </div>

                  <div className="rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400">
                      <Bug className="size-3.5" />
                      <p className="text-base font-bold font-mono tabular-nums">
                        {release.tasksByType?.bugs ?? 0}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">إصلاحات أخطاء</p>
                  </div>

                  <div className="rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                      <Wrench className="size-3.5" />
                      <p className="text-base font-bold font-mono tabular-nums">
                        {release.tasksByType?.enhancements ?? 0}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">تحسينات عامة</p>
                  </div>
                </div>

                {/* Release Date */}
                {release.releaseDate && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground font-mono">
                    <Calendar className="size-3.5 text-muted-foreground/70" />
                    <span>تاريخ الإصدار المتوقع:</span>
                    <span className="text-foreground font-semibold tabular-nums">
                      {new Date(release.releaseDate).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Release Form Modal */}
      {showForm && (
        <ReleaseFormModal
          projects={projects}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchReleases();
          }}
        />
      )}
    </div>
  );
};

// Release Form Modal Component
const ReleaseFormModal: React.FC<{
  projects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ projects, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    version: "",
    name: "",
    description: "",
    releaseDate: "",
    projectId: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.version.trim() || !formData.name.trim()) {
      alert("يرجى إدخال رقم الإصدار والاسم");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        projectId: formData.projectId || null,
        releaseDate: formData.releaseDate || null,
        description: formData.description || null,
      };

      const response = await fetch(buildApiUrl("super-admin/dev/releases"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || "فشل إنشاء الإصدار");
      }
    } catch (err) {
      alert("حدث خطأ أثناء إنشاء الإصدار");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-foreground rounded-xl border border-border/80 max-w-xl w-full shadow-xl">
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">إنشاء إصدار جديد</h2>
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
              رقم الإصدار <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="مثال: 2.8.0 أو v1.2.0"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              اسم الإصدار <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="اسم رمزي أو عنوان رئيسي للتحديث..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">الوصف والملاحظات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="تفاصيل التحديث وسجل التغييرات المتوقعة..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">المشروع التابع له</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">بدون مشروع محدد</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">تاريخ الإصدار المتوقع</label>
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
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
              {saving ? "جاري الإنشاء..." : "إنشاء الإصدار"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevReleases;
