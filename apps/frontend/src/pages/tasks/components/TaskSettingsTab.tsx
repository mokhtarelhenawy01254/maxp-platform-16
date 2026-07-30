import { RefreshCw as ArrowPathIcon, Bell as BellIcon, Check as CheckCircleIcon } from 'lucide-react';
import React, { useEffect, useState } from "react";
;

import { Button } from "../../../components/ui/button";
import type { TaskScopeFilter, TaskSortBy } from "../types";
import { isTaskManagerRole } from "../taskWorkspaceSettings";
import type { TaskWorkspaceSettings } from "../taskWorkspaceSettings";

type TaskSettingsTabProps = {
  role?: string | null;
  settings: TaskWorkspaceSettings;
  onSave: (settings: TaskWorkspaceSettings) => void;
  onReset: () => void;
};

type SettingToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

const scopeOptions: Array<{ label: string; value: TaskScopeFilter }> = [
  { label: "كل المهام", value: "all" },
  { label: "مهامي", value: "my-tasks" },
  { label: "أنشأتها أنا", value: "assigned-by-me" },
];

const sortOptions: Array<{ label: string; value: TaskSortBy }> = [
  { label: "الأحدث", value: "createdAt" },
  { label: "الاستحقاق", value: "dueDate" },
  { label: "الأولوية", value: "priority" },
  { label: "الحالة", value: "status" },
  { label: "العنوان", value: "title" },
];

const densityOptions: Array<{
  label: string;
  description: string;
  value: TaskWorkspaceSettings["density"];
}> = [
  {
    label: "مضغوط",
    description: "أقل ارتفاعًا مع الحفاظ على وضوح النص.",
    value: "compact",
  },
  {
    label: "مريح",
    description: "مساحة أكبر حول العناصر للقراءة الممتدة.",
    value: "comfortable",
  },
];

const SettingToggle: React.FC<SettingToggleProps> = ({
  checked,
  label,
  onChange,
}) => (
  <label className="flex items-center gap-3 rounded-[20px] border border-border/65 bg-background/85 px-4 py-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 size-4 rounded border-border text-primary focus:ring-primary"
      aria-label={label}
    />
    <span className="text-sm font-medium text-foreground">{label}</span>
  </label>
);

export const TaskSettingsTab: React.FC<TaskSettingsTabProps> = ({
  role,
  settings,
  onSave,
  onReset,
}) => {
  const [draft, setDraft] = useState<TaskWorkspaceSettings>(settings);
  const isManager = isTaskManagerRole(role);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const changeDraft = <K extends keyof TaskWorkspaceSettings>(
    key: K,
    value: TaskWorkspaceSettings[K],
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border/70 bg-card/70 p-5 shadow-[0_28px_90px_-62px_rgba(15,27,45,0.32)]">
        <h2 className="text-lg font-semibold text-foreground">إعدادات المهام</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={onReset}
          >
            <ArrowPathIcon className="size-4" />
            افتراضي
          </Button>
          <Button
            type="button"
            className="rounded-2xl"
            onClick={() => onSave(draft)}
          >
            <CheckCircleIcon className="size-4" />
            حفظ
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-border/70 bg-card/65 p-5">
          <h3 className="text-base font-semibold text-foreground">عام</h3>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  كثافة العرض
                </p>
                <p className="text-xs text-muted-foreground">
                  اختر شكل الصفحة اليومي بين النسخة المضغوطة والنسخة الأكثر
                  راحة.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {densityOptions.map((option) => {
                  const isActive = draft.density === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => changeDraft("density", option.value)}
                      className={`rounded-[20px] border px-4 py-3 text-right transition ${
                        isActive
                          ? "border-primary/30 bg-primary/6 shadow-[0_18px_34px_-30px_rgba(47,107,255,0.45)]"
                          : "border-border/65 bg-background/85 hover:border-primary/20"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {option.label}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">
                  النطاق الافتراضي
                </span>
                <select
                  aria-label="النطاق الافتراضي"
                  value={draft.defaultScope}
                  onChange={(event) =>
                    changeDraft(
                      "defaultScope",
                      event.target.value as TaskWorkspaceSettings["defaultScope"],
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-border/65 bg-background px-3 text-sm outline-none ring-0 transition focus:border-primary/35"
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">
                  الترتيب الافتراضي
                </span>
                <select
                  aria-label="الترتيب الافتراضي"
                  value={draft.defaultSortBy}
                  onChange={(event) =>
                    changeDraft(
                      "defaultSortBy",
                      event.target.value as TaskWorkspaceSettings["defaultSortBy"],
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-border/65 bg-background px-3 text-sm outline-none ring-0 transition focus:border-primary/35"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">
                  اتجاه الترتيب
                </span>
                <select
                  aria-label="اتجاه الترتيب"
                  value={draft.defaultSortOrder}
                  onChange={(event) =>
                    changeDraft(
                      "defaultSortOrder",
                      event.target.value as TaskWorkspaceSettings["defaultSortOrder"],
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-border/65 bg-background px-3 text-sm outline-none ring-0 transition focus:border-primary/35"
                >
                  <option value="desc">تنازلي</option>
                  <option value="asc">تصاعدي</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">
                  عدد العناصر في الصفحة
                </span>
                <select
                  aria-label="عدد العناصر في الصفحة"
                  value={draft.pageSize}
                  onChange={(event) =>
                    changeDraft(
                      "pageSize",
                      Number(event.target.value) as TaskWorkspaceSettings["pageSize"],
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-border/65 bg-background px-3 text-sm outline-none ring-0 transition focus:border-primary/35"
                >
                  {[10, 25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-card/65 p-5">
          <h3 className="text-base font-semibold text-foreground">العرض</h3>
          <div className="mt-4 grid gap-3">
            <SettingToggle
              checked={draft.hideCompletedByDefault}
              onChange={(checked) =>
                changeDraft("hideCompletedByDefault", checked)
              }
              label="إخفاء المهام المكتملة افتراضيًا"
            />
            <SettingToggle
              checked={draft.showMobileCommandBar}
              onChange={(checked) =>
                changeDraft("showMobileCommandBar", checked)
              }
              label="إظهار شريط الأوامر في الجوال"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-card/65 p-5">
          <h3 className="text-base font-semibold text-foreground">إشعارات واتساب</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            تحكم في إشعارات المهام المرسلة عبر واتساب — شغّل أو أوقف كل حدث على حدة.
          </p>
          <a
            href="/whatsapp/notifications?tab=tasks"
            className="mt-3 inline-flex items-center rounded-2xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <BellIcon className="size-4 ml-2" />
            فتح إعدادات إشعارات واتساب
          </a>
        </div>

        {isManager ? (
          <div className="rounded-[28px] border border-border/70 bg-card/65 p-5 xl:col-span-2">
            <h3 className="text-base font-semibold text-foreground">المدير</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SettingToggle
                checked={draft.highlightOverdue}
                onChange={(checked) => changeDraft("highlightOverdue", checked)}
                label="إبراز المهام المتأخرة"
              />
              <SettingToggle
                checked={draft.showProjectShortcut}
                onChange={(checked) =>
                  changeDraft("showProjectShortcut", checked)
                }
                label="إظهار زر مشروع جديد"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
