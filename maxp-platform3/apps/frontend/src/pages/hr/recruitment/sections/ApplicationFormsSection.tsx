import React, { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Question {
  id?: string;
  questionText: string;
  questionType: "TEXT" | "TEXTAREA" | "SELECT" | "RADIO" | "CHECKBOX" | "FILE";
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

interface ApplicationForm {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  jobId?: string;
  jobTitle?: string;
  isActive: boolean;
  questionsCount: number;
  responsesCount: number;
  createdAt: string;
  questions?: Question[];
}

interface FormResponse {
  id: string;
  respondentName: string;
  respondentEmail: string;
  respondentPhone?: string;
  isContacted: boolean;
  contactedAt?: string | null;
  submittedAt: string;
  applicant?: {
    id: string;
    status: string;
    createdAt?: string;
  } | null;
  form?: {
    title: string;
    jobId?: string | null;
    job?: {
      title?: string;
    } | null;
  };
  answers: {
    id: string;
    answerText?: string;
    answerFile?: string;
    question: {
      questionText: string;
      questionType: string;
    };
  }[];
}

const questionTypes = [
  { value: "TEXT", label: "نص قصير" },
  { value: "TEXTAREA", label: "نص طويل" },
  { value: "SELECT", label: "قائمة منسدلة" },
  { value: "RADIO", label: "اختيار واحد" },
  { value: "CHECKBOX", label: "اختيار متعدد" },
  { value: "FILE", label: "رفع ملف" },
];

const ApplicationFormsSection: React.FC = () => {
  const [forms, setForms] = useState<ApplicationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [showResponseDetailModal, setShowResponseDetailModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ApplicationForm | null>(
    null,
  );
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(
    null,
  );
  const [responseFilter, setResponseFilter] = useState<
    "all" | "contacted" | "notContacted"
  >("all");
  const [updatingResponseId, setUpdatingResponseId] = useState<string | null>(
    null,
  );
  const [convertingResponseId, setConvertingResponseId] = useState<
    string | null
  >(null);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);

  const [newForm, setNewForm] = useState({
    title: "",
    slug: "",
    description: "",
    jobId: "",
    isActive: true,
    questions: [] as Question[],
  });

  const [newQuestion, setNewQuestion] = useState<Question>({
    questionText: "",
    questionType: "TEXT",
    options: [],
    isRequired: false,
    orderIndex: 0,
  });

  const [optionInput, setOptionInput] = useState("");

  useEffect(() => {
    fetchForms();
    fetchJobs();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/forms");
      if (response.data.success) {
        setForms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await companyAwareApi.get("/hr/recruitment/jobs");
      if (response.data.success) {
        setJobs(
          response.data.data.map((j: any) => ({ id: j.id, title: j.title })),
        );
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const handleCreateForm = async () => {
    if (!newForm.title.trim()) {
      toast.error("يرجى إدخال عنوان الفورم");
      return;
    }

    try {
      const response = await companyAwareApi.post(
        "/hr/recruitment/forms",
        newForm,
      );
      if (response.data.success) {
        toast.success("تم إنشاء الفورم بنجاح");
        setShowCreateModal(false);
        fetchForms();
        resetForm();
      }
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("حدث خطأ أثناء إنشاء الفورم");
    }
  };

  const handleUpdateForm = async () => {
    if (!selectedForm || !newForm.title.trim()) {
      toast.error("يرجى إدخال عنوان الفورم");
      return;
    }

    try {
      const response = await companyAwareApi.put(
        `/hr/recruitment/forms/${selectedForm.id}`,
        newForm,
      );
      if (response.data.success) {
        toast.success("تم تحديث الفورم بنجاح");
        setShowEditModal(false);
        fetchForms();
        resetForm();
      }
    } catch (error) {
      console.error("Error updating form:", error);
      toast.error("حدث خطأ أثناء تحديث الفورم");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفورم؟")) return;

    try {
      const response = await companyAwareApi.delete(
        `/hr/recruitment/forms/${formId}`,
      );
      if (response.data.success) {
        toast.success("تم حذف الفورم بنجاح");
        fetchForms();
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("حدث خطأ أثناء حذف الفورم");
    }
  };

  const handleEditForm = async (form: ApplicationForm) => {
    try {
      const response = await companyAwareApi.get(
        `/hr/recruitment/forms/${form.id}`,
      );
      if (response.data.success) {
        const formData = response.data.data;
        setSelectedForm(formData);
        setNewForm({
          title: formData.title,
          slug: formData.slug || "",
          description: formData.description || "",
          jobId: formData.jobId || "",
          isActive: formData.isActive,
          questions: formData.questions || [],
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error("Error fetching form details:", error);
      toast.error("حدث خطأ أثناء جلب تفاصيل الفورم");
    }
  };

  const handleViewResponses = async (form: ApplicationForm) => {
    try {
      setSelectedForm(form);
      setResponseFilter("all");
      const response = await companyAwareApi.get(
        `/hr/recruitment/forms/${form.id}/responses`,
      );
      if (response.data.success) {
        setResponses(response.data.data);
        setShowResponsesModal(true);
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
      toast.error("حدث خطأ أثناء جلب الردود");
    }
  };

  const handleViewResponseDetail = async (responseItem: FormResponse) => {
    try {
      const response = await companyAwareApi.get(
        `/hr/recruitment/responses/${responseItem.id}`,
      );
      if (response.data.success) {
        setSelectedResponse(response.data.data);
        setShowResponseDetailModal(true);
      }
    } catch (error) {
      console.error("Error fetching response details:", error);
      toast.error("حدث خطأ أثناء جلب تفاصيل الرد");
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الرد؟")) return;

    try {
      const response = await companyAwareApi.delete(
        `/hr/recruitment/responses/${responseId}`,
      );
      if (response.data.success) {
        toast.success("تم حذف الرد بنجاح");
        if (selectedForm) {
          handleViewResponses(selectedForm);
        }
      }
    } catch (error) {
      console.error("Error deleting response:", error);
      toast.error("حدث خطأ أثناء حذف الرد");
    }
  };

  const handleToggleContactStatus = async (
    responseId: string,
    isContacted: boolean,
  ) => {
    try {
      setUpdatingResponseId(responseId);
      const response = await companyAwareApi.put(
        `/hr/recruitment/responses/${responseId}/contact-status`,
        { isContacted },
      );

      if (response.data.success) {
        const updatedResponse = response.data.data;

        setResponses((prev) =>
          prev.map((item) =>
            item.id === responseId
              ? {
                  ...item,
                  isContacted: updatedResponse.isContacted,
                  contactedAt: updatedResponse.contactedAt,
                }
              : item,
          ),
        );

        setSelectedResponse((prev) =>
          prev && prev.id === responseId
            ? {
                ...prev,
                isContacted: updatedResponse.isContacted,
                contactedAt: updatedResponse.contactedAt,
              }
            : prev,
        );

        toast.success(
          isContacted ? "تم تحديد الرد كـ تم التواصل" : "تم تحديد الرد كـ لم يتم التواصل",
        );
      }
    } catch (error) {
      console.error("Error updating response contact status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة التواصل");
    } finally {
      setUpdatingResponseId(null);
    }
  };

  const handleConvertResponseToApplicant = async (responseId: string) => {
    try {
      setConvertingResponseId(responseId);
      const response = await companyAwareApi.post(
        `/hr/recruitment/responses/${responseId}/convert-to-applicant`,
      );

      if (response.data.success) {
        const updatedResponse = response.data.data;

        setResponses((prev) =>
          prev.map((item) =>
            item.id === responseId
              ? {
                  ...item,
                  applicant: updatedResponse.applicant,
                }
              : item,
          ),
        );

        setSelectedResponse((prev) =>
          prev && prev.id === responseId
            ? {
                ...prev,
                applicant: updatedResponse.applicant,
                form: updatedResponse.form || prev.form,
              }
            : prev,
        );

        toast.success(
          response.data.message || "تمت إضافة الرد إلى مسار التوظيف",
        );
      }
    } catch (error: any) {
      console.error("Error converting response to applicant:", error);
      toast.error(
        error?.response?.data?.message || "تعذر إضافة الرد إلى مسار التوظيف",
      );
    } finally {
      setConvertingResponseId(null);
    }
  };

  const getApplicantStatusLabel = (status?: string) => {
    const statusLabels: Record<string, string> = {
      NEW: "جديد",
      REVIEWING: "قيد المراجعة",
      INTERVIEW_SCHEDULED: "مقابلة مجدولة",
      INTERVIEWED: "تمت المقابلة",
      OFFERED: "تم العرض",
      HIRED: "تم التوظيف",
      REJECTED: "مرفوض",
    };

    return statusLabels[status || ""] || "داخل المسار";
  };

  const getApplicantStatusBadgeClasses = (status?: string) => {
    const classes: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      REVIEWING:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      INTERVIEW_SCHEDULED:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      INTERVIEWED:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      OFFERED:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      HIRED:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };

    return (
      classes[status || ""] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
    );
  };

  const addQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }

    const needsOptions = ["SELECT", "RADIO", "CHECKBOX"].includes(
      newQuestion.questionType,
    );
    if (needsOptions && newQuestion.options.length < 2) {
      toast.error("يرجى إضافة خيارين على الأقل");
      return;
    }

    setNewForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { ...newQuestion, orderIndex: prev.questions.length },
      ],
    }));

    setNewQuestion({
      questionText: "",
      questionType: "TEXT",
      options: [],
      isRequired: false,
      orderIndex: 0,
    });
  };

  const removeQuestion = (index: number) => {
    setNewForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...newForm.questions];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [
      newQuestions[newIndex],
      newQuestions[index],
    ];
    newQuestions.forEach((q, i) => (q.orderIndex = i));
    setNewForm((prev) => ({ ...prev, questions: newQuestions }));
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewQuestion((prev) => ({
      ...prev,
      options: [...prev.options, optionInput.trim()],
    }));
    setOptionInput("");
  };

  const removeOption = (index: number) => {
    setNewQuestion((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setNewForm({
      title: "",
      description: "",
      jobId: "",
      isActive: true,
      questions: [],
    });
    setNewQuestion({
      questionText: "",
      questionType: "TEXT",
      options: [],
      isRequired: false,
      orderIndex: 0,
    });
    setSelectedForm(null);
  };

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/apply/${formId}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ رابط الاستبيان");
  };

  const filteredForms = forms.filter(
    (form) =>
      form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (form.jobTitle &&
        form.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const contactedResponsesCount = responses.filter(
    (response) => response.isContacted,
  ).length;
  const notContactedResponsesCount =
    responses.length - contactedResponsesCount;

  const visibleResponses = responses.filter((response) => {
    if (responseFilter === "contacted") return response.isContacted;
    if (responseFilter === "notContacted") return !response.isContacted;
    return true;
  });

  const selectedResponseCanJoinPipeline = Boolean(
    selectedResponse?.form?.jobId || selectedForm?.jobId,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-80">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في الاستبيانات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          إنشاء استبيان جديد
        </button>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
            لا توجد استبيانات
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            قم بإنشاء استبيان جديد للمتقدمين
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl ${form.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
                  >
                    <DocumentTextIcon
                      className={`w-6 h-6 ${form.isActive ? "text-green-600" : "text-gray-500"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      {form.title}
                    </h3>
                    {form.jobTitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {form.jobTitle}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    form.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {form.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              {form.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {form.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <QuestionMarkCircleIcon className="w-4 h-4" />
                  <span>{form.questionsCount} سؤال</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>{form.responsesCount} رد</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                تم الإنشاء:{" "}
                {format(new Date(form.createdAt), "dd MMM yyyy", {
                  locale: ar,
                })}
              </div>

              {/* رابط الاستبيان */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      رابط الاستبيان:
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 truncate font-mono">
                      {window.location.origin}/apply/{form.slug || form.id}
                    </p>
                  </div>
                  <button
                    onClick={() => copyFormLink(form.slug || form.id)}
                    className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    نسخ
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEditForm(form)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm"
                >
                  <PencilIcon className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={() => handleViewResponses(form)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-sm"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  الردود
                </button>
                <button
                  onClick={() => handleDeleteForm(form.id)}
                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title="حذف"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                {showEditModal ? "تعديل الاستبيان" : "إنشاء استبيان جديد"}
              </h2>

              <div className="space-y-4">
                {/* Form Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      عنوان الاستبيان *
                    </label>
                    <input
                      type="text"
                      value={newForm.title}
                      onChange={(e) =>
                        setNewForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: استبيان التقديم لوظيفة مطور"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رابط مخصص (Slug) - اختياري
                    </label>
                    <input
                      type="text"
                      value={newForm.slug}
                      onChange={(e) =>
                        setNewForm((prev) => ({
                          ...prev,
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="مثال: senior-developer-form"
                    />
                    <p className="text-xs text-gray-500 mt-1">سيكون الرابط: /apply/{newForm.slug || 'id'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الوظيفة المرتبطة (اختياري)
                    </label>
                    <select
                      value={newForm.jobId}
                      onChange={(e) =>
                        setNewForm((prev) => ({
                          ...prev,
                          jobId: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">بدون وظيفة محددة</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    وصف الاستبيان (اختياري)
                  </label>
                  <textarea
                    value={newForm.description}
                    onChange={(e) =>
                      setNewForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="وصف مختصر للاستبيان..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newForm.isActive}
                    onChange={(e) =>
                      setNewForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    الاستبيان نشط (يمكن للمتقدمين الوصول إليه)
                  </label>
                </div>

                {/* رابط الاستبيان - يظهر فقط في وضع التعديل */}
                {showEditModal && selectedForm && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-3">
                      <LinkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2">
                          رابط الاستبيان للمتقدمين
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-mono break-all">
                            {window.location.origin}/apply/{newForm.slug || selectedForm.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyFormLink(newForm.slug || selectedForm.id)}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                        >
                          <LinkIcon className="w-5 h-5" />
                          نسخ الرابط
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Questions Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                    الأسئلة ({newForm.questions.length})
                  </h3>

                  {/* Existing Questions */}
                  {newForm.questions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {newForm.questions.map((q, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveQuestion(index, "up")}
                              disabled={index === 0}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, "down")}
                              disabled={index === newForm.questions.length - 1}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 dark:text-white">
                              {index + 1}. {q.questionText}
                              {q.isRequired && (
                                <span className="text-red-500 mr-1">*</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {
                                questionTypes.find(
                                  (t) => t.value === q.questionType,
                                )?.label
                              }
                              {q.options.length > 0 &&
                                ` (${q.options.length} خيارات)`}
                            </p>
                          </div>
                          <button
                            onClick={() => removeQuestion(index)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Question */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">
                      إضافة سؤال جديد
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={newQuestion.questionText}
                        onChange={(e) =>
                          setNewQuestion((prev) => ({
                            ...prev,
                            questionText: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                        placeholder="نص السؤال..."
                      />
                      <select
                        value={newQuestion.questionType}
                        onChange={(e) =>
                          setNewQuestion((prev) => ({
                            ...prev,
                            questionType: e.target.value as any,
                            options: [],
                          }))
                        }
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Options for SELECT, RADIO, CHECKBOX */}
                    {["SELECT", "RADIO", "CHECKBOX"].includes(
                      newQuestion.questionType,
                    ) && (
                      <div className="mb-3">
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={optionInput}
                            onChange={(e) => setOptionInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addOption()}
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                            placeholder="أضف خيار..."
                          />
                          <button
                            onClick={addOption}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            إضافة
                          </button>
                        </div>
                        {newQuestion.options.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newQuestion.options.map((opt, i) => (
                              <span
                                key={i}
                                className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm"
                              >
                                {opt}
                                <button
                                  onClick={() => removeOption(i)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newQuestion.isRequired}
                          onChange={(e) =>
                            setNewQuestion((prev) => ({
                              ...prev,
                              isRequired: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          سؤال إجباري
                        </span>
                      </label>
                      <button
                        onClick={addQuestion}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <PlusIcon className="w-4 h-4" />
                        إضافة السؤال
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={showEditModal ? handleUpdateForm : handleCreateForm}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  {showEditModal ? "حفظ التعديلات" : "إنشاء الاستبيان"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responses Modal */}
      <AnimatePresence>
        {showResponsesModal && selectedForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResponsesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    ردود: {selectedForm.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button
                      onClick={() => setResponseFilter("all")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        responseFilter === "all"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      الكل ({responses.length})
                    </button>
                    <button
                      onClick={() => setResponseFilter("contacted")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        responseFilter === "contacted"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      تم التواصل ({contactedResponsesCount})
                    </button>
                    <button
                      onClick={() => setResponseFilter("notContacted")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        responseFilter === "notContacted"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      لم يتم التواصل ({notContactedResponsesCount})
                    </button>
                  </div>
                </div>
              </div>

              {responses.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    لا توجد ردود بعد
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    شارك رابط الاستبيان مع المتقدمين
                  </p>
                </div>
              ) : visibleResponses.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    لا توجد ردود في هذا التصنيف
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    جرّب تغيير فلتر حالة التواصل
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleResponses.map((response) => {
                    const responseCanJoinPipeline = Boolean(
                      selectedForm.jobId || response.form?.jobId,
                    );

                    return (
                      <div
                        key={response.id}
                        className={`flex flex-col gap-4 p-4 rounded-xl border transition-all md:flex-row md:items-center md:justify-between ${
                          response.isContacted
                            ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/60"
                            : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              response.isContacted
                                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                : "bg-gradient-to-br from-amber-500 to-orange-500"
                            }`}
                          >
                            {response.respondentName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800 dark:text-white">
                              {response.respondentName}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {response.respondentEmail}
                            </p>
                            {response.respondentPhone && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {response.respondentPhone}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                  response.isContacted
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                }`}
                              >
                                {response.isContacted ? (
                                  <CheckCircleIcon className="w-4 h-4" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4" />
                                )}
                                {response.isContacted
                                  ? "تم التواصل"
                                  : "لم يتم التواصل"}
                              </span>
                              {response.applicant ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getApplicantStatusBadgeClasses(
                                    response.applicant.status,
                                  )}`}
                                >
                                  <UserGroupIcon className="w-4 h-4" />
                                  داخل المسار:{" "}
                                  {getApplicantStatusLabel(
                                    response.applicant.status,
                                  )}
                                </span>
                              ) : responseCanJoinPipeline ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                  <UserGroupIcon className="w-4 h-4" />
                                  لم يدخل المسار بعد
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  <UserGroupIcon className="w-4 h-4" />
                                  الاستبيان غير مربوط بوظيفة
                                </span>
                              )}
                              {response.isContacted && response.contactedAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  آخر تواصل:{" "}
                                  {format(
                                    new Date(response.contactedAt),
                                    "dd MMM yyyy - HH:mm",
                                    { locale: ar },
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 md:items-end">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(response.submittedAt),
                              "dd MMM yyyy - HH:mm",
                              { locale: ar },
                            )}
                          </span>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {!response.applicant && (
                              <button
                                onClick={() =>
                                  handleConvertResponseToApplicant(response.id)
                                }
                                disabled={
                                  !responseCanJoinPipeline ||
                                  convertingResponseId === response.id
                                }
                                className="px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                  responseCanJoinPipeline
                                    ? "إضافة الرد إلى مسار التوظيف"
                                    : "يجب ربط الاستبيان بوظيفة أولاً"
                                }
                              >
                                <UserGroupIcon className="w-4 h-4" />
                                {convertingResponseId === response.id
                                  ? "جاري الإضافة..."
                                  : responseCanJoinPipeline
                                    ? "إضافة للمسار"
                                    : "بدون وظيفة"}
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleToggleContactStatus(
                                  response.id,
                                  !response.isContacted,
                                )
                              }
                              disabled={updatingResponseId === response.id}
                              className={`px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-1 ${
                                response.isContacted
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                              title={
                                response.isContacted
                                  ? "تحديد كـ لم يتم التواصل"
                                  : "تحديد كـ تم التواصل"
                              }
                            >
                              {response.isContacted ? (
                                <XCircleIcon className="w-4 h-4" />
                              ) : (
                                <CheckCircleIcon className="w-4 h-4" />
                              )}
                              {updatingResponseId === response.id
                                ? "جاري الحفظ..."
                                : response.isContacted
                                  ? "تراجع"
                                  : "تم التواصل"}
                            </button>
                            <button
                              onClick={() => handleViewResponseDetail(response)}
                              className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                              title="عرض التفاصيل"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteResponse(response.id)}
                              className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                              title="حذف"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowResponsesModal(false)}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response Detail Modal */}
      <AnimatePresence>
        {showResponseDetailModal && selectedResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResponseDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                تفاصيل الرد
              </h2>

              {/* Respondent Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedResponse.respondentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                      {selectedResponse.respondentName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedResponse.respondentEmail}
                    </p>
                    {selectedResponse.respondentPhone && (
                      <p className="text-gray-500 dark:text-gray-500 text-sm">
                        {selectedResponse.respondentPhone}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          selectedResponse.isContacted
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {selectedResponse.isContacted ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                          <XCircleIcon className="w-4 h-4" />
                        )}
                        {selectedResponse.isContacted
                          ? "تم التواصل"
                          : "لم يتم التواصل"}
                      </span>
                      {selectedResponse.isContacted &&
                        selectedResponse.contactedAt && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            تم التحديث في{" "}
                            {format(
                              new Date(selectedResponse.contactedAt),
                              "dd MMM yyyy - HH:mm",
                              { locale: ar },
                            )}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {selectedResponse.applicant ? (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getApplicantStatusBadgeClasses(
                            selectedResponse.applicant.status,
                          )}`}
                        >
                          <UserGroupIcon className="w-4 h-4" />
                          داخل المسار:{" "}
                          {getApplicantStatusLabel(
                            selectedResponse.applicant.status,
                          )}
                        </span>
                      ) : selectedResponseCanJoinPipeline ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          <UserGroupIcon className="w-4 h-4" />
                          لم يدخل مسار التوظيف بعد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <UserGroupIcon className="w-4 h-4" />
                          الاستبيان غير مربوط بوظيفة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {!selectedResponse.applicant && (
                      <button
                        onClick={() =>
                          handleConvertResponseToApplicant(selectedResponse.id)
                        }
                        disabled={
                          !selectedResponseCanJoinPipeline ||
                          convertingResponseId === selectedResponse.id
                        }
                        className="px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserGroupIcon className="w-4 h-4" />
                        {convertingResponseId === selectedResponse.id
                          ? "جاري الإضافة..."
                          : selectedResponseCanJoinPipeline
                            ? "إضافة إلى مسار التوظيف"
                            : "اربط الاستبيان بوظيفة أولاً"}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleToggleContactStatus(
                          selectedResponse.id,
                          !selectedResponse.isContacted,
                        )
                      }
                      disabled={updatingResponseId === selectedResponse.id}
                      className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                        selectedResponse.isContacted
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                          : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {selectedResponse.isContacted ? (
                        <XCircleIcon className="w-4 h-4" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                      {updatingResponseId === selectedResponse.id
                        ? "جاري الحفظ..."
                        : selectedResponse.isContacted
                          ? "تحديد كـ لم يتم التواصل"
                          : "تحديد كـ تم التواصل"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-4">
                {selectedResponse.answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <p className="font-medium text-gray-800 dark:text-white mb-2">
                      {index + 1}. {answer.question.questionText}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 p-3 rounded-lg">
                      {answer.answerText ||
                        (answer.answerFile ? (
                          <a
                            href={answer.answerFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            عرض الملف المرفق
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">
                            لم يتم الإجابة
                          </span>
                        ))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowResponseDetailModal(false)}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ApplicationFormsSection;
