import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Eye,
  GripVertical,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { companyAwareApi } from "../../../services/companyAwareApi";
import {
  buildMessagingPreset,
  CADENCE_OPTIONS,
  DATA_TYPE_OPTIONS,
  FIELD_SOURCE_OPTIONS,
  SYSTEM_FIELD_OPTIONS,
} from "./catalog";
import { slugifyFieldKey } from "./utils";
import { WorkReportField, WorkReportFieldDataType, WorkReportTemplateDraft } from "./types";

const buildBlankField = (index: number): WorkReportField => ({
  key: `field_${index + 1}`,
  label: "",
  helpText: "",
  sourceType: "MANUAL",
  dataType: "TEXT",
  isRequired: false,
  isVisible: true,
  placeholder: "",
  orderIndex: index,
  systemKey: null,
  formula: null,
  options: [],
});

const cloneDraft = (draft: WorkReportTemplateDraft) => ({
  ...draft,
  fields: draft.fields.map((field, index) => ({
    ...field,
    options: [...field.options],
    orderIndex: index,
  })),
});

const BuilderBadge: React.FC<{ label: string; tone?: string }> = ({
  label,
  tone = "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
}) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
    {label}
  </span>
);

const WorkReportFormBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(formId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<WorkReportTemplateDraft>({
    title: "",
    description: "",
    cadence: "DAILY",
    isActive: true,
    allowMultipleSubmissions: false,
    fields: [],
  });

  const applyDraft = (draft: WorkReportTemplateDraft) => {
    setFormState(cloneDraft(draft));
  };

  useEffect(() => {
    const loadExistingForm = async () => {
      if (!formId) return;

      try {
        setLoading(true);
        const response = await companyAwareApi.get<{ data: WorkReportTemplateDraft }>(
          `/hr/reporting/forms/${formId}`,
        );
        if (response.data?.data) {
          applyDraft(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching reporting form:", error);
        toast.error("تعذر تحميل الفورم");
      } finally {
        setLoading(false);
      }
    };

    loadExistingForm();
  }, [formId]);

  useEffect(() => {
    if (isEditing) return;

    const presetName = searchParams.get("preset");
    const storedPreset = sessionStorage.getItem("work-report-form-preset");

    if (storedPreset) {
      try {
        const parsed = JSON.parse(storedPreset) as WorkReportTemplateDraft;
        applyDraft(parsed);
        sessionStorage.removeItem("work-report-form-preset");
        return;
      } catch (error) {
        sessionStorage.removeItem("work-report-form-preset");
      }
    }

    if (presetName === "messaging") {
      applyDraft(buildMessagingPreset());
    }
  }, [isEditing, searchParams]);

  const visibleCounts = useMemo(() => {
    const sourceCount = {
      SYSTEM: 0,
      MANUAL: 0,
      CALCULATED: 0,
    };
    formState.fields.forEach((field) => {
      sourceCount[field.sourceType] += 1;
    });
    return sourceCount;
  }, [formState.fields]);

  const updateField = (index: number, updater: (field: WorkReportField) => WorkReportField) => {
    setFormState((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? updater(field) : field,
      ),
    }));
  };

  const addField = (sourceType: WorkReportField["sourceType"] = "MANUAL") => {
    setFormState((current) => {
      const nextIndex = current.fields.length;
      const candidate = buildBlankField(nextIndex);
      candidate.sourceType = sourceType;

      if (sourceType === "SYSTEM") {
        candidate.systemKey = SYSTEM_FIELD_OPTIONS[0]?.key || null;
        candidate.dataType = SYSTEM_FIELD_OPTIONS[0]?.dataType || "TEXT";
      }

      if (sourceType === "CALCULATED") {
        candidate.dataType = "NUMBER";
        candidate.formula = "";
      }

      return {
        ...current,
        fields: [...current.fields, candidate],
      };
    });
  };

  const duplicateField = (index: number) => {
    setFormState((current) => {
      const target = current.fields[index];
      if (!target) return current;

      const clone = {
        ...target,
        key: `${target.key}_copy`,
      };

      const fields = [...current.fields];
      fields.splice(index + 1, 0, clone);

      return {
        ...current,
        fields: fields.map((field, fieldIndex) => ({
          ...field,
          orderIndex: fieldIndex,
        })),
      };
    });
  };

  const removeField = (index: number) => {
    setFormState((current) => ({
      ...current,
      fields: current.fields
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({
          ...field,
          orderIndex: fieldIndex,
        })),
    }));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFormState((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.fields.length) return current;

      const fields = [...current.fields];
      const [target] = fields.splice(index, 1);
      fields.splice(nextIndex, 0, target);

      return {
        ...current,
        fields: fields.map((field, fieldIndex) => ({
          ...field,
          orderIndex: fieldIndex,
        })),
      };
    });
  };

  const normalizeForSubmit = (): WorkReportTemplateDraft => ({
    ...formState,
    title: formState.title.trim(),
    description: formState.description.trim(),
    fields: formState.fields.map((field, index) => ({
      ...field,
      label: field.label.trim(),
      key: slugifyFieldKey(field.key || field.label) || `field_${index + 1}`,
      helpText: field.helpText?.trim() || "",
      placeholder: field.placeholder?.trim() || "",
      formula: field.formula?.trim() || "",
      orderIndex: index,
      options: field.options.map((option) => option.trim()).filter(Boolean),
    })),
  });

  const handleSave = async () => {
    const payload = normalizeForSubmit();

    if (!payload.title) {
      toast.error("اكتب اسم الفورم أولًا");
      return;
    }

    if (!payload.fields.length) {
      toast.error("أضف حقلًا واحدًا على الأقل");
      return;
    }

    try {
      setSaving(true);
      if (isEditing && formId) {
        await companyAwareApi.put(`/hr/reporting/forms/${formId}`, payload);
        toast.success("تم تحديث الفورم");
      } else {
        const response = await companyAwareApi.post<{ data: { id: string } }>(
          "/hr/reporting/forms",
          payload,
        );
        toast.success("تم إنشاء الفورم");
        const createdId = response.data?.data?.id;
        if (createdId) {
          navigate(`/hr/reporting/forms/${createdId}/preview`);
          return;
        }
      }

      navigate("/hr/reporting/forms");
    } catch (error: any) {
      console.error("Error saving reporting form:", error);
      toast.error(
        error?.response?.data?.message || "تعذر حفظ الفورم، راجع الحقول مرة أخرى",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 px-4 py-10 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400"
        dir="rtl"
      >
        جاري تحميل إعدادات الفورم...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              to="/hr/reporting/forms"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة لفورمات التقارير
            </Link>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {isEditing ? "تعديل فورم" : "إنشاء فورم جديد"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {isEditing ? formState.title || "تعديل الفورم" : "بناء فورم التقرير"}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                حدّد بيانات تُسحب من النظام، وبيانات يكتبها الموظف، وأخرى تتحسب
                تلقائيًا. النتيجة النهائية ستظهر في شاشة التعبئة وسجلات التحليل.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => applyDraft(buildMessagingPreset())}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              <Sparkles className="h-4 w-4" />
              تحميل قالب فريق الرد
            </button>
            {isEditing && formId ? (
              <Link
                to={`/hr/reporting/forms/${formId}/preview`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ الفورم"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    اسم الفورم
                  </label>
                  <input
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                    placeholder="مثال: تقرير يومي - فريق خدمة العملاء"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    دورة التقرير
                  </label>
                  <select
                    value={formState.cadence}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        cadence: event.target.value as WorkReportTemplateDraft["cadence"],
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                  >
                    {CADENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  وصف مختصر
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                  placeholder="اشرح الغرض من التقرير ومن الذي سيستخدمه."
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  الفورم مفعل
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formState.allowMultipleSubmissions}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        allowMultipleSubmissions: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  السماح بأكثر من إرسال لنفس الفترة
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => addField("MANUAL")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
              >
                <Plus className="h-4 w-4" />
                إضافة حقل يدوي
              </button>
              <button
                type="button"
                onClick={() => addField("SYSTEM")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
              >
                <Plus className="h-4 w-4" />
                إضافة حقل من النظام
              </button>
              <button
                type="button"
                onClick={() => addField("CALCULATED")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
              >
                <Plus className="h-4 w-4" />
                إضافة حقل حسابي
              </button>
            </div>

            {formState.fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                أضف أول حقل لبدء بناء الفورم.
              </div>
            ) : (
              <div className="space-y-4">
                {formState.fields.map((field, index) => {
                  const systemOption = SYSTEM_FIELD_OPTIONS.find(
                    (option) => option.key === field.systemKey,
                  );

                  return (
                    <div
                      key={`${field.key}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium">
                                {field.label || `حقل ${index + 1}`}
                              </h3>
                              <BuilderBadge
                                label={
                                  FIELD_SOURCE_OPTIONS.find(
                                    (item) => item.value === field.sourceType,
                                  )?.label || field.sourceType
                                }
                              />
                              <BuilderBadge
                                label={
                                  DATA_TYPE_OPTIONS.find(
                                    (item) => item.value === field.dataType,
                                  )?.label || field.dataType
                                }
                              />
                              {!field.isVisible ? (
                                <BuilderBadge
                                  label="مخفي"
                                  tone="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                                />
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              المفتاح البرمجي: <span className="font-mono">{field.key || "—"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveField(index, -1)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            title="تحريك لأعلى"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(index, 1)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            title="تحريك لأسفل"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateField(index)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            title="نسخ الحقل"
                          >
                            <CopyPlus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="rounded-xl border border-rose-200 p-2 text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                            title="حذف الحقل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            اسم الحقل
                          </label>
                          <input
                            value={field.label}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                label: event.target.value,
                                key:
                                  !current.key || current.key.startsWith("field_")
                                    ? slugifyFieldKey(event.target.value) || current.key
                                    : current.key,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                            placeholder="مثال: عدد الرسائل"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            المفتاح البرمجي
                          </label>
                          <input
                            value={field.key}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                key: slugifyFieldKey(event.target.value),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                            placeholder="orders_count"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            نوع المصدر
                          </label>
                          <select
                            value={field.sourceType}
                            onChange={(event) =>
                              updateField(index, (current) => {
                                const nextSource = event.target.value as WorkReportField["sourceType"];
                                const nextState: WorkReportField = {
                                  ...current,
                                  sourceType: nextSource,
                                };

                                if (nextSource === "SYSTEM") {
                                  const defaultSystem = SYSTEM_FIELD_OPTIONS[0];
                                  nextState.systemKey = defaultSystem?.key || null;
                                  nextState.dataType = defaultSystem?.dataType || "TEXT";
                                  nextState.formula = null;
                                } else if (nextSource === "CALCULATED") {
                                  nextState.systemKey = null;
                                  nextState.formula = current.formula || "";
                                  nextState.dataType =
                                    current.dataType === "TEXT" || current.dataType === "LONG_TEXT"
                                      ? "NUMBER"
                                      : current.dataType;
                                } else {
                                  nextState.systemKey = null;
                                  nextState.formula = null;
                                }

                                return nextState;
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                          >
                            {FIELD_SOURCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            نوع البيانات
                          </label>
                          <select
                            value={field.dataType}
                            disabled={field.sourceType === "SYSTEM"}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                dataType: event.target.value as WorkReportFieldDataType,
                                options:
                                  event.target.value === "SELECT" ? current.options : [],
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                          >
                            {DATA_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            وصف أو ملاحظة مساعدة
                          </label>
                          <input
                            value={field.helpText || ""}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                helpText: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                            placeholder="نص مساعد يظهر للموظف أو المدير."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Placeholder
                          </label>
                          <input
                            value={field.placeholder || ""}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                placeholder: event.target.value,
                              }))
                            }
                            disabled={field.sourceType !== "MANUAL"}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                            placeholder="نص يظهر داخل الحقل للموظف."
                          />
                        </div>
                      </div>

                      {field.sourceType === "SYSTEM" ? (
                        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            مصدر البيانات من النظام
                          </label>
                          <select
                            value={field.systemKey || ""}
                            onChange={(event) =>
                              updateField(index, (current) => {
                                const option = SYSTEM_FIELD_OPTIONS.find(
                                  (item) => item.key === event.target.value,
                                );
                                return {
                                  ...current,
                                  systemKey: event.target.value,
                                  dataType: option?.dataType || current.dataType,
                                };
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            {SYSTEM_FIELD_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                            {systemOption?.description}
                          </p>
                        </div>
                      ) : null}

                      {field.sourceType === "CALCULATED" ? (
                        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            المعادلة الحسابية
                          </label>
                          <input
                            value={field.formula || ""}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                formula: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="(orders_count / replied_conversations_count) * 100"
                          />
                          <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                            استخدم مفاتيح الحقول بالأحرف الإنجليزية مع العمليات
                            الحسابية الأساسية مثل + و - و * و /.
                          </p>
                        </div>
                      ) : null}

                      {field.dataType === "SELECT" && field.sourceType !== "SYSTEM" ? (
                        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            خيارات القائمة
                          </label>
                          <textarea
                            value={field.options.join("\n")}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                options: event.target.value
                                  .split("\n")
                                  .map((option) => option.trim())
                                  .filter(Boolean),
                              }))
                            }
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="اكتب كل اختيار في سطر مستقل"
                          />
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                isRequired: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          الحقل مطلوب
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={field.isVisible}
                            onChange={(event) =>
                              updateField(index, (current) => ({
                                ...current,
                                isVisible: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          يظهر للموظف داخل الفورم
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold">ملخص سريع</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">إجمالي الحقول</span>
                  <strong>{formState.fields.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">من النظام</span>
                  <strong>{visibleCounts.SYSTEM}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">يدوي</span>
                  <strong>{visibleCounts.MANUAL}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">حسابي</span>
                  <strong>{visibleCounts.CALCULATED}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold">مصادر جاهزة من النظام</h2>
              <div className="space-y-3">
                {SYSTEM_FIELD_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <strong className="text-sm">{option.label}</strong>
                      <BuilderBadge label={option.dataType} />
                    </div>
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {option.description}
                    </p>
                    <p className="mt-2 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {option.key}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-lg font-semibold">ملاحظات مهمة</h2>
              <ul className="space-y-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <li>الحقول المخفية يمكن استخدامها في التحليل حتى لو لم تظهر للموظف.</li>
                <li>المعادلات الحسابية تعتمد على مفاتيح الحقول وليس على العنوان.</li>
                <li>الحقول الرقمية أسهل بكثير في التحليل وعرض الرسوم لاحقًا.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default WorkReportFormBuilder;
