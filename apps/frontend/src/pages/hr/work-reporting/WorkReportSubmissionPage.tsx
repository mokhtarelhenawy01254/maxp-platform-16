import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2, Lock, Save, Sigma, Star } from 'lucide-react';
import { toast } from "sonner";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { WorkReportFillContext, WorkReportField, WorkReportFieldValue } from "./types";
import {
  buildLiveValuesByKey,
  formatArabicDateTime,
  getTodayIsoDate,
  valueFromRawInput,
} from "./utils";

const SectionBadge: React.FC<{
  label: string;
  tone?: string;
}> = ({
  label,
  tone = "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
}) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
    {label}
  </span>
);

const WorkReportSubmissionPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const [reportDate, setReportDate] = useState(getTodayIsoDate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<WorkReportFillContext | null>(null);
  const [manualValues, setManualValues] = useState<Record<string, unknown>>({});

  const fetchContext = async () => {
    if (!formId) return;

    try {
      setLoading(true);
      const response = await companyAwareApi.get<{ data: WorkReportFillContext }>(
        `/hr/reporting/forms/${formId}/fill-context`,
        { params: { date: reportDate } },
      );

      if (response.data?.data) {
        const nextContext = response.data.data;
        setContext(nextContext);

        const nextManualValues: Record<string, unknown> = {};
        nextContext.form.fields.forEach((field) => {
          if (field.sourceType !== "MANUAL") return;
          const existingValue = nextContext.values.byFieldId[field.id || ""];
          if (field.dataType === "SELECT") {
            nextManualValues[field.id || field.key] = Array.isArray(existingValue?.valueJson)
              ? existingValue.valueJson
              : [];
            return;
          }

          nextManualValues[field.id || field.key] =
            existingValue?.valueText ?? existingValue?.valueNumber ?? "";
        });

        setManualValues(nextManualValues);
      }
    } catch (error: any) {
      console.error("Error fetching submission context:", error);
      toast.error(error?.response?.data?.message || "تعذر تحميل الفورم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [formId, reportDate]);

  const liveValues = useMemo(() => {
    if (!context) return {};
    return buildLiveValuesByKey(context.form, context.values.byFieldKey, manualValues);
  }, [context, manualValues]);

  const visibleFields = useMemo(
    () => (context?.form.fields || []).filter((field) => field.isVisible),
    [context],
  );

  const highlightMetrics = useMemo(() => {
    if (!context) return [];
    return context.form.fields
      .filter(
        (field) =>
          field.isVisible &&
          (field.sourceType === "SYSTEM" || field.sourceType === "CALCULATED") &&
          (field.dataType === "NUMBER" || field.dataType === "PERCENT"),
      )
      .slice(0, 4);
  }, [context]);

  const updateManualValue = (field: WorkReportField, nextValue: unknown) => {
    setManualValues((current) => ({
      ...current,
      [field.id || field.key]: nextValue,
    }));
  };

  const buildSubmitPayload = () => {
    if (!context) return {};

    const values: Record<string, Record<string, unknown>> = {};

    context.form.fields.forEach((field) => {
      if (field.sourceType !== "MANUAL") return;

      const rawValue = manualValues[field.id || field.key];
      const normalized = valueFromRawInput(field, rawValue);

      if (field.dataType === "SELECT") {
        values[field.id || field.key] = {
          valueJson: normalized.valueJson,
          valueText: normalized.valueText,
        };
        return;
      }

      if (field.dataType === "NUMBER" || field.dataType === "PERCENT") {
        values[field.id || field.key] = {
          valueNumber: normalized.valueNumber,
          valueText: normalized.valueText,
        };
        return;
      }

      values[field.id || field.key] = {
        valueText: normalized.valueText,
      };
    });

    return values;
  };

  const handleSubmit = async () => {
    if (!formId || !context) return;

    try {
      setSaving(true);
      await companyAwareApi.post(`/hr/reporting/forms/${formId}/submit`, {
        reportDate,
        values: buildSubmitPayload(),
      });
      toast.success("تم حفظ التقرير");
      fetchContext();
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error?.response?.data?.message || "تعذر حفظ التقرير");
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (field: WorkReportField, value: WorkReportFieldValue | undefined) => {
    if (field.sourceType !== "MANUAL") {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            {field.sourceType === "SYSTEM" ? (
              <>
                <Sparkles className="h-4 w-4" />
                قيمة من النظام
              </>
            ) : (
              <>
                <Sigma className="h-4 w-4" />
                ناتج المعادلة
              </>
            )}
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white">
            {value?.displayValue || "—"}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            {field.sourceType === "SYSTEM" ? field.systemKey : field.formula}
          </div>
        </div>
      );
    }

    if (field.dataType === "LONG_TEXT") {
      return (
        <textarea
          rows={5}
          value={String(manualValues[field.id || field.key] || "")}
          onChange={(event) => updateManualValue(field, event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
          placeholder={field.placeholder || ""}
        />
      );
    }

    if (field.dataType === "SELECT") {
      const selectedValues = Array.isArray(manualValues[field.id || field.key])
        ? (manualValues[field.id || field.key] as string[])
        : [];

      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => {
            const isSelected = selectedValues.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  updateManualValue(
                    field,
                    isSelected
                      ? selectedValues.filter((item) => item !== option)
                      : [...selectedValues, option],
                  )
                }
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <input
        type={field.dataType === "NUMBER" || field.dataType === "PERCENT" ? "number" : "text"}
        step={field.dataType === "PERCENT" ? "0.01" : field.dataType === "NUMBER" ? "1" : undefined}
        value={String(manualValues[field.id || field.key] ?? "")}
        onChange={(event) => updateManualValue(field, event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
        placeholder={field.placeholder || ""}
      />
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 px-4 py-10 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400"
        dir="rtl"
      >
        جاري تحميل شاشة التقرير...
      </div>
    );
  }

  if (!context) {
    return (
      <div
        className="min-h-screen bg-slate-50 px-4 py-10 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400"
        dir="rtl"
      >
        لم يتم العثور على الفورم المطلوب.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              to="/hr/reporting/forms"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للفورمات
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SectionBadge label={context.period.cadence} />
                {context.form.isActive ? (
                  <SectionBadge
                    label="مفعل"
                    tone="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                  />
                ) : (
                  <SectionBadge
                    label="غير مفعل"
                    tone="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  />
                )}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {context.form.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {context.form.description || "أكمل التقرير ثم احفظه ليظهر في السجلات والتحليل."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400">تاريخ التقرير</span>
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ التقرير"}
            </button>
          </div>
        </div>

        {context.existingSubmission ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              يوجد إرسال محفوظ لهذه الفترة
            </div>
            <div className="mt-2 text-emerald-700 dark:text-emerald-300">
              آخر تحديث: {formatArabicDateTime(context.existingSubmission.submittedAt)}
            </div>
          </div>
        ) : null}

        {highlightMetrics.length ? (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {highlightMetrics.map((field) => {
              const value = liveValues[field.key];
              return (
                <div
                  key={field.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{field.label}</span>
                    {field.sourceType === "SYSTEM" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Sigma className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-3xl font-semibold">
                    {value?.displayValue || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-4">
          {visibleFields.map((field) => {
            const value = liveValues[field.key];

            return (
              <section
                key={field.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium">{field.label}</h2>
                      <SectionBadge
                        label={
                          field.sourceType === "SYSTEM"
                            ? "من النظام"
                            : field.sourceType === "CALCULATED"
                              ? "حسابي"
                              : "يدوي"
                        }
                      />
                      {field.isRequired ? (
                        <SectionBadge
                          label="مطلوب"
                          tone="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                        />
                      ) : null}
                    </div>
                    {field.helpText ? (
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {field.helpText}
                      </p>
                    ) : null}
                  </div>

                  {field.sourceType !== "MANUAL" ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <Lock className="h-3.5 w-3.5" />
                      للعرض فقط
                    </div>
                  ) : null}
                </div>

                {renderFieldInput(field, value)}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkReportSubmissionPage;
