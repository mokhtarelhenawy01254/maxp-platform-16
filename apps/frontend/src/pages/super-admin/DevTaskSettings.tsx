import React, { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Cog6ToothIcon,
  SwatchIcon,
  ShieldCheckIcon,
  BoltIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  TrophyIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface StatusItem {
  value: string;
  label: string;
  color: string;
}

interface PermissionRule {
  // Task Permissions
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canAssign: boolean;
  canChangeStatus: boolean;
  canArchive: boolean;
  // Project & Reports
  canViewReports: boolean;
  canManageProjects: boolean;
  canExport: boolean;
  // Settings Access
  canAccessSettings: boolean;
  canManageTaskSettings: boolean;
  // Users & Admin
  canViewAll: boolean; // 🔐 NEW: View all users in admin panel
  // View Scope
  viewScope: "all" | "project" | "assigned_only";
}

interface ComponentMapping {
  [componentName: string]: string; // memberId
}

interface LeaderboardSettings {
  baseXP: number;
  taskTypeScores: {
    [key: string]: number;
  };
  priorityScores: {
    [key: string]: number;
  };
  timeBasedScoring?: {
    enabled: boolean;
    earlyCompletionBonus: number;
    onTimeBonus: number;
    lateCompletionPenalty: number;
    maxBonusPercent: number;
    maxPenaltyPercent: number;
  };
}

interface TaskDetailsVisibility {
  showDescription: boolean;
  showRelatedLinks: boolean;
  showChecklists: boolean;
  showBusinessValue: boolean;
  showAcceptanceCriteria: boolean;
  showAttachments: boolean;
  showCreatedAt: boolean;
}

interface AutomationRule {
  threshold: number;
  unit: "hours" | "days";
  scope: "all" | string;
  action: "assign";
  targetId: string;
}

interface AutomationSettings {
  rules: AutomationRule[];
}

interface SettingsData {
  taskStatuses: StatusItem[];
  taskPriorities: StatusItem[];
  permissions: Record<string, PermissionRule>;
  componentMappings: ComponentMapping;
  autoTestingSubtask?: boolean;
  autoTestingAssigneeId?: string | null;
  leaderboardSettings?: LeaderboardSettings;
  taskDetailsVisibility?: TaskDetailsVisibility;
  automationSettings?: AutomationSettings;
  timezone?: string;
}

interface DevTeamMember {
  id: string;
  name: string;
  role: string;
}

const DEFAULT_STATUS_COLOR = "#cbd5e1";

const isValidHexColor = (value?: string | null): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const getSafeHexColor = (value?: string | null) =>
  isValidHexColor(value) ? value : DEFAULT_STATUS_COLOR;

const sanitizeStatusItems = (items?: StatusItem[]) =>
  Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        color: getSafeHexColor(item.color),
      }))
    : [];

