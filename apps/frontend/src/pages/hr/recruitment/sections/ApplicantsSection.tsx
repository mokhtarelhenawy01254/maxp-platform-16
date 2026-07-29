import React, { useState, useEffect } from "react";
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  StarIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type ApplicantStatus =
  | "NEW"
  | "REVIEWING"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "OFFERED"
  | "HIRED"
  | "REJECTED";

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  jobId: string;
  appliedDate: string;
  status: ApplicantStatus;
  resumeUrl?: string;
  coverLetter?: string;
  experience: number;
  education: string;
  skills: string[];
  rating?: number;
  notes?: string;
  createdAt?: string;
  job?: {
    title?: string | null;
  } | null;
}

const APPLICANT_STATUS_VALUES = new Set<ApplicantStatus>([
  "NEW",
  "REVIEWING",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "OFFERED",
  "HIRED",
  "REJECTED",
]);

const normalizeSkills = (skills: unknown): string[] => {
  if (Array.isArray(skills)) {
    return skills
      .map((skill) => String(skill).trim())
      .filter(Boolean);
  }

  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeApplicant = (applicant: any): Applicant => {
  const rawStatus = applicant?.status;
  const status: ApplicantStatus = APPLICANT_STATUS_VALUES.has(rawStatus)
    ? rawStatus
    : "NEW";

  return {
    ...applicant,
    id: applicant?.id || "",
    name: applicant?.name || "بدون اسم",
    email: applicant?.email || "بدون بريد",
    phone: applicant?.phone || "بدون هاتف",
    jobTitle: applicant?.jobTitle || applicant?.job?.title || "بدون وظيفة",
    jobId: applicant?.jobId || "",
    appliedDate: applicant?.appliedDate || applicant?.createdAt || "",
    status,
    experience: Number.isFinite(Number(applicant?.experience))
      ? Number(applicant.experience)
      : 0,
    education: applicant?.education || "غير محدد",
    skills: normalizeSkills(applicant?.skills),
  };
};

const ApplicantsSection: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null,
  );
  const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [newApplicant, setNewApplicant] = useState({
    name: "",
    email: "",
    phone: "",
    jobId: "",
    experience: 0,
    education: "",
    skills: "",
    coverLetter: "",
    resumeUrl: "",
  });

  useEffect(() => {
    fetchApplicants();
    fetchJobs();
  }, []);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/applicants", {
        params: { limit: "all" },
      });
      if (response.data.success) {
        setApplicants((response.data.data || []).map(normalizeApplicant));
      }
    } catch (error) {
      console.error("Error fetching applicants:", error);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplicant = async (applicant: Applicant) => {
    const confirmed = window.confirm(`هل تريدين حذف ${applicant.name}؟`);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingApplicantId(applicant.id);
      const response = await companyAwareApi.delete(
        `/hr/recruitment/applicants/${applicant.id}`,
      );

      if (response.data.success) {
        tToast.success("hr_ApplicantsSection.success_delete_026c");
        setApplicants((currentApplicants) =>
          currentApplicants.filter(
            (currentApplicant) => currentApplicant.id !== applicant.id,
          ),
        );

        if (selectedApplicant?.id === applicant.id) {
          setSelectedApplicant(null);
          setShowDetailsModal(false);
        }

        fetchApplicants();
      } else {
        tToast.error("hr_ApplicantsSection.failed_delete_951f");
      }
    } catch (error: any) {
      console.error("Error deleting applicant:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حذف المتقدم");
    } finally {
      setDeletingApplicantId(null);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await companyAwareApi.get("/hr/recruitment/jobs");
      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const handleUpdateStatus = async (applicantId: string, status: string) => {
    try {
      await companyAwareApi.put(
        `/hr/recruitment/applicants/${applicantId}/status`,
        { status },
      );
      tToast.success("hr_ApplicantsSection.success_update_status_7ae4");
      fetchApplicants();
    } catch (error) {
      tToast.error("hr_ApplicantsSection.failed_update_a9eb");
    }
  };

  const handleAddApplicant = async () => {
    try {
      if (!newApplicant.name || !newApplicant.email || !newApplicant.jobId) {
        tToast.error("hr_ApplicantsSection.msg_0d23");
        return;
      }

      const payload = {
        ...newApplicant,
        skills: newApplicant.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
      };

      const response = await companyAwareApi.post(
        "/hr/recruitment/applicants",
        payload,
      );
      if (response.data.success) {
        tToast.success("hr_ApplicantsSection.success_add_3282");
        setShowAddModal(false);
        resetAddForm();
        fetchApplicants();
      }
    } catch (error: any) {
      console.error("Error adding applicant:", error);
      toast.error(error.response?.data?.message || "فشل في إضافة المتقدم");
    }
  };

  const resetAddForm = () => {
    setNewApplicant({
      name: "",
      email: "",
      phone: "",
      jobId: "",
      experience: 0,
      education: "",
      skills: "",
      coverLetter: "",
      resumeUrl: "",
    });
  };

  const filteredApplicants = applicants.filter((applicant) => {
    const searchableText = [
      applicant.name,
      applicant.email,
      applicant.phone,
      applicant.jobTitle,
    ]
      .join(" ")
      .toLowerCase();
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const matchesSearch =
      searchableText.includes(normalizedSearchTerm);
    const matchesFilter =
      filterStatus === "all" || applicant.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: Applicant["status"]) => {
    const badges = {
      NEW: { bg: "bg-blue-100 text-blue-700 border-blue-300", text: "🆕 جديد" },
      REVIEWING: {
        bg: "bg-amber-100 text-amber-700 border-amber-300",
        text: "👀 قيد المراجعة",
      },
      INTERVIEW_SCHEDULED: {
        bg: "bg-purple-100 text-purple-700 border-purple-300",
        text: "📅 مقابلة مجدولة",
      },
      INTERVIEWED: {
        bg: "bg-indigo-100 text-indigo-700 border-indigo-300",
        text: "✅ تمت المقابلة",
      },
      OFFERED: {
        bg: "bg-green-100 text-green-700 border-green-300",
        text: "🎉 تم العرض",
      },
      HIRED: {
        bg: "bg-emerald-100 text-emerald-700 border-emerald-300",
        text: "🎊 تم التوظيف",
      },
      REJECTED: {
        bg: "bg-red-100 text-red-700 border-red-300",
        text: "❌ مرفوض",
      },
    };
    return badges[status] || badges.NEW;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            المتقدمين
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة المتقدمين على الوظائف
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
        >
          <PlusIcon className="w-5 h-5" />
          إضافة متقدم
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن متقدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="NEW">جديد</option>
            <option value="REVIEWING">قيد المراجعة</option>
            <option value="INTERVIEW_SCHEDULED">مقابلة مجدولة</option>
            <option value="INTERVIEWED">تمت المقابلة</option>
            <option value="OFFERED">تم العرض</option>
            <option value="HIRED">تم التوظيف</option>
            <option value="REJECTED">مرفوض</option>
          </select>
        </div>
      </div>

      {/* Applicants Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {filteredApplicants.map((applicant, index) => {
            const statusBadge = getStatusBadge(applicant.status);
            return (
              <motion.div
                key={applicant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {applicant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {applicant.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <DocumentTextIcon className="w-4 h-4" />
                        {applicant.jobTitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 shadow-sm ${statusBadge.bg}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 gap-3 mb-5">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                      <EnvelopeIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                      {applicant.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                    <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                      <PhoneIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {applicant.phone}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">
                      الخبرة
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {applicant.experience}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      سنوات
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-700">
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                      التعليم
                    </div>
                    <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 truncate">
                      {applicant.education || "غير محدد"}
                    </div>
                  </div>
                  {applicant.rating && (
                    <div className="col-span-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold">
                          التقييم
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-5 h-5 ${i < applicant.rating! ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="mb-5">
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    المهارات
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {applicant.skills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    {applicant.skills.length === 0 && (
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg">
                        لا توجد مهارات مسجلة
                      </span>
                    )}
                    {applicant.skills.length > 4 && (
                      <span className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg">
                        +{applicant.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-5 border-t-2 border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedApplicant(applicant);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold"
                  >
                    <EyeIcon className="w-5 h-5" />
                    عرض التفاصيل
                  </button>
                  {applicant.status === "NEW" && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(applicant.id, "REVIEWING")
                      }
                      className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg hover:bg-amber-100 transition-all"
                    >
                      <ClockIcon className="w-5 h-5" />
                    </button>
                  )}
                  {applicant.status === "REVIEWING" && (
                    <>
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            applicant.id,
                            "INTERVIEW_SCHEDULED",
                          )
                        }
                        className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(applicant.id, "REJECTED")
                        }
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteApplicant(applicant)}
                    disabled={deletingApplicantId === applicant.id}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    title="حذف المتقدم"
                    aria-label={`حذف ${applicant.name}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredApplicants.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
          <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            لا يوجد متقدمين
          </p>
        </div>
      )}

      {/* Applicant Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedApplicant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {selectedApplicant.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedApplicant.jobTitle}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusBadge(selectedApplicant.status).bg}`}
                >
                  {getStatusBadge(selectedApplicant.status).text}
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                      معلومات الاتصال
                    </h3>
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">البريد:</span>{" "}
                        {selectedApplicant.email}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">الهاتف:</span>{" "}
                        {selectedApplicant.phone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                      المؤهلات
                    </h3>
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">الخبرة:</span>{" "}
                        {selectedApplicant.experience} سنوات
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">التعليم:</span>{" "}
                        {selectedApplicant.education}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                    المهارات
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.skills.length > 0 ? (
                      selectedApplicant.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-sm rounded-full border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        لا توجد مهارات مسجلة
                      </span>
                    )}
                  </div>
                </div>

                {selectedApplicant.coverLetter && (
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                      خطاب التقديم
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedApplicant.coverLetter}
                    </p>
                  </div>
                )}

                {selectedApplicant.notes && (
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                      ملاحظات
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedApplicant.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                {selectedApplicant.resumeUrl && (
                  <a
                    href={selectedApplicant.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    عرض السيرة الذاتية
                  </a>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Applicant Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                إضافة متقدم جديد
              </h2>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newApplicant.name}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newApplicant.email}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="example@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={newApplicant.phone}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="01xxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الوظيفة المتقدم لها{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newApplicant.jobId}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          jobId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                      <option value="">اختر الوظيفة...</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      سنوات الخبرة
                    </label>
                    <input
                      type="number"
                      value={newApplicant.experience}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          experience: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المؤهل التعليمي
                    </label>
                    <input
                      type="text"
                      value={newApplicant.education}
                      onChange={(e) =>
                        setNewApplicant({
                          ...newApplicant,
                          education: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="بكالوريوس، ماجستير..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المهارات (افصل بينها بفاصلة)
                  </label>
                  <input
                    type="text"
                    value={newApplicant.skills}
                    onChange={(e) =>
                      setNewApplicant({
                        ...newApplicant,
                        skills: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="JavaScript, React, Node.js"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رسالة التقديم
                  </label>
                  <textarea
                    value={newApplicant.coverLetter}
                    onChange={(e) =>
                      setNewApplicant({
                        ...newApplicant,
                        coverLetter: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="اكتب رسالة التقديم..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رابط السيرة الذاتية
                  </label>
                  <input
                    type="url"
                    value={newApplicant.resumeUrl}
                    onChange={(e) =>
                      setNewApplicant({
                        ...newApplicant,
                        resumeUrl: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleAddApplicant}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  إضافة المتقدم
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetAddForm();
                  }}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicantsSection;
