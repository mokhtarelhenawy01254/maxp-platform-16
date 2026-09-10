import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import {
  PlusIcon,
  FolderIcon,
  CalendarDaysIcon,
  UserIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
  { label: string; bg: string; text: string }
> = {
  PLANNING: {
    label: "تخطيط",
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-700 dark:text-gray-300",
  },
  ACTIVE: {
    label: "نشط",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  ON_HOLD: {
    label: "معلق",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  COMPLETED: {
    label: "مكتمل",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  CANCELLED: {
    label: "ملغي",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

const DevProjects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
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
        },
      );

      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشروع؟")) return;

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/projects/${id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchProjects();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📂 المشاريع
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            إدارة مشاريع التطوير
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5" />
            مشروع جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الحالات</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {filterStatus && (
            <button
              onClick={() => setFilterStatus("")}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const statusInfo =
            statusConfig[project.status] || statusConfig.PLANNING;
          const isOverdue =
            project.endDate &&
            new Date(project.endDate) < new Date() &&
            project.status !== "COMPLETED";

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg dark:hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() =>
                navigate(`/super-admin/dev-tasks?projectId=${project.id}`)
              }
            >
              {/* Header */}
              <div
                className="h-2"
                style={{ backgroundColor: project.color || "#6366f1" }}
              ></div>

              <div className="p-6">
                {/* Title */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {project.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/super-admin/dev-tasks?projectId=${project.id}`,
                        );
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title="عرض"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // navigate(`/super-admin/dev-projects/${project.id}/edit`);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status & Priority */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
                  >
                    {statusInfo.label}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${priorityColors[project.priority] || "bg-gray-400"}`}
                  ></span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      التقدم
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {project.tasksCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      مهمة
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {project.completedTasks}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      مكتملة
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                      {project.releasesCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      إصدار
                    </p>
                  </div>
                </div>

                {/* Manager & Dates */}
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {project.managerName && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        المدير:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {project.managerName}
                      </span>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDaysIcon
                        className={`h-4 w-4 ${isOverdue ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}
                      />
                      <span
                        className={
                          isOverdue
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        {new Date(project.endDate).toLocaleDateString("ar-EG")}
                        {isOverdue && " (متأخر)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-gray-500 dark:text-gray-500 text-xs">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
          <FolderIcon className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            لا توجد مشاريع
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            ابدأ بإنشاء مشروع جديد
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-medium"
          >
            <PlusIcon className="h-5 w-5 inline ml-2" />
            مشروع جديد
          </button>
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
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(buildApiUrl("super-admin/dev/team"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.data.map((m: any) => ({ id: m.id, name: m.name })));
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert(i18n.t("DevProjects.msg_f4a8"));
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
        alert(data.error || i18n.t("DevProjects.failed_create_b90e"));
      }
    } catch (err) {
      alert(i18n.t("DevProjects.msg_58f7"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            مشروع جديد
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الاسم <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الوصف <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تاريخ البدء
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تاريخ الانتهاء
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              المدير
            </label>
            <select
              value={formData.managerId}
              onChange={(e) =>
                setFormData({ ...formData, managerId: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              اللون
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              التصنيفات (مفصولة بفاصلة)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="frontend, backend, mobile..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
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
