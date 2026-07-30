import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart, Calendar, Eye, ListChecks, Pencil, Navigation } from 'lucide-react';
import { toast } from "sonner";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { WorkReportFillContext, WorkReportForm } from "./types";
import {
  formatArabicDate,
  formatArabicDateTime,
  formatMetricValue,
  getTodayIsoDate,
} from "./utils";

const PreviewBadge: React.FC<{ label: string; tone?: string }> = ({
  label,
  tone = "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
}) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
    {label}
  </span>
);

const sourceLabelMap: Record<string, string> = {
  SYSTEM: "من النظام",
  MANUAL: "يدوي",
  CALCULATED: "حسابي",
};

const typeLabelMap: Record<string, string> = {
  TEXT: "نص",
  LONG_TEXT: "نص طويل",
  NUMBER: "رقم",
  PERCENT: "نسبة",
  SELECT: "قائمة",
};

const WorkReportFormPreview: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const [previewDate, setPreviewDate] = useState(getTodayIsoDate());
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<WorkReportForm | null>(null);
  const [context, setContext] = useState<WorkReportFillContext | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!formId) return;

      try {
        setLoading(true);
        const [formResponse, contextResponse] = await Promise.all([
          companyAwareApi.get<{ data: WorkReportForm }>(`/hr/reporting/forms/${formId}`),
          companyAwareApi.get<{ data: WorkReportFillContext }>(
            `/hr/reporting/forms/${formId}/fill-context`,
            { params: { date: previewDate } },
          ),
        ]);

        if (formResponse.data?.data) setForm(formResponse.data.data);
        if (contextResponse.data?.data) setContext(contextResponse.data.data);
      } catch (error) {
        console.error("Error fetching report preview:", error);
        toast.error("تعذر تحميل المعاينة");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [formId, previewDate]);

  const visibleFields = useMemo(
    () => (form?.fields || []).filter((field) => field.isVisible),
    [form],
  );
  const hiddenFields = useMemo(
    () => (form?.fields || []).filter((field) => !field.isVisible),
    [form],
  );

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 px-4 py-10 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400"
        dir="rtl"
      >
        جاري تجهيز المعاينة...
      </div>
    );
  }

  if (!form || !context) {
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
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
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
              <div className="flex flex-wrap items-center gap-2">
                <PreviewBadge
                  label={form.isActive ? "مفعل" : "غير مفعل"}
                  tone={
                    form.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  }
                />
                <PreviewBadge label={context.period.cadence} />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{form.title}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {form.description || "بدون وصف حتى الآن."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400">تاريخ المعاينة</span>
              <input
                type="date"
                value={previewDate}
                onChange={(event) => setPreviewDate(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
            <Link
              to={`/hr/reporting/forms/${form.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              <Pencil className="h-4 w-4" />
              تحرير
            </Link>
            <Link
              to={`/hr/reporting/forms/${form.id}/fill`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
            >
              <Send className="h-4 w-4" />
              شاشة التعبئة
            </Link>
            <Link
              to={`/hr/reporting/forms/${form.id}/records`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <BarChart3 className="h-4 w-4" />
              السجلات والتحليل
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>الحقول الظاهرة</span>
              <Eye className="h-4 w-4" />
            </div>
            <div className="text-3xl font-semibold">{visibleFields.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>الحقول المخفية</span>
              <ListChecks className="h-4 w-4" />
            </div>
            <div className="text-3xl font-semibold">{hiddenFields.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              فترة التقرير
            </div>
            <div className="text-lg font-semibold">{context.period.label}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              تاريخ التقرير: {formatArabicDate(context.period.reportDate)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              آخر إرسال لنفس المستخدم
            </div>
            <div className="text-lg font-semibold">
              {context.existingSubmission
                ? formatArabicDateTime(context.existingSubmission.submittedAt)
                : "لا يوجد"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-semibold">كيف سيظهر الفورم للموظف</h2>
            <div className="space-y-4">
              {visibleFields.map((field, index) => {
                const previewValue = context.values.byFieldKey[field.key];

                return (
                  <div
                    key={field.key}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">{index + 1}</span>
                          <h3 className="font-medium">{field.label}</h3>
                          <PreviewBadge label={sourceLabelMap[field.sourceType] || field.sourceType} />
                          <PreviewBadge label={typeLabelMap[field.dataType] || field.dataType} />
                          {field.isRequired ? (
                            <PreviewBadge
                              label="مطلوب"
                              tone="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                            />
                          ) : null}
                        </div>
                        {field.helpText ? (
                          <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                            {field.helpText}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                      {field.sourceType === "MANUAL" ? (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-400">حقل قابل للتعبئة</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {field.placeholder || "سيظهر هنا إدخال الموظف."}
                          </div>
                        </div>
                      ) : field.sourceType === "CALCULATED" ? (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-400">ناتج المعادلة</div>
                          <div className="font-medium">
                            {previewValue
                              ? formatMetricValue(previewValue.valueNumber ?? previewValue.displayValue, field.dataType)
                              : "—"}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {field.formula || "بدون معادلة"}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-400">قيمة قادمة من النظام</div>
                          <div className="font-medium">
                            {previewValue
                              ? formatMetricValue(
                                  previewValue.valueNumber ?? previewValue.displayValue,
                                  field.dataType,
                                )
                              : "—"}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {field.systemKey || "SYSTEM"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            {hiddenFields.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-lg font-semibold">حقول مخفية لكنها فعالة</h2>
                <div className="space-y-3">
                  {hiddenFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{field.label}</strong>
                        <PreviewBadge
                          label={sourceLabelMap[field.sourceType] || field.sourceType}
                        />
                      </div>
                      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                        {field.helpText || "لن يظهر للموظف لكنه يُحفظ ويُستخدم في التحليل."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold">روابط التنفيذ</h2>
              <div className="space-y-2 text-sm">
                <Link
                  to={`/hr/reporting/forms/${form.id}/edit`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <span>تعديل الفورم</span>
                  <Pencil className="h-4 w-4" />
                </Link>
                <Link
                  to={`/hr/reporting/forms/${form.id}/fill`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <span>فتح شاشة التعبئة</span>
                  <Send className="h-4 w-4" />
                </Link>
                <Link
                  to={`/hr/reporting/forms/${form.id}/records`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <span>عرض السجلات والتحليل</span>
                  <BarChart3 className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default WorkReportFormPreview;
