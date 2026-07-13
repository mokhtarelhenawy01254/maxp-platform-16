import React, { useState, useEffect } from "react";
import {
  BriefcaseIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
  experienceLevel: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD";
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ON_HOLD";
  applicantsCount: number;
  postedDate: string;
  closingDate?: string;
}

const JobPostingsSection: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "",
    type: "FULL_TIME" as const,
    experienceLevel: "MID" as const,
    salaryMin: "",
    salaryMax: "",
    description: "",
    requirements: "",
    responsibilities: "",
    closingDate: "",
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/jobs");
      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    try {
      const jobData = {
        ...newJob,
        requirements: newJob.requirements.split("\n").filter((r) => r.trim()),
        responsibilities: newJob.responsibilities
          .split("\n")
          .filter((r) => r.trim()),
        salaryMin: newJob.salaryMin ? parseFloat(newJob.salaryMin) : undefined,
        salaryMax: newJob.salaryMax ? parseFloat(newJob.salaryMax) : undefined,
      };

      const response = await companyAwareApi.post(
        "/hr/recruitment/jobs",
        jobData,
      );
      if (response.data.success) {
        toast.success("تم إنشاء الوظيفة بنجاح");
        setShowCreateModal(false);
        fetchJobs();
        resetForm();
      }
    } catch (error) {
      toast.error("فشل في إنشاء الوظيفة");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوظيفة؟")) return;

    try {
      await companyAwareApi.delete(`/hr/recruitment/jobs/${jobId}`);
      toast.success("تم حذف الوظيفة بنجاح");
      fetchJobs();
    } catch (error) {
      toast.error("فشل في حذف الوظيفة");
    }
  };

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      await companyAwareApi.put(`/hr/recruitment/jobs/${jobId}/status`, {
        status,
      });
      toast.success("تم تحديث حالة الوظيفة");
      fetchJobs();
    } catch (error) {
      toast.error("فشل في تحديث الحالة");
    }
  };

  const resetForm = () => {
    setNewJob({
      title: "",
      department: "",
      location: "",
      type: "FULL_TIME",
      experienceLevel: "MID",
      salaryMin: "",
      salaryMax: "",
      description: "",
      requirements: "",
      responsibilities: "",
      closingDate: "",
    });
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: JobPosting["status"]) => {
    const badges = {
      DRAFT: {
        bg: "bg-gray-100 text-gray-700 border-gray-300",
        text: "📝 مسودة",
      },
      ACTIVE: {
        bg: "bg-green-100 text-green-700 border-green-300",
        text: "✅ نشط",
      },
      CLOSED: { bg: "bg-red-100 text-red-700 border-red-300", text: "🔒 مغلق" },
      ON_HOLD: {
        bg: "bg-amber-100 text-amber-700 border-amber-300",
        text: "⏸️ معلق",
      },
    };
    return badges[status];
  };

  const getTypeBadge = (type: JobPosting["type"]) => {
    const badges = {
      FULL_TIME: "⏰ دوام كامل",
      PART_TIME: "🕐 دوام جزئي",
      CONTRACT: "📄 عقد",
      INTERNSHIP: "🎓 تدريب",
    };
    return badges[type];
  };

  const getExperienceBadge = (level: JobPosting["experienceLevel"]) => {
    const badges = {
      ENTRY: "🌱 مبتدئ",
      JUNIOR: "📚 Junior",
      MID: "💼 Mid-Level",
      SENIOR: "⭐ Senior",
      LEAD: "👑 Lead",
    };
    return badges[level];
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن وظيفة..."
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
            <option value="ACTIVE">نشط</option>
            <option value="DRAFT">مسودة</option>
            <option value="CLOSED">مغلق</option>
            <option value="ON_HOLD">معلق</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            إضافة وظيفة
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredJobs.map((job, index) => {
            const statusBadge = getStatusBadge(job.status);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BriefcaseIcon className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {job.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      {job.department}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${statusBadge.bg}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPinIcon className="w-5 h-5" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <ClockIcon className="w-5 h-5" />
                    <span>{getTypeBadge(job.type)}</span>
                    <span className="mx-2">•</span>
                    <span>{getExperienceBadge(job.experienceLevel)}</span>
                  </div>
                  {job.salaryMin && job.salaryMax && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <CurrencyDollarIcon className="w-5 h-5" />
                      <span>
                        {job.salaryMin.toLocaleString()} -{" "}
                        {job.salaryMax.toLocaleString()} جنيه
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <UserGroupIcon className="w-5 h-5" />
                    <span>{job.applicantsCount} متقدم</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                  >
                    <EyeIcon className="w-5 h-5" />
                    عرض
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        job.id,
                        job.status === "ACTIVE" ? "CLOSED" : "ACTIVE",
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                  >
                    {job.status === "ACTIVE" ? (
                      <XCircleIcon className="w-5 h-5" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5" />
                    )}
                    {job.status === "ACTIVE" ? "إغلاق" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredJobs.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
          <BriefcaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            لا توجد وظائف متاحة
          </p>
        </div>
      )}

      {/* Create Job Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                إضافة وظيفة جديدة
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المسمى الوظيفي *
                    </label>
                    <input
                      type="text"
                      value={newJob.title}
                      onChange={(e) =>
                        setNewJob({ ...newJob, title: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="مثال: مطور Full Stack"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      القسم *
                    </label>
                    <input
                      type="text"
                      value={newJob.department}
                      onChange={(e) =>
                        setNewJob({ ...newJob, department: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="مثال: تطوير البرمجيات"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الموقع *
                    </label>
                    <input
                      type="text"
                      value={newJob.location}
                      onChange={(e) =>
                        setNewJob({ ...newJob, location: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="مثال: القاهرة - مصر"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نوع الوظيفة *
                    </label>
                    <select
                      value={newJob.type}
                      onChange={(e) =>
                        setNewJob({ ...newJob, type: e.target.value as any })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="FULL_TIME">دوام كامل</option>
                      <option value="PART_TIME">دوام جزئي</option>
                      <option value="CONTRACT">عقد</option>
                      <option value="INTERNSHIP">تدريب</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      مستوى الخبرة *
                    </label>
                    <select
                      value={newJob.experienceLevel}
                      onChange={(e) =>
                        setNewJob({
                          ...newJob,
                          experienceLevel: e.target.value as any,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="ENTRY">مبتدئ</option>
                      <option value="JUNIOR">Junior</option>
                      <option value="MID">Mid-Level</option>
                      <option value="SENIOR">Senior</option>
                      <option value="LEAD">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الراتب من
                    </label>
                    <input
                      type="number"
                      value={newJob.salaryMin}
                      onChange={(e) =>
                        setNewJob({ ...newJob, salaryMin: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="15000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الراتب إلى
                    </label>
                    <input
                      type="number"
                      value={newJob.salaryMax}
                      onChange={(e) =>
                        setNewJob({ ...newJob, salaryMax: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="25000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الوصف الوظيفي *
                  </label>
                  <textarea
                    value={newJob.description}
                    onChange={(e) =>
                      setNewJob({ ...newJob, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="اكتب وصف تفصيلي للوظيفة..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المتطلبات (سطر لكل متطلب) *
                  </label>
                  <textarea
                    value={newJob.requirements}
                    onChange={(e) =>
                      setNewJob({ ...newJob, requirements: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="خبرة 3+ سنوات&#10;React & Node.js&#10;TypeScript"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المسؤوليات (سطر لكل مسؤولية) *
                  </label>
                  <textarea
                    value={newJob.responsibilities}
                    onChange={(e) =>
                      setNewJob({ ...newJob, responsibilities: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="تطوير الميزات الجديدة&#10;صيانة الكود&#10;مراجعة الكود"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ الإغلاق
                  </label>
                  <input
                    type="date"
                    value={newJob.closingDate}
                    onChange={(e) =>
                      setNewJob({ ...newJob, closingDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateJob}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  إنشاء الوظيفة
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
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

      {/* Job Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedJob && (
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
                    {selectedJob.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedJob.department}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusBadge(selectedJob.status).bg}`}
                >
                  {getStatusBadge(selectedJob.status).text}
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                    الوصف الوظيفي
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedJob.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                    المتطلبات
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(Array.isArray(selectedJob.requirements)
                      ? selectedJob.requirements
                      : typeof selectedJob.requirements === "string"
                        ? (selectedJob.requirements as string).split("\n")
                        : []
                    ).map((req, idx) => (
                      <li
                        key={idx}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                    المسؤوليات
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(Array.isArray(selectedJob.responsibilities)
                      ? selectedJob.responsibilities
                      : typeof selectedJob.responsibilities === "string"
                        ? (selectedJob.responsibilities as string).split("\n")
                        : []
                    ).map((resp, idx) => (
                      <li
                        key={idx}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 transition-all"
              >
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobPostingsSection;
