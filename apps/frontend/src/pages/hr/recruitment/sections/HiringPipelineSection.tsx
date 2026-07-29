import React, { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface PipelineStage {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface StageApplicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  createdAt?: string;
  jobTitle?: string;
  job?: {
    title?: string;
  };
}

const normalizeStageApplicant = (applicant: any): StageApplicant => ({
  ...applicant,
  id: applicant?.id || "",
  name: applicant?.name || "بدون اسم",
  email: applicant?.email || "بدون بريد",
  phone: applicant?.phone || "",
  status: applicant?.status || "NEW",
  createdAt: applicant?.createdAt,
  jobTitle: applicant?.jobTitle || applicant?.job?.title || "بدون وظيفة",
  job: applicant?.job || null,
});

const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "NEW", name: "جديد", count: 0, color: "blue" },
  { id: "REVIEWING", name: "قيد المراجعة", count: 0, color: "amber" },
  {
    id: "INTERVIEW_SCHEDULED",
    name: "مقابلة مجدولة",
    count: 0,
    color: "purple",
  },
  { id: "INTERVIEWED", name: "تمت المقابلة", count: 0, color: "indigo" },
  { id: "OFFERED", name: "تم العرض", count: 0, color: "green" },
  { id: "HIRED", name: "تم التوظيف", count: 0, color: "emerald" },
  { id: "REJECTED", name: "مرفوض", count: 0, color: "red" },
];

