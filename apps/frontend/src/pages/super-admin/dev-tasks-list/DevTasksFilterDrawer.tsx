import React from "react";
import i18n from "../../../i18n";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  TASK_TYPES,
  TASK_STATUSES,
  PRIORITY_CONFIG,
} from "../../../constants/taskConstants";
import {
  DevTasksFilters,
  ProjectOption,
  TeamMemberOption,
  ReleaseOption,
} from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface DevTasksFilterDrawerProps {
  show: boolean;
  onClose: () => void;
  pendingFilters: DevTasksFilters;
  onFilterChange: (key: string, value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onClearFilters: () => void;
  onApply: () => void;
  settings: any;
  projects: ProjectOption[];
  teamMembers: TeamMemberOption[];
  releases: ReleaseOption[];
}

export const DevTasksFilterDrawer: React.FC<DevTasksFilterDrawerProps> = ({
  show,
  onClose,
  pendingFilters,
  onFilterChange,
  onAddTag,
  onRemoveTag,
  onClearFilters,
  onApply,
  settings,
  projects,
  teamMembers,
  releases,
}) => {
  if (!show) return null;

  const statusOptions =
    settings?.taskStatuses ||
    Object.entries(TASK_STATUSES).map(([key, value]) => ({
      value: key,
      ...value,
    }));

  const priorityOptions =
    settings?.taskPriorities ||
    Object.entries(PRIORITY_CONFIG).map(([key, value]) => ({
      value: key,
      ...value,
    }));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir={i18n.dir()}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            فلاتر متقدمة
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الحالة
            </label>
            <select
              value={pendingFilters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">كل الحالات</option>
              {statusOptions.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الأولوية
            </label>
            <select
              value={pendingFilters.priority}
              onChange={(e) => onFilterChange("priority", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">كل الأولويات</option>
              {priorityOptions.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              النوع
            </label>
            <select
              value={pendingFilters.type}
              onChange={(e) => onFilterChange("type", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">كل الأنواع</option>
              {Object.entries(TASK_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              المشروع
            </label>
            <select
              value={pendingFilters.projectId}
              onChange={(e) => onFilterChange("projectId", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">كل المشاريع</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              المسؤول
            </label>
            <select
              value={pendingFilters.assigneeId}
              onChange={(e) => onFilterChange("assigneeId", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">الكل</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Release Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الإصدار
            </label>
            <select
              value={pendingFilters.releaseId}
              onChange={(e) => onFilterChange("releaseId", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">كل الإصدارات</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  v{release.version} - {release.name}
                </option>
              ))}
            </select>
          </div>

          {/* Component Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              المكون
            </label>
            <select
              value={pendingFilters.component}
              onChange={(e) => onFilterChange("component", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
            >
              <option value="">الكل</option>
              {[
                "Frontend",
                "Backend",
                "Database",
                "API",
                "Provider System",
                "WhatsApp",
                "Facebook",
                "Mobile App",
                "Design",
                "DevOps",
                "QA",
              ].map((comp) => (
                <option key={comp.toLowerCase()} value={comp.toLowerCase()}>
                  {comp}
                </option>
              ))}
              {settings?.components?.map((comp: string) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              التاريخ
            </label>
            <div className="mb-2">
              <select
                value={pendingFilters.dateType}
                onChange={(e) => onFilterChange("dateType", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs mb-2"
              >
                <option value="dueDate">تاريخ الاستحقاق</option>
                <option value="createdAt">تاريخ الإنشاء</option>
                <option value="updatedAt">تاريخ التحديث</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  من
                </label>
                <DateInput
                  value={pendingFilters.dueDateFrom}
                  onChange={(e) => onFilterChange("dueDateFrom", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  إلى
                </label>
                <DateInput
                  value={pendingFilters.dueDateTo}
                  onChange={(e) => onFilterChange("dueDateTo", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs"
                />
              </div>
            </div>
          </div>

          {/* Tags Filter (Pills UI) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الوسوم
            </label>
            <div className="border border-input rounded-lg p-2 bg-background focus-within:ring-2 focus-within:ring-primary">
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingFilters.tags &&
                  pendingFilters.tags.split(",").map(
                    (tag: string, idx: number) =>
                      tag.trim() && (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tag}
                          <button
                            onClick={() => onRemoveTag(tag)}
                            className="hover:text-primary/70"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ),
                  )}
              </div>
              <input
                type="text"
                placeholder="أضف وسماً واضغط Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="w-full bg-transparent border-none focus:ring-0 text-xs p-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              اضغط Enter لإضافة الوسم
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={() => {
                onClearFilters();
                onClose();
              }}
              className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted text-foreground text-xs font-medium"
            >
              مسح الكل
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium shadow-xs"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
