import React from "react";
import {
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { Button } from "../../../components/ui/button";
import type { TaskCategory } from "../types";

export interface CategoriesTabProps {
  categories: TaskCategory[];
  setShowCategoryModal: (show: boolean) => void;
  setEditingCategory: (category: TaskCategory) => void;
  deleteCategory: (categoryId: string) => void;
}

const summaryChipClassName =
  "rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground";

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  setShowCategoryModal,
  setEditingCategory,
  deleteCategory,
}) => {
  const categoriesWithTasks = categories.filter(
    (category) => (category.taskCount || 0) > 0,
  );
  const inactiveCategories = categories.filter(
    (category) => !category.isActive,
  );

  return (
    <section className="space-y-3 pb-24 md:pb-0">
      <div className="flex flex-col gap-2.5 rounded-[24px] border border-border/70 bg-card/62 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)] md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <span className={summaryChipClassName}>{categories.length} قسم</span>
          <span className={summaryChipClassName}>
            {categoriesWithTasks.length} مستخدم
          </span>
          {inactiveCategories.length > 0 ? (
            <span className={summaryChipClassName}>
              {inactiveCategories.length} غير نشط
            </span>
          ) : null}
        </div>

        {categories.length > 0 ? (
          <Button
            type="button"
            className="hidden h-10 rounded-2xl md:inline-flex"
            onClick={() => setShowCategoryModal(true)}
          >
            <PlusIcon className="size-4" />
            قسم جديد
          </Button>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-dashed border-border/70 bg-card/55 px-4 py-14 text-center">
          <FolderIcon className="size-12 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              لا توجد أقسام حتى الآن
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              أنشئ أقسامًا واضحة مثل التشغيل أو الدعم حتى يصبح الفرز أسرع وأوضح.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-2xl"
            onClick={() => setShowCategoryModal(true)}
          >
            <PlusIcon className="size-4" />
            إنشاء قسم
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <article
              key={category.id}
              className="rounded-[24px] border border-border/70 bg-card/65 p-4 shadow-[0_18px_52px_-42px_rgba(15,27,45,0.3)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1.5 size-4 shrink-0 rounded-full ring-4 ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: category.color || "#2f6bff" }}
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground md:text-lg">
                          {category.name}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            category.isActive
                              ? "border border-primary/20 bg-primary/8 text-primary"
                              : "border border-border/60 bg-background/75 text-muted-foreground"
                          }`}
                        >
                          {category.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-muted-foreground">
                        {category.description || "بدون وصف إضافي."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                      {category.taskCount || 0} مهمة
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                      اللون {category.color || "#2f6bff"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setEditingCategory(category)}
                  >
                    <PencilIcon className="size-4" />
                    تعديل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-rose-600 hover:text-rose-700"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <TrashIcon className="size-4" />
                    حذف
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {categories.length > 0 ? (
        <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
          <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  وصول سريع للأقسام
                </p>
                <p className="text-xs text-muted-foreground">
                  أضف قسمًا جديدًا عندما تحتاج فرزًا أوضح.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => setShowCategoryModal(true)}
              >
                إضافة
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