const DevTaskSettings = () => {
  const [activeTab, setActiveTab] = useState<
    "general" | "permissions" | "automation" | "leaderboard" | "visibility"
  >("general");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<DevTeamMember[]>([]);

  const newComponentNameRef = useRef<HTMLInputElement>(null);
  const newComponentOwnerRef = useRef<HTMLSelectElement>(null);
  const ruleThresholdRef = useRef<HTMLInputElement>(null);
  const ruleUnitRef = useRef<HTMLSelectElement>(null);
  const ruleScopeRef = useRef<HTMLSelectElement>(null);
  const ruleTargetRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    fetchSettings();
    fetchTeam();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/settings"), {
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSettings({
          ...data.data,
          taskStatuses: sanitizeStatusItems(data.data.taskStatuses),
          taskPriorities: sanitizeStatusItems(data.data.taskPriorities),
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/team"), {
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch team", error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Ensure leaderboardSettings is complete before saving
      const settingsToSave = {
        ...settings,
        leaderboardSettings: settings.leaderboardSettings
          ? {
              baseXP: settings.leaderboardSettings.baseXP || 10,
              taskTypeScores: settings.leaderboardSettings.taskTypeScores || {},
              priorityScores: settings.leaderboardSettings.priorityScores || {},
              timeBasedScoring: settings.leaderboardSettings
                .timeBasedScoring || {
                enabled: true,
                earlyCompletionBonus: 20,
                onTimeBonus: 10,
                lateCompletionPenalty: 15,
                maxBonusPercent: 50,
                maxPenaltyPercent: 30,
              },
            }
          : undefined,
        automationSettings: settings.automationSettings
          ? {
              rules: settings.automationSettings.rules || [],
            }
          : undefined,
      };

      const res = await fetch(buildApiUrl("super-admin/dev/settings"), {
        method: "PUT",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(settingsToSave),
      });
      const data = await res.json();
      if (data.success) {
        alert(i18n.t("DevTaskSettings.success_save_eb53"));
        // Refresh settings to confirm save
        await fetchSettings();
      } else {
        alert("فشل الحفظ: " + (data.message || i18n.t("DevTaskSettings.msg_74b2")));
      }
    } catch (error) {
      console.error("❌ Save error:", error);
      alert(i18n.t("DevTaskSettings.error_error_3bd3"));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (
    index: number,
    field: keyof StatusItem,
    value: string,
  ) => {
    if (!settings) return;
    const newStatuses = [...settings.taskStatuses];
    newStatuses[index] = {
      ...newStatuses[index],
      [field]: value,
    } as StatusItem;
    setSettings({ ...settings, taskStatuses: newStatuses });
  };

  const addStatus = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      taskStatuses: [
        ...settings.taskStatuses,
        { value: "NEW_STATUS", label: "New Status", color: "#cbd5e1" },
      ],
    });
  };

  const removeStatus = (index: number) => {
    if (!settings) return;
    const newStatuses = settings.taskStatuses.filter((_, i) => i !== index);
    setSettings({ ...settings, taskStatuses: newStatuses });
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
  if (!settings)
    return (
      <div className="p-10 text-center text-red-500">فشل تحميل الإعدادات</div>
    );

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Cog6ToothIcon className="h-8 w-8 text-indigo-500" />
            إعدادات نظام المهام
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            تخصيص الحالات، الصلاحيات، والتشغيل الآلي
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            "جاري الحفظ..."
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              حفظ التغييرات
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "general" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <SwatchIcon className="h-4 w-4" />
          الحالات والأولويات
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "permissions" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ShieldCheckIcon className="h-4 w-4" />
          الصلاحيات والأدوار
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "automation" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <BoltIcon className="h-4 w-4" />
          الأقسام والتعيين التلقائي
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "leaderboard" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <TrophyIcon className="h-4 w-4" />
          لوحة الأبطال
        </button>
        <button
          onClick={() => setActiveTab("visibility")}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "visibility" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Cog6ToothIcon className="h-4 w-4" />
          عرض تفاصيل المهمة
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === "general" && (
          <div className="space-y-8">
            {/* Timezone Settings */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center gap-3 mb-4">
                <ClockIcon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  إعدادات المنطقة الزمنية
                </h3>
              </div>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المنطقة الزمنية للنظام
                </label>
                <select
                  id="system-timezone"
                  name="systemTimezone"
                  aria-label="المنطقة الزمنية للنظام"
                  value={settings.timezone || "UTC"}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="Africa/Cairo">القاهرة (EET - UTC+2/3)</option>
                  <option value="Asia/Riyadh">الرياض (AST - UTC+3)</option>
                  <option value="Asia/Dubai">دبي (GST - UTC+4)</option>
                  <option value="Europe/London">لندن (GMT - UTC+0/1)</option>
                  <option value="America/New_York">
                    نيويورك (EST - UTC-5/4)
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  تستخدم هذه المنطقة الزمنية في حسابات الـ "Dashboard" والتقارير
                  اليومية لضمان دقة البيانات حسب توقيت شركتك.
                </p>
              </div>
            </div>

            {/* Task Statuses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  حالات المهام (Statuses)
                </h3>
                <button
                  onClick={addStatus}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" /> إضافة حالة
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="text-gray-500 bg-gray-50 dark:bg-gray-700/50 uppercase">
                    <tr>
                      <th className="px-4 py-3">الكود (Value)</th>
                      <th className="px-4 py-3">الاسم الظاهر (Label)</th>
                      <th className="px-4 py-3">اللون</th>
                      <th className="px-4 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {settings.taskStatuses.map((status, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            id={`status-value-${idx}`}
                            name={`statusValue-${idx}`}
                            aria-label={`كود الحالة ${idx + 1}`}
                            value={status.value}
                            onChange={(e) =>
                              updateStatus(idx, "value", e.target.value)
                            }
                            className="w-full bg-transparent border-none focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            id={`status-label-${idx}`}
                            name={`statusLabel-${idx}`}
                            aria-label={`اسم الحالة ${idx + 1}`}
                            value={status.label}
                            onChange={(e) =>
                              updateStatus(idx, "label", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-4 py-2 flex items-center gap-2">
                          <input
                            id={`status-color-${idx}`}
                            name={`statusColor-${idx}`}
                            aria-label={`لون الحالة ${idx + 1}`}
                            type="color"
                            value={getSafeHexColor(status.color)}
                            onChange={(e) =>
                              updateStatus(idx, "color", e.target.value)
                            }
                            className="h-8 w-8 rounded cursor-pointer"
                          />
                          <span className="text-xs text-gray-400">
                            {getSafeHexColor(status.color)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeStatus(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              صلاحيات الأدوار
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              حدد ما يمكن لكل دور القيام به في نظام المهام.
            </p>

            <div className="space-y-6">
              {(() => {
                // Get roles from settings permissions (the source of truth)
                const rolesFromSettings = settings?.permissions
                  ? Object.keys(settings.permissions)
                  : [];
                // Also include any roles from current team members that aren't in settings
                const teamRoles = teamMembers
                  .map((m) => m.role)
                  .filter(Boolean);

                // 🔐 SECURITY: Filter out tenant roles (OWNER, AGENT, COMPANY_ADMIN)
                // These roles belong to companies, not the system administration/dev team.
                const tenantRoles = [
                  "OWNER",
                  "AGENT",
                  "Agent",
                  "COMPANY_ADMIN",
                ];

                const allRoles = Array.from(
                  new Set([...rolesFromSettings, ...teamRoles]),
                )
                  .filter((role) => !tenantRoles.includes(role))
                  .sort();

                return allRoles.map((role) => {
                  const perm = settings.permissions[role] || {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canChangeStatus: false,
                    canComment: true,
                    canAssign: false,
                    canArchive: false,
                    canViewReports: false,
                    canManageProjects: false,
                    canExport: false,
                    canAccessSettings: false,
                    canManageTaskSettings: false,
                    canViewAll: false, // 🔐 NEW
                    viewScope: "assigned_only",
                  };

                  return (
                    <div
                      key={role}
                      className="border rounded-lg p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                    >
                      <h4 className="font-bold text-indigo-600 mb-3 capitalize text-lg">
                        {role}
                      </h4>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Task Actions */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            صلاحيات المهام
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: "canCreate", label: "إنشاء مهام" },
                              { key: "canEdit", label: "تعديل مهام" },
                              { key: "canDelete", label: "حذف مهام" },
                              { key: "canChangeStatus", label: "تغيير الحالة" },
                              { key: "canComment", label: "إضافة تعليق" },
                              { key: "canAssign", label: "تعيين مسؤولين" },
                              { key: "canArchive", label: "أرشفة المهام" },
                            ].map(({ key, label }) => (
                              <label
                                key={key}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={(perm as any)[key]}
                                  onChange={(e) => {
                                    const newPerms = {
                                      ...settings.permissions,
                                    };
                                    newPerms[role] = {
                                      ...perm,
                                      [key]: e.target.checked,
                                    };
                                    setSettings({
                                      ...settings,
                                      permissions: newPerms,
                                    });
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Project & Reports */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            المشاريع والتقارير
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: "canViewReports", label: "عرض التقارير" },
                              {
                                key: "canManageProjects",
                                label: "إدارة المشاريع",
                              },
                              { key: "canExport", label: "تصدير البيانات" },
                            ].map(({ key, label }) => (
                              <label
                                key={key}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={(perm as any)[key]}
                                  onChange={(e) => {
                                    const newPerms = {
                                      ...settings.permissions,
                                    };
                                    newPerms[role] = {
                                      ...perm,
                                      [key]: e.target.checked,
                                    };
                                    setSettings({
                                      ...settings,
                                      permissions: newPerms,
                                    });
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Settings Access */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            الوصول للإعدادات والمستخدمين
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                key: "canAccessSettings",
                                label: "الوصول للإعدادات",
                              },
                              {
                                key: "canManageTaskSettings",
                                label: "إدارة إعدادات المهام",
                              },
                              {
                                key: "canViewAll",
                                label: "عرض جميع المستخدمين",
                              },
                            ].map(({ key, label }) => (
                              <label
                                key={key}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={(perm as any)[key]}
                                  onChange={(e) => {
                                    const newPerms = {
                                      ...settings.permissions,
                                    };
                                    newPerms[role] = {
                                      ...perm,
                                      [key]: e.target.checked,
                                    };
                                    setSettings({
                                      ...settings,
                                      permissions: newPerms,
                                    });
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Scope */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            نطاق الرؤية
                          </p>
                          <select
                            id={`permission-view-scope-${role}`}
                            name={`permissionViewScope-${role}`}
                            aria-label={`نطاق الرؤية للدور ${role}`}
                            value={perm.viewScope}
                            onChange={(e) => {
                              const newPerms = { ...settings.permissions };
                              newPerms[role] = {
                                ...perm,
                                viewScope: e.target.value as any,
                              };
                              setSettings({
                                ...settings,
                                permissions: newPerms,
                              });
                            }}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="all">
                              الكل (جميع المشاريع والمهام)
                            </option>
                            <option value="project">نفس المشروع فقط</option>
                            <option value="assigned_only">
                              مهامي فقط (المسندة لي)
                            </option>
                          </select>
                          <p className="text-xs text-gray-400 mt-2">
                            يحدد هذا الخيار المهام التي يمكن للمستخدم رؤيتها في
                            القائمة.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {activeTab === "automation" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              أقسام العمل والمسؤولين
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              قم بتعريف الأقسام (مثل: Frontend, Mobile) وتعيين مسؤول لكل قسم.{" "}
              <br /> عند اختيار القسم في المهمة، سيتم تعيين المسؤول تلقائياً.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                id="new-component-name"
                name="newComponentName"
                aria-label="اسم القسم الجديد"
                ref={newComponentNameRef}
                placeholder="اسم القسم (مثال: Mobile App)"
                className="border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex gap-2">
                <select
                  id="new-component-owner"
                  name="newComponentOwner"
                  aria-label="المسؤول عن القسم الجديد"
                  ref={newComponentOwnerRef}
                  className="border rounded px-3 py-2 flex-1 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">اختر المسؤول...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const nameEl = newComponentNameRef.current;
                    const ownerEl = newComponentOwnerRef.current;
                    if (nameEl?.value && ownerEl?.value) {
                      setSettings({
                        ...settings,
                        componentMappings: {
                          ...settings.componentMappings,
                          [nameEl.value]: ownerEl.value,
                        },
                      });
                      nameEl.value = "";
                      ownerEl.value = "";
                    }
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  إضافة
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {Object.entries(settings.componentMappings).map(
                ([comp, memberId]) => {
                  const member = teamMembers.find((m) => m.id === memberId);
                  return (
                    <li
                      key={comp}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-100 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {comp}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                          {member ? member.name : "Unknown Member"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const newMap = { ...settings.componentMappings };
                          delete newMap[comp];
                          setSettings({
                            ...settings,
                            componentMappings: newMap,
                          });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          </div>
        )}
        {/* Auto-Creation Setting */}
        {activeTab === "automation" && (
          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              التشغيل الآلي للمهام
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.autoTestingSubtask || false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoTestingSubtask: e.target.checked,
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                  <span className="block font-medium text-gray-900 dark:text-gray-100">
                    إنشاء مهمة اختبار تلقائياً عند الاكتمال
                  </span>
                  <span className="block text-sm text-gray-500 mt-1">
                    عند تحويل حالة أي مهمة إلى "DONE" (مكتمل)، سيقوم النظام
                    تلقائياً بإنشاء مهمة فرعية جديدة من نوع "TESTING" للمراجعة.
                  </span>
                </div>
              </label>

              {/* Assignee Selector */}
              {settings.autoTestingSubtask && (
                <div className="mt-4 mr-14">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تعيين تلقائي إلى:
                  </label>
                  <select
                    id="auto-testing-assignee"
                    name="autoTestingAssignee"
                    aria-label="تعيين مهمة الاختبار التلقائي"
                    value={settings.autoTestingAssigneeId || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoTestingAssigneeId: e.target.value || null,
                      })
                    }
                    className="border rounded px-3 py-2 text-sm w-full max-w-sm dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">(بدون تعيين محدد)</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    سيتم إسناد المهمة الفرعية لهذا الشخص تلقائياً.
                  </p>
                </div>
              )}
            </div>

            {/* Overdue Escalation Rules */}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  تصعيد المهام المتأخرة (Escalation Rules)
                </h3>
                <a
                  href="/super-admin/dev/escalations"
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
                >
                  <ClockIcon className="h-4 w-4" /> سجل التصعيدات
                </a>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                حدد قواعد لنقل المهام تلقائياً إلى موظف آخر في حال تأخر إنجازها.
              </p>

              {/* Add Rule Form */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-600 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  إضافة قاعدة جديدة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  <div className="lg:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">
                      تأخير لمدة
                    </label>
                    <div className="flex">
                      <input
                        id="escalation-threshold"
                        name="escalationThreshold"
                        aria-label="مدة التأخير قبل التصعيد"
                        ref={ruleThresholdRef}
                        type="number"
                        min="1"
                        defaultValue="24"
                        className="w-full rounded-r border-l-0 border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-2 py-2 text-sm"
                      />
                      <select
                        id="escalation-unit"
                        name="escalationUnit"
                        aria-label="وحدة مدة التأخير"
                        ref={ruleUnitRef}
                        className="rounded-l border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-2 py-2 text-sm bg-gray-100 dark:bg-gray-800"
                      >
                        <option value="hours">ساعة</option>
                        <option value="days">يوم</option>
                      </select>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">
                      النطاق (لمن؟)
                    </label>
                    <select
                      id="escalation-scope"
                      name="escalationScope"
                      aria-label="نطاق التصعيد"
                      ref={ruleScopeRef}
                      className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-2 py-2 text-sm"
                    >
                      <option value="all">جميع الموظفين</option>
                      {teamMembers.map((m) => (
                        <option key={`scope-${m.id}`} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">
                      الإجراء
                    </label>
                    <input
                      value="نقل المهمة إلى"
                      disabled
                      className="w-full rounded border-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-2 text-sm text-gray-500"
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">
                      الهدف (إلى من؟)
                    </label>
                    <select
                      id="escalation-target"
                      name="escalationTarget"
                      aria-label="المسؤول المستهدف للتصعيد"
                      ref={ruleTargetRef}
                      className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-2 py-2 text-sm"
                    >
                      <option value="">اختر المسؤول...</option>
                      {teamMembers.map((m) => (
                        <option key={`target-${m.id}`} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                    <button
                      onClick={() => {
                        const threshold =
                          parseInt(ruleThresholdRef.current?.value || "0") || 0;
                        const unit = (ruleUnitRef.current?.value || "hours") as
                          | "hours"
                          | "days";
                        const scope = ruleScopeRef.current?.value || "all";
                        const targetId = ruleTargetRef.current?.value || "";

                        if (threshold > 0 && targetId) {
                          const newRule: AutomationRule = {
                            threshold,
                            unit,
                            scope,
                            action: "assign",
                            targetId,
                          };
                          const currentRules =
                            settings.automationSettings?.rules || [];
                          setSettings({
                            ...settings,
                            automationSettings: {
                              ...settings.automationSettings,
                              rules: [...currentRules, newRule],
                            },
                          });
                        } else {
                          alert(i18n.t("DevTaskSettings.msg_fdf4"));
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-2 text-sm flex items-center justify-center gap-1"
                    >
                      <PlusIcon className="h-4 w-4" /> إضافة
                    </button>
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {(settings.automationSettings?.rules || []).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">
                    لا توجد قواعد تصعيد معرفة حالياً
                  </p>
                ) : (
                  settings.automationSettings?.rules.map((rule, idx) => {
                    const scopeName =
                      rule.scope === "all"
                        ? "جميع الموظفين"
                        : teamMembers.find((m) => m.id === rule.scope)?.name ||
                          "Unknown";
                    const targetName =
                      teamMembers.find((m) => m.id === rule.targetId)?.name ||
                      "Unknown";

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-full">
                            <BoltIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              عند التأخر لمدة{" "}
                              <span className="text-indigo-600">
                                {rule.threshold}{" "}
                                {rule.unit === "hours" ? "ساعات" : "أيام"}
                              </span>
                            </p>
                            <p className="text-sm text-gray-500">
                              لـ: {scopeName} ➞ تصعيد إلى:{" "}
                              <span className="text-green-600 font-medium">
                                {targetName}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newRules =
                              settings.automationSettings!.rules.filter(
                                (_, i) => i !== idx,
                              );
                            setSettings({
                              ...settings,
                              automationSettings: {
                                ...settings.automationSettings!,
                                rules: newRules,
                              },
                            });
                          }}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                إعدادات لوحة الأبطال
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                حدد نقاط الخبرة (XP) التي يحصل عليها المطور عند إكمال كل نوع من
                المهام.
              </p>
            </div>

            {/* Base XP */}
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                النقاط الأساسية (Base XP)
              </label>
              <input
                type="number"
                min="0"
                value={settings.leaderboardSettings?.baseXP || 10}
                onChange={(e) => {
                  const newSettings = {
                    ...settings,
                    leaderboardSettings: {
                      ...settings.leaderboardSettings!,
                      baseXP: parseInt(e.target.value) || 0,
                    },
                  };
                  setSettings(newSettings);
                }}
                className="w-32 border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <p className="text-xs text-gray-400 mt-2">
                النقاط الأساسية التي تُضاف لأي مهمة مكتملة
              </p>
            </div>

            {/* Task Type Scores */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                نقاط حسب نوع المهمة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    key: "BUG",
                    label: "🐛 إصلاح خطأ (Bug)",
                    description: "إصلاح مشكلة في الكود",
                  },
                  {
                    key: "FEATURE",
                    label: "✨ ميزة جديدة (Feature)",
                    description: "إضافة وظيفة جديدة",
                  },
                  {
                    key: "ENHANCEMENT",
                    label: "⚡ تحسين (Enhancement)",
                    description: "تحسين ميزة موجودة",
                  },
                  {
                    key: "HOTFIX",
                    label: "🔥 إصلاح عاجل (Hotfix)",
                    description: "إصلاح مشكلة حرجة",
                  },
                  {
                    key: "REFACTOR",
                    label: "🔧 إعادة هيكلة (Refactor)",
                    description: "تحسين بنية الكود",
                  },
                  {
                    key: "SECURITY",
                    label: "🔒 أمان (Security)",
                    description: "تحسينات أمنية",
                  },
                  {
                    key: "DOCUMENTATION",
                    label: "📝 توثيق (Documentation)",
                    description: "كتابة أو تحديث الوثائق",
                  },
                  {
                    key: "TESTING",
                    label: "🧪 اختبار (Testing)",
                    description: "كتابة أو تحديث الاختبارات",
                  },
                  {
                    key: "PERFORMANCE",
                    label: "⚡ أداء (Performance)",
                    description: "تحسين الأداء",
                  },
                  {
                    key: "MAINTENANCE",
                    label: "🛠️ صيانة (Maintenance)",
                    description: "صيانة دورية",
                  },
                ].map(({ key, label, description }) => (
                  <div
                    key={key}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {label}
                    </label>
                    <p className="text-xs text-gray-400 mb-2">{description}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={
                          settings.leaderboardSettings?.taskTypeScores?.[key] ||
                          0
                        }
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            leaderboardSettings: {
                              baseXP:
                                settings.leaderboardSettings?.baseXP || 10,
                              taskTypeScores: {
                                ...(settings.leaderboardSettings
                                  ?.taskTypeScores || {}),
                                [key]: parseInt(e.target.value) || 0,
                              },
                              priorityScores:
                                settings.leaderboardSettings?.priorityScores ||
                                {},
                              timeBasedScoring:
                                settings.leaderboardSettings?.timeBasedScoring,
                            },
                          };
                          setSettings(newSettings);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-500">نقطة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Scores */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                نقاط إضافية حسب الأولوية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    key: "CRITICAL",
                    label: "🔴 حرجة (Critical)",
                    color: "bg-red-100 dark:bg-red-900/30",
                  },
                  {
                    key: "URGENT",
                    label: "🟠 عاجلة (Urgent)",
                    color: "bg-orange-100 dark:bg-orange-900/30",
                  },
                  {
                    key: "HIGH",
                    label: "🟡 عالية (High)",
                    color: "bg-yellow-100 dark:bg-yellow-900/30",
                  },
                  {
                    key: "MEDIUM",
                    label: "🔵 متوسطة (Medium)",
                    color: "bg-blue-100 dark:bg-blue-900/30",
                  },
                  {
                    key: "LOW",
                    label: "⚪ منخفضة (Low)",
                    color: "bg-gray-100 dark:bg-gray-700/30",
                  },
                ].map(({ key, label, color }) => (
                  <div
                    key={key}
                    className={`${color} p-4 rounded-lg border border-gray-200 dark:border-gray-600`}
                  >
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={
                          settings.leaderboardSettings?.priorityScores?.[key] ||
                          0
                        }
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            leaderboardSettings: {
                              baseXP:
                                settings.leaderboardSettings?.baseXP || 10,
                              taskTypeScores:
                                settings.leaderboardSettings?.taskTypeScores ||
                                {},
                              priorityScores: {
                                ...(settings.leaderboardSettings
                                  ?.priorityScores || {}),
                                [key]: parseInt(e.target.value) || 0,
                              },
                              timeBasedScoring:
                                settings.leaderboardSettings?.timeBasedScoring,
                            },
                          };
                          setSettings(newSettings);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-500">نقطة إضافية</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                💡 مثال على الحساب:
              </h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                مهمة من نوع <strong>FEATURE</strong> بأولوية{" "}
                <strong>HIGH</strong> ={" "}
                <strong>{settings.leaderboardSettings?.baseXP || 10}</strong>{" "}
                (أساسي) +{" "}
                <strong>
                  {settings.leaderboardSettings?.taskTypeScores?.["FEATURE"] ||
                    0}
                </strong>{" "}
                (نوع المهمة) +{" "}
                <strong>
                  {settings.leaderboardSettings?.priorityScores?.["HIGH"] || 0}
                </strong>{" "}
                (الأولوية) ={" "}
                <strong className="text-lg">
                  {(settings.leaderboardSettings?.baseXP || 10) +
                    (settings.leaderboardSettings?.taskTypeScores?.[
                      "FEATURE"
                    ] || 0) +
                    (settings.leaderboardSettings?.priorityScores?.["HIGH"] ||
                      0)}
                </strong>{" "}
                نقطة
              </p>
            </div>

            {/* Time-Based Scoring */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                    ⏱️ حساب النقاط بناءً على الوقت
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    مكافأة للإنجاز المبكر وخصم للتأخير
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={
                      settings.leaderboardSettings?.timeBasedScoring?.enabled ||
                      false
                    }
                    onChange={(e) => {
                      const newSettings = {
                        ...settings,
                        leaderboardSettings: {
                          ...settings.leaderboardSettings!,
                          timeBasedScoring: {
                            ...(settings.leaderboardSettings
                              ?.timeBasedScoring || {
                              earlyCompletionBonus: 20,
                              onTimeBonus: 10,
                              lateCompletionPenalty: 15,
                              maxBonusPercent: 50,
                              maxPenaltyPercent: 30,
                            }),
                            enabled: e.target.checked,
                          },
                        },
                      };
                      setSettings(newSettings);
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {settings.leaderboardSettings?.timeBasedScoring?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Early Completion Bonus */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      🎉 مكافأة الإنجاز المبكر
                    </label>
                    <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                      عند إكمال المهمة في 90% أو أقل من الوقت المقدر
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          settings.leaderboardSettings?.timeBasedScoring
                            ?.earlyCompletionBonus || 20
                        }
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            leaderboardSettings: {
                              ...settings.leaderboardSettings!,
                              timeBasedScoring: {
                                ...settings.leaderboardSettings!
                                  .timeBasedScoring!,
                                earlyCompletionBonus:
                                  parseInt(e.target.value) || 0,
                              },
                            },
                          };
                          setSettings(newSettings);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        % مكافأة
                      </span>
                    </div>
                  </div>

                  {/* On Time Bonus */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      ✅ مكافأة الالتزام بالموعد
                    </label>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                      عند إكمال المهمة في حدود ±10% من الوقت المقدر
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          settings.leaderboardSettings?.timeBasedScoring
                            ?.onTimeBonus || 10
                        }
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            leaderboardSettings: {
                              ...settings.leaderboardSettings!,
                              timeBasedScoring: {
                                ...settings.leaderboardSettings!
                                  .timeBasedScoring!,
                                onTimeBonus: parseInt(e.target.value) || 0,
                              },
                            },
                          };
                          setSettings(newSettings);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        % مكافأة
                      </span>
                    </div>
                  </div>

                  {/* Late Completion Penalty */}
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                      ⚠️ خصم التأخير
                    </label>
                    <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                      عند إكمال المهمة بعد الوقت المقدر بأكثر من 10%
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          settings.leaderboardSettings?.timeBasedScoring
                            ?.lateCompletionPenalty || 15
                        }
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            leaderboardSettings: {
                              ...settings.leaderboardSettings!,
                              timeBasedScoring: {
                                ...settings.leaderboardSettings!
                                  .timeBasedScoring!,
                                lateCompletionPenalty:
                                  parseInt(e.target.value) || 0,
                              },
                            },
                          };
                          setSettings(newSettings);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        % خصم
                      </span>
                    </div>
                  </div>

                  {/* Max Bonus */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <label className="block text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                      🎯 الحد الأقصى للمكافأة/الخصم
                    </label>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                          أقصى مكافأة:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              settings.leaderboardSettings?.timeBasedScoring
                                ?.maxBonusPercent || 50
                            }
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                leaderboardSettings: {
                                  ...settings.leaderboardSettings!,
                                  timeBasedScoring: {
                                    ...settings.leaderboardSettings!
                                      .timeBasedScoring!,
                                    maxBonusPercent:
                                      parseInt(e.target.value) || 0,
                                  },
                                },
                              };
                              setSettings(newSettings);
                            }}
                            className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-purple-700 dark:text-purple-300">
                            %
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                          أقصى خصم:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              settings.leaderboardSettings?.timeBasedScoring
                                ?.maxPenaltyPercent || 30
                            }
                            onChange={(e) => {
                              const newSettings = {
                                ...settings,
                                leaderboardSettings: {
                                  ...settings.leaderboardSettings!,
                                  timeBasedScoring: {
                                    ...settings.leaderboardSettings!
                                      .timeBasedScoring!,
                                    maxPenaltyPercent:
                                      parseInt(e.target.value) || 0,
                                  },
                                },
                              };
                              setSettings(newSettings);
                            }}
                            className="w-20 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-purple-700 dark:text-purple-300">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>ملاحظة:</strong> بعد تغيير هذه الإعدادات، يمكنك إعادة
                حساب النقاط لجميع المهام المكتملة سابقاً باستخدام سكريبت{" "}
                <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
                  npm run fix:xp
                </code>
              </p>
            </div>
          </div>
        )}
        {activeTab === "visibility" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                إعدادات رؤية تفاصيل المهمة
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                تحكم في العناصر التي تظهر في صفحة تفاصيل المهمة للمطورين.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: "showDescription",
                  label: "إظهار الوصف",
                  icon: Cog6ToothIcon,
                },
                {
                  key: "showRelatedLinks",
                  label: "إظهار الروابط المتعلقة",
                  icon: SwatchIcon,
                },
                {
                  key: "showChecklists",
                  label: "إظهار قوائم التحقق",
                  icon: CheckCircleIcon,
                },
                {
                  key: "showBusinessValue",
                  label: "إظهار قيمة العمل",
                  icon: TrophyIcon,
                },
                {
                  key: "showAcceptanceCriteria",
                  label: "إظهار معايير القبول",
                  icon: ShieldCheckIcon,
                },
                {
                  key: "showAttachments",
                  label: "إظهار المرفقات (الصور)",
                  icon: BoltIcon,
                },
                {
                  key: "showCreatedAt",
                  label: "إظهار تاريخ الإنشاء",
                  icon: Cog6ToothIcon,
                },
              ].map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-600 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <Icon className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <span className="block font-medium text-gray-900 dark:text-gray-100">
                        {label}
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={
                        settings.taskDetailsVisibility?.[
                          key as keyof TaskDetailsVisibility
                        ] ?? true
                      }
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          taskDetailsVisibility: {
                            ...(settings.taskDetailsVisibility || {
                              showDescription: true,
                              showRelatedLinks: true,
                              showChecklists: true,
                              showBusinessValue: true,
                              showAcceptanceCriteria: true,
                              showAttachments: true,
                              showCreatedAt: true,
                            }),
                            [key]: e.target.checked,
                          },
                        });
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevTaskSettings;
