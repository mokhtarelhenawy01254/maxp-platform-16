import React from "react";

import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { Label } from "../../../components/ui/label";
import type {
  Project,
  TaskCategory,
  TaskFiltersState,
  TaskUser,
} from "../types";

export interface FilterSidebarProps {
  show: boolean;
  onClose: () => void;
  filters: TaskFiltersState;
  setFilters: (filters: TaskFiltersState) => void;
  projects: Project[];
  categories: TaskCategory[];
  users: TaskUser[];
}

const emptyFilters = {
  projectId: "",
  categoryId: "",
  status: "",
  priority: "",
  assignedTo: "",
  dueDateFrom: "",
  dueDateTo: "",
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  show,
  onClose,
  filters,
  setFilters,
  projects,
  categories,
  users,
}) => {
  return (
    <Sheet
      open={show}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-[2rem] px-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-0 md:left-0 md:right-auto md:top-0 md:bottom-0 md:h-screen md:w-[28rem] md:max-h-none md:max-w-[28rem] md:rounded-none md:rounded-r-[2rem] md:border-r md:border-t-0"
      >
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted md:hidden" />

        <SheetHeader className="gap-1 px-5 pb-3 pt-4 text-right">
          <SheetTitle className="text-right">فلترة المهام</SheetTitle>
          <SheetDescription className="text-right">
            اختر المشروع أو القسم أو الحالة أو المسؤول لتضييق النتيجة.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5">
          <div className="space-y-2">
            <Label htmlFor="tasks-filter-project">المشروع</Label>
            <select
              id="tasks-filter-project"
              value={filters.projectId}
              onChange={(event) =>
                setFilters({ ...filters, projectId: event.target.value })
              }
              className="business-control-input theme-native-control w-full"
            >
              <option value="">جميع المشاريع</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasks-filter-category">القسم</Label>
            <select
              id="tasks-filter-category"
              value={filters.categoryId}
              onChange={(event) =>
                setFilters({ ...filters, categoryId: event.target.value })
              }
              className="business-control-input theme-native-control w-full"
            >
              <option value="">جميع الأقسام</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasks-filter-status">الحالة</Label>
            <select
              id="tasks-filter-status"
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
              className="business-control-input theme-native-control w-full"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="in_review">بانتظار الاعتماد</option>
              <option value="on_hold">معلّقة</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasks-filter-priority">الأولوية</Label>
            <select
              id="tasks-filter-priority"
              value={filters.priority}
              onChange={(event) =>
                setFilters({ ...filters, priority: event.target.value })
              }
              className="business-control-input theme-native-control w-full"
            >
              <option value="">جميع الأولويات</option>
              <option value="urgent">عاجل</option>
              <option value="high">عالي</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasks-filter-assignee">المسؤول</Label>
            <select
              id="tasks-filter-assignee"
              value={filters.assignedTo}
              onChange={(event) =>
                setFilters({ ...filters, assignedTo: event.target.value })
              }
              className="business-control-input theme-native-control w-full"
            >
              <option value="">جميع المسؤولين</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || `${user.firstName} ${user.lastName}`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tasks-filter-date-from">من تاريخ</Label>
              <input
                id="tasks-filter-date-from"
                type="date"
                value={filters.dueDateFrom}
                onChange={(event) =>
                  setFilters({ ...filters, dueDateFrom: event.target.value })
                }
                className="business-control-input theme-native-control w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasks-filter-date-to">إلى تاريخ</Label>
              <input
                id="tasks-filter-date-to"
                type="date"
                value={filters.dueDateTo}
                onChange={(event) =>
                  setFilters({ ...filters, dueDateTo: event.target.value })
                }
                className="business-control-input theme-native-control w-full"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 grid grid-cols-2 gap-2 px-5 pb-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl"
            onClick={() => setFilters(emptyFilters)}
          >
            إعادة تعيين
          </Button>
          <Button type="button" className="h-11 rounded-2xl" onClick={onClose}>
            تطبيق الفلاتر
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
