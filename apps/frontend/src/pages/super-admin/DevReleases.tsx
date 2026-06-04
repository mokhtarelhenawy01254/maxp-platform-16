import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { useTheme } from "../../hooks/useTheme";
import {
  PlusIcon,
  TagIcon,
  CalendarDaysIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  BugAntIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

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
  { label: string; bg: string; text: string }
> = {
  PLANNING: {
    label: "تخطيط",
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-700 dark:text-gray-300",
  },
  IN_PROGRESS: {
    label: "قيد العمل",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  READY: {
    label: "جاهز",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  RELEASED: {
    label: "صدر",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
  },
  CANCELLED: {
    label: "ملغي",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

const DevReleases: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [releases, setReleases] = useState<Release[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");
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
      if (data.success) {
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
        },
      );

      const data = await response.json();
      if (data.success) {
        setReleases(data.data);
      }
    } catch (err) {
      console.error("Error fetching releases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChangelog = async (id: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/releases/${id}/changelog`),
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchReleases();
        alert("تم توليد Changelog بنجاح");
      }
    } catch (err) {
      console.error("Error generating changelog:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإصدار؟")) return;

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/dev/releases/${id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchReleases();
      }
    } catch (err) {
      console.error("Error deleting release:", err);
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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🏷️ الإصدارات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            إدارة إصدارات المشاريع
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <PlusIcon className="h-5 w-5" />
          إصدار جديد
        </button>
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
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل المشاريع</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {(filterStatus || filterProject) && (
            <button
              onClick={() => {
                setFilterStatus("");
                setFilterProject("");
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {releases.map((release) => {
          const statusInfo =
            statusConfig[release.status] || statusConfig.PLANNING;

          return (
            <div
              key={release.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <TagIcon className="h-6 w-6 text-indigo-500" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          v{release.version}
                        </h3>
                        <p className="text-gray-600">{release.name}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    {release.description && (
                      <p className="text-gray-600 text-sm mt-2">
                        {release.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateChangelog(release.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      توليد Changelog
                    </button>
                    <button
                      onClick={() => handleDelete(release.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Project */}
                {release.projectName && (
                  <div className="flex items-center gap-2 mb-4">
                    <FolderIcon className="h-4 w-4 text-gray-400" />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: release.projectColor || "#6366f1",
                      }}
                    ></span>
                    <span className="text-sm text-gray-600">
                      {release.projectName}
                    </span>
                  </div>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">التقدم</span>
                    <span className="font-semibold text-gray-900">
                      {release.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${release.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {release.tasksCount}
                    </p>
                    <p className="text-xs text-gray-500">إجمالي المهام</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <SparklesIcon className="h-4 w-4 text-green-500" />
                      <p className="text-lg font-semibold text-green-600">
                        {release.tasksByType.features}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">ميزات</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BugAntIcon className="h-4 w-4 text-red-500" />
                      <p className="text-lg font-semibold text-red-600">
                        {release.tasksByType.bugs}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">إصلاحات</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" />
                      <p className="text-lg font-semibold text-blue-600">
                        {release.tasksByType.enhancements}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">تحسينات</p>
                  </div>
                </div>

                {/* Release Date */}
                {release.releaseDate && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      تاريخ الإصدار:{" "}
                      {new Date(release.releaseDate).toLocaleDateString(
                        "ar-EG",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {releases.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TagIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            لا توجد إصدارات
          </h3>
          <p className="text-gray-500 mb-6">ابدأ بإنشاء إصدار جديد</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 inline ml-2" />
            إصدار جديد
          </button>
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
      alert("رقم الإصدار والاسم مطلوبان");
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
        alert(data.error || "فشل في إنشاء الإصدار");
      }
    } catch (err) {
      alert("فشل في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">إصدار جديد</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم الإصدار *
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              placeholder="1.0.0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="اسم الإصدار..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الوصف
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المشروع
              </label>
              <select
                value={formData.projectId}
                onChange={(e) =>
                  setFormData({ ...formData, projectId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">بدون مشروع</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ الإصدار
              </label>
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, releaseDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
