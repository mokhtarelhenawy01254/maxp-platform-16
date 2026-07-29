import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  BriefcaseIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { apiClient } from "../../services/apiClient";
import { toast, Toaster } from "sonner";

interface Question {
  id: string;
  questionText: string;
  questionType: "TEXT" | "TEXTAREA" | "SELECT" | "RADIO" | "CHECKBOX" | "FILE";
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

interface FormData {
  id: string;
  title: string;
  description?: string;
  job?: {
    id: string;
    title: string;
    department: string;
    location: string;
  };
  questions: Question[];
}

interface UploadedFile {
  url: string;
  originalName: string;
  size: number;
  mimetype: string;
}

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

const PublicApplicationForm: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [respondentInfo, setRespondentInfo] = useState({
    respondentName: "",
    respondentEmail: "",
    respondentPhone: "",
  });

  const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [questionId: string]: UploadedFile | null }>({});
  const [uploadingFile, setUploadingFile] = useState<{ [questionId: string]: boolean }>({});
  const fileInputRefs = useRef<{ [questionId: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.client.get(`/hr/recruitment/forms/public/${formId}`);
      if (response.data.success) {
        setForm(response.data.data);
        const initialAnswers: { [key: string]: string | string[] } = {};
        response.data.data.questions.forEach((q: Question) => {
          initialAnswers[q.id] = q.questionType === "CHECKBOX" ? [] : "";
        });
        setAnswers(initialAnswers);
      }
    } catch (err: any) {
      console.error("Error fetching form:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "النموذج غير موجود أو غير نشط"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const currentValues = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...currentValues, option] };
      } else {
        return { ...prev, [questionId]: currentValues.filter((v) => v !== option) };
      }
    });
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    setUploadingFile((prev) => ({ ...prev, [questionId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.client.post(
        "/hr/recruitment/forms/public/upload-file",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data.success) {
        setUploadedFiles((prev) => ({ ...prev, [questionId]: response.data.data }));
        toast.success(`تم رفع "${file.name}" بنجاح`);
      } else {
        tToast.error("publicApp.msg_bffe");
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      toast.error(err.response?.data?.message || "فشل رفع الملف");
    } finally {
      setUploadingFile((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const removeFile = (questionId: string) => {
    setUploadedFiles((prev) => ({ ...prev, [questionId]: null }));
    if (fileInputRefs.current[questionId]) {
      fileInputRefs.current[questionId]!.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateForm = (): boolean => {
    const name = respondentInfo.respondentName.trim();
    const email = respondentInfo.respondentEmail.trim();
    const phone = respondentInfo.respondentPhone.trim();

    if (!name) { tToast.error("publicApp.msg_45d5"); return false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { tToast.error("publicApp.msg_1dfc"); return false; }
    if (!phone) { tToast.error("publicApp.msg_530b"); return false; }
    if (phone && !PHONE_REGEX.test(phone)) { tToast.error("publicApp.msg_28dd"); return false; }

    for (const question of form?.questions || []) {
      if (question.isRequired) {
        if (question.questionType === "FILE") {
          if (!uploadedFiles[question.id]) {
            toast.error(`يرجى رفع ملف للسؤال: "${question.questionText}"`);
            return false;
          }
        } else {
          const answer = answers[question.id];
          const isEmpty =
            !answer ||
            (Array.isArray(answer) && answer.length === 0) ||
            (typeof answer === "string" && answer.trim() === "");
          if (isEmpty) {
            toast.error(`السؤال "${question.questionText}" مطلوب`);
            return false;
          }
        }
      }
    }

    if (Object.values(uploadingFile).some(Boolean)) {
      tToast.error("publicApp.msg_5424");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const formattedAnswers = (form?.questions || []).map((q) => {
        if (q.questionType === "FILE") {
          const file = uploadedFiles[q.id];
          return { questionId: q.id, answerText: file?.originalName || "", answerFile: file?.url || null };
        }
        const val = answers[q.id];
        return {
          questionId: q.id,
          answerText: Array.isArray(val) ? val.join(", ") : (typeof val === "string" ? val.trim() : val || ""),
          answerFile: null,
        };
      });

      const response = await apiClient.client.post(
        `/hr/recruitment/forms/public/${formId}/submit`,
        {
          respondentName: respondentInfo.respondentName.trim(),
          respondentEmail: respondentInfo.respondentEmail.trim() || undefined,
          respondentPhone: respondentInfo.respondentPhone.trim(),
          answers: formattedAnswers,
        }
      );

      if (response.data.success) {
        setSubmitted(true);
        tToast.success("publicApp.success_send_7721");
      }
    } catch (err: any) {
      console.error("Error submitting form:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || "حدث خطأ أثناء إرسال النموذج");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل النموذج...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationCircleIcon className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">النموذج غير متاح</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all">
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">تم إرسال النموذج بنجاح!</h1>
          <p className="text-gray-700 mb-6">شكراً لك على إكمال النموذج. سيتم مراجعة طلبك والتواصل معك قريباً.</p>
          <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-green-500 to-emerald-500" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-6 px-4 md:py-8" dir="rtl">
      <Toaster position="top-center" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <DocumentTextIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{form?.title}</h1>
              {form?.description && <p className="text-gray-700 mt-1">{form.description}</p>}
            </div>
          </div>
          {form?.job && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <BriefcaseIcon className="w-5 h-5 text-blue-600" />
                الوظيفة المرتبطة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700"><BriefcaseIcon className="w-4 h-4" />{form.job.title}</div>
                <div className="flex items-center gap-2 text-gray-700"><BuildingOfficeIcon className="w-4 h-4" />{form.job.department}</div>
                <div className="flex items-center gap-2 text-gray-700"><MapPinIcon className="w-4 h-4" />{form.job.location}</div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">المعلومات الشخصية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">الاسم الكامل <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={respondentInfo.respondentName}
                  onChange={(e) => setRespondentInfo((prev) => ({ ...prev, respondentName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                  placeholder="أدخل اسمك الكامل"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={respondentInfo.respondentEmail}
                  onChange={(e) => setRespondentInfo((prev) => ({ ...prev, respondentEmail: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                  placeholder="example@email.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800 mb-2">رقم الهاتف <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={respondentInfo.respondentPhone}
                  onChange={(e) => setRespondentInfo((prev) => ({ ...prev, respondentPhone: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                  placeholder="01xxxxxxxxx"
                  required
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          {(form?.questions.length || 0) > 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex flex-wrap items-center gap-2">
                الأسئلة
                <span className="text-sm text-gray-500">({form?.questions.length || 0})</span>
              </h2>
              <div className="space-y-6">
                {form?.questions.map((question, index) => (
                  <motion.div key={question.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className="p-4 bg-gray-50 rounded-2xl">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      {index + 1}. {question.questionText}
                      {question.isRequired && <span className="text-red-500 mr-1">*</span>}
                    </label>

                    {question.questionType === "TEXT" && (
                      <input type="text" value={(answers[question.id] as string) || ""} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400" placeholder="أدخل إجابتك..." />
                    )}

                    {question.questionType === "TEXTAREA" && (
                      <textarea value={(answers[question.id] as string) || ""} onChange={(e) => handleAnswerChange(question.id, e.target.value)} rows={4} className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400" placeholder="أدخل إجابتك..." />
                    )}

                    {question.questionType === "SELECT" && (
                      <select value={(answers[question.id] as string) || ""} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                        <option value="">اختر...</option>
                        {question.options.map((option, i) => <option key={i} value={option}>{option}</option>)}
                      </select>
                    )}

                    {question.questionType === "RADIO" && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <label key={i} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
                            <input type="radio" name={`question-${question.id}`} value={option} checked={answers[question.id] === option} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-5 h-5 text-blue-600" />
                            <span className="text-gray-900">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.questionType === "CHECKBOX" && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <label key={i} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
                            <input type="checkbox" value={option} checked={((answers[question.id] as string[]) || []).includes(option)} onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                            <span className="text-gray-900">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.questionType === "FILE" && (
                      <div>
                        {uploadedFiles[question.id] ? (
                          <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-300 rounded-xl">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{uploadedFiles[question.id]!.originalName}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(uploadedFiles[question.id]!.size)}</p>
                            </div>
                            <button type="button" onClick={() => removeFile(question.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                              <XMarkIcon className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer" onClick={() => fileInputRefs.current[question.id]?.click()}>
                            {uploadingFile[question.id] ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="text-sm text-blue-600">جاري رفع الملف...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
                                <p className="text-sm text-blue-600 font-medium">انقر لرفع ملف</p>
                                <p className="text-xs text-gray-400">PDF, Word, صورة — بحد أقصى 10MB</p>
                              </div>
                            )}
                            <input
                              ref={(el) => { fileInputRefs.current[question.id] = el; }}
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(question.id, file);
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={submitting || Object.values(uploadingFile).some(Boolean)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                جاري الإرسال...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-6 h-6 rotate-180" />
                إرسال النموذج
              </>
            )}
          </motion.button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          جميع المعلومات المقدمة سرية ولن تُستخدم إلا لأغراض التوظيف
        </p>
      </motion.div>
    </div>
  );
};

export default PublicApplicationForm;
