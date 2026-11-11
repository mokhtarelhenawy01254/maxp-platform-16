/**
 * مودال إنشاء نموذج جمع بيانات — مكوّن خاص بصفحة LeadFormsManagement
 */

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  facebookAdsService,
  type FacebookPage,
  type LeadFormQuestion,
} from "../../services/facebookAdsService";

const INPUT =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400";
const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

type QuestionType = LeadFormQuestion["type"];

const QUESTION_TYPES: Array<{
  type: QuestionType;
  label: string;
  icon: LucideIcon;
}> = [
  { type: "EMAIL", label: "البريد الإلكتروني", icon: Mail },
  { type: "PHONE", label: "رقم الهاتف", icon: Phone },
  { type: "FULL_NAME", label: "الاسم الكامل", icon: User },
  { type: "FIRST_NAME", label: "الاسم الأول", icon: User },
  { type: "LAST_NAME", label: "اسم العائلة", icon: User },
  { type: "CITY", label: "المدينة", icon: MapPin },
  { type: "STATE", label: "المنطقة", icon: MapPin },
  { type: "ZIP", label: "الرمز البريدي", icon: MapPin },
  { type: "COUNTRY", label: "الدولة", icon: MapPin },
  { type: "DOB", label: "تاريخ الميلاد", icon: Calendar },
];

interface CreateLeadFormState {
  pageId: string;
  name: string;
  privacyPolicyUrl: string;
  questions: LeadFormQuestion[];
  thankYouPage: {
    title: string;
    body: string;
    buttonText: string;
    buttonType: string;
    websiteUrl: string;
  };
}

interface LeadFormCreateModalProps {
  pages: FacebookPage[];
  defaultPageId: string;
  onClose: () => void;
  onCreated: (pageId: string) => void | Promise<void>;
}

export const LeadFormCreateModal: React.FC<LeadFormCreateModalProps> = ({
  pages,
  defaultPageId,
  onClose,
  onCreated,
}) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateLeadFormState>({
    pageId: defaultPageId,
    name: "",
    privacyPolicyUrl: "",
    questions: [
      { type: "EMAIL", key: "email", label: "البريد الإلكتروني" },
      { type: "PHONE", key: "phone", label: "رقم الهاتف" },
    ],
    thankYouPage: {
      title: "شكراً لك!",
      body: "سنتواصل معك قريباً",
      buttonText: "زيارة الموقع",
      buttonType: "VIEW_WEBSITE",
      websiteUrl: "",
    },
  });

  const set = (patch: Partial<CreateLeadFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const setThankYou = (patch: Partial<CreateLeadFormState["thankYouPage"]>) =>
    setForm((prev) => ({
      ...prev,
      thankYouPage: { ...prev.thankYouPage, ...patch },
    }));

  const addQuestion = (type: QuestionType) => {
    const questionType = QUESTION_TYPES.find((q) => q.type === type);
    if (!questionType) return;
    set({
      questions: [
        ...form.questions,
        { type, key: type.toLowerCase(), label: questionType.label },
      ],
    });
  };

  const removeQuestion = (index: number) =>
    set({ questions: form.questions.filter((_, i) => i !== index) });

  const handleSubmit = async () => {
    if (!form.pageId || !form.name || !form.privacyPolicyUrl) {
      toast.error("الصفحة واسم النموذج ورابط سياسة الخصوصية مطلوبة");
      return;
    }

    try {
      setSaving(true);
      await facebookAdsService.createLeadForm({
        pageId: form.pageId,
        name: form.name,
        questions: form.questions,
        privacyPolicyUrl: form.privacyPolicyUrl,
        thankYouPage: form.thankYouPage,
      });
      toast.success("تم إنشاء النموذج بنجاح");
      setSaving(false);
      await onCreated(form.pageId);
      onClose();
    } catch (error: any) {
      console.error("Error creating lead form:", error);
      toast.error(error?.response?.data?.error || "فشل في إنشاء النموذج");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            إنشاء نموذج جديد
          </h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="new-form-page" className={LABEL}>
                صفحة Facebook *
              </label>
              <select
                id="new-form-page"
                value={form.pageId}
                onChange={(e) => set({ pageId: e.target.value })}
                className={INPUT}
              >
                <option value="">اختر الصفحة</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name || page.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-form-name" className={LABEL}>
                اسم النموذج *
              </label>
              <input
                id="new-form-name"
                type="text"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="مثال: نموذج التسجيل"
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="new-form-privacy" className={LABEL}>
                رابط سياسة الخصوصية *
              </label>
              <input
                id="new-form-privacy"
                type="url"
                value={form.privacyPolicyUrl}
                onChange={(e) => set({ privacyPolicyUrl: e.target.value })}
                placeholder="https://example.com/privacy"
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الأسئلة
            </label>
            <div className="space-y-2 mb-3">
              {form.questions.map((q, index) => (
                <div
                  key={`${q.type}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {q.label}
                  </span>
                  <button
                    onClick={() => removeQuestion(index)}
                    aria-label="حذف السؤال"
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((qt) => {
                const Icon = qt.icon;
                const isAdded = form.questions.some((q) => q.type === qt.type);
                return (
                  <button
                    key={qt.type}
                    onClick={() => !isAdded && addQuestion(qt.type)}
                    disabled={isAdded}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${
                      isAdded
                        ? "bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-500"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {qt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              صفحة الشكر
            </label>
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <input
                type="text"
                value={form.thankYouPage.title}
                onChange={(e) => setThankYou({ title: e.target.value })}
                placeholder="العنوان"
                className={INPUT}
              />
              <textarea
                value={form.thankYouPage.body}
                onChange={(e) => setThankYou({ body: e.target.value })}
                placeholder="الرسالة"
                rows={2}
                className={INPUT}
              />
              <input
                type="url"
                value={form.thankYouPage.websiteUrl}
                onChange={(e) => setThankYou({ websiteUrl: e.target.value })}
                placeholder="رابط الموقع (اختياري)"
                className={INPUT}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            إنشاء النموذج
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormCreateModal;
