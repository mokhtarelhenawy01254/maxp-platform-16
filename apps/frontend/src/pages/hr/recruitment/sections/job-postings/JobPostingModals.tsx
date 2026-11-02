import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  JobExperienceLevel,
  JobPosting,
  JobPostingType,
  NewJobForm,
} from "./types";
import { getJobStatusBadge, normalizeTextList } from "./helpers";
import { DateInput } from '../../../../../components/ui/DateInput';

interface CreateJobPostingModalProps {
  open: boolean;
  newJob: NewJobForm;
  onChangeJob: React.Dispatch<React.SetStateAction<NewJobForm>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateJobPostingModal: React.FC<CreateJobPostingModalProps> = ({
  open,
  newJob,
  onChangeJob,
  onClose,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
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
                      onChangeJob({ ...newJob, title: e.target.value })
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
                      onChangeJob({ ...newJob, department: e.target.value })
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
                      onChangeJob({ ...newJob, location: e.target.value })
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
                      onChangeJob({
                        ...newJob,
                        type: e.target.value as JobPostingType,
                      })
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
                      onChangeJob({
                        ...newJob,
                        experienceLevel: e.target.value as JobExperienceLevel,
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
                      onChangeJob({ ...newJob, salaryMin: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono tabular-nums"
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
                      onChangeJob({ ...newJob, salaryMax: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono tabular-nums"
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
                    onChangeJob({ ...newJob, description: e.target.value })
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
                    onChangeJob({ ...newJob, requirements: e.target.value })
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
                    onChangeJob({ ...newJob, responsibilities: e.target.value })
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
                <DateInput
                  value={newJob.closingDate}
                  onChange={(e) =>
                    onChangeJob({ ...newJob, closingDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onSubmit}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                إنشاء الوظيفة
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface JobPostingDetailsModalProps {
  open: boolean;
  selectedJob: JobPosting | null;
  onClose: () => void;
}

export const JobPostingDetailsModal: React.FC<JobPostingDetailsModalProps> = ({
  open,
  selectedJob,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {open && selectedJob && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
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
                className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${
                  getJobStatusBadge(selectedJob.status).bg
                }`}
              >
                {getJobStatusBadge(selectedJob.status).text}
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
                  {normalizeTextList(selectedJob.requirements).map(
                    (req, idx) => (
                      <li
                        key={idx}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {req}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                  المسؤوليات
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {normalizeTextList(selectedJob.responsibilities).map(
                    (resp, idx) => (
                      <li
                        key={idx}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {resp}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 transition-all"
            >
              إغلاق
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
