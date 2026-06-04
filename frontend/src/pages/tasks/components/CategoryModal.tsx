import React from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { CategoryDraft } from "../types";
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

export interface CategoryModalProps {
  show: boolean;
  onClose: () => void;
  newCategory: CategoryDraft;
  setNewCategory: (category: CategoryDraft) => void;
  createCategory: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  show,
  onClose,
  newCategory,
  setNewCategory,
  createCategory,
}) => {
  if (!show) return null;

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title="قسم جديد"
      description="أنشئ قسمًا بسيطًا وواضحًا حتى يساعدك في الفرز والتقارير بدل أن يزيد التشتيت."
      size="sm"
      badge={
        <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Categories
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            اجعل اسم القسم مباشرًا مثل: محتوى، تشغيل، دعم، مبيعات.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={createCategory}
            >
              إنشاء القسم
            </Button>
          </div>
        </div>
      }
    >
      <TaskModalSection className="space-y-4">
        <TaskModalField label="اسم القسم" required>
          <Input
            type="text"
            value={newCategory.name}
            onChange={(event) =>
              setNewCategory({ ...newCategory, name: event.target.value })
            }
            className={taskModalControlClassName}
            placeholder="مثال: تشغيل، محتوى، تطوير"
          />
        </TaskModalField>

        <TaskModalField label="الوصف">
          <Textarea
            value={newCategory.description}
            onChange={(event) =>
              setNewCategory({
                ...newCategory,
                description: event.target.value,
              })
            }
            className={`${taskModalTextareaClassName} min-h-[96px]`}
            placeholder="وصف مختصر يوضح متى تستخدم هذا القسم."
          />
        </TaskModalField>

        <TaskModalField
          label="اللون"
          hint="اختر لونًا يسهل تمييزه داخل القوائم بدون أن يطغى على الصفحة."
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCategory.color}
                onChange={(event) =>
                  setNewCategory({ ...newCategory, color: event.target.value })
                }
                className="h-12 w-12 cursor-pointer rounded-2xl border border-border/60 bg-transparent p-1"
              />
              <div className="rounded-[18px] border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground">
                {newCategory.color}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {taskCategoryColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategory({ ...newCategory, color })}
                  className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                    newCategory.color === color
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
