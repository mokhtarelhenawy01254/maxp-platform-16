import React from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { TaskCategory } from "../types";
import {
  TaskModalField,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import {
  taskCategoryColorOptions,
  taskModalControlClassName,
  taskModalTextareaClassName,
} from "./TaskModalTokens";

export interface EditCategoryModalProps {
  category: TaskCategory | null;
  setEditingCategory: (category: TaskCategory | null) => void;
  updateCategory: () => void;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  category,
  setEditingCategory,
  updateCategory,
}) => {
  if (!category) return null;

  return (
    <TaskModalShell
      open={Boolean(category)}
      onClose={() => setEditingCategory(null)}
      title="تعديل القسم"
      description="حدّث الاسم والوصف واللون حتى تبقى الأقسام سهلة الفرز وسريعة الفهم داخل الصفحة."
      size="sm"
      badge={
        <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Edit Category
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            أي تغيير هنا سينعكس مباشرة في البطاقات والفلاتر المرتبطة بالقسم.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditingCategory(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={updateCategory}
            >
              حفظ التغييرات
            </Button>
          </div>
        </div>
      }
    >
      <TaskModalSection className="space-y-4">
        <TaskModalField label="اسم القسم" required>
          <Input
            type="text"
            value={category.name}
            onChange={(event) =>
              setEditingCategory({
                ...category,
                name: event.target.value,
              })
            }
            className={taskModalControlClassName}
          />
        </TaskModalField>

        <TaskModalField label="الوصف">
          <Textarea
            value={category.description || ""}
            onChange={(event) =>
              setEditingCategory({
                ...category,
                description: event.target.value,
              })
            }
            className={`${taskModalTextareaClassName} min-h-[96px]`}
          />
        </TaskModalField>

        <TaskModalField label="اللون">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={category.color}
                onChange={(event) =>
                  setEditingCategory({
                    ...category,
                    color: event.target.value,
                  })
                }
                className="h-12 w-12 cursor-pointer rounded-2xl border border-border/60 bg-transparent p-1"
              />
              <div className="rounded-[18px] border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground">
                {category.color}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {taskCategoryColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditingCategory({ ...category, color })}
                  className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                    category.color === color
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </TaskModalField>
      </TaskModalSection>
    </TaskModalShell>
  );
};
