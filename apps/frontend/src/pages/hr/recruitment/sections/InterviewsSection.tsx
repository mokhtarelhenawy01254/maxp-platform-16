import React, { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  VideoCameraIcon,
  MapPinIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { toast } from "sonner";
import { tToast } from "../../../../utils/i18n-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Interview {
  id: string;
  applicantName: string;
  applicantId: string;
  jobTitle: string;
  jobId: string;
  date: string;
  time: string;
  type: "IN_PERSON" | "VIDEO" | "PHONE";
  location?: string;
  interviewers: string[];
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  jobTitle?: string;
}

interface Job {
  id: string;
  title: string;
  department: string;
}

const InterviewsSection: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  const [newInterview, setNewInterview] = useState({
    applicantId: "",
    jobId: "",
    date: "",
    time: "",
    type: "VIDEO" as const,
    location: "",
    interviewers: [] as string[],
    notes: "",
  });

  const [interviewerInput, setInterviewerInput] = useState("");

  useEffect(() => {
    fetchInterviews();
    fetchApplicants();
    fetchJobs();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/interviews");
      if (response.data.success) {
        setInterviews(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      tToast.error("InterviewsSection.failed_fetch_cbf5");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    try {
      const response = await companyAwareApi.get("/hr/recruitment/applicants");
      if (response.data.success) {
        setApplicants(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching applicants:", error);
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

  const handleScheduleInterview = async () => {
    try {
      if (
        !newInterview.applicantId ||
        !newInterview.jobId ||
        !newInterview.date ||
        !newInterview.time
      ) {
        tToast.error("InterviewsSection.msg_faf7");
        return;
      }

      const payload = {
        ...newInterview,
        interviewers: newInterview.interviewers, // Send as array, backend handles it
      };

      const response = await companyAwareApi.post(
        "/hr/recruitment/interviews",
        payload,
      );

      if (response.data.success) {
        tToast.success("InterviewsSection.msg_d55d");
        setShowScheduleModal(false);
        resetForm();
        fetchInterviews();
      }
    } catch (error: any) {
      console.error("Error scheduling interview:", error);
      toast.error(error.response?.data?.message || "فشل في جدولة المقابلة");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await companyAwareApi.put(
        `/hr/recruitment/interviews/${id}/status`,
        { status },
      );
      if (response.data.success) {
        tToast.success("InterviewsSection.success_update_a5d2");
        fetchInterviews();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      tToast.error("InterviewsSection.failed_update_fa1c");
    }
  };

  const resetForm = () => {
    setNewInterview({
      applicantId: "",
      jobId: "",
      date: "",
      time: "",
      type: "VIDEO",
      location: "",
      interviewers: [],
      notes: "",
    });
    setInterviewerInput("");
  };

  const addInterviewer = () => {
    if (interviewerInput.trim()) {
      setNewInterview({
        ...newInterview,
        interviewers: [...newInterview.interviewers, interviewerInput.trim()],
      });
      setInterviewerInput("");
    }
  };

  const removeInterviewer = (index: number) => {
    const updated = [...newInterview.interviewers];
    updated.splice(index, 1);
    setNewInterview({ ...newInterview, interviewers: updated });
  };

  const getApplicantsForJob = () => {
    if (!newInterview.jobId) return [];
    return applicants.filter((app) => app.jobId === newInterview.jobId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return {
          text: "مجدولة",
          bg: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "COMPLETED":
        return {
          text: "مكتملة",
          bg: "bg-green-100 text-green-700 border-green-200",
        };
      case "CANCELLED":
        return { text: "ملغاة", bg: "bg-red-100 text-red-700 border-red-200" };
      case "NO_SHOW":
        return {
          text: "لم يحضر",
          bg: "bg-gray-100 text-gray-700 border-gray-200",
        };
      default:
        return { text: status, bg: "bg-gray-100 text-gray-700" };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <VideoCameraIcon className="w-5 h-5 text-purple-500" />;
      case "PHONE":
        return <PhoneIcon className="w-5 h-5 text-green-500" />;
      case "IN_PERSON":
        return <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "VIDEO":
        return "مكالمة فيديو";
      case "PHONE":
        return "مكالمة هاتفية";
      case "IN_PERSON":
        return "في الشركة";
      default:
        return type;
    }
  };

  return (
    <div className="relative min-h-screen p-6 -m-6 overflow-hidden">
      {/* الخلفية المميزة - Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 -z-20" />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400">
            مساحة المقابلات
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            إدارة جداول المقابلات والمواعيد بذكاء
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="group relative px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-2">
            <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>جدولة مقابلة جديدة</span>
          </div>
        </button>
      </div>

      {/* Schedule Interview Modal */}
      <AnimatePresence>
        {showScheduleModal && (
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
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetForm();
                  }}
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
                        setNewInterview({
                          ...newInterview,
                          jobId: e.target.value,
                          applicantId: "",
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-violet-500 rounded-xl outline-none transition-all hover:bg-white dark:hover:bg-gray-700"
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
                          ⚠️ اختر الوظيفة أولاً لعرض المتقدمين
                        </p>
                      </div>
                    ) : getApplicantsForJob().length === 0 ? (
                      <div className="w-full px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl">
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          📋 لا توجد متقدمين لهذه الوظيفة
                        </p>
                      </div>
                    ) : (
                      <select
                        value={newInterview.applicantId}
                        onChange={(e) =>
                          setNewInterview({
                            ...newInterview,
                            applicantId: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-violet-500 rounded-xl outline-none transition-all hover:bg-white dark:hover:bg-gray-700"
                      >
                        <option value="">اختر المتقدم...</option>
                        {getApplicantsForJob().map((applicant) => (
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
                        <input
                          type="date"
                          value={newInterview.date}
                          onChange={(e) =>
                            setNewInterview({
                              ...newInterview,
                              date: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-violet-500 outline-none"
                        />
                        <input
                          type="time"
                          value={newInterview.time}
                          onChange={(e) =>
                            setNewInterview({
                              ...newInterview,
                              time: e.target.value,
                            })
                          }
                          className="w-32 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-violet-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        نوع المقابلة
                      </label>
                      <div className="flex gap-2">
                        {[
                          {
                            value: "VIDEO",
                            icon: VideoCameraIcon,
                            label: "فيديو",
                          },
                          {
                            value: "IN_PERSON",
                            icon: BuildingOfficeIcon,
                            label: "مقر الشركة",
                          },
                          { value: "PHONE", icon: PhoneIcon, label: "هاتف" },
                        ].map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setNewInterview({
                                ...newInterview,
                                type: value as any,
                              })
                            }
                            className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all ${
                              newInterview.type === value
                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700"
                                : "border-transparent bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        ))}
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
                        setNewInterview({
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
                        onChange={(e) => setInterviewerInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addInterviewer())
                        }
                        placeholder="اكتب الاسم واضغط إضافة..."
                        className="flex-1 bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-violet-500 px-2 py-2 outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addInterviewer}
                        className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-medium text-sm"
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
                          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30 text-violet-700 dark:text-violet-300 rounded-full border border-violet-100 dark:border-violet-800 text-sm font-medium pr-3 pl-1"
                        >
                          {interviewer}
                          <button
                            type="button"
                            onClick={() => removeInterviewer(idx)}
                            className="p-0.5 hover:bg-white/50 rounded-full transition-colors text-violet-500"
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
                        setNewInterview({
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
                    onClick={handleScheduleInterview}
                    className="flex-1 py-4 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all text-lg"
                  >
                    تأكيد الجدولة 📅
                  </button>
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      resetForm();
                    }}
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

      {/* Interviews Grid - Modern Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {interviews.map((interview, index) => {
          const statusBadge = getStatusBadge(interview.status);
          return (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/40 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:hover:bg-gray-800/80"
            >
              {/* Decorative Gradient Blob on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-white dark:from-violet-900/50 dark:to-gray-800 flex items-center justify-center shadow-inner border border-white/50 dark:border-gray-700">
                      <UserIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                        {interview.applicantName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100/50 dark:bg-gray-700/50 px-2 py-0.5 rounded-full inline-block mt-1">
                        {interview.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg} shadow-sm`}
                  >
                    {statusBadge.text}
                  </div>
                </div>

                {/* Date & Time Strip */}
                <div className="flex items-center gap-4 bg-gray-50/80 dark:bg-gray-700/30 rounded-xl p-3 mb-4 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CalendarDaysIcon className="w-5 h-5 text-violet-500" />
                    <span className="text-sm font-semibold">
                      {format(new Date(interview.date), "dd MMM", {
                        locale: ar,
                      })}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <ClockIcon className="w-5 h-5 text-fuchsia-500" />
                    <span className="text-sm font-semibold">
                      {interview.time}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getTypeIcon(interview.type)}</div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                        طريقة المقابلة
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {getTypeText(interview.type)}
                      </p>
                      {interview.location && (
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 truncate max-w-[200px]">
                          {interview.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {interview.interviewers &&
                    interview.interviewers.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                          {(typeof interview.interviewers === "string"
                            ? interview.interviewers.split(",")
                            : interview.interviewers
                          )
                            .slice(0, 3)
                            .map((interviewer, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-white dark:from-gray-700 dark:to-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300"
                                title={interviewer.trim()}
                              >
                                {interviewer.trim().charAt(0)}
                              </div>
                            ))}
                          {(typeof interview.interviewers === "string"
                            ? interview.interviewers.split(",").length
                            : interview.interviewers.length) > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                              +
                              {(typeof interview.interviewers === "string"
                                ? interview.interviewers.split(",").length
                                : interview.interviewers.length) - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          لجنة المقابلة
                        </span>
                      </div>
                    )}
                </div>

                {/* Actions - Only show for Scheduled */}
                {interview.status === "SCHEDULED" && (
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <button
                      onClick={() =>
                        handleUpdateStatus(interview.id, "COMPLETED")
                      }
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-bold"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      تمت
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateStatus(interview.id, "CANCELLED")
                      }
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-bold"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {interviews.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center relative z-10"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-fuchsia-50 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CalendarDaysIcon className="w-16 h-16 text-violet-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            لا توجد مقابلات مجدولة
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            ابدأ بتنظيم جدول أعمالك ومقابلات المرشحين بسهولة من هنا.
          </p>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg hover:shadow-violet-500/30 hover:-translate-y-1 transition-all duration-300 font-bold"
          >
            جدولة أول مقابلة 🚀
          </button>
        </motion.div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-32">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-violet-100 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewsSection;