const HiringPipelineSection: React.FC = () => {
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [selectedStageId, setSelectedStageId] = useState("NEW");
  const [stageApplicants, setStageApplicants] = useState<StageApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageApplicantsLoading, setStageApplicantsLoading] = useState(false);
  const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchPipelineStats();
  }, []);

  useEffect(() => {
    if (selectedStageId) {
      fetchStageApplicants(selectedStageId);
    }
  }, [selectedStageId]);

  const fetchPipelineStats = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await companyAwareApi.get(
        "/hr/recruitment/pipeline-stats",
      );

      if (response.data.success) {
        const incomingStages = Array.isArray(response.data.data)
          ? response.data.data
          : [];

        const normalizedStages = DEFAULT_PIPELINE_STAGES.map((defaultStage) => {
          const matchingStage = incomingStages.find(
            (stage: PipelineStage) => stage.id === defaultStage.id,
          );

          return matchingStage
            ? { ...defaultStage, ...matchingStage }
            : defaultStage;
        });

        setStages(normalizedStages);
        setSelectedStageId((currentStageId) => {
          if (normalizedStages.some((stage) => stage.id === currentStageId)) {
            return currentStageId;
          }

          return normalizedStages.find((stage) => stage.count > 0)?.id || "NEW";
        });
      }
    } catch (error) {
      console.error("Error fetching pipeline stats:", error);
      setStages(DEFAULT_PIPELINE_STAGES);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchStageApplicants = async (status: string) => {
    try {
      setStageApplicantsLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/applicants", {
        params: { status, limit: "all" },
      });

      if (response.data.success) {
        setStageApplicants((response.data.data || []).map(normalizeStageApplicant));
      } else {
        setStageApplicants([]);
      }
    } catch (error) {
      console.error("Error fetching stage applicants:", error);
      setStageApplicants([]);
    } finally {
      setStageApplicantsLoading(false);
    }
  };

  const handleUpdateStatus = async (applicantId: string, newStatus: string) => {
    try {
      setStageApplicantsLoading(true);
      const response = await companyAwareApi.put(
        `/hr/recruitment/applicants/${applicantId}/status`,
        { status: newStatus }
      );
      if (response.data.success) {
        tToast.success("hr_HiringPipelineSection.msg_875d");
        await Promise.all([
          fetchPipelineStats(false),
          fetchStageApplicants(selectedStageId),
        ]);
      } else {
        tToast.error("hr_HiringPipelineSection.msg_a559");
        setStageApplicantsLoading(false);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء نقل المتقدم");
      setStageApplicantsLoading(false);
    }
  };

  const handleDeleteApplicant = async (applicant: StageApplicant) => {
    const confirmed = window.confirm(
      `هل تريدين حذف ${applicant.name} من مسار التوظيف؟`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingApplicantId(applicant.id);
      const response = await companyAwareApi.delete(
        `/hr/recruitment/applicants/${applicant.id}`,
      );

      if (response.data.success) {
        tToast.success("hr_HiringPipelineSection.success_delete_28f8");
        setStageApplicants((currentApplicants) =>
          currentApplicants.filter(
            (currentApplicant) => currentApplicant.id !== applicant.id,
          ),
        );
        await Promise.all([
          fetchPipelineStats(false),
          fetchStageApplicants(selectedStageId),
        ]);
      } else {
        tToast.error("hr_HiringPipelineSection.failed_delete_15ad");
      }
    } catch (error: any) {
      console.error("Error deleting applicant:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حذف المتقدم");
    } finally {
      setDeletingApplicantId(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-100 border-blue-300 text-blue-700",
      amber: "bg-amber-100 border-amber-300 text-amber-700",
      purple: "bg-purple-100 border-purple-300 text-purple-700",
      indigo: "bg-indigo-100 border-indigo-300 text-indigo-700",
      green: "bg-green-100 border-green-300 text-green-700",
      emerald: "bg-emerald-100 border-emerald-300 text-emerald-700",
      red: "bg-red-100 border-red-300 text-red-700",
    };

    return colors[color] || colors.blue;
  };

  const totalApplicants = stages.reduce((sum, stage) => sum + stage.count, 0);
  const newApplicants = stages.find((stage) => stage.id === "NEW")?.count || 0;
  const hiredApplicants =
    stages.find((stage) => stage.id === "HIRED")?.count || 0;
  const inInterviewStages = stages
    .filter((stage) =>
      ["INTERVIEW_SCHEDULED", "INTERVIEWED"].includes(stage.id),
    )
    .reduce((sum, stage) => sum + stage.count, 0);
  const activePipelineApplicants = stages
    .filter((stage) => !["HIRED", "REJECTED"].includes(stage.id))
    .reduce((sum, stage) => sum + stage.count, 0);
  const conversionRate =
    newApplicants > 0 ? Math.round((hiredApplicants / newApplicants) * 100) : 0;
  const selectedStage =
    stages.find((stage) => stage.id === selectedStageId) || stages[0];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="w-8 h-8 text-blue-600" />
          مسار التوظيف
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        ) : totalApplicants === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-8 text-center">
            <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              المسار جاهز لكن لا يوجد متقدمون بعد
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-7">
              المتقدمون يظهرون هنا بعد إضافتهم من تبويب المتقدمين، أو تلقائيًا من
              ردود استبيانات التقديم إذا كان الاستبيان مربوطًا بوظيفة.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-right">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                  1. أنشئ وظيفة
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  اربطي الاستبيان بوظيفة واضحة.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300 font-semibold">
                  2. اجمعي التقديمات
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  الردود المربوطة بوظيفة يمكن إدخالها للمسار.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                  3. تابعي المراحل
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  بعدها ستظهر كل مرحلة وعدد المرشحين فيها.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto pb-2">
              <div className="flex items-stretch gap-4 min-w-max">
                {stages.map((stage, index) => (
                  <React.Fragment key={stage.id}>
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`relative min-w-[220px] p-5 rounded-2xl border-2 text-right transition-all ${getColorClasses(
                        stage.color,
                      )} ${
                        selectedStageId === stage.id
                          ? "shadow-xl ring-2 ring-blue-500 ring-offset-2 scale-[1.02]"
                          : "hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium opacity-70 mb-1">
                            المرحلة
                          </p>
                          <h3 className="font-bold text-lg">{stage.name}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center font-bold text-xl shadow-sm">
                          {stage.count}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4" />
                          {stage.count} متقدم
                        </span>
                        <span className="font-semibold">
                          {Math.round((stage.count / totalApplicants) * 100)}%
                        </span>
                      </div>
                    </motion.button>
                    {index < stages.length - 1 && (
                      <div className="hidden xl:flex items-center justify-center">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    تفاصيل مرحلة: {selectedStage?.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    كل المتقدمين الموجودين حاليًا داخل هذه المرحلة
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold w-fit ${getColorClasses(
                    selectedStage?.color || "blue",
                  )}`}
                >
                  {selectedStage?.count || 0} متقدم
                </div>
              </div>

              {stageApplicantsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                </div>
              ) : stageApplicants.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    لا يوجد متقدمون ظاهرون داخل مرحلة {selectedStage?.name} حاليًا.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {stageApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-white">
                            {applicant.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {applicant.email}
                          </p>
                          {applicant.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {applicant.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={applicant.status}
                            onChange={(e) =>
                              handleUpdateStatus(applicant.id, e.target.value)
                            }
                            disabled={deletingApplicantId === applicant.id}
                            className={`text-xs font-semibold rounded-lg px-2 py-1.5 cursor-pointer outline-none border hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${getColorClasses(
                              selectedStage?.color || "blue",
                            )}`}
                            title="تغيير المرحلة"
                          >
                            {DEFAULT_PIPELINE_STAGES.map((t_stage) => (
                              <option
                                key={t_stage.id}
                                value={t_stage.id}
                                className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                              >
                                {t_stage.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteApplicant(applicant)}
                            disabled={deletingApplicantId === applicant.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                            title="حذف المتقدم"
                            aria-label={`حذف ${applicant.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseIcon className="w-4 h-4" />
                          {applicant.jobTitle ||
                            applicant.job?.title ||
                            "بدون وظيفة"}
                        </span>
                        {applicant.createdAt && (
                          <span>
                            {format(new Date(applicant.createdAt), "dd MMM yyyy", {
                              locale: ar,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          إحصائيات المسار
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              إجمالي المتقدمين
            </p>
            <p className="text-3xl font-bold text-blue-600">{totalApplicants}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border-2 border-slate-200">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              داخل المسار الآن
            </p>
            <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              {activePipelineApplicants}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              في المقابلات
            </p>
            <p className="text-3xl font-bold text-purple-600">
              {inInterviewStages}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              تم التوظيف
            </p>
            <p className="text-3xl font-bold text-emerald-600 flex items-center gap-2">
              <CheckCircleIcon className="w-7 h-7" />
              {hiredApplicants}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              معدل التحويل من جديد إلى توظيف
            </p>
            <p className="text-3xl font-bold text-red-600 flex items-center gap-2">
              <XCircleIcon className="w-7 h-7" />
              {conversionRate}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiringPipelineSection;
