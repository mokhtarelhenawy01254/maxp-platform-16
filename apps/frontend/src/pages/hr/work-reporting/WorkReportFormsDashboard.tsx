import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Eye,
  FilePlus2,
  PenSquare,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { buildMessagingPreset } from "./catalog";
import { formatArabicDateTime } from "./utils";
import { WorkReportFormSummary } from "./types";

const cadenceLabels: Record<string, string> = {
  DAILY: "يومي",
  WEEKLY: "أسبوعي",
  MONTHLY: "شهري",
};

const statusClasses: Record<"active" | "draft", string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  draft:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
};

const WorkReportFormsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<WorkReportFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get<{ data: WorkReportFormSummary[] }>(
        "/hr/reporting/forms",
      );
      if (response.data?.data) {
        setForms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching work report forms:", error);
      toast.error("تعذر تحميل فورمات التقارير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const filteredForms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return forms;

    return forms.filter((form) => {
      const haystack = `${form.title} ${form.description || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [forms, searchTerm]);

  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter((form) => form.isActive).length;
    const totalSubmissions = forms.reduce(
      (sum, form) => sum + Number(form.submissionsCount || 0),
      0,
    );
    const totalFields = forms.reduce(
      (sum, form) => sum + Number(form.fieldsCount || form.fields.length || 0),
      0,
    );

    return [
      {
        label: "إجمالي الفورمات",
        value: totalForms,
        icon: ClipboardList,
        tone:
          "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
      },
      {
        label: "الفورمات المفعلة",
        value: activeForms,
        icon: Sparkles,
        tone:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
      },
      {
        label: "إجمالي السجلات",
        value: totalSubmissions,
        icon: BarChart3,
        tone:
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200",
      },
      {
        label: "عدد الحقول",
        value: totalFields,
        icon: FilePlus2,
        tone:
          "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200",
      },
    ];
  }, [forms]);

  const handleDelete = async (formId: string) => {
    if (!window.confirm("هل تريد حذف هذا الفورم نهائيًا؟")) return;

    try {
      await companyAwareApi.delete(`/hr/reporting/forms/${formId}`);
      toast.success("تم حذف الفورم");
      fetchForms();
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("تعذر حذف الفورم");
    }
  };

  const seedPresetInSession = () => {
    sessionStorage.setItem(
      "work-report-form-preset",
      JSON.stringify(buildMessagingPreset()),
    );
    navigate("/hr/reporting/forms/new?preset=messaging");
  };

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate("/hr")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              الرجوع إلى الموارد البشرية
            </button>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                إدارة فورمات المتابعة والتحليل
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                نظام فورمات تقارير الموظفين
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                أنشئ الفورم، عاينه، شاركه مع الموظفين، ثم راقب السجلات والتحليل
                من نفس المسار. كل فورم يدعم حقول من النظام، إدخال يدوي، وحقول
                حسابية.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={seedPresetInSession}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              ابدأ بقالب فريق الرد
            </button>
            <Link
              to="/hr/reporting/forms/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <FilePlus2 className="h-4 w-4" />
              إنشاء فورم جديد
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-2xl border p-5 shadow-sm ${stat.tone}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium opacity-80">{stat.label}</span>
                  <Icon className="h-5 w-5 opacity-80" />
                </div>
                <div className="text-3xl font-semibold">{stat.value}</div>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
              placeholder="ابحث بالاسم أو وصف الفورم"
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {filteredForms.length} فورم ظاهر من أصل {forms.length}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            جاري تحميل الفورمات...
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">لا توجد فورمات بعد</h2>
            <p className="mx-auto mb-6 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              ابدأ بفورم يومي للموظفين أو استخدم قالب فريق الرد الجاهز ثم عدّله
              حسب شغلك.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={seedPresetInSession}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700"
              >
                <Sparkles className="h-4 w-4" />
                استخدم القالب الجاهز
              </button>
              <Link
                to="/hr/reporting/forms/new"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <FilePlus2 className="h-4 w-4" />
                إنشاء من الصفر
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredForms.map((form) => (
              <article
                key={form.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{form.title}</h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                          form.isActive ? statusClasses.active : statusClasses.draft
                        }`}
                      >
                        {form.isActive ? "مفعل" : "غير مفعل"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {cadenceLabels[form.cadence] || form.cadence}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {form.description || "بدون وصف حتى الآن."}
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      الحقول
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {form.fieldsCount || form.fields.length}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      السجلات
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {form.submissionsCount || 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      آخر إرسال
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {form.lastSubmittedAt
                        ? formatArabicDateTime(form.lastSubmittedAt)
                        : "لا يوجد"}
                    </div>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  {form.fields.slice(0, 5).map((field) => (
                    <span
                      key={`${form.id}-${field.key}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    >
                      {field.label}
                    </span>
                  ))}
                  {form.fields.length > 5 ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                      +{form.fields.length - 5}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/hr/reporting/forms/${form.id}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
                  >
                    <PenSquare className="h-4 w-4" />
                    تحرير
                  </Link>
                  <Link
                    to={`/hr/reporting/forms/${form.id}/preview`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                    معاينة
                  </Link>
                  <Link
                    to={`/hr/reporting/forms/${form.id}/fill`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
                  >
                    <ClipboardList className="h-4 w-4" />
                    تعبئة
                  </Link>
                  <Link
                    to={`/hr/reporting/forms/${form.id}/records`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
                  >
                    <BarChart3 className="h-4 w-4" />
                    السجلات والتحليل
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(form.id)}
                    className="mr-auto inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkReportFormsDashboard;
