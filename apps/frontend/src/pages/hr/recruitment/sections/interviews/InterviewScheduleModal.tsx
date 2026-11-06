import React from "react";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import {
  InterviewApplicant,
  InterviewJob,
  InterviewType,
  NewInterviewForm,
} from "./types";
import { DateInput } from '../../../../../components/ui/DateInput';

interface InterviewScheduleModalProps {
  open: boolean;
  jobs: InterviewJob[];
  applicantsForJob: InterviewApplicant[];
  newInterview: NewInterviewForm;
  interviewerInput: string;
  onChangeInterview: React.Dispatch<React.SetStateAction<NewInterviewForm>>;
  onChangeInterviewerInput: (val: string) => void;
  onAddInterviewer: () => void;
  onRemoveInterviewer: (idx: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const INTERVIEW_TYPE_OPTIONS: Array<{
  value: InterviewType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = [
  { value: "VIDEO", icon: VideoCameraIcon, label: "فيديو" },
  { value: "IN_PERSON", icon: BuildingOfficeIcon, label: "مقر الشركة" },
  { value: "PHONE", icon: PhoneIcon, label: "هاتف" },
];

export const InterviewScheduleModal: React.FC<InterviewScheduleModalProps> = ({
  open,
  jobs,
  applicantsForJob,
  newInterview,
  interviewerInput,
  onChangeInterview,
  onChangeInterviewerInput,
  onAddInterviewer,
  onRemoveInterviewer,
  onClose,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 scrollbar-hide"
          >
            <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  جدولة موعد
                </h3>
                <p className="text-sm text-gray-500">
                  قم بتنظيم مقابلة جديدة بسلاسة
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Job & Applicant Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    الوظيفة المطلوبة
                  </label>
                  <select
                    value={newInterview.jobId}
                    onChange={(e) =>
                      onChangeInterview({
                        ...newInterview,
                        jobId: e.target.value,
                        applicantId: "",
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-primary rounded-xl outline-none transition-all hover:bg-white dark:hover:bg-gray-700"
                  >
                    <option value="">اختر الوظيفة...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    المرشح للمقابلة
                  </label>
                  {!newInterview.jobId ? (
                    <div className="w-full px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        اختر الوظيفة أولاً لعرض المتقدمين
                      </p>
                    </div>
                  ) : applicantsForJob.length === 0 ? (
                    <div className="w-full px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl">
                      <p className="text-sm text-orange-700 dark:text-orange-400">
                        لا توجد متقدمين لهذه الوظيفة
                      </p>
                    </div>
                  ) : (
                    <select
                      value={newInterview.applicantId}
                      onChange={(e) =>
                        onChangeInterview({
                          ...newInterview,
                          applicantId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-primary rounded-xl outline-none transition-all hover:bg-white dark:hover:bg-gray-700"
                    >
                      <option value="">اختر المتقدم...</option>
                      {applicantsForJob.map((applicant) => (
                        <option key={applicant.id} value={applicant.id}>
                          {applicant.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Date & Type */}
              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      تاريخ ووقت المقابلة
                    </label>
                    <div className="flex gap-2">
                      <DateInput
                        value={newInterview.date}
                        onChange={(e) =>
                          onChangeInterview({
                            ...newInterview,
                            date: e.target.value,
                          })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-primary outline-none font-mono tabular-nums"
                      />
                      <input
                        type="time"
                        value={newInterview.time}
                        onChange={(e) =>
                          onChangeInterview({
                            ...newInterview,
                            time: e.target.value,
                          })
                        }
                        className="w-32 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-primary outline-none font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      نوع المقابلة
                    </label>
                    <div className="flex gap-2">
                      {INTERVIEW_TYPE_OPTIONS.map(
                        ({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              onChangeInterview({
                                ...newInterview,
                                type: value,
                              })
                            }
                            className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all ${
                              newInterview.type === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Location/Link Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    {newInterview.type === "VIDEO" ? (
                      <VideoCameraIcon className="h-5 w-5 text-gray-400" />
                    ) : newInterview.type === "PHONE" ? (
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={newInterview.location}
                    onChange={(e) =>
                      onChangeInterview({
                        ...newInterview,
                        location: e.target.value,
                      })
                    }
                    placeholder={
                      newInterview.type === "VIDEO"
                        ? "ضع رابط الاجتماع (Zoom/Meet)..."
                        : newInterview.type === "PHONE"
                          ? "رقم الهاتف للتواصل..."
                          : "رقم القاعة / الطابق / الفرع..."
                    }
                    className="w-full pr-11 pl-4 py-3 bg-white dark:bg-gray-800 border-none rounded-xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>

              {/* Interviewers & Notes */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    لجنة المقابلة
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={interviewerInput}
                      onChange={(e) =>
                        onChangeInterviewerInput(e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), onAddInterviewer())
                      }
                      placeholder="اكتب الاسم واضغط إضافة..."
                      className="flex-1 bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary px-2 py-2 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={onAddInterviewer}
                      className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors font-medium text-sm"
                    >
                      + إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {newInterview.interviewers.length === 0 && (
                      <p className="text-gray-400 text-sm italic py-2">
                        لم يتم إضافة أعضاء بعد...
                      </p>
                    )}
                    {newInterview.interviewers.map((interviewer, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 text-sm font-medium pr-3 pl-1"
                      >
                        {interviewer}
                        <button
                          type="button"
                          onClick={() => onRemoveInterviewer(idx)}
                          aria-label={`حذف ${interviewer}`}
                          className="p-0.5 hover:bg-white/50 rounded-full transition-colors text-primary"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات إضافية
                  </label>
                  <textarea
                    value={newInterview.notes}
                    onChange={(e) =>
                      onChangeInterview({
                        ...newInterview,
                        notes: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl focus:ring-2 focus:ring-violet-500 resize-none transition-all"
                    placeholder="تعليمات خاصة، متطلبات للمقابلة، إلخ..."
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={onSubmit}
                  className="flex-1 py-4 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all text-lg"
                >
                  تأكيد الجدولة
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
